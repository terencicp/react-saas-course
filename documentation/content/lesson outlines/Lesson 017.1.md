# Lesson 017.1 — Set-Cookie attributes and the senior default

## Lesson framing

Reference/survey archetype shaped around one Decision (the senior default line) and one Pattern (the Next.js `cookies()` helper). The student arrives knowing what a cookie roughly is (003.3 walked the DevTools Application panel, 015.3 named `Cookie`/`Set-Cookie` as request/response headers, 016 introduced origin and CORS, 016.2 named `SameSite` as the CSRF defense Chapter 017 owns). They leave with: a memorized default line, a precise reading of every attribute they will see on real `Set-Cookie` headers for the rest of the course, the `__Host-` prefix discipline, the `Partitioned` reach, and the Next.js 16 `cookies()` call shape across the three App Router server contexts.

Pedagogical anchor: cookies are **ambient credentials**. The browser attaches them automatically — that is the feature and the threat. Every attribute exists to constrain when the browser attaches the cookie, who can read it on the page, or where it survives. Lead with that frame so each attribute lands as "the dial that closes one failure mode," not as a list of trivia.

Cognitive load strategy: open with the senior default line *before* the attribute table, so the student has the target shape in working memory while reading each attribute. Each attribute section is keyed to its row in a master mental table — one prose paragraph, one tiny `Set-Cookie` snippet, one named failure mode. The longest section is `SameSite` (carries the most weight). `Partitioned` and the prefixes ride in callouts (peripheral but load-bearing). Close with the Next.js helper (the syntax the student will actually type) and a `Matching` exercise that drills the attribute-to-failure-mode association.

Estimated student time: 50 to 65 minutes.

---

## Lesson sections

### Introduction (no h2)

Open with two short paragraphs.

1. **The ambient-credential frame.** A cookie is a key-value pair the server writes once with `Set-Cookie`; the browser then attaches it automatically as `Cookie:` on every matching request. That automatic attachment is what keeps the user signed in across navigations without any application code — and the same automatic attachment is what makes a cross-site `POST` the user never authored carry their session along. Every attribute on `Set-Cookie` exists to constrain that automatic attachment: when it fires, who can read it from JavaScript, where it survives.
2. **The lesson's shape.** The student will commit one line to memory — the senior default — and then learn each attribute as "the dial that closes one failure mode." Then thread the Next.js 16 `cookies()` helper and the 2026 third-party-cookie reality so they can read any `Set-Cookie` header they encounter.

Use a `<Term>` component on first introductions of `XSS` (forward-link to Lesson 058.4) and `CSRF` (forward-link to Chapter 085) so the student gets a one-line inline definition without a detour.

### The senior default, written once

Lead the body with the line the student will paste into every cookie-writing call:

```
Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

Show this in a `Code` block. Then one paragraph "reading it aloud" — host-locked name, no JavaScript read, HTTPS only, attached on top-level same-site navigations, scoped to the whole app, expires in 30 days. State that this is the line for *first-party app session cookies*, the dominant case, and that the rest of the lesson explains each attribute against the failure mode it closes plus the two conditions that flip an attribute off the default (the embed case → `Partitioned`/`SameSite=None`, the cross-subdomain case → `__Secure-` + `Domain`).

Reasoning: putting the answer on screen first sets a target the rest of the lesson maps to, instead of building up to a reveal. Reference/survey lessons hold better when the spine is visible from the top.

### The anatomy of a Set-Cookie header

One short subsection before the attribute walk. Use `AnnotatedCode` to label parts of:

```
Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

Three steps: (1) the `name=value` pair, (2) the attribute list separated by `;`, (3) one paragraph noting `Set-Cookie` is one of the few HTTP headers a single response can carry multiple times — one header per cookie set in that response.

Why `AnnotatedCode`: the student needs to physically see what is the name, what is a value-bearing attribute (`Max-Age=`), and what is a flag attribute (`HttpOnly`). Stepped highlights make the structure legible without overloading.

### HttpOnly: invisible to document.cookie

One paragraph + one tiny `Set-Cookie` snippet + one `Aside type="caution"`.

