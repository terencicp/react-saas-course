# The universal HTTP client

- **Title (h1):** The universal HTTP client
- **Sidebar label:** The universal HTTP client

---

## Lesson framing

This is the chapter's opener and the first lesson in the course to issue a network request from JS.
It is syntax-dense by nature, but the course thesis still rules: the deliverable is not "the `fetch` API reference" — it's a **single hardened call shape the student can write from memory** and the **reflexes `fetch` does not give you for free**.

The senior framing, established in the chapter outline, is that `fetch(input, init)` is the *one* HTTP primitive a 2026 codebase reaches for — same function in the browser, in Node, in the Edge runtime, in a Server Component, inside a Server Action. No `axios`, no `node-fetch`. So the lesson sells `fetch`-as-universal early and never re-litigates it.

**The single most important thing the student must leave believing:** `fetch` does **not** throw on 4xx/5xx. The promise resolves for *any* response the server returns. This is the #1 real-world bug junior devs ship (wrapping `fetch` in `try/catch` and assuming the catch means "the request failed"). The whole lesson is organized so that misconception is named, visualized, and drilled. Get this wrong and every error-handling decision downstream is wrong.

**The spine is one worked example, built up in stages.** The chapter outline's "senior question" — a button POSTs a JSON invoice to `/api/invoices`, must behave when the request times out, the user navigates away, the server returns 422, or the body isn't the expected shape — is the running scenario. The lesson opens with a *naive* version of that call (the one a junior writes), shows the four ways it breaks, then hardens it seam by seam until it's the canonical form. Every concept (`response.ok`, body consumers, `AbortSignal`, the Zod parse, the catch) enters as the fix for a concrete failure in that example, never as an abstract API tour. This is the cognitive-load discipline: simple shape first, complexity added one failure at a time.

**The mental model to install:** a `fetch` call is a five-seam pipeline — **build → send → ok-branch → parse → catch**. Every call in the course has all five, even when some collapse to one line. This naming is the load-bearing abstraction; it recurs in the quiz and in the next lesson. Repeat the five-seam vocabulary verbatim across sections.

**Tone and depth.** Assume the student knows async/await, Promises, `try/catch` narrowing (`error instanceof Error`, `error.name`), `URL`/`URLSearchParams`, and that Zod exists as a runtime validator. These are explicit prerequisites from Chapters 007, 008, 012 — redefine them in one clause, never re-teach. Do not name AI. Keep it adult and terse.

**What stays recognition-only.** Three call sites where `fetch` lives (Server Component / Action / Client Component), the Next.js `fetch` augmentation (named once, owned by Chapter 032), `XMLHttpRequest` (the upload-progress carve-out), and the `apiFetch` helper extraction. These are "you'll recognize this later" beats, not "you'll build this now." Keep them short and clearly flagged as forward references so they don't bloat a lesson that's really about one call shape.

**Forward references named once, never taught:** Zod call surface (Ch 042), `Result<T>` shape (Ch 043 L3), Next.js `fetch` caching (Ch 032), route-handler authoring (Ch 046), file uploads (Ch 016 L3, Ch 069). When the lesson uses `Result` or `Schema.parse`, show the one-line call and point forward — do not define the type.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely. A "New invoice" button must POST a JSON body to `/api/invoices`, render the returned row, and stay correct when: the request times out, the user navigates away mid-flight, the server answers `422 Unprocessable Entity`, or the JSON comes back the wrong shape. Ask: what's the call shape that survives all four — with no retry library, no `axios`, no wrapper?

Then state the lesson's promise: by the end the student writes that shape from memory, and knows the reflexes `fetch` doesn't hand you. Name `fetch` as the single network primitive every runtime in the course shares (browser, Node 24, Edge, Server Component, Server Action) — one async call, awaited, branched on a typed `Response`. Keep it to a few sentences; the payoff is the body.

Reasoning: per the pedagogical guidelines the intro motivates with a concrete problem and previews the end-state skill. The four failure modes seed the four hardening sections so the student feels the lesson answering its own opening question.

### `fetch` resolves for every response — even 404 and 500

**This section is the conceptual keystone — place it first, before any call-shape detail, because every later decision depends on it.**

