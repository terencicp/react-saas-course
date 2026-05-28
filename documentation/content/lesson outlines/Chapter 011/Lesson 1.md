# Lesson 1 outline — Methods and the safe-to-retry contract

## Lesson title

- **Title (h1):** Methods and the safe-to-retry contract
- **Sidebar label:** Methods and retry safety

The chapter-outline title nails the lesson's centre of gravity — methods exist to encode the two properties (safety, idempotency) that decide whether a retry is safe. Keep it.

## Lesson framing — conclusions from brainstorm

**Target student.** Junior with web basics, just finished chapter 010 (URL bar to pixels, DevTools, mkcert). Has issued GET and POST requests via `fetch` at the surface level. Has not been asked to reason about *why* a method matters beyond "POST sends a body." Comes in knowing TS/Zod (Unit 1) and can read a Next.js route file by sight, but has not written one.

**What this lesson is.** A property lesson, not a syntax lesson. The five methods (GET, POST, PUT, PATCH, DELETE) are the alphabet; *safety* and *idempotency* are the grammar that decides whether a network blip is auto-recoverable. The `Idempotency-Key` header is the senior fix that makes the one cell in the grid that breaks (unsafe, non-idempotent — POST) retry-safe at the application layer. Student exits able to (a) place any method in the safe/idempotent 2x2 by reasoning, not by memorisation; (b) explain why a retried POST can charge a card twice and how `Idempotency-Key` closes that hole; (c) pick between PUT and PATCH for an update endpoint and name the wire-format default for PATCH; (d) recognise that picking the route-handler verb *is* picking the contract.

**The senior framing carried through.** A method declares an *intent*. The intent is what caches, retry policies, prefetchers, and CDNs read. A semantic mismatch (GET that writes, POST that reads) doesn't break the request — it breaks every layer downstream that read the contract and acted on it. This is the durable take-away the student should leave with.

**Pedagogical levers.**
- **One anchor concept, named early.** Safety and idempotency are the load-bearing definitions. Land them once, crisply, with concrete examples, before the 2x2 grid uses them.
- **The 2x2 grid is the spine.** Build it interactively (or at least diagrammatically) so the student *places* methods rather than reading them off a table. The grid is the durable mental model.
- **Trigger before tool for `Idempotency-Key`.** Open the section with the failure mode (retried POST = duplicate charge) before naming the header. The header is the answer to a question the student now feels.
- **Real production stakes.** Stripe and PayPal are named as the deployments. The retry-doubled-charge scenario is concrete, not hypothetical.
- **Defaults before conditionals.** PUT for full replace, PATCH for diff, JSON Merge Patch as the default wire format; GET never has a body; POST is the only one that needs `Idempotency-Key`. State these plainly, then name the carve-outs in one line.
- **No bootcamp scaffolding.** Adult tone. Do not re-explain "what is HTTP." Chapter 010 just walked the URL→pixels pipeline.
- **No history.** No "back in the day, REST was…" detours. No WebDAV. No TRACE / CONNECT. HEAD and OPTIONS named in one line each with forward links.
- **Cognitive load.** Start with the senior frame (method = intent, not transport). Then safety/idempotency definitions, then the 2x2 grid, then PUT vs. PATCH (the most-confused pair), then the retry problem and `Idempotency-Key` as the fix, then close on the route handler as where the contract gets signed.

**Common beginner traps to defuse.**
- Conflating "doesn't have a body" with "is safe." HEAD has no body and is safe; POST with no body is still unsafe.
- Thinking idempotency means "returns the same response." It means *the server state* ends in the same place after N calls as after one. The response status can differ (201 then 200, or 200 then 304).
- Thinking PUT is idempotent and PATCH isn't, full stop. PATCH *is* idempotent when the diff is absolute ("set status to 'paid'"). It is *not* when the diff is relative ("increment count by 1"). The student needs the rule, not the slogan.
- Putting a body on GET because the read needs structure. Intermediaries strip GET bodies. The fix is query params, or it's not a read.
- Generating a fresh `Idempotency-Key` per network attempt instead of per logical operation. The whole point is that all retries of the same operation share one key.
- Thinking `Idempotency-Key` is a browser concern. It's a *server* concern that requires server-side `(key, response)` storage — forward-linked to chapter 063, not built here.

