# Set-Cookie attributes and the safe default

- **Title (h1):** Set-Cookie attributes and the safe default
- **Sidebar label:** Set-Cookie attributes

---

## Lesson framing

**Archetype.** Reference/survey wrapped around one Decision (the senior default) with a Pattern-shaped close (the Next.js `cookies()` helper). The center of gravity is one attribute palette; every attribute earns its place by the failure mode it prevents.

**The two threads that must run through every section** (state thread 1 in the intro, reinforce both throughout):

1. **A cookie is an ambient credential.** The browser attaches it automatically on every matching request; the application code never sees it being sent. That automatic attachment is the feature (sessions stay logged in with zero app code) and the threat (a cross-site request the user never authored carries their cookie too). Every `Set-Cookie` attribute exists to constrain *when* the browser attaches, *who* can read it on the page, and *where* it survives.
2. **Each attribute maps to a concrete failure mode.** Never present an attribute as a neutral setting. Present it as: what it controls -> what breaks without it -> the senior default. This is the spine of the lesson.

**The one thing the student must leave with:** the senior default line committed to muscle memory and the ability to recite what each attribute prevents.

```
Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

**Mental model the student should end with.** A `Set-Cookie` header is a small contract the server hands the browser once; the browser then re-presents it, unprompted, on requests that satisfy the contract's conditions. The attributes are the conditions. Tighten them by default; loosen one only when a named feature requires it.

**Sequencing for low cognitive load.** Open with the ambient-credential framing and the default line *before* the attribute table, so the student has a destination before the detail. Then walk attributes in roughly increasing complexity: `HttpOnly` and `Secure` (simple on/off, one failure mode each) -> `SameSite` (the load-bearing one, longest section, needs a diagram) -> `Path`/`Domain` (scoping, the "not a security boundary" nuance) -> `Max-Age`/`Expires` (lifetime) -> prefixes (browser-enforced naming) -> `Partitioned`/the 2026 reality (the cross-site case). Close by assembling the full default line, then the Next.js helper, then exercises.

**Where beginners go wrong (address inline in the named sections):**
- Thinking `HttpOnly` stops XSS entirely (it only stops *reading* the cookie, not *using* it).
- Treating `Path` as a security boundary (it is not).
- Writing `Domain=acme.com` "to be safe" and silently leaking the session to every subdomain.
- Assuming `SameSite=None; Secure` still works in all browsers in 2026 (it is degraded without `Partitioned`).
- Expecting a cookie they just `set` to be readable in the same request cycle.
- Believing session cookies reliably die on tab close (fiction on mobile).

**Target student reminder.** Experienced programmer, new to web. No "what is a header" preamble — the prior chapters built the HTTP contract and the origin/CORS trust boundary. Assume they can read an HTTP response. Keep it terse and adult. Lead with decisions and reasoning, code illustrates.

**Estimated time:** 50-65 minutes.

---

## Lesson sections

### Introduction (no h2 — page intro prose)

Open with the senior question implicitly: *how do you keep a user logged in across requests without the app re-sending credentials, and how do you keep that mechanism from being turned against you?* Establish thread 1 (ambient credential = feature + threat) in two or three sentences. Connect to prior chapters: they have the HTTP request/response contract and the origin/CORS boundary; the cookie is the small piece of state that rides every same-site request and is the substrate sessions, CSRF defenses, and server-set preferences will be built on later. Preview the deliverable: by the end they can read every attribute on a real `Set-Cookie` header and they will have memorized one default line they paste into every cookie-writing call for the rest of the course. Show the default line once here as the preview (do not yet explain each attribute). Keep warm and brief.

`Term` candidates in the intro: **ambient credential** (define: a credential the browser sends automatically without the app attaching it).

### How the browser sends a cookie back

Purpose: lock in the round-trip mental model before any attribute. This is the conceptual foundation everything else hangs on.

Content:
- The server writes a cookie once with a `Set-Cookie:` response header. The browser stores it and then, on every subsequent matching request, attaches it as a `Cookie:` request header — automatically, with no app code involved.
- This is why the attributes exist: they are the conditions the browser checks before re-attaching.
- One header sets one cookie. The shape is `Set-Cookie: name=value; Attribute1; Attribute2=value; ...`. Note the one legitimate exception to the "one header appears once" rule: a response may carry multiple `Set-Cookie` headers to set multiple cookies.

Diagram (high value — this is the mental model): a **two-step round-trip** showing (1) response carrying `Set-Cookie: sid=abc123; ...` from server to browser, then (2) a later request from browser to server carrying `Cookie: sid=abc123`. Use **Mermaid `sequenceDiagram`** (actors: Browser, Server; two exchanges) wrapped in `<Figure>`. Pedagogical goal: make "set once, re-sent automatically" concrete and visual. Keep it to two round-trips, horizontal, compact. Caption: the app code never attaches the cookie — the browser does.

Then an **anatomy breakdown** of one full header so the student can name every part before the table. Use an **HTML+CSS color-coded segment strip** (per diagrams INDEX: "color-coded segments with callouts", devtools-inspectable, agent-authorable) wrapped in `<Figure>`, breaking:

```
Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