- Body: `HttpOnly` blocks the cookie from `document.cookie` and any JavaScript on the page. The browser still attaches it to requests — only the JS *read* API is blocked.
- Failure mode it prevents: XSS exfiltration. An attacker who lands a script via unescaped `innerHTML` cannot read a `HttpOnly` cookie's value to ship it off-host.
- Senior rule: every session-bearing cookie is `HttpOnly`. The only cookies *without* it are ones the client UI legitimately reads (a `theme=dark` preference, a CSRF double-submit token).
- `Aside type="caution"`: `HttpOnly` does not stop XSS from *using* the cookie — the attacker's script can still issue authenticated `fetch` calls because the browser attaches the cookie automatically. Defense-in-depth, not a silver bullet. Forward-ref XSS depth to Lesson 058.4.

### Secure: HTTPS-only attachment

Short paragraph + tiny snippet. Failure mode: plaintext sniffing on an HTTP leg (coffee-shop wifi, corporate MITM). Mention `mkcert` from 014.3 made `Secure` work on local dev without ceremony. Senior rule: every cookie is `Secure`; the only context that flips it off is a legacy HTTP test fixture — rare on this stack.

### SameSite: the load-bearing attribute

This is the longest section. Two parts: a prose pass on the three values, then a comparison diagram that drives the cause-and-effect home.

**Prose:** three subsections under one h3 — `Strict`, `Lax`, `None`. Each one sentence on what it does + one sentence on the trigger:

- `Strict`: only same-site requests attach. Strongest CSRF defense, worst sign-in UX (the magic-link click from email arrives without the cookie, the user looks logged out until refresh). Reserved for highly sensitive cookies; not the default.
- `Lax` (the default): same-site requests *and* top-level safe-method navigations (`<a href>`, `<form method="get">`) attach. Cross-site `POST`, `<img>`, `<iframe>`, and `fetch` do **not**. Senior default for session cookies because it preserves the magic-link UX while closing the CSRF surface. One line on the 2020 Chrome shift that made `Lax` the *implicit* default when the attribute is absent — but senior code never omits the attribute, it writes it explicitly.
- `None`: every request attaches, same-site or cross-site. Requires `Secure`. Reserved for legitimate cross-site embeds (payment iframe, embedded widget). In 2026, `SameSite=None` without `Partitioned` is blocked by Safari and Firefox by default and increasingly degraded in Chrome — see the `Partitioned` section.

**Diagram (Mermaid `flowchart LR`):** the central pedagogical artifact of the lesson. A small matrix-shaped flowchart with three "request shape" inputs on the left and three `SameSite` columns on the right, showing for each (request × value) pair whether the cookie attaches.

- Request shapes (rows): "Same-site `fetch`", "Cross-site top-level `<a>` click", "Cross-site `POST` from third party".
- Values (column groupings): `Strict`, `Lax`, `None`.
- Cells: green check for attaches, red cross for blocked.

If a `flowchart` becomes visually noisy, fall back to a plain HTML+CSS table (three rows × three columns) inside a `<Figure caption="Cookie attachment by SameSite value (Chapter 017)">`. The student sees at a glance: `Lax` keeps top-level nav (the magic-link case) and blocks cross-site POST (the CSRF case). Pedagogical goal: make the "why `Lax` is the default" decision a glance, not a paragraph to re-read.

**Failure-mode paragraph:** named explicitly under the table — `SameSite=Lax` plus state-changing endpoints using POST/PUT/DELETE retires the bulk of the CSRF surface. A malicious page can host `<form action="https://app.acme.com/transfer" method="post">` and the cookie does not go; the server sees an unauthenticated request; the transfer fails.

### Path: scoping convenience, not a security boundary

One paragraph. Default is the *page's* path, which produces surprising bugs (cookie set on `/admin/login` doesn't attach on `/admin/users`). Senior default: `Path=/`. One named load-bearing line: *`Path` is not a security boundary* — same-origin script can read across paths if it shares the name. Do not treat it as one.

### Domain: omit it for host-only

One paragraph + one inline `Set-Cookie` example showing what omission produces vs. what `Domain=acme.com` produces.

- Omit `Domain` → host-only cookie (only `app.acme.com` receives it).
- Write `Domain=acme.com` → every subdomain receives it (`app.acme.com`, `api.acme.com`, *and* `marketing.acme.com`).
- Failure mode: a session cookie scoped to the app should not be readable by a CMS subdomain with a lower security bar. Senior default: omit `Domain` unless cross-subdomain attachment is the explicit feature.