Teach the `fetch` resolution model precisely:
- The promise **resolves** for any HTTP response the server sends, including 404, 422, 500. A 500 is "a successful round-trip that returned an error status," not a failed fetch.
- The promise **rejects** only on: network failure / DNS error / connection refused (`TypeError`), a manual abort (`AbortError`), a signal timeout (`TimeoutError`), and CORS preflight rejection.
- Therefore `response.ok` (true for 200–299) is the **load-bearing branch**, and `try/catch` is a *different* failure surface (the request never completed) — not "the request failed."

The headline reflex, stated as a rule the student repeats: **HTTP errors are in the resolved value; transport errors are in the catch. They are two different failure modes with two different handlers.**

**Diagram — `DiagramSequence` (the resolution model).** Pedagogical goal: make "resolves vs rejects" spatial so the misconception can't survive. Four scrubbable steps, each a small flow (HTML+CSS boxes inside `DiagramStep`, horizontal to respect the height cap):
1. `await fetch(url)` fired → request leaves the client.
2. Server answers `200` → promise **resolves** → `response.ok === true` → parse path. (Green.)
3. Server answers `422`/`500` → promise **still resolves** → `response.ok === false` → error-body path. (Orange — emphasize "this is the surprise.")
4. Connection drops / DNS fails / timeout → promise **rejects** → lands in `catch`. (Red.)
Caption each step with the one-line takeaway. The temporal scrub lets the student see steps 2 and 3 share the *resolve* arrow and only diverge at the `ok` check.

**Exercise — `PredictOutput`.** A short program that does `const res = await fetch('/missing')` against an endpoint returning 404, logs `res.ok`, `res.status`, then logs `'reached'`. Expected output proves the catch is never entered and `res.ok` is `false`. `<PredictWhy>` restates: a 404 resolves; only transport failure rejects. This is the cheapest possible drill for the exact misconception, and predicting output forces commitment before the answer shows.

Reasoning: leading with the resolution model (not the triad, not the call shape) inverts the usual API-tour order on purpose — the senior insight is the model, the syntax is downstream. Putting the diagram and the predict-drill here cements it before any code complexity arrives.

### The naive call, and the four ways it breaks

Show the call a junior writes for the invoice POST — minimal, optimistic, no guards. Then walk the four failures from the intro against it.

**Component — `CodeVariants` (Naive | Hardened), `syncKey` shared.** This is the lesson's before/after spine; reuse the same `syncKey` here and in the later seam sections so the two tabs stay in lockstep as the student reads down the page.
- **Naive tab:** `await fetch('/api/invoices', { method: 'POST', body: JSON.stringify(input) })`, then straight to `await res.json()` and render. Prose names the four bombs: assumes success (no `ok` branch — a 422 sails into `.json()` and renders garbage), no deadline (hangs forever on a slow server), no abort (keeps running after the user leaves), trusts the wire (no validation of the parsed shape).
- **Hardened tab:** the final canonical shape (revealed in full in the next section), shown here so the student sees the destination before the build-up. Keep the prose to the one-paragraph cap; the deep walkthrough happens in the next section.

Reasoning: the guidelines call for "why this approach, when does it break" up front. Seeing the naive code fail four ways makes each subsequent seam a fix the student already wants, not a rule imposed. `CodeVariants` with `del=`/`ins=` markers is purpose-built for this before/after framing.

### The canonical call shape: build, send, ok-branch, parse, catch

The heart of the lesson. Introduce the **five-seam** vocabulary explicitly and walk the hardened invoice POST through all five.

**Component — `AnnotatedCode`** (single source-of-truth block, stepped). The block is the final hardened function (~15–18 lines, within `maxLines`). One step per seam, each `color`-tinted and one paragraph:
1. **build** (blue) — parse input first, then assemble `init`: `method`, `headers`, `body: JSON.stringify(...)`, `signal`. Highlight the `init` object.
2. **send** (blue) — `const response = await fetch(url, init)`. Note: this resolves to the `Response`, *not* the body. Tie back to the resolution-model section.
3. **ok-branch** (orange) — `if (!response.ok) { ... }`. Immediately after the await, always. Inside: read the typed error body and return a `Result` failure (forward ref to Ch 043, one line).
4. **parse** (green) — `return ok(Schema.parse(await response.json()))`. The success path: validate before trusting. Forward ref to Zod (Ch 042).
5. **catch** (red) — `catch (error) { ... }` narrowing on `error.name` to map `TimeoutError`/`AbortError`/network `TypeError` to typed `Result` failures.

