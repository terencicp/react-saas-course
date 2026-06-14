# streamText, generateText, and the route-handler seam

- **Title (h1):** streamText, generateText, and the route-handler seam
- **Sidebar label:** Text generation and the route seam

---

## Lesson framing

This is the load-bearing mechanics lesson of Chapter 106. Chapter 105 settled the decisions (does the surface earn an LLM, how is cost bounded, how is the provider abstracted). This lesson is the first one with real call-site code: the two text-generation primitives (`streamText`, `generateText`), the messages-array conversation contract, the system prompt as controller, and the Next.js 16 Route Handler that wraps every LLM call.

**The unifying mental model is the seam.** Every LLM call runs server-side; the client never sees a provider key, only the stream. The Route Handler (or Server Action) is that seam, and the AI SDK enforces it by hook shape — the client hooks expect an endpoint, not a key. The whole lesson is "what does the call site look like, and what wraps it." The student should leave able to write the four-line handler body — parse → `convertToModelMessages` → `streamText` → `toUIMessageStreamResponse` — wrapped in the auth/quota stack they already built in earlier units, with `maxOutputTokens`, `onFinish`, `finishReason`, and `abortSignal` all in the right place.

**Pedagogical conclusions that shape the whole lesson:**

- **Defaults before conditionals.** `streamText` is the default for user-facing surfaces; `generateText` is the conditional (small output, a downstream step consumes the complete string). Lead with the streaming-vs-batch cut framed as a UX decision (first-token latency), not an API tour. This is the lesson's spine.
- **This is a decisions lesson with code, not a syntax tour.** Every code sample illustrates a decision (which primitive, where the usage write lands, why user input is a message and not a string). The senior question — "what's the smallest call that puts model output on the page, and what wraps it in production?" — is the through-line.
- **Everything carries forward from Chapter 105.** The model handle comes from `lib/llm/models.ts` (105.3); `maxOutputTokens` is mandatory (105.2); the auth/quota wrapper is `authedRoute` (057.3 + 105.2); `onFinish` is where the `usage` audit write lands (105.2). Treat these as installed prerequisites — redefine each in one sentence, then reach for it. Do not re-teach them.
- **The biggest beginner trap is the seam-breaking shape:** returning `new Response(stream)` instead of `result.toUIMessageStreamResponse()` breaks the v5 parts protocol; templating user input into the system prompt is the prompt-injection class; doing the `usage` write before the call completes records wrong counts. Each watch-out lands inline in the section teaching the concept it qualifies, never bundled at the end.
- **Pacing for cognitive load:** start with the bare call (one line, output on the page), then add the messages contract, then the system prompt, then assemble the full handler, then layer the production concerns (`onFinish`, `finishReason`, `abortSignal`). The Route Handler section is the climax where the pieces compose — an `AnnotatedCode` walkthrough is the right vehicle there.
- **Client side is explicitly out.** `useChat` and the `parts` array render are lesson 3. This lesson stops at `toUIMessageStreamResponse()` — it names what the hook on the other end expects, but does not build the client. Structured output (`generateObject`) is lesson 2.

Estimated student time: 40–50 minutes.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, framed against where Chapter 105 left off: the trigger has landed (the surface earns an LLM), cost and provider are settled — now, **what is the smallest call that puts model output on the page, and what does that call site look like in production?** Name the answer the lesson delivers: two primitives, the messages contract that feeds them, and the Route Handler that wraps them. Preview the concrete skill: by the end the student can write the handler body for a streaming chat endpoint, wrapped in the auth/quota stack from earlier units, with the cost cap and the audit write in the right places. Keep it to ~4 sentences, warm and terse. Do not enumerate the API surface here — that is the body.

One framing sentence on the seam, stated once so it threads the lesson: every LLM call runs on the server; the browser sees the stream, never the key; the Route Handler is the boundary.

### streamText for readers, generateText for code

Teach the streaming-vs-batch cut first, because it is the decision the rest of the lesson hangs on.

