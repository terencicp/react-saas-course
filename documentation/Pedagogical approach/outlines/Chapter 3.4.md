# Chapter 3.4 — Cookies and the trust model

## Concept 1 — Cookies as ambient credentials

**Why it's hard.** Students model cookies as "data the app reads," not as state the browser attaches to every matching request without the app's knowledge. Without the ambient-credential mental model, every `Set-Cookie` attribute reads as arbitrary configuration instead of as a constraint on automatic transmission, and the CSRF story later in the lesson lands as trivia.

**Ideal teaching artifact.** A two-frame *threat-scenario comic* placed at the very top of the lesson, before any attribute is named. Frame one: the user clicks a magic-link `<a href>` from their inbox to `app.acme.com`, the browser walks its cookie jar, matches `__Host-sid`, attaches it; the user is logged in. Frame two: the user visits `evil.example` in another tab, the page silently fires a `<form method="POST" action="https://app.acme.com/transfer">`, the browser walks the *same* cookie jar, attaches the *same* cookie, and the server sees an authenticated request the user never authored. Both frames show the cookie jar, the request line, and the `Cookie:` header explicitly. The point isn't "CSRF is bad" — the point is that the *same* automatic-attach behavior is the feature in frame one and the threat in frame two, and that nothing in the application code distinguishes them. This is a Concept artifact; it installs the lens through which every attribute that follows reads as a constraint on which frame-two-shaped requests get the cookie.

**Engagement.** Immediately after the comic, a `MultipleChoice` question: "Which of the following blocks frame two without breaking frame one?" with four options spanning `SameSite=Strict`, `SameSite=Lax`, `HttpOnly`, and "drop the cookie." Two correct answers (`SameSite=Lax` and the implied state-changing-method discipline) flip it to multi-select; the wrong answers each map to a misconception the rest of the lesson will dismantle.

**Components.**
- Primary: hand-SVG two-frame comic inside `Figure`, with the cookie jar, request line, and `Cookie:` header drawn explicitly. The cookie jar reappears in concepts 3 and 4, so the visual vocabulary compounds within the chapter.
- Assessment: `MultipleChoice` with multi-select enabled by the two correct answers.

---

## Concept 2 — The senior default line as a memorized artifact

**Why it's hard.** The lesson hinges on one line — `Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` — that the student must paste from memory for the rest of the course. Static prose lists eight attributes; recall a week later is poor. The teaching problem is committing the line to muscle memory *and* keying each token to the failure mode it prevents, so the student can defend each attribute under code review.

**Ideal teaching artifact.** A *clickable-token reveal* of the senior default line, rendered as a single `Set-Cookie` header where every attribute is a clickable token. Clicking `__Host-` opens "blocks subdomain attackers planting a cookie the parent reads." Clicking `HttpOnly` opens "cuts the XSS exfiltration path." Clicking `SameSite=Lax` opens "blocks cross-site state-changing requests; preserves magic-link top-level navigation." And so on. The student plays with the line, hears each attribute's job in its own voice, and walks away with the line as a single chunked memory keyed to seven failure modes. This is a hybrid Reference/Decision archetype — the artifact *is* the senior default, and the interaction *is* the survey.

**Engagement.** After the click-through, a `Tokens` exercise on a *different* `Set-Cookie` header presented without commentary: the student clicks each attribute to confirm they can read the line cold. A second pass uses a deliberately broken header (missing `Secure`, `SameSite=None` without `Secure`, `Domain` paired with `__Host-`) and asks the student to click the attribute that's wrong — the recall test for both pattern *and* anti-pattern recognition.

**Components.**
- Primary: `Tokens` — the existing exercise component is the exact fit. The "click each attribute" mechanic *is* the teaching move. One `Tokens` block for the canonical line, a second `Tokens` block for the broken-header recall.
- Supporting: short prose intro framing the line as the artifact to memorize.

---

## Concept 3 — `SameSite` and the cross-site request matrix

**Why it's hard.** `SameSite` is the chapter's load-bearing attribute and the one students misread most. The trap: assuming `Lax` means "any same-site request" or "any GET request," missing the precise rule that *top-level safe-method navigations from a third party* still attach the cookie while *cross-site POSTs, iframe loads, and `fetch` calls* don't. Without seeing the matrix of (request shape × `SameSite` value) explicitly, the student can't predict what their session cookie will do under a magic-link click vs. a CSRF POST vs. an embedded iframe.

**Ideal teaching artifact.** An *interactive cookie-attachment matrix* — a 4×3 grid where rows are request shapes (same-site fetch, cross-site top-level navigation, cross-site POST, cross-site iframe/fetch) and columns are `SameSite` values (`Strict`, `Lax`, `None`). Each cell shows "attached" or "blocked" with a tiny `Cookie:` header glyph. Hovering or tapping a cell expands a one-line explanation tying it to a real scenario ("user clicks magic link from Gmail," "malicious page POSTs to `/transfer`," "payment widget on third-party checkout"). The matrix is the entire teaching artifact for `SameSite`; the student leaves having seen every combination and the senior-default cell (`Lax` × cross-site top-level nav = attached; `Lax` × cross-site POST = blocked) highlighted as the CSRF-defense logic. Concept archetype.

