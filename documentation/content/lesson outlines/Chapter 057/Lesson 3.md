# The authedRoute twin

Sidebar label: The authedRoute twin

---

## Lesson framing

This is a **port lesson**, not a new-concept lesson. The discipline — resolve session, authorize role, parse input, then run the work — was fully taught in lesson 2 (`authedAction`). This lesson moves that exact discipline to the *other* untrusted-input seam: the route handler (`route.ts`), the seam for non-React callers (webhooks, mobile apps, partner servers). The single new idea is that the **response wire format differs** (HTTP status + RFC 9457 Problem Details, not a `Result`), while the **discipline is identical**. The load-bearing teaching move is the side-by-side: `authedAction` and `authedRoute` have the same signature `(role, schema, fn)` and the same four gates; only the failure exit changes shape.

Because the discipline is already internalized, this lesson is **shorter and faster** than lesson 2. Do not re-teach the missing-role-check threat model, the fail-closed reflex, or the Principle #5 carve-out — those are owned by lesson 2 and only referenced. Spend the saved budget on the genuinely new material: the HTTP status-code map, the Problem Details body, the cheapest-first multi-source parse (path/query/body, not `FormData`), and the **shared-`/lib`-function pattern** that lets one mutation be called from both seams without duplicating authz or business logic.

Mental model the student should leave with: *two doors into the same room.* A React form comes through `authedAction`; a partner's JSON POST comes through `authedRoute`. Both doors check the same three things at the threshold; both lead to the same business function in `/lib`. The door you pick is decided by the caller, not by preference — and the five-trigger threshold from chapter 046 lesson 1 decides it.

Senior framing that must survive: a route handler is a *deliberate* reach, not a reflex. Juniors expose `/api/...` for internal mutations "to have an API." The senior call is Server Actions for React callers, route handlers only when the caller shape forces it. Both seams are equally fenced; neither is the "real" API.

Key pain points to pre-empt:
- Returning `Result` (the `{ ok: false }` envelope) from a route handler — wrong shape; HTTP clients expect a status code, not a 200 with an error body.
- `redirect()` inside a route handler — it only works in RSC/Server Actions; a handler must `return` a `Response`.
- The silent-200-on-empty trap: a tenant-scoped read that finds nothing for a *named* entity must return 404, not an empty 200 — this is where cross-tenant leakage hides.
- Confusing 400 (malformed/unparseable) with 422 (well-formed but fails schema). The lesson teaches the fuller table than the chapter outline's shorthand (see Scope note).

Cognitive-load plan: open with usage (`authedRoute` call site) before implementation, exactly as lesson 2 did, so the two lessons rhyme. Lead the whole lesson with the side-by-side comparison so the student anchors on "same shape, different exit" before any new detail lands.

---

## Lesson sections

### Introduction (no header)

Warm, brief, ~2 short paragraphs. Connect back: "Last lesson you built `authedAction` and closed the missing-role-check bug at the Server Action boundary. But Server Actions are only one door into your app." Name the other callers concretely — a Stripe webhook, a partner's nightly job server, a future mobile client — none of them submit a React form; they POST JSON to a `route.ts`. They carry the *same* untrusted input and need the *same* three checks. State the lesson's promise: port the wrapper to `authedRoute`, learn the one thing that genuinely differs (the HTTP wire format), and learn how to share one business function across both doors so you never write the mutation twice.

Implicit senior question (do not label it as such): *what's the equivalent wrapper that keeps the missing-call bug class structurally hard at every untrusted-input seam, not just the React one?*

Set expectation explicitly that this is the shorter twin of last lesson — sets pace, rewards the student for prior work.

### Two doors, one discipline

Goal: establish the mental model and the decision rule before any code detail. This is the conceptual spine.

Content:
- The two seams and who uses each. Server Action = the React caller's door (same-origin form / `useActionState`). Route handler = the non-React caller's door (webhook, third-party server, mobile client, anything speaking raw HTTP).
- The decision rule: reach for a route handler **only** when the caller shape forces it — reuse the five-trigger threshold from chapter 046 lesson 1 (non-browser client, cacheable HTTP response, streaming response, third party requires a specific URL/status, framework-named file). Otherwise Server Actions win. State the anti-pattern plainly: don't expose `/api/...` for internal React mutations "to have an API."
- The payoff sentence: both doors are equally fenced. The route handler is not a back door with weaker checks; it runs the same resolve→authorize→parse→work discipline. The *only* thing that changes is what comes back on the wire.

