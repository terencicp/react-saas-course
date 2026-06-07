# When to reach past Server Actions

- Title (h1): When to reach past Server Actions
- Sidebar label: Past Server Actions

---

## Lesson framing

**Archetype.** Decision lesson. The student leaves with one durable artifact: the trigger checklist they re-run on every "should this be an action or a `route.ts`?" question for the rest of the course. No deep `route.ts` authoring here — that is lessons 2-4. This lesson is *the boundary decision* plus the file shape and the one caching fact the student must internalize before writing any handler.

**The senior question that drives the lesson** (state implicitly in the intro, do not label it): Server Actions already cover in-app mutations — form submits, action runs, page revalidates. So when does the senior stop reaching for the action and write `route.ts` instead? The lesson installs five concrete triggers and one default ("everything else stays an action").

**What the student already has** (Chapter 043, just finished). The Server Action is the default mutation seam: the typed POST the framework wires for in-app forms, with automatic revalidation, a typed call site, and progressive enhancement. The five-seam shape (parse → authorize → mutate → revalidate → return) is muscle memory. Chapter 011 taught HTTP *from the consumer side* (calling other people's endpoints). This lesson is the first time the student *authors* an HTTP endpoint.

**The pain point this lesson relieves / the failure mode it prevents.** The codebase that ships every endpoint as a `route.ts` "for symmetry" or "because REST feels right" — and silently loses the action's free revalidation, typed call, and progressive enhancement. The inverse failure (trying to make a webhook or a mobile-facing endpoint fit the action's `FormData` contract) is just as real. The lesson's whole job is to make the boundary *crisp* so the student picks the right tool the first time and can defend the choice in review.

**Mental model to leave the student with.** Two seams, one trust posture. The Server Action and the route handler are *both* public, untrusted-input boundaries with the same discipline (parse on entry, authorize before any DB touch). They differ only in **who calls them** and **what they return**: the action is called *as a function by a React component on the same app* and returns a JS `Result`; the handler is called *over HTTP by anything* and returns an HTTP `Response`. The decision rule collapses to one question: **is the caller a React component on this Next.js app?** If yes → action. If no, or if the protocol itself is the contract (cache headers, streaming, a specific status) → handler.

**Cognitive-load sequencing.** (1) Restate the action's working envelope so the student has a concrete "what I'm comparing against." (2) Present the five triggers one at a time, each as "the action *can't* do X, here's why." (3) Snap back to the default rule. (4) *Only then* show the `route.ts` file shape — the student now knows *why* they'd write one before seeing *how*. (5) The one caching fact (dynamic by default). (6) The carry-over threads (seam discipline maps over, auth wrapper ports, don't invent a router) as short closers. Keep the file shape minimal — this is not the contract lesson.

**Tone.** Adult, terse, decision-first. No celebratory framing. This is a reference the student returns to, so headers should be scannable and the trigger names should be memorable.

**Architectural anchors to thread** (inline, at the moment they apply, never bundled): Principle #5 (use the framework's surface, don't invent a parallel router — no Hono/tRPC/Express-on-the-side) lands in the "don't invent a router" closer. The same-trust-posture-as-the-action point (parse-then-authorize) is the spine of the mental model.

---

## Lesson sections

### Introduction (no header — opening prose)

Open on the concrete tension. The student spent Chapter 043 making the Server Action the reflex for every mutation. Good — it *is* the reflex. But name the cracks the student has probably already half-noticed: a Stripe webhook can't submit a form; a mobile app can't `import` and call a Server Action; a public JSON feed needs a GET and the action is POST-only. Frame the lesson as installing the **trigger checklist** that tells the senior exactly when to step outside the action, and — just as important — the rule that keeps them inside it the other 90% of the time.

Preview the end state in one sentence: by the end you can look at any endpoint and say "action" or "handler" with a one-line justification, and you know the `route.ts` file shape and its dynamic-by-default caching posture. Keep it to ~4 sentences, warm and brief.