**Engagement.** A `PredictOutput`-shaped drill after the matrix: three concrete scenarios stated in plain prose ("user clicks `<a href>` from their inbox," "malicious page fires `<form method=POST>` to your transfer endpoint," "your own page makes a same-site `fetch`"), each with a `SameSite` value attached, and the student predicts attached/blocked before the matrix-derived answer is revealed.

**Components.**
- Primary: a new component, `CookieAttachmentMatrix`, taking a row list (request shapes), a column list (`SameSite` values), a cell map (`attached`/`blocked`/`secure-required`), and per-cell tooltip prose. Renders as a grid with hover/tap reveals. This component compounds — Chapter 9.x (sessions) and Chapter 17.2 (CSRF baseline) reach for the same matrix.
- Alternative if not built: three side-by-side `TabbedContent` panels (`Strict`/`Lax`/`None`), each containing a static table of the four request shapes against attached/blocked. Loses the matrix's at-a-glance comparison but is buildable today.
- Recall: a `Sequence` or `MultipleChoice` for the prediction drill — `MultipleChoice` per scenario keeps the cognitive load tight.

---

## Concept 4 — The scope triangle: `__Host-`, `Domain`, `Path`

**Why it's hard.** Three attributes collude to define where the cookie lives. The misconceptions are dense: `Path` looks like a security boundary but isn't; `Domain` looks like a scoping convenience but leaks to every subdomain; `__Host-` looks like a name prefix but is a browser-enforced contract on the other two. The senior rule (omit `Domain`, use `Path=/`, prefix with `__Host-` for new code) only sticks once the student has seen what happens when a subdomain attacker tries to plant a cookie the parent domain reads.

**Ideal teaching artifact.** A *subdomain-attack reenactment* — three side-by-side `Set-Cookie` write attempts from `evil.acme.com`, each followed by the browser's verdict and what `app.acme.com` ends up seeing on its next request. Attempt one: `Set-Cookie: sid=stolen; Path=/` (no `Domain`, no prefix) — accepted, but host-locked to `evil.acme.com`; `app.acme.com` doesn't see it. Attempt two: `Set-Cookie: sid=stolen; Domain=acme.com; Path=/` — accepted, attached to `app.acme.com`'s next request; the attack lands. Attempt three: `Set-Cookie: __Host-sid=stolen; Domain=acme.com; Path=/` — rejected by the browser because `__Host-` forbids `Domain`. The student sees three writes, three verdicts, three downstream reads, and understands `__Host-` as a contract the browser enforces *for* the parent domain. Concept/Decision hybrid — the artifact ends with the senior rule restated.

**Engagement.** A `Buckets` sort: ten `Set-Cookie` headers, three buckets (`host-only`, `shared across subdomains`, `rejected by the browser`). The student classifies each. Misclassifications surface the lingering confusion (e.g. `__Host-` with `Domain`, `__Secure-` with `Path=/admin`, plain cookie with no `Domain`).

**Components.**
- Primary: a hand-SVG three-column `Figure` showing the three attempts, browser verdict (green check / red X), and the resulting `Cookie:` header on `app.acme.com`'s next request. Single-use within this chapter; no clear forward-link beyond Chapter 9.x referencing it back. Hand-SVG inside `Figure` is the right scope.
- Recall: `Buckets` with three columns.

---

## Concept 5 — `Partitioned` (CHIPS) and the 2026 third-party-cookie reality

**Why it's hard.** Two things have to land simultaneously: the mechanical model of partition keys (a `Partitioned` cookie is keyed by `(cookie-origin, top-level-site)`, so the same widget on `news.com` and `blog.com` sees two separate jars) and the 2026 cross-browser reality (Safari and Firefox have blocked unpartitioned third-party cookies for years; Chrome retreated from forced deprecation but `Partitioned` is the only mechanism that works everywhere). The student needs the mechanical model to know what `Partitioned` does, and the reality to know when to reach for it (legitimate cross-site embed) versus when the answer is "don't use a cookie."

**Ideal teaching artifact.** Two-beat artifact. *Beat one:* a two-jar diagram showing the same widget (`widget.acme.com`) embedded on two different top-level sites (`news.com` and `blog.com`), with `Partitioned` on and off side by side. With `Partitioned` off: one shared jar, the user is recognized across both sites (the tracking surface). With `Partitioned` on: two separate jars keyed by the embedding site, no cross-site identity possible. The diagram makes the partition key visible as a tuple. *Beat two:* a small Mermaid `flowchart` decision tree — "Cross-site embed?" → "Need a cookie?" → "Reach for `__Host-...; Secure; SameSite=None; Partitioned`" with the alternative branch ("don't need cross-site state? use postMessage / first-party redirect"). Concept + Decision archetype.

