# Lesson outline — Chapter 033, Lesson 3

## Lesson title

- **Title:** Rewrites and redirects in proxy.ts
- **Sidebar label:** Rewrites and redirects

## Lesson framing

This lesson is the **second half of the proxy anatomy** begun in lesson 2. Lesson 2 built the `proxy.ts` file, the matcher, the three return shapes (`redirect` / `rewrite` / `next`), the auth-gate worked example, and named "rewrites and redirects" as one of the four legitimate jobs but deferred the depth. This lesson delivers that depth. It does **not** re-teach the file convention, the matcher syntax, the `NextRequest`/`NextResponse` surface, or the fail-open rule — those are owned by lesson 2 and only referenced.

Three distinct teaching blocks, in dependency order:

1. **The semantic split.** Redirect (user-visible URL change, new request, history + SEO) vs. rewrite (internal swap, address bar unchanged). This is the conceptual spine — everything else hangs off getting this distinction clean. Plus the status-code surface (307 vs 308) which only matters once "redirect" is understood.
2. **The decision tree.** Where a redirect/rewrite belongs: `proxy.ts` (request-conditional) vs. `next.config.ts` (static, forward ref to ch 034.3) vs. `redirect()`/`notFound()` from `next/navigation` (per-action / per-route, back-ref to ch 029.4). This is the senior-mindset payoff — the student already knows three places to redirect from; this lesson sorts them.
3. **The two production patterns with their sharp edges.** (a) The subdomain **rewrite** for multi-tenancy — extract host, rewrite to `[org]` route, and the **redirect-loop pitfall** that is unique to rewrites. (b) The `?next=` post-login **redirect** and its **open-redirect** hole — the security spine, closing the debt lesson 2 deliberately left open with its unvalidated `next=`.

**Senior-mindset anchors** (per the pedagogical pillars — decisions over syntax):

- "Redirect changes what the user sees in the address bar; rewrite changes what the server renders behind it. Neither is better — they answer different product questions." (chapter-outline phrasing, keep it.)
- "Static-and-known goes in the config; request-conditional goes in the proxy; after-an-action goes in `redirect()`." This is the one-sentence sorting rule the student should leave with.
- "Never redirect to a URL that came from the user without validating it" — the open-redirect rule, anchored to the project's `safeNext()` helper convention (`lib/redirects.ts`, never `redirect(searchParams.get('next'))` per the security baseline).
- Production stakes throughout: legacy-URL migration with the wrong status code "persists long after the rule is removed"; a rewrite loop returns 500s on the matched path; an open redirect is "the classic security hole" weaponized in phishing.

**Mental model the student ends with.** The proxy can change the request's destination two ways — visibly (redirect, the browser re-asks) or invisibly (rewrite, the server quietly serves elsewhere). Pick the status code by permanence, pick the *location* of the rule by whether it depends on the request, and treat any user-supplied redirect target as hostile until proven same-origin.

**Continuity hooks this lesson MUST honor** (from lesson 2 + continuity notes):
- Continue the **same worked-example `proxy.ts`** from lesson 2 (auth gate + matcher). This lesson *adds* the legacy-URL redirect and the subdomain rewrite to that file — lesson 2's notes explicitly held the legacy-URL redirect for this lesson "to avoid scope bleed." The final worked example is the union: matcher + auth gate (with a now-**validated** `next=`) + subdomain rewrite + legacy 308 redirect, "under fifty lines."
- Reuse lesson 2's vocabulary verbatim: the three terminals map to `redirect`/`rewrite`/`next`; "no implicit pass-through, every branch returns"; "presence here, real check there"; `__Host-session` cookie; `SESSION_COOKIE_PREFIX` and `requireUser()` as imported black boxes (Unit 8).
- Use the corrected platform reads: `geolocation(request)` / `ipAddress(request)` from `@vercel/functions` — **never** `request.geo` / `request.ip`. The chapter outline's mention of `request.geo` in the conditional-redirect section is stale; geo-based redirect examples must use the `@vercel/functions` form (or be replaced with a cookie/header example to avoid leaning on a niche API).

