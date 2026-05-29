# Lesson 2 — Origin is the unit of browser trust

- **Title (h1):** Origin is the unit of browser trust
- **Sidebar label:** Origin & same-origin policy

---

## Lesson framing

This is the chapter's **concept lesson** (archetype: concept, not mechanics). No application code — illustrative URL strings, two tiny header snippets, and origin/site comparison only. The center of gravity is one mental model the student must leave with: **origin `(scheme, host, port)` is the unit the browser uses to scope trust, and the same-origin policy protects the *user* by gating the *response*, not the request.** Everything later in the unit (cookies, CORS, CSRF, postMessage) hangs off this anchor, so precision here pays compound interest.

Conclusions from brainstorming that apply lesson-wide:

- **Lead with the threat, not the definition.** The policy is meaningless until the student feels the danger it defends against. Open with the concrete attack: the browser auto-attaches the user's `bank.acme.com` cookie to *any* request to that host, so without a rule, `evil.com` could read the user's bank balance. The same-origin policy is the rule that makes that *read* fail. Definitions land *after* the student wants them.
- **Two boundaries, classified before any policy text.** Origin (strict) vs site (permissive) is the load-bearing vocabulary. The senior reflex is to classify any URL pair on both axes in five seconds. Build that reflex with a comparison table *first*, then a sorting exercise — muscle memory before the rule that uses it. This is the single highest-value takeaway for Chapter 013's `SameSite` work, so over-invest here.
- **The one sentence to memorize.** *"The browser sends the request and lets the response come back, but it refuses to let the cross-origin page read the response."* Box it. Every misconception in this topic dissolves once the student internalizes that requests fly and only *reads* are gated.
- **Name the most expensive misconception explicitly.** Beginners ship a state-changing `GET` and assume the same-origin policy protects it. It does not — the request still hits the server, cookies still attach, side effects still fire. Frame this in production stakes (an attacker's hidden `<img src>` firing a real DELETE) and name the real defenses (POST/PUT/DELETE + `SameSite` + CSRF tokens) as forward links, not as this lesson's content.
- **The carve-outs are *embed/navigate* permissions, not *read* permissions.** This reframe prevents the student from over-trusting "it loaded, so I can read it." A cross-origin `<img>` renders but its pixels are locked; a cross-origin `<script>` executes but the page can't read its source. Make the "loaded ≠ readable" distinction explicit.
- **Cognitive-load staging.** Build complexity in one direction: (1) the threat → (2) origin defined → (3) site defined as the looser cousin → (4) what the policy blocks → (5) the user-not-server implication → (6) the carve-outs → (7) cross-window access subset → (8) the `Origin` header handoff to L3. Each step reuses the prior. No forward references to CORS headers (L3 owns them) or cookie attributes (Ch013 owns them).
- **No sandbox, no live coding.** The skill is classification and reasoning, not syntax. Assessment is a `Buckets` sort. One `Table`, one Mermaid `flowchart`, one short list of carve-outs, two `Aside`s carry the visuals.

Estimated student time: 30–40 minutes.

---

## Lesson sections

### Introduction (no header) — the cookie the browser attaches for you

Open warm and brief, threat-first. The browser carries the user's credentials — cookies, HTTP basic auth, client certs — **automatically** with every request to a host the user has a session with. State the danger as a concrete scenario in prose: the user is logged into `bank.acme.com`; they open `evil.com` in another tab; a script on `evil.com` issues a request to `bank.acme.com/balance`; the browser dutifully attaches the bank session cookie. *Without a rule, `evil.com` reads the balance.* The same-origin policy is that rule. State the lesson goal: by the end, the student can (a) classify any URL pair as same/cross origin and same/cross site in seconds, (b) state precisely what the policy blocks and what it allows, and (c) explain why it protects the *user*, not the server. Connect to L1: L1 taught that `new URL()` normalizes the hostname and drops default ports — *that normalization is what makes the origin comparison in this lesson reliable* (cash the L1 forward-nod). One line previewing that this anchor reappears for cookies (Ch013) and CORS (L3).

Reasoning: the concept archetype demands motivation before machinery. The threat scenario is the "concrete problem" the pedagogical guidelines require in every intro, and it makes the policy feel like a gift rather than an obstacle.

`Term` candidates in this section: **client certificate** (one-line: "a cert the browser presents to authenticate the user to a server, attached automatically like a cookie") — only if used; keep it light.

### Origin: scheme, host, and port, all three

Define origin precisely as the tuple **`(scheme, host, port)`** — all three must match exactly. Teach by contrast, one differing component at a time so the student sees each axis independently:

- `https://app.acme.com` vs `https://api.acme.com` — **different origin** (host differs).
- `https://app.acme.com` vs `http://app.acme.com` — **different origin** (scheme differs).
- `https://app.acme.com` vs `https://app.acme.com:8443` — **different origin** (port differs).

Cash the L1 normalization fact here: the default port collapses (`:443` for https, `:80` for http reads as no port), so `https://app.acme.com` and `https://app.acme.com:443` are the *same* origin — but any *non-default* port differs. Name the `URL` object's read-only **`origin`** property as the programmatic way to get this string (one line; L1 introduced the property as anatomy, this lesson gives it meaning). Use a short inline `Code` block showing `new URL('https://app.acme.com:8443/x').origin` evaluating to `'https://app.acme.com:8443'` to make the tuple concrete.

Reasoning: contrast-per-axis is the lowest-cognitive-load way to teach a compound key — the student isolates one variable per example. This directly fuels the comparison table and exercise.

### Site: scheme plus the registrable domain

Define site as **`(scheme, eTLD+1)`** — scheme plus the *registrable domain*, port-agnostic. The student needs the **eTLD** concept to use this, so define it inline without breaking flow: the **effective top-level domain** is the suffix under which anyone can register a domain, read from the **Public Suffix List** (a browser-shipped list). Worked examples, the load-bearing teaching move:

- `app.acme.com` → eTLD is `.com`, so eTLD+1 (the registrable domain) is `acme.com`.
- `project.github.io` → eTLD is `github.io` (it's *on* the Public Suffix List because GitHub lets anyone register a subdomain), so eTLD+1 is `project.github.io`.

The `github.io` example is essential — it shows why "site" can't be computed by "take the last two labels"; the list is authoritative. Then the payoff comparison: `https://app.acme.com` and `https://api.acme.com` are **different origins but the same site** (shared scheme `https`, shared eTLD+1 `acme.com`). State that ports are *not* part of site. One forward-link line: this site boundary — not origin — is what `SameSite=Lax` cookies use, which Chapter 013 leans on heavily.

Note current-spec accuracy for writers: same-site is **schemeful** in 2026 (http and https are *different* sites). Do not teach the legacy "schemeless same-site."

The senior mental anchor, stated as a boxed/emphasized rule: **same-site is permissive (subdomains share), same-origin is strict (subdomains don't share).** Course-name this *the two boundaries*.

Reasoning: site is defined *as the looser cousin of* origin (already taught) — the student extends a known model rather than learning a parallel one, minimizing load. The eTLD inline definition with the `github.io` curveball preempts the "just take the domain" oversimplification beginners reach for.

`Term` candidates: **eTLD** ("effective top-level domain — a suffix under which the public can register names, e.g. `.com`, `.co.uk`, `github.io`"), **Public Suffix List** ("a browser-maintained list of all eTLDs; the authority for where a registrable domain begins"), **registrable domain** ("eTLD+1 — the shortest domain a single owner can register; the unit a 'site' is keyed on"). These are non-obvious terms central to the lesson; ideal `Term` use.

### Classify any pair: same origin, same site

The chapter's center-of-gravity visual. A markdown `Table` (native MDX table, not a component) with the URL pair in the left column and two judgment columns: **Same origin?** and **Same site?**, each a check/cross with a one-word reason. Six rows spanning every axis the student just learned. Suggested rows (writer may refine):

| URL pair | Same origin? | Same site? |
| --- | --- | --- |
| `https://app.acme.com` ↔ `https://app.acme.com/dashboard` | yes (path ignored) | yes |
| `https://app.acme.com` ↔ `https://api.acme.com` | no (host) | yes (eTLD+1) |
| `https://app.acme.com` ↔ `http://app.acme.com` | no (scheme) | no (scheme) |
| `https://app.acme.com` ↔ `https://app.acme.com:8443` | no (port) | yes (port ignored) |
| `https://a.github.io` ↔ `https://b.github.io` | no (host) | no (`github.io` is an eTLD) |
| `https://acme.com` ↔ `https://acme.io` | no | no (different eTLD+1) |

The last two rows are the discriminators that separate a student who memorized "subdomains = same site" from one who understands the Public Suffix List. Caption reinforces: *path and query never affect either judgment; only scheme, host, and port matter for origin; only scheme and registrable domain for site.*

Reasoning: the table makes the student *do* the classification before any policy text lands — practicing the reflex while the definitions are fresh. Putting it here (not after the policy) is deliberate: classification is a prerequisite skill for understanding what the policy gates.

### What the policy blocks: the response read, not the request

The conceptual heart. Lead with the boxed sentence to memorize (`Aside type="note"` or emphasized callout): **The browser sends the request and lets the response come back, but it refuses to let the cross-origin page read the response.** Walk the mechanism in prose: the request *does* leave the browser; cookies *are* attached (subject to `SameSite`, deferred to Ch013); the server *does* process it and return a body; *then* the browser checks the response's `Access-Control-Allow-Origin` header (named, not taught — L3 owns it) and decides whether the calling page may read it. If not, the page sees an opaque error and zero bytes of the body.

The Mermaid `flowchart LR` (wrapped in `<Figure>`) is the load-bearing visual here. Lanes/nodes: `evil.com page` → (request, cookie attached) → `bank.acme.com server` → (200 + body) → **browser checkpoint** → branch: *origin allowed* → page reads body / *not allowed* → opaque error, body discarded. The pedagogical goal: make visible that the **interposition happens at the response-read step, after the server already ran** — this is the single fact that dissolves the "GET is protected" misconception. Keep it horizontal and compact (≤800px). Label the checkpoint node clearly so it maps to what the student will later see in a DevTools network waterfall.

Reasoning: a flowchart (Mermaid's strength per the diagram index) showing the request crossing and the response being gated is more memorable than prose. The visual must emphasize *order* — server runs, then browser gates — because temporal misunderstanding is the root of the misconception addressed next.

### It protects the user, not the server

The load-bearing implication, stated plainly: same-origin protects the **confidentiality of the response from the user's perspective** — it stops `evil.com` from *reading* `bank.acme.com/balance` on the user's behalf. It does **not** stop the request, so it does **not** protect the server from *write* side effects. Name the bug class in production stakes: a developer builds `GET /account/delete?id=42`, assumes the same-origin policy guards it, and an attacker embeds `<img src="https://app.acme.com/account/delete?id=42">` on a page the logged-in victim visits — the browser fires the request with the session cookie, the account is deleted, and *no CORS error ever appears* because the attacker never needed to read the response. State the senior rule: **state-changing endpoints use POST/PUT/DELETE/PATCH** and are defended by **`SameSite` cookies and CSRF tokens** — forward-link both (Ch013 for `SameSite`, chapter 081 for CSRF tokens) without teaching them. Use an `Aside type="caution"` for the "GET is not protected" rule so it stands out.

Reasoning: this is the highest-value, most-often-wrong takeaway in the topic. Framing it as a concrete exploit (hidden `<img>` firing a destructive GET) makes the abstract "gates response not request" rule actionable and memorable. It's placed immediately after the mechanism so the implication reads as a direct consequence.

### What the policy always allows

The carve-outs, as a short markdown bullet list (native, one line each — not a component), framed up front with the reframe: **these are navigation and embed permissions, not read permissions; they predate the policy (the embed-everything web) and survive for compatibility.**

- **Top-level navigation** — clicking a cross-origin link or submitting a `<form>` to a cross-origin action. The browser navigates; the new page loads under *that* origin's trust.
- **Embedded subresources** — `<script src>`, `<link rel="stylesheet">`, `<img>`, `<video>`, `<audio>`, `<iframe>`. The resource loads and runs/renders, but the page generally **cannot read its internals**.
- **Rendered media** — CSS, fonts, images paint normally; but JS **cannot read pixel data** from a `<canvas>` tainted by a cross-origin image without CORS (`crossorigin` attribute is the opt-in — name only).
- **Cross-origin form submissions** — `<form action="https://other.com/...">` posts fine. This is exactly the surface CSRF exploits and that `SameSite`/CSRF tokens defend.

Reinforce the "loaded ≠ readable" line right after the list: a cross-origin script *executing* on your page is not the same as your page *reading its source*; an image *rendering* is not your code *reading its bytes*.

Reasoning: a flat list (not a diagram) is right — these are independent facts, not a process. The "embed/navigate not read" framing is the reusable principle that prevents over-trust; stating it before *and* after the list bookends the takeaway.

### Two windows, one narrow doorway

Cross-origin object access between windows. Two pages from different origins *can* hold references to each other (via `window.open` returning a handle, or an `<iframe>`'s `contentWindow`), but the same-origin policy restricts which properties cross. The cross-origin-accessible subset is short — present as a tight list: `postMessage`, `location` (write-only: `location.href =` and `location.replace()` for navigation), `close`, `closed`, `focus`, `blur`, and indexed frame access (`window[0]`). **Everything else throws a `SecurityError`.** Name **`postMessage`** as the load-bearing primitive for deliberate cross-origin window communication — one line, with a one-line forward link that Chapter 014 owns the `message` event model and the *must-validate-`event.origin`* rule. Keep this section short; it's a "you'll meet this later" placement, not a deep dive.

Reasoning: this is breadth the senior needs to recognize (why does reading `otherWindow.document` throw?) but not depth this lesson should carry. A short list plus the `postMessage` pointer is the right weight. It also reinforces the origin-as-trust-boundary theme one more time before the handoff.

### The `Origin` header: how the server learns who's asking

The bridge to L3. When a browser makes a cross-origin request — any CORS-eligible request, and every non-`GET`/`HEAD` request — it automatically attaches an **`Origin: https://app.acme.com`** request header naming the calling page's origin. The server reads it to decide what to return. Two senior facts: (1) the application never sets `Origin` — the browser owns it, and a server can't trust it from a non-browser client (curl can send anything); (2) this header is the question; **CORS is the protocol the server uses to answer it** — the exact handoff to L3. Show a tiny `Code` block of a 3–4 line request preview (request line + `Host` + `Origin`) so the header is concrete. One line clarifying scope: same-origin requests don't carry `Origin` for plain GETs, which is why your own app calling its own backend needs none of this.

Reasoning: ending on the `Origin` header gives the lesson a forward-pointing close and seeds L3's first concept. Per the continuity notes, L1 deliberately deferred naming this header to L2 — this section pays that debt.

### Sort the scenarios (exercise)

Close with a `Buckets` classification exercise — the assessment, matching the chapter outline's plan. Three buckets:

- **Allowed, and the page can read it** — same-origin requests/reads.
- **Sent, but the read is blocked by default (needs CORS)** — cross-origin response reads.
- **Always allowed (navigate or embed, no read)** — the carve-outs.

~12 `Item` scenarios mixing all three, e.g.: "`app.acme.com` page fetches JSON from `app.acme.com/api/me`" (read-allowed), "`app.acme.com` page fetches JSON from `api.other.com`" (blocked/needs CORS), "page embeds an `<img>` from a CDN on another origin" (embed), "page submits a `<form>` to `bank.acme.com`" (navigate/embed), "page reads a web font from another origin" (embed — renders, not read), "page draws a cross-origin image to canvas then calls `getImageData`" (blocked — needs CORS), "user clicks a link to another origin" (navigate), "`app.acme.com` page reads `localStorage`" (same-origin, allowed), etc. Use `instructions` to frame it as "decide what the browser does with each." Provide per-item correctness via the `bucket` prop.

Reasoning: `Buckets` is the right tool — the core skill is classification, and drag-to-bucket forces a commit on every item. It exercises both the origin/site axis and the block-vs-allow distinction in one drill. No sandbox (nothing to run); no `Matching` (that's L3's error-message drill). A two- or three-bucket sort is the canonical concept-lesson check.

Optional `ExternalResource` (not `VideoCallout` unless a tight ≤8-min explainer is found): MDN "Same-origin policy" page as a deepening link. A YouTube embed is *optional* and only earns inclusion if it crisply visualizes the request-flies/read-gated mechanism; the flowchart likely suffices, so default to no video to respect the 30–40 min budget.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- From L1: `new URL()` parses a URL into fields and normalizes (lowercases host, drops default ports); the read-only `origin` property exists. Restate only the normalization fact, as the reason origin comparisons are reliable.
- HTTP request/response and headers exist (Ch011) — assumed, used without re-explaining the envelope.
- Cookies attach to requests automatically — state as a fact for the threat scenario; the *attribute model* is Ch013's.

**This lesson does NOT cover (hard exclusions):**
- **CORS headers, preflight, simple-vs-preflighted, `Access-Control-Allow-*`** — L3 owns the entire opt-in protocol. This lesson *names* `Access-Control-Allow-Origin` only as "the header the browser checks" and the `Origin` request header as the handoff; it teaches neither's mechanics.
- **Cookie attributes** — `SameSite`, `Secure`, `HttpOnly`, `__Host-`, `Partitioned` — Chapter 013. Name `SameSite` only at the site-boundary forward link; show no attribute syntax.
- **CSRF token patterns / double-submit cookies** — chapter 081. Named only as "the real defense for writes."
- **`fetch` body, methods, `mode`, `credentials`, `AbortSignal`** — Ch015 and L3. This lesson does not show a `fetch` call.
- **`Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, CSP** — Unit 16's security-header baseline. Do **not** introduce COOP/COEP here even though the site is cross-origin isolated; out of scope for this concept lesson.
- **`postMessage` event handler shape and `event.origin` validation** — Chapter 014. Name `postMessage` and the must-validate rule in one line only.
- **Site isolation / process-per-site renderer internals** — out of scope; the student reasons about *origin* for confidentiality and never writes code depending on process boundaries. (The chapter outline floated a "2026 site-isolation reality" paragraph; cut it — it's browser-internals trivia that doesn't change what the student builds, and it risks muddying the origin-as-trust-unit anchor. Mention process isolation in at most one sentence, if at all.)
- **`iframe` sandbox flags** — out of scope on this stack.
- **History of XHR before CORS** — no historical detour (course thesis).

---

## Notes for downstream agents

- **Deliberate divergences from code conventions:** illustrative URLs and the `Origin`-header preview are bare strings/snippets, not wrapped in functions or components — this matches L1's established "bare expression as pedagogical staging" convention (per continuity notes). Note it so the convention stays consistent across the chapter.
- **No new lesson-specific component needed.** `Table` (markdown), one Mermaid `flowchart`, bullet lists, two `Aside`s, several `Term`s, and one `Buckets` exercise cover the lesson. Do not over-build.
- **Tone:** adult, terse, no bootcamp scaffolding, no celebratory tone (pedagogical guidelines). Assume competence.
- **Keep the boxed sentence verbatim and reuse the exact phrasing** ("sends the request… refuses to let the cross-origin page read the response") in the flowchart caption and the exercise framing so the anchor repeats.
