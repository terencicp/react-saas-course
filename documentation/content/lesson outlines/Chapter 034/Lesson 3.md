# Edge redirects and rewrites

- **Title (h1):** Edge redirects and rewrites
- **Sidebar label:** Redirects and rewrites

---

## Lesson framing

### What this lesson is, and what the student already knows

This is the **third home** for redirect/rewrite rules, and the student arrives already fluent in the *concepts*.
Chapter 033 lesson 3 taught — from the `proxy.ts` side — redirect-vs-rewrite (what the address bar does), 307-vs-308 (and why not 301/302), link equity, the three-home decision tree, open-redirect safety, and rewrite loops.
Chapter 029 lesson 4 taught `redirect()` (307) / `permanentRedirect()` (308) / `notFound()` from `next/navigation`.
Chapter 034 lesson 1 mapped `next.config.ts` and explicitly *promised* `redirects`/`rewrites`/`trailingSlash` would land here, and flagged the dev-server-restart gotcha would recur as "added a redirect, it didn't fire."

So the lesson's job is **not** to re-teach those concepts. It is to install the *config-file home*: the static, CDN-edge place for **request-independent** rules, its `source`/`has`/`missing` pattern syntax, its **zero-function-invocation cost story**, the `trailingSlash` lock-in decision, and externalized rewrites. The 307/308 SEO line is *reused* (one-line recap), not re-derived.

This is a **conditional-power-tool-vs-default** lesson framed inversely: the config home is actually the *cheapest* home, and `proxy.ts` is the one that costs an invocation. The senior reflex to install: **"is this rule the same for every visitor? → config. Does it depend on who's asking? → proxy."** That single question is the spine.

### Pedagogical conclusions (whole-lesson)

- **Lead with the cost story, because cost is the whole reason this home exists.** A `proxy.ts` redirect pays a function invocation on every matched request; a config redirect is applied by the CDN edge with zero invocation. For an always-true rule, paying the proxy is pure waste. The student already *can* write this redirect in `proxy.ts` (ch 033) — the lesson's value is teaching *why you'd move it*.
- **Reuse, don't reteach.** Every concept the student owns (redirect-vs-rewrite, 307/308, loops, open-redirect) gets a one-line recap with a back-reference, then the lesson spends its tokens on the *new* surface (pattern syntax, `has`/`missing`, the edge cost, externalized rewrites, `trailingSlash`).
- **The decision tree is the climax, not the opener.** The student has seen a two-home version (proxy vs `redirect()`); this lesson completes it to three homes. Make this the `StateMachineWalker` payoff *after* the config mechanics are taught — the walk is the senior's question order, and it's the thing they'll actually carry to work.
- **Anchor every example in the chapter-wide SaaS rebrand scenario** the chapter outline seeds: `/account` → `/settings`. It's request-independent, permanent, and self-evidently a config rule. Build the whole lesson around one coherent app's URL-shaping config rather than disconnected snippets.
- **Pattern syntax is the genuinely-new mechanical skill** and the one place the student needs hands-on reps — `:slug` vs `:slug*`, the leading-slash-before-colon gotcha, regex constraints. This earns a live exercise.
- **Two booby-traps deserve structural emphasis** because they bite silently and permanently: (1) the missing leading `/` before `:` causes infinite redirect loops (confirmed in official docs), and (2) flipping `trailingSlash` after launch breaks every external link forever. Teach these *in* the section that teaches the mechanic, never bundled at the end.
- **Cognitive-load order:** static redirect (simplest, fully request-independent) → pattern syntax (the matcher) → `has`/`missing` (the conditional edge of "request-independent") → rewrites (same shape, invisible) → externalized rewrites (the reverse-proxy gotcha) → `trailingSlash` (the launch-time lock) → the three-home decision tree (synthesis). Each step adds one idea.

### Code component conventions

- Worked `next.config.ts` evolves across the lesson; show its growth with `AnnotatedCode` for the final combined file, **blue** (continuity anchor reused by ch 033 lessons 2–5 and ch 034 worked examples).
- `CodeVariants` for the two A/B contrasts: proxy-redirect vs config-redirect (cost framing), and the leading-slash loop bug (broken vs fixed).
- Small `Code` blocks for single-rule snippets while teaching syntax.
- `import type { NextConfig }`, `.ts` config, single quotes, 2-space — per ch 034 l1 convention. Config uses a typed `NextConfig` default export (the framework-dictated config shape).

---

## Lesson sections

### Introduction (no h2 — lesson preamble)