into labeled segments: `name=value` (the payload), then each attribute tinted and labeled with a one-word role (visibility, transport, cross-site rule, scope, lifetime). Pedagogical goal: give the student a parts-of-speech map of the header they will now read row by row. Caption names that the rest of the lesson walks these left to right.

`Term` candidates: none new here beyond intro.

### `HttpOnly` — keep the cookie out of JavaScript's reach

Structure every attribute section the same way (what it controls / failure mode without it / senior default) so the lesson reads as a consistent table-in-prose.

- **What it controls:** the cookie is invisible to `document.cookie` and any JavaScript on the page. The browser still attaches it to requests; only the JS *read* API is blocked.
- **Failure mode without it:** XSS that reaches an unescaped sink can read every non-`HttpOnly` cookie and exfiltrate the session in one line.
- **The load-bearing nuance (beginners miss this):** `HttpOnly` does *not* stop XSS from making authenticated requests with the cookie attached — the browser still sends it. It is defense-in-depth that cuts off the most common *exfiltration* path, not a cure for XSS. Say this explicitly.
- **Senior default:** every session-bearing cookie is `HttpOnly`. The only cookies without it are ones the client UI legitimately must read (a `theme=dark` preference, a CSRF double-submit token).

Tiny `Code` snippet: `Set-Cookie: sid=abc123; HttpOnly` with one line on the contrast to a readable `theme=dark`.

`Term` candidates: **XSS** (cross-site scripting — untrusted input executing as script in the page; note depth comes in a later security chapter so the flow is not interrupted).

### `Secure` — only travel over HTTPS

- **What it controls:** the cookie is only attached on HTTPS requests.
- **Failure mode without it:** on any plaintext HTTP leg (rare in 2026 but coffee-shop wifi and corporate proxies still produce them), the browser would attach the cookie in the clear and an on-path attacker reads it.
- **Local-dev note (one line, do not dwell):** browsers treat `http://localhost` as a secure context for most APIs, but `Secure`-cookie behavior on plain localhost is inconsistent; the course's local HTTPS setup (mkcert, taught earlier) makes this a non-issue.
- **Senior default:** every cookie is `Secure`. The only thing that flips it off is a legacy HTTP test fixture — rare on this stack.

Tiny `Code` snippet showing `Secure` added to the line.

`Term` candidates: **on-path attacker** (someone positioned on the network path who can read/modify unencrypted traffic).

### `SameSite` — the load-bearing attribute

This is the longest and most important section. Budget the most depth and the strongest diagram here. The student's CSRF intuition is built entirely from this attribute.

Lead-in: this single attribute decides whether the browser attaches the cookie on requests that *originate from another site*. It is the difference between a session that survives a CSRF attack and one that does not.