After the walkthrough, state the discipline as a one-liner the student memorizes: **every `fetch` call has all five seams, even when some collapse to one line.**

**Exercise — `Sequence`** (ordering drill with a fixed code block above the steps). Show the canonical function with seam lines highlighted; shuffle five step labels ("Parse and assemble `init`", "Await the response", "Branch on `response.ok`", "Validate the body with the schema", "Map thrown errors to a failure"). The student reorders into build→send→ok→parse→catch. Reinforces the spine as a *sequence*, which is exactly the mental model.

Reasoning: `AnnotatedCode` is the right tool — one complex block, attention directed to one seam at a time, code written once. The `Sequence` drill converts passive reading into active recall of the pipeline order. The five-seam naming is the single most reused abstraction in the lesson and the quiz, so it gets its own headline section and is repeated verbatim.

### The `Request`, `Response`, and `Headers` triad

The three Web Platform types every `fetch` call touches. Teach them as **the same types a route handler receives and returns** — symmetry across the seam (forward ref to Ch 046, one line).

- **`Request`** — URL + method + headers + body. Constructed inline via the `init` shape (the common case) or as a `new Request(...)` object passed to `fetch`.
- **`Response`** — the resolved result: `status`, `ok`, `headers`, body. The thing `await fetch` gives you.
- **`Headers`** — a **case-insensitive** multimap, `.get` / `.set` / `.append` / `.entries`. `headers.get('content-type')` and `headers.get('Content-Type')` return the same value — that's the contract, and a watch-out against case-sensitive reads.

Keep this tight — a short `Code` block constructing a `Headers` and reading it case-insensitively, plus prose. Do not turn it into a full reference; the student met these types' *shapes* implicitly already and only needs the names + the case-insensitivity contract + the receiving-side symmetry.

**Tooltips (`CodeTooltips` on the small block):** `Headers` ("case-insensitive multimap of header name → value(s)"). If "multimap" appears in prose, wrap it in a `Term` instead.

Reasoning: naming the triad as platform types (not `fetch`-specific) is what lets the student later recognize the receiving side in route handlers without re-learning. The case-insensitivity is the one non-obvious, bite-prone fact, so it earns explicit treatment.

### Reading the body: pick one consumer, consume it once

A `Response` body is a `ReadableStream` consumed **exactly once**. Teach the five consumers and the once-only rule.

- **`response.json()`** — the SaaS default for JSON APIs. **Note for the writer (verified June 2026):** native `lib.dom.d.ts` types `response.json()` as `Promise<any>`, *not* `Promise<unknown>`. This is the strong argument, not a weak one — the platform hands you `any`, the exact unsafe escape hatch §TypeScript of the Code conventions bans. So `Schema.parse(await response.json())` isn't just "nice validation," it's what *re-introduces* the type safety `fetch` threw away: the parsed value is `any` until Zod narrows it to `Invoice`. Frame the reflex this way ("`fetch` gives you `any`; the parse earns back the type") rather than claiming TS forces `unknown` on you. Do **not** write `Promise<unknown>` anywhere — it's factually wrong for the native lib.
- **`response.text()`** — raw text, HTML, plain logs.
- **`response.formData()`** — the inverse of a `<form>` POST.
- **`response.blob()`** — binary: images, PDFs, downloads. (Forward ref: file handling, Ch 016 L3 / Ch 069 — one line, recognition.)
- **`response.arrayBuffer()`** — typed-array reads, crypto, low-level binary. (Forward ref to Ch 016 byte work — one line.)

**The once-only rule, made visceral.** Calling `.json()` twice throws "body already used." The senior reflex when you need both raw and parsed: read once into a variable, then act on the variable.

