## Concept 1 — The URL is a parsed value, not a template

**Why it's hard.** Students have spent years building URLs with template strings, and the bug class hides — it only fires when a user types `&`, `+`, `?`, a Unicode character, or a trailing slash mismatch hits a base URL. The senior reflex is to delegate parsing to the runtime; the misconception is that "URL" and "string" are the same type.

**Ideal teaching artifact.** Concept archetype with a live parser dissection. The student sees a single URL string on the page — `https://api.acme.com:8443/v1/invoices?status=paid&limit=20#row-7` — and an annotated SVG fanning out from it to six labeled fields (`origin`, `protocol`, `host`/`hostname`/`port`, `pathname`, `search`, `hash`). Beside it sits a tiny parser playground: an input box where the student types or pastes a URL, and a side panel shows every `URL`-instance property updating live. The student then runs three predictions ("what does `new URL('/v1', 'https://api.acme.com/')` produce? What about with a trailing slash on the base? What about `new URL('/path')` with no base?") and sees the answer including the throw. This is the moment the parser stops being abstract.

**Engagement.** A `PredictOutput` round on three `new URL()` constructor calls — one valid, one relative-without-base (throws), one trailing-slash variant — locks the throw-on-invalid behavior and the base-resolution rule before the next concept.

**Components.**
- Hand-authored SVG (anatomy diagram with arrows to each property) inside `Figure` — load-bearing layout, single static visual.
- A new `URLPlayground` widget (input box + live property table for every `URL` instance field). Embedded inline; this is the artifact's interaction half.
- `PredictOutput` for the three-call assessment.

---

## Concept 2 — `URLSearchParams` retires manual query-string construction

**Why it's hard.** The four construction shapes (`string`, record, entries, `url.searchParams`) feel redundant until the student needs `getAll` on a repeated key or hits a `+` sign in user input. The trap is reaching for `encodeURIComponent` + manual `&` joining and getting it 80% right.

**Ideal teaching artifact.** Mechanics archetype with a wrong-by-default repair sandbox. Open with a short broken snippet that builds a query from a record using template-string concatenation, then run it against three inputs that progressively break it (`'a+b'`, `'a&admin=true'`, `['x','y']` for a multi-value tag). The student watches the output corrupt each time, then rewrites the same builder with `URLSearchParams` in a tested `ScriptCoding` cell where the test cases are the same three inputs. The senior reach lands because the student has just felt the bug class fire three times.

**Engagement.** The `ScriptCoding` test suite is the assessment — the student must pass all three inputs (including the `getAll` case for repeated keys) before moving on.

**Components.**
- `CodeVariants` for the broken-builder vs. `URLSearchParams` reach.
- `ScriptCoding` for the wrong-by-default repair exercise.

---

## Concept 3 — The `%20`-vs-`+` split, and the round-trip rule

**Why it's hard.** Two valid percent-encode sets exist for two URL positions, and the bugs only surface when encode and decode use *different* models. Students who already know `encodeURIComponent` are the most likely to write the bug, because they decode with `URLSearchParams` and the `+` silently becomes a space.

**Ideal teaching artifact.** Misconception-first ambush. Open with one short paragraph framing the problem, then a side-by-side widget: left pane encodes a sample value (`'a+b c'`) with `encodeURIComponent`, right pane encodes it with `URLSearchParams.toString()`. Underneath each, a "decode with…" toggle lets the student pick the decoder — and a status row labels each combination as round-trip-clean or corrupted. Four cells; two pass, two fail. The senior rule (*encode and decode with the same model*) is what the widget makes the student discover, not what the prose tells them.

**Engagement.** A three-row decision table (`encodeURI` / `encodeURIComponent` / `URLSearchParams`) presented as a `Matching` exercise — six URL positions (path segment, query value, full URL, fragment, etc.) matched to the correct tool — confirms the recall after the widget.