Cover the three values, each as a short subsection-equivalent (can be h3 or tight prose blocks — prefer prose blocks with bolded value names to avoid heading sprawl):

- **`Strict`** — attached only on same-site requests. Even a top-level navigation from a third party (clicking a link from another site to your app) does *not* attach it on that first request. Strongest CSRF defense, worst sign-in-link UX (magic-link click looks logged-out until refresh). Reserved for highly sensitive sub-cookies; not the default.
- **`Lax`** — attached on same-site requests and on **top-level safe-method navigations** from a third party (an `<a href>` click, a `GET` form). *Not* attached on cross-site `POST`, `<img>`, `<iframe>`, or `fetch`. This is the senior default for session cookies: it preserves the magic-link UX while killing the CSRF surface. One line on the 2020 Chrome change that made `Lax` the *implicit* default when the attribute is absent — but the senior always writes it explicitly.
- **`None`** — attached on every request, same-site or cross-site. Requires `Secure`. Reserved for legitimate cross-site use (payment iframe, authenticated embedded widget). In 2026, `SameSite=None` without `Partitioned` is blocked by Safari and Firefox by default and increasingly degraded in Chrome — forward-reference the `Partitioned` section.

- **The failure mode `Lax` prevents (state this as the payoff):** the classic CSRF attack — a malicious page POSTs to your app's state-changing endpoint and the browser would attach the session cookie. With `Lax`, the cookie does not go, the server sees an unauthenticated request, the action fails. This is why `SameSite=Lax` plus state-changing endpoints using POST/PUT/DELETE retires the bulk of the CSRF problem. (Note explicitly: token-based CSRF defenses and what `Lax` leaves uncovered are a later chapter's job — name the boundary, do not teach it.)

**Diagram (highest-value visual in the lesson):** a **3x3 attach / don't-attach grid** comparing the three `SameSite` values (rows) against three request shapes (columns): *same-site fetch*, *cross-site top-level navigation (GET link)*, *cross-site POST/fetch*. Each cell shows attached (check) or not attached (cross). Use **HTML+CSS grid** (per diagrams INDEX: color-coded cells, compact, devtools-inspectable, agent-authorable; a Mermaid table is the fallback) wrapped in `<Figure>`. Pedagogical goal: make the cause-and-effect of each value instantly comparable and show *why* `Lax` is the sweet spot (it is the only row that allows the cross-site GET nav but blocks the cross-site POST). Cap height; this should read at a glance. Caption: the `Lax` row is the senior default — it keeps sign-in links working and blocks the CSRF POST.

`Term` candidates: **CSRF** (cross-site request forgery — a malicious site causing the user's browser to fire an authenticated request the user never intended); **safe method** (HTTP methods that only read, GET/HEAD — defined in the HTTP-methods lesson, re-define in one line); **top-level navigation** (the user's address bar changing to your site, vs. a sub-resource or background request).

### `Path` — scoping convenience, not a security boundary

- **What it controls:** the cookie is attached only on requests whose pathname starts with this prefix.
- **The default-path trap (beginners hit this):** if you omit `Path`, the browser uses the path of the page that set the cookie — usually a sub-path — producing surprising bugs (a cookie set on `/admin/login` does not attach on `/admin/users`).
- **Senior default:** `Path=/`.
- **The nuance to nail (callout-worthy):** `Path` is *not* a security boundary. Any same-origin script can read across paths if the cookies share a name. Use `Path` for scoping convenience only; never lean on it for isolation.

Wrap the "not a security boundary" point in an `<Aside type="caution">` so it stands apart without becoming its own watch-outs section.

Tiny `Code` snippet showing `Path=/`.

### `Domain` — host-only by default, or you leak to every subdomain