**Cognitive-load sequencing.** Lead with the visible/invisible distinction using a side-by-side that shows *what the browser address bar does* — the single fact that disambiguates the two operations. Add status codes only after "redirect" is concrete. Defer both production patterns (subdomain rewrite, `next=`) until after the decision tree, so the student knows *why* these live in the proxy before seeing *how*. Each sharp edge (loop, open-redirect) is taught inline with the pattern that creates it, never bundled into a trailing "gotchas" section.

**Length / pacing.** Estimated 40–50 min. Pairs with lesson 2. Keep code blocks tight; this is a recognition-and-decision lesson, not a memorize-the-API lesson (the API was lesson 2).

---

## Lesson sections

### Introduction (no header)

Open with the chapter-outline's twin scenario, told as one continuous product story so the two operations contrast immediately:

- A SaaS ships v2 of its billing surface; `/billing/manage` becomes `/settings/billing`. Old emails still link to the dead URL. The app needs the browser to *go to* the new URL, search engines to record the move permanently, and the user to land on the right page.
- Separately, the app multi-tenants on subdomains: `acme.app.com/dashboard` should *serve* the org-scoped route internally, but the user must keep seeing `acme.app.com/dashboard` — the address bar must not change.

Name the two operations against those two needs: **redirect** = the visible URL change (browser navigates, history updates, SEO sees 308); **rewrite** = the invisible internal swap (address bar unchanged, server renders a different route). State the lesson's promise: by the end the student has the semantic split, a clear rule for *where* each rule belongs (proxy vs config vs `redirect()`), and the two production patterns — subdomain rewrites and safe post-login redirects — with the security and looping edges that bite people.

Connect back: lesson 2 named rewrites and redirects as a proxy job and left an unvalidated `next=` in the worked example "for this lesson." We are here to close that and to finish the proxy file.

Keep it warm and brief (pedagogical guideline 3.2). No section header — flows straight into the first h2.

### Two operations, one address bar

**Goal:** Install the visible-vs-invisible distinction so cleanly that the student never confuses the two again. This is the load-bearing section.

Teach the mechanics of each as a contrast, not in isolation:

- **Redirect.** The proxy returns a `3xx` response with a `Location` header. The browser sees it and issues a *brand-new request* to the new URL. The address bar changes, history gets an entry, a bookmark would save the new URL, and a search engine treats a permanent redirect as the canonical replacement. Two round trips.
- **Rewrite.** The proxy returns the *content of a different internal route*. The browser issued one request and got one response; it never learns a different URL exists. The address bar stays put. One round trip. The user sees one URL; the server rendered another.

Land the senior framing verbatim: *neither is better — they answer different product questions.* Redirect when the URL itself should change (rename, deprecation, bounce). Rewrite when the implementation moves but the user shouldn't notice (multi-tenancy, internal restructuring).

**Diagram — side-by-side request flow (the disambiguator).** Use `TabbedContent` with two tabs, each holding a `<Figure>` + a Mermaid `sequenceDiagram` (per diagrams INDEX: sequences → Mermaid). Pedagogical goal: make the *number of round trips* and *what the address bar shows* visually obvious — that's the whole distinction.
  - Tab "Redirect (`/billing/manage` → `/settings/billing`)": actors `Browser`, `Proxy`, `Route`. Browser → Proxy `GET /billing/manage`; Proxy → Browser `308, Location: /settings/billing` (note: "address bar now shows /settings/billing"); Browser → Proxy `GET /settings/billing` (the second request); Proxy → Route pass through; Route → Browser `200`. Caption: two requests; the URL the user sees changes to the destination.
  - Tab "Rewrite (`acme.app.com/dashboard` → `/orgs/acme/dashboard`)": Browser → Proxy `GET /dashboard` (host: acme.app.com); Proxy → Route `render /orgs/acme/dashboard` (note: "URL bar still shows /dashboard"); Route → Browser `200`. Caption: one request; the user keeps seeing the original URL while a different route renders.
  - Keep both horizontal/compact (vertical-space constraint). The visual contrast (two arrows back to Browser vs. one) is the lesson.

