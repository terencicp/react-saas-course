# Reading the request with cookies() and headers()

- **Title (h1):** Reading the request with cookies() and headers()
- **Sidebar label:** cookies() and headers()

---

## Lesson framing

This is the chapter's foundational lesson and a dependency for every later lesson that says "read the session."
It is short (25–35 min) and its job is to install one mental model and two API shapes, not to exhaust edge cases.

**The single mental model to install:** a route's only inputs are the URL, the headers, and the cookies — there is no hidden fourth channel.
This lesson owns two of those three (headers, cookies); `searchParams`/`params` (the URL) land in lessons 4–5.
Everything dynamic a Server Component renders for a specific user flows from these channels.

**Pedagogical spine.**
The student already knows (ch 015) the web-platform `Headers` object and (ch 032) that every route is dynamic by default, that async request APIs return Promises, that `React.use()` unwraps a Promise on the client, and that `cache()` dedupes request-scoped work.
This lesson is *not* re-teaching the async syntax (ch 032 lesson 7 did) — it teaches the **usage pattern and the senior judgment**: where to read, what each read costs, what's trustworthy, and what you can and can't do with the result.
Lead every section with the decision, not the API.

**Lead with the senior question (do not make it a section).**
Open the introduction with the concrete problem: a Server Component needs the user's session token, their locale, the request IP for rate-limiting, and the `User-Agent` for analytics — where do those four values come from in the App Router?
Naming `cookies()` and `headers()` from `next/headers` as the answer motivates the whole lesson.
Keep it warm and brief per the guidelines.

**Where beginners go wrong (the pain points this lesson must pre-empt).**
1. Treating `cookies()`/`headers()` as values, not Promises — forgetting the `await` (a build error in 16).
2. Trying to `cookieStore.set(...)` from a Server Component and being confused when it throws — they don't yet have the response-lifecycle mental model that explains *why*.
3. Reaching for `document.cookie` on the client out of habit instead of reading on the server and passing down.
4. Trusting `x-forwarded-for` for security decisions — the single highest-stakes mistake in the lesson.
5. Re-reading the same store in ten deep components and worrying about cost, or worse, prop-drilling the raw store.

The lesson resolves each at the moment it teaches the relevant concept, never as a bundled watch-out appendix.

**The mental model the student leaves with.**
"Read the request once, high in the tree, derive what I need, pass resolved values down. Reads are server-only, read-only, and per-request. Writes live in Server Actions. Never trust a raw header for authz — trust the session. Under Cache Components these reads are dynamic signals, so keep them in the dynamic subtree and lift cached chrome out."

**Code-sample strategy.**
Small `Code` blocks for the two primitive shapes.
One `AnnotatedCode` for the worked root-layout example (the production shape) so attention can be directed part-by-part.
One `CodeVariants` for the server-read-and-pass-down vs. client-`document.cookie` contrast (correct vs. anti-pattern).
A small `Code` + `Aside` for the mutation-throws case.
Keep all blocks short; this is a foundational lesson, not a reference dump.

**Visuals.**
One `ArrowDiagram` (the "request → three channels → Server Component" picture) to cement the mental model — a simple visual aid, not a system graph.
One small HTML/CSS diagram or `RequestTrace` to show where the cookie read sits in the dynamic subtree under PPR (reuse the ch 032 rendering vocabulary the student already has).

**Exercises.**
One `Buckets` drill (server-readable vs. needs-Server-Action, or trustworthy-vs-untrusted header) to check the read-only and trust-boundary judgments.
One `MultipleChoice` to check the "what does reading this do to caching" reasoning.
No live-coding exercise: the syntax is one `await`, and a full Next.js request runtime is not worth a sandbox here — guided recall beats a sandbox for this material.

**Tone:** adult, terse, decision-first. No celebratory scaffolding.

---

## Lesson sections

### Introduction (no header)