- **What it controls:** with `Domain=acme.com`, the cookie is attached on the named host *and all its subdomains*.
- **The senior default is to omit `Domain` entirely** — the cookie becomes host-only (attached only to the exact host that set it).
- **Failure mode without that discipline:** writing `Domain=acme.com` sends the cookie to `app.acme.com`, `api.acme.com`, *and* `marketing.acme.com`. A session scoped to the app should never be readable by the marketing subdomain, which may run a CMS with a lower security bar. This is the "to be safe I'll set Domain" mistake that does the opposite.
- **Senior rule:** omit `Domain` unless cross-subdomain attachment is the explicit, intended feature.

Tiny `Code`: contrast `Set-Cookie: sid=...` (host-only) vs. `Set-Cookie: sid=...; Domain=acme.com` (subdomain-wide) with a one-line label on each.

### `Max-Age` and `Expires` — how long the cookie lives

- **What they control:** `Max-Age` is seconds-from-now (`Max-Age=2592000` = 30 days). `Expires` is an absolute HTTP-date. `Max-Age` wins when both are present and is the senior choice (no clock-skew ambiguity).
- **The session-cookie default (beginners miss this):** with *neither* attribute, the cookie is a "session cookie" that lives until the browser closes — which on mobile and tab-restoring browsers is "approximately forever," not "the actual session."
- **Senior default:** set `Max-Age` to match the intended session lifetime so expiry is predictable. `Max-Age=0` deletes the cookie immediately.
- **The browser ceiling (name once):** Chrome and Firefox clamp cookie lifetimes to **400 days** (per the cookie spec, RFC 6265bis); any larger value is silently capped.

Tiny `Code` snippet with `Max-Age=2592000`.

### `__Host-` and `__Secure-` — naming prefixes the browser enforces

- **The idea:** these are not real attributes — they are *name prefixes* the browser treats as a contract. A cookie whose name starts with the prefix must satisfy attribute constraints or the browser rejects the `Set-Cookie` outright.
  - `__Host-`: must be `Secure`, must have **no** `Domain`, must be `Path=/`. (Host-locked.)
  - `__Secure-`: must be `Secure`. `Domain` and `Path` unrestricted. (The relaxed, cross-subdomain alternative.)
- **Failure mode they prevent:** a subdomain attacker setting a cookie that the parent domain then reads. `__Host-` makes the cookie host-locked *at the browser level*, so a write from `evil.acme.com` cannot land a `__Host-sid` that `app.acme.com` reads.
- **Senior rule:** prefix session cookies with `__Host-` whenever you do not need cross-subdomain attachment. `__Host-` is the 2026 default for new code; `__Secure-` is the relaxed alternative for the cross-subdomain case.
- **The interaction to flag:** a `__Host-` cookie *cannot* carry `Domain` — pick one, host-locked or shared. (This becomes a Matching exercise distractor; surface it here.)

Wrap the three-constraint summary for `__Host-` in an `<Aside type="tip">` so it is scannable.

Tiny `Code`: `Set-Cookie: __Host-sid=...; HttpOnly; Secure; SameSite=Lax; Path=/` (valid) and, for contrast, `Set-Cookie: __Host-sid=...; Domain=acme.com` labeled "rejected by the browser."

`Term` candidates: none new (subdomain attacker explained inline).

### `Partitioned` (CHIPS) and the 2026 third-party-cookie reality

Two tightly linked topics; keep them together because the reality motivates the attribute.

- **`Partitioned`:** a `Partitioned` cookie is keyed not just by its own origin but by the *top-level site* embedding it. The same widget on `news.com` and `blog.com` sees two completely separate cookie jars.
- **Failure mode it prevents:** cross-site tracking via a single shared third-party cookie — exactly why Safari and Firefox already block unpartitioned third-party cookies.
- **The pairing (state precisely):** must be combined with `Secure` and `SameSite=None`. The bare `SameSite=None; Secure` pair is now degraded by browsers; `Partitioned` is what restores a working cross-site cookie. The senior pattern during the transition is to set **both** `SameSite=None; Secure` and `Partitioned` together — `Partitioned` is honored where supported, and the bare pair is the fallback where it is not. (Verified: this is the documented CHIPS transition guidance.)
- **Senior rule:** shipping an embedded widget, a payment iframe, or any legitimate cross-site cookie -> `Secure; SameSite=None; Partitioned` (and `__Host-` recommended; the documented canonical CHIPS example uses the `__Host-` prefix).

