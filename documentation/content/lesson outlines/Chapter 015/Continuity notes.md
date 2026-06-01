# Chapter 015 — Fetch and live streams

## Lesson 1 — The universal HTTP client

**Taught.** The canonical hardened `fetch` call shape (running example `createInvoice` POSTing to `/api/invoices`): the resolution model (resolves on any HTTP response incl. 4xx/5xx, rejects only on transport failure), `response.ok` as the load-bearing branch, the `Request`/`Response`/`Headers` triad as Web Platform types, the five body consumers + once-only rule, the four request-body shapes + `FormData` `Content-Type` trap, the recurring header surface, `AbortSignal.timeout`/`AbortSignal.any`, catch narrowing on `error.name`, the four call-site decision, and the `apiFetch` extraction.

**Cut.** Optional `ScriptCoding` capstone (flagged cuttable in outline) — not built; drills are `PredictOutput`, `Sequence`, `Buckets`. No `XMLHttpRequest` call-surface detail beyond naming `xhr.upload.onprogress`.

**Debts (this lesson promised / deferred).**
- `Result<T>` shape + `ok`/`err` constructors — used unimported as one-liners; owned by Ch 043 L3.
- Zod call surface — only `invoiceSchema.parse(...)` shown; owned by Ch 042.
- Next.js `fetch` augmentation (`cache`, `next: { revalidate, tags }`) — named recognition-only; owned by Ch 032.
- Route-handler authoring (receiving side, same triad types) — Ch 046.
- File uploads / `Blob`/`ArrayBuffer` bodies — Ch 016 L3, Ch 069.
- `XMLHttpRequest` upload-progress worked example — Ch 069.
- Cookies vs `Authorization`, `credentials` mode, CORS depth — Ch 013/016.
- `Idempotency-Key` wiring — billing, Ch 063.
- Retries/backoff — foreshadowed at third-party-SDK seam, not in this chapter.
- **Next lesson (L2)** explicitly handed off: reading `response.body` as a stream of chunks + SSE/live channels.