Short prose tie-back to lesson 2: these are two of the three terminals from the lifecycle diagram — `NextResponse.redirect()` and `NextResponse.rewrite()`. `NextResponse.next()` (pass through) was the third. No need to re-explain the API surface.

### The status code is the permanence signal

**Goal:** Give the student the 307/308 reflex and kill the 301/302 habit, anchored to the SEO/method-preservation *why* (decisions before syntax — name the consequence, not just the number).

- `NextResponse.redirect(url)` **defaults to 307** (temporary). Pass the second `status` argument to promote to **308** (permanent): `NextResponse.redirect(url, 308)`. (Verified against current docs — 307 is the default.)
- **What permanence means downstream.** 308 tells browsers and search engines "this move is forever" — the index updates, link equity forwards, the browser may cache the redirect. 307 says "temporary, keep the old URL canonical." The senior reach for a legacy-URL migration is **308**; for a request-conditional bounce (logged-in user sent off `/login`) it's **307** because the rule isn't a permanent property of the URL.
- **Why not 301/302.** They predate method-preserving redirects: many clients silently rewrite a `POST` to `GET` on a 301/302. 307/308 preserve the method. Modern code uses 307/308 exclusively. Name this as a one-liner — it's a *recognize-and-avoid* fact, not a deep dive.
- **The cost of getting permanence wrong** (production stakes): a wrongly-permanent 308 gets cached by browsers and indexed by search engines and "persists long after the rule is removed" — you can't easily un-tell a browser a redirect was permanent. Under-commit when unsure: 307 is the safer default if you're not certain the move is forever.

**Component:** a small comparison table or a 2-row `Code` pair is overkill — use a single `CodeTooltips` block showing both forms in ~4 lines, with tooltips on `307`/the default and on the `308` second argument explaining the permanence/caching consequence. Example shape:
```ts
NextResponse.redirect(new URL('/settings/billing', request.url));        // 307, temporary
NextResponse.redirect(new URL('/settings/billing', request.url), 308);   // 308, permanent
```
Tooltips: on the first call → "Defaults to 307 — temporary. The old URL stays canonical; nothing is cached." On `308` → "Permanent. Search engines update the index and forward link equity; browsers may cache the redirect. Hard to undo — use only when the move is truly forever." On `301`/`302` (mention in prose, not code) → method-rewrite footgun.

**Exercise — `TrueFalse` (status-code reflexes).** 4–5 statements checking the model. Candidates:
- "308 is the right status for permanently renaming `/account` to `/settings`." → true.
- "A 302 redirect always preserves a POST request's method." → false (the footgun).
- "`NextResponse.redirect(url)` with no status argument sends a 308." → false (it's 307).
- "A logged-in user bounced away from `/login` should get a 307, not a 308." → true (request-conditional, not a permanent property of the URL).
- "A permanent redirect is safe to use even when you're unsure the move is final." → false (caching/indexing persists).
Rationale: status-code semantics are a classic spot for confident-but-wrong intuitions; true/false surfaces them fast and cheaply.

### Where the rule belongs: proxy, config, or redirect()

**Goal:** The senior payoff. The student already knows `redirect()`/`notFound()` from ch 029.4 and will meet `next.config.ts` redirects in ch 034.3. This section is the *sorting function* across all the places a redirect can live — the chapter-wide "trigger before tool" reflex applied to redirects.

Frame it as: "You can issue a redirect from at least four places. The wrong place is a performance bug or a maintenance trap. Here's how a senior sorts them."

- **`next.config.ts` `redirects()` — static and request-independent** (forward ref, ch 034.3). When the rule is always-true regardless of who's asking (legacy-URL migration, marketing rename), the platform applies it at the CDN edge with **zero function invocation** — cheaper and faster than the proxy. Name it; the depth is ch 034.3. The decision rule: *if the rule never looks at the request, it doesn't belong in the proxy.*
- **`proxy.ts` — request-conditional.** When the decision depends on the request — a cookie, a header, the host, a query param, the user's state — only the proxy can see that at request time. Examples: logged-in user redirected off `/login`; A/B-bucket routing; locale routing (Unit 17). The cost: every matched request pays the proxy roundtrip (lesson 2's matcher rule).
- **`redirect()` / `permanentRedirect()` from `next/navigation` — per-action / per-render** (back-ref, ch 029.4). After a Server Action completes ("invoice created → go to its page") or inside a route when a resource is gone (`notFound()`). This isn't a network-boundary concern at all — it's application code deciding where to go *after* doing work. The proxy runs *before* the route; `redirect()` runs *during/after* it.