**Component — small `Code` block** showing the throw (`await res.json(); await res.json(); // TypeError: body already used`) and the fix (`const data = await res.json();` then reuse `data`).

**Exercise — `Buckets`** (classification, `twoCol`). Sort content types into the right consumer. Buckets: `.json()`, `.text()`, `.blob()`, `.arrayBuffer()`, `.formData()`. Items: "A SaaS REST API returning `{ id, status }`", "An uploaded image to re-display", "A server-rendered HTML fragment", "Bytes to HMAC-sign", "A multipart form echoed back", "A PDF invoice download". Builds the content-type → consumer reflex that the chapter outline calls for.

Reasoning: the consumers are a small finite set with a clear mapping — `Buckets` is the ideal recall format. The once-only rule is a top real-world bug (and a quiz topic), so it gets a dedicated demonstration of failure + fix.

### Setting the request body: the four shapes, and the `FormData` trap

The four body shapes you send, with the senior call for each:
- **`string`** — handcrafted JSON via `JSON.stringify`. The common case. Pair with an explicit `Content-Type: application/json` header.
- **`FormData`** — multipart, carries files. **The browser sets the `Content-Type` boundary header for you.**
- **`URLSearchParams`** — URL-encoded form posts.
- **`Blob` / `ArrayBuffer` / `ReadableStream`** — binary uploads (forward ref to file/upload chapters, one line).

**The load-bearing watch-out, taught as its own beat:** setting `Content-Type: application/json` (or any explicit `Content-Type`) on a `FormData` body **strips/corrupts the multipart boundary** and the server can't parse it. The senior call: when sending `FormData`, **let the browser pick the content type** — set no `Content-Type` at all.

**Component — `CodeVariants` (Broken | Correct)** for the `FormData` trap specifically. Broken tab sets `headers: { 'Content-Type': 'multipart/form-data' }` on a `FormData` body (`del=` the header line); Correct tab omits it (`ins=` a comment "// browser sets the boundary"). This is a classic, repeatedly-shipped junior bug — a dedicated A/B is worth it.

Also note the query-string watch-out in one line: build query strings with `URL` / `URLSearchParams` (Ch 012), never `?q=${userInput}` string-concatenation.

Reasoning: four shapes is a quick enumeration; the `FormData`/`Content-Type` interaction is the single high-value trap and the only part that needs a before/after. Pairing the `string` body with its `Content-Type` here sets up the headers section.

### The header surface every call touches

A short, opinionated tour — the senior reflex is **send what you need, no more; every header is a fingerprint.** The four that recur:
- **`Accept`** — the response content type the caller wants.
- **`Content-Type`** — the request body's type; set explicitly for JSON, *omit* for `FormData` (callback to previous section).
- **`Authorization`** — bearer-token site for service-to-service calls. The browser case uses cookies, not this (forward ref to credentials/cookies, Ch 013/016, one line).
- **`Idempotency-Key`** — retry-safety on mutating calls (forward ref to Ch 011 / billing, one line; recognition only).

Keep it to a `Code` block of a `Headers` object plus the "fingerprint" reflex. Do not exhaustively catalog HTTP headers — cross-reference Ch 011 for the full surface in one line.

Reasoning: headers are tempting to over-teach. The chapter outline limits this to four with explicit forward refs; the lesson honors that. The "no more than you need" reflex is the senior posture worth more than the list.

### Every outbound call carries a deadline: `AbortSignal.timeout` and `AbortSignal.any`

Re-apply the `AbortSignal` surface from Ch 007 L4 at the `fetch` call site. This is the fix for failure #2 (hang) and #3 (user navigates away) from the naive call.

- **`AbortSignal.timeout(ms)`** — the deadline default. `init.signal = AbortSignal.timeout(5_000)`. Fires a **`TimeoutError`** (not `AbortError`) at the deadline — this distinction is the whole reason to narrow on `error.name` in the catch. Senior calibration: ~5s internal, up to ~30s for a known-slow third party, **never "no deadline" on a user-facing path.**
- **`AbortSignal.any([...])`** — compose user-cancel + deadline: `AbortSignal.any([userController.signal, AbortSignal.timeout(5_000)])`. The composite aborts on whichever fires first; the catch tells them apart by `error.name`. (Verified June 2026: both `AbortSignal.timeout` and `AbortSignal.any` are baseline across browsers and stable in Node 24 — safe to teach as the default with no caveat.)