**Terminology (later lessons must reuse verbatim).**
- **Five seams: build → send → ok-branch → parse → catch.** The load-bearing mental model; recurs in L2 and the quiz.
- "`fetch` gives you `any`; the schema parse earns the type back" — framing of why `Schema.parse` is on the success path (native `response.json()` is `Promise<any>`, NOT `unknown` — do not write `Promise<unknown>`).
- "HTTP errors live in the resolved value (`response.ok`); transport errors live in the `catch`. Two failure modes, two handlers."
- `TimeoutError` (from `AbortSignal.timeout`) vs `AbortError` (from `controller.abort()`) — distinguished by `error.name`.
- "Every header is a fingerprint" (send only what's needed); "read once into a variable" (once-only body); "extract on the third repetition".

**Patterns and best practices (for project-chapter codebase).**
- Functions failing in expected ways return `Promise<Result<T>>`; ok-branch and catch both produce `err(...)`. Annotate the return type.
- Catch binding is `unknown`, narrowed via `error instanceof Error && error.name === '...'`; never `catch (e: any)`, never empty `catch {}`.
- `signal: AbortSignal.timeout(5_000)` on every outbound call; `AbortSignal.any([...])` to compose user-cancel + deadline. Calibration: ~5s internal, up to ~30s known-slow third party, never "no deadline" on a user-facing path.
- JSON body → explicit `Content-Type: application/json`; `FormData` body → set NO `Content-Type` (browser writes the boundary).
- Success body uses `parse` (not `safeParse`) — it's already past the `ok` branch (deliberate; route handler validating user input would `safeParse`).
- Query strings via `URL`/`URLSearchParams`, never string concatenation.
- Self-call (Server Component → own `/api`) is an anti-pattern; logic lives in `/lib`, call the function directly (foreshadowed Architectural Principle #3).
- The reusable helper is `apiFetch<T>(path, init, schema): Promise<Result<T>>` in `lib/http.ts`.

**Misc.**
- Numeric separators in code (`5_000`). `type` over `interface`, single quotes, 2-space, trailing commas, semicolons, 80-col.
- Display divergence: code blocks strip imports and show single focused functions; `Result`/`ok`/`err`/`invoiceSchema` appear unimported by design.
- New lesson component: `src/components/lessons/015/1/FetchResolutionModel.astro` (4-step resolution diagram, `step` prop 1–4).

## Lesson 2 — Streaming and live channels

**Taught.** Reading `response.body` as a `ReadableStream` of `Uint8Array` chunks via `for await` (with `getReader()` as cross-browser fallback for Safari < 26.4); `TextDecoder`/`TextEncoder` as the byte↔string bridge; the append-split-keep-tail buffered framing loop; the SSE wire format (`data:`/`event:`/`id:`/`retry:`, `\n\n` terminator, `Last-Event-ID` resume); emitting SSE from a bare `GET` Route Handler (`ReadableStream` + `start(controller)` + `enqueue`/`close`, the three headers, `request.signal` disconnect cleanup); consuming with `EventSource` in a `useEffect`; the `EventSource` ceiling → `fetch`-consumer escape hatch; the polling → SSE → WebSocket decision tree.

**Cut.** base64url — outline listed it among byte primitives, deliberately moved to **Ch 016 L1** (HMAC/signing); not introduced here. HTTP/1.1 6-connection-per-origin limit dropped (mentioned in outline watch-outs, not in lesson). `getReader()` framed as not-merely-legacy (the genuine Safari < 26.4 fallback), not just recognition.

**Debts (this lesson promised / deferred).**
- Route Handler full shape (param/body schemas, `authedRoute` wrapper, status codes) — bare `GET(request)` form only; owned by **Ch 046**.
- Vercel AI SDK `streamText`/`useChat` is this same SSE-shaped protocol + typed deltas — named twice as forward ref; **Unit 22**.
- React Query `refetchInterval` polling — named in decision tree as "a polling option on a data-fetching library later in the course"; **Ch 076**.
- `use`-boundary pattern that reads async sources in render, replacing `useEffect` for some cases — named once; **Ch 025**.
- WebSocket API (`WebSocket` ctor, `ws://`, framing, handshake) — recognition only at decision tree; out of scope course-wide.
- Background jobs / queues (long work ≠ SSE stream) — named in "what this is not for"; **Unit 13 / Ch 16**.
- Large file downloads = `response.blob()` / piped `response.body` — recognition; **Ch 016 L3 / Ch 069**.
- `Uint8Array`/`TextEncoder`/`TextDecoder` reused for HMAC — **Ch 016 L1**.
- Reuses L1 debts: `Result`/`ok`/`err` (Ch 043), schema parse "never trust the wire" (Ch 042).

**Terminology (later lessons must reuse verbatim).**
- **A chunk is a network frame, not a message.** The hinge fact for the whole substrate half.
- **Append, split, keep the tail, parse the rest** (a.k.a. append-split-keep-tail) — the universal framed-protocol read loop; SSE's framing token is `\n\n`.
- **"SSE is bytes, not strings"** — server `enqueue`s through `TextEncoder`; client `decode`s; exact inverses.
- **Buffering vs pulling** — `.json()`/`.text()` buffer the body to completion; `response.body` pulls chunk-by-chunk (extends L1's body-consumer framing).
- Reflexes: **"always `{ stream: true }` on chunks, one reused decoder, one final flush"**; **"one `JSON.stringify`'d `data:` line per event, terminated by a blank line"**.
- Decision-tree order: **direction before frequency** — "can the client only receive?" → then "how fresh?". Polling is the 2026 default; SSE the conditional past polling (server→client, JSON/text); WebSockets the conditional past SSE (bidirectional).
- `request.signal` is the server-side `AbortSignal` (fires on client disconnect) — the same cancellation thread as L1's `fetch` signal, now received not sent.

**Patterns and best practices (for project-chapter codebase).**
- Stream reads use `for await (const chunk of response.body)`; drop to `getReader()` + `releaseLock()` only when the support matrix includes Safari < 26.4.
- One `TextDecoder` instance reused across the loop with `{ stream: true }`, plus a final bare `decode()` flush — never a fresh decoder per chunk.
- SSE frame is always `data: ${JSON.stringify(payload)}\n\n` — never a raw multi-line payload.
- SSE Route Handler returns `new Response(stream, { headers })` with `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform` (`no-transform` is load-bearing — stops CDN/proxy buffering, the #1 prod-only SSE break), `Connection: keep-alive`.
- Stream handlers subscribe to `request.signal` `'abort'` to clear timers/cursors and `close()`; guard every write behind not-closed (enqueue after `close()` throws).
- `EventSource` is the default consumer (free auto-reconnect + `Last-Event-ID` replay); subscription lives in `useEffect`, cleanup calls `source.close()`. Drop to the `fetch` + append-split-keep-tail consumer only when a hard limit bites (custom headers / bearer auth, non-`GET`, request body) — then reconnect is reimplemented by hand.
- Cookie-authed SSE works with `EventSource` (`withCredentials: true` cross-origin); bearer-token SSE forces the `fetch` consumer.
- `e.data` from `EventSource` is still wire data: `JSON.parse` + schema-validate before trusting.

**Misc.**
- Display divergence (inherits L1): imports stripped, single focused functions; `handle`, `notificationSchema`, React setters appear as unimported stand-ins (stated in a note, mirroring L1's `Result`/`ok`).
- Route Handler intentionally shown in bare `GET(request)` form (no schemas/auth wrapper) — staging, not oversight; flagged for Ch 046.
- New lesson components: `src/components/lessons/015/2/BufferVsPull.astro` (`step` 1–3, buffer-vs-pull) and `BufferAndTail.astro` (`step` 1–2, buffer/tail animation), house HTML-CSS style.
- Reused components: `DiagramSequence`/`DiagramStep`, `StateMachineWalker` (`kind="decision"`, decision-tree, hyphen↔underscore-readable ids), `CodeVariants`, `CodeTooltips`, `AnnotatedCode`, `PredictOutput`, `Sequence`, `VideoCallout`.