**Engagement.** A `TrueFalse` round of four statements covering the load-bearing claims: "Safari blocks unpartitioned third-party cookies by default," "`Partitioned` requires `SameSite=None` and `Secure`," "Two top-level sites embedding the same widget share a `Partitioned` cookie jar" (false — the key separates them), "Analytics tracking is the canonical use case for `Partitioned`" (false — CHIPS is for legitimate cross-site session state, not tracking).

**Components.**
- Primary: hand-SVG two-jar diagram inside `Figure`, plus a Mermaid `flowchart` for the decision tree. Both buildable today; the diagram is single-use but the decision tree is a recurring shape across the course.
- Recall: `TrueFalse`.

---

## Concept 6 — The Next.js `cookies()` write boundary

**Why it's hard.** Three distinct rules apply at once: `cookies()` is async in the App Router (so `await` is mandatory), reading works in Server Components but writing throws there, and a cookie set on request N only lands on request N+1 (the round-trip rule). Students drop one of the three and ship code that either throws at render time or sets a cookie they expect to read in the same request cycle. Pattern archetype — the lesson is the call-site shape, named for what it prevents.

**Ideal teaching artifact.** A *context grid* — four rows (Server Component, Server Action, Route Handler, Client Component) crossed with two columns (read, write) — with each cell showing the canonical call site or the failure mode. Cells that work get a short snippet; cells that throw get the error message. The grid sits next to a small Mermaid `sequenceDiagram` showing the round-trip: request N reaches the server, Server Action calls `cookies().set`, response writes the `Set-Cookie` header, the browser stores it, request N+1 sends it back. The two artifacts together cover both the "where can I call it" question and the "when does the value become visible" question, which are the two mistakes the student is most likely to make.

**Engagement.** A `Tokens` exercise on a single multi-file snippet (one Server Component, one Server Action) where every `cookies()` call site is a token: the student clicks the call that would throw at render time. Followed by one `MultipleChoice`: "A Server Action calls `cookies().set('sid', '...')` then immediately calls `cookies().get('sid')`. What does `get` return?" with the correct answer being "undefined / the previous value — the new cookie lands on the next request."

**Components.**
- Primary: a small 4×2 table rendered inline (Markdown table is sufficient — the grid is short and static), plus a Mermaid `sequenceDiagram` for the round trip. No new component needed.
- Recall: `Tokens` on the multi-file snippet, plus one `MultipleChoice` on the round-trip rule.

---

## Component proposals

**`CookieAttachmentMatrix`** — an interactive grid of (request shape × `SameSite` value) cells, each cell showing attached/blocked with a tooltip tying it to a concrete scenario. Inputs: row labels (request shapes), column labels (`SameSite` values, optionally `Partitioned` as a flag), a cell map with `attached`/`blocked`/`secure-required`/`partitioned-required` states, per-cell tooltip prose, and an optional highlighted cell for the senior-default callout.
- **Uses in this chapter:** Concept 3.
- **Forward-links:** Chapter 9.x (sessions and the cookie-bearing flow), Chapter 17.2 (CSRF baseline) — the matrix is the reference artifact those chapters will gesture back to.
- **Leanest v1:** a static-rendered grid (Astro template, no client JS) where every cell shows the verdict and the tooltip is just `title=` on hover. No animation, no scenario picker, no "highlight the senior default" affordance. Still passes the teaching bar because the cause-and-effect lives in the grid itself, not in the interaction. The full proposal (tap-to-expand cells, scenario examples, senior-default highlight) is a v2 if the matrix proves to compound.

## Build priority

`CookieAttachmentMatrix` is the only new component proposed, and it carries the heaviest single teaching load in the chapter (the `SameSite` matrix is the lesson's center of gravity). Forward-links into Unit 9 and Chapter 17.2 make it the clear build priority. Ship the leanest v1 — a static grid with hover tooltips — before the chapter lands; expand to interactive cell reveals only if the forward chapters confirm the reuse.

## Open pedagogical questions

- Concept 1's two-frame comic carries a lot of conceptual weight in static SVG. If the comic reads as too dense without animation, the fallback is splitting it into a `DiagramSequence` with frame one and frame two as separate slides — heavier component, lighter cognitive load per frame.
- The `cookies()` round-trip rule (concept 6) borders on a Chapter 5 / Unit 7 concern. The chapter outline says this lesson states the constraint and moves on; the open question is whether the round-trip `sequenceDiagram` belongs here or in Unit 5's request-lifecycle chapter with a backreference from here.