**Terms to gloss with `<Term>` in this section or first use:**
- **BFF** (Backend-for-Frontend) — a thin server-side endpoint that proxies/aggregates third-party services for your own frontend, with your app's auth shape. Used in the non-React-callers trigger.
- **HMAC** — keyed hash a webhook provider signs the raw request body with; the handler recomputes it over the exact bytes to verify the sender. Used in the webhooks trigger.

---

### The Server Action's working envelope

**Goal:** give the student a concrete, bounded "this is what I'm comparing against" before introducing the triggers. The triggers are *exits from this envelope*, so the envelope must be sharp first.

**Content — restate, do not re-teach** (the student knows this from Ch 043; this is a one-screen recall, framed as the envelope's *edges*):
- POST-only by protocol (the framework wires a POST under the hood).
- Called as a typed function from a React component (Client or Server) on the same app — never a free-standing URL a third party can hit by contract.
- Automatic revalidation via `revalidatePath` / `revalidateTag` / `updateTag`.
- ~1 MB default request body cap.
- Opaque action ID stamped into the bundle (the call site is typed; the wire format is an implementation detail the student doesn't hand-author).
- Returns the canonical `Result` shape the form layer reads directly.
- Degrades gracefully — `<form action>` works with JS disabled (progressive enhancement).

**How to convey:** a compact bulleted "envelope card" is enough — no diagram yet. Frame each bullet as a *boundary* ("POST-only", "~1 MB cap", "React-caller-only") because each is exactly the edge one of the five triggers crosses. End the section with the one-line reflex: *for any in-app mutation that fits this envelope, the action is the 2026 default — don't reach further.*

**Note for downstream agent:** the ~1 MB body cap is the framework default for Server Actions (`serverActions.bodySizeLimit`, default `'1mb'`). Phrase as "~1 MB by default," not a hard protocol limit, so it stays accurate when configured.

---

### Five triggers that flip the choice to a route handler

**Goal:** the heart of the lesson. Five concrete, named, memorable triggers. Each follows the same micro-structure so the student can pattern-match: **(a) the scenario, (b) which edge of the envelope it breaks, (c) the concrete reason the action can't do it.** Keep each trigger to a short paragraph plus, where it sharpens the point, a one-line code fragment.

Use one **h3 per trigger** so the section is scannable as a reference. Lead the section with a one-sentence framing: each trigger is a case where the action's envelope simply *can't stretch* — not a style preference.

#### Non-React callers

A mobile app, a Zapier/n8n integration, a partner backend, a CLI, a webhook from your own other service — anything that can't `import` a Server Action and invoke it as a function needs a real HTTP URL. Server Actions are reachable only from React on the same app; the action ID is an internal bundle artifact, not a public contract. Public REST and BFF surfaces live in `route.ts`. This is the most common trigger in a maturing SaaS.

#### Webhooks (raw-body signature verification)

A provider (Stripe, Resend, Svix-backed senders) POSTs to a fixed URL with a **raw body** that an `HMAC` signature is computed over. The action's `FormData`/typed-payload contract is the wrong shape: it parses the body before you can verify it, and signature verification must run over the *exact bytes received*. The handler reads `await request.text()` to get those bytes, verifies, *then* parses. Show the one load-bearing line: `const raw = await request.text()` with a one-clause note "verify the signature over `raw` before parsing." Name forward: Chapter 063 is built entirely on this; here it is just *why* webhooks force a handler.

#### GET endpoints (cacheable reads for external readers)

Server Actions are POST-only, so any read surface that needs to be a GET — a public `/api/posts/[slug]`, an autocomplete endpoint, a JSON feed, an `.ics` export — needs a route handler. **Critical clarification to prevent a common wrong turn:** in-app reads do *not* need a GET handler — a Server Component reads directly from the database. The GET route handler is for **external** readers, or the rare in-app endpoint a Client Component must fetch because it genuinely can't be a Server Component (name forward: Chapter 076's TanStack Query trigger). Make this explicit; the failure mode is students writing GET handlers for data their own Server Components could read directly.

#### Streaming and large bodies

The action's ~1 MB cap and its buffered request/response model rule out: direct multipart file uploads, AI streaming responses (name forward: the AI SDK's `streamText`, Unit 22), Server-Sent Events for live progress, and file downloads larger than the cap. These need the handler's direct `Request`/`Response` surface and the platform's streaming runtime. Keep this short — it is a *recognition* trigger, the mechanics are out of scope (Unit 22).