**Forward links named once each, never elaborated:**
- HEAD reappears in Chapter 069 for R2 object-size reads.
- OPTIONS reappears in Chapter 012 for CORS preflight.
- `Idempotency-Key` operationalised in Chapter 043 (Server Actions), Chapter 046 (public route handler), Chapter 063 (Stripe webhook `event.id` as the natural idempotency key).
- The status-code-and-body shape for route handler responses → Lesson 2.
- The header surface (audiences, where each is set) → Lesson 3.
- Form submission as the Server Actions surface → Unit 6.

**Pre-requisite refresh, in one line each (not full re-teaches):**
- HTTP request line = method + path + version (chapter 010 named it once).
- A "route handler" is a `route.ts` file under `app/api/<...>/` that exports HTTP-method-named async functions — quick sentence with one tiny example block; full coverage in Unit 4.
- A UUID is a 128-bit identifier; the course defaulted to UUIDv7 (chapter 005, Branded IDs). The key generator named here is `crypto.randomUUID()`.

**Estimated student time:** 30–40 minutes.

---

## Lesson sections

The lesson opens with a one-paragraph introduction (no h2), then six h2 sections, then a closing recall drill.

### Introduction (no header)

Two short paragraphs.

1. **The senior frame.** HTTP methods are not transport markers — they are *declarations of intent*. The intent is what the CDN, the browser's prefetcher, and every retry policy reads to decide what they're allowed to do. Pick the wrong method and you don't break the request; you break the contract every downstream layer signed.
2. **What this lesson lands.** Safety and idempotency as the two anchor properties; the five-method palette placed in a 2x2 by those properties; PUT vs. PATCH for updates; the `Idempotency-Key` header as the senior fix for the one method (POST) the grid can't make retry-safe on its own. Close with: "By the end you can pick a method by reasoning, not by memorisation, and explain why a retried POST can charge a card twice."

### Methods declare intent, not transport

A short framing section (~3 short paragraphs) that installs the mental model the rest of the lesson sits on.

- **The shape of an HTTP request line.** One sentence reminder from chapter 010: a request line is `METHOD path HTTP/version`. The first token is what this lesson is about.
- **What "intent" buys.** Three concrete consumers of the intent declaration, named tersely:
  - The browser's prefetcher and link-rel-preload machinery will follow GETs speculatively and never POSTs.
  - CDNs cache GETs by default and bypass POSTs by default.
  - HTTP clients (browser, `fetch`, server-side SDKs) retry safe methods on network errors and refuse to retry unsafe ones.
- **The semantic-mismatch cost.** A GET that writes will be retried by an automatic retry, prefetched on hover, cached at the edge — three duplicate writes from one logical operation. A POST that reads bypasses every cache layer and re-runs server work on every navigation. The contract is not advisory.
- **Senior watch-out (`<Aside type="caution">`).** "If you find yourself wanting a method to be one thing for the server and another thing for the cache, the answer is not the method — it's a different endpoint."

### Safety and idempotency, the two anchor properties

This is the load-bearing definitions section. Two properties, defined with examples, then summarised in a compact comparison.

Structure:

