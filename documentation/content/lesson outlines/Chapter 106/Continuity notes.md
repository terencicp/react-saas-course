# Chapter 106 — Text, objects, and the chat surface

## Lesson 1 — streamText, generateText, and the route-handler seam

**Taught.** Delivered `streamText` vs `generateText` (the streaming-for-readers / generation-for-code cut), the `messages` array role contract, `ModelMessage` vs `UIMessage` and `convertToModelMessages`, the system prompt as controller with the structural prompt-injection rule, the full `app/api/chat/route.ts` handler shape, `onFinish` for usage/audit writes, the `finishReason` union, `abortSignal` cancellation, and a one-line `temperature` treatment.

**Cut.** `'error'` and `'other'` finish reasons were folded into the Buckets "surface it" bucket together rather than treated separately; the chapter outline listed `'error'` as a named value to call out but left `'other'` unlisted — the lesson used the corrected union (`'other'`, not `'unknown'`) and kept the exercise unambiguous by lumping both with `'length'`/`'content-filter'`.

**Debts.**
- Client side (`useChat`, `UIMessage` `parts` render, `sendMessage`/`stop`/`status`, manually managed input state, Server Component `initialMessages` boundary) — explicitly deferred to Lesson 3; the lesson names `toUIMessageStreamResponse` as the contract the hook expects without building the hook.
- `'tool-calls'` finishReason handling — forward-pointed to Chapter 107.
- `streamObject`/`generateObject` — forward-pointed to Lesson 2.

**Terminology.**
- `streamText` — returns stream deltas immediately; default for user-facing surfaces.
- `generateText` — awaits full string; for backend code consumers.
- `ModelMessage` — lossy message shape the model reads.
- `UIMessage` — rich app-side shape with `parts` array and metadata.
- `convertToModelMessages(messages)` — converts `UIMessage[]` → `ModelMessage[]` at the handler seam, called before `streamText`.
- `toUIMessageStreamResponse()` — the mandatory return; speaks the v5 parts protocol `useChat` expects; `new Response(stream)` breaks the protocol.
- `onFinish({ usage, finishReason })` — fires once after generation; the only valid slot for usage/audit writes.
- `finishReason` union: `'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other'` — **`'other'` not `'unknown'`** (corrected from chapter outline).
- `abortSignal: request.signal` — forwards connection close to the provider; `onFinish` does NOT fire on abort by default.
- `SYSTEM_PROMPT` — SCREAMING_SNAKE_CASE constant; model handles stay camelCase.
- Prompt injection — untrusted user text reaching the instruction channel; structural fix: keep user input in `messages`, not in `system`.

**Patterns and best practices.**
- `maxOutputTokens` on every call, no exceptions — absence is a cost-overrun bug, not a simpler example.
- Model is always an imported handle (`chatModel`, `fastModel` from `lib/llm/models.ts`), never an inline string (`openai('gpt-X')`).
- System prompt is a module constant in `lib/llm/prompts.ts`, never templated from request data.
- All usage/audit writes go inside `onFinish`; writing them before the call completes records wrong token counts.
- Handler shape at `app/api/chat/route.ts`: `authedRoute('member', chatRequestSchema, async ({ messages }, request) => { ... })` — the callback receives `(parsedBody, request)`, destructures `{ messages }` from validated body, and uses `request.signal` for abort.
- Route Handler (not Server Action) whenever the response is a stream.
- Full production wrapper is `withLlmQuota(...)(authedRoute(...))` — quota is composed **around** `authedRoute`, not inside it; lesson snippets fold both into a single abbreviated `authedRoute(...)` call for readability. Later lessons must not infer that `authedRoute` owns the daily quota.

**Misc.**
- The `authedRoute` callback signature the lesson committed to: `fn(parsedBody, request)` — `messages` is destructured from the first arg (the validated body), `request` is the second arg (for `request.signal`). Lesson 3's `useChat` client must POST to this same `/api/chat` route and send `UIMessage[]` in the body.
- On abort, `onFinish` skips by default; to record cancelled calls pass `consumeStream` in `toUIMessageStreamResponse({ consumeStream, onFinish })` — most surfaces don't need this, but downstream lessons must not assume the audit write always runs.
- No live sandbox in this lesson by design: `ReactCoding` is react-family only, and `ai` package + provider keys can't run in-browser. Exercises are MCQ/Sequence/Buckets only.

---

## Lesson 2 — Zod schemas as the model contract

**Taught.** Delivered `generateObject` and `streamObject` as the structured-output primitives; Zod schema as three-in-one contract (prompt spec → JSON Schema to the model, runtime guard → Zod validates the reply, TypeScript type → typed `object` at the call site); `.describe()` on every non-obvious field; schema-shape constraints (top-level object rule, safe vs. broken building blocks); the floor/suggestion split (hard structural constraints in schema, formatting hints in prompt); `maxRetries` as a cost lever; `output: 'enum'` and `output: 'array'` modes; `streamObject` for progressive rendering; the same `authedRoute` + `onFinish` seam as Lesson 1 with only the one call swapped; and the `finishReason !== 'stop' || !object` null-guard before any DB write.