### Max-Age vs. Expires vs. session cookies

One paragraph. `Max-Age` is seconds-from-now (`2592000` = 30 days). `Expires` is an absolute HTTP-date — interchangeable in effect; `Max-Age` is the modern reach. **Without either, the cookie is a session cookie** — supposedly lives until the browser closes, but on mobile and tab-restore browsers "session" is effectively "forever." Always set `Max-Age` for session cookies you want to expire predictably. Name the **400-day cap**: Chrome (and Firefox/Safari per RFC 6265bis) silently clamps any larger value to 400 days. Browsers will not honour a longer cookie even if the server requests one. `Max-Age=0` deletes the cookie.

### The __Host- and __Secure- prefixes

Use an `Aside type="tip" title="Prefix discipline"` or a small h3 — the prefixes are load-bearing enough to deserve their own heading.

- `__Host-<name>`: browser enforces `Secure` + no `Domain` + `Path=/`. The cookie is host-locked at the browser level — `evil.acme.com` cannot land a `__Host-sid` that `app.acme.com` reads.
- `__Secure-<name>`: browser enforces `Secure` only. `Domain` and `Path` are unrestricted.
- Failure mode they prevent: subdomain-attacker cookie injection. Without `__Host-`, a compromised sibling subdomain can `Set-Cookie: sid=... ; Domain=acme.com` and the parent app reads it.
- Senior rule: `__Host-` is the 2026 default for new session cookies. `__Secure-` is the relaxed alternative for the cross-subdomain case (where you intentionally `Domain` the cookie).
- One short snippet showing a `__Host-` line and a `__Secure-` line side by side.

Pedagogical note: prefixes are a "browser-enforced" mechanism, distinct from attributes you can read off — explicitly note that the browser *rejects* the `Set-Cookie` if attributes don't match the prefix's contract, which makes the prefix a self-checking invariant.

### Partitioned (CHIPS): the cross-site cookie that survives

Subsection with one paragraph + small snippet + one `Aside type="note" title="The 2026 third-party-cookie reality"`.

- Body: a `Partitioned` cookie is keyed not just by its own origin but by the *top-level site* embedding it. Same widget on `news.com` and `blog.com` sees two separate cookie jars.
- Failure mode it prevents: cross-site tracking via shared third-party cookies, which is why Safari and Firefox already block unpartitioned third-party cookies.
- Required pairing: `Secure; SameSite=None; Partitioned`. Optionally `__Host-` (recommended).
- Senior rule: when shipping an embedded widget, a payment iframe, or any legitimate cross-site cookie, this is the line. `SameSite=None; Secure` alone is degraded by browsers; `Partitioned` is what restores it.
- Snippet: `Set-Cookie: __Host-widget=...; HttpOnly; Secure; SameSite=None; Partitioned; Path=/`.

`Aside` content on the 2026 third-party-cookie reality:
- Safari (ITP) and Firefox (Total Cookie Protection) block unpartitioned third-party cookies by default and have for years.
- Google retreated from forced deprecation in April 2025 (no separate Chrome prompt; users manage in existing settings) and in October 2025 retired most Privacy Sandbox APIs (Topics, Attribution Reporting, Protected Audience).
- CHIPS, FedCM, and Private State Tokens are the platform features Google continues to support.
- Senior reading: third-party cookies are not dead in Chrome but cannot be relied on. `Partitioned` is the only mechanism that survives across all major browsers.
- Cross-site tracking, ad attribution, and FedCM are out of scope here.

### The Next.js 16 cookies() helper

The Pattern at the close. Lead paragraph names the three App Router server contexts the helper works in — **Server Components**, **Server Actions**, **Route Handlers** — and notes Units 5 and 7 own these in depth; this lesson states the call surface only.

Use **`CodeVariants`** with three tabs (one per call site). Each tab has one fenced TS block with `'use server'` or `'use client'` markers as needed and a 2–3 sentence prose explanation below.

- **Tab 1 — Read in a Server Component / Route Handler.**
  ```ts
  // app/dashboard/page.tsx
  import { cookies } from 'next/headers';

  export default async function Dashboard() {
    const sid = (await cookies()).get('__Host-sid')?.value;
    // ...
  }
  ```
  Prose: `cookies()` is async in Next.js 16 — the `await` is mandatory. The codemod that converted sync callers in 15 → async is the only history worth knowing. `get` returns `{ name, value }` or `undefined`.