- **Safety (definition).** A method is *safe* if calling it has no observable side effect on server state. The server can log the call, fetch from a cache, even pre-warm something — those are not "observable side effects" because they don't change what a client would see on the next request. A read endpoint is safe; a "send welcome email" endpoint is not, even if it's named like a read.
- **Idempotency (definition).** A method is *idempotent* if making the same request N times leaves the server in the same final state as making it once. The *response* may differ across calls (201 the first time, 200 or 304 thereafter), but the *state* is fixed. A "delete invoice 42" call is idempotent — call it five times, invoice 42 is gone once. A "create invoice" call is not — call it five times, you have five invoices.
- **The trap.** Idempotency is not "returns the same response." Students who memorise that lose the property the moment they see a `DELETE` return 200 then 404. State the rule plainly: idempotency is a property of *state*, not of *response*.
- **Why these two and not others.** Safety lets caches and prefetchers act on the method. Idempotency lets retry policies act on the method. Together they cover the four cells of the grid the next section builds.

Use `<Term>` callouts inline for `safe` and `idempotent` so the definitions stay hover-revivable later in the lesson.

**Compact two-row reference (HTML+CSS in a `<Figure>`).** Right after the prose, a small two-row card: row 1 "Safety" with one-line definition + the test ("any observable server-state change? No → safe"), row 2 "Idempotency" with one-line definition + the test ("same final state after N calls as after one? Yes → idempotent"). This is the cheat-sheet the student will revisit, kept small (under 200px tall). HTML+CSS per the diagrams INDEX recommendation for "annotated illustrations."

### The five-method palette in a 2x2 grid

The lesson's centrepiece visual. Place the five methods in a safe-vs-idempotent grid so the student sees the shape of the property space, not just a table of method definitions.

**Diagram — a 2x2 grid built with HTML+CSS inside `<Figure>`.** This is the geometric-artifact case the diagrams INDEX flags for HTML+CSS. Layout: two-column, two-row CSS grid. Columns labelled "Idempotent" / "Not idempotent" along the top; rows labelled "Safe" / "Unsafe" down the side.

Cell contents:
- **Safe + Idempotent (top-left):** `GET` — read; can be cached, prefetched, retried freely. One-line example: "load an invoice."
- **Safe + Not idempotent:** empty — no standard methods live here. Brief callout below the grid: "An empty cell is information — there is no use case for a read that produces different state each time. If you find one, it's not a read."
- **Unsafe + Idempotent (bottom-left):** `PUT`, `PATCH` (with absolute diff), `DELETE` — mutations that converge. One-line example per: "PUT: replace the invoice resource. DELETE: delete the invoice. PATCH: set invoice status to 'paid'."
- **Unsafe + Not idempotent (bottom-right):** `POST` — the one cell the grid cannot make safe on its own. One-line example: "create an invoice." Visual: tint this cell distinctly (saturated red/orange in dark-readable tones) — it's the cell that motivates `Idempotency-Key` later.

Caption: "The five-method palette placed by property. The grey cell has no occupants; the red cell is the one that needs `Idempotency-Key` to become retry-safe."

After the diagram, one paragraph that walks the four corners in order:
- GET — the only safe method in the senior toolkit. HEAD also safe (named in one line: "HEAD is GET without the body — reappears in chapter 069 for object-size reads"). OPTIONS too (one line: "CORS preflight, chapter 012").
- PUT, PATCH, DELETE — unsafe but idempotent. Retry them on a network blip and your final state is correct.
- POST — unsafe and not idempotent. Retry it naively and you get duplicate work. The `Idempotency-Key` section is about closing that hole.

**Then: an exercise to lock the grid in.** A `<Buckets>` drill with two columns (safe vs. unsafe) — wait, the 2x2 needs two axes. The cleanest exercise here is a `<Matching>` drill with five pairs (one per method) mapping the method to its 2x2 cell, but matching is one-to-one and several methods share cells. Use `<Buckets>` with four buckets (one per cell of the grid) and the five method names as items. This actively rebuilds the grid from method names, which is the recall the lesson cares about.

Buckets:
- `safe-idem` — "Safe + Idempotent"
- `unsafe-idem` — "Unsafe + Idempotent"
- `unsafe-nonidem` — "Unsafe + Not idempotent"
- `safe-nonidem` — "Safe + Not idempotent" (will be empty; included so the student has to actively reject placing anything here)

