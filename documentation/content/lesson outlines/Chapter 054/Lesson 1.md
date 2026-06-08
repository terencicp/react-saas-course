# Lesson 1 — The two-layer gate in proxy.ts

**Title (h1):** The two-layer gate in proxy.ts
**Sidebar label:** The two-layer gate

---

## Lesson framing

### What this lesson is

An upgrade lesson. Chapter 052 lesson 4 stood up a *minimum* `proxy.ts` gate to give the smoke test somewhere to redirect — and it did the simplest thing: `auth.api.getSession` in the proxy, hardcoded `['/dashboard/:path*']` matcher, no return-URL.
This lesson rebuilds that gate to production shape and corrects the one shortcut the minimum version took: **the proxy must not validate the session against the database.**
The student leaves with a `proxy.ts` they could ship: cookie-presence-only reads via `getSessionCookie`, a deliberate matcher strategy, the `?next=` round-trip with open-redirect closure honored at the call site, the inverse gate that bounces signed-in users off `/sign-in`, and a crisp mental model of *which* security question the proxy answers and which it refuses.

### The one idea the whole lesson hangs on

**Two layers, two questions.**
- Layer 1, the proxy: "Is there a session-shaped cookie at all?" — coarse, cheap, runs on every matched request including prefetches, **never touches Postgres**.
- Layer 2, the layout/action: "Is this session valid, who is it, and may they do X?" — fine, validating, authoritative.

Everything else in the lesson (why no DB read, why the matcher matters, why authz stays downstream) is a consequence of this split. Teach the split first; derive the rest.

### Why this is a senior-mindset lesson, not a syntax lesson

The `proxy.ts` file is twenty lines. The teaching weight is entirely in the *decisions*: where the redirect decision lives, what it's allowed to read, and the failure mode of conflating the perimeter with the door check. Lead every section with the decision and its blast radius. The canonical bug to anchor on — a proxy that does role checks becomes the entire security model, so the day a matcher entry is missed, a route silently opens — is the spine of the lesson.

### Target student & where they are

They've already (Ch 052) wired `auth`, the four tables, the cookie hardening (`__Host-` prefix, `SameSite=Lax`, `freshAge` 10 min), the `getCurrentUser`/`requireUser` ladder, and a throwaway proxy. They've already (Ch 033) learned the `proxy.ts` rename, matcher *syntax*, `NextResponse`, redirect vs rewrite, and the open-redirect rule with `safeNext`. This lesson does **not** re-teach any of that — it *composes* it into the real gate. Keep prerequisite restatements to one clause each.

### Pedagogical spine (cognitive-load order)

1. Open on the address-bar scenario (signed-out user types `/dashboard`) → name the two-layer model with a diagram *before* any code. Mental model first.
2. Build the cookie-presence read (`getSessionCookie`) and justify "no DB in the proxy" with the prefetch argument — this is the correction of Ch 052's shortcut, so frame it explicitly as "we promised to upgrade this."
3. Matcher *strategy* (decision, not syntax) via a decision walker + table.
4. The `?next=` round-trip end to end with the inverse gate folded in.
5. Composition + the "layout is still the truth" closer that re-grounds layer 2.

### Code handling, global

