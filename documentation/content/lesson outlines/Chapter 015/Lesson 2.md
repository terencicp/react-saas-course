# Streaming and live channels

- **Title (h1):** Streaming and live channels
- **Sidebar label:** Streaming and live channels

---

## Lesson framing

This is the second and final teaching lesson of Ch 015. Lesson 1 installed the canonical hardened `fetch` call — the **five seams (build → send → ok-branch → parse → catch)** — and its body consumers buffer the response stream end-to-end (`.json()`, `.text()`). It explicitly handed off two things to this lesson: reading `response.body` as a *live stream of chunks*, and the server-to-client *live channels* built on that substrate. This lesson picks up exactly there.

**The senior throughline** (state it in the intro, do not name it as a section). Three concrete features open the lesson: a 12-second CSV export that needs a progress bar, a notifications panel that should light up without a 5-second poll, an LLM endpoint streaming tokens. All three are *server-to-client live updates over HTTP*, none is a request-response. That reframe is the lesson's spine — the student already has request-response (`fetch`); the new shape is "the connection stays open and the server keeps writing." Everything that follows answers: what primitive carries the bytes, what shape rides the wire, how the client consumes it, and — the decision that matters most — **when polling beats SSE and SSE beats WebSockets.**

**Mental model the student should leave with.** A `Response` body was always a stream; the lesson 1 consumers just hid that by buffering it. Pull the stream instead and you read chunks as they arrive. SSE is *not a new transport* — it is a thin text convention (`data: …\n\n`) layered on a long-lived `text/event-stream` HTTP response, which is why it rides existing HTTP infrastructure and reuses the app's cookie auth. WebSockets are the only genuinely *different* transport here, and they are a conditional reach, not a default. The durable takeaway is the **"trigger before tool" decision tree**: polling is the 2026 SaaS default; SSE is the conditional past polling (server→client only, JSON/text payload); WebSockets are the conditional past SSE (bidirectional). Most "real-time" features ship on polling and never need more.

**Two halves, one substrate.** The lesson has a clear seam: (A) the byte-and-chunk substrate — `Response.body`, `Uint8Array` chunks, `TextDecoder`, reframing chunks into messages; (B) the live-channel layer — the SSE wire format, emitting it from a Route Handler, consuming it with `EventSource`, the `EventSource` ceiling, and the decision tree. Teach A first because B is built on it: a senior reads an SSE stream by hand exactly once (to *see* it is just framed text over `response.body`) before reaching for `EventSource`. Build the simplified model first (one chunk = one message), then break it (chunks ≠ messages) — this staged reveal is the core cognitive-load move of the lesson.

**Cognitive-load sequencing.** Start from the familiar (`Response.body` is the same body lesson 1 buffered) and add complexity in one direction: bytes → decoded text → framed messages → SSE convention → emit → consume → choose. Never introduce the SSE protocol before the student has watched raw chunks arrive. The decision tree is *last* — it only makes sense once the student knows what each option costs.