Diagram — **`ArrowDiagram`** (or a simple two-column HTML figure inside `<Figure>` if arrows would cross text). Pedagogical goal: show two distinct entry doors (a form box, a JSON-POST box) both arrowing into a single shared business function box in `/lib`, which then arrows to the DB. Label the form→function arrow "via authedAction → Result" and the POST→function arrow "via authedRoute → Response". This plants the shared-function payoff visually *before* it's taught in prose, and makes "same room, two doors" literal. Keep horizontal, cap height. If arrow routing is fiddly, fall back to a 3-box left/right HTML grid (two doors left, one function center, DB right) with color-matched tints instead of curves.

Tooltip terms (`Term`): **route handler** (a `route.ts` file exporting `GET`/`POST`/… functions that respond to raw HTTP, Next's non-React server seam), **webhook** (an HTTP callback a third-party service POSTs to your URL when an event happens).

### `authedRoute(role, schema, fn)`: the same signature

Goal: deliver the central "it's the same shape" beat. Usage-first.

Content:
- Show the signature and a call site *before* the implementation, mirroring lesson 2's pedagogy. Same first two args as `authedAction` (`role: Role`, `schema`), third arg differs: `fn: (input, ctx) => Promise<Response>` — returns a `Response`, not a `Result`.
- The `ctx` payload is **identical** to lesson 2: `{ user, orgId, role, db }` where `db = tenantDb(orgId)`. Say explicitly: nothing about resolve/authorize/the context changes; reuse the same `requireOrgUser` helper, just sourced from `request.headers` instead of `await headers()`.
- The call site lives inside a `route.ts` and is assigned to a verb export. Show a `GET` or `POST` export wired to `authedRoute(...)`.

The load-bearing visual — **`CodeVariants`** with two tabs, `authedAction` vs `authedRoute`, same call shape side by side. This is THE figure of the lesson (chapter outline calls it "the load-bearing visual"). Tab 1: a small `authedAction('admin', schema, async (input, ctx) => { ...; return ok(row); })` Server Action. Tab 2: the route-handler twin `export const POST = authedRoute('admin', schema, async (input, ctx) => Response.json(row, { status: 201 }));`. Use the prose under each tab (six lines max) to name the single difference: tab 1 "returns a `Result` the form reads inline," tab 2 "returns a `Response` the HTTP client reads as status + body." Same `role`, same `schema`, same `ctx`, different return type — that's the entire delta.

Note the verb-export shape: each HTTP method is its own named export (`export const GET = ...`, `export const POST = ...`); the conventions file confirms named exports per verb in `route.ts` (one of the few files where the framework dictates export shape — but these are named, not default). One `route.ts` can hold several verb exports, each its own `authedRoute` call with its own schema.

Code conventions to honor: import paths must match lesson 2 exactly — `requireOrgUser` from `@/lib/auth`, `roleAtLeast`/`type Role` from `@/lib/auth/roles`, `tenantDb` from `@/lib/tenant-db`. New file location: `lib/auth/authed-route.ts`, sibling to `authed-action.ts`, starts with `import 'server-only'`. Server Action / business-fn naming stays verb+noun (no `Action`/`Route` suffix on the *business* functions).

### Parsing from three sources, cheapest first

Goal: teach the one mechanical difference in the *input* side (the output side — Response — is the next section). Route handlers don't get a flat `FormData`; input arrives from path params, query string, and request body.

Content:
- Where input lives: `params` (typed path segments — in Next 16 the handler's second arg is `ctx` typed via the global `RouteContext<'/path/[id]'>` helper, and `params` is a Promise you `await`), `searchParams` from the request URL, and the body via `await request.json()` (or `request.formData()` for form-encoded posts). Contrast with `authedAction`, which only ever sees `FormData` → `Object.fromEntries`. (Verified: Next 16.2 ships `RouteContext<'/users/[id]'>` and `await ctx.params`.)
- The schema shape, per chapter 046 lesson 2: a top-level object `{ params, query, body }` with a sub-schema for each source; the wrapper parses each from its own source and assembles the typed input handed to `fn`.
- **Cheapest-first ordering** (the senior reflex, from chapter 046): parse `params` and `query` before reading the body. A malformed UUID in the path fails fast — return before ever awaiting `request.json()`. Cheapest disqualifying check runs first; no work spent reading a body for a request that's already invalid.
- Note the gate-order interaction: authorize (role) still runs before the body parse, same as lesson 2 — but path/query parsing can reasonably precede or interleave with auth since they're trivially cheap and often needed to even identify the resource. Keep it simple: resolve → authorize → parse(params, query, body cheapest-first) → call. Don't over-engineer the ordering nuance; one clear sentence.

Component: **`AnnotatedCode`** on the wrapper internals (single block, multiple focus points). Steps highlight: (1) `requireOrgUser({ headers: request.headers })` resolve, (2) `roleAtLeast` authorize → returns a 403 `Response` not a `Result`, (3) the three-source parse in cheapest-first order, each failure → 400/422 `Response`, (4) build `ctx`, call `fn`, return its `Response`. Keep `maxLines` capped (≤18) — the wrapper is the longest code in the lesson; let it scroll like lesson 2's did. Mirror lesson 2's four-color step convention (blue/green/orange/violet) so the parallel is visual.

Tooltip term: **path params** vs **query string** if the student needs the distinction refreshed (keep terse — both were taught in chapter 046).

### The status-code map: 400, 401, 403, 404, 422

Goal: the genuinely new senior content. Each failure category maps to a specific HTTP status. This replaces the `Result` codes from lesson 2 with HTTP semantics.

Content — the map (teach the fuller table than the chapter outline's "401/403/422/404" shorthand; align with the conventions file and chapter 046 lesson 3):
- **401 Unauthorized** — no valid session. (The wrapper lets `requireOrgUser` resolve from headers; no session → 401. Note: unlike the action seam, a route handler does NOT redirect — there's no browser to navigate; it returns 401 and the client decides what to do.)
- **403 Forbidden** — valid session, role below the floor. The route-seam analog of `err('forbidden')`.
- **400 Bad Request** — the input is *malformed* / unparseable before schema validation even applies (bad JSON body, non-UUID where a UUID path segment is required).
- **422 Unprocessable Entity** — the input is well-formed but *fails the schema* (a string where a number is needed, a missing required field). This is the route-seam analog of `err('validation')`. The 400-vs-422 split is a real review distinction; make it crisp.
- **404 Not Found** — session + role + schema all pass, but the entity doesn't exist *in this org*. The senior posture (chapter 046 lesson 3, restate): **prefer 404 over 403 on cross-tenant access.** "The resource doesn't exist for you" is the right user-facing answer to "you tried to read another org's row" — it leaks no existence information. The wrapper/handler returns 404 when a tenant-scoped read inside `fn` comes back empty for a named entity.

The 401-vs-redirect contrast is the sharpest teaching beat that ties back to lesson 2: same `requireOrgUser`, but the action wrapper let the redirect fly (browser navigation) while the route wrapper converts "no session" into a **401 Response** because the caller is a program, not a browser. Call this out explicitly — it's the cleanest illustration of "same discipline, different exit."

Visual — a compact reference table (plain markdown table earns its weight here; the chapter outline explicitly calls a small table load-bearing). Columns: *Failure* | *HTTP status* | *Action-seam analog*. Rows: no session → 401 → (action redirects); below role → 403 → `err('forbidden')`; malformed input → 400 → (n/a, FormData rarely malformed); schema fails → 422 → `err('validation')`; entity missing in org → 404 → (action's own not-found). The third column makes the port explicit — every HTTP status has a lesson-2 counterpart.

Optionally a tiny **`Matching`** exercise here (left: failure cause; right: status code) to drill the map — quick, low-friction, high retention for a lookup table. Keep it to 5 pairs. This is a strong fit because the map is exactly the kind of fact set matching drills cement.

Tooltip terms (`Term`): expand acronyms only if non-obvious — **401/403/404/422** could each get a one-line `Term` if not already drilled, but be sparing; the table already defines them. Prefer the table over tooltips here.

### The Problem Details response body

Goal: teach the standardized error wire format. One shape, every error response.

Content:
- RFC 9457 **Problem Details**: error responses carry `Content-Type: application/problem+json` with a body of `{ type, title, status, detail, instance }`, plus a `fieldErrors` (or `errors`) extension for validation failures carrying the per-field messages (the same `Record<string, string[]>` shape `z.flattenError` produces — connect it to lesson 2's `fieldErrors`).
- Why standardize: clients write *one* error renderer. Every handler's failure looks the same on the wire, so a partner integrating your API parses errors once.
- The `Problem` schema/helper lives once in `src/lib/http/problem.ts` (per chapter outline) — the wrapper's failure branches build the body through this helper; the conventions file confirms `application/problem+json` as canonical. Note chapter 046 lesson 2 *owns* authoring this schema at depth — here we *consume* it, mirror the "schema authored upstream, consumed here" framing.
- Success responses, by contrast, are plain `application/json` via `Response.json(data, { status })` — 200 read, 201 create, 204 delete (no body), 200 patch. Reuse the status-by-method table from chapter 046 lesson 3 (one sentence + inline list, don't re-derive).

Component: a small **`Code`** block showing a 422 Problem Details JSON response body (concrete, readable) next to the success `Response.json(row, { status: 201 })` line. Could pair into the same `AnnotatedCode` or keep as two adjacent `Code` blocks. Keep it short — the shape is the lesson, not the field semantics (those are chapter 046's).

Watch-out (inline `Aside` caution, placed here where Problem Details is taught): **never return a 200 with `{ ok: false, error }` from a route handler.** That's the `Result` shape leaking to the wrong seam — it breaks every standard HTTP client, which keys off the status code. HTTP errors are statuses, not a 200 envelope. This is the single most common port mistake; it earns a caution box right where the response shape is taught.

### One business function, both doors

Goal: the architectural payoff and the most reusable takeaway. When the same mutation must be callable from both seams, extract the work to a pure `/lib` function; each seam wraps it.

Content:
- The pattern: extract the mutation to `createInvoice(input, ctx): Promise<Result<Invoice>>` in `src/lib/invoices/`. The Server Action wraps it via `authedAction`; the route handler wraps it via `authedRoute` and maps its `Result` to a `Response`. Both seams have authz at the boundary; the shared function has *no notion of HTTP or FormData*.
- This is Architectural Principle #3 made concrete (pure functions in `/lib`, side effects at named boundaries) — name it inline at the moment it applies, per pedagogical guidelines.
- The mapping detail worth showing: the route handler calls the shared fn, gets a `Result`, and translates — `result.ok ? Response.json(result.data, { status: 201 }) : problemFrom(result.error)` where `problemFrom` maps a `Result` error code to the right status (`'forbidden'`→403, `'validation'`→422, `'conflict'`→409, `'not-found'`→404). This closes the loop: the business fn speaks `Result`; the action seam returns it directly; the route seam translates it to HTTP. Same value, two presentations.
- The discipline that ties it together: authz lives at *each* boundary (both wrappers run it), not in the shared fn — the shared fn assumes it's already authorized and scoped (it receives `ctx.db` already tenant-bound). Don't put role checks in the shared fn; don't call one seam from the other.

Diagram or sequence — a small **`DiagramSequence`** (2–4 steps) tracing one logical request through the shared-function pattern, OR fold this into the "Two doors" `ArrowDiagram` from earlier and reference it back. Prefer a lightweight visual; the prose carries most of it. If using `DiagramSequence`: step 1 caller (form OR POST) hits its door, step 2 wrapper runs resolve→authorize→parse, step 3 wrapper calls shared `/lib` fn (returns `Result`), step 4 each door presents the result (form: `Result` inline; route: translated to `Response`). The teaching goal: the shared fn is identical regardless of door; only the entry and exit translate.

Exercise — **`ScriptCoding`** with `runner="sandpack"` (TS required), the chapter outline's named exercise: "take a Server Action from lesson 2 and write the route-handler twin sharing a `/lib` function." Design notes for the build agent:
- Same constraint as lesson 2's exercise: the real wrapper can't run in Sandpack (needs `requireOrgUser`/Next internals). Ship a **test-double** `authedRoute` keeping the shape identical (`authedRoute(role, schema, fn)` returning a callable that takes a fake `request`), resolving ctx from an injectable `getCtx()`/`currentCtx` setter (admin vs member), running the same gate order, and returning a real `Response` (use the global `Response`/`Response.json`, available in modern runtimes; if not, a tiny `{ status, body }` shim).
- Provide shims: `roleAtLeast`+`ROLE_RANK`, a fake tenant `db` with an in-memory store, a hand-rolled `safeParse` (no `zod` dep) on a `{ body: { id } }` schema, and a `problemFrom`/`Problem` shim.
- Starter ships a working shared `createCustomer`/`deleteCustomer` `/lib` fn returning `Result`, plus an `authedAction`-wrapped action (given). The student writes the `authedRoute`-wrapped `POST`/`DELETE` export that calls the *same* shared fn and translates its `Result` to a `Response` with the correct status.
- Tests (jest-flavoured, ~4): (1) member ctx → response `status === 403`, store unchanged; (2) admin ctx + valid input → `status === 201` (or 200/204 per verb), store mutated; (3) admin ctx + invalid input → `status === 422`; (4) the *shared fn* is the same reference/behavior used by both seams (assert the action and the route produce the same store mutation for the same input) — this is the point of the exercise.
- Reference solution behind `<details>`.
- Fallback if Sandpack plumbing is too heavy: a `Matching` (failure → status) plus a `Sequence` ordering drill ("put the route wrapper's gates in order: resolve → authorize → parse → call → translate to Response"). Prefer the ScriptCoding — the guided twin-writing is the stronger exercise and mirrors lesson 2.

### The seams this wrapper deliberately leaves alone

Goal: bound the wrapper (mirrors lesson 2's "the one wrapper we sanction" / "what the wrapper does not do"), name forward-pointers once, and surface the route-specific watch-outs in the section that teaches the boundary they qualify. Keep tight — these are "name the seam, point forward," not full treatments.

Content (each one sentence + a forward pointer, grouped as prose with at most one `Aside`):
- **CORS.** Same-origin handlers need none; public-API handlers need `Access-Control-Allow-Origin`/`-Headers`. The wrapper doesn't do CORS — it's a `next.config.ts` / middleware concern. Name the seam, don't bury it inside `authedRoute`.
- **Idempotency-Key.** Public handlers accepting retried writes honor the `Idempotency-Key` header; the wrapper has a seam for it (an optional flag) but the full dedup-table pattern is owned by chapter 063's webhook lesson. Point forward.
- **Bearer-token / machine-to-machine auth.** The default identity path is the session cookie (route handlers receive the same cookies as actions). `Authorization: Bearer <jwt>` is a separate identity model not built in this chapter — don't trust bearer headers without a designed verification path. Name once.
- **Streaming responses.** Some handlers stream (CSV export, SSE). The wrapper still runs authz at entry; `fn` returns a `Response` whose body is a `ReadableStream`. The senior point: the authz check happens *before the first byte goes out* — streaming doesn't escape the discipline. One sentence; it's a reassurance, not a build.

Route-specific watch-outs to weave in (each placed as a short caution where it fits, not bundled into a "watch-outs" section — per the outline-writing rules):
- `redirect()` *technically* works in a route handler (current Next serves a 307; 303 from a Server Action) — but it throws a navigation, which is the wrong posture for an API caller (a program, not a browser). The senior call: an API handler returns an explicit status `Response` (`Response.redirect(url, 303)` or a `NextResponse.redirect`) only when a redirect is genuinely the intent, which is rare for JSON APIs. Frame this as "don't throw navigations at programmatic callers," NOT "redirect doesn't work here" (that claim is outdated — verified against current Next docs). → belongs near the status-map or response section.
- Don't call an `authedAction` from inside a route handler (different execution context) — prefer the shared `/lib` function. → belongs in "One business function, both doors."
- The silent-200-on-empty trap (tenant read returns nothing for a named entity → must be 404, not empty 200). → strongest placement is in the status-map section (404 row) AND reinforced here; it's the cross-tenant-leak watch-out.
- Caching posture under Cache Components (this project runs `cacheComponents: true`): a `GET` handler that reads `request.headers`/`cookies()` is *automatically* dynamic — and `authedRoute` always reads the session from `request.headers`, so any `authedRoute`-wrapped handler is dynamic by construction. No explicit `force-dynamic` needed for authed handlers (verified against Next 16.2 docs: accessing request headers/cookies terminates prerendering). One sentence; correct the chapter-outline shorthand that implied an explicit opt-out is always required.

### Where the discipline goes next (closing)

Brief recap + forward pointer, mirroring lesson 2's closer. Recap: you now have both wrappers — `authedAction` for the React door, `authedRoute` for the HTTP door — same three checks, same `ctx`, same shared `/lib` functions; only the wire format differs. Forward: the next lesson (chapter 057 lesson 4) puts `authedAction` to real work building the five member-management flows; the lesson after (chapter 057 lesson 5) lands the audit-log write that lives inside the business function. Note that the member-management flows use Server Actions (the dashboard is React), so route handlers aren't required there — reinforces "pick the door by caller."

Optional **`ExternalResource`** card: the Next.js route-handlers docs and/or the RFC 9457 spec page. Include only if it adds genuine value; the lesson is self-contained.

---

## Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- `authedAction(role, schema, fn)`, its four gates, the `ctx = { user, orgId, role, db }` payload, the `Result`/`err`/`ok` contract — all from lesson 2; reference, don't rebuild. The student arrives fluent in these.
- `requireOrgUser()` returning `{ user, orgId, role }` and reading role fresh per request — lesson 1; reference.
- `tenantDb(orgId)` as the tenant-scoped client — chapter 056 lesson 2; reference.
- `roleAtLeast` / `ROLE_RANK` / the `Role` union — lesson 1; reference.
- The five-trigger threshold for choosing a route handler over a Server Action — chapter 046 lesson 1; restate as a one-line rule, don't re-derive.

**This lesson does NOT cover (owned elsewhere):**
- The Server Action arm of the wrapper (`authedAction`) — lesson 2 owns it; this lesson only references and contrasts.
- Member-management routes — chapter 057 lesson 4 uses Server Actions; route-handler versions of those flows are explicitly not required.
- The audit-log write inside the handler — chapter 057 lesson 5 (same hook, different seam); mention the seam exists, don't build it.
- Authoring the RFC 9457 Problem Details schema at depth, the full status-by-method table, the `parseOr422` helper — chapter 046 lessons 2–3 own these. This lesson *consumes* the Problem shape and *uses* the status map; it does not re-derive the catalog. Teach exactly the statuses this wrapper emits (401/403/400/422/404) plus a one-line success-status reminder.
- `Idempotency-Key` handling at depth — chapter 063 (webhook lesson). Name the seam only.
- CORS configuration — lives in `next.config.ts`/middleware. Name once.
- Bearer-token / machine-to-machine identity — not built this chapter. Name once.
- The deeper fail-closed treatment — security-baseline chapter 080. Lesson 2 already named it once; don't repeat.
- The missing-role-check threat model, the Principle #5 carve-out justification, the `Result`-not-exceptions discipline at depth — lesson 2 owns all three. Reference in a sentence, don't re-argue.

**Divergence notes for downstream agents (deliberate):**
- The chapter 057 outline gives the status map as "401/403/422/404." The canonical conventions file (and chapter 046 lesson 3) distinguish **400 (malformed) from 422 (validation)**. Teach the fuller five-status map (add 400) — it's the reviewer-enforced table and avoids teaching an incomplete shape. This is intentional, not an error.
- Business functions and Server Actions stay verb+noun with no `Action`/`Route` suffix (lesson 2 continuity). The *wrappers* are named for what they are (`authedAction`, `authedRoute`); the things they wrap are named for what they do (`createInvoice`, `removeMember`).
- Where a code sample must stay short for teaching, it may show a single verb export or a trimmed Problem body rather than a full multi-verb `route.ts` — note such trims so they aren't read as the complete production shape.