**Components.**
- Primary: hand-authored static `Figure` with a 2×2 table of the four encode/decode combinations rendered as labeled code spans (input → encoded → decoded → pass/fail). Single-use within this chapter; the load-bearing teaching is the visual itself, not the interactivity.
- Alternative if interaction proves load-bearing: a new `EncodingMatrix` widget with two encoder pickers and a live status row.
- `Matching` for the decoder-decision assessment.

---

## Concept 4 — Origin vs. site — the two-boundary classifier

**Why it's hard.** Origin and site sound interchangeable until cookies and `SameSite` land in 3.4. The eTLD+1 rule, the role of the Public Suffix List, and the port-isn't-part-of-site detail are all minor on paper but compound into wrong mental models if not drilled now.

**Ideal teaching artifact.** Concept archetype with a guided classifier. After a short prose definition of each boundary, the student sees a URL-pair sorter: ten pairs of URLs (varying scheme, subdomain, port, TLD shape, including a `project.github.io` case that exposes the Public Suffix List rule). For each pair, the student picks two checkboxes — *same origin?* / *same site?* — and gets immediate feedback. The reps drill the five-second classification reflex the chapter explicitly asks for. A small reference card on the side shows the (`scheme`, `host`, `port`) and (`scheme`, `eTLD+1`) tuples per pair, populated on click so the student sees what changed between the two URLs.

**Engagement.** The classifier itself is the assessment — ten reps with feedback. A short follow-up `MultipleChoice` ("which pair is same-site but cross-origin?") confirms the asymmetric case where students fail most often.

**Components.**
- Primary: a new `OriginSiteClassifier` widget — list of URL pairs, two checkboxes per row, immediate feedback, optional tuple breakdown. This recurs in 3.4 (cookie scope) and Unit 17 (security baseline).
- `MultipleChoice` for the follow-up confirmation.

---

## Concept 5 — Same-origin gates the *response*, not the request — and protects the user, not the server

**Why it's hard.** The mental model students arrive with is "the browser blocks cross-origin calls." That's wrong in a way that produces real production bugs — a state-changing GET endpoint "protected" by SOP, a missing CSRF token, a server-side write that fired before the browser blocked the read. The teaching has to overwrite the model, not patch it.

**Ideal teaching artifact.** Code-cartoon-style scrollytelling sequence with anthropomorphic actors. Three lanes (page A, browser, server B) with a request token moving along the page → browser → server path. The student scrubs through five frames: (1) page A says "fetch B"; (2) browser attaches B's cookies and sends; (3) server B processes the request and produces side effects; (4) response returns to the browser; (5) browser interposes, checks `Access-Control-Allow-Origin`, refuses the read, page A sees an opaque error. The frame-3 "side effects fired" beat is the load-bearing one — the student watches the write happen before the browser blocks the read. A caption on each frame names what just happened in one sentence.

A second, smaller diagram beside it lists what the policy *always allows* (top-level navigation, `<img>`/`<script>`/`<iframe>` embeds, cross-origin form submissions) with one line per carve-out — anchored to the "embed-everything web predates the policy" framing so the carve-outs feel like history, not exceptions.

**Engagement.** A `Buckets` exercise with twelve scenarios sorted into three lanes ("allowed by default — read response," "blocked by default — needs CORS," "always allowed — navigation/embed/form submit") confirms the carve-out vocabulary and the response-vs-request distinction.

**Components.**
- Primary: `DiagramSequence` with five hand-authored SVG frames showing the request, the side effect, the response, and the browser-interposes beat. Reusable for any "the browser sits between" teaching (CORS preflight in concept 6, cookie attribute decisions in 3.4).
- Static `Figure` with a small SVG listing the three carve-outs.
- `Buckets` for the twelve-scenario sort.

---

## Concept 6 — Simple vs. preflighted: the working reality is "JSON preflights"

**Why it's hard.** The simple-request criteria are a three-clause definition with edge cases (the `Content-Type` safelist, the safelisted-header set). Students memorize the rules and miss the punchline: the moment your app sends `Content-Type: application/json`, you're preflighting. The mechanics also play out over time — `OPTIONS` first, response, real request — and a static diagram loses the temporal beat.

