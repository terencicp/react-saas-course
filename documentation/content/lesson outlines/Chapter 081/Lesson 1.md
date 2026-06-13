# Headers that block live attacks

Sidebar label: Security headers

## Lesson framing

This is lesson 1 of Unit 16's security-baseline pass (chapter 081). It is an audit-pass lesson, not new architecture: the student already has `proxy.ts` (ch033 L2), the typed `next.config.ts` `headers()` key (ch034 L1), the server-side `headers()` read (ch033 L1), and was told in the CSRF/XSS lesson that "full security headers / CSP are the security-baseline chapter's territory." This lesson cashes that promissory note.

The senior question that opens the lesson (state it implicitly, per pedagogy): `curl -I https://app.example.com` comes back with no `Content-Security-Policy`, no `Strict-Transport-Security`, no `X-Frame-Options`. Three minutes of config closes clickjacking, MIME-sniffing, protocol-downgrade, and third-party-script-injection. What is the irreducible set, where does each live, and what is the one trade-off that actually costs something?

Mental model the student should end with — the two-part frame that drives every decision in the lesson:

1. **The browser is the enforcement engine; the server only declares the policy.** A security header is a rule the *browser* enforces on the response it received. The server's whole job is to ship the right rule. This reframes "add a header" from a magic incantation into "tell the browser what to refuse."
2. **One header blocks live attacks; the rest are one-time settings.** CSP is the only header that intercepts a *runtime* attack (an injected `<script>`, an exfil `fetch`). The other five are configuration-grade hardening — each is a single decision you make once and never revisit. Separating "the load-bearing one" from "the five settings" is the cognitive-load win: the student spends their attention budget on CSP and treats the rest as a checklist.

Two simplifications, layered to keep load down:

- Teach the catalog **as two tiers first** (the five set-and-forget headers, then CSP on its own) before the static/dynamic file split. Don't introduce nonces until CSP has its own section.
- Introduce CSP itself in stages: first the directive list as a deny-by-default allowlist (no nonces), *then* the inline-script problem, *then* nonces as the resolution. The nonce is the hard part; it arrives last, with a diagram.