Items: `GET` → `safe-idem`; `PUT` → `unsafe-idem`; `PATCH` (with the absolute-diff qualifier in the chip text) → `unsafe-idem`; `DELETE` → `unsafe-idem`; `POST` → `unsafe-nonidem`.

`instructions` prop: "Place each method in the cell it belongs to. One cell stays empty — that's intentional." `twoCol` so the buckets render in a 2x2-feel grid.

### PUT and PATCH: replace versus diff

The most-confused pair in the palette gets its own section.

Structure:

- **PUT replaces.** Send the full resource body; the server overwrites the resource with what you sent. Idempotent by construction — sending the same body twice yields the same final state. The mental model is `=` (assignment).
- **PATCH applies a diff.** Send a description of changes; the server applies them. Idempotent *only if* the diff is absolute (`status = 'paid'`) — not if it's relative (`count = count + 1`). The mental model is `Object.assign(current, patch)` for the merge case, or a function for the json-patch case.
- **The wire format question.** PATCH's body shape is not standardised by the method — you have to pick one. The two formats a 2026 senior reaches for:

**`CodeVariants` with two tabs, side-by-side wire formats for the same conceptual update.** Both tabs show the *same* logical operation ("change the status of invoice 42 to 'paid' and remove its draft note"), so the student can compare the shapes directly. Use `maxLines={10}` so the two stay compact.

- Tab 1 — **`application/merge-patch+json`** (RFC 7396).
  - Fenced `http` block showing the request:
    ```
    PATCH /invoices/42 HTTP/3
    Content-Type: application/merge-patch+json

    { "status": "paid", "draftNote": null }
    ```
  - Prose under: "The default 2026 reach when the patch is a simple field-level set. Keys overwrite; an explicit `null` deletes the key. Limitation: arrays can't be merged element-wise — you have to send the whole new array. Use when your patches are field-level on object-shaped resources."
- Tab 2 — **`application/json-patch+json`** (RFC 6902).
  - Fenced `http` block:
    ```
    PATCH /invoices/42 HTTP/3
    Content-Type: application/json-patch+json

    [
      { "op": "replace", "path": "/status", "value": "paid" },
      { "op": "remove", "path": "/draftNote" }
    ]
    ```
  - Prose under: "An array of typed operations (`add`, `remove`, `replace`, `move`, `copy`, `test`). Verbose but unambiguous, supports array mutation, and `test` lets you do optimistic concurrency in the patch itself. Use when patches need to be precise about ordering or array changes."

- **The senior default named plainly.** Merge-patch is the default; json-patch is the reach when the diff has to encode operations the merge format can't express. Most SaaS update endpoints land on merge-patch.

- **Watch-out (`<Aside type="caution">`).** Sending PATCH with `Content-Type: application/json` (the generic JSON type) is the most common production bug here. The server can't tell whether your client expects merge or operation semantics. Set the specific content type, or document the one your endpoint speaks. Forward-link: "Lesson 3 covers `Content-Type` as content negotiation."

- **Quick reality check — single multiple choice.** `<MultipleChoice>` card. Question: "An endpoint adds 5 dollars to a wallet balance. The request body is `{ "delta": 5 }`. Is this PATCH idempotent?" Two distractors plus the correct answer ("No — the diff is relative, not absolute. Repeating the call adds 5 each time.") with an `<McqWhy>` reinforcing that the property travels with the *diff shape*, not the method label.

### When retries lie: the POST problem

The motivation section for `Idempotency-Key`. Open with the failure mode, then introduce the fix.

Structure:

- **The scenario.** A client calls `POST /payments/charge` with `{ amount: 5000, currency: 'usd', source: 'tok_...' }`. The server processes the charge. The response on its way back gets dropped on a flaky connection — the server completed the work, the client never saw the response. The client's network layer (or the user, hitting "Try again") retries. Now the card has been charged twice.
- **Why GET-style retry doesn't fix this.** GET retries are safe because the method *is* safe. POST is not safe; nothing about the method or the transport makes retry safe. The fix has to be at the application layer.
- **The pattern.** The client generates a stable identifier *per logical operation* (not per network attempt) and sends it on the request as the `Idempotency-Key` header. The server stores the `(key, response)` pair before sending the response. On a retry with the same key, the server *recognises* the replay and returns the cached response without re-running the work. Same logical operation in, same response out, exactly one side effect.

**Diagram — `DiagramSequence` walking the retry collapse in three steps.** Steps are temporal: this is the canonical "scrubbable temporal walkthrough" case the diagram INDEX recommends `<DiagramSequence>` for.

- **Step 1 — First attempt, response lost.** Three-row mini layout (HTML+CSS inside the step): Client → Server "POST /charge `Idempotency-Key: ab12...`"; Server processes, stores `(ab12, resp)`, sends 200 back; the response packet is marked dropped with an `✕`. Caption: "Client never sees the response. Server has done the work and remembered it."
- **Step 2 — Client retries with the same key.** Client → Server "POST /charge `Idempotency-Key: ab12...`" (same key, deliberately). Caption: "Client uses the same idempotency key — one key per logical operation, not per attempt."
- **Step 3 — Server replays.** Server looks up `ab12` in its store, finds the cached response, returns it without re-running the charge. Caption: "Server returns the cached response. Card charged exactly once."

Use simple HTML+CSS rectangles with arrows (or even `→` text glyphs) for the actor layout. Keep each step's body under ~280px tall (the stage sizes to the tallest step).

After the sequence, three short paragraphs:

- **Where the key comes from.** Client generates a UUID per operation. Show one line inline: `const idempotencyKey = crypto.randomUUID();` — chapter 005 introduced UUIDs, this is the call site. The key lives with the operation, not with the HTTP request — a retry uses the same key the original used.
- **Where the key lives on the server.** The server needs a `(key, response, expires_at)` store with a unique constraint on the key. The implementation — schema, TTL, unique-constraint race — is chapter 063's territory; here, name the contract: "The server stores the key before sending the response, and looks it up on every incoming request to the same endpoint." One sentence.
- **Status.** The header is on track to be a Standards-Track RFC — IETF httpapi WG draft `draft-ietf-httpapi-idempotency-key-header-07` (October 2025). De-facto deployed today by Stripe, PayPal, and most payment processors. Use the header name now; you will not have to rename it when the RFC ships.

**Code example — `AnnotatedCode` showing the client side.** A small `fetch` call with the `Idempotency-Key` header, walked in three steps. This is the call shape the student will actually write later. Use `lang="ts"`, `maxLines={12}`.

The code:
```ts
const idempotencyKey = crypto.randomUUID();

const response = await fetch('/api/payments/charge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({ amount: 5000, currency: 'usd' }),
});
```

Three `<AnnotatedStep>` annotations:
1. `meta="{1}"` — "The key is generated once per logical operation. Store it on the operation (e.g., a React Query mutation key) so every retry reuses it." (color: blue)
2. `meta={`{3-9} "Idempotency-Key"`}` — "The header rides on the request. Header name is fixed by the draft; value is your UUID. Both must travel together." (color: orange)
3. `meta={`{2} /crypto\\.randomUUID/`}` — "`crypto.randomUUID()` is on the global `crypto` (chapter 016 covers Web Crypto)." (color: violet)

- **Senior watch-out (`<Aside type="caution">`).** "Three failure modes the implementation has to avoid: a new key per retry (defeats the purpose), the same key reused across different operations (one logical operation, one key), and writing the response to the store *after* sending it back (a crash between work and persist re-runs the work on retry). The route handler and database side of this is chapter 063 — keep the contract in mind now."