**Cut.** Temperature, watch-out for "large schemas blow input token cost — trim unused fields," and provider-specific structured-output options — none of these were called out in the lesson body (all deferred/out of scope per the lesson outline; none are plausible dependencies for later lessons in this chapter).

**Debts.**
- `useObject` hook (client-side rendering of partial `streamObject` output) — named in the `streamObject` section and the `StateMachineWalker` leaf; explicitly deferred to Lesson 3.
- Tool input/output schemas using the same Zod discipline — forward-pointed to Chapter 107 Lesson 1 in the closing paragraph.

**Terminology.**
- `generateObject({ model, schema, prompt, maxOutputTokens })` → `{ object, usage, finishReason }` — `object` is typed by the Zod schema, no cast.
- `streamObject({ model, schema, prompt, maxOutputTokens })` — streams partial objects; handler returns `result.toTextStreamResponse()`.
- `output: 'enum'` — single label from a known set; `enum: [...]` replaces `schema`; returns `object` as a string.
- `output: 'array'` — list of records; `schema` is the element schema; returns `object` as `T[]`.
- `maxRetries` — SDK-level retry knob; default is 2; each retry is a full paid call; `1` is the course default for well-described schemas.
- JSON Schema — wire format the SDK sends to the model; Zod is the source, JSON Schema is the intermediary; `z.transform` and recursion can't be represented.
- `.describe('...')` — the model reads this as field documentation; costs input tokens; be generous on ambiguous fields, terse on obvious ones.
- `z.iso.datetime()` — top-level format builder for datetimes (not `z.string()`); canonical Zod 4 convention.
- `z.discriminatedUnion('kind', [...])` — preferred over bare `z.union` when variants are tagged; gives the model a label to pick rather than a shape to infer.
- Schema as the floor, prompt as the suggestion — `.refine` on the schema runs at validation time; a miss triggers a paid retry; formatting hints belong in the prompt.

**Patterns and best practices.**
- `maxOutputTokens` on every `generateObject`/`streamObject` call — same rule as Lesson 1, structured output is not exempt.
- Model handle always imported from `lib/llm/models.ts` (`fastModel` is the right pick for extraction; `chatModel` for large outputs needing `streamObject`).
- **`generateObject` is awaited and has no `onFinish`.** Usage comes off the resolved result directly: `const { object, usage, finishReason } = await generateObject(...)`, and the `recordLlmUsage` / `llm.call.completed` audit write runs inline immediately after the `await`.
- **`streamObject` keeps `onFinish`** because the handler returns `result.toTextStreamResponse()` before the call completes; the post-call audit write goes in `onFinish` there, not in any later line. These are two different slots — do not conflate them (Chapter 108 inherits both patterns).
- For `streamObject`, the handler returns `result.toTextStreamResponse()` (not `toUIMessageStreamResponse()`).
- Always guard `object` before DB write: `if (finishReason !== 'stop' || !object) return problem(422, '...')`.
- Keep hard structural constraints (types, enums, required fields) in the Zod schema; put formatting hints (e.g., `INV-0001` pattern) in the prompt string.
- `.describe()` on every non-obvious field; the schema should read like a spec for a human contractor.
- Avoid `z.any()`, `z.unknown()`, `z.transform()`, and recursive `z.lazy()` schemas — they cannot be serialized to JSON Schema.
- Top level must always be `z.object(...)` unless using `output: 'enum'` or `output: 'array'` modes.

**Misc.**
- The lesson uses AI SDK **v5 string-mode** API exclusively: `generateObject({ output: 'enum', enum: [...] })`, result as `{ object, usage, finishReason }`, `streamObject(...).toTextStreamResponse()`. The un-versioned docs were drifting toward a v6 `Output.*` helper API — do not introduce `Output.object()` / `Output.array()` / `Output.choice()` in later lessons without a chapter-wide migration decision.
- `useObject` ships as `experimental_useObject` (alias on import) — Lesson 3 must account for this.
- No live `generateObject` sandbox possible: `ai` package + provider keys can't run in-browser. Live coding used `ZodCoding` (real Zod via esm.sh) for the schema-design drill only; all AI-call exercises are MCQ/Sequence/Buckets.
- The `invoiceLineItemSchema` is the single running example across all sections (description/quantity/unitAmount); Lesson 3 and project chapters can reference it as an established shape.
- Lesson 2's annotated handler explicitly restates Lesson 1's quota-composition fact: `withLlmQuota(...)` wraps around `authedRoute`, not inside it. The lesson abbreviates this to a single `authedRoute(...)` call in snippets for readability — Chapter 108 must not infer `authedRoute` owns the quota gate.

---

## Lesson 3 — useChat, useObject, and the parts array