**Ideal teaching artifact.** Mechanics archetype with a decision predictor + sequence visualization. First half: a small "will this preflight?" predictor — the student picks a method, a content-type, and a header set from three dropdowns, and the widget tells them yes/no with the failing criterion named. Five preset scenarios run as quick reps. Second half: a Mermaid `sequenceDiagram` showing `OPTIONS → Access-Control-Allow-* → real request → response`, with each lane labeled so the student can point at it in a DevTools waterfall. The two halves answer separate questions — *will it preflight?* and *what does the preflight look like?* — and the lesson needs both beats.

**Engagement.** A `PredictOutput`-style round on three real `fetch` snippets ("does this preflight? if yes, why?") where the third snippet has `Content-Type: application/json` and the student must say yes and name the reason.

**Components.**
- A new `PreflightPredictor` widget (three dropdowns, live yes/no answer with failing-criterion label). Recurs implicitly in 3.6 (fetch).
- Mermaid `sequenceDiagram` for the preflight lanes.
- `PredictOutput` (or a small custom prediction component if the format needs the "name the reason" follow-up) for the assessment.

---

## Concept 7 — The four production CORS headers and the wildcard-with-credentials trap

**Why it's hard.** The four `Access-Control-Allow-*` headers each prevent a different failure mode, and the wildcard-with-credentials interaction is non-obvious — `*` works *except* when credentials are involved, and the fix (echo origin + `Vary: Origin`) is a two-step that students reliably get half-right.

**Ideal teaching artifact.** Pattern archetype with a CORS-server simulator. The student sees a tiny mock server config (allow-list of origins, allowed methods, allowed headers, credentials toggle) and a mock client config (target URL, method, content-type, `credentials: 'include'` checkbox). On "send," the widget shows the request, the preflight (if triggered), the server's response headers, and a verdict: *response readable* / *blocked, here's why*. Five preset failure modes are linked beside it — *forgot Allow-Origin*, *forgot Allow-Headers for content-type*, *wildcard with credentials*, *missing Vary: Origin with caching*, *OPTIONS returned 500* — and clicking each loads the broken config so the student can see the verdict, then fix it in the config and watch the verdict flip.

The simulator carries the teaching; a follow-on `Table` keyed on the four production headers (purpose / failure mode without it / example value) is the reference card the student keeps after.

**Engagement.** The five preset broken-config repairs *are* the assessment — each one forces the student to read the verdict, identify the missing or wrong header, and fix it. A small `Tokens` exercise on a finished Next.js Route Handler snippet (click the four production headers + `Vary: Origin`) confirms the recall on the canonical handler shape.

**Components.**
- Primary: a new `CorsSimulator` widget — server config + client config + verdict + preset broken scenarios. This is the chapter's heaviest new component but the load-bearing one; it forward-links to 3.4 (cookie attributes interacting with cross-origin requests), Unit 5 middleware, and Unit 17 security baseline.
- `Table` for the four-header reference card.
- `Tokens` for the Route Handler recall.

---

## Concept 8 — Reading CORS errors as a diagnostic skill

**Why it's hard.** The four canonical browser error messages each correspond to a specific server-side fix, and in production the error wording *is* the diagnostic. Students who can't parse the message ship configurations that "kind of work in dev" because they don't read the failure mode from the failure text.

**Ideal teaching artifact.** Reference-archetype with a paired drill. Present the four canonical browser error messages verbatim (these are the strings the student will literally see in DevTools) alongside four fixes — *server didn't return Allow-Origin*, *wildcard with credentials*, *OPTIONS handler returned non-2xx*, *Allow-Headers missing the requested header*. The student does a `Matching` exercise to pair message to fix. Two of the messages contain the wildcard-with-credentials wording and the OPTIONS-status wording — both load-bearing because they're the two most-common production bugs.