### Picking the verb is picking the contract

The bridge from theory to the surface the student will write against. Short, concrete, closes the loop.

Structure:

- **The Next.js route handler shape.** One brief, illustrative block. The student doesn't write route handlers yet, but they should recognise the shape now so the connection between "pick a method" and "pick an exported function name" is wired.

**Code block — a single `Code` fence, no annotations needed.** Use `lang="ts"`, `title="src/app/api/invoices/[id]/route.ts"`.

```ts
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // load and return the invoice
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // apply a merge-patch and return the updated invoice
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // delete the invoice
}
```

Prose under: "One file, one route, one exported function per method. The function names *are* the contract — the framework dispatches the request to `GET` or `PATCH` by reading the request line you learned about in chapter 010. If you pick the wrong verb, the wrong function runs (or 405 fires). The verb is the contract; the handler implements it." Forward-link in one line: "Full coverage of route handlers in Unit 4; the `authedRoute` wrapper in Unit 10."

- **The body-on-GET footgun.** One short paragraph, the lesson's last carve-out. GET requests *can* technically carry a body — the HTTP spec doesn't forbid it — but intermediaries (proxies, CDNs, some HTTP libraries) drop it silently, and the request semantics ignore it. The decision rule: if the read needs structure, encode it in the query string (or use `URLSearchParams` — chapter 012 covers the URL surface); if the operation needs a body, it's not a read. Senior watch-out (`<Aside type="tip">`): "If you're tempted by 'GET with body,' the real fix is usually POST with a clear name like `/searches` and a result body."

### Closing recall

One small recall exercise to lock the property model in. The lesson cares most that the student can *reason* about safety/idempotency, not memorise the table; pick a drill that exercises reasoning.

**`<TrueFalse>` round, four statements.** Each statement requires applying a definition, not pattern-matching a word.

1. `answer="false"` — "Calling `DELETE /invoices/42` twice in a row means the server has done less work the second time, so DELETE isn't idempotent."
   - `<TfWhy>`: "Idempotency is about *state*, not *response* or *work*. After both calls, invoice 42 is gone — same final state. The fact the second call may return 404 instead of 200 doesn't change that."
2. `answer="true"` — "A `PATCH` endpoint that accepts `{ "balance": 100 }` and overwrites the balance is idempotent."
   - `<TfWhy>`: "Absolute set. Repeating the call lands at the same final state. Contrast with `{ "delta": 100 }`, which is relative and not idempotent."
3. `answer="false"` — "Generating a new `Idempotency-Key` for each network retry of the same charge guarantees the card is charged once."
   - `<TfWhy>`: "Opposite — the whole point is that retries share the *same* key so the server can recognise the replay. A fresh key per attempt makes every retry look like a new operation."
4. `answer="true"` — "A POST endpoint that *only* logs the request and never mutates business state still cannot be retried safely without an idempotency mechanism."
   - `<TfWhy>`: "POST is unsafe by contract. The cache and retry layers will treat it as side-effecting whether or not the implementation is. Method choice declares intent — the implementation doesn't override the contract."

(Why TrueFalse and not Buckets again: the 2x2 was already drilled with Buckets earlier. Here the student is reasoning about edge cases of the definitions, which is exactly what TrueFalse is for.)

### What stays out (named once)

A two-line wrap at the end:

- Status code and Problem Details (RFC 9457) — lesson 2.
- Headers beyond `Idempotency-Key` — lesson 3.
- The route handler implementation, error helpers, and the `(key, response)` storage layer — Chapter 046 and Chapter 063.
- Server Actions as the form-submission surface — Unit 6.
- CORS preflight (where OPTIONS lives) — Chapter 012.