**Taught.** Delivered the `UIMessage`/`ModelMessage` two-type boundary from the client vantage; the `message.parts` render rule (walk the array, switch on `type`) vs. the broken v4 `message.content` read; `useChat` with manually managed `useState` input, `DefaultChatTransport`, `sendMessage`/`regenerate`/`stop`/`status`; server-side persistence via `toUIMessageStreamResponse({ originalMessages, onFinish })` and the Server Component → Client Component prop hand-off pattern for loading history; `useCompletion` for stateless single-shot text; `useObject` (`experimental_useObject`) for partial streaming structured objects; error sanitization (friendly copy + `regenerate()`, never raw `error.message`); and the full 7-step client↔server lifecycle.

**Cut.** Chapter outline listed `onFinish` on `useChat` as the persistence seam (`useChat({ onFinish: ({ messages }) => save(messages) })`); the lesson correctly placed the durable write server-side in `toUIMessageStreamResponse({ onFinish })` and demoted the client `onFinish` to UI-only reactions. The outline also used the v4-era `initialMessages` option name; lesson corrects it to `messages` (the v5 option name).

**Debts.**
- `'tool-<name>'` part rendering and the agentic loop — forward-pointed to Chapter 107 Lesson 1 as the reason the parts array exists.
- Generative UI (`streamUI`, `ai/rsc`) — forward-pointed to Chapter 107 Lesson 2.
- Embeddings / RAG — Chapter 107 Lesson 3.
- The worked invoice-chat surface (tool calling, usage panel) — Chapter 108.

**Terminology.**
- `useChat({ transport, messages })` — conversation hook; `transport` takes `new DefaultChatTransport({ api })`.
- `DefaultChatTransport` — built-in `ChatTransport` for HTTP POST + streaming response against a route handler.
- `ChatTransport` — interface `useChat` delegates sending to; swappable, default covers all course use cases.
- `sendMessage({ text })` — v5 name for what v4 called `append`; text-part send shape.
- `regenerate()` — v5 name for what v4 called `reload`; re-runs last assistant turn.
- `status` — `'submitted' | 'streaming' | 'ready' | 'error'`; drives typing indicator, disabled input, cancel button.
- `message.parts` — render source of truth; array of `{ type, ... }` pieces; replaces v4's flat `message.content` string (gone in v5).
- `toUIMessageStreamResponse({ originalMessages, onFinish })` — handler return for chat; `originalMessages` is the incoming history; `onFinish({ messages })` receives the full updated `UIMessage[]` post-stream.
- `useCompletion({ api })` — stateless single-shot hook; returns `{ completion, complete, isLoading, stop, error }`; handler returns `toTextStreamResponse()`.
- `experimental_useObject as useObject` — import alias required; returns `{ object, submit, isLoading, stop, error }`; `object` is `DeepPartial<RESULT> | undefined`.
- `DeepPartial<RESULT>` — every field at every depth optional; models a half-built streaming object.
- `initialMessages` — conventional variable name for the DB-loaded history passed as the `messages` prop to `useChat`; NOT a v5 option name (was a v4 option — common confusion point).
- `Problem Details` (RFC 9457) — the sanitized JSON error envelope the route handler returns; client maps status codes to friendly copy, never reads the body string.

**Patterns and best practices.**
- Input state owned by the component (`const [input, setInput] = useState('')`), not by `useChat`; cleared with `setInput('')` on submit — every chat component follows this shape.
- Every chat surface wires `stop()` to a visible cancel button gated on `status === 'streaming'`; no exceptions (abandoned streams burn tokens).
- Durable persistence goes in the handler's `onFinish` (server-side), never the client's `useChat` `onFinish` (unreliable — navigated-away tab never fires it).
- Persist `UIMessage[]`, never `ModelMessage[]`; the lossy shape loses tool calls, reasoning, and metadata.
- Chat page is a Server Component that reads `UIMessage[]` from the DB org-scoped and passes it as the `messages` prop to the Client Component; no client-side `useEffect` fetch for history.
- Error render: sanitized friendly string + `regenerate()` retry button; `error.message` never reaches the DOM.
- `useCompletion` for stateless single-shot; `useChat` for conversation; `useObject` for typed streaming structured output — reach for the hook that names the workload.
- Partial `useObject` output: design surfaces as append-only or stable slots; avoid fields that appear, change, and disappear as the model revises.

**Misc.**
- `experimental_useObject` is the current export name as of June 2026; alias it on import and do not re-expose the experimental prefix. Later lessons should re-verify the name hasn't stabilized before authoring.
- The v5 `useChat` option for pre-loaded history is `messages`, not `initialMessages` (v4 name); stale docs and the chapter outline use the wrong name — downstream agents must use `messages`.
- No live AI sandbox is possible in this chapter: `@ai-sdk/react` and provider keys cannot run in-browser; all exercises are MCQ/Dropdowns/Buckets/Sequence.
- The full 7-step lifecycle diagram (DiagramSequence) is the chapter's keystone visual; Chapter 108 and Chapter 107 can reference it as the established mental model without re-deriving it.