- **The 2026 reality (the senior reading — verified current, keep terse):** Safari and Firefox block third-party cookies by default and have for years. Google **confirmed in April 2025 it will not deprecate third-party cookies in Chrome and will not ship the standalone choice prompt** — it keeps third-party-cookie controls in Chrome's existing privacy settings. In **October 2025 Google retired most Privacy Sandbox APIs** (Topics, Attribution Reporting, Protected Audience) but **explicitly continues to support CHIPS, FedCM, and Private State Tokens**. The senior conclusion: third-party cookies are not dead in Chrome but **cannot be relied on** (a growing share of users have privacy settings that block them), and `Partitioned` (CHIPS) is the one cross-site cookie mechanism that survives across all browsers and that Google has committed to. Cross-site tracking / analytics / ad attribution are out of scope — name once that this work moved off third-party cookies onto first-party data, FedCM, and server-to-server channels, then move on.

Wrap the `Partitioned` pairing rule in an `<Aside type="note" title="CHIPS in one line">`.

`Term` candidates: **CHIPS** (Cookies Having Independent Partitioned State — the spec name for the `Partitioned` attribute); **third-party cookie** (a cookie set under a different site than the one in the address bar); **FedCM** (Federated Credential Management — the browser API replacing third-party-cookie-based federated sign-in; name only, do not teach).

### The senior default, assembled and read aloud

Short, high-impact section — this is the memorization payoff. Reassemble the full line and read each attribute back as a sentence, so the student leaves able to recite it.