#### Custom HTTP semantics

When the endpoint genuinely needs the protocol *as its contract* — `Cache-Control`, `ETag`, content negotiation (`Accept`), conditional requests (`If-None-Match`), or a non-200 status the action's `Result` can't express — the route handler is the only surface that speaks raw HTTP. Frame the senior line: *the protocol is the contract, the handler is the surface that speaks it.* This trigger overlaps with GET (caching) and webhooks (status), but it stands alone for the case where an in-app-shaped operation still needs an HTTP-native response (e.g. a 304, a redirect for a non-React POST caller).

**After the five h3s — the default, restated as its own short beat (not a separate header):** Everything else stays a Server Action. Every in-app form, every authenticated dashboard mutation, every CRUD operation a React component invokes. The rule of thumb, stated plainly so it sticks: **if the caller is a React component on the same Next.js app, write the action.** Past that envelope, the handler earns its weight.

**Diagram — `StateMachineWalker` (kind="decision").** This is the single most valuable interactive in the lesson and the artifact the student returns to. It forces the student through the senior's question *order* rather than memorizing a flat list. Place it right after the default-restated beat, as the synthesis of the whole section. Do NOT wrap in `<Figure>` (the component is its own card).

Proposed walk (downstream agent: refine wording, keep the order — caller identity is asked first because it resolves the majority of cases):
- Root question: **"Who calls this endpoint?"**
  - Branch "A React component on this same app" → next question "Does it need raw HTTP — streaming, custom cache/status headers, or a body over ~1 MB?"
    - "No" → **Leaf: Server Action** (verdict). Reason: typed call, free revalidation, progressive enhancement — the 2026 default.
    - "Yes — streaming / large body" → **Leaf: Route handler (streaming)**. Reason: the action buffers and caps at ~1 MB.
    - "Yes — custom cache/status/conditional headers" → **Leaf: Route handler (HTTP semantics)**. Reason: the protocol is the contract.
  - Branch "Something that isn't React on this app (mobile, partner, CLI, BFF)" → **Leaf: Route handler (public/BFF)**. Reason: nothing outside React can import an action.
  - Branch "A third-party provider POSTing events (Stripe, Resend, Svix)" → **Leaf: Route handler (webhook)**. Reason: raw-body signature verification needs the exact bytes; see Chapter 063.
  - Branch "A browser hitting a cacheable public read URL" → **Leaf: Route handler (GET)**. Reason: actions are POST-only; in-app reads still belong in a Server Component.

Each leaf body: one or two sentences naming the *reason* (not just the verdict) and, where relevant, the forward pointer (Ch 063, Unit 22, Ch 076). The pedagogical goal: internalize that the decision is a *short ordered interrogation* (caller first), not a checklist lookup.

**Exercise — `Buckets` (classification drill).** After the walker, let the student *practice* the boundary. Two buckets: **"Server Action"** and **"Route handler."** ~8 scenario cards, each a realistic one-liner the student must sort:
- "Submit the 'edit invoice' form from the dashboard" → Action
- "Stripe sends a `payment_intent.succeeded` event" → Handler
- "The iOS app fetches the user's invoice list" → Handler
- "A button in the settings page archives a project" → Action
- "Serve a public `/api/changelog.json` feed cached at the CDN" → Handler
- "Stream an AI-generated summary token by token" → Handler
- "Add a comment from the in-app comment box" → Action
- "A Zapier zap creates a contact in your CRM" → Handler

Goal: cement that "caller identity + protocol need" is the deciding axis, not the verb (create/read/update) or the entity. Grading: each card has one correct bucket; the mix is deliberately weighted so the student can't pass by always picking "handler."

---

### The `route.ts` file shape