Open on the rebrand: product renames `/account` to `/settings`, permanently, for every visitor.
The student already knows how to write this redirect in `proxy.ts` (ch 033) — so why a new lesson?
Because that rule is **always true**: it doesn't depend on the cookie, the header, or who's asking.
Putting an always-true rule in `proxy.ts` makes the platform run a function on every single request just to send the same 308 it could have sent from the CDN edge for free.
State the lesson goal: the **third home** for URL rules — `redirects()` and `rewrites()` in `next.config.ts` — the static, edge-applied place for request-independent rules, and the question that decides which home a rule belongs in.
Keep it to ~5 sentences; the student is warm on the concepts, cold only on this home.

Recap line (one sentence, with back-refs): the student owns redirect-vs-rewrite and 307-vs-308 from ch 033, and `redirect()`/`permanentRedirect()` from ch 029; this lesson is about the *config* home.

---

### The cheapest place to send a redirect

**Goal:** install the cost story first, because it's the entire justification for the config home. This is the "trigger before tool" framing inverted — name what crossing into a function invocation costs.

Content:
- `redirects()` in `next.config.ts`: an `async` function returning an array of `{ source, destination, permanent }`. Show the minimal one-rule example (`/account/:path*` → `/settings/:path*`, `permanent: true`).
- The headline: **applied at the CDN edge, zero function invocation.** No `proxy.ts` run, no Server Component render — the platform reads the rule table at build and the edge answers the redirect before any function wakes up.
- Contrast cost explicitly with the proxy: the proxy runs on every matched request (ch 033 cost model the student already learned); the config rule runs *nowhere at request time* — it's baked into the edge config.
- Recap 307/308 in **one line** (back-ref ch 033 l3): `permanent: true` = 308 (sticky, indexed, forwards link equity), `false` = 307 (temporary). Confirmed: both preserve the request method — that's *why* Next uses them over 301/302. Don't re-derive the method-rewrite footgun; one clause naming it suffices.
- Name the constraint that motivates everything downstream: **these rules are global and request-blind by default** — same for every visitor, no per-route override. That's the feature (cheap, cacheable) and the limit (can't see the session).

Component: `CodeVariants` — tab A "In `proxy.ts` (runs every request)" vs tab B "In `next.config.ts` (runs at the edge)". Same rebrand redirect both ways; first sentence of each pane carries the cost verdict ("pays an invocation per request" / "zero invocation, edge-applied"). This makes the student *feel* the move, not just read it. Reuse the ch 033 proxy-redirect shape verbatim in tab A so the contrast is apples-to-apples.

`Term`: **link equity** (ranking signal a 308 forwards from old URL to new; a 307 does not).

Watch-out (inline, in this section): **edit-without-restart runs the old rules.** The config is read at startup (ch 034 l1); add a redirect, hit the route, nothing happens → you forgot to restart the dev server. This is the promised recurrence from ch 034 l1's "added a redirect, it didn't fire." One `Aside` (caution).

---

### Matching the request path

**Goal:** teach the `source` pattern syntax — the genuinely-new mechanical skill. This is the matcher, and it's `path-to-regexp`, not the proxy's negative-lookahead regex.