State the goal and motivate with the senior question.
A `RootLayout` or a dashboard Server Component needs four request-scoped values: the session token (auth), the preferred locale, the client IP (rate-limiting), the `User-Agent` (analytics).
In the App Router these come from exactly two server APIs — `cookies()` and `headers()` from `next/headers`.
Connect to prior knowledge: ch 032 already showed these return Promises and are dynamic signals; this lesson is about *using them well*.
Preview the payoff: by the end, the student can read any request value on the server, knows what it costs, knows what's safe to trust, and knows the one pattern (read high, pass down) that keeps the rest of the tree clean.
Pin the mental model up front in one sentence: the route's inputs are the URL, the headers, and the cookies — nothing else.

Place the **request-channels `ArrowDiagram`** here, right after the model sentence, so the visual anchors the whole lesson.
- Three small source boxes on the left — `URL`, `Headers`, `Cookies` — each an HTML box.
- One target box on the right — `Server Component (renders for this user)`.
- Three arrows converging left-to-right; label the URL arrow "lessons 4–5", the headers/cookies arrows "this lesson" (color the two this-lesson arrows one accent, the URL arrow a muted tone).
- Pedagogical goal: make "there is no fourth channel" a picture the student can recall, and scope this lesson to two of the three channels.
- Wrap in `<Figure>` with a caption restating the model.

### The two reads: cookies() and headers()

Teach the two primitives side by side, each as the answer to "how do I read X."
This is the API-shape section; keep it tight because ch 032 already showed the `await`.

`await cookies()` returns the request-cookie store; the reads are `get(name)` (returns `{ name, value }` or `undefined`), `getAll()`, and `has(name)`.
The store object *also* exposes `set`/`delete`, but those are usable only in a write context (next section) — in a Server Component this lesson treats the store as read-only.
`await headers()` returns a read-only web-platform `Headers` instance — the *same* `Headers` API from ch 015 (`get`, `has`, `entries`, etc.), now request-scoped (no `set`).
Both are scoped to the current request and discarded after the render — they are not global, not cached across requests, not shared between users.

Note for the agent: the returned cookie type is not a different "read-only type" that lacks `set`/`delete` — the methods exist but throw/are unsupported during render. Frame the constraint as *contextual* ("you can't set here"), not *structural* ("the object has no set"). This keeps the next section's explanation honest.

Use two short `Code` blocks (one per API), each three lines: import, `await`, one read.
```ts
import { cookies } from 'next/headers';
const cookieStore = await cookies();
const theme = cookieStore.get('theme')?.value;
```
```ts
import { headers } from 'next/headers';
const userAgent = (await headers()).get('user-agent');
```

Use `CodeTooltips` on the second block to gloss the inferred shapes without breaking flow: tooltip `headers` ("async — returns Promise<ReadonlyHeaders>"), `get` ("returns string | null"), and on the first block `cookies` ("async — returns Promise<ReadonlyRequestCookies>"), `get` ("returns { name, value } | undefined — note the `.value`").
Reasoning: the student's most common first bug is forgetting `?.value` on the cookie `get` (it returns an object, not a string) — a tooltip catches it without a paragraph.

Briefly connect back: "you've awaited these before in ch 032 — here we care about what they return and how to use it."

Tooltip terms in prose for this section: none beyond the code tooltips; `Headers` is already known.

### Reads are server-only and read-only — and why

This section pre-empts pain points 2 and 3 by giving the *reason*, not just the rule.
Two distinct constraints, taught with the response-lifecycle model as the throughline.

**Server-only.** Both imports are server-only; calling `cookies()` or `headers()` in a Client Component is a build error.
The student already has the server/client boundary (ch 030) — frame this as a natural consequence: the request object lives on the server, so the read lives on the server.