**Goal:** now that the student knows *when*, show *what a handler looks like* — minimally. This is orientation, not the contract lesson. The student should recognize a `route.ts` file and understand the method-export convention, the signature (including the Next.js 16 `params` Promise), and the auto-`OPTIONS`/`405` behavior. Deliberately **defer** Zod parsing, Problem Details, and status-code selection to lessons 2-3 — say so in one clause so the student knows more is coming.

**Content:**
- A file named `route.ts` placed at `app/api/.../route.ts` (or anywhere in `app/` that isn't a `page.tsx` segment) exports `async` functions **named for HTTP methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. The framework wires the route by file location and dispatches by method name — no manual router, no method `switch`.
- The signature: each handler receives a `NextRequest` and, for dynamic segments, a context whose `params` is a **`Promise`** in Next.js 16 (matching the page convention) — `await` it before use. Mention the Next.js 16 globally-available `RouteContext<'/path'>` helper type as the typed way to receive context (generated by `next dev`/`build`, no import needed) — a small senior detail, one sentence.
- Returns a `Response` or `NextResponse`.
- `OPTIONS` is **auto-implemented** from the methods you export (CORS preflight), and an unsupported method returns **405** automatically with an `Allow` header listing the exported methods. Senior call: let the framework return these; hand-write `OPTIONS` only when the response headers must diverge.
- Each method export is its own function — `GET` and `POST` live side by side in one file; **do not** write one fat handler with a manual `if (method === ...)` switch.

**Components:**
- A small **`FileTree`** showing the segment placement, contrasting a page route and an API route so the no-coexistence rule (next section) lands visually. Example: `app/dashboard/page.tsx` next to `app/api/invoices/[invoiceId]/route.ts`.
- **`AnnotatedCode`** for a single minimal handler — a `GET` and a `POST` in one `route.ts`, ~10-12 lines, intentionally light (no Zod, no Problem Details yet, with a `// parse + authorize covered in the next lessons` comment so the student isn't misled into thinking this is the production shape). Steps: (1) the two method-named exports and the no-switch dispatch; (2) the `NextRequest` + `await params` signature, color the `await params` (this is the #1 Next.js 16 gotcha for migrators); (3) returning `NextResponse.json(...)` vs a bare `Response`; (4) a one-step callout that `OPTIONS`/`405` come for free. Keep prose to ≤6 lines per step.

**`CodeTooltips`** is optional here — if used, gloss `NextRequest` (a thin superset of the Web `Request` with `.nextUrl`, `.cookies`, geo helpers) and `NextResponse` (the `Response` superset with `.json()`, cookie, and redirect helpers) on first appearance.

---

### A segment is either a page or an API route, never both

**Goal:** name the one structural conflict so the student never hits it. Short — a single beat, its own header because it is a concrete rule the student will otherwise trip on.

**Content:** `route.ts` and `page.tsx` cannot coexist at the same route segment — the framework can't serve both a UI page and an API route at one path. The convention: a segment is *either* a page *or* an API route. API routes conventionally live under `app/api/...` precisely to keep them off the page tree. This is why the `FileTree` above puts the handler under `app/api/`. One or two sentences plus a pointer back to the FileTree; no new diagram.

---

### Caching: route handlers are dynamic by default

**Goal:** install the single caching fact the student must carry before writing any handler, and the senior posture behind it. This is *named once*, not a full caching lesson (that is Ch 032 / Unit 14).

**Content:**
- GET route handlers run **at request time by default** — dynamic, uncached, no automatic full-route cache. (This is the Next.js 15→16 posture; under Cache Components, GET handlers follow the same prerender model as pages: dynamic unless you opt in.)
- To cache, you opt in **deliberately at the endpoint**: either `'use cache'` (Cache Components) or explicit response headers (`Cache-Control: public, s-maxage=…`).
- **Gotcha worth its own clause (verified, Next.js 16):** `'use cache'` **cannot** be placed directly inside a route-handler body — extract the cacheable work into a helper function and mark *that*. State this plainly; it is a real footgun.
- **Downstream-agent note:** the docs also surface the older route-segment-config form (`export const revalidate = 60`). The course's caching convention is Cache Components (`'use cache'` + `cacheLife`) and explicit headers — prefer those; do **not** lead with `export const revalidate`. Mention it only if a one-clause "you'll also see the legacy segment-config form" aside genuinely helps; otherwise omit.
- The senior anchor (the *why*): most route handlers serve **authenticated, per-user** requests, where caching is *wrong* by default — a shared cache could serve one user's data to another. So dynamic-by-default is the safe default; you add caching only at the specific endpoint that serves public, shareable data. Frame caching as opt-in-where-correct, never global.

**Component:** prose-first. Optionally a tiny two-row **`CodeVariants`** ("Default — dynamic" vs "Opt-in — cached public read"): variant A a plain GET returning `NextResponse.json(...)` (no headers), variant B the same with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` *and* a one-line note that the data must be non-user-specific. Keep both panes tiny. If it risks pulling focus from the decision spine, downstream agent may demote to a single annotated example — the *fact* matters more than the syntax here.

**`Aside` (caution):** "Never set `Cache-Control: public` on an endpoint that returns per-user data — the CDN caches it and serves another user's response. The privacy bug ships silently and bites in production." This is the highest-stakes watch-out in the lesson; give it an aside.

---

### The same seam, a different wire format

**Goal:** reassure the student that the discipline they already own *transfers* — the handler is not a new mental model, just a new return shape. This is the bridge to lessons 2-4 and the payoff of the "two seams, one trust posture" mental model.

**Content — map the five-seam action shape onto the handler one-to-one:** parse → authorize → mutate → revalidate → return, with exactly two substitutions:
- *revalidate* → "set cache headers / call `revalidateTag(tag, profile)` when the handler mutates" (note the Next.js 16 required second `cacheLife` argument, `'max'` as the senior default — one clause, this is a known deprecation).
- *return Result* → "return a `Response` with a status code and body."
Everything else — parse on entry with `safeParse`, authorize before any DB touch — is **identical**. The handler is a public endpoint with the *same trust posture* as the action.

**Two carry-over threads, each one beat (named, not taught):**
- **Authorization ports with the boundary.** The action's `authedAction(role, schema, fn)` wrapper becomes `authedRoute(role, schema, handler)` at the handler boundary — same parse-then-authorize order, same trust posture, different return shape. Name forward: Chapter 057 lesson 3 builds it. The point here: *don't* hand-roll a parallel auth check in every handler.
- **Don't invent a parallel router** (Principle #5, restated). `route.ts` files in the App Router *are* the API surface. No Hono, no tRPC, no Express-on-the-side. Name the one trigger that would ever flip to Hono — an externally-published, versioned REST API with autogenerated OpenAPI and a shipped SDK — and mark it out of scope: most SaaS products don't ship a public API in year one, and when they do, Hono *inside a single Next.js route handler* is the senior reach (named, not taught).

**Component — `Figure` with a side-by-side mapping.** A simple two-column visual (HTML+CSS table or `ArrowDiagram` is overkill — a clean two-column table inside `<Figure>` is best): left column "Server Action seam" (parse / authorize / mutate / revalidate / return Result), right column "Route handler seam" (parse / authorize / mutate / set headers or `revalidateTag` / return Response). Highlight the two rows that change. Pedagogical goal: the student *sees* that only the last two rows differ, cementing "same seam, different wire format." Keep it horizontal and short.

---

### External resources (optional, end of lesson)

One or two `ExternalResource` cards if a strong fit is found during writing:
- Next.js docs — Route Handlers (Getting Started).
- Next.js docs — `route.js` file convention (the `params` Promise + `RouteContext` signature reference).
Only include if current and on-point; do not pad.

---

## Scope

**This lesson covers:** the five triggers that flip Server Action → route handler; the default rule (React-caller-on-this-app → action); the `route.ts` file shape (method exports, `NextRequest`/`await params`/`RouteContext`, auto-`OPTIONS`/`405`, no-switch dispatch); the page-vs-route segment conflict; the dynamic-by-default caching posture and the opt-in mechanism (named, including the `'use cache'`-not-in-handler-body gotcha); and the seam-discipline carry-over (mapping the five seams, naming the `authedRoute` port and the no-parallel-router principle).

**Explicitly out of scope — defer, do not teach (redefine prerequisites in one clause only where needed):**
- **The Zod request/response contract** — `Params`/`Headers`/`Query`/`Body` schemas, parse order, typed response schemas, RFC 9457 Problem Details as the error shape. → Lesson 2. This lesson's code samples may *gesture* at "parse on entry" but must NOT author the schemas or the Problem body. Use a `// covered next lesson` comment.
- **HTTP method-by-intent and the status-code table** (GET/POST/PUT/PATCH/DELETE selection, 400 vs 422, 404-over-403 on tenant scope, 409, the `Idempotency-Key` operationalization). → Lesson 3. Mention method *names* exist on the file shape; do not teach which method maps to which intent or which status code to return.
- **List endpoints** — filter/sort/search/paginate, the query schema, cursors, the `{ data, pageInfo }` envelope, the shared `where`-builder. → Lesson 4.
- **Streaming bodies, SSE, AI streaming mechanics** → Unit 22 (named as a trigger only).
- **Webhook signature verification mechanics and the dedup transaction** → Chapter 063 (named as a trigger only; show `request.text()` as *why* webhooks force a handler, not how to verify).
- **The `authedRoute` wrapper implementation** → Chapter 057 lesson 3 (named as the carry-over, not built).
- **Full HTTP caching at the CDN/edge** → Chapter 032 / Unit 14 (only the dynamic-by-default *fact* + the opt-in *name* belong here).
- **The Hono / OpenAPI published-API track** → named once, out of scope.
- **CORS preflight internals** — Chapter 012 already taught CORS from the consumer side; here only mention that `OPTIONS` is auto-implemented. Do not re-teach the preflight dance.

**Prerequisites to assume (do not re-teach; one-clause refresher max if invoked):** Server Actions and the five-seam shape (Ch 043); Zod `safeParse` as the wire-boundary reflex (Ch 042); HTTP methods/status codes/Problem Details *from the consumer side* and idempotency as a concept (Ch 011); `revalidatePath`/`revalidateTag` (Ch 043 / caching conventions).

---

## Notes for downstream agents (reconciliation + conventions)

- **Trigger-list reconciliation.** `Code conventions.md` (Route handlers section) lists five triggers worded differently from this lesson's five — notably it splits out "framework-named files (OG cards, sitemaps, `robots`, `manifest`)" as a trigger and folds "custom status/URL" together. This lesson follows the **chapter outline's** five (non-React callers, webhooks, GETs, streaming/large bodies, custom HTTP semantics) because they are the pedagogically cleaner cut for a *decision* lesson. The framework-named-files case (OG/sitemap/`robots.txt`) can be mentioned in *one clause* under either the GET trigger or the file-shape section as "the framework also names some special files (`opengraph-image`, `sitemap.ts`, `robots.ts`) that compile to handlers — same surface, covered where they're needed." Do not make it a sixth trigger; keep the five clean.
- **Conventions to honor in code samples:** named exports for `GET`/`POST` (the `route.ts` default-export exception is framework-dictated and applies to the *file as a module*, but the method handlers themselves are named exports — show them as such); `safeParse` (not `parse`) is the wire-boundary reflex even though this lesson defers the schema (so any gestured parse uses `safeParse`); `revalidateTag(tag, profile)` always two-arg (`'max'` default). Public-route files live under `app/api/<...>/route.ts`.
- **Deliberate simplifications (flag so reviewers don't "fix" them):** the `AnnotatedCode` handler omits Zod parsing, authorization, and Problem Details *on purpose* — those are lessons 2-3. Mark with an in-code comment. The caching `CodeVariants` shows headers without the surrounding auth/parse for focus.
- **Verified facts (June 2026):** route-handler `params` is a `Promise` in Next.js 16 (await before use); `RouteContext<'/path'>` is a globally-available generated helper type (no import); GET route handlers are dynamic/request-time by default; `'use cache'` cannot be used directly inside a route-handler body (extract to a helper) — state this gotcha. Server Action body cap is ~1 MB by default (`serverActions.bodySizeLimit`).