**Component — `AnnotatedCode`** on a call that composes both signals, with steps highlighting (1) the `AbortController` for user-cancel, (2) the `timeout` signal, (3) `AbortSignal.any([...])` merging them, (4) the catch branch reading `error.name` to distinguish `'AbortError'` (user) vs `'TimeoutError'` (deadline). This makes the "which signal fired?" resolution concrete.

**Tooltips (`Term` in prose):** `AbortSignal` ("a one-way cancellation token; passing it to `fetch` lets the call be aborted from outside"), `AbortController` ("owns a signal and the `.abort()` that fires it").

Reasoning: the `TimeoutError` vs `AbortError` distinction is subtle and quiz-relevant; an annotated walkthrough of the compose-then-distinguish pattern is the clearest vehicle. Calibration numbers give the student a concrete default instead of "pick something."

### Catching the right errors

Close the catch seam. The throwable cases at the `fetch` await and during body consumption:
- `TypeError` — network failure, DNS, connection refused, CORS.
- `AbortError` — manual abort (`controller.abort()`).
- `TimeoutError` — signal timeout.
- `SyntaxError` — from `response.json()` on malformed JSON (a *downstream* throw, after a successful fetch).

The senior reflex (callback to Ch 008 L2): **narrow with `if (error instanceof Error && error.name === '...')`, never `catch (e: any)`, never swallow.** Each branch maps to a distinct `Result` failure with a distinct `userMessage`.

Reinforce the lesson's keystone one more time: the catch is the **transport-failure** surface; HTTP errors (4xx/5xx) were already handled in the **ok-branch**. Lumping them is the bug.