- **Tab 2 — Write in a Server Action.**
  ```ts
  // app/actions.ts
  'use server';
  import { cookies } from 'next/headers';

  export async function signIn(/* ... */) {
    (await cookies()).set({
      name: '__Host-sid',
      value: sessionId,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  ```
  Prose: the option-bag form mirrors the attribute table row-for-row. `partitioned: true` is the CHIPS opt-in when needed. The shape is the senior default in code.

- **Tab 3 — Delete in a Server Action / Route Handler.**
  ```ts
  (await cookies()).delete('__Host-sid');
  // equivalent:
  (await cookies()).set('__Host-sid', '', { maxAge: 0 });
  ```
  Prose: `delete` is the cleanest reach. `maxAge: 0` is the equivalent that round-trips through the option-bag form.

Why `CodeVariants`: three logically grouped files that show the same helper across three call sites — exactly the comparison shape `CodeVariants` is built for. Keeps the page short.

After the tabs, one `Aside type="caution" title="Where set works"`:
- HTTP does not allow setting headers after the response body starts streaming.
- `cookies().set` only works in Server Actions and Route Handlers — Server Components rendering markup cannot set cookies (the call throws).
- Chapter 5 owns this boundary; lesson states the constraint and moves on.

One short paragraph below the tabs on **the round-trip rule**: setting a cookie in this response does not make it readable in the *same* request — the cookie lands on the *next* request the browser makes. If a Server Action needs to read what it just set, it reads from the in-memory value, not from `cookies().get`. Plan for the round trip.

### The client side, in one line

Single paragraph. `document.cookie` reads non-`HttpOnly` cookies as one semicolon-separated string. The student does not write `document.cookie` parsers — when the client must read a cookie, the senior reach is a Server Action / Route Handler that reads server-side and returns the value, or a small parser if the cookie was deliberately set non-`HttpOnly`. The lesson does not show the parser.

### Senior watch-outs

Compact bullet list (use a plain Markdown unordered list — no need for an `Aside`, the surrounding section header signals "things that bite"):

- `SameSite=None` without `Secure` is rejected silently by the browser. Pair them or skip both.
- `Domain` and `__Host-` are incompatible — `__Host-` forbids `Domain`. Pick one: host-locked or shared.
- Cookie size cap is 4 KB per cookie, 50 cookies per domain in most browsers. Sessions hold an opaque ID, not user state — state lives server-side.
- The `Cookie:` request header concatenates every matching cookie into one string on every request. Large cookies tax every request; treat the cookie as expensive bandwidth.
- Set-and-read in the same response cycle does not work — the cookie lands on the *next* request. Plan for the round trip.
- The "browser deletes session cookies on tab close" mental model is fictional on mobile. Treat unbounded session cookies as effectively permanent; prefer `Max-Age`.

### Drill: read each header

Closing exercise. Use the `Matching` component, six pairs. Left column: a `Set-Cookie` header (in inline code). Right column: the failure mode it produces or the fix. Pedagogical goal: force the student to *read* each attribute and recognize the problem.