**The litmus question** to leave them with: *"Does the redirect decision depend on the incoming request, and does it need to happen before the route renders?"* Yes-and-yes → proxy. Independent of the request → config. Made by application logic after work → `redirect()`.

**Diagram/exercise — `StateMachineWalker` `kind="decision"` (no diagram slot).** This is the ideal component for a senior decision filter (per its doc: "forces the student through the *order* the senior asks questions in"). Mirrors lesson 2's "Does this belong in proxy.ts?" walker so the two feel like siblings.
  - Title: "Where does this redirect belong?"
  - Root `id="depends"` — prompt: "Does the rule depend on the incoming request — a cookie, header, host, or the user's state?"
    - Branch "No — it's always true for everyone" → `leaf-config`.
    - Branch "Yes — it inspects the request" → question `before`.
  - Question `id="before"` — prompt: "Does it need to happen *before* the route renders?"
    - Branch "Yes — bounce the request at the boundary" → `leaf-proxy`.
    - Branch "No — it's decided by application code after doing work" → `leaf-redirect`.
  - `leaf-config` — verdict "`redirects()` in `next.config.ts`". Body: static, request-independent rules apply at the CDN edge with no function invocation. Legacy-URL migrations, marketing renames. (Built in chapter 034.) Cheapest option — prefer it whenever the rule never reads the request.
  - `leaf-proxy` — verdict "A redirect in `proxy.ts`". Body: the decision reads the request (cookie, host, A/B bucket) and must land before the route. Costs the proxy roundtrip on every matched request — keep the matcher tight.
  - `leaf-redirect` — verdict "`redirect()` / `notFound()` from `next/navigation`". Body: application logic decides after doing work — a Server Action finishes, or a route finds the resource gone. Runs during the render, not at the network boundary. (Covered in chapter 029.)
  - Rationale: the lesson lives in the *order* of the two questions (request-dependence first, timing second). A walker enforces that order better than prose.

### Rewriting subdomains to org routes

**Goal:** The first production pattern — the multi-tenant subdomain rewrite — plus the loop pitfall that is *unique* to rewrites. This is the concrete payoff for "rewrite = invisible swap."

Teach the pattern as a build-up:

1. **Extract the subdomain from the host.** `request.headers.get('host')` (or `request.nextUrl.host`) returns e.g. `acme.app.com`. Split off the tenant. **Dev gotcha inline:** in development the host is `acme.localhost:3000` — the **port** rides along; strip it before lookup. (This is a real, named watch-out from the chapter outline — teach it where it bites, not in a trailing list.)
2. **Validate cheaply, no DB call.** The proxy must stay cheap (lesson 2's anti-list: no DB queries per request). Validate the subdomain against a **cached** org lookup or a known set — *not* a database round trip on every request. Name this as the constraint; the real cached lookup is auth/tenancy territory (Unit 9). Keep the example's validation a stand-in (e.g. a `isKnownOrg(sub)` black box) to avoid teaching a DB-in-proxy anti-pattern.
3. **Rewrite to the internal route.** `NextResponse.rewrite(new URL(\`/orgs/${sub}/dashboard\`, request.url))`. The user keeps seeing `acme.app.com/dashboard`; the `[org]` route renders. **Note (verified against docs):** use `NextResponse.rewrite()`, not a hand-rolled `fetch` — the helper auto-propagates the RSC rewrite headers; raw `fetch` rewrites silently lose them and break client navigations. One sentence, recognition-level.
4. **The route side.** The rewrite lands on `app/orgs/[org]/dashboard/page.tsx`; the route reads `params.org` (the subdomain) and queries org-scoped data. The same `[org]` route also works for path-based tenancy (`app.com/orgs/acme/...`) — in that case the rewrite is unnecessary because the URL already carries the segment. This connects rewrites to dynamic segments (the student met `params` in routing, ch 029; the async `params` shape is lesson 4 — name it, don't teach it).

**Component:** `AnnotatedCode`, `color="violet"`, ~10–12 lines, walking host-extract → port-strip → validate → rewrite. Steps focus attention on (1) the host read + port strip, (2) the cheap validation with the no-DB caveat, (3) the `rewrite()` call and the unchanged address bar. Base code shape:
```ts
export default function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const sub = host.split('.')[0].split(':')[0]; // strip port in dev

  if (isKnownOrg(sub)) {
    return NextResponse.rewrite(
      new URL(`/orgs/${sub}/dashboard`, request.url),
    );
  }

  return NextResponse.next();
}
```
(Deliberate simplification flagged downstream: `isKnownOrg` is a stand-in for a cached tenancy lookup, NOT a DB call; the subdomain parse is naive on purpose — production handles apex domains and `www`. Note this so the agent doesn't over-engineer.)

**The redirect-loop pitfall (taught inline, it belongs to rewrites).** A rewrite whose *target* also matches the proxy's matcher re-enters the proxy on the internal render — and if the same condition still holds, it rewrites again. Without a guard this loops until the platform errors (500-class). Pedagogical correction vs. chapter outline: the outline said "the framework throws a recursion-detected error after a fixed depth" — the current docs do **not** document an automatic recursion error for this case, so frame it as *"manifests as a loop / repeated invocation,"* not a guaranteed friendly error. Two senior fixes:
  - **Exclude the rewrite target from the matcher** (the clean fix — the `/orgs/*` internal paths don't need the proxy's gate).
  - **Sentinel header guard:** set `x-rewritten: 1` on the rewrite and short-circuit (`return NextResponse.next()`) when it's already present on entry. Useful when exclusion isn't possible.
Use a `:::caution` aside for the one-line rule ("a rewrite whose target the matcher also covers loops — exclude the target or guard with a sentinel header"), with the two fixes in prose.

**Optional micro-diagram** (only if it earns space): a tiny `DiagramSequence` (2–3 steps) showing request → rewrite → *target matches matcher* → proxy runs again → loop. If the prose + caution aside reads clearly, skip it to respect the vertical-space budget — the loop is simple enough to state. Leave the call to the writing agent.

### Setting a cookie while you redirect

**Goal:** A short, high-value technique that bridges to the `next=` section and reuses lesson 2's cookie-timing model. Kept brief — it's a connector, not a pillar.

- The pattern: `const response = NextResponse.redirect(url); response.cookies.set('locale', 'es'); return response;` — write a preference *and* navigate in one reply. Used for "set a choice, move to the next step" flows.
- **The timing trap (reuses lesson 2's model exactly):** the cookie is visible on the *next* request, not on the render of the redirect's target — because a cookie is an instruction to the browser, sent back only on the following round trip. For a redirect this is usually fine (the redirect *is* the next request), but don't expect to set a cookie and read it in the same proxy pass. Cross-reference lesson 1/2's "a cookie you set is visible next request" rule rather than re-deriving it.
- Keep to a single `Code` block + 3–4 sentences. No exercise.

### The post-login return and the open-redirect hole

**Goal:** The security spine and the close of lesson 2's deliberate debt. This is the section with the highest production stakes — an open redirect is a real, exploited vulnerability class.

Build it in three beats:

1. **The `next=` pattern (why it exists).** Lesson 2's auth gate redirected to `/sign-in?next=${request.nextUrl.pathname}` so sign-in can return the user where they were headed. Restate the shape with `encodeURIComponent`: `signIn.searchParams.set('next', request.nextUrl.pathname)`. This much the student saw last lesson.
2. **The hole.** When the login flow later reads `next` and redirects to it, a value the *user controls* becomes a redirect target. `?next=https://attacker.com` turns your trusted login page into an **open redirect** — a phishing primitive: the victim sees your real domain in the link, logs in, and gets bounced to the attacker's clone. Name it as "the classic security hole" (chapter-outline phrasing). This is *why* lesson 2 left its `next=` unvalidated and flagged it for here.
3. **The fix — validate to a same-origin path.** The rule: never redirect to a user-supplied URL without proving it's a same-origin *path*. Concretely, accept only values that start with a single `/` and are not `//` (protocol-relative) or a full `protocol://` URL; reject everything else to a safe default (`/dashboard`). The senior shape is a small reusable helper used at **every** redirect site. **Anchor to the project convention** (code standards security baseline): the helper is **`safeNext(url)` in `lib/redirects.ts`**, and the rule is *never* `redirect(searchParams.get('next'))` directly. Present `safeNext` as the canonical helper this course uses (the student will see it again in Unit 8 auth).

**Component:** `CodeVariants`, before/after, to make the vulnerability and its fix vivid (the component doc calls out `del`/`ins` for exactly this before/after framing).
  - Variant "Vulnerable" (`del` the bad line): redirects straight to the raw `next` value — `return NextResponse.redirect(new URL(next, request.url));`. Prose first sentence: "**Open redirect.** `next` came from the URL; an attacker sets `?next=https://evil.com` and your login page launders their phishing link."
  - Variant "Safe" (`ins` the helper call): `return NextResponse.redirect(new URL(safeNext(next), request.url));`. Prose: "**Same-origin only.** `safeNext` returns the value only if it's a relative path (`/…`, not `//` or a full URL), else a safe default. One helper, used at every redirect site."
  - Then, below the variants, show `safeNext` itself in a small `Code` block (title `lib/redirects.ts`) so the rule is concrete, ~6 lines:
    ```ts
    export function safeNext(next: string | null, fallback = '/dashboard'): string {
      if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
      return next;
    }
    ```
    One sentence: the checks reject absolute URLs, protocol-relative `//evil.com`, and empty values; everything else is a path on our own origin. (Note for downstream: keep this in sync with the course's `lib/redirects.ts` convention; this is the teaching form.)
    **Fact-checked refinement (current OWASP 2026 guidance):** the string-check form shown is the readable teaching shape, but OWASP now prefers parsing with `new URL(next, origin)` and comparing the resolved `origin`/hostname over raw `startsWith` checks, because string checks miss encoded and backslash edge cases (`/\evil.com`, `%2F%2Fevil.com`). The writing agent may either (a) keep the string form and add one sentence acknowledging a hardened version parses with `new URL()` and rejects on `origin` mismatch, or (b) show the `new URL()` form directly. Do not present the bare `startsWith` checks as complete without that caveat — flag this as a deliberate simplification, not the last word.

**Exercise — `MultipleChoice` (which `next` values are safe).** Single question, multi-select (the component auto-switches to multi when >1 correct). Prompt: "Which of these `?next=` values does `safeNext` accept (returns unchanged)?" Choices:
  - `/dashboard/invoices` → correct (relative path).
  - `https://evil.com` → reject (absolute URL).
  - `//evil.com` → reject (protocol-relative — the subtle one).
  - `/settings?tab=billing` → correct (relative path with query).
  - `javascript:alert(1)` → reject (not a `/`-leading path).
Rationale: the `//` and `javascript:` cases are exactly the ones beginners miss; a multi-select forces the student to evaluate each independently.

### A proxy that does three jobs

**Goal:** Assemble the full file — the chapter-outline's "small `proxy.ts` that does three jobs" — continuing lesson 2's worked example. This is the synthesis section.

The file unions everything: matcher (excludes assets/API, from lesson 2) + auth gate (now with **validated** `next=` via `safeNext`) + subdomain rewrite + legacy `/billing/manage` → `/settings/billing` 308 redirect. Order the body the way a senior orders it: **cheap exclusions and rewrites first, auth gate last** (so the gate's `next=` capture reflects the final path), and every branch returns. Under fifty lines (chapter-outline budget).

**Component:** `AnnotatedCode`, `color="blue"` (matching lesson 2's worked-example color for visual continuity), ~6 steps. Base code shape (the writing agent refines):
```ts
// proxy.ts
import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE_PREFIX } from '@/lib/auth';
import { safeNext } from '@/lib/redirects';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Legacy URL migration — permanent, request-independent shape, but
  //    co-located here with the rest of the proxy's URL logic.
  if (pathname === '/billing/manage') {
    return NextResponse.redirect(
      new URL('/settings/billing', request.url),
      308,
    );
  }

  // 2. Subdomain rewrite — invisible swap to the org route.
  const sub = (request.headers.get('host') ?? '').split('.')[0].split(':')[0];
  if (isKnownOrg(sub)) {
    return NextResponse.rewrite(new URL(`/orgs/${sub}${pathname}`, request.url));
  }

  // 3. Auth gate — cheap presence check, bounce with a *validated* next.
  const hasSession = getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX });
  if (!hasSession) {
    const signIn = new URL('/sign-in', request.url);
    signIn.searchParams.set('next', safeNext(pathname));
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico|orgs).*)',
};
```
Steps:
  1. Matcher (bottom) — note it now **also excludes `/orgs`**, the rewrite target, so the subdomain rewrite can't loop back into the proxy. Tie to the loop pitfall section.
  2. Legacy redirect — `308`, permanent; co-located with the proxy's other URL logic even though a purely-static rule could live in `next.config.ts` (forward-ref ch 034.3 — name the tradeoff: it's here because the file already owns the app's URL shaping, but the config is cheaper for truly-static rules).
  3. Subdomain rewrite — invisible swap; address bar unchanged; `isKnownOrg` is the cheap cached check, not a DB call.
  4. Auth gate presence check — unchanged from lesson 2 (`getSessionCookie` + `SESSION_COOKIE_PREFIX`), presence only.
  5. The **validated** `next=` — `safeNext(pathname)` closes lesson 2's open hole. Call this out explicitly as the debt being paid.
  6. Final `return NextResponse.next()` — every branch returns; no implicit pass-through (lesson 2 reflex).

After the block, one paragraph: this is the production slot — the real session wiring (`requireUser()`, `SESSION_COOKIE_PREFIX`) lands in Unit 8, the cached tenancy lookup behind `isKnownOrg` in Unit 9, and the static-redirect alternative for the legacy rule in chapter 034. The proxy file is now complete for the chapter's purposes.

**Tooltips/Terms in this section:** `308` (if not already toolt­ipped above), `safeNext` (link the concept to `lib/redirects.ts`). Keep light — most terms are defined in lesson 2.

### Keep exploring

`CardGrid` with `ExternalResource` cards (mirrors lesson 2's closing pattern):
- Next.js `NextResponse` API reference (the `redirect` / `rewrite` / `next` method surface).
- OWASP open-redirect / unvalidated-redirects-and-forwards cheat sheet (the security spine deserves an authoritative external anchor).
- (Optional) Next.js multi-tenancy / subdomain guide for the rewrite pattern.

---

## Tooltip / Term candidates (whole lesson)

Strategic, few — most prerequisites were defined in lessons 1–2. Define only:
- **open redirect** — "A bug where an app redirects to a user-controlled URL without validation, letting an attacker turn your trusted domain into a phishing springboard." (Core security term, non-obvious to career-changers.)
- **link equity** (in the 308 section) — "The ranking value search engines pass through links. A 308 forwards it to the new URL; a 302 doesn't." (SEO jargon, one-liner.)
- **protocol-relative URL** (in the `safeNext` section) — "A URL starting with `//`, which the browser resolves using the current page's protocol — `//evil.com` becomes `https://evil.com`. The subtle case open-redirect checks miss." (Directly load-bearing for why `safeNext` rejects `//`.)
- `@vercel/functions` — reuse lesson 2's Term **only if** a geo/IP example appears; prefer to avoid introducing it again.

Do **not** re-Term: `proxy.ts`, matcher, `NextRequest`/`NextResponse`, codemod, Edge runtime, negative lookahead, allow-list, path-to-regexp — all owned by lesson 2.

---

## Scope

**This lesson covers:** redirect-vs-rewrite semantics; 307/308 (and why not 301/302); the proxy-vs-`next.config.ts`-vs-`redirect()` decision tree; the subdomain-rewrite multi-tenant pattern and its loop pitfall; setting cookies during a redirect; the `?next=` post-login pattern and open-redirect prevention via `safeNext`; the three-job worked `proxy.ts` that completes lesson 2's file.

**Explicitly NOT covered (defer / reference only):**
- **The `proxy.ts` file convention, matcher syntax in full, `NextRequest`/`NextResponse` API surface, the four-jobs list, fail-open rule, proxy→route header enrichment** — all owned by **lesson 2**. Reference, never re-teach. (Briefly restate only: the three return shapes map to redirect/rewrite/next; the matcher selects which requests pay the proxy.)
- **Static `redirects()` / `rewrites()` in `next.config.ts`** — the static-rule home. Forward ref to **ch 034.3**. Name it as the cheaper alternative for request-independent rules; do not teach the `redirects()`/`rewrites()` config shape, `source`/`has`/`missing`, or `beforeFiles`/`afterFiles`.
- **`redirect()` / `permanentRedirect()` / `notFound()` from `next/navigation`** — taught in **ch 029.4**. Back-ref as the per-action/per-route redirect; do not re-teach the API.
- **Real auth/session verification, Better Auth wiring, `requireUser()`** — **Unit 8**. The proxy gets the cookie-*presence* slot only (lesson 2's rule). `SESSION_COOKIE_PREFIX`, `getSessionCookie`, `requireUser()` are imported black boxes.
- **The full subdomain-tenancy architecture** (org table, cached lookups, RLS, apex/`www` handling) — **Unit 9 (multi-tenancy)**. This lesson shows the *rewrite mechanic* only; `isKnownOrg` is a deliberate stand-in for the cached tenancy check.
- **Async `params`/`searchParams` shape** — **lesson 4 of this chapter**. The rewrite lands on a `[org]` route whose `params` are async; name that the route reads `params.org`, defer the await-shape to lesson 4.
- **Writing URL state / client navigation** — **lesson 5**. Not relevant here.
- **Locale/i18n routing in the proxy** — **Unit 17**. May appear once as a "request-conditional → proxy" example in the decision tree; do not teach.
- **Rate limiting, geo-based logic at the proxy** — **ch 073** / out of scope. If a geo example is used in the decision tree, it must use `geolocation(request)` from `@vercel/functions`, never `request.geo`. Prefer a cookie/host example to avoid the dependency.

**Prerequisites to restate concisely (one line each, not re-taught):** a cookie set on a response is visible on the *next* request (lessons 1–2); the proxy runs only on matcher-selected requests and every branch must return (lesson 2); `__Host-session` is the project's session cookie (lesson 1).
