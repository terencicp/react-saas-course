# Lesson title

- **Title:** `useChat`, `useObject`, and the parts array
- **Sidebar label:** The chat surface in React

---

# Lesson framing

The closing mechanics lesson of the chapter. Lessons 1 and 2 built the server side — `streamText`/`generateText` and `generateObject`/`streamObject` behind an `authedRoute` handler that returns a stream. This lesson is the client half: how a Client Component subscribes to that stream, renders text deltas and partial objects as they arrive, owns the input box, and persists the conversation. It is the surface the user actually sees.

**The senior question that opens the lesson:** the server pushes tokens as a stream — what subscribes to it on the React side, and how does the rendered UI stay correct under React 19 streaming and the AI SDK v5 transport architecture? The answer is three hooks (`useChat`, `useCompletion`, `useObject`), one rendering rule (`message.parts`, never `message.content`), and one architectural boundary (Server Component loads history → Client Component mounts the hook).

**The single most important takeaway** — the one mental model the student must leave with — is the **two-message-types boundary**: the app stores and renders `UIMessage[]` (rich: parts, tool calls, metadata); the model only ever reads `ModelMessage[]` (lossy). `convertToModelMessages` collapses one into the other at the handler seam, `toUIMessageStreamResponse` speaks the parts protocol back. Everything else in the lesson hangs off this. The continuity notes from Lesson 1 already committed `convertToModelMessages` and `toUIMessageStreamResponse` as the handler contract and named the client work as this lesson's debt — this lesson closes that debt and shows the hook on the other end of the exact same `/api/chat` route.

**v5-is-canonical is the framing discipline, repeated.** This is the lesson where v4 muscle memory bites hardest, because the web is full of v4 `useChat` snippets that are wrong by construction. Three v4 assumptions break and each must be named once, at the moment it bites, never as a bundled "what changed" section: (1) the hook no longer manages input state — the component owns a plain `useState`; (2) messages are `UIMessage` with a `parts` array, not flat `.content`; (3) the call surface is `sendMessage`/`regenerate`, not `append`/`reload`; and the endpoint is wired via `transport: new DefaultChatTransport({ api })`, not a bare `api` string in spirit. Frame each break as *the leaky v4 abstraction got removed* — input state in a data-fetching hook was always a smell, and owning it with `useState` is just a normal React form (Chapter 024). This reframes "new API to memorize" as "the hook got smaller and more honest," which lowers cognitive load.

**Verified API surface (June 2026), corrected against the chapter outline's v4-era names:**
- `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }), messages, onFinish })` — endpoint via `transport`; persisted history prop is **`messages`**, NOT `initialMessages` (chapter outline is wrong here — flag for downstream agents). Returns `{ messages, sendMessage, regenerate, status, error, stop, setMessages, clearError }`.
- `sendMessage({ text: input })` — the text-part send shape. Input is a plain `const [input, setInput] = useState('')`, cleared with `setInput('')` on submit.
- Persistence is server-side: the handler returns `result.toUIMessageStreamResponse({ originalMessages: messages, onFinish: ({ messages }) => saveChat(...) })` — the canonical v5 pattern and consistent with the course's "all writes inside `onFinish`, server-side" thread. `useChat`'s own `onFinish({ message, messages, isAbort, isDisconnect, isError })` exists but is for client UI reactions, not the durable write (a navigated-away tab never fires it).
- `useObject` ships as `experimental_useObject` — import aliased: `import { experimental_useObject as useObject } from '@ai-sdk/react'` (continuity notes from Lesson 2 flagged this). Returns `{ object, submit, isLoading, stop, error, clear }`; `object` is typed `DeepPartial<RESULT> | undefined`.
- `useCompletion()` returns `{ completion, complete, isLoading, stop, error }` — `completion` is the streaming string, `complete(prompt)` triggers it.