**Engagement.** The `Matching` exercise is the assessment. A short follow-up: one `CodeReview`-style snippet of a real Route Handler with the wildcard-credentials bug, where the student leaves an inline comment naming the fix.

**Components.**
- `Matching` for the message-to-fix drill.
- `CodeReview` for the follow-up snippet diagnosis.

---

## Component proposals

- **`URLPlayground`** — input box for a URL string, side panel listing every parsed property (`origin`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, `searchParams.toString()`) updating live, with `URL.canParse` boolean and a throw indicator.
  - Uses in this chapter: Concept 1.
  - Forward-links: 3.6 (fetch URL construction), Unit 5 (Next.js routing and `searchParams`), Unit 11.3.3 (`nuqs` URL state).
  - Leanest v1: input box + read-only `<pre>` block showing the parsed properties as JSON, no error styling beyond a red border on throw. The teaching survives without polish.

- **`OriginSiteClassifier`** — list of URL pairs, two checkboxes per row (same origin? / same site?), immediate feedback, optional click-to-reveal tuple breakdown (`scheme`/`host`/`port` vs. `scheme`/`eTLD+1`).
  - Uses in this chapter: Concept 4.
  - Forward-links: Chapter 3.4 (`SameSite` cookie scope), Chapter 3.5 (`postMessage` origin validation), Unit 17 (CSRF and security baseline).
  - Leanest v1: hard-coded pairs in markup, two checkboxes per row, green/red after submit, no tuple breakdown. Tuple breakdown can ship in v2.

- **`PreflightPredictor`** — three dropdowns (method / content-type / extra headers from a short list), live yes/no on whether the request preflights, and a one-line "fails simple-request criterion: …" label when yes.
  - Uses in this chapter: Concept 6.
  - Forward-links: Chapter 3.6 (`fetch` request shape).
  - Leanest v1: three native `<select>`s, a static decision table in code (method × content-type × headers), one-line label. No animation, no waterfall preview.

- **`CorsSimulator`** — server-config form (allow-list, methods, headers, credentials) + client-config form (URL, method, content-type, `credentials: 'include'`) + verdict panel showing the request/response/preflight and the readable/blocked outcome with a reason. Five preset broken scenarios as buttons.
  - Uses in this chapter: Concept 7.
  - Forward-links: Chapter 3.4 (cookie attributes × cross-origin), Unit 5 middleware (route-level CORS), Unit 17 (security baseline review).
  - Leanest v1: two form panels, one verdict line ("response readable" / "blocked: <reason>"), three preset broken scenarios instead of five, no rendered request/response bodies. The teaching is the verdict and the reason — the visualized request/response is reach.

## Build priority

`CorsSimulator` is the highest-priority build. It carries Concept 7 (the chapter's heaviest mechanics lesson), is the artifact for the chapter's largest single misconception (the wildcard-with-credentials trap), and forward-links into three later chapters where CORS-shaped configuration recurs. Without it the lesson falls back to a static header table that under-teaches the trap.

`OriginSiteClassifier` is second. It carries Concept 4 and forward-links cleanly into 3.4 (`SameSite` is the cookie-side use of the same classifier), and the five-second classification reflex the chapter asks for is drill-shaped and unbuilt today. The leanest v1 is genuinely cheap.

`URLPlayground` and `PreflightPredictor` are third tier. Each carries one concept with a credible but narrower forward-link, and the static fallbacks (anatomy SVG, decision table) carry meaningful teaching weight on their own.

## Open pedagogical questions

- Concept 3's encode/decode matrix is on the line between static-figure and bespoke-widget. If the chapter ends up shipping `CorsSimulator` and `OriginSiteClassifier`, the matrix should stay static to keep new-component count down; if the author has bandwidth, a tiny `EncodingMatrix` widget would land the round-trip rule harder.
- Concept 6's `PreflightPredictor` overlaps in spirit with `CorsSimulator` — there's a credible alternative path where one combined widget covers both concepts. Splitting them keeps each concept's assessment clean; combining them risks a single widget that's harder to land in one beat.