No `LinkCards` — every link is internal to the course.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| The safety/idempotency cheat-sheet (two-row card) | HTML+CSS inside `<Figure>` |
| The 2x2 method-property grid | HTML+CSS (CSS grid) inside `<Figure>` |
| Method-to-cell drill | `<Buckets twoCol>` |
| PUT vs. PATCH wire formats | `<CodeVariants>` with two `http` fenced blocks |
| Quick reality check on relative-diff PATCH | `<MultipleChoice>` with one `<McqWhy>` |
| Retry-collapse walkthrough | `<DiagramSequence>` with three `<DiagramStep>`s |
| Client-side `Idempotency-Key` annotated walk | `<AnnotatedCode>` with three `<AnnotatedStep>`s |
| Route handler shape | Single fenced ` ```ts ` block with `title="…"` |
| Senior watch-outs | `<Aside type="caution">` / `<Aside type="tip">` |
| Closing recall | `<TrueFalse>` round |

No live-coding component. The student doesn't write a route handler yet — Unit 4 owns that. The exercises here are recognition and reasoning drills; the `Idempotency-Key` `fetch` snippet is read-not-written so the call shape is recognisable when chapter 015 introduces `fetch` for real.

No video embed — the topic reads cleanly in prose and diagram, and no canonical short video on this property model exists at a quality bar worth embedding.

## Term tooltips to author

Strategic, sentence-level definitions.

- `safe` — "An HTTP method is safe if calling it has no observable side effect on server state."
- `idempotent` — "An HTTP method is idempotent if making the same request N times leaves the server in the same final state as making it once."
- `merge-patch` (RFC 7396) — "JSON Merge Patch (RFC 7396): the patch body is a partial JSON object; keys overwrite, `null` deletes. Default 2026 wire format for PATCH on object-shaped resources."
- `json-patch` (RFC 6902) — "JSON Patch (RFC 6902): the patch body is an array of typed ops (`add`, `remove`, `replace`, `move`, `copy`, `test`). Reach for it when the diff needs operation semantics merge-patch can't express."
- `Idempotency-Key` — "Request header whose value is a stable per-operation identifier (typically a UUID). The server stores `(key, response)` and returns the cached response on replay, making non-idempotent methods retry-safe."

No `Term` callout for "UUID" — it was earned in chapter 005 (branded IDs) and again referenced just-in-line here as `crypto.randomUUID()`.

---

## Scope

### What this lesson covers

- The mental shift: HTTP methods declare intent, not transport — and three downstream consumers (CDN, prefetcher, retry policy) read that intent.
- Safety and idempotency, defined crisply with the *state-not-response* clarification.
- The five-method palette (GET, POST, PUT, PATCH, DELETE) placed in a safe/idempotent 2x2 grid. HEAD and OPTIONS named in one line each.
- PUT vs. PATCH — replace vs. diff, the absolute-vs-relative rule for PATCH idempotency, and the two wire formats: `application/merge-patch+json` (RFC 7396, the default) and `application/json-patch+json` (RFC 6902, the reach).
- The retry problem on POST — the failure mode (double-charge), the `Idempotency-Key` header pattern, the client side of the contract (one key per operation, generated with `crypto.randomUUID()`), and the IETF httpapi draft as the standardising force.
- The Next.js route handler `export async function GET/POST/PATCH` shape as where the verb-as-contract gets signed in code.
- The body-on-GET footgun and the senior alternative (query params, or it's not a read).

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **Status codes** and the 4xx/5xx split — Lesson 2 owns the catalog and Problem Details (RFC 9457).
- **Headers in general** — Lesson 3 owns the audience model and the surface (auth, caching, CORS, security). Only `Idempotency-Key` is treated here, and only as the example that makes a method retry-safe.
- **CORS and `OPTIONS` preflight** — Chapter 012. Name OPTIONS once with the forward link; do not detail preflight.
- **Cookies** — Chapter 013. Do not mention `Cookie` or `Set-Cookie`.
- **Server-side idempotency-key storage**, unique-constraint races, expiry, replay-window — Chapter 063 owns the implementation. State the contract here; do not build the table.
- **Stripe webhook `event.id` as the natural idempotency key** — Chapter 063.
- **The full route-handler implementation** (parsing, validation, returning Problem Details, the `authedRoute` wrapper) — Chapter 046 and Chapter 057. Show only the empty-handler skeleton here.
- **Server Actions and the form-submission surface** — Unit 6 (Chapter 043). Do not pre-teach.
- **`fetch` as the universal HTTP client** — Chapter 015. The one `fetch` snippet here is illustrative; don't teach the API surface.
- **`URLSearchParams`** and the URL structure — Chapter 012 owns it. Forward-link in one line.
- **`crypto.randomUUID()`** as a full Web Crypto surface — Chapter 016. Name and use here; don't elaborate.
- **WebDAV verbs, TRACE, CONNECT, and other rarely-touched methods** — permanently out of scope. Not mentioned at all.
- **HTTP/1.1 quirks** (pipelining, keep-alive, etc.) — chapter 010 already established 2026 stack is HTTP/3 over QUIC. Do not detour.
- **AI-related framing** — not an AI lesson.

### Prerequisites the student already has (do not re-teach)

- Working TS/JS, including `crypto.randomUUID()` (chapter 016 owns the deep dive but the call shape is familiar by sight).
- A model of UUIDs from chapter 005 (Branded IDs).
- The full URL → first byte → pixels journey (chapter 010) — including the HTTP request line as method + path + version.
- The fact that the 2026 stack is React 19 + Next.js 16, App Router everywhere.
- That a "route handler" is a Next.js concept under `app/api/<...>/route.ts` (one-sentence refresher fine; do not re-teach).

---

## Notes for the writer agent

- **Two definitions first, then the grid, then the fix.** Don't reorder. Safety and idempotency have to land before the 2x2 makes sense; the 2x2 has to land before the POST problem reads as motivated.
- **The 2x2 is the durable artifact.** Build it so it reads at a glance — color the unsafe+non-idempotent cell so it visually flags as "the cell that needs `Idempotency-Key`." The empty cell is intentional and informative; leave it visibly empty (a grey "—" works) rather than removing it.
- **Idempotency = state, not response.** This is the most-repeated misconception in real production code. Hit it twice: once in the definitions section, again in the TrueFalse statement #1.
- **PUT vs. PATCH split is the lesson's second-most-confused pair.** Land the absolute-vs-relative rule; the MCQ is there to verify it stuck.
- **`Idempotency-Key`: the client side is in scope; the server side is not.** Do not write Zod schemas, Drizzle tables, or transaction code for the key store. That's chapter 063. The forward link is enough.
- **No history.** No "REST used to…" framing, no "back when HTTP/1.1…" detours. The course is 2026-first.
- **Code conventions reminders.**
  - Single quotes in strings; semicolons on; `const` over `let` for the UUID and fetch examples.
  - `import type` for the `NextRequest` import in the route handler example (verbatimModuleSyntax).
  - `async function GET()` exported as named exports — these are the **only** exception to "no default exports" rule for route handlers (per Function form section of Code conventions).
  - The route handler example deliberately omits implementation bodies — comment placeholders are fine, since the route-handler contents are out of scope and covered in Chapter 046.
  - `crypto.randomUUID()` is the right call — UUIDv4 in this case (random), distinct from the UUIDv7 the database uses (chapter 005). State that distinction if the writer thinks it'll trip anyone, otherwise leave it: it's a v4 by design here because the key is opaque, not time-ordered.
- **The Aside discipline.** Two `Aside type="caution"` blocks (PATCH content-type and `Idempotency-Key` failure modes) and one `Aside type="tip"` (body-on-GET fix). Don't bundle more — asides earn their weight one watch-out at a time.
- **Estimated lesson length:** 1500-2000 words of prose plus the visuals and exercises listed.