The architectural spine — and the reason this lesson needs two files — is the **static/dynamic split**: the five constant headers ship from `next.config.ts` (computed once at build, identical on every response); CSP ships from `proxy.ts` because its nonce is regenerated per request. This is the senior reasoning to foreground, not a list to memorize. Pair it with the one real trade-off (a nonced page can't be statically prerendered) and the rollout posture (`Report-Only` first, then enforce).

Scope guard the writer must respect: this lesson **catalogs, reasons, and verifies**. It does not build the nonce-generation machinery from scratch — the chapter outline reserves the full implementation for the project starter (ch082) and the CSP violation-report endpoint for Sentry (ch092). Show the proxy CSP shape so the student recognizes it and can read it, framed as "the starter ships this; here is what every line does," not "type this from a blank file."

Code handling: this is a config lesson, not a React lesson, so no live-coding component fits (ReactCoding can't run a Next proxy; the surface is `next.config.ts` / `proxy.ts`, not TSX). Lean on `Code` for the short blocks, `AnnotatedCode` for the two files that need attention directed line-by-line (the CSP directive string; the proxy nonce flow), `CodeVariants` for before/after `curl -I` and for the `'unsafe-inline'`-vs-nonce contrast, and pre-built exercises (`Buckets`, `MultipleChoice`, `Dropdowns`) for the checks. One `DiagramSequence` carries the nonce round-trip.

Estimated student time: 45–55 minutes (matches the chapter outline).

## Lesson sections

### Introduction (no header — lesson intro prose)

Open with the `curl -I` reveal: a real-looking truncated response with the security headers conspicuously absent. Land the stakes in one breath — clickjacking, MIME-sniffing, downgrade, injected scripts — then the payoff: a handful of headers, mostly set once. State the mental model in its simplest form: a header is a rule the browser enforces; we just have to send it. Connect explicitly to prior knowledge: "you already met security-baseline headers as a category in the HTTP-headers lesson, and you've shipped both `next.config.ts` headers and a `proxy.ts` — this lesson is where those two files each get a security job." Preview the end state: the student can name the six, say which file each lives in and why, read the CSP line, and verify the whole thing in thirty seconds with `curl -I` or securityheaders.com.

Keep it warm and short (pedagogy §3.2). Do **not** make "the senior question" its own heading.

### The browser enforces, the server declares

Establish the enforcement model before any specific header, so every later header is an instance of one idea. A security header is metadata on the response (callback to ch011 L3 — headers as the metadata channel) that instructs the *browser* to constrain what the page may do: which scripts may run, whether the page may be framed, whether it must use HTTPS next time. The server is not enforcing anything at runtime — it ships a policy string, and the browser is the engine that applies it. Why this matters: it explains why these are cheap (no server CPU per request beyond emitting a string) and why they fail silently if the browser is old or the header is malformed (the browser is the only enforcer — there's no server-side backstop).

Small visual aid (`Figure` wrapping hand-authored HTML/CSS, or a two-box `ArrowDiagram`): **server → response with header → browser applies rule**. Three boxes left-to-right; label the arrow "policy declared," label the browser box "policy enforced." Pedagogical goal: cement that the header is a one-way instruction the browser obeys, not a server-side check. Keep it under ~300px tall (vertical-space constraint).

Then preview the catalog as the two tiers, so the student has the map before the detail: five set-and-forget headers + one live-attack header (CSP). A compact `Card`/`CardGrid` or a simple table: header name → one-line "what it refuses." This is the table of contents for the body; don't explain each deeply yet.

Tooltip (`Term`) candidates in this section: **clickjacking** (luring a user into clicking a transparent framed page), **MIME-sniffing** (browser guessing a response's type and executing it as script).

### The five headers you set once

Teach the configuration-grade tier together, because each is a single decision with no real conditionals — grouping them keeps the load low and reserves the student's attention for CSP. For each: the value the course ships, the one-line failure mode it closes, and (where it exists) the single knob that ever flexes. Use a `Code` block for the `next.config.ts` `headers()` array holding all five (this is where they ship — establish that now, ahead of the full file in the split section), then walk them in prose or a tight `AnnotatedCode` over that same array.

The five, with the exact values from the chapter outline and Code conventions §Security baseline:

- **`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`** — two years (the 2026 default; the preload list expects ≥1 year and effectively two). Failure closed: a protocol-downgrade / SSL-strip attack on a first `http://` hit. The one gate that matters: **only emit it in production** (`process.env.NODE_ENV === 'production'`), or you lock `http://localhost` to HTTPS and break local dev. Name preload-list submission as a real but optional follow-up (`hstspreload.org`), not a step the lesson performs.
- **`X-Content-Type-Options: nosniff`** — no decision, no value to tune. Stops the browser from MIME-sniffing a response and running a non-script as script. Ship it and move on.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — the 2026 browser default, set explicitly so it's not left to chance. Sends origin-only on cross-origin navigations, full path same-origin. Note the trap: `no-referrer` looks "more secure" but breaks legitimate analytics attribution — `strict-origin-when-cross-origin` is the senior pick, not the most-locked-down one. (This is a good "beginners over-tighten and break things" moment.)
- **`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`** — disable browser features the app doesn't use, so an injected script can't reach for them. The one flex: if Stripe Elements ships, `payment=()` becomes `payment=(self "https://js.stripe.com")`. Frame it as "deny everything you don't use; open exactly what you do."
- **`X-Frame-Options: DENY`** — legacy clickjacking defense. State plainly that CSP's `frame-ancestors 'none'` subsumes it; keep `X-Frame-Options` only for old crawlers/bots that don't parse CSP. Two belts, named honestly as redundant-on-purpose.

Briefly name, then set aside, the two that *flex* and are not default-on: `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`, scoped to cross-origin isolation for `SharedArrayBuffer`. One sentence: not in the baseline, reach for them only when a feature demands cross-origin isolation. (The course's own docs site happens to set COOP/COEP for WebContainer sandboxes — out of scope to discuss; do not go there.)

Why teach these as a block and CSP separately: every one of these is "set the value, done." Bundling them signals "checklist," which is exactly the right posture — and it isolates CSP as the one header that needs real thought.

`Term` candidates: **HSTS** (forces HTTPS on every future visit for a set duration), **SSL-strip / downgrade attack** (an attacker forcing a victim back to plaintext `http://`).

### CSP: the only header that blocks a live attack

This is the heart of the lesson; give it the most room. Open by separating CSP from the previous five: those harden configuration, CSP intercepts a *running* attack — an injected `<script>` that tries to execute, a `fetch` that tries to ship stolen data to an attacker's domain. CSP is a per-page allowlist of where code and connections may come from; anything not on the list is refused by the browser at runtime.

Teach it in three staged passes (the cognitive-load plan — do not collapse these):

**Pass 1 — the directive allowlist (no nonces yet).** Present the 2026 baseline policy for this stack and read it as a deny-by-default list. Use `AnnotatedCode` so each directive gets its own step and the student's eye is directed one line at a time. The policy (from the chapter outline):

```
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
style-src 'self' 'nonce-{NONCE}';
img-src 'self' data: blob: https:;
font-src 'self';
connect-src 'self' https://*.upstash.io https://*.sentry.io https://us.i.posthog.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`AnnotatedCode` steps (one short paragraph each, blue default, color a couple for emphasis):
- `default-src 'self'` — the floor: everything defaults to same-origin unless a more specific directive overrides.
- `script-src` — leave `'nonce-{NONCE}'` and `'strict-dynamic'` as placeholders the reader will understand in Pass 3; for now say "scripts must be same-origin or explicitly marked — no arbitrary inline."
- `connect-src` — the teachable line: **every third-party origin justifies itself.** `*.upstash.io` (rate limiting), `*.sentry.io` (error monitoring), `us.i.posthog.com` (analytics). The rule: an entry here means "this app talks to this vendor"; an unexplained entry is a finding. This is the senior habit — the policy is a manifest of who your app trusts.
- `img-src 'self' data: blob: https:` — why images are looser (data URLs for inline SVG, blobs for client-generated previews, `https:` for user/CDN images) and why that's an acceptable loosening (images don't execute).
- `frame-ancestors 'none'` — the real clickjacking defense (the modern replacement for `X-Frame-Options`); nobody may frame this app.
- `base-uri 'self'` + `form-action 'self'` — close two injection vectors (rewriting the base URL; redirecting form posts to an attacker).

**Pass 2 — the inline-script problem.** Now expose the tension that forces nonces. Next.js injects inline `<script>` tags to bootstrap hydration; React Server Components stream inline scripts too. A strict `script-src 'self'` would *block Next's own hydration scripts*. There are exactly three ways out, and two are wrong — present as `CodeVariants` (the before/wrong vs. right framing the component is built for):
- `'unsafe-inline'` — allows every inline script, which is precisely the XSS hole CSP exists to close. Mark this the trap: never, not "temporarily." (This is the single most common real-world CSP mistake — call it out as the thing beginners reach for to "make the errors go away.")
- hashes — pin each inline script by content hash; impractical when Next generates the scripts and they change per build. Name and dismiss.
- **nonces** — a fresh random token per request, stamped on every legitimate inline script and listed in the CSP. The browser runs only scripts carrying the matching nonce. This is the senior reach; it gets Pass 3.

**Pass 3 — nonces and `'strict-dynamic'`.** Explain the mechanism, then visualize it. The proxy generates a cryptographically-random nonce per request, puts it in the `script-src`/`style-src` of the response CSP, *and* forwards it to the app as a request header (`x-nonce`) so Server Components can read it via `headers()` (callback to ch033 L1) and stamp it on the scripts they render. `'strict-dynamic'` is the multiplier: a script the browser already trusts (because it had the nonce) may load further scripts without every origin being listed — so you don't maintain a giant allowlist of script CDNs; trust propagates from the nonced root.

Diagram — **`DiagramSequence`** walking one request through the nonce round-trip (the pedagogical centerpiece; the nonce is the lesson's one genuinely tricky idea, and a scrubbable step-through is the right vehicle). Steps, each a simple labeled HTML stage (keep boxes minimal, horizontal, < ~500px tall):
1. **Request arrives** at the proxy.
2. **Proxy generates a nonce** — the canonical Next.js idiom is `Buffer.from(crypto.randomUUID()).toString('base64')` (base64-encoded random token); show the token appearing. Use this exact form in any code so it matches the official Next.js CSP guide.
3. **Proxy sets two things**: the response `Content-Security-Policy` (with `'nonce-abc123'` in `script-src`) and a forwarded request header `x-nonce: abc123`.
4. **Server Component reads `x-nonce`** via `headers()` and stamps `<script nonce="abc123">` on its inline scripts.
5. **Browser receives page + CSP**: runs the script (nonce matches), refuses an injected `<script>` with no nonce. Show one allowed and one blocked script side by side.

Pedagogical goal of the sequence: make "the nonce is the same token in three places, regenerated every request" concrete and spatial, so the static-prerender trade-off in the next section is obvious rather than asserted.

After the diagram, show the **proxy CSP shape** the student will recognize in the starter — a trimmed `AnnotatedCode` of `proxy.ts` building the nonce, composing the CSP string, and returning `NextResponse.next({ request: { headers } })` with `x-nonce` set plus the CSP on the response. Frame explicitly (scope guard): "the project starter ships this file; your job is to read it and know why each piece is here, not to author it from scratch." Highlight (a) the per-request nonce generation, (b) nonce injected into the CSP string, (c) `x-nonce` set on the *request* headers so the app reads it, (d) the CSP set on the *response*. Keep it within the `maxLines` 18 ceiling — trim aggressively, this is for recognition.

`Term` candidates: **CSP** (Content-Security-Policy — a browser-enforced allowlist of where a page's scripts, styles, and connections may come from), **nonce** (a single-use random token issued per request to mark trusted inline scripts), **XSS** (cross-site scripting — running attacker-supplied script in a victim's page), **`'strict-dynamic'`** (lets an already-trusted script load further scripts without listing each origin).

Exercise (end of this section) — `Dropdowns` over the CSP block with two or three directives blanked (`default-src ___`, `frame-ancestors ___`, the `connect-src` vendor list), so the student reconstructs the policy from understanding rather than recall. Place it right after Pass 3 to consolidate. Keep blanks meaningful (the *value* that encodes a decision), not trivia.

### Why CSP lives in proxy.ts and the other five in next.config.ts

Now make the file split explicit — the architectural decision the whole lesson has been building toward. The reasoning is one line: a header that's identical on every response can be computed once at build (`next.config.ts`); a header whose value changes per request must be built per request (`proxy.ts`). The five set-and-forget headers are constant → config. CSP carries a fresh nonce per request → proxy. This is *why*, not *where* — lead with the principle, let the file assignment fall out of it.

Add the precedence note the student needs to not get confused: for routes the proxy matches, the CSP it sets on the response overrides any CSP from `next.config.ts` (so you don't set CSP in both and fight yourself). The five static headers come from config and aren't touched by the proxy.

Reinforce with a `Figure` (simple HTML two-column table or a small `ArrowDiagram`): left column `next.config.ts` → the five constant headers, "computed once at build"; right column `proxy.ts` → CSP, "rebuilt per request (nonce)." Pedagogical goal: a single glance that maps each header to its file *and the reason*. This is the figure the student will mentally re-summon during the audit.

Exercise — **`Buckets`** (two buckets: `next.config.ts` / `proxy.ts`; chips: HSTS, `X-Content-Type-Options`, CSP, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` as part of CSP, `X-Frame-Options`). This is the cleanest check of the lesson's central distinction; drag-to-sort directly exercises "which file, and you know why." Use `instructions` to frame it as "sort each header into the file that ships it." Note in the outline: `frame-ancestors` is a CSP directive (proxy) while `X-Frame-Options` is its own header (config) — that contrast is the point of including both.

### The static-prerender trade-off, and the marketing-site exception

Name the one cost that's real so the student doesn't discover it as a bug. A page that gets a fresh per-request nonce **cannot be statically prerendered** — each request needs a different nonce, so the page must render dynamically. State immediately why this costs nothing *for the app*: every protected app page is already dynamic (it reads the session, the active org, per-tenant data — callbacks to auth/tenancy units). The nonce rides along for free on pages that were never static.

The exception that *is* affected: the public **marketing site** (`example.com`, distinct from `app.example.com`), where pages are static for SEO and speed and you don't want to force them dynamic. There, opt out of nonces and use a **nonceless CSP with explicit origins** — list each third party the marketing pages load (e.g. a scheduling embed like Calendly, Stripe's JS) instead of relying on a nonce. The rule: nonce on the dynamic app shell; explicit-origin CSP on the static marketing pages. Mention this is one place a too-strict nonceless CSP silently breaks an embed — every third-party origin must be listed.

Keep this section tight; it's a consequence, not a new system. A short `Code` block or two-row table contrasting "app shell: nonce, dynamic" vs "marketing: explicit origins, static" suffices. No new diagram.

`Term` candidate: **prerender** (rendering a page to static HTML at build time so every visitor gets the same cached output).

### Ship Report-Only first, then enforce

Teach the rollout posture as the senior move that prevents the classic self-inflicted outage: turning on a strict CSP in enforce mode and discovering it blocks a legitimate script you forgot about — in production, for every user. The safe sequence: ship `Content-Security-Policy-Report-Only` first, which makes the browser *report* violations without blocking anything; watch the violation stream for a week (Sentry ingests CSP reports natively — name it, full wiring is ch092's job); then flip the header name to `Content-Security-Policy` to enforce. Note the one tooling trap from the chapter outline: don't ship `Content-Security-Policy` and `Content-Security-Policy-Report-Only` *simultaneously* with different policies — it confuses tools and your own reasoning; it's one or the other during rollout. State that the course's seeded codebase runs **enforce mode** for teaching clarity, so the student isn't confused when they see no `-Report-Only` in the starter.

Small visual: a two-state strip (Report-Only → observe → Enforce) as plain HTML in a `Figure`, or just inline prose + an `Aside`. Low priority — a diagram here is optional; the concept is a two-step timeline.

### Verify in thirty seconds

Close the lesson on the concrete habit, because "I shipped headers" is unverified until you've looked. Two tools, both fast:

- **`curl -I https://app.example.com`** — dump the response headers and eyeball the six. Show this as `CodeVariants` or a before/after `Code` pair: the bare response from the intro (no security headers) next to the hardened response (all six present, CSP with a nonce visible). The before/after closes the loop the intro opened — same command, transformed output. This is the most satisfying possible ending and reinforces "the header is just a string on the response."
- **securityheaders.com** — paste the URL, get a letter grade and a per-header breakdown. Name it as the zero-setup external check; one sentence.

State the forward reference plainly (scope): turning this manual check into a CI smoke test (assert the headers are present on every deploy) lands in the observability/CI chapter (ch097 L3) — named, not built here.

Optional close: an `ExternalResource`/`LinkCard` or two — MDN's CSP reference and the Next.js "Content Security Policy" guide — as the canonical deep-dives for the student who wants the full directive surface this lesson deliberately trimmed.

### Recall check (final mini-exercise, not the chapter quiz)

One or two `MultipleChoice` cards to self-test the load-bearing ideas (the chapter quiz is a separate lesson — these are inline self-checks, pedagogy §3). Author the choices so they require reasoning, not prose-matching (per the MCQ doc):
- A question on *why* `'unsafe-inline'` defeats the policy (correct: it re-allows exactly the injected inline scripts CSP exists to block) — distractors that sound plausible (e.g. "it slows hydration," "it's deprecated").
- A question on *why* CSP lives in `proxy.ts` not `next.config.ts` (correct: the nonce is regenerated per request; a build-time header is identical on every response).

Keep to two cards max here; the heavier assessment is the chapter quiz.

## Scope

Prerequisites to **redefine in one line each** (the student has these; don't re-teach):
- `proxy.ts` — the Next.js 16 request gate (renamed from `middleware.ts`), Node-only, runs before the route; matcher is the cost surface. (ch033 L2.) Here it gains a security job: per-request CSP.
- `next.config.ts` `headers()` — returns `[{ source, headers }]` applied to matching routes at the edge. (ch034 L1.)
- `headers()` from `next/headers` — async server-only read of the request's headers, used by Server Components to read the proxy-set `x-nonce`. (ch033 L1.)
- CSRF and React's auto-escaping / `HttpOnly` cookies as the *already-shipped* XSS/CSRF defenses; CSP is the runtime layer on top, not a replacement. (The CSRF/XSS-defaults lesson named CSP as deferred to here.)

**Out of scope** (do not teach; name-and-defer where the outline says to):
- The nonce-generation implementation in depth and the from-scratch `proxy.ts` CSP builder — the project starter (ch082) ships it; this lesson shows it for recognition only.
- The CSP **violation-report endpoint** — Sentry covers it natively; deep wiring is ch092. Name it once in the Report-Only section.
- **SRI** (subresource integrity), full **COOP/COEP** cross-origin-isolation setup, and **preload-list submission** — named once, not taught.
- **CI smoke-checking** the headers on deploy — ch097 L3. Named in the verification section.
- Rate-limit headers (`RateLimit-*`), audit logging, consent, secrets, env validation, dep hygiene — the other lessons of this chapter (L2–L8). This lesson is headers only.
- General header theory (content negotiation, caching directives, auth schemes) — covered in the HTTP-headers lesson (ch011 L3); assume it.

## Code conventions notes

Aligns with Code conventions §Security baseline (the authoritative split): five static headers in `next.config.ts` (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`) + per-request nonce-based CSP with `'strict-dynamic'` in `proxy.ts`; "six headers minimum." Note one deliberate wording reconciliation for the writer: the conventions list puts `frame-ancestors` under the `next.config.ts` group, but `frame-ancestors` is a CSP *directive* and therefore physically rides in the proxy's CSP string (the conventions line is grouping it by intent, not file). Teach it as a CSP directive in `proxy.ts`, and keep the standalone `X-Frame-Options: DENY` in `next.config.ts` as the legacy belt — this matches the chapter outline exactly and is the correct production shape. Flag this as intentional so a downstream agent doesn't "fix" it back.

Other conventions in play: `proxy.ts` uses the framework-dictated default export (naming rule); single quotes in all header/policy strings; security/compliance inline comments are explicitly allowed (e.g. `// production-only: HSTS must not lock localhost to HTTPS`) — use them sparingly where a runtime invariant isn't inferable. HSTS gating uses `process.env.NODE_ENV` directly (the one sanctioned `process.env` read outside `env.ts`, per the env conventions), not the typed `env`.