```
Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

Read aloud, attribute by attribute: host-locked name, no JavaScript read, HTTPS only, attached on top-level same-site navigations, scoped to the whole app, expires in 30 days.

Use an `AnnotatedCode` block here (the line is the `code`, each step highlights one attribute and gives its one-sentence justification) so the student can step through the default one piece at a time and the "read aloud" is interactive. This is a strong fit for `AnnotatedCode`'s stepped-walkthrough purpose. `color="blue"` per step; `lang="http"` (or `text` if `http` highlighting is unavailable in Expressive Code — the agent should verify and fall back to `text`).

Then state the flip conditions compactly (a small list, not a table): when does each attribute leave the default? `SameSite=None; Partitioned` for the cross-site embed; drop `HttpOnly` for a client-readable preference/CSRF token; `__Secure-` + `Domain` when cross-subdomain is the feature; `Secure` off only for a legacy HTTP fixture. This is the Decision layer — the default plus the named triggers that move off it.

### Reading and writing cookies in Next.js

Pattern-shaped close. Keep it tight — the goal is the canonical call sites and the one constraint, not the full `cookies()` API (that is a later unit's job; say so).

Frame first: three Next.js server execution contexts run server code in the App Router — **Server Components**, **Server Actions**, and **Route Handlers** (named in earlier/later units; do not re-teach them, just name them). They are the canonical call sites for the `cookies()` helper. `cookies()` is **async** in the App Router (Next.js 16) — the `await` is mandatory. (Verified against the current Next.js docs.)

Use **`CodeVariants`** for the three operations (multiple related snippets, the canonical use of the component):

- **Read** (Server Component or Route Handler):
  ```ts
  const sid = (await cookies()).get('__Host-sid')?.value;
  ```
  One line: works in any server context; `await` required.
- **Write** (Server Action or Route Handler):
  ```ts
  (await cookies()).set({
    name: '__Host-sid',
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  ```
  Point out: the option bag mirrors the attribute table one-to-one. `partitioned: true` is the CHIPS opt-in when needed.
- **Delete** (Server Action or Route Handler):
  ```ts
  (await cookies()).delete('__Host-sid'); // or set maxAge: 0
  ```

After the variants, name the one hard constraint in prose (do not bury it in a tab): **cookies can only be written in contexts that have not started streaming the response — Server Actions and Route Handlers, never a Server Component rendering markup.** Calling `set` from a Server Component throws. (Verified against current Next.js docs.) State this and move on; the rendering-boundary depth belongs to a later unit.

Then the **round-trip trap** (beginners hit this constantly), as an `<Aside type="caution">`: setting a cookie and reading it back in the *same* request cycle does not work — `set` schedules a `Set-Cookie` on the *response*, so the value only appears on the *next* request. Plan for the round trip.

One line on the client side (do not teach a parser): `document.cookie` reads non-`HttpOnly` cookies as a single semicolon-separated string; the senior reach when the client needs a cookie value is to read it server-side and pass it down, not to parse `document.cookie`. The lesson does not show the parser.

Optionally layer a single `CodeTooltips` pass on the write call to map two or three options to their `Set-Cookie` attribute (`httpOnly` -> `HttpOnly`, `sameSite: 'lax'` -> `SameSite=Lax`, `maxAge` -> `Max-Age`) if the option->attribute correspondence needs reinforcing. Do not also add an `AnnotatedCode` walkthrough of the same call — pick one, keep the section tight.

`Term` candidates: none new (Server Component / Server Action / Route Handler are named, not defined here — they are owned by other units).

### Exercises

Place exercises where they reinforce, not all at the end — but the two strongest are summative and belong near the close, after the helper section.

1. **`Matching` — header to failure mode/fix** (the primary exercise from the chapter outline). Six `Set-Cookie` headers on the left, the failure mode each produces or the fix on the right. Compose the left column to drill the traps taught above:
   - a correct `__Host-` default line -> "safe: host-locked session default";
   - `SameSite=None` *without* `Secure` -> "silently rejected by the browser";
   - `__Host-sid=...; Domain=acme.com` -> "rejected: `__Host-` forbids `Domain`";
   - a session cookie *missing* `HttpOnly` -> "readable by XSS / `document.cookie`";
   - `Domain=acme.com` on a session cookie -> "leaks the session to every subdomain";
   - an embedded-widget cookie with `SameSite=None; Secure` but no `Partitioned` -> "degraded/blocked cross-site without `Partitioned`".
   Keep to six pairs (well within the 8-pair comfort ceiling). Use `instructions` to frame: "Match each Set-Cookie header to the outcome it produces."

2. **`Buckets` — pick the cookie shape for the job** (reinforces the Decision layer). Three buckets keyed to the scenario's correct cookie configuration, items are real scenarios:
   - Bucket "Session default (`__Host-`; HttpOnly; Secure; SameSite=Lax; Path=/`)": items like *the signed-in session ID*, *a state-changing POST endpoint that needs CSRF protection from SameSite*.
   - Bucket "Drop `HttpOnly` (client must read)": items like *a `theme=dark` preference the UI toggles*, *a double-submit CSRF token the client echoes*.
   - Bucket "Cross-site embed (`Secure; SameSite=None; Partitioned`)": items like *a payment iframe cookie*, *an authenticated embedded widget on partner sites*.
   Use `twoCol` and `instructions`. Goal: force the student to choose the configuration from the requirement, which is the senior skill the lesson teaches. Grading is the bucket match.

3. **Optional `SandboxCallout`** — a StackBlitz/Next.js Route Handler stub that sets the default cookie, so the student can hit it, open DevTools -> Application -> Cookies, and inspect the real cookie jar (attributes shown in columns). One sentence of framing. Mark clearly optional; the attribute table is the lesson and this is enrichment. If included, verify the embed URL frames before shipping (the host must allow framing; the site is cross-origin isolated and StackBlitz WebContainers boot).

### External resources (optional, end of lesson)

One or two `ExternalResource` cards max: MDN `Set-Cookie` reference and/or the `Partitioned`/CHIPS explainer on web.dev or MDN. Optional `VideoCallout` only if a focused, current (last ~12 months) SameSite/cookie-security explainer is found — low priority; do not pad with a generic cookies-101 video that dilutes the senior framing. The resourcer can search; if nothing focused and current surfaces, skip the video.

---

## Scope

**Prerequisites the student already has (redefine in one line max, do not re-teach):**
- The HTTP request/response model and headers (earlier chapters built the request-to-pixel pipeline and the HTTP contract).
- The origin and CORS trust boundary (immediately prior chapter) — "same-site" vs. "cross-site" intuition is assumed; `SameSite` builds directly on it.
- Local HTTPS via mkcert (earlier chapter) — referenced once for the `Secure`/localhost note.
- Server Components, Server Actions, Route Handlers exist as the three App Router server execution contexts — *named only*, owned in depth by other units.
- XSS and CSRF as concepts get one-line inline definitions (via `Term`); their full treatment is a later security chapter.

**This lesson does NOT cover (hard exclusions — do not drift into these):**
- **Session design** — what the cookie *value* is (opaque ID vs. JWT), signing, rotation. Owned by the Better Auth chapter. The senior default (opaque server-stored session, cookie carries only an unguessable ID) may be named in one line, not taught.
- **CSRF token patterns / double-submit cookies** — owned by the security-baseline chapter. State that `SameSite=Lax` + state-changing methods retires most of the surface and tokens cover the rest; do not implement tokens.
- **Authentication flows** (sign-in, sign-out, magic links, OAuth) — owned by the auth unit. Cookies are named here only as the storage substrate.
- **The full `cookies()` API surface** — the `RequestCookies` vs. `ResponseCookies` distinction and the rendering-boundary mechanics are owned by the App Router request-surface unit. This lesson shows read/write/delete and names the one write-context constraint, nothing deeper.
- **Cookie consent banners, GDPR/CCPA categorization, analytics opt-in** — out of scope; session and CSRF cookies are "strictly necessary" and exempt. Owned by a later unit.
- **Cross-site tracking, FedCM internals, Privacy Sandbox APIs** (Topics, Attribution Reporting) — out of scope on this stack; name once that this work moved off third-party cookies, do not teach it. (FedCM is named as a `Term` only.)
- **The browser `cookieStore` / Cookie Store API** — niche; the senior reach is server-side `Set-Cookie`. Do not introduce.
- **Legacy `Set-Cookie2`, `expires`-vs-`max-age` history, the full RFC** — no historical detour. Teach only the production subset above.
- **Writing a `document.cookie` parser** — explicitly avoided; named in one line as "don't."

---

## Code conventions notes (for downstream agents)

- The senior default in this lesson is the canonical course default and matches the conventions doc: `__Host-` prefix with `HttpOnly; Secure; SameSite=Lax; Path=/`, sessions never readable from JS. The Better Auth chapter later applies exactly this via the framework. Keep the line identical everywhere it appears in the lesson.
- Next.js 16: request APIs are async — `await cookies()` is mandatory in every snippet (conventions: "Async request APIs are Promises in Next.js 16"). Never show a synchronous `cookies()` call. (Verified against current Next.js docs: `cookies()` returns a Promise; `.set()`/`.delete()` work only in Server Actions and Route Handlers.)
- The cookie name in examples is `sid` (or `__Host-sid`) — a short opaque session ID, consistent with "sessions hold an opaque ID, not user state." Do not put user data in the example value.
- Code-block display follows the lesson MDX display rules: strip imports from inline illustrative `Set-Cookie` and helper snippets unless an import is the teaching point; these are illustrative fragments, not full files.
- Single quotes, 2-space indent, trailing commas in the option-bag snippet (Biome canon). The `set({...})` option bag uses `sameSite: 'lax'` (lowercase string, the Next.js API shape).
- **Deliberate divergence to note:** the illustrative `Set-Cookie:` header strings are raw HTTP, not TypeScript — they are shown to teach the wire format, which is the point of the lesson. The TypeScript shape appears only in the Next.js helper section. This staging (wire format first, helper second) is intentional for pedagogy.