**Code-display conventions** (inherit lesson 1 exactly). Strip imports; show single focused functions. `Result` / `ok` / `err` appear unimported by design (state once in an `Aside`, as lesson 1 did — but most of this lesson's snippets are platform-level loops and Route Handler bodies that do not need `Result`, so keep that note light). Route Handler file shape is **owned by Ch 046** — use the minimum inline form (`export async function GET(request: Request) { … return new Response(stream, { headers }) }`) and flag in an `Aside` that the full handler shape, schemas, and auth wrapper come later. Numeric separators (`5_000`), `type` over `interface`, single quotes, 2-space, trailing commas, semicolons, 80-col. `async`/`await` uniformly; the chunk loop is `for await (const chunk of …)`, not `.then`.

**Reused terminology (verbatim from lesson 1, the quiz reuses it).** "Five seams: build → send → ok-branch → parse → catch." "`fetch` gives you `any`; the schema parse earns the type back." `TimeoutError` vs `AbortError` distinguished by `error.name`. The `AbortController` / `AbortSignal` cancellation thread (lesson 1 + Ch 007 L4 + Ch 014 L3) — this lesson re-applies it twice: `request.signal` for client-disconnect cleanup on the server, and the `EventSource` cleanup in a React effect.

---

## Lesson sections

### Introduction (no header)

Open with the three concrete features (CSV progress bar, live notifications, LLM token stream) and the reframe: each is server→client, over HTTP, *not* a request-response. Connect explicitly to lesson 1 — "you can fire a request and read a buffered answer; now the answer arrives in pieces, or never stops arriving." Preview the practical skill: by the end the student can read a streamed response chunk-by-chunk, emit and consume an SSE stream, and pick the right live-channel primitive against a concrete trigger. Name the two halves (substrate, then channel). Keep it warm and brief per pedagogical guidelines. End by pointing at the first move: the body was a stream all along.

Reasoning: the intro must carry the "senior question" implicitly (decisions before syntax) and bridge from the just-finished lesson 1 so the chapter reads as one arc.

---

### `Response.body` is a stream you can pull

**Goal:** flip the student's model — the lesson 1 consumers *buffered* a stream that was always there; `response.body` hands them the stream to pull instead.

Content:
- Restate from lesson 1: `.json()`/`.text()` read the body to completion and resolve once. That is buffering. Fine for a 2 KB JSON row; wrong for a 12-second export where you want the first byte now.
- `response.body` is a `ReadableStream` of `Uint8Array` chunks. The 2026 reflex: `for await (const chunk of response.body) { … }` — `ReadableStream` is async-iterable in every runtime this course targets (confirmed broadly shipped 2026; Safari was the last holdout and has since landed it). Each iteration yields one `Uint8Array`.
- The older `getReader()` / `read()` loop (`const reader = response.body.getReader(); while (true) { const { done, value } = await reader.read(); if (done) break; … }`) — recognition only, named as "the surface you'll see in older code and some libraries." Mention `reader.releaseLock()` exists; do not drill it.
- Frame the watch-out here (inline, not a separate section): a chunk is a *network frame*, not a unit of meaning. Its size is decided by the network, not your data. This sets up the reframing section two steps later.

Visual — **`DiagramSequence`** (custom HTML inside `DiagramStep`s, matching the chapter's existing `FetchResolutionModel` / `EventPhaseWalk` HTML-CSS style; horizontal layout, height-capped per diagram guidelines). Pedagogical goal: make "buffer vs pull" visible in time.
- Step 1: buffered — `.json()` shown as a bar filling completely, then one value pops out at the end. Caption: the whole body arrives before you get anything.
- Step 2: pull — `response.body` shown as the same bar, but each segment pops out to the consumer as it lands. Caption: you act on chunk 1 while chunk 4 is still on the wire.
- Step 3: highlight that the segment boundaries are arbitrary (a label spans two segments) — seeds the chunks-≠-messages problem.
This is a small visual aid, not a system graph; that is exactly the kind of enrichment the diagram guidelines want.

Reasoning: students who only know `.json()` think `fetch` *is* buffering. The whole lesson fails if this reframe doesn't land first. A scrub-through sequence is the lowest-cognitive-load way to show a temporal difference.

Code: a single `Code` block for the `for await` loop (5–6 lines, no annotation needed — it's one idea). Keep the `getReader` form in a `<details>` collapsible as optional reference, so the default path stays clean.

---

### Decoding chunks back to text

**Goal:** `Uint8Array` is bytes; the consumer wants strings — and the naive decode silently corrupts multi-byte characters.

Content:
- Quick named primitives (these are *named at the call site*, per pedagogical guidelines, not as preamble; Ch 016 L1 reuses them for HMAC so introduce cleanly): `Uint8Array` = fixed-length byte array (index `[i]`, iterate as numbers); `TextEncoder` / `TextDecoder` = the string↔bytes bridge (`new TextEncoder().encode(s)` → UTF-8 bytes; `new TextDecoder().decode(buf)` → string). Keep this to ~3 sentences; the student met typed arrays nowhere deep yet, so a one-line `Term` on `Uint8Array` and a clean sentence on the encoder pair suffice.
- The load-bearing detail: `new TextDecoder().decode(chunk, { stream: true })`. The `stream: true` option holds back a trailing partial multi-byte sequence so a UTF-8 character split across a chunk boundary is reassembled on the next call. A final `decoder.decode()` (no args) flushes any buffered tail.
- The reflex: **always `stream: true` on chunks, always one final flush.** Reuse the *same* decoder instance across the loop (it carries the cross-chunk state).

Watch-out (inline `Aside` caution): decode chunk-by-chunk *without* `stream: true` and an emoji or accented character that straddles a chunk boundary renders as `�`. The bug is invisible on ASCII test data and ships to production — frame it in those real stakes (beginners get this wrong because their happy-path test string is pure ASCII).

Exercise — **`PredictOutput`**. A two-chunk stream where a multi-byte char (e.g. `"café"` or an emoji) is split across the boundary, decoded once *without* `stream: true`. Expected output shows the mojibake (`caf�` then `�`), and `<PredictWhy>` explains the held-back byte. This drills the exact failure in the way that makes it stick — the student predicts the corruption and *sees* why the flag exists. Reasoning: a predict-output drill on a subtle wrong-output bug is far stickier than prose; lesson 1 used the same pattern for the `404` misconception.

Code: a small `Code` block showing the decoder reused across the loop with `{ stream: true }` and the final flush.

---

### From chunks to messages

**Goal:** install the append-split-keep-tail reframing pattern — the universal move for reading *any* framed protocol off a byte stream, and the direct prerequisite for parsing SSE by hand.

Content:
- Restate the problem crisply: chunks are network frames, messages are application units. One logical message can span two chunks; two messages can land in one chunk. You cannot assume one chunk = one message (callback to the diagram's step 3).
- The pattern, named once and then written: **accumulate decoded text into a string buffer; split on the protocol's framing token; the last fragment may be incomplete, so keep it as the tail and carry it to the next iteration; parse and emit everything before it.** For SSE the framing token is the blank line `\n\n`.
- Make the simplified→complex progression explicit: first show the *wrong* simple version (split every chunk on the separator, emit all parts), then break it with a concrete trace where an event spans a boundary and gets lost, then show the buffered version. This is the lesson's central staged-complexity beat.

Visual — **`DiagramSequence`** (custom HTML, the buffer-and-tail animation). Pedagogical goal: make the tail-carry visible. Per step show: incoming chunk (top), the running buffer (middle, with the tail fragment tinted differently), emitted messages (bottom).
- Step 1: chunk A arrives → buffer = `"event1\n\nevent2\npart…"` → emit `event1`, keep `event2\npart…` as tail.
- Step 2: chunk B arrives (`"…rest\n\nevent3\n\n"`) → buffer = tail + B → emit `event2`, `event3`, keep `""`.
- Caption ties it to "append, split, keep the tail, parse the rest."
Reasoning: the tail-carry is the one genuinely tricky pointer-shuffle in the lesson; an animation of the buffer state across two chunks removes the ambiguity prose can't.

Code — **`CodeVariants`** (before/after, reusing lesson 1's `del=`/`ins=` + per-pane `data-mark-color` red/green convention):
- Variant "Loses events": splits each chunk independently — `chunk.split('\n\n')`. First sentence states the failure (events spanning a boundary vanish).
- Variant "Buffered": the append-split-keep-tail loop. First sentence states the fix.
Keep each to one focused function.

Note: this section deliberately stays protocol-agnostic about the *payload* — it's about framing. The SSE field grammar (`data:`/`event:`/`id:`) is the next section. This separation keeps each section single-idea.

---

### The Server-Sent Events wire format

**Goal:** the student can read and write the SSE text protocol by hand, and understands *why* it's "just text over HTTP."

Content:
- SSE is a thin convention on a `text/event-stream` response that stays open. The server writes UTF-8 text lines; the client reads the stream and dispatches per event. No framing library, no binary protocol — this is the "rides existing HTTP" insight made concrete.
- The field grammar, taught against a literal example block:
  - `data: <payload>\n\n` — one event; the blank line terminates it (the `\n\n` from the previous section).
  - `event: <name>` — optional named event type (default is `message`).
  - `id: <id>` — optional event id; the browser remembers the last one and replays it via the `Last-Event-ID` request header on auto-reconnect. This is *the* feature that makes SSE resilient for free.
  - `retry: <ms>` — optional reconnect-delay hint. Recognition.
  - Multi-line payloads: each `data:` line is one logical line; a payload with embedded newlines either repeats the `data:` prefix per line or (the senior default) is JSON-stringified to a single line.
- The reflex: **`data: ${JSON.stringify(payload)}\n\n`** — one stringified line per event. State the watch-out inline: an un-stringified payload containing a raw `\n` corrupts the framing (the reader sees two `data:` lines or a premature terminator).

Visual — a small annotated text block (use **`Code`** with Expressive Code line highlights, or **`CodeTooltips`** to label `data:` / `event:` / `id:` / the blank-line terminator inline on hover). Prefer `CodeTooltips` here: it lets the student probe each field's meaning without breaking the compact wire sample into prose. Tooltips on: `event:`, `id:`, `retry:`, and the trailing blank line.

Reasoning: making the student look at the literal bytes before any API call is what kills the "SSE is magic" misconception. It's the same "show the platform default first" posture lesson 1 used for `fetch`.

Forward reference (one sentence, here or in the close): the Vercel AI SDK's `streamText` / `useChat` (Unit 22) is this exact SSE-shaped protocol plus typed deltas — not a parallel transport. Naming it here pays off the LLM-token-stream feature from the intro.

---

### Emitting an SSE stream from a Route Handler

**Goal:** the student can write a Route Handler that constructs a `ReadableStream`, enqueues encoded SSE events, sets the three load-bearing headers, and cleans up on disconnect.

Content (this is the densest section — use `AnnotatedCode` to control attention):
- The minimum Route Handler shape: `export async function GET(request: Request) { … return new Response(stream, { headers }) }`. `Aside` flagging Ch 046 owns the real handler shape (params/body schemas, `authedRoute` wrapper); here it's the bare form so the stream is the focus.
- Construct `new ReadableStream({ start(controller) { … } })`. Inside `start`, `controller.enqueue(encoder.encode(\`data: ${JSON.stringify(payload)}\n\n\`))` per event; `controller.close()` when done. **SSE is bytes, not strings** — encode through a `TextEncoder` before enqueueing (callback to the encoder from the decoding section; this is the inverse direction).
- The three load-bearing headers, each with its *why* (this is a "principles inline" moment):
  - `Content-Type: text/event-stream` — the protocol opt-in; browsers and proxies key on it.
  - `Cache-Control: no-cache, no-transform` — `no-transform` is the load-bearing token: it stops a CDN/proxy from buffering the stream into one late response. This is the #1 production SSE failure and deserves emphasis.
  - `Connection: keep-alive` — recognition; HTTP/2/3 ignore it, HTTP/1.1 needs it.
- Client-disconnect cleanup: every modern runtime gives the handler `request.signal`, an `AbortSignal` that fires when the client closes the tab. Subscribe to its `'abort'` event inside the stream; on abort, clear timers / close DB cursors, then guard further writes. This re-applies the lesson 1 + Ch 014 `AbortController` thread (name the continuity). Watch-out inline: a stream that ignores `request.signal` leaks a timer (and a DB connection) per disconnected client — frame the production cost.
- Watch-out inline: writing to a `ReadableStreamDefaultController` after `close()` (or after abort) throws — guard every write behind the not-aborted check.

Visual — **`AnnotatedCode`** stepping the handler (the one complex block the student must focus on part-by-part; this is precisely the component's use case). `code` prop = the full ~15-line handler; steps:
1. `{1}` blue — the `GET(request)` signature; `request.signal` is the disconnect hook.
2. `{2}` — create the `TextEncoder` (SSE is bytes).
3. range for `new ReadableStream({ start })` blue — the stream + controller.
4. the `controller.enqueue(encoder.encode(…))` line green — one encoded event written.
5. the `request.signal` abort-listener range orange — cleanup on disconnect, guard writes.
6. the `return new Response(stream, { headers })` range violet — the three headers, with the prose calling out `no-transform`.
Keep `maxLines` ≤ 18.

Exercise — **`Sequence`** ordering drill with the handler as the fixed code block above the steps (lesson 1 used this exact pattern for the five seams). Steps to order: create encoder → construct ReadableStream with start(controller) → enqueue encoded `data:` events → subscribe to `request.signal` for cleanup → return Response with the three SSE headers. Reasoning: ordering drills cement the *shape* of a multi-step construction, which is exactly what a Route Handler is.

Reasoning: this section is where most concrete skill lands, so it gets the heaviest scaffolding (annotated walkthrough + ordering drill). The three-headers + `no-transform` point is the single most production-relevant fact in the lesson — give it explicit weight.

---

### Consuming SSE with `EventSource`

**Goal:** the student can subscribe to a stream from a Client Component, handle default and named events, and clean up correctly in React.

Content:
- `const source = new EventSource('/api/events')` opens the connection. `source.onmessage = (e) => …` handles default (`data:`) events; `e.data` is the raw string (JSON.parse + validate — reuse "never trust the wire" / schema-parse reflex from lesson 1, lightly). `source.addEventListener('<name>', …)` handles named events. `source.close()` shuts it.
- The free win: the browser auto-reconnects on connection drop and replays the last `id:` via `Last-Event-ID` (callback to the wire-format section). The server can resume from that id.
- The React placement reflex: the subscription lives in a `useEffect`; the cleanup function calls `source.close()`. This is the *same* setup-then-teardown discipline as the `AbortController` thread (name it). Forward reference (one clause): a future `use`-boundary pattern lands in Ch 025 — do not teach it, just signal `useEffect` is today's home. Watch-out inline, in real stakes: an `EventSource` opened without a `close()` cleanup keeps the connection alive after unmount and burns the tab's per-origin connection budget — the cleanup is non-optional.

Code — **`AnnotatedCode`** or a focused `Code` block of the `useEffect` (open, onmessage with parse, addEventListener for a named event, return `() => source.close()`). Lean `AnnotatedCode` if highlighting the open/handle/cleanup triad separately aids focus; otherwise a single annotated-comment `Code` block. Note: student has met React/`useEffect` earlier in the course — keep the React framing light, the *subject* is the SSE subscription lifecycle.

Reasoning: this closes the emit→consume loop the previous section opened. Keep it tight — the novel content is the SSE lifecycle and reconnect, not React.

---

### When `EventSource` runs out and plain `fetch` takes over

**Goal:** the student knows the three hard limits of `EventSource` and the exact trigger that forces consuming the SSE stream with `fetch` instead.

Content:
- The `EventSource` ceiling — three hard limits (confirmed current 2026): it can't set custom request headers (no `Authorization`, no CSRF token), can't issue a non-`GET` request, can't carry a request body.
- The auth split, named concretely: **cookie-authenticated SSE works with `EventSource`** (cookies travel automatically; `withCredentials: true` for the cross-origin case). **Bearer-token SSE forces the `fetch` consumer** — there's no way to attach `Authorization` to an `EventSource`.
- The escape hatch: consume the `text/event-stream` response with plain `fetch` — *same SSE byte protocol*, but now the client reads `response.body` and reframes events itself using the **append-split-keep-tail** loop from earlier. This is the payoff for teaching the substrate first: the student already wrote this loop. Make that callback explicit ("you built this consumer two sections ago; SSE is just the framing token `\n\n`").
- The senior posture: default to `EventSource` for its free reconnect; drop to the `fetch` consumer only when a hard limit bites. Note the tradeoff: the `fetch` consumer loses the automatic reconnect/`Last-Event-ID` replay, so you reimplement that yourself (one sentence; this is why `EventSource` is the default).

Visual — **`TabbedContent`** with two tabs (`EventSource` vs `fetch consumer`), each a short code block + a caption stating its tradeoff. (Could be `CodeVariants`, but the panels differ in *capability framing* not just code, and the captions carry weight — either works; prefer `CodeVariants` per the components guidance that code-vs-code uses `CodeVariants`.) Decide: **`CodeVariants`**, labels "EventSource (default)" / "fetch consumer (custom headers)". First sentence of each variant states when to reach for it.

Reasoning: this is a "trigger before tool" beat at the micro scale — `EventSource` is the default, `fetch` is the conditional. It also retroactively justifies the substrate half of the lesson, which is good pedagogy (the student sees why they learned the hard way first).

---

### Choosing the channel: polling, SSE, or WebSockets

**Goal:** the durable decision the student leaves with — the three options, the trigger that flips each step, in the order a senior asks the questions. This is the lesson's most important takeaway.

Content — the three options, each with trigger and 2026 framing:
- **Polling** — the default. `setInterval`, or (forward reference, one clause) React Query's `refetchInterval` (Ch 076) on a normal request-response endpoint. Trigger to leave it: the staleness window the product needs is shorter than a poll cadence the server can carry, *or* the polling fan-out (clients × cadence) becomes a load problem. The 2026 reality: most "real-time" SaaS features ship on 5–30s polling and never need more. Lead with this — it's the anti-pattern correction (juniors reach for WebSockets first).
- **SSE** — the conditional past polling. Trigger: server→client only, payload is JSON/text, one persistent HTTP connection per subscribed tab is an acceptable budget. Examples: LLM token streaming, build/export progress, notifications panel, live order status. Anchor: rides existing HTTP infra (CDN-friendly with `no-transform`, multiplexes over HTTP/2), reuses the app's cookie auth.
- **WebSockets** — the conditional past SSE. Trigger: the channel must be **bidirectional** (collaborative cursors, chat with typing indicators/delivery acks, multiplayer state). Examples: Liveblocks-style presence, real-time chat, multiplayer canvases. Anchor: *not a default* — separate connection model, can't use the HTTP cache, needs its own auth handshake. **Recognition only** in this course (no `WebSocket` constructor API, no `ws://`, no framing) — name the trigger so the student recognizes the line being crossed, per the chapter's stated scope.

Visual — **`StateMachineWalker`** `kind="decision"` (lesson 1 used this exact component for the "where does this fetch live?" decision; reusing it ties the chapter together and the component is purpose-built for "the order the senior asks questions in"). Walk:
- Q1 `cardinality`/`direction` prompt "Does the client need to send to the server on this channel, or only receive?" → "Send and receive" → `leaf-websockets`; "Only receive" → Q2.
- Q2 `frequency` prompt "How fresh must it be vs how often does it change?" → "Frequent/timely pushes (tokens, live progress)" → `leaf-sse`; "A poll every few seconds is fine" → `leaf-polling`.
- Leaves: `leaf-polling` (verdict "Polling on a sensible interval" — the default, cites React Query forward ref), `leaf-sse` (verdict "Server-Sent Events" — server→client, rides HTTP, free reconnect), `leaf-websockets` (verdict "WebSockets — recognition only here" — bidirectional, separate model, names it as out-of-scope tool).
Pedagogical goal: force the student through the *order* (direction before frequency), which is the senior reflex. The leaves are short; the lesson lives in the path.

Reasoning: per pedagogical guidelines, a conditional-tool decision must name the threshold the default crosses. The walker makes the student *commit* to a branch, which is stickier than a comparison table. Putting it last is deliberate — it requires knowing what each option costs, which the rest of the lesson taught.

Optionally pair with a tiny one-line summary `Aside` after the walker ("Default to polling. Reach for SSE when pushes must be timely and one-way. Reach for WebSockets only when the channel is two-way.") so the takeaway survives without re-walking the tree.

---

### What this substrate is not for

**Goal:** two precise cuts so the student doesn't reach wrong, at adult depth (per the chapter outline's "named at adult depth" instruction).

Content (keep to two short paragraphs or a two-item `CardGrid` / `Aside`):
- **Large file downloads** are `response.blob()` (or `response.body` piped to a save destination) — streaming *bytes*, not streaming *events*. Recognition; the file-handling chapters own it (Ch 016 L3 / Ch 069).
- **Work that runs longer than ~30–60s** is a background job, not an SSE stream — holding a connection open for minutes is fragile across proxies, mobile networks, and serverless platforms. Concrete 2026 note: serverless platforms cap function/stream duration (Vercel's Fluid Compute now defaults to ~5 min and Hobby allows up to 60s, but it is still bounded and billed for the whole open duration) — long or open-ended work belongs on the queue surface (Unit 13 / Ch 16, named as forward ref). State the senior anchor: an SSE stream is for *bounded, timely* server→client updates, not a substitute for a job queue or a websocket.

Reasoning: the chapter outline insists these two cuts are named so the student doesn't misuse SSE for downloads or long jobs — both are real production mistakes. The Vercel duration fact is fact-checked current (Fluid Compute 300s default / Hobby 60s, 2026).

---

### External resources (optional, LinkCards / `ExternalResource` in a `CardGrid`)

Mirror lesson 1's closing pattern. Candidates (the writer picks 3–4, all platform-authoritative or recent):
- MDN — Using readable streams (`response.body`, `for await`, `getReader`).
- MDN — Server-Sent Events / `EventSource` (the protocol + the API + `withCredentials`).
- MDN — `TextDecoder` (the `stream: true` option).
- A recent (last-6-months) practical SSE-in-Next.js write-up covering the `no-transform` buffering pitfall and `request.signal` cleanup, if a credible one is found at authoring time.

---

## Terms (for `Term` tooltips — be strategic, these support the lesson's goals)

- **`ReadableStream`** — "A pull-based stream of chunks. `response.body` is one; iterate it with `for await` to read chunks as they arrive."
- **`Uint8Array`** — "A fixed-length array of bytes. Each stream chunk is one; `TextDecoder` turns it into a string." (student hasn't met typed arrays deeply)
- **chunk** — "One network frame of a streamed body — its size is set by the network, not your data, so it rarely lines up with a message." (defines the term the lesson hinges on)
- **Server-Sent Events (SSE)** — "A one-way server→client convention over a long-lived `text/event-stream` HTTP response; lines of `data: …` separated by blank lines."
- **`EventSource`** — "The browser API that opens an SSE connection and auto-reconnects, replaying the last event id."
- **`Last-Event-ID`** — "The request header the browser sends on SSE reconnect, carrying the last `id:` it saw, so the server can resume."

Do **not** `Term`-define already-established items (`AbortSignal`, `AbortController`, `Result` — lesson 1 covered them; reference, don't re-tooltip). Acronym SSE expands on first use in prose and gets a `Term`.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- The five seams and `response.ok` branch (lesson 1) — referenced, assumed.
- `.json()`/`.text()` buffer the body (lesson 1) — the contrast this lesson opens on.
- `AbortSignal` / `AbortController`, `error.name` narrowing (lesson 1, Ch 007 L4, Ch 014 L3) — re-applied for `request.signal` and `EventSource` cleanup; one-line reminder, not a re-teach.
- `useEffect` setup/cleanup (earlier React chapters) — assumed; the subject is the subscription, not the hook.
- Schema-parse "never trust the wire" reflex (lesson 1) — referenced lightly when parsing `e.data`.

**Explicitly out of scope (do not teach; some named as forward refs only):**
- **Route Handler file shape** — params/body/headers Zod schemas, the `authedRoute` wrapper, the status-code/Problem-Details table. Owned by **Ch 046**. Use the bare `GET(request)` + `new Response` form only.
- **Next.js page streaming / Suspense / RSC streaming** — same `ReadableStream` underneath, different primitive. Owned by **Ch 031**. Do not conflate with SSE.
- **Next.js `fetch` augmentation** (`cache`, `next: { revalidate, tags }`) — Ch 032; not relevant here, don't mention.
- **Vercel AI SDK** (`streamText`, `useChat`, `UIMessage`) — **Unit 22**. Named once as a forward reference (the AI stream lands on *this* substrate); never taught.
- **React Query polling config** (`refetchInterval`, `staleTime`) — **Ch 076**. Named once in the decision tree as the polling tool; not configured here.
- **WebSocket API** — `WebSocket` constructor, `ws://`, framing, ping/pong, auth handshake. **Recognition only at the decision tree.** Name the bidirectional trigger; teach no API.
- **Background jobs / queues** — Unit 13 / Ch 16. Named once in "what this is not for"; not taught.
- **`WritableStream` / `TransformStream`** — out of scope; `ReadableStream` is the only stream side this chapter installs. Don't mention transform streams.
- **Backpressure, `pipeThrough`, `pipeTo`** — recognition at most; the SaaS surface rarely needs the pipe API. Prefer to omit entirely to control scope.
- **base64url / JWT / HMAC encodings** — the chapter outline listed base64url among byte primitives, but it belongs to **Ch 016 L1** (HMAC/signing). Cut it here: introduce only `Uint8Array` + `TextEncoder`/`TextDecoder`, which this lesson actually uses. (Deliberate cut — flag to downstream agents so they don't add base64 content.)
- **File uploads / `Blob` bodies / `XMLHttpRequest` progress** — Ch 016 L3 / Ch 069; "large downloads are `.blob()`" is recognition-only in the cuts section.
- **`Result<T>` definition, Zod call surface** — still owned by Ch 043 / Ch 042 respectively; appear unimported, not taught.

---

## Notes for downstream agents

- **Deliberate divergence from convention:** Route Handler shown in bare `GET(request)` form (no Zod schemas, no `authedRoute`) because Ch 046 owns that and the stream is the focus here. This is intentional staging, not an oversight.
- **Deliberate cut:** base64url (chapter-outline brainstorm item) is moved to Ch 016 L1; do not add it.
- A **new lesson component** is optional, not required: the two `DiagramSequence` figures (buffer-vs-pull, and buffer-and-tail) can be authored as inline custom HTML inside `DiagramStep`s in the existing chapter HTML-CSS style (see `src/components/lessons/015/1/FetchResolutionModel.astro` for the house style — `not-content` wrapper, theme-gray chrome, one saturated accent per active step, `margin: 0` reset). If the buffer-and-tail animation gets complex, extract it to `src/components/lessons/015/2/<Name>.astro` taking a `step` prop, mirroring lesson 1's pattern. Author's call.
- Keep the decision-tree `StateMachineWalker` ids readable both ways (hyphen↔underscore) per the component's diagram-sync note, in case a topology diagram is added later.