**Pedagogical spine.** Lead with the parts-array rendering rule and the two-message-types boundary (the load-bearing concepts), then introduce each hook as the right tool for a workload (chat → `useChat`, single-shot text → `useCompletion`, partial object → `useObject`), mirroring the three server primitives the student already knows. Code is the primary vehicle — this is hands-on React — but **no live AI sandbox is possible** (continuity notes from both prior lessons: `ReactCoding` is react-family-only and can't load the `ai`/`@ai-sdk/react` packages, and provider keys can't run in-browser). Exercises are therefore MCQ / Sequence / Buckets / Dropdowns only, plus two diagrams: a `DiagramSequence` for the full client↔server message lifecycle (the keystone visual) and a small static `Figure` for the Server/Client component boundary. Keep every code snippet importing the model handle from `lib/llm/models.ts`, carrying `maxOutputTokens`, and POSTing to the same `/api/chat` the Lesson 1 handler defined — the disciplines are cumulative, not re-argued.

Estimated student time: 45–55 minutes.

---

# Lesson sections

## Introduction (no header — opening prose)

Open with the senior question above: the stream exists, what consumes it. One short paragraph connecting back — Lessons 1 and 2 left a route handler returning `toUIMessageStreamResponse()` and named the client as a debt; here we collect it. State the end-state skill concretely: by the end the student can wire a streaming chat box and a structured-output form against the routes they already built, with input state, the parts render, the cancel control, and persistence all in the right place. Preview the one mental model (two message types) and the one rule (`parts`, not `content`). Keep it to ~3 short paragraphs, warm and terse, no celebration.

## Two message types: what the app stores vs. what the model reads

**Why first:** this is the architectural keystone; every hook and every handler line below is an instance of it. Teaching it up front means the rest of the lesson is recognition, not surprise.

Content:
- Reintroduce the pair the student met in Lesson 1, now from the client's vantage. `UIMessage` = the rich, app-owned shape: `{ id, role, parts: UIMessagePart[] }` plus metadata. `ModelMessage` = the lossy shape the model actually reads. The app **stores and renders** `UIMessage[]`; the model **only ever sees** `ModelMessage[]`.
- The two converters are the seam, and they live on the **server**, not the client: `convertToModelMessages(messages)` collapses `UIMessage[]` → `ModelMessage[]` right before `streamText` (the student wrote this in Lesson 1); `result.toUIMessageStreamResponse()` streams parts back in the protocol the hook understands. The client never calls either — it sends `UIMessage[]` up and receives stream parts down.
- The senior consequence, stated as a rule the student will see enforced twice more: **persist `UIMessage[]`, never `ModelMessage[]`.** Saving the lossy shape throws away tool calls, reasoning, and metadata, so the next mount can't faithfully rebuild the conversation. This is the reason `onFinish` saves `messages` (UI shape) later in the lesson.

Component: a small **`Figure`** wrapping a hand-authored HTML two-box diagram — left box "App world: `UIMessage[]` (parts, tool calls, metadata) — stored in DB, rendered in React", right box "Model world: `ModelMessage[]` (role + text, lossy)", with a labeled arrow `convertToModelMessages →` going right and `← toUIMessageStreamResponse` (parts protocol) coming back. Pedagogical goal: make the lossy/rich asymmetry and the location of the seam (server, between the two worlds) spatial and memorable. Cap height, horizontal layout. This is a simple visual aid, not a system graph — exactly the kind of low-effort enrichment the diagram guidance endorses.

`Term` candidates in this section: `UIMessage`, `ModelMessage` (re-explain the prerequisite from Lesson 1 without breaking flow for a reader who skipped it).

## The parts array is the render source of truth

**Why second:** with the two types established, the single rendering rule is the next load-bearing fact, and it's where v4 snippets break most visibly.

