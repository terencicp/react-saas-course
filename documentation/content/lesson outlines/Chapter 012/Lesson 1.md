# Lesson 1 — Parse, don't concatenate

- **Title (h1):** Parse, don't concatenate
- **Sidebar label:** Parse, don't concatenate

---

## Lesson framing

**Archetype:** Mechanics. The student already writes template-literal interpolation (Ch001 L5 installed backticks as the default for strings); this lesson is the first place that default is *wrong* and gets retired for one specific job — building URLs. That tension is the hook: "you learned `` `${base}/users?id=${id}` `` as the clean way to interpolate. For URLs, it's a bug factory." Lead with the decision, not the API.

**The one mental model to install:** *a URL is a structured value with a parser inside it, not a string.* Every senior URL operation is "hand the string to the parser (`new URL`), manipulate the structured fields (`url.searchParams`), read the string back out (`url.href` / `params.toString()`)." The student should leave reaching for `new URL()` + `URLSearchParams` reflexively and never hand-escaping a query value again. This vocabulary (`origin`, `pathname`, `search`, `searchParams`) is load-bearing for the rest of the chapter (L2 leans on `origin`, the `Origin` header bridges to L3) and for Units 3–7 where every API URL gets assembled.

**Where beginners struggle / what this relieves:** the pain points are invisible until they bite — a `+` in a search term silently becomes a space, a user types `a&admin=true` and injects a query param, a trailing-slash mismatch produces two different URLs, a Unicode hostname breaks. The lesson should make each pain *concrete and named* before showing the parser fixing it, so the student feels the relief rather than memorizing an API. The `%20`-vs-`+` split is the single highest-value, most-surprising idea — budget the most care there; it's the one experienced devs get wrong too.

**Why not the alternatives:** the lesson must justify *why* the parser beats concatenation (correctness, encoding, normalization handled for free) and place `encodeURI` / `encodeURIComponent` / `URLSearchParams` so the student knows which tool fits which position — most people reach for `encodeURIComponent` everywhere and double-encode. A 3-row decision table settles it.

**Cognitive-load staging:** (1) the problem with concatenation → (2) the URL anatomy (one annotated diagram, names only) → (3) `new URL()` constructor → (4) `URLSearchParams` → (5) the encoding split (the hard part, isolated) → (6) the decision table → (7) the bug-class roundup as payoff → (8) runtime/Next context as a short forward link. Each section adds one idea. Keep prose terse and adult (no "what is a string"); the student is competent, just new to this corner.