**Read-only from a Server Component.** From a Server Component you cannot effectively `set` or `delete` a cookie.
Give the *why* with the official two-layer model (this is the durable mental model — lead with it): cookies are fundamentally **client-side storage**; the server never stores a cookie, it only sends a `Set-Cookie` **instruction** in the response headers telling the browser to store one.
Then the precise reason for the constraint, in the docs' own words: **HTTP does not allow setting cookies after streaming starts** — and by the time a Server Component renders, the response has already begun streaming (ch 031), so the `Set-Cookie` header can no longer be added.
Writing requires a context where the response headers are still composable: a **Server Action** (ch 043) or a **route handler**.
Name the write path, point forward, do not teach it.

This client-storage framing is load-bearing: it also explains the later "client side" section in one stroke — `document.cookie` is the browser reading its *own* storage, which is why the server-side APIs and the client-side API look nothing alike.

Show the failing case with a small `Code` block and a `caution` `Aside`:
```ts
// Server Component — throws at runtime
const cookieStore = await cookies();
cookieStore.set('theme', 'dark'); // ✗ response already started
```
`<Aside type="caution">`: setting a cookie from a Server Component throws; move the write to a Server Action or route handler. One sentence.

Reasoning for this framing: students accept "read-only" as arbitrary unless they see the response-lifecycle reason; once they see it, the rule is self-evident and they stop fighting it.

Tooltip term: <Term> on "route handler" (brief: "a `route.ts` file that returns a Response directly; covered in ch 034") so the forward reference doesn't stall a reader who hasn't met it.

### The senior pattern: read once at the top, pass resolved values down

This is the lesson's core judgment and the pattern the rest of the chapter and Unit 8 assume.
Teach it as a decision, then show the shape.

The reflex: read `cookies()`/`headers()` at the **layout or page** level, derive the values you actually need (the user, the locale, the IP), and pass *those resolved values* down as props — never thread the raw store through the tree, and avoid re-reading the store in deep leaf components.

Two reinforcing reasons:
1. Readability — `await` calls cluster at the top of one file; the rest of the tree stays synchronous and easy to follow.
2. One derivation point — deriving "the current user" from the session cookie is real work (a DB read in Unit 8); doing it once and reusing the result beats doing it per-component.

Connect to ch 032 lesson 5 (`cache()`): when a *derived* value (like the current user) genuinely needs to be read from many places and prop-drilling is painful, wrap the derivation in React `cache()` so every caller shares one per-request computation — the read itself is already per-request, but `cache()` puts the *expensive derivation* behind a single memo.
Be precise (per ch 032): re-reading the cookie store in many components is fine on its own (the read is cheap and per-request); `cache()` earns its place only when there's costly derivation behind the read.
This avoids the beginner over-correction of wrapping every trivial read in `cache()`.

Present the contrast with `CodeVariants` (two tabs, correct vs. anti-pattern):
- Tab "Read high, pass down" — layout reads `cookies()`/`headers()`, derives `user` + `locale`, renders children with those as props. First sentence: "Reads cluster at the top; children stay simple."
- Tab "Re-read deep / prop-drill the store" — a leaf re-awaits `cookies()` or receives the raw store as a prop. First sentence: "Works, but scatters request reads and leaks the store shape through the tree."
Use `ins=`/`del=` framing inside the tabs to mark the lines that differ.

Reasoning: the correct-vs-anti CodeVariants makes the senior reflex concrete and gives the student a shape to pattern-match against their own code.

### The SaaS reference list: which cookies, which headers

A scannable reference so the student recognizes the real reads they'll meet, framed as "here's what a production SaaS actually reads."
Keep it a tight two-list, not prose paragraphs — use a small `Card`/`CardGrid` or two compact lists.