Content:
- A v5 message is `{ id, role, parts }`. Each part has a `type`: `'text'` for prose, `'reasoning'` for chain-of-thought traces, `'file'` for attachments, `'tool-<name>'` for tool invocations, plus user-defined data parts. The full richness lives in `parts`.
- The render pattern is `message.parts.map(...)` switching on `part.type`. For this lesson the student only handles `'text'` (tool parts are Chapter 107, named once as the forward pointer and the *reason* the array exists — it's not over-engineering, it's the slot rich content lands in).
- **Name the v4 break here, at the bite point:** a v4 codebase renders `message.content` as a string. That field is gone in v5; rendering it drops every non-text part on the floor. This is the single most common wrong snippet the student will find online.

Component: **`CodeVariants`** with two tabs, "v4 (broken on v5)" using `del=` on a `{message.content}` render, and "v5" using `ins=` on the `message.parts.map(part => part.type === 'text' ? <span key={...}>{part.text}</span> : null)` render. First sentence of each pane carries the verdict ("Drops tool calls, files, and reasoning" / "Renders every part, future-proof"). This is the canonical before/after the component is built for, and showing the wrong shape *labeled as wrong* inoculates against the web's v4 examples.

Watch-out woven into the v5 pane's prose (not a separate tips section): list items need a stable `key` (code-convention rule) — use the part index within the message or a part id, never a bare array index across messages.

`Term` candidates: `parts` (the array), `part.type`.

## `useChat`: the conversation hook

**Why here:** the student now has the two facts every hook depends on; `useChat` is the headline hook and the one wired to the `/api/chat` route from Lesson 1.

Content, built up in stages to keep cognitive load low:

1. **The call and its return.** `const { messages, sendMessage, regenerate, status, error, stop } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`. Name the transport architecture in one breath: v5 delegates sending to a `ChatTransport`; `DefaultChatTransport` speaks HTTP POST + SSE against the route. The student does **not** write a custom transport (named once as out of scope, the default is the right call) — but the *shape* matters because it's why the endpoint is a `transport` option, not a method on the hook.
2. **Manually managed input — the biggest-footprint v5 change.** `useChat` does **not** return `input` / `handleInputChange` / `handleSubmit`. The component owns input via plain `const [input, setInput] = useState('')`; the form's `onSubmit` calls `sendMessage({ text: input })` then `setInput('')`. Reframe: this is just a React form (Chapter 024), uncontrolled-feel but controlled input is fine here; the hook shedding input state removed a leaky abstraction. This is the senior reframing that turns "memorize the new API" into "the hook got smaller."
3. **`status` and `stop` — the streaming UX.** `status` is `'submitted' | 'streaming' | 'ready' | 'error'`. `status === 'streaming'` drives the typing indicator, the disabled input, and reveals the cancel button. `stop()` aborts the in-flight fetch; under the hood the route handler's `abortSignal` (Lesson 1) propagates to the provider, so cancelling actually stops token burn — the cost discipline from Chapter 105 closing the loop on the client. The senior pattern: every chat surface has a visible cancel affordance wired to `stop`.
4. **The rename map, named once each at point of use:** `append` → `sendMessage`, `reload` → `regenerate`. `regenerate()` re-runs the last assistant turn (the "try again" control).

Component: **`AnnotatedCode`** over one complete minimal chat Client Component (~16–18 lines: `'use client'`, the hook call, `useState` for input, the `messages.map` → `parts.map` render, the `<form>` with `onSubmit`, a Stop button gated on `status === 'streaming'`). Step through: (a) `'use client'` + hook call with transport, (b) the input `useState` and why the hook doesn't own it, (c) the `messages` → `parts` render, (d) the form submit calling `sendMessage({ text })` + clearing, (e) `status`-gated Stop wired to `stop()`. `AnnotatedCode` is the right pick because this one block has five distinct teaching points and the student's focus must move across it sequentially — exactly its purpose. Use `color` to tint each step (blue default, orange on the input-state step to flag the v5 change).

`CodeTooltips` is *not* needed on top — `AnnotatedCode` already directs attention; avoid stacking.