**Component — small `Code` block** of the catch with the `error.name` switch, mapping each to an `err(...)` call. Mark the `SyntaxError` branch as the surprising one (it's a fetch that *succeeded* but returned non-JSON).

Reasoning: this section closes the five-seam loop and explicitly re-separates the two failure surfaces — the misconception is worth hitting a third time at the point where students are most tempted to merge them.

### Where `fetch` calls live in a 2026 codebase

Recognition-level map of the four call sites, so the student knows *where* this shape gets written. Keep it as prose + a compact visual, not deep teaching.

- **Server Component / Server Action → internal `/api/...`** — rare; almost always re-architected to a direct function call (name Architectural Principle #3 as a forward ref, one line).
- **Server Component / Server Action → third-party API** (Stripe, Resend, analytics) — the common case, usually behind a vendor SDK (which is `fetch` underneath).
- **Client Component → internal route handler** — the canonical site for live feeds and search-as-you-type (forward ref to the next lesson + Ch 046).
- **Client Component → third-party API directly** — rare, gated by CORS; the senior call is to proxy through a route handler.

**Optional component — `StateMachineWalker` (`kind="decision"`)** "Where should this `fetch` live?" Two or three questions (Is the caller server or client? Is the target internal or third-party?) leading to the four leaves above, each naming the senior call. This turns a flat list into the *order a senior asks the questions in* — which is the actual transferable skill. If it reads as over-engineering for four cells, fall back to a `CardGrid` of four cards. Author's judgment; prefer the walker if the question-order adds signal.

Reasoning: the chapter outline marks these as "map mentally," so the treatment is recognition. The walker (or card grid) makes the decision visible without expanding scope into route-handler authoring (reserved for Ch 046).

### The same `fetch`, augmented: what Next.js and `XMLHttpRequest` add

Two short recognition beats. Flag both clearly as "you'll meet this later" so the student doesn't try to learn it now.

- **Next.js's augmented `fetch`** — Next extends the global `fetch` with caching/dedup/revalidation (`cache`, `next: { revalidate, tags }`). Same signature, different behavior inside a Server Component. **Owned by Ch 032** — named here only so the student recognizes the same function behaving differently. The principle: *recognize the platform default first, then the framework's augmentation.*
- **`XMLHttpRequest`** — the legacy primitive `fetch` replaces everywhere **except upload-progress events**, the one capability `fetch` doesn't natively expose. Name the surface in one breath (`xhr.open`, `xhr.upload.onprogress` with `e.loaded`/`e.total`, `xhr.send`) and the anchor: progress bars on uploads reach for it; **Ch 069 owns the worked example.** Recognition only.
- **HTTP-client wrappers** (`ky`, `ofetch`, `axios`) — one sentence: they exist, the 2026 default is plain `fetch` plus a thin in-house helper. The senior posture: *don't import an HTTP client until your `fetch` boilerplate has visibly cost you something.*

Reasoning: all three are explicitly out-of-scope-to-teach per the chapter outline but in-scope-to-recognize. A tight section keeps them from leaking into the core lesson while still letting the student place them.

### When `fetch` boilerplate earns a helper: `apiFetch`

The natural extraction, **named, not built**. When three `fetch` calls share the same base URL, auth header, and error mapping, extract a typed helper into `/lib/http.ts`: `apiFetch<T>(path, init, schema)` that owns the base URL, default headers, the ok-branch, the Zod parse, and the `Result` mapping. The senior posture: **extract on the third repetition, not the first.**

Show the *signature* and a one-call usage in a small `Code` block; do not implement the body (every piece of the body is exactly the five seams the student just learned — say that explicitly so they see the helper is just the canonical shape, factored out).

Reasoning: ending on the extraction closes the arc — the student now sees the canonical shape *is* the reusable unit. Keeping it signature-only respects the "named once, not built" scope and the "extract on the third repetition" rule from Code conventions (§Async / §Module boundaries).

### Optional: hands-on hardening (capstone exercise)

A `ScriptCoding` exercise (vanilla runner, with a stubbed `fetch`) as a recall capstone, if it fits without bloating the lesson. The student is handed a naive `loadInvoice(id)` and must harden it: add the `ok` branch, add the deadline signal, narrow the catch. Tests stub `globalThis.fetch` to return (a) a 200 with valid JSON → expect `{ ok: true }`, (b) a 422 → expect a failure result, not a throw, (c) a rejected promise (network) → expect a failure result, (d) a hang vs `AbortSignal.timeout` → expect a timeout failure. Grading: each `test(...)` asserts one of the four behaviors from the intro, closing the loop on the opening question.

Caveat for the writer: keep the stubbed-`fetch` harness simple; if simulating timeout/abort in the vanilla runner is awkward, drop case (d) and keep (a)–(c), or cut the exercise entirely in favor of the `PredictOutput` and `Sequence` drills already placed. The lesson does not depend on this exercise — it's a bonus active-recall beat. Do not over-invest.

Reasoning: a synthesis exercise that re-runs the four intro failures is the strongest possible close, but live-coding a hardened `fetch` against a stubbed runtime is fiddly. Flag it as cuttable so the writer doesn't burn effort fighting the sandbox.

### External resources (optional)

One or two `ExternalResource` cards: MDN `fetch` / `Response` reference, and the MDN `AbortSignal.timeout` / `AbortSignal.any` page. Optional `VideoCallout` only if a current, high-quality short explainer on the `fetch` resolution model surfaces — do not force one.

---

## Scope

**Prerequisites — redefine in one clause, do not re-teach:**
- async/await, Promises, `Promise.all` (Ch 007).
- `try/catch` narrowing: `error instanceof Error`, `error.name`, never `catch (e: any)` (Ch 008 L2).
- `URL` / `URLSearchParams` for building URLs and query strings (Ch 012 L1).
- That Zod is a runtime validator and `Schema.parse(x)` throws on mismatch (full surface is Ch 042).
- HTTP status semantics, RFC 9457 Problem Details, `Idempotency-Key` (Ch 011) — referenced, not taught.

**This lesson does NOT cover (defer, do not teach):**
- **Reading a body as a stream** (`response.body`, `ReadableStream`, chunk loops, `TextDecoder`) — that's **Lesson 2 of this chapter**. This lesson only uses the *buffering* consumers (`.json()`, `.text()`, etc.). Mention `response.body` exists in one clause at most when introducing the once-only rule; do not read it.
- **SSE, `EventSource`, live channels, the polling/SSE/WebSocket decision** — Lesson 2.
- **The Zod call surface** (schema authoring, `safeParse` vs `parse`, `treeifyError`) — Ch 042. Show only the one-line `Schema.parse(...)` on the success path.
- **The `Result<T>` type and `ok`/`err` helpers** — Ch 043 L3. Use them as named one-liners; do not define the discriminated union.
- **Next.js `fetch` augmentation** (`cache`, `next.revalidate`, `next.tags`) — Ch 032. Named once, not taught.
- **Route-handler authoring** (the receiving side, `Params`/`Body` schemas, the `authedRoute` wrapper) — Ch 046. The triad is shown as the *types* a handler uses, not how to write one.
- **File uploads** with `Blob`/`File`, and **upload-progress** via `XMLHttpRequest` — primitives named, worked examples are Ch 016 L3 / Ch 069.
- **Retries / exponential backoff** — out of scope for the chapter; foreshadow at the third-party-SDK seam only.
- **Cookies, CORS, and `credentials: 'include'` in depth** — Ch 013 / Ch 016. Mention the cross-origin cookie-stripping default in one clause where `Authorization` is discussed; do not teach credentials mode.
- **Installing/comparing `axios`/`ky`/`ofetch`** — one-sentence recognition only.

---

## Code conventions notes for the writer

Skimmed §Async/cancellation/time, §Error handling, §TypeScript, §Function form, §Schemas, §Route handlers.

- **`async`/`await` uniformly**, never `.then` chains in shown code (this is project-shape code, not Promise-mechanics teaching). `return await` inside `try` to preserve the stack trace.
- **Cancellation:** `AbortSignal.timeout(ms)` for deadlines, `AbortSignal.any([...])` to compose — exactly what the lesson teaches. Numeric separators (`5_000`) per house style.
- **Error handling:** functions that fail in expected ways return `Result<T>`; the ok-branch and catch both produce `err(...)`. Throw only for impossible states. Narrow the `unknown` catch binding with `instanceof Error` + `error.name`; never `catch (e: any)`. This is the canonical shape — align the worked example to it.
- **TypeScript:** annotate the **return type of the exported `loadInvoice`/`createInvoice`** function (it's `Promise<Result<Invoice>>` — the signature is part of the lesson). The catch binding is `unknown` (TS default) and is narrowed by `error.name`; the parsed body is `any` from `response.json()` and is narrowed by `Schema.parse` (see body-consumer note — do not call it `unknown`). `type` over `interface`. Single quotes, 2-space indent, trailing commas, semicolons, 80-col.
- **Schemas:** if a schema literal is shown, use the canonical `<entity>Schema` name and v4 top-level builders (`z.uuid()`, `z.iso.datetime()`), but keep it to one line — schema authoring is Ch 042. Do not show `safeParse` here (the success-path uses `parse` on already-ok'd data; that's the trusted-after-ok call). Note: this is a deliberate simplification — the receiving route handler would `safeParse` user input, but the *client* parsing a response it just `ok`-checked uses `parse`. Flag this so the writer doesn't "correct" it.
- **Naming:** `loadInvoice` / `createInvoice` (verb + noun), `apiFetch` for the helper. No `data`, `res2`, `temp`.
- **Route handlers context:** §Route handlers lists "the response is a stream (SSE, file download)" and "a non-browser client" as the triggers to reach past Server Actions — useful framing for the "where do calls live" section, but do not teach handler authoring.

**Deliberate divergences from production shape (flag to downstream agents):**
- Code blocks may **strip imports** and show a single focused function rather than a full `/lib/http.ts` module, per §4 of the pedagogical guidelines. The `Result`/`ok`/`err`/`Schema` symbols appear unimported — that's intentional for display density; they're forward-referenced, not in-scope to define.
- The canonical example uses `parse` (not `safeParse`) on the post-ok success body — deliberate, see Schemas note above.
- Native `fetch` types `response.json()` as `Promise<any>`; the lesson frames the Zod parse as earning back type safety, not as narrowing a TS-provided `unknown`.