**Cookies:** session cookie (the auth layer, Unit 8 — name it, don't wire it); CSRF cookie (Better Auth manages this — named, not taught); locale-preference cookie (Unit 17); feature-flag and A/B-test cookies.
Tie to conventions: the course's session cookie uses the `__Host-` prefix with `HttpOnly; Secure; SameSite=Lax` — name these flags here as the default the student will see, with a one-line "why `HttpOnly`" (JS can't read it, so XSS can't steal the session).

**Headers:** `x-forwarded-for` for client IP (flag the trust caveat, handled in the next section); `user-agent` for analytics; `accept-language` for locale fallback; `referer` for navigation analytics.

This section sets up the next two sections (trust boundaries, the worked example) by naming the concrete reads they'll use.

Tooltip terms: <Term> on "CSRF" (brief expansion: "Cross-Site Request Forgery — a forged request riding a logged-in user's cookies"), and <Term> on "A/B test" if not previously defined.

### Never trust a raw header for authorization

The lesson's highest-stakes section — pain point 4. Give it its own header and a `danger`/`caution` `Aside`.

The problem: `x-forwarded-for` and related proxy headers are *user-controllable* upstream of a trusted proxy — a client can send any value.
The correct reach, stated as a rule:
1. Trust proxy headers **only** when you're behind a known proxy (Vercel, Cloudflare) and you read the **platform's documented header** (on Vercel, `x-forwarded-for` / `x-real-ip`).
2. **Never** use a raw header for an authorization or identity decision — use the **session** (the cookie-backed, server-verified identity).

State the senior anchor bluntly: headers are for telemetry and platform-provided signals; the session is for "who is this and what may they do."

Use a `danger` `Aside` titled e.g. "Headers are attacker-controlled": one tight paragraph with the IP-spoofing example (`x-forwarded-for: 1.2.3.4` typed by anyone) and the one-line fix (read the platform header; authorize from the session).

Forward-reference without teaching: rate-limiting on the client IP is ch 073; the IP read here is for *recognition*, the security use is later.

Reasoning: this is the one thing in the lesson that, gotten wrong in production, is a real vulnerability. It earns a dedicated section and the strongest aside tone.

### What these reads do to caching

Connect to ch 032 directly — the student has the dynamic-by-default model and needs the precise interaction.

The facts, in order of the student's likely confusion:
1. Reading `cookies()` or `headers()` is an **explicit dynamic signal** — the framework's static analysis marks that code path dynamic.
2. But under Cache Components every route is already dynamic by default, so relative to "no read," the read costs nothing — what it *prevents* is making that subtree static.
3. Placing such a read inside a `use cache` function is a **build error** (the function must be request-independent). Name the actual error class so the student recognizes it: "Cannot access `cookies()` or `headers()` in a `use cache` scope."
4. The senior reach (the extraction pattern, ch 032 lesson 5/7): read the request value in an **uncached** parent and pass it as an **argument** to the cached function — the argument becomes part of the cache key, so each distinct value gets its own entry. Keep the cookie/header read in the dynamic part of the tree; lift cached chrome (header, sidebar, footer) outside it.

Show the boundary with a small visual. Prefer a compact **`RequestTrace`** (the component already encodes the PPR model and the student met it in ch 032) configured minimally:
- `phases="server-render,shell,stream"`.
- A cached static `Header` node, a `Suspense` boundary wrapping a dynamic `UserGreeting` node with `await="cookies(): session"`.
- Pedagogical goal: show that the cookie-reading component is the streamed hole while the cached chrome ships in the shell — reinforcing "keep the read in the dynamic subtree."
- Do not wrap in `<Figure>` (RequestTrace brings its own card).

Then a `MultipleChoice` to check the reasoning (not the prose): a question like "A page wraps `getCatalog()` in `use cache` and the function calls `await cookies()` to read a currency preference. What happens, and what's the fix?" with choices covering (correct) build error → read the cookie in the caller and pass currency as an argument; (distractors) runs fine but slow / silently uses the default / flips only that component dynamic at runtime.
Per the MCQ doc, phrase choices so they require reasoning, not prose-matching; include an `McqWhy`.

Reasoning: this closes the loop with the chapter the student just finished and prevents the most common Cache Components build error involving request reads.

### The client side: you don't read the request, you receive it

Resolve pain point 3 and close the server/client contrast.

A Client Component cannot call `cookies()` or `headers()` — server-only, build error.
What the client *can* do is narrow and rarely the right reach:
- `document.cookie` reads only non-`HttpOnly` cookies (so never the session — by design).
- Headers are visible only by inspecting `Response` objects returned from `fetch`.

The senior reflex, stated as the rule: read on the server, pass resolved values down as props (or via context for cross-cutting values like locale).
Reaching for `document.cookie` is rare and usually signals an architecture mistake — the data should have come from the server render.

Reuse the **server-read-vs-client-read** framing already set up: a one-paragraph callout plus a tiny `Code` snippet of the `document.cookie` read marked as "rare, usually wrong," is enough — do not build a second large CodeVariants here; the earlier read-high-pass-down CodeVariants already carried the correct shape.

Then place the judgment-check **`Buckets`** exercise here (it consolidates several of the lesson's rules at once):
- Two buckets, e.g. "Read it on the server" vs. "Can't / shouldn't read it there."
- Items to sort: "the session token" (server), "set a `theme` cookie" (no — Server Action), "`User-Agent` for analytics" (server), "read a non-`HttpOnly` banner-dismissed flag in a Client Component" (acceptable client read), "decide if this user is an admin from `x-user-role` header" (no — authorize from session), "the visitor's locale from `Accept-Language`" (server).
- Alternative framing if cleaner: buckets "Safe to trust" vs. "Attacker-controlled" for the header subset — pick whichever single axis reads most clearly; do not overload one drill with two axes (the Buckets doc warns matching is per-`bucket` name).
- Grading: each chip's `bucket` is its correct home; the drill checks the read-only + trust-boundary judgment the lesson built.

Reasoning: a classification drill is the right tool to verify the student can *apply* the read-only/server-only/trust rules, which is the lesson's actual learning objective — more than recalling an API name.

### Worked example: reading session and locale at the root layout

The production shape the chapter and Unit 8 build on — the lesson's synthesis.
Use one `AnnotatedCode` block so attention is directed part-by-part through the real pattern.

The code: an `async function RootLayout({ children })` that:
1. `const cookieStore = await cookies();` and `const requestHeaders = await headers();`
2. derives `locale` from a locale cookie with an `accept-language` fallback;
3. obtains the current user via the cached `getCurrentUser()` (the ch 032 lesson 5 + conventions pattern) — show it as an imported helper, *not* inline DB code (auth wiring is Unit 8); a brief note that `getCurrentUser` internally resolves through the session cookie via Better Auth and is React-`cache`d so it runs once per request;
4. renders the shell, passing `locale` down (prop or context) and letting children call the cached `getCurrentUser()` themselves rather than receiving `user` as a drilled prop.

`AnnotatedStep` sequence (each one paragraph, ≤6 lines, colored):
- Step 1 (blue): the two `await` reads at the top — "every request read lives here, once."
- Step 2 (green): locale derivation with fallback — show the cookie-then-`accept-language` precedence.
- Step 3 (orange): `getCurrentUser()` — "the session read is hidden behind a cached helper; the layout never touches the raw token." Reinforce the read-high pattern and the `cache()` connection.
- Step 4 (blue): render + pass `locale`; note children re-call the cached user helper, no prop-drilling.

Keep the block under ~16 lines so it fits `AnnotatedCode`'s frame.
Align to conventions: `import 'server-only'` is implied by the helper module (mention once, don't clutter the layout); default export for `layout.tsx` (framework-dictated, per conventions); two-positional-params max (the layout takes one props object).

Reasoning: ending on the canonical shape gives the student a concrete template to lift, and threading `getCurrentUser` (rather than raw DB code) keeps the lesson scoped while previewing the auth pattern cleanly.

### Keeping cookies and headers small (the size budget)

Short closing practical, framed as a cost the student must name once — pain point 5's cousin and a real production concern.

Every cookie and header rides on **every** matched request (request *and* response).
Oversized JWTs, fat session payloads, or kitchen-sink cookies inflate every round-trip and can blow past server/CDN header-size limits.
The senior reach: name a size budget once (keep cookies small — store an ID, not a payload; keep the session lean), and set `HttpOnly` + `Secure` by default (tie back to the `__Host-` convention).

One tight paragraph plus a `tip` `Aside` with the rule of thumb ("a cookie holds a reference, not a record").
No code needed.

Reasoning: this is a senior-mindset cost the course's thesis demands surfacing, and it connects the cookie reads of this lesson to the request-cost theme the whole chapter carries (the matcher-cost story in lesson 2).

### External resources (optional)

One or two `ExternalResource`/`LinkCard` items: the Next.js `cookies` and `headers` function reference pages, and optionally the `next-request-in-use-cache` error doc.
Keep to canonical docs only.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Async request APIs return Promises and are awaited / `React.use()`-unwrapped (ch 032 lesson 7) — this lesson assumes the syntax and teaches the *usage*.
- Every route is dynamic by default; dynamic signals; the `use cache` build constraint (ch 032 lesson 1/3).
- React `cache()` for per-request memoization (ch 032 lesson 5).
- The web-platform `Headers` API (ch 015).
- Server/client boundary and serializable props (ch 030).

**This lesson does NOT cover (reserve for later):**
- Setting cookies from Server Actions — name the write path, do not teach it (ch 043 / Unit 6).
- `draftMode()` for CMS preview — named once in ch 032 lesson 7, not revisited here.
- The Better Auth session shape, `getSession` wiring, the session-read ladder internals — name `getCurrentUser` as a black box (Unit 8).
- Rate-limiting using the client IP — the IP read here is for recognition only (ch 073).
- Locale resolution, ICU, `next-intl` — name the locale cookie / `accept-language` read, not the resolution (Unit 17).
- `proxy.ts` and request-time reads / enrichment headers — the proxy-to-route header pattern is lesson 2 of this chapter.
- `searchParams` and `params` (the URL channel) — lessons 4–5 of this chapter.
- Client navigation hooks (`useRouter`, `useSearchParams`, etc.) — lesson 5.

**Boundary with ch 032 lesson 7 (the closest neighbor):** that lesson taught the async *syntax* across all five request APIs plus the legacy segment-config migration. This lesson zooms into `cookies()`/`headers()` specifically and teaches *judgment* — where to read, trust boundaries, the read-high-pass-down pattern, the caching interaction, the size budget. Do not re-derive the Promise/`React.use()` mechanics; reference them.

---

## Code conventions notes

- Imports grouped external (`next/headers` counts as external) → `@/` → relative, alphabetical within group; `import 'server-only'` is a side-effecting import and appears first (relevant to the helper module, not the layout).
- `layout.tsx` uses a default export (framework-dictated carve-out); everything else named.
- Cookie reads show `.value` (the store's `get` returns `{ name, value } | undefined`).
- Session resolution is via the cached `getCurrentUser()` helper, never a raw `getSession`/cookie read in the page or layout (conventions §Authentication). Show `getCurrentUser` as imported, not inline.
- Cookie hardening defaults named: `__Host-` prefix, `HttpOnly; Secure; SameSite=Lax`.
- `cacheLife`/`cacheTag` are out of scope here; only the *build-error interaction* with `use cache` is named, matching conventions §Caching.
- Deliberate divergence: the lesson shows a raw `cookieStore.get('theme')` read for teaching the primitive even though production session reads go through `getCurrentUser` — flagged so downstream agents keep the primitive demo and the production helper distinct (the worked example uses the helper; the primitive blocks use a benign `theme`/`user-agent` read).