Watch-outs, each woven into the relevant `AnnotatedStep` prose: expecting `input`/`handleInputChange`/`handleSubmit` from the hook (gone — use `useState`); calling `append`/`reload` (renamed); missing the `stop` wiring (abandoned streams keep generating).

`Term` candidates: `DefaultChatTransport`, `ChatTransport`, `status` (the lifecycle union), `sendMessage`, `regenerate`.

## Persisting and resuming the conversation

**Why a dedicated section:** persistence is where the two-message-types rule pays off and where the Server/Client boundary is introduced — it's a distinct concept, not a watch-out, so it earns its own header.

Content:
- **The persistence write lives server-side, in the handler's `onFinish` — not on the client.** This is the canonical v5 pattern *and* the course's established discipline (Lessons 1–2: all writes happen inside `onFinish`, server-side, where token counts and the audit event already land). The handler returns `result.toUIMessageStreamResponse({ originalMessages: messages, onFinish: ({ messages }) => saveChat({ chatId, messages }) })`. `originalMessages` is the incoming history; the `onFinish` `messages` is the full updated `UIMessage[]` after the assistant turn — save *that*, calling back to the "persist the UI shape" rule from section 1. Show this 2-line addition to the Lesson 1 handler; it's the same seam, now also writing the conversation.
- **Client `onFinish` is for UI reactions, not the source-of-truth write.** `useChat` *does* expose its own `onFinish({ message, messages, isAbort, isDisconnect, isError })`, but its job is client-side reactions (analytics ping, scroll-to-bottom, toast) — the durable save belongs server-side per the rule above. Name the distinction explicitly so the student doesn't double-write or trust a client write that a navigated-away tab never fires. (The `isAbort`/`isError` flags are why the client copy is unreliable as a persistence trigger.)
- **Loading on the next mount — the Server/Client boundary.** The chat page is a Server Component (Chapter 030) that reads the conversation's `UIMessage[]` from the database (Drizzle, org-scoped) and passes them to the Client Component as a prop. The Client Component mounts `useChat({ messages: initialMessages, ... })`. **Correct the chapter outline here for downstream agents:** the v5 prop is **`messages`**, not `initialMessages` — the student may name the *variable* `initialMessages` but it's assigned to the `messages` option. The architecture: static shell server-rendered, live stream client-rendered, composing naturally under React 19 (Server Components compose Client Components by importing them, per code conventions).
- The round-trip closes: handler `convertToModelMessages` before `streamText`, `toUIMessageStreamResponse({ originalMessages, onFinish })` persists `UIMessage[]` on completion, next load rehydrates from the UI shape via the Server Component prop. Two message types, one seam, three appearances.

Component: a small **`Figure`** (hand HTML, or `ArrowDiagram` with `expandable={false}` if leader lines read better) showing `app/chat/page.tsx` (Server Component) → reads DB → passes `messages` prop → `<Chat>` (Client Component, `'use client'`) mounts `useChat`. Pedagogical goal: cement that the boundary is a prop hand-off, not a client fetch. Keep it to four boxes.

Watch-out woven in: loading history via a client-side `fetch` in a `useEffect` instead of a Server Component prop adds a roundtrip the architecture doesn't need (and `useEffect` for server data is a code-convention anti-pattern — cross-link the reasoning, don't re-teach it). Persisting `ModelMessage[]` loses tool calls and metadata on the next mount.