- `generateText` runs the model to completion and resolves one Promise with the full result (`.text` is the string). `streamText` returns immediately with a stream of text deltas the handler pipes to the client.
- Frame the cut as a **UX decision, not an API preference**: a human reading a long answer perceives *first-token* latency, which is a fraction of time-to-completion. `streamText` is the default for any user-facing surface for exactly this reason. `generateText` is the conditional — reach for it when the output is small and a downstream step depends on the complete string (a one-line classification result that feeds a Drizzle query, a short tag the handler logs). Senior framing: **streaming for human readers, generation for code consumers.**
- Name the watch-out inline: using `generateText` for a long user-facing answer means the user stares at a spinner for the full generation. That is the most common misuse of the batch primitive.

**Component — `CodeVariants`** with two tabs, the two call shapes side by side. This is the ideal use of CodeVariants: genuinely parallel versions of "the same thing" (a model call) that the student must hold in contrast.
- Tab "streamText (default)": `const result = streamText({ model: chatModel, system, messages, maxOutputTokens: 1000 });` — prose first sentence: "Streams deltas; the user sees the first token in well under a second." Use `data-mark-color="green"`.
- Tab "generateText (backend)": `const { text } = await generateText({ model: fastModel, prompt: emailBody, maxOutputTokens: 200 });` — prose: "Awaits the full string; reach for it only when code downstream consumes the result." Use `data-mark-color="blue"`.
- Both shapes import the handle from `lib/llm/models.ts` and both pass `maxOutputTokens`. State explicitly in the surrounding prose that the cap is non-optional in this course (105.2) and is shown on every call site on purpose — a call without it is a cost-overrun bug, not a simpler example.

Reasoning: the A/B contrast cements the one decision the student most needs to internalize, and showing both with the cap present normalizes the discipline.

### The messages array is the conversation

Teach the conversation contract that feeds both primitives.

- Every multi-turn call passes a `messages` array where each entry has a `role` (`'system' | 'user' | 'assistant'`) and content. The system message owns instructions and persona; `user` and `assistant` messages alternate to form the history the model reads.
- Introduce the two message types and why both exist, kept deliberately light because the client side is lesson 3:
  - `ModelMessage` — the lossy shape the model actually sees.
  - `UIMessage` — the full shape the app stores and renders (carries parts, metadata, tool calls).
  - At the seam the client sends `UIMessage[]`; the handler calls `convertToModelMessages(messages)` before passing to `streamText`. Name both types and the conversion here; the `parts` array and the client render land in lesson 3. This is a forward pointer, not a full treatment — keep it to "the handler converts UI messages to model messages; lesson 3 builds the UI side."

**Component — a small `Code` block** showing a literal three-message array (`system`, `user`, `assistant`) so the alternation is concrete. Keep it short; this is illustration, not a walkthrough.

**`prompt` vs `messages`** as a sub-decision within this section (not its own h3 — it is the same contract, narrower):
- Single-turn stateless calls pass `prompt: string`; the SDK wraps it in one user message. A `system` prop sits alongside either form.
- The cut: `prompt` for one-shot backend calls (classification, summary) inside a pipeline; `messages` for any user-facing chat or any call that needs prior context. Tie back to the previous section — the `generateText` backend example used `prompt`; the `streamText` chat example used `messages`. That parallel is intentional and worth naming.

**Tooltips (`Term`)** in this section's prose: `ModelMessage`, `UIMessage` — short definitions so the two-type distinction does not interrupt flow.

Reasoning: the messages array is the conceptual core that both primitives share; teaching it once here means the route-handler section can assume it. Keeping the UI-message treatment to a forward pointer respects the chapter's lesson split and minimizes load.

### The system prompt is the controller, not the conversation

Teach the system prompt and land the prompt-injection posture structurally.

- The system prompt sets the model's role, answer constraints, refusal rules, and output format. It is trusted, code-authored text.
- The structural rule from 105.2, stated sharply: **the system prompt is the controller; user messages are data.** User input is never spliced into the system prompt as a string. The reason is prompt injection — text the user controls that reaches the instruction channel can override the instructions. Keeping user input in `user` messages and instructions in `system` is the structural defense, not a runtime check.
- A senior writes the system prompt as a module constant (or in `lib/llm/prompts.ts`), never templated from request data.