Content, built up by complexity (one idea per rung):
1. **Static path** — `source: '/account'` matches exactly `/account`, anchored to the start (won't match `/team/account`).
2. **Named single-segment param** — `/account/:slug` matches `/account/billing` but **not** `/account/billing/history` (no nesting). The captured `:slug` is referenced in `destination`.
3. **Catch-all** — `/account/:path*` matches `/account`, `/account/billing`, `/account/billing/history` (zero-or-more segments). This is the rebrand workhorse — it forwards the whole sub-tree. Modifiers: `*` zero-or-more, `+` one-or-more, `?` optional.
4. **Regex-constrained** — `/invoices/:id(\\d+)` matches `/invoices/123` but not `/invoices/abc`. Note the double-backslash (escaped in the TS string).
5. **Destination references captures** — `/blog/:slug*` → `/news/:slug*`; query strings pass through automatically (`/blog/x?ref=a` → `/news/x?ref=a`).

**The loop booby-trap (structural emphasis, taught here not at the end):** the forward slash **must** come before the colon — `source: '/account/:path*'`, never `'account/:path*'`. Without the leading slash the param is treated as a literal string and you get an **infinite redirect loop** (confirmed in Next.js docs). Show broken-vs-fixed.

Components:
- `AnnotatedCode` (blue) stepping through a `redirects()` array with one rule per pattern kind — static, `:slug`, `:path*`, regex — each step explaining what that one matches and what it won't. Keeps the matcher rungs visually separated.
- `CodeVariants` for the loop bug: tab "Broken — infinite loop" (`source: 'account/:path*'`) vs tab "Fixed" (`source: '/account/:path*'`), `del`/`ins` on the leading slash. First sentence names the symptom ("redirects forever").

**Exercise — `ReactCoding` (target-match / no Next runtime), or a custom matcher exercise:** give the student a handful of incoming paths (`/account`, `/account/billing`, `/account/billing/2024`, `/invoices/42`, `/invoices/abc`) and a `source` pattern; they predict which match. Simpler, well-supported alternative: a **`Buckets`** drill — buckets "Matches `/account/:slug`" vs "Matches `/account/:path*` only" vs "Matches neither"; items are concrete paths. The bucket form is the recommendation (no runtime needed, directly drills the nesting boundary that trips everyone). Provide it after the matcher is taught.

`Term`: **path-to-regexp** (the pattern library Next's `source` syntax compiles to — the same `:param` and `*` grammar as Express routes).

---

### Narrowing a rule with `has` and `missing`

**Goal:** teach the conditional edge of "request-independent." `has`/`missing` let a config rule peek at a cookie, header, host, or query *without* leaving the edge — but the line where this stops and `proxy.ts` starts is the senior judgment.

Content:
- Shape: each rule can carry `has` and/or `missing`, arrays of `{ type: 'header' | 'cookie' | 'host' | 'query', key, value? }`. **All `has` must match AND all `missing` must not match** for the rule to fire.
- `value` is optional — omit to match *presence* of any value; provide a string (regex-capable, with named groups usable in `destination`) to match a specific value.
- Canonical reach: gate a public marketing URL to a logged-in destination **only when no session cookie is present** — `missing: [{ type: 'cookie', key: '...' }]`. Or apex-vs-`www` host routing via `type: 'host'`.
- **The boundary that matters (the senior line):** `has`/`missing` test *presence and literal value* at the edge — they do **not** decode, verify, or trust. Anything that needs to *validate* a session, read the *current* user, or make a real authz decision still belongs in `proxy.ts` (cheap presence check) → route (authoritative), per ch 033's "presence here, real check there." A config `has: cookie` is a *coarser* version of the proxy's `getSessionCookie` presence check — fine for a UX nudge, never for security.
- Concretely: redirecting a marketing page to `/dashboard` when a session cookie *exists* is a legitimate config rule (it's a UX optimization; the dashboard re-checks). Deciding *what the user may see* is not.

Component: small `Code` block with a `missing`-cookie redirect, then one `Aside` (note) drawing the proxy boundary line with the ch 033 back-ref. Keep it tight — this is a narrow extension, not a new mental model.

`Term`: none new; reuse the student's session-cookie mental model.

---

### Rewrites: changing the implementation, not the URL

**Goal:** transfer the redirect mechanics to rewrites (same `source`/`destination`, no `permanent`), recap the one-line semantic difference, and land the externalized-rewrite reverse-proxy gotcha.

Content:
- One-line recap (back-ref ch 033 l3): **redirect** changes the address bar (visible, two round-trips); **rewrite** keeps the URL and swaps what the server renders behind it (invisible, one round-trip). Don't re-derive — the student owns this.
- `rewrites()` shape: same `{ source, destination }`, **no `permanent`** (a rewrite isn't an HTTP status, it's an internal swap). Returns either a **flat array** (the common case — runs after route matching) or an **object** with `beforeFiles` / `afterFiles` / `fallback` stages. Most app teams use the flat array; name the object form as the power-tool for ordering against the filesystem (external proxies typically live in `fallback`).
- Canonical static rewrite: serve a marketing CMS or docs site at `/blog/:path*` from an upstream origin while the URL stays on your domain.
- **Externalized rewrites (the gotcha section):** `destination: 'https://marketing.example.com/:path*'` proxies to an external origin — every matched request now **streams through your deployment** to the upstream and back. This is no longer free-at-the-edge; it's a reverse proxy with real cost. **Keep the matcher tight.** An unbounded `:path*` at the root captures *everything* — including `/_next/*` asset requests and API routes — and proxies them all to the upstream, which breaks the app. Constrain to the actual prefix (`/blog/:path*`), never the bare root.
- Brief note: `proxy.ts` rewrites *override* config rewrites when both match (the proxy runs first) — so don't define the same rewrite in both places.

Components:
- `CodeVariants`: tab "Internal rewrite" (`/blog/:path*` → `/cms/blog/:path*`, stays on origin, cheap) vs tab "External rewrite" (`→ https://...`, streams through, name the cost). First sentence of each pane carries the cost verdict.
- One `Aside` (caution) for the unbounded-matcher-proxies-assets trap.

`Term`: **reverse proxy** (your server forwards a request to an upstream origin and relays the response, with the client none the wiser).

---

### `trailingSlash`: a launch-time decision you can't take back

**Goal:** teach the one config flag whose cost is *permanence*, framed as a decision the senior makes once at project start and locks.

Content:
- What it does: `trailingSlash: false` (the default) serves `/about`; `true` serves `/about/` and redirects `/about` → `/about/`. It picks the canonical URL form for the whole app.
- Why it matters: the choice bakes into every internal link, every external backlink, every indexed URL, every shared link. **Flipping it after launch issues a redirect on every previously-canonical URL** — every backlink and bookmark now pays a redirect hop forever, and search engines re-crawl the whole site. It's a permanent paper-cut.
- The senior reflex: **pick one form at project start and never touch it.** Default `false` is the right pick for almost every SaaS (cleaner URLs, the framework default). Name it once, lock it, move on.
- This is request-independent and global — which is *why* it lives in config, tying it back to the lesson's spine.

Component: prose + one small `Code` snippet showing the flag in the config. No diagram needed — the cost is conceptual (permanence), best carried by the sentence "you can't take it back." One `Aside` (caution) stating the flip-after-launch consequence.

---

### Which home does this rule belong in?

**Goal:** the synthesis and the thing the student carries to work — complete the three-home decision tree the student has seen as a two-home version. This is the lesson's climax.

Content — the three homes, decided by **two ordered questions** (reuse ch 033 l3's exact framing so it clicks):
1. **Does the rule depend on the request** (who's asking — session, geo, A/B, host beyond simple matching)?
   - **No → `next.config.ts`** `redirects()`/`rewrites()`. Static, edge-applied, zero invocation. (Legacy URL migrations, marketing renames, the rebrand.)
   - **Yes →** go to question 2.
2. **Does it need to happen before the route renders, conditionally, on every request** (auth gate, subdomain tenancy, A/B bucketing)?
   - **Yes → `proxy.ts`** (ch 033). Runs per request, can read cookies/headers/geo, pays an invocation.
   - **No — it's the outcome of an action or a per-page check → `redirect()` / `permanentRedirect()`** from `next/navigation` (ch 029). After a Server Action, or inside one page.
- One-liner to memorize (reuse ch 033's): *"Static-and-known goes in the config; request-conditional goes in the proxy; after-an-action goes in `redirect()`."* The new contribution of *this* lesson is the **first branch** — the config home — and the cost reason it's the default when the rule is request-blind.
- Add the subtlety the student now has: `has`/`missing` blur the first question slightly — a *presence* check (cookie exists?) can stay in config; a *validation* check (is this session valid?) must move to the proxy.

Component: **`StateMachineWalker`** (`kind="decision"`, no `<Figure>` wrapper). This is the ideal vehicle — it forces the student through the senior's *question order* (request-dependence first, then timing), and the walk *is* the lesson. Author it as:
- Root `Question` "Does this rule depend on who's asking?" → branches "No, same for everyone" / "Yes, depends on session/geo/A-B".
- "No" → branch to a sub-question "Is it just checking a cookie/header is *present* (not validating it)?" → "Just presence" leads to a `Leaf` "`next.config.ts` with `has`/`missing`"; "Pure static, no condition" leads to `Leaf` "`next.config.ts` `redirects()`/`rewrites()`".
- "Yes" → "Must it run before render on every request?" → "Yes, gate/rewrite per request" → `Leaf` "`proxy.ts`"; "No, it's after an action or a single page" → `Leaf` "`redirect()` / `permanentRedirect()`".
- Each `Leaf` verdict names the home; the reason body names the cost and one canonical example. Keep leaf bodies to 2–3 sentences with the back-ref chapter.

**Exercise — `Buckets`** (`twoCol`), placed right after the walker to drill it: three buckets ("`next.config.ts`", "`proxy.ts`", "`redirect()`/`permanentRedirect()`"); items are concrete rules — "Rebranded `/account` → `/settings` for everyone" (config), "Bounce logged-out users off `/dashboard`" (proxy), "Send the user to the invoice after creating it" (`redirect()`), "Serve `/docs/*` from an upstream site, same URL" (config rewrite), "Route apex vs `www`" (config `has: host` — or proxy; pick the clean-cut version), "Permanently move `/pricing` → `/plans` after a launch" (config 308). This is the highest-value checkpoint in the lesson — it tests the exact judgment the student will use at work.

---

### The whole config, end to end

**Goal:** consolidate into one realistic, sub-30-line `next.config.ts` the student could ship — the three-rule worked example the chapter outline calls for.

Content — one `next.config.ts` carrying:
- `cacheComponents: true`, `typedRoutes: true` (from ch 034 l1 — shown but not re-explained; one-line "always on, see lesson 1").
- `redirects()` with: the 308 rebrand (`/account/:path*` → `/settings/:path*`), and a permanent rename with a `has`/`missing` clause (e.g. a marketing page redirect gated on a cookie).
- `rewrites()` with: the external docs/marketing rewrite (tight `/docs/:path*` matcher).
- `trailingSlash: false` shown explicitly as the locked choice.
- A commented placeholder for `headers()` (security baseline → ch 081, per ch 034 l1's pattern — carry the comment, not the contents).

Component: `AnnotatedCode` (**blue**), `maxLines` ~18, stepping through each block (always-on flags → redirects → rewrites → trailingSlash → headers placeholder). Each step ties the rule back to its home-decision. This is the artifact the student screenshots.

Close with a one-paragraph synthesis: the config file owns the app's *request-independent* URL shape; the proxy owns the *request-dependent* shape; `redirect()` owns the *action-time* shape — three homes, one question to route between them.

---

### External resources (optional `ExternalResource` cards)

- Next.js docs — `redirects` config reference.
- Next.js docs — `rewrites` config reference (the `beforeFiles`/`afterFiles`/`fallback` stages).
- `path-to-regexp` README (the `source` pattern grammar), only if the matcher section leaves the student wanting the full modifier table.

Skip a YouTube video: ch 033 already carried a ByteGrad proxy/redirect video, and this lesson is a tight, config-mechanics extension — a video would be redundant. (Note for the resourcer: only add one if a genuinely config-redirects-focused, recent clip surfaces; otherwise omit.)

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Redirect-vs-rewrite semantics, 307-vs-308, link equity, redirect loops, open-redirect safety (ch 033 l3 — owned; recap one line each, back-ref).
- `redirect()` / `permanentRedirect()` / `notFound()` from `next/navigation` (ch 029 l4 — named as the third home, not taught).
- `proxy.ts` and its matcher / cost model (ch 033 l2 — named as the second home; the cost contrast is the whole point, so the proxy's per-request cost is *assumed known*).
- `next.config.ts` as a typed object read once at startup, `cacheComponents`/`typedRoutes` always-on, the dev-restart gotcha (ch 034 l1 — assumed; restart gotcha is *recapped* because l1 promised it would recur here).
- Session-cookie presence model, "presence here, real check there" (ch 033 — reused for the `has`/`missing` boundary).

**Explicitly out of scope (do not cover; name the owning lesson only if needed):**
- Conditional/request-dependent redirects and rewrites *implemented in* `proxy.ts` (ch 033 l3) — this lesson points to that home, doesn't re-show its code.
- `headers()` config *contents* — CSP, HSTS, security baseline (ch 081). Worked example carries a commented placeholder only, matching ch 034 l1.
- `images` config (ch 034 l2), `serverExternalPackages`/`experimental` (ch 034 l1) — siblings in the same config file, already taught; reference the l1 map, don't re-tour.
- i18n routing, locale-prefixed redirects, `hreflang` (ch 084). The docs show `locale`/i18n redirect forms — **omit entirely**; flag as ch 084.
- `basePath` config — niche, not part of the 2026 SaaS default; omit.
- Async data sources for `redirects()` (reading a CMS/manifest at build to generate rules) — the chapter outline flags this as rare for app teams. Name in **one sentence** ("`redirects()` is async, so a content-heavy site could generate rules from a CMS at build") and move on; not a teaching focus.
- `statusCode` custom-code escape hatch — one-line watch-out at most (use `permanent` not `statusCode`); not taught.
- The full `path-to-regexp` modifier surface (optional groups, named wildcards, unnamed params) — teach `:slug`, `:path*`, regex-constraint, and the modifiers `*`/`+`/`?`; link the README for the rest.

**Deliberate divergences (flag for downstream agents):**
- The lesson *reuses* the ch 033 proxy-redirect snippet verbatim in the cost-contrast `CodeVariants` tab A — this is intentional, so the A/B is apples-to-apples. Don't "improve" it into a different example.
- The decision-tree `StateMachineWalker` deliberately re-states ch 033 l3's two-question framing rather than inventing new wording — continuity is the point; keep the exact "depends on the request? / before render?" question order.