`Term` candidates: `initialMessages` (clarify it's the conventional variable name for the `messages` prop value, to defuse confusion with the v4 option of that name).

## `useCompletion`: single-shot text in, streaming text out

**Why here:** the second hook, framed as the right tool for the *stateless* workload — mirrors `useCompletion`'s server side and sharpens "reach for the hook that names the workload."

Content:
- When the surface is one input and one streaming output with no conversation — a prose generator, a summary box, an autocomplete drawer — `useChat` is overkill. `const { completion, complete, isLoading, stop, error } = useCompletion({ api: '/api/complete' })`. `completion` is the streaming string; `complete(prompt)` fires the request; no `messages`, no `parts`, no history.
- The route handler is the same `authedRoute` + quota shape but returns `result.toTextStreamResponse()` (the text protocol, not the parts protocol) — name the symmetry so the student sees the handler return helper is chosen by the hook, exactly as in Lesson 1/2.
- Senior cut, stated as a one-line decision: conversation → `useChat`; stateless single-shot → `useCompletion`. Reaching for `useChat` when there's no conversation drags in message-array machinery the surface doesn't use.

Component: a single **`Code`** block (~8 lines) — this hook is simple enough that a plain block beats a stepped walkthrough; reserve heavier components for the load-bearing `useChat` block. Show the hook, a controlled input via `useState`, a Generate button calling `complete(input)`, and `{completion}` rendered with an `isLoading` spinner.

`Term` candidates: `useCompletion`, `toTextStreamResponse` (cross-link to its appearance in Lesson 2's `streamObject` handler).

## `useObject`: partial objects that fill in as they stream

**Why here:** the third hook, the client twin of Lesson 2's `streamObject`, and the one that demonstrates progressive *structured* rendering — the payoff of the whole structured-output thread.

Content:
- The import gotcha first (continuity-flagged): `import { experimental_useObject as useObject } from '@ai-sdk/react'`. It ships experimental; name it once, alias on import, move on. (Quick fact-check note for downstream: confirm the alias is still `experimental_useObject` at authoring time — verified June 2026 but this surface moves.)
- The call: `const { object, submit, isLoading, stop, error } = useObject({ api: '/api/extract', schema: invoiceLineItemSchema })`. **The schema is the same Zod object used server-side** — the single `invoiceLineItemSchema` from Lesson 2 (continuity notes established it as the running shape: `description`/`quantity`/`unitAmount`). One contract, both ends.
- `object` is typed `DeepPartial<RESULT> | undefined` — it builds field by field as the stream parses. The render is conditional, lighting up section by section: `object?.description && <p>{object.description}</p>`, then `object?.unitAmount && <span>{object.unitAmount}</span>`. `submit(input)` kicks it off; `isLoading` and `stop` work as in the other hooks.
- Cross-link: when `streamObject` is the server primitive (Lesson 2), `useObject` is the client primitive; they share the Zod schema. That schema-as-shared-contract is the same portability win Lesson 2 sold for provider swaps, now paying off across the client/server boundary too.

**Progressive-rendering UX rule** (its own short beat, since it's a design judgment the student must internalize, not a watch-out): design the surface so partial output is *useful, not jarring*. A chat box reads naturally as text streams in. A structured form whose fields *appear and disappear* as the model revises looks broken. The senior rule: stream into append-only or stable slots; don't let a half-parsed field flicker. Name it; the student designs around it.

Component: **`DiagramSequence`** is overkill here; use a single **`Code`** block for the `useObject` component plus one inline **`Figure`** (3–4 frame static strip, or a tiny `DiagramSequence` of 3 steps) showing the `object` partial gaining `description` → `quantity` → `unitAmount` across stream ticks, to make "fills in field by field" visible. If using `DiagramSequence`, each `DiagramStep` shows the same card with one more field populated and a caption naming which field just arrived. Pedagogical goal: the abstract "`DeepPartial` builds up" becomes a concrete, scrubable picture.

`Term` candidates: `experimental_useObject`, `DeepPartial`, `submit`.

## Error states the user should actually see

**Why a dedicated section:** error handling on AI surfaces is a security/UX seam (raw provider errors leak vendor identifiers), distinct enough to teach deliberately, and it ties three prior chapters together.

Content:
- Every hook surfaces `error` and `status === 'error'`. The senior reflex: render a **retry control plus a sanitized message** ("the model couldn't complete that request"), **never the raw `error.message`** — provider error strings leak vendor identifiers, model names, and sometimes stack fragments, and they're bad UX besides. This is a concrete instance of the security baseline (never leak internal/vendor detail to the client).
- The *content* of the friendly message comes from the **route handler's HTTP response**, not the model: the RFC 9457 Problem Details the handler already returns (code conventions: 429 rate-limited, 422 validation, etc.). For a provider 429/5xx the surface degrades to "try again in a moment"; for the user's daily token quota (Chapter 105) it shows "you've used your daily limit, resets at midnight UTC." The client maps the status, not the body string.
- Tie-off: this is why Lessons 1–2 put auth/quota/rate-limit guards *in the handler* — so the client has a clean, sanitized HTTP contract to render against, never the provider's raw failure.

Component: a short **`CodeVariants`** — "Leaks vendor detail" (`del=` on `{error.message}` rendered raw) vs. "Sanitized + retry" (`ins=` on a friendly string + a `<button onClick={regenerate}>` / retry). Verdict in the first sentence of each pane. This before/after is the component's sweet spot and drives the security point home visually.

`Term` candidates: `Problem Details` (RFC 9457, re-explain briefly as the handler's error envelope from the route-handler conventions).

## The full lifecycle, end to end

**Why last in the body:** synthesis. The student has all the pieces; this stitches them into one mental movie and is the lesson's keystone diagram.

Content: a prose paragraph tracing one user message through every seam, paired with the diagram. No new API — pure consolidation.

Component: **`DiagramSequence`** (the keystone visual), ~7 steps, each highlighting one seam:
1. Server Component reads `UIMessage[]` from DB, passes as `messages` prop.
2. Client Component mounts `useChat({ messages, transport })`.
3. User types (plain `useState`) and submits → `sendMessage({ text })`.
4. POST to `/api/chat` with `UIMessage[]` → `authedRoute` guards (Ch 105/057).
5. Handler `convertToModelMessages` → `streamText` → stream parts via `toUIMessageStreamResponse`.
6. Client `messages` updates; render walks `parts`; `status: 'streaming'` drives the UX.
7. Handler's `toUIMessageStreamResponse({ originalMessages, onFinish })` saves `UIMessage[]` to DB server-side on completion; next mount resumes from step 1.

Each `DiagramStep` caption names the seam and the chapter that owns it, so the diagram doubles as a map of the whole AI unit so far. Pedagogical goal: make the two message types and the persistence loop visible as one continuous flow — this is the single figure a student would screenshot. `DiagramSequence` provides its own card; do **not** wrap in `Figure`.

Then a closing exercise (see Scope note: exercises only at section-relevant points, this is the natural synthesis point):

**Exercise — `Sequence`:** order the seven lifecycle steps for "a user sends a message in a persisted chat." Source order = correct order (the seven above, compressed to one-line labels). This drills the seam ordering the diagram just taught — the load-bearing recall.

## Mid-lesson checks (exercises placed in-section, not bundled)

Distribute, do not cluster at the end:

- **After the parts-array section — `MultipleChoice`:** "A tutorial renders `{message.content}` and tool calls don't show up. Why?" Correct: it's the v4 shape; v5 richness lives in `message.parts`. Distractors: missing `key`, wrong `status`, transport misconfig. Drills the single most common v4 mistake.
- **After the `useChat` section — `Dropdowns`** (fenced code with `___` blanks): a minimal chat component with blanks for the input-state hook (`useState`), the send call (`sendMessage({ text: input })`), and the cancel handler (`stop`). Reinforces the manually-managed-input muscle the student must build.
- **After the three hooks — `Buckets`:** sort workloads into `useChat` / `useCompletion` / `useObject`. Items: "multi-turn support chat" (chat), "one-shot blog-post summary" (completion), "extract invoice line items as a typed object, render fields as they arrive" (object), "draft a tweet from a brief" (completion), "conversation that must persist across reloads" (chat), "classify and structure a paragraph into a form" (object). Drills "reach for the hook that names the workload."

## External resources (optional, end of lesson)

One or two `ExternalResource` cards: the AI SDK UI Chatbot guide (`ai-sdk.dev/docs/ai-sdk-ui/chatbot`) and the `useObject` reference. Keep to canonical sources; these move, so the card framing should point at "the current hook reference," not pin a behavior.

---

# Scope

**Prerequisites to redefine briefly, not re-teach:**
- `UIMessage` / `ModelMessage` / `convertToModelMessages` / `toUIMessageStreamResponse` — built in Lesson 1; recap in two sentences (the two-message-types section) since they're the client's counterpart, but don't re-derive the handler.
- `streamObject` / `generateObject` and `invoiceLineItemSchema` — Lesson 2; reference the established schema shape, don't re-teach structured output or Zod `.describe`.
- The `authedRoute(role, schema, fn)` handler with quota/rate-limit guards — Chapters 057/105 and Lesson 1; named as the wrapper the routes already have, shown only as the 4-line core when needed.
- Server vs. Client Components and the `children`/prop composition rule — Chapter 030 / code conventions; named, not taught.
- Plain React forms and `useState` — Chapter 024; the framing "this is just a form" leans on it.
- Daily token quota and the cost discipline — Chapter 105; referenced as the source of the friendly quota message and the `stop`→`abortSignal` payoff.

**Explicitly out of scope (defer, name once with the forward pointer where natural):**
- Tool calls rendered as `'tool-<name>'` parts and the agentic loop — **Chapter 107 Lesson 1**. Named once in the parts-array section as *why* the array exists.
- Generative UI (`streamUI`, `ai/rsc`) and per-tool skeletons — **Chapter 107 Lesson 2**.
- Embeddings / RAG — **Chapter 107 Lesson 3**.
- Custom transports (WebSocket, durable, in-process) — named once; `DefaultChatTransport` is the course default.
- Multi-modal inputs (`file`/`image` parts on `UIMessage`) — out of scope.
- Reasoning-trace rendering for reasoning models — out of scope (the `'reasoning'` part type is *named* in the parts list so the array's shape is honest, but not rendered).
- Optimistic updates / client-side dedupe — out of scope; the SDK owns streaming state.
- The fully worked invoice chat surface (typed `useChat`, tool parts, usage panel) — **Chapter 108** (the project). This lesson teaches the mechanics; Chapter 108 assembles them against real invoice data. Do not pre-build the project here.
- `InferUITools` / typed tool parts on `useChat` — Chapter 107/108; this lesson's `useChat` is untyped-tools.

**No live coding sandbox** (continuity-confirmed twice): `ReactCoding` can't load `@ai-sdk/react`, and provider keys can't run in-browser. All exercises are MCQ / Sequence / Buckets / Dropdowns. Do not attempt a `ReactCoding` or `Sandpack` AI sandbox.

---

# Code-convention notes for downstream agents

- Every snippet: `'use client'` on the hook-bearing component; model handle imported from `lib/llm/models.ts` server-side; `maxOutputTokens` on the server call (shown in any handler excerpt); list `key`s tied to identity, never bare index across messages.
- React 19 / Compiler: no `useMemo`/`useCallback` reflex; input state is a plain `useState`; refs (if any) are plain props, no `forwardRef`.
- `useState` for input is correct and idiomatic — controlled input here is fine (it's not URL state, so not `nuqs`).
- Conditional render: `object?.field && <Node/>` is the nullable-guard form the conventions sanction (`value != null && <Node/>` spirit) — fine because `object?.field` is nullable-guarded, but for boolean-ish gates use `Boolean(...)`. Author note: keep `status === 'streaming'` (a real boolean) for gates.
- Route-handler excerpts return `toUIMessageStreamResponse()` (chat) / `toTextStreamResponse()` (completion, streamObject) — never `new Response(stream)`; this is the parts/text protocol contract.
- **Deliberate divergence to flag:** the chat component examples are shown standalone (no full `authedRoute` body re-printed) for focus — the auth/quota wrapper is established in Lessons 1–2 and only its core is shown when the seam is the teaching point. This is intentional staging, not an omission.