Proposed pairs (rotate left/right wording so it isn't a one-token match):

1. `Set-Cookie: sid=abc; SameSite=None` ↔ Silently rejected — `SameSite=None` requires `Secure`.
2. `Set-Cookie: __Host-sid=abc; HttpOnly; Secure; SameSite=Lax; Domain=acme.com; Path=/` ↔ Rejected by browser — `__Host-` forbids `Domain`.
3. `Set-Cookie: sid=abc; Secure; SameSite=Lax; Path=/` ↔ Missing `HttpOnly` — exposes a session cookie to XSS exfiltration.
4. `Set-Cookie: __Host-sid=abc; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` ↔ The senior default — first-party session cookie, host-locked, 30-day expiry.
5. `Set-Cookie: widget=abc; HttpOnly; Secure; SameSite=None; Partitioned; Path=/` ↔ Legitimate cross-site embed cookie under CHIPS.
6. `Set-Cookie: pref=dark; Path=/` ↔ Client-readable UI preference — no session data, no `HttpOnly` needed.

### Hands-on (optional)

Close with an optional `SandboxCallout` pointing at a tiny scratch sandbox (CodeSandbox or StackBlitz) with a single Next.js Route Handler that does:

```ts
export async function POST() {
  (await cookies()).set({
    name: '__Host-sid',
    value: 'demo-' + Date.now(),
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return new Response(null, { status: 204 });
}
```

The callout one-liner asks the student to: open the sandbox, hit the endpoint from the embedded preview, open the DevTools Application → Cookies panel, and verify each attribute on the row. Pedagogical goal: tactile reinforcement of the attribute table through a real browser cookie jar.

Mark this section explicitly optional (one sentence above the callout). The lesson is complete without it.

---

## Scope

**This lesson teaches:** Set-Cookie attribute palette (`HttpOnly`, `Secure`, `SameSite` with the three values, `Path`, `Domain`, `Max-Age`/`Expires`, `__Host-` and `__Secure-` prefixes, `Partitioned`/CHIPS), the senior default line, the failure mode each attribute closes, the Next.js 16 `cookies()` call surface across the three App Router server contexts (Server Components / Server Actions / Route Handlers, as call sites only), the 2026 third-party-cookie landscape, and the set-of-watch-outs that bite in production.

**This lesson does not teach:**

- **Session design.** What the cookie value *is* — opaque random ID vs. signed JWT, rotation, signing keys, server-side session storage. Lesson 055.2 and Chapter 056 own this end-to-end. The lesson uses `__Host-sid` as a placeholder and states the value is opaque without explaining its construction.
- **CSRF token patterns / double-submit cookies / synchronizer tokens.** Chapter 085 owns the security baseline. The lesson names `SameSite=Lax` as the bulk-CSRF retire and stops.
- **Authentication flows.** Sign-in, sign-out, magic links, OAuth callbacks, password reset, email verification — Unit 9 owns these end-to-end. The lesson does not show a sign-in handler beyond a one-line Server Action stub that demonstrates the `set` call shape.
- **The full `cookies()` API surface.** `RequestCookies` vs. `ResponseCookies`, behavior under PPR/Cache Components, dynamic-rendering opt-in via `cookies()` — Unit 5 owns the request surface in depth (Chapter 037 specifically). The lesson names the three call-site contexts and the cannot-set-during-streaming constraint, then stops.
- **Cookie consent banners, GDPR/CCPA categorization, analytics opt-in flows.** Session and CSRF cookies are "strictly necessary" and exempt from consent; the banner UI is out of scope on this stack. Unit 17 (security/compliance) may revisit.
- **Cross-site tracking, FedCM, Privacy Sandbox APIs (Topics, Attribution Reporting, Protected Audience), Private State Tokens.** Out of scope on this stack; named once in the `Partitioned` Aside as "the rest is out of scope here."
- **The browser-side Cookie Store API (`cookieStore.set` / `cookieStore.get`).** Niche; the senior reach is server-side `Set-Cookie`. Not mentioned.
- **Legacy `Set-Cookie2`, `expires`-vs-`max-age` history, the RFC 2109/2965 lineage.** No historical detour — `Max-Age` is the modern reach; `Expires` is named once as the absolute-date equivalent and dropped.
- **The full RFC 6265bis spec surface.** The senior subset above is what production needs. The 400-day cap is the one spec detail named.
- **CORS** (Lesson 016.3 owns it), **origin and same-site classification** (Lesson 016.2 owns it), and the `Cookie:` request header's full role (named in 015.3 only).

**Prerequisites the lesson assumes (briefly redefines if needed):**

- The student knows `Set-Cookie` is a response header and `Cookie` is a request header (Lesson 015.3). No redefinition needed beyond "the server writes once; the browser attaches automatically thereafter."
- The student knows what *origin* and *site* are (Lesson 016.2). The lesson reuses "same-site" and "cross-site" without redefinition.
- The student knows what XSS and CSRF are at the one-line level (Lesson 016.2 named CSRF; XSS is new here). Inline `<Term>` tooltips redefine them on first appearance with forward-refs to Lessons 058.4 and Chapter 085 for depth.
- The student has hit `mkcert` HTTPS on localhost (Lesson 014.3), which makes `Secure` cookies a non-issue in local dev.
- The student knows Server Components / Server Actions / Route Handlers *exist* as Next.js App Router contexts (one-line name from 004 scaffolding); the lesson does not explain what they are, only that `cookies()` is the helper that runs in each.