**Component — `CodeVariants`, before/after (wrong/right).** This is the highest-value contrast in the lesson; the wrong shape is one a beginner writes naturally.
- Tab "Injection-prone": ``const system = `You are an assistant for ${userInput}.`;`` with `del=` on the interpolation line, `data-mark-color="red"`. Prose: "User text reaches the instruction channel — `ignore the above and …` now rewrites the controller."
- Tab "Controller isolated": a `const SYSTEM_PROMPT = '...'` module constant (invoice-domain example, e.g. an assistant that answers questions about the org's invoices and refuses anything off-domain), and the user text passed only inside `messages`. `data-mark-color="green"`. Prose: "Instructions are code-authored and fixed; user text stays data."
- Keep the system-prompt example short and domain-grounded (the course's invoice assistant from 105) so it reads as a spec, not filler.

**Tooltip (`Term`):** `prompt injection` — one-line definition (untrusted input that reaches the model's instruction channel and overrides intended behavior).

Reasoning: framing injection as a structural seam (channel separation) rather than a sanitization problem is the senior takeaway and matches the course's security-by-shape stance. The wrong/right CodeVariants makes the trap visceral.

### Wrapping the call in a Next.js 16 Route Handler

The climax section: assemble every piece into the production handler. This is where the seam becomes concrete.

- Restate when a Route Handler is the right reach over a Server Action (the convention from Code conventions §Route handlers): the response is a **stream**, so it is a Route Handler under `app/api/chat/route.ts`, not an action. Name this explicitly — streaming is one of the named triggers for reaching past Server Actions.
- The handler is wrapped by `authedRoute(role, schema, fn)` (057.3) plus the rate-limit and daily-quota guards (105.2). Redefine each in one clause — auth + tenancy, burst limit, daily token cap — then treat them as installed. Do not re-teach the wrapper; the point is *where the LLM call sits inside it*.
- The handler body shape, four moves: parse the validated `UIMessage[]` from the request body → `convertToModelMessages(messages)` → `streamText({ model, system, messages, maxOutputTokens })` → `return result.toUIMessageStreamResponse()`.
- The senior call, stated as the section's load-bearing rule: **`toUIMessageStreamResponse()` is the contract between the SDK and the `useChat` hook.** Returning `new Response(stream)` or hand-rolling the stream breaks the v5 parts protocol and the client renders garbage. This is the single most important watch-out in the lesson — give it weight here, inline.

**Component — `AnnotatedCode`** (this is the textbook use: one complex file, direct attention through it part by part). Write the whole `app/api/chat/route.ts` once as the `code` prop, ~14–16 lines, `maxLines` near the ceiling. Steps:
1. `{1-3}` imports + the `authedRoute` wrapper signature — "every LLM call site is a guarded Route Handler; the wrapper lifts auth, tenancy, rate-limit, and the daily quota out of the body." color blue.
2. Highlight the parsed `messages` (validated `UIMessage[]`) — "the client sends UI messages; they are Zod-validated like any request body." color blue.
3. `"convertToModelMessages"` — "convert the rich UI shape to what the model sees, lossy, before the call." color green.
4. The `streamText({...})` call with `system`, `messages`, `maxOutputTokens` highlighted — "the call itself: the handle from `lib/llm/models.ts`, the system controller, the converted messages, the mandatory cap." color green.
5. `"toUIMessageStreamResponse"` — "return the v5 stream protocol; this is the contract the client hook reads. `new Response(stream)` here breaks it." color orange (signals the watch-out).

Reasoning: the handler is where six prior concepts (handle, system, messages, conversion, cap, seam) finally sit in one file. AnnotatedCode lets the student see the whole shape at once while attention moves through it, which is exactly the "one complex block, focus the eye" use case.

### Recording the call with onFinish

Teach the post-call hook as the slot where accounting lands.

- Both primitives accept an `onFinish` callback, fired once with the final result: `{ text, usage, finishReason, response }` (and more). For `streamText` the callback can be passed in the call options or in `toUIMessageStreamResponse({ onFinish })`.
- The senior reflex: this is where the `usage` field (`{ inputTokens, outputTokens, totalTokens }`) and the audit-event write from 105.2 live — the per-user counter increment and the `llm.call.completed` event. Without `onFinish` the post-call accounting has nowhere to land.
- The watch-out, inline and sharp: doing the `usage` write *before* `await`/outside `onFinish` records wrong counts — the call has not completed, output tokens are still unknown. The write must be in the callback. This is the second cost-correctness trap (after the missing cap).

**Component — a small `Code` block** of the `streamText` call with an `onFinish` that reads `usage` and calls the (already-built) audit helper and counter bump. Keep the audit/counter helpers as named calls (`logLlmUsage(...)` / counter increment) — they were built in 105.2, do not re-implement them. One short block; the discipline is *where* the write sits, not its internals.

Reasoning: `onFinish` is conceptually small but its placement is a correctness invariant. A focused block plus the inline trap is enough; no diagram needed here.

### Reacting to finishReason

Teach graceful caps as a UX obligation, not an informational field.

- The result carries a `finishReason`: `'stop'` (natural finish), `'length'` (`maxOutputTokens` hit), `'content-filter'` (provider moderation tripped), `'tool-calls'` (model wants a tool — Chapter 107), `'error'`, `'other'`. (Use this exact union — the value is `'other'`, not `'unknown'`.)
- The senior surfaces it to the UI: an answer truncated by `'length'` shows a "response was cut off" affordance (and is the signal the cap is too low for the surface); `'content-filter'` shows the policy message. A handler that silently ignores `finishReason` produces a UX where the answer ends mid-sentence with no explanation.
- Note the seam back to lesson 3: the handler reads `finishReason` in `onFinish`; the client decides how to render it. This lesson names the values and the obligation; the rendering is lesson 3.

**Component — `Buckets` exercise** (classification drill, low-friction, checks the one thing that matters here: mapping each finish reason to the right UI response). Two buckets:
- "Surface it to the user" — `'length'` (show "cut off"), `'content-filter'` (show policy message).
- "Normal completion / not user-facing here" — `'stop'` (render the answer), `'tool-calls'` (a Chapter-107 concern, not a user error).
- Chips are the finish-reason values; the grader checks placement. Keep `'error'`/`'other'` out of the drill to avoid ambiguity, or fold them into "surface it" with a generic failure message — author's call, but keep it unambiguous.

Reasoning: a Buckets drill is the right weight for "did you understand which reasons need a UI reaction" — it is recall-plus-judgment, not syntax, and the chapter explicitly wants the student reacting to `'length'` and `'content-filter'`.

### Cancelling an abandoned stream

Teach `abortSignal` as a cost discipline.

- `streamText` accepts `abortSignal`; the handler forwards the request's signal (`request.signal`) so a user navigating away cancels the model call mid-stream. An abandoned request that keeps generating burns tokens for nothing — the cost discipline from 105.2 applies at the call site.
- The pattern: pass `request.signal` through to `streamText`; the SDK and provider observe it and stop.
- One precise current-API note (verified): on abort, `onFinish` does not fire by default, so the usage/audit write can be skipped for cancelled calls — to still record a cancelled call, pass `consumeStream` in `toUIMessageStreamResponse({ consumeStream, onFinish })` (or handle `onAbort`). Mention this as a one-line senior note so the student does not assume the audit write always runs; do not over-develop it.

**Component — a small `Code` block** showing `streamText({ ..., abortSignal: request.signal })`, one line of focus. No diagram.

Reasoning: this is a one-knob concept; a single highlighted line plus the abort/`onFinish` nuance is the right depth. It reinforces that cost discipline is syntactic, not operational.

### The determinism dial: temperature

A deliberately short section — name the dial, name the default, skip the ML.

- `temperature` controls output randomness. The senior default for SaaS workloads is low (0–0.3 for classification, summarization, extraction); raise it only when creative variance is the actual feature.
- One sentence on why low is the default for these workloads: reproducibility and format stability matter more than novelty when downstream code or a user is relying on the answer's shape.
- No deep treatment. One inline mention of the argument on a call, done.

Reasoning: the chapter explicitly scopes this to a one-line treatment; over-teaching temperature is a cognitive-load tax with no payoff for the SaaS student.

### How a chat request flows through the seam

The lifecycle diagram section — make every seam visible with its name from prior chapters. The chapter outline calls for this explicitly.

**Component — Mermaid sequence diagram** inside `<Figure>` (sequences are Mermaid's top pick per the diagrams index). Participants: Client (`useChat`), Route Handler, Guards (`authedRoute` + rate-limit + quota), `streamText`/Provider, Audit log. Flow:
1. Client `sendMessage` → POST `/api/chat` with `UIMessage[]`.
2. Route Handler → Guards (auth, tenancy, rate limit, daily quota) — a `Note` that a failed guard returns 4xx/429 before any token is spent.
3. Guards pass → `convertToModelMessages`.
4. → `streamText` → Provider streams deltas back (draw the return arrow as the stream).
5. `onFinish` → write `llm.call.completed` to the audit log (usage + cost).
6. Route Handler → `toUIMessageStreamResponse()` → Client receives stream parts.

Caption names the payoff: each box is a seam with a name from a prior chapter; the diagram shows the LLM call is one guarded step inside the request, not a raw provider hit. Keep it horizontal/compact; apply the `themeCSS` font bump from the mermaid doc if text shrinks. Mark the client-side render of parts as out-of-scope-here (lesson 3) in the caption so the boundary is clear.

Reasoning: the request lifecycle is inherently temporal with named actors — a sequence diagram is the correct shape. Its pedagogical goal is to consolidate the whole lesson into one picture and to make the cost/auth seams legible, reinforcing that nothing reaches the provider unguarded.

### Practice / check (placement: end of body, before resources)

Two lightweight checks to consolidate the two spine decisions. Place each near the concept if it reads better inline, but a short consolidation block here is acceptable.

- **`MultipleChoice`** — present a small workload ("classify an inbound email into a status bucket so a Drizzle query can branch on it") and ask which primitive fits. Correct: `generateText` (small output, code consumes it). Distractors: `streamText` (with a plausible-but-wrong rationale about speed), and one that omits the cap. Write the rationale in `McqWhy` framed around "who reads the output" — not a prose echo. Reasoning: forces the streaming-vs-batch judgment, the lesson's core decision.
- **`Sequence`** ordering drill — reorder the Route Handler's moves: guards (auth/quota) → parse `UIMessage[]` → `convertToModelMessages` → `streamText` → `onFinish` audit write → `toUIMessageStreamResponse`. Include the four-line handler as the fixed code block above the steps. Reasoning: the handler order *is* the lesson's procedural takeaway; an ordering drill checks it without asking the student to type, and the parse-before-call / convert-before-call / write-in-onFinish ordering is exactly where mistakes happen.

Do not build a live-coding exercise here. `ReactCoding` cannot load the `ai` package (react-family only, per project memory), and a Sandpack/Script sandbox running real `streamText` would need provider keys and network — impossible in-browser. Guided drills (MultipleChoice, Sequence, Buckets) are the correct ceiling for this lesson; note this explicitly so a downstream agent does not attempt a sandbox.

### External resources (optional, end)

`ExternalResource` cards: the AI SDK Core "Generating Text" docs page and the AI SDK "Stream Text"/chatbot route-handler guide. Optionally a short, current YouTube walkthrough of the v5 streaming route handler via `VideoCallout` if the resourcer finds a recent (2026, v5/v6-correct) one — gate it on the video actually teaching v5 shapes (`toUIMessageStreamResponse`, `convertToModelMessages`), since v4-era videos teach the wrong API and are worse than nothing. Keep to two or three cards.

---

## Scope

**This lesson covers:** `streamText` vs `generateText` and the streaming-vs-batch decision; the messages array and the role contract; `prompt` vs `messages`; the system prompt as controller and the structural prompt-injection rule; the Next.js 16 Route Handler shape (`authedRoute` wrapper, `convertToModelMessages`, `streamText`, `toUIMessageStreamResponse`); `onFinish` and the usage/audit write; `finishReason` and graceful caps; `abortSignal` cancellation; a one-line `temperature` treatment; the request-lifecycle diagram.

**Explicitly out of scope (do not teach):**

- **`generateObject` / `streamObject` and structured output** — lesson 2 of this chapter. If a structured-output need arises in an example, point forward; do not show the call.
- **The client side: `useChat` / `useCompletion` / `useObject`, the `UIMessage` `parts` array render, manually managed input state, `sendMessage`/`regenerate`/`stop`/`status`** — lesson 3 of this chapter. This lesson names `convertToModelMessages` and `toUIMessageStreamResponse` as the two ends of the contract and stops there; it does not build or show the client component. `UIMessage`/`ModelMessage` are named as types only, with the `parts` detail deferred.
- **Tool calling, the agentic loop, `stopWhen`/`stepCountIs`** — Chapter 107. The `'tool-calls'` finish reason is named in the union but its handling is a forward pointer.
- **Generative UI (`streamUI`, `ai/rsc`)** — Chapter 107.
- **`experimental_telemetry` / OpenTelemetry spans** — Unit 19 observability; not here.
- **Provider-specific options (reasoning tokens, prompt caching, structured tool outputs)** — out of scope; the AI Gateway (105.3) absorbs provider differences.
- **Image / file inputs (`file`-type message parts)** — out of scope.
- **The worked invoice Q&A surface end-to-end** — Chapter 108.

**Prerequisites to redefine in one sentence, then reach for (do not re-teach):**

- `lib/llm/models.ts` named handles (`fastModel`/`chatModel`/`smartModel`) — the model is an imported handle, never inlined (105.3). Every snippet imports the handle; flag inlining `openai('gpt-X')` as the watch-out it is.
- `maxOutputTokens` mandatory on every call — the per-call cost cap (105.2). Shown on every call site on purpose.
- `authedRoute(role, schema, fn)` — lifts auth, role, schema parse, tenancy out of the handler body (057.3); the rate-limit and daily-quota guards sit inside it (105.2). One clause each.
- The `llm.call.completed` audit event and per-user usage counter — built in 105.2; called by name inside `onFinish`, not re-implemented.
- Route Handlers vs Server Actions — streaming responses are the named trigger for a Route Handler (Code conventions §Route handlers); name it, do not re-teach the decision tree.
- Zod request-body validation — the `UIMessage[]` body is `safeParse`d like any handler input (Code conventions §Schemas, §Route handlers).

---

## Code conventions alignment

- **Single quotes, 2-space indent, semicolons, trailing commas, 80-col** (Biome). All snippets.
- **Named handles in `camelCase`** (`chatModel`, `fastModel`) — model handles are regular state, not `SCREAMING_SNAKE_CASE` (§Naming). The system-prompt module constant is a true compile-time constant → `SCREAMING_SNAKE_CASE` (`SYSTEM_PROMPT`).
- **Route handler shape** (§Route handlers): one handler file per route; `POST` as a named export; parse body with a Zod schema; `authedRoute` wrapper. RFC 9457 problem+json error shape for guard failures is the established convention — reference it for the 4xx/429 paths but keep the focus on the happy path.
- **`import type`** for the message types (`UIMessage`, `ModelMessage`) where imported as types only (§TypeScript, `verbatimModuleSyntax`).
- **`import 'server-only'`** is implied for any `lib/llm/*` module shown (SDK with a secret key) (§Module boundaries) — mention once if a `lib/llm` file is shown; the route handler itself is server-only by location.
- **Arrow functions bound to `const`** for the `authedRoute` callback (§Function form).
- **Return types on exported functions** — the exported `POST` handler's return is framework-typed; the `authedRoute` callback can lean on inference. Annotate only where the signature is the lesson.
- **Deliberate divergence to note for downstream agents:** snippets strip the full `authedRoute` wrapper internals and the guard implementations down to named calls so the LLM call site is legible — this is pedagogical staging (§4 of Pedagogical guidelines), not the production file. Flag in the MDX (a one-line aside) that the auth/quota guards are shown abbreviated and were built in earlier units.

---

## Fact-check notes (verified June 2026)

- v5 canonical route-handler shape confirmed: import `streamText`, `convertToModelMessages`, `UIMessage` from `ai`; convert messages; `return result.toUIMessageStreamResponse()`. `toTextStreamResponse()` is the plain-text variant.
- `onFinish` receives `{ text, finishReason, usage, response, steps, totalUsage }`. `usage` is `{ inputTokens, outputTokens, totalTokens }`.
- `finishReason` union is `'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other'`. **Corrected from the chapter outline's `'unknown'` → the value is `'other'`.**
- `maxOutputTokens`, `temperature`, `abortSignal` are AI SDK Core call settings (not in the minimal docs example but documented under settings).
- Abort nuance (verified): `onFinish` does not fire on abort by default; pass `consumeStream` in `toUIMessageStreamResponse(...)` (or handle `onAbort`) to run post-abort logic. Surfaced as a one-line senior note, not a full subsection.
- `model` accepts a plain gateway string (e.g. `'anthropic/claude-sonnet-4.5'`) in current SDK versions, but the **course discipline is the imported named handle from `lib/llm/models.ts`** — teach the handle, not the inline string.