**Code conventions in play:** single quotes; backticks only when interpolating (this lesson actively demonstrates *retiring* backtick interpolation for URLs); `const` arrow bindings; `URL`/`URLSearchParams` are globals → **no imports** (call this out, it's a genuine relief). The `new URL('/v1/invoices', baseFromEnv)` pattern aligns with the env-derived-base convention. Deliberate divergence: illustrative snippets are bare expressions, not wrapped in functions/components — note this is pedagogical staging, not production shape.

**Estimated time:** 35–45 min.

---

## Lesson sections

### Introduction (no header)

Two short paragraphs, warm and brief.

- Para 1 — the senior reframe. Open on the familiar template literal `` `${base}/users?id=${id}` `` and assert it looks clean and is a latent bug. Name the thesis: **URLs look like strings and aren't.** Every URL has a parser inside it (the WHATWG URL standard); the senior move is to *use that parser* instead of treating the URL as a fill-in-the-blank template. Frame the payoff in production stakes: this is the reflex behind every API URL the student assembles in Units 3–7.
- Para 2 — preview the practical skill. By the end: parse any URL into its fields, build one with `new URL()` + `URLSearchParams` with zero escaping bugs, and know which of the three encoding tools fits which position. One line connecting forward: the `origin` field this lesson names becomes the unit of browser trust in the next lesson.

<Term> candidates in the intro: **WHATWG** (def: "Web Hypertext Application Technology Working Group — the body that maintains the living URL, HTML, and Fetch standards browsers actually implement"). Use once.

### A URL is six fields, not one string

Goal: install the anatomy and the vocabulary in one pass. This is the load-bearing visual of the lesson.

- **The annotated anatomy diagram.** Hand-coded SVG inside `<Figure>` (per diagrams INDEX: "picture of a specific thing" → SVG; this is a labeled artifact, not a graph). Single example URL: `https://api.acme.com:8443/v1/invoices?status=paid&limit=20#row-7`. Draw the URL as a horizontal monospace string with color-coded segment underlines and leader lines to labels naming each field: `protocol` (`https:`), `host` (`api.acme.com:8443`) decomposing into `hostname` (`api.acme.com`) + `port` (`8443`), `pathname` (`/v1/invoices`), `search` (`?status=paid&limit=20`), `hash` (`#row-7`). Above/beside the whole string, bracket `origin` (`https://api.acme.com:8443`) as the read-only shorthand spanning protocol+host. Follow SVG doc guidance: horizontal flow, tight viewBox (~height ≤ 220 viewBox units), `currentColor` for the URL text, fixed mid-gray (`#9ca3af`) for leader lines, segment colors as quiet accents. Wrap quoted literals in JS expressions (`{'...'}`) to dodge smartypants. Set `expandable` default (SVG survives relocation). Caption: one line naming the WHATWG model.
  - *Pedagogical goal:* one glance maps the whole API surface onto a string the student already recognizes; every later property reference points back here.
- **Prose under the diagram.** One short paragraph naming the fields as `URL`-instance properties. Then two specific points the diagram can't carry:
  - `searchParams` is the **live `URLSearchParams` view** of `search` — mutating it updates `url.search` (and `url.href`). One sentence; it's the hinge to the next section.
  - The `username`/`password` fields **exist and are intentionally ignored** — deprecated for navigation, unsafe to ship credentials in a URL. One sentence, no demo. (Watch-out, lives here because it qualifies the anatomy.)
- A tiny `Code` block (ts) showing the parse-and-read move with inline `// =>` result comments, reinforcing the diagram:
  ```ts
  const url = new URL('https://api.acme.com:8443/v1/invoices?status=paid#row-7');
  url.hostname; // 'api.acme.com'
  url.pathname; // '/v1/invoices'
  url.search;   // '?status=paid'
  url.origin;   // 'https://api.acme.com:8443'
  ```
  Note for writer: bare-expression style is deliberate staging (see framing). Keep ≤ ~8 lines.

### Building URLs with `new URL(input, base)`

Goal: the senior constructor and the fail-fast posture.

- **The two-argument form** resolves a relative path against a base. Canonical pattern: `new URL('/v1/invoices', 'https://api.acme.com')` — assembling an API URL from an env-derived base. Show with a small `Code` block. Tie to the convention: the base usually comes from a validated env var (forward-nod to the env story without teaching it).
- **It throws on invalid input.** The senior pattern: let it throw *at boot* for a misconfigured env (fail fast) rather than wrap every construction in try/catch. One sentence framing why fail-fast beats silent fallback here (a malformed base URL is a deploy bug, not a user error).
- **`URL.canParse(input, base)`** is the boolean-returning safe-check for the case where the input is *untrusted user data* and throwing would be wrong. Contrast in one line: `new URL` for trusted/config input (let it throw), `URL.canParse` to guard before parsing user input. (Mention `URL.parse()` exists as the returns-`null`-instead-of-throwing sibling in one half-sentence — it's the same Baseline cohort — but keep `canParse` as the named reach to avoid surface bloat.)
- **Trailing-slash determinism** belongs here as the motivating win, not in the bug roundup: show that `new URL('/v1', 'https://api.acme.com')` and `new URL('/v1', 'https://api.acme.com/')` resolve identically, where naive concatenation produces `...com/v1` vs `...com//v1`. This is the "parser normalizes for you" payoff in its most concrete form. A 2-tab `CodeVariants` (label "String concat" / "new URL") is the right shape: concat tab shows the drift, URL tab shows both inputs landing on the same `href`.
- **Normalization watch-out**, one line, placed here because it's a property of the constructor and L2 depends on it: `new URL` **lowercases the hostname** and **drops the default port** (`:80` for http, `:443` for https collapse to no port). Flag forward: "this is why origin comparisons in the next lesson are reliable."

`CodeTooltips` candidate on this section's main block: `canParse` → "Static method. Returns true/false instead of throwing — the guard for untrusted input.", `URL` → "Global in every runtime — browser, Node, Edge. No import."

### `URLSearchParams`: the end of escaping query strings

Goal: the query-string reach, and the moment the student stops thinking about escaping.

- **The win, stated first:** `params.set('q', userInput)` and you never think about escaping again. That's the whole pitch — lead with it.
- **The four construction shapes**, as a compact `AnnotatedCode` (single block, stepped). The block constructs the same logical params four ways; each step highlights one and explains when to use it:
  1. `url.searchParams` — the live view off a `URL` (most common in app code).
  2. `new URLSearchParams({ status: 'paid', limit: '20' })` — from a record (quick, single-value).
  3. `new URLSearchParams('status=paid&limit=20')` — from a raw query string (parsing an incoming one).
  4. `new URLSearchParams([['tag', 'a'], ['tag', 'b']])` — from entries (the only shape that expresses repeated keys).
  Use `AnnotatedCode` (not `CodeVariants`) because it's one block viewed under four lenses, with focused prose per shape — exactly its use case. `color="blue"` default per step.
- **The multi-value model**, short prose + a 3–4 line `Code` block: `append` adds, `set` replaces all; `get` returns the first, `getAll` returns every value for a key. Motivate with the real case: `?tag=a&tag=b` filters (a list, not a scalar) — this is why query keys aren't a flat record. One line: **iteration/insertion order is preserved**.
- **`toString()` is the encoded output** — it produces a correctly percent-encoded `application/x-www-form-urlencoded` string. This sentence is the bridge to the encoding section: "and *how* it encodes is the one thing you must understand — next."

### The `%20`-vs-`+` split

Goal: the single hardest, highest-value idea. Isolate it, stage it, make the round-trip failure viscerally clear. **Spend the most care here.**

- **Frame the surprise first.** The WHATWG URL standard uses *different* percent-encode sets for different positions in a URL. The student's intuition ("encoding is encoding") is the trap.
- **The two contexts, stated as a clean binary:**
  - **Path segments and the fragment** encode space as `%20`. `encodeURIComponent` matches this.
  - **`application/x-www-form-urlencoded` query strings** — what `URLSearchParams` produces and what HTML form submits use — encode space as `+`. On *decode*, `+` becomes a space, so a literal `+` must be sent as `%2B`.
- **The round-trip failure, shown both ways.** This is where the mismatch bug lives, and it's the reason for a `CodeVariants` block (per chapter outline's explicit ask). Two tabs, same input `s = 'a+b'` (a string that genuinely contains a plus, e.g. a search like `"C++"` or `"a+b"`):
  - Tab "Encoded with `URLSearchParams`": `new URLSearchParams({ q: 'a+b' }).toString()` → `q=a%2Bb`; decoded back with `URLSearchParams` → `'a+b'`. **Round-trips correctly.** Show both directions in the tab.
  - Tab "Mixed tools (the bug)": build with `` `?q=${encodeURIComponent('a+b')}` `` → `?q=a%2Bb` *looks* fine, but now build with a *space* input `'a b'`: `encodeURIComponent('a b')` → `a%20b`, then read it through `URLSearchParams` → `'a b'` (ok)… then flip it: `new URLSearchParams({ q: 'a b' }).toString()` → `q=a+b`, decoded with `decodeURIComponent('a+b')` → `'a+b'` — **the `+` came back as a literal plus, not a space.** Annotate the wrong line with `del=`/red mark.
  - Use per-pane `data-mark-color` (green for the correct round-trip, red for the bug) per the CodeVariants doc.
  - Writer guidance: keep each tab's prose to the one-paragraph cap; the comparison carries the teaching. Pick the example inputs carefully so the failure is unambiguous — one space-containing and one plus-containing value.
- **The senior rule, boxed.** `<Aside type="tip">`: *Encode and decode with the same model, end to end. The simplest rule: do both with `URLSearchParams` and never hand-roll the query string.* This is the takeaway sentence the student should remember if they remember nothing else.

<Term> candidate: **percent-encoding** (def: "Replacing a character with `%` followed by its byte value in hex — `%20` is a space. Also called URL-encoding.") and **eTLD**-adjacent terms are *not* introduced here (deferred to L2).

### Which encoder, which position

Goal: settle the three-tool confusion with a decision table.

- One paragraph framing: three tools, each correct in exactly one place; most bugs come from using `encodeURIComponent` everywhere (double-encoding) or `encodeURI` thinking it escapes values (it doesn't).
- **A 3-row `Table`** (component: Starlight markdown table is fine; the chapter outline asks for `Table`). Columns: *Tool* · *Escapes structural chars (`:/?#&=`)?* · *Use for*.
  | Tool | Structural chars | Use for |
  |---|---|---|
  | `encodeURI` | **preserved** | a whole, already-trusted, well-formed URL string — rarely the right tool |
  | `encodeURIComponent` | **escaped** | a single value going into a **path segment** |
  | `URLSearchParams` | n/a (handles it) | **any query string** construction |
- One line under the table reinforcing the heuristic: path segment → `encodeURIComponent`; query → `URLSearchParams`; whole-URL escaping → almost never, prefer `new URL`.
- **`Dropdowns` exercise (inline prose, fenced or inline mode)** to check the mapping immediately while it's fresh. 3 blanks, each a position→tool pick: e.g. "To put a customer name into the path `/customers/___`, use `___`. To add `?q=` search terms, use `___`." Options drawn from the three tools. Cheap, immediate, reinforces the table. (Chosen over a heavier exercise — this is a recognition check, not a build task.)

### The bugs concatenation hands you for free

Goal: the payoff section — name each bug class the parser retires, so the lesson's thesis lands with evidence. Keep each to one tight line; this is a roundup, not five mini-lessons. Several have already been shown (trailing-slash in the constructor section, double-encode/mixed-model in the encoding section) — here they're consolidated as a scannable list with the *reason* the parser avoids each.

- Use a `<BulletList>`/markdown list, one line each:
  - **Parameter injection** — `` `?q=${q}` `` with `q = 'a&admin=true'` smuggles a second parameter; `params.set('q', q)` escapes the `&` to `%26`. *(Most security-relevant — lead with it.)*
  - **Double-encoding** — `encodeURIComponent` on a value `URLSearchParams` already escaped → `%2520` where you meant `%20`.
  - **Path-traversal-shaped values** — a value like `'../admin'` interpolated raw into a path is read as path syntax by the server.
  - **Unicode hostnames (IDN)** — the parser normalizes via Punycode; hand-templating ships a broken host.
  - **Trailing-slash drift** — recap one line, pointer back to the constructor section.
- Close the section (and the conceptual core of the lesson) with one sentence: each of these is a *category* of bug, and `new URL` + `URLSearchParams` retires the whole category, not one instance.

<Term> candidates: **IDN** (def: "Internationalized Domain Name — a hostname with non-ASCII characters, normalized to ASCII via Punycode."), **Punycode** (def: "ASCII encoding of Unicode hostnames, e.g. `münchen` → `xn--mnchen-3ya`.").

### One reflex, every runtime

Goal: the Node/Next forward-link, kept to a few lines so it doesn't balloon. Defaults-before-conditionals: name where this vocabulary travels next.

- `URL` and `URLSearchParams` are **globals in every runtime the course ships on** — browser, Node.js server, Vercel Edge. No imports, ever. (Re-state because it's a genuine relief and reduces a class of "where do I import this" friction.)
- One line: Next.js's `useSearchParams()` hook returns a **read-only `URLSearchParams`** instance — so the exact vocabulary from this lesson carries from URL strings straight into the React tree (full treatment in Unit 4). Frame as continuity, not a new topic.
- **`URLPattern`, named once** as a forward link: the standardized URL-matching primitive (Baseline since Sep 2025; a global on browser, Node 24, and Edge). The student does **not** write it here — Next.js's file-system router owns route matching — but it earns a one-line mention because Unit 4 middleware uses pattern objects under the hood. One sentence, no code.

### Practice: build the URL (live exercise)

Goal: the one hands-on build, exactly as the chapter outline specifies. Verifies the student can produce a correctly encoded URL *and* understands the round-trip.

- **`ScriptCoding`** (vanilla runner — plain JS, `URL`/`URLSearchParams` are runtime globals, no imports/JSX needed → vanilla is correct and instant).
- **Task / instructions:** "Given a base URL and a record `{ q: 'a+b', tags: ['x', 'y'] }`, return the fully-built URL string. Put `q` as a single search param and add `tags` as a *repeated* `tag` param (`tag=x&tag=y`). Use `URLSearchParams` — no manual escaping."
- **Starter:** a `buildSearchUrl(base, { q, tags })` stub returning `''`, with a `// your code here` line. Shape it toward `const url = new URL(base); url.searchParams.set('q', q); for (const t of tags) url.searchParams.append('tag', t); return url.href;`.
- **Tests (the grading criteria):**
  1. The `q` value round-trips: parse the returned URL with `new URL`, read `searchParams.get('q')`, `toBe('a+b')` — this is the load-bearing assertion (it fails if the student hand-builds with `encodeURIComponent` + manual `?`, because `+` decodes to space). 
  2. `searchParams.getAll('tag')` `toEqual(['x', 'y'])` — verifies repeated-key handling via `append`.
  3. The host/path are preserved from `base` (guards against returning just the query).
  4. Negative-ish: `q` appears exactly once (catches `append` misuse on `q`).
- **Reference solution** behind a `<details>` summary ("Show a solution") so the student tries first.
- Writer note: the round-trip assertion is the pedagogical point — it operationalizes the `%20`-vs-`+` lesson. Make the failure message instructive if the shim allows custom messages.

### External resources (optional)

Goal: 1–2 `ExternalResource` cards, not a dump.

- MDN `URL` and/or `URLSearchParams` reference.
- Optionally the WHATWG URL Living Standard "URL writing" section or the MDN "What is a URL?" guide.
- Optionally an `<ExternalResource>` to a live `new URL()` parser playground (e.g. an MDN/devtools-adjacent URL parser) **in lieu of** a `SandboxCallout`. (See Scope note: a custom playground is overkill; a link suffices.)

---

## Scope

**Prerequisites to redefine *briefly* (one clause each, don't re-teach):**
- Template literals / backtick interpolation (Ch001 L5) — referenced as the thing being retired for URLs; assume fluency.
- `JSON.parse` → `unknown` → Zod validate discipline (Ch009 L1) — not invoked here; URL parsing is structural, not schema validation. Do not pull Zod in.
- Code units vs. code points / `normalize` (Ch001 L4) — Unicode hostnames touch this; mention Punycode normalization without re-teaching grapheme model.
- HTTP methods/headers (Ch011) — the `Origin` header is *named* in L2, not here.

**This lesson does NOT cover (owned elsewhere):**
- **Same-origin policy, what `origin` gates, the `Origin` request header** — Chapter 012 **Lesson 2**. This lesson *names* the `origin` field as anatomy only; it must not explain trust, blocking, or comparisons beyond the one-line "normalization makes comparisons reliable" forward-nod.
- **CORS, preflight, `Access-Control-Allow-*`, `credentials`** — Chapter 012 **Lesson 3**. Do not mention CORS.
- **Cookie attributes (`Secure`, `SameSite`, `__Host-`, `Partitioned`)** — Chapter 013. Not named here at all (they belong to L1 of Ch013).
- **`fetch` body, methods, `AbortSignal`, `mode`/`credentials` knobs** — Chapter 015. `fetch` is not invoked in this lesson; the cross-origin `fetch` surface belongs to L3.
- **Next.js route matching, `params`, `searchParams` in Server Components, `useSearchParams` depth** — Unit 4. Only the one-line `useSearchParams()` continuity nod is allowed.
- **`nuqs` (typed URL-state in React)** — Chapter 024. Not named.
- **`URLPattern` usage / route-matching syntax** — out of scope; one-line forward mention only, no code.
- **Legacy `escape`/`unescape` globals** — deprecated; do not surface them at all (not even to warn against).
- **`encodeURI`/`encodeURIComponent` internals (full reserved-char tables)** — teach the decision (which tool, which position), not the exhaustive char sets. The `%20`-vs-`+` split is the only encoding-set detail that earns depth.