- The full `proxy.ts` is the lesson's artifact. Build it incrementally; show the **final** file once with `AnnotatedCode` so attention lands on each decision in turn. Do not paste a 40-line block and explain it after.
- Align to the canonical contract in Code conventions §Authentication: `lib/auth.ts` exports `SESSION_COOKIE_PREFIX`; the proxy calls `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })`; `requireUser(next?)` redirects to `/sign-in?next=...`; `safeNext` lives in `lib/redirects.ts`. Use these exact names — later chapters depend on them.
- Deliberate divergence to note for downstream agents: the lesson shows the `?next=` *consumer* (the sign-in form's `safeNext` call) only as a brief call-site echo, not a full build — Ch 033 lesson 3 owns that surface and Ch 053 owns the sign-in form. Show enough to close the loop, no more.

### Terms for `Term` tooltips (be strategic)

- **prefetch** — Next.js fetching a route's data/RSC payload before navigation (on hover/viewport); the reason a proxy DB read is dangerous.
- **open redirect** — redirecting to an attacker-controlled URL pulled from user input; one-clause refresher, Ch 033 owns it.
- **optimistic check** — a cheap, possibly-stale check you trade correctness for speed on, backed by an authoritative check later.
- Do **not** tooltip: matcher, `SameSite`, `HttpOnly`, prefetch already covered — only the above earn it.

---

## Section-by-section

### (Intro — no header) The address bar question

Open cold with the concrete scenario: a signed-out user types `https://app.example.com/dashboard` and hits Enter. Three questions a senior asks immediately — *where does the redirect-to-sign-in decision live, what does it read, and what is it explicitly not allowed to do?* State the lesson's promise: by the end they have a production `proxy.ts` and can answer all three. One sentence connecting back: "Chapter 052 gave you a placeholder gate; this is the real one." Warm, terse, no celebration. Do not preview the matcher table here — motivate, don't outline.

### Two layers, two questions

The conceptual core. Introduce the two-layer model before any proxy code.

Teach:
- Layer 1 (proxy): coarse, cookie-presence-only, cheap, runs on **every** matched request including prefetches. Job: "no cookie → redirect." Nothing else.
- Layer 2 (layout/action): fine, full session validation, identity, authorization. Job: "valid session → who is this and may they do X."
- The rule that follows: **authorization decisions never live in the proxy.** This is the Ch 033 lesson-2 rule ("the proxy is a fast gate, the route enforces the real check") made concrete for auth, and the Code-conventions rule ("authorization decisions live at the action boundary, never the proxy").
- The canonical bug, stated as the thing the split prevents: a proxy doing role checks becomes the *entire* security model; a missed matcher entry then silently opens a route. Defense-in-depth means the layout re-checks regardless.

**Diagram (primary, earns its weight): the two-layer gate sequence.**
Engine: Mermaid `sequenceDiagram`, wrapped in `<Figure>` (per diagrams INDEX). Horizontal time, cap height.
Actors: Browser → `proxy.ts` → Layout/Action (DB).
Flow to depict: request for `/dashboard` → proxy reads cookie → `alt` cookie present: `NextResponse.next()` passes through → layout calls `requireUser()` → validates against DB/cookie-cache → renders **or** redirects if the cookie was forged/stale/user-deleted; `else` cookie absent: proxy `redirect('/sign-in?next=/dashboard')`.
Pedagogical goal: make visible that the proxy's pass-through is *not* a guarantee of a valid session — the layout's read is the real door. This pre-empts the #1 misconception ("the proxy already checked, so the layout can trust it"). Use a `Note` on the layout step: "source of truth — re-validates every time."

Keep this diagram conceptual (no `getSessionCookie` internals yet); the code comes next.

### Why the proxy never reads the database

The correction of Ch 052's shortcut, and the most important *why* in the lesson.

Teach:
- Ch 052 lesson 4's minimum gate called `auth.api.getSession` in the proxy. That works but doesn't scale: `getSession` round-trips to Postgres (or at best the cookie cache), and the proxy runs on **every matched request** — including prefetches. Next.js prefetches protected routes on hover/viewport, so a `getSession` in the proxy turns a hover over a sidebar link into a DB query. Multiply by every link, every user.
- The fix: inside the proxy, read only whether a session-shaped cookie *exists* — `getSessionCookie` from `better-auth/cookies`. Pure cookie parsing, zero IO. This is the **optimistic check**: "is there a cookie at all," not "is it valid."
- Forgery is explicitly *not* a concern at this layer — a forged cookie passes the presence check, then dies at the layout's validating read. Say this plainly so the student doesn't think the cookie check is a security hole.
- Connect to Next.js 16 reality (correcting a common misconception): `proxy.ts` runs on the **Node** runtime now (Ch 033 lesson 2), and it *cannot* be set to Edge — so the proxy *could* call the DB capability-wise. The senior rule "no DB in the proxy" therefore holds for **performance under prefetch**, not because of an Edge limitation. Name this distinction once; it's a frequent point of confusion in 2026 codebases migrating off the old Edge-middleware mental model.

**Code (`AnnotatedCode`): the cookie-presence read.**
A focused excerpt (not the whole proxy yet) — the import and the presence check:
```ts
import { getSessionCookie } from 'better-auth/cookies';
import { SESSION_COOKIE_PREFIX } from '@/lib/auth';
// ...
const sessionCookie = getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX });
const isSignedIn = sessionCookie != null;
```
Steps (blue default, one per decision):
1. `{1-2}` the imports — `getSessionCookie` is cookie parsing only; `SESSION_COOKIE_PREFIX` is exported from `lib/auth.ts` so the proxy and `auth.ts` can't drift.
2. `"getSessionCookie"` the call — no `await`, no DB; just reads the request's `Cookie` header.
3. `"SESSION_COOKIE_PREFIX"` color="orange" — **the footgun.** `getSessionCookie` defaults to the prefix `'better-auth.'` and silently misses any cookie set under a different prefix. The course uses `__Host-`, so passing the constant is mandatory — the symptom of getting this wrong is the notorious "cookie exists in the browser but the proxy redirects anyway" loop.
4. `"isSignedIn"` — presence, not validity. The name says "I only know a cookie is here."

This is the single most bug-prone line in the file; the orange step is load-bearing. (Source: this exact mismatch is the most-reported `getSessionCookie` issue — see fact-check.)

### Choosing a matcher strategy

A *decision* section, not a syntax section — Ch 033 lesson 2 already taught matcher syntax (strings, arrays, `has`/`missing`, the cost-control framing). Restate that in one clause and spend the section on the strategic call.

Teach the two strategies and when each is correct:
- **Allowlist** — name the protected sections explicitly: `['/dashboard/:path*', '/settings/:path*', '/billing/:path*']`. Correct when a small, known set of sections is gated and most of the app is public (marketing-heavy SaaS).
- **Matchall-minus-public** — a regex matcher that runs on everything *except* a denylist (`/`, `/sign-in`, `/sign-up`, static assets, `/api/auth/:path*`, `_next`). Correct when most of the app is behind auth and public pages are the exception (app-heavy SaaS).
- The senior call: **either is correct; mixing is the failure mode.** A *partial* allowlist leaves every new route unprotected by default — a route added six months later silently ships without the gate. Pick one, document it (a comment at the matcher), and hold the line.
- Tie back to the canonical bug: the allowlist's failure mode (forgotten entry) is exactly why authz must live at the layout — the gate failing open must not mean the data leaks.

**Interactive (`StateMachineWalker`, `kind="decision"`): "Which matcher strategy?"**
Forces the student through the senior's question order rather than handing them a rule.
- Root question: "What share of your routes require a signed-in user?"
  - Branch "A few protected sections, mostly public" → Leaf **Allowlist** (verdict pill), body: list the paths, note the "new routes are public by default — that's the risk to manage."
  - Branch "Most of the app is gated, a few public pages" → Leaf **Matchall-minus-public**, body: show the regex shape, note "new routes are protected by default — the safer default when in doubt."
- Keep it shallow (one question, two leaves). The teaching is in the framing, not depth.

**Reference (`Code`, two small fenced blocks or `CodeVariants` "Allowlist | Matchall-minus"):** the `config.matcher` for each strategy, side by side, with a one-line prose each naming its default-failure direction. `CodeVariants` is the right call here — it's a true A/B of the same config object, and the labels carry the "what's unprotected by default" framing.

### Sending the user back where they came from

The `?next=` round-trip, with open-redirect closure honored at the call site (not re-taught).

Teach:
- When the proxy redirects a signed-out user, preserve the original destination so sign-in returns them there: `redirect('/sign-in?next=' + encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search))`. Include the search string so `?status=open` survives the round-trip.
- The closure rule, stated as a call-site obligation: the value is reflected *back out* on the sign-in side, and **user-supplied URLs into `redirect()` are an open-redirect vector** (Ch 033 lesson 3 owns this). This stack closes it with the `safeNext(url)` helper from `lib/redirects.ts` — never `redirect(searchParams.get('next'))` raw. The senior fallback: an invalid `next` resolves to `/dashboard`, never the raw value.
- Be explicit about the division of labor so this lesson doesn't overreach: **the proxy writes `next`; the sign-in form reads and validates it.** Show the consumer side only as a one-line echo (`redirect(safeNext(next))`) to close the mental loop — Ch 053 builds the actual form, Ch 033 owns `safeNext`'s implementation.

**Diagram option (light): the round-trip as a 4-step strip.**
Reuse the value chain visually: protected URL → proxy appends `?next=` → sign-in form → `safeNext` → land on original (or `/dashboard` if invalid). A small HTML/CSS phase strip (per diagrams INDEX, "sequential phase strip") inside `<Figure>`, or fold this into the sequence diagram above as an extension. Prefer folding it into a compact strip — keep it cheap. Pedagogical goal: show that `next` makes a full client→server→client trip through *attacker-reachable* surface, which is *why* validation is non-negotiable.

### Auth pages refuse signed-in users

The inverse gate — same matcher logic, opposite direction. Keep it short; it's a mirror of what they just learned.

Teach:
- A signed-in user hitting `/sign-in` should land on `/dashboard`, not see the form. Two reasons: broken UX (why show a sign-in form to someone signed in), and a faint security smell (a stray sign-in submit can, in some setups, churn the current session).
- The rule in the same proxy: matched path is an auth page **and** cookie present → `redirect('/dashboard')`. Same `getSessionCookie` read, inverse condition.
- Loop watch-out, made concrete: if the auth-page rule and the protected-route rule disagree about a path, you get a redirect loop. The senior reflex: **test the signed-in × signed-out matrix for every matched path.** Name this as the thing that bites when both gates live in one file.

**Code:** fold the inverse branch into the running proxy excerpt; show it as a second `if` block. No new component — this is two lines on the gate they already have.

### One proxy, many gates

Composition — how the auth gate coexists with the proxy's other future jobs.

Teach:
- The proxy may later also do i18n routing (Ch 084 / next-intl), feature-flag bucketing, A/B routing. Next.js runs **one** `proxy.ts` — you don't split it across files.
- The senior shape: keep each responsibility a small function and chain them, returning the first redirect or `NextResponse.next()`. Sketch `authGate(request)` returning a `NextResponse | undefined`, with the `proxy` function calling gates in order. Forward-reference the next-intl ordering rule from Code conventions (i18n `createMiddleware` runs *before* the auth gate, and the file must export `proxy` named) as a one-liner — don't build it, just plant the flag so Ch 084 slots in cleanly.
- Two restraint calls worth a sentence each, because they're real reflexes a junior gets wrong:
  - **Don't touch the session cookie on every request.** Better Auth's sliding renewal (`updateAge`, Ch 052 lesson 3) already extends the session on the next mutating call; a proxy-level cookie write adds a write to every page load for no gain.
  - **Wrap the gate so a throw becomes pass-through-or-deny, not a 500 on every matched request** — but per the fail-closed discipline, an auth check that *throws* should deny, not silently allow. Reconcile: the cookie-presence read can't really throw (pure parsing), so the practical rule is "keep the proxy too simple to throw"; if you add logic that can, default it to redirect-to-sign-in, not pass-through.

**Code (`AnnotatedCode`): the final `proxy.ts`, whole.**
This is the artifact. Show the complete file once, ~20–25 lines, and walk it. Shape:
```ts
import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_PREFIX } from '@/lib/auth';

const AUTH_PAGES = ['/sign-in', '/sign-up'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isSignedIn = getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX }) != null;
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isAuthPage) {
    return isSignedIn ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }

  if (!isSignedIn) {
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/sign-in?next=${next}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/billing/:path*', '/sign-in', '/sign-up'],
};
```
Annotated steps (color-coded), each ≤6 lines prose:
1. `{1-3}` imports — note `proxy` will be the **named** export (Next.js 16 dispatches on the name) and `SESSION_COOKIE_PREFIX` from `lib/auth.ts`.
2. `"getSessionCookie" "SESSION_COOKIE_PREFIX"` color="orange" — the cookie-presence read; restate the prefix footgun in one clause.
3. `{10-12}` color="violet" — the inverse gate: signed-in users bounce off auth pages.
4. `{14-17}` color="blue" — the protected-route gate with the `?next=` round-trip; `encodeURIComponent` and search preserved.
5. `{22-24}` color="green" — the matcher includes the auth pages *and* the protected sections (both gates need their paths matched); allowlist strategy, documented.

Notes for the writer: function is a `function` declaration (framework-named default-ish export; Code conventions allows it for `proxy`). The file lives at project root or `src/` — **not** under `src/app/` (Next.js won't pick it up there); state this watch-out at the matcher step or in the closer.

### The layout is still the truth

The closer that re-grounds layer 2 so the student doesn't walk away thinking the proxy is the security boundary.

Teach:
- After the proxy lets a request through, the protected layout still calls `requireUser()` (Ch 052 lesson 4). That call validates the cookie against the DB (or the cookie cache), returns `user`, or `redirect('/sign-in?next=...')`.
- The senior reflex, stated as a rule to carry forward: **never assume the proxy's cookie check guarantees a valid session.** The cookie cache may be stale (up to its `maxAge`, Ch 052 lesson 3), the cookie may be forged, the user may have been deleted since the cookie was issued. The layout's read is the source of truth; the proxy is the perimeter, the layout is the door.
- Forward-pointer (one line): the *next* lessons in this chapter build on this exact boundary — credential changes (lesson 2) and session revocation (lesson 3) are why "the cookie says valid but the session is gone" is a real, frequent state, not a paranoid edge case. This motivates the chapter without teaching it.

**Exercise (understanding check) — `Buckets` ("proxy" vs "layout/action"):**
Classification drag-and-drop, two columns. The single highest-value check for this lesson because the whole lesson is one distinction.
Items to sort:
- proxy: "redirect a signed-out user off `/dashboard`", "read whether a session cookie exists", "bounce a signed-in user off `/sign-in`".
- layout/action: "validate the session against the database", "check `user.role === 'admin'`", "filter rows by the user's org", "decide whether this user may delete *this* invoice".
Grading: each item one bucket; the authz/identity items must land in layout/action. A short post-exercise line: "if you put any of the right-column items in the proxy, you just made the matcher your security model — re-read §the canonical bug."

Optional second check if a second exercise is warranted — `MultipleChoice`: "You call `getSessionCookie` with the default prefix but your cookies use `__Host-`. What happens?" with the correct answer being the silent-miss/redirect-loop, distractors being "build error", "session validated anyway", "401 from Better Auth". Only include if section length allows; the `Buckets` check is the priority.

### (Optional) External resources

`ExternalResource` cards, only if they add signal: Better Auth Next.js integration doc (the `getSessionCookie` middleware section), Next.js `proxy` file-convention doc, Next.js middleware→proxy upgrade note. Two max; skip if they'd pad.

---

## Scope

### Prerequisites — restate in one clause, do not re-teach

- `proxy.ts` rename, Node runtime, matcher **syntax**, `NextResponse.redirect`/`.next()`, redirect-vs-rewrite — Ch 033 lessons 2–3. This lesson uses them; it doesn't re-explain syntax.
- `getCurrentUser`/`requireUser` call shape and the `auth.api.getSession({ headers })` read — Ch 052 lesson 4. Named at the call site only.
- Cookie hardening (`__Host-`/`SESSION_COOKIE_PREFIX`, `SameSite=Lax`, `HttpOnly`), cookie cache + its staleness window, `expiresIn`/`updateAge`/`freshAge` — Ch 052 lesson 3. Reference once where relevant (cache staleness in the closer); don't re-derive.
- Open-redirect threat and `safeNext` — Ch 033 lesson 3. Honored at the call site; the helper's implementation is not built here.

### Explicitly out of scope (belongs elsewhere — do not teach)

- The full validating session read inside the layout/action (the `requireUser` call shape and `React.cache` wrapping) — **Ch 052 lesson 4 owns it.** This lesson only points at it as "layer 2 / the truth."
- Authorization, role checks, org-scope filtering, the `authedAction`/`authedRoute` wrappers — **Ch 057 (Unit 9).** The lesson's whole point is that these live *downstream* of the proxy.
- The `?next=` form-side handling and the `safeNext` implementation / open-redirect rule surface — **Ch 033 lesson 3.** Honored at the call site only.
- The active-sessions list and per-session revoke UI — **Ch 054 lesson 3.** Mentioned once as motivation for "the layout is the truth," not built.
- Credential mutation (`changePassword`/`changeEmail`) and the `freshAge` re-auth prompt — **Ch 054 lesson 2.**
- Rate limiting the redirect or the sign-in surface — **Ch 074.**
- Multi-tenant / org-aware subdomain routing and the rewrite pattern — **Ch 056 / Ch 033 lesson 3.** The composition section names i18n/flags as future proxy jobs but builds none.
- next-intl `createMiddleware` ordering and the full i18n proxy — **Ch 084.** One forward-reference line only.
- CSP and security headers in the proxy — **Ch 054 lesson 4 (named) / Ch 082 (full).** Not this lesson.

### Boundary notes for the writer

- Do not deepen the cookie-cache discussion; the closer needs only "the cache can be stale, so the layout re-checks." Ch 052 lesson 3 owns the trade.
- Do not build the sign-in form or `safeNext`. The most likely overreach is turning the `?next=` section into a form lesson — resist it.
- Keep the matcher section about *strategy*; if it drifts into re-explaining `has`/`missing` syntax, cut back to Ch 033 lesson 2.

---

## Continuity hooks to record (for the chapter's Continuity notes)

- This lesson **corrects** Ch 052 lesson 4's minimal proxy: that gate used `auth.api.getSession` (a DB read) as a deliberate stopgap; the production gate is cookie-presence-only via `getSessionCookie`. Later lessons and any project code should reference the cookie-presence version.
- Canonical names established/honored here: `SESSION_COOKIE_PREFIX` (exported from `lib/auth.ts`), `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` in the proxy, `?next=` written by the proxy + `safeNext` (from `lib/redirects.ts`) read by the sign-in form, named export `proxy`, matcher includes both protected sections and auth pages.
- Mental model handed forward: proxy = perimeter (cookie presence), layout/action = door (validating read + authz). Lessons 2–3 lean on "the cookie can say valid while the session is gone."
