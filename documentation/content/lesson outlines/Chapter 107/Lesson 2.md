# Lesson 2 — Generative UI via tool parts

- **Title (h1):** Generative UI via tool parts
- **Sidebar label:** Generative UI

---

## Lesson framing

This is the lesson where a tool call stops rendering as JSON in a chat bubble and starts rendering as a bespoke React component — an invoice card, a revenue chart, a confirmation prompt. It is deliberately **short and mechanics-light** because it stands on two foundations the student already has: Lesson 1 of this chapter (tools, `execute`, the `tool-<name>` part with its four lifecycle states) and Lesson 3 of Chapter 106 (the `useChat` parts-array render rule). The new material is thin: a typed `switch` on `part.type` and `part.state`, end-to-end typing via `InferUITools`, a tool registry file, per-tool skeletons, and the propose/confirm pattern for destructive tools.

**The senior frame** (decisions before syntax). The whole lesson is one decision applied repeatedly: *the model's tool-call choice picks the component; the tool's `outputSchema` is that component's props contract.* Generative UI is not a new SDK feature — it is a rendering convention layered on the parts protocol that's been the source of truth since Ch106 L3. The senior reflexes to instill: (1) co-design the tool output and the component props as one shape, never reshape inside the component; (2) render every state, not just `output-available`, with a per-tool skeleton over a generic spinner; (3) split destructive actions into `propose` + `confirm` so the human closes the loop; (4) tools are first-class app code in `lib/llm/tools.ts`, never inline in the route handler (inline breaks type inference).

**The "why this path, not `ai/rsc`" decision is load-bearing and must land early.** The TOC names `streamUI` / `useUIState` / `useAIState`. The senior call follows Vercel's own documented recommendation: `ai/rsc` is experimental, AI SDK UI (tool parts + `useChat`) is the production path. Frame it as continuity, not novelty — the tool-parts path reuses the exact `UIMessage`, `useChat`, and route handler from Ch106 L3, keeps rendering on the client where React 19 lives, and survives `ai/rsc`'s API churn. Name it, justify it, move on. Do not teach `ai/rsc`.

**Cognitive-load sequencing.** Start from the one snippet the student already half-knows (the `message.parts.map` switch from Ch106 L3) and add exactly one case to it. Then layer: the four states → typing → registry file → data-flow co-design → destructive-action pattern. Each section adds one idea to a shape that's already on screen.

**No live AI sandbox is possible** (carried fact from Ch106/Ch107 L1: `@ai-sdk/react` + provider keys cannot run in-browser, and `ReactCoding` is react-family only). Exercises are MCQ / Buckets / Dropdowns / Sequence. The rendering *components* (InvoiceCard, skeletons) can be shown as static code and a static `Screenshot`, not a running iframe.

**Pain points this relieves / beginner traps to pre-empt.** Beginners (a) dump tool output as JSON in the bubble; (b) render only on `output-available` and the UI feels frozen on slow tools; (c) reshape tool output inside the component, coupling the component to the tool's quirks; (d) reach for `ai/rsc` because it's in the docs; (e) define tools inline and lose `part.output` typing; (f) let the model call a destructive tool directly; (g) forget the default case and crash on an unknown `part.type`; (h) forget tool parts must persist or the rendered surface vanishes on remount. Every one of these is a watch-out folded into the section that teaches the concept it qualifies.

**Mental model the student leaves with.** "The model is a router that picks which component renders; the tool's output schema is the prop contract; the client walks `parts` in order and switches on `type`+`state`. Destructive work is gated behind a human click, never the model."

---

## Lesson sections

### Introduction (no header)

Open with the concrete problem: in Ch106 L3 the `useChat` loop rendered `text` parts; in Ch107 L1 the model learned to call `getInvoiceById`, which returns `{ id, customerName, total, dueDate, status }`. Right now that result would land in the chat as either nothing (unhandled part) or raw JSON. Pose the senior question implicitly: *the model just decided to call a tool that returned structured data — how does the client turn that into an invoice card with a status badge and a "send reminder" button?* State the end state: by the end the student can render any tool's output as a typed bespoke component, in every lifecycle state, with the model choosing the component. Keep it to ~5 sentences. Forward-link that the worked invoice-chat surface is Chapter 108; this lesson teaches the pattern, not the product.

### Tool parts, not `ai/rsc`

**Goal:** make the architecture decision explicit and final before any code, so the student doesn't go shopping in the docs.

Content: two named approaches to generative UI in the AI SDK. `ai/rsc` (`streamUI`, `useUIState`, `useAIState`) streams server-rendered React components; AI SDK UI (tool parts + `useChat`) streams typed tool parts and renders components on the client. State plainly: **`ai/rsc` is marked experimental in the AI SDK docs and Vercel's documented recommendation is to use AI SDK UI for production.** The senior call follows that. Give three concrete reasons framed as continuity with what they already built: (1) reuses the same `UIMessage` / `useChat` / route handler from Ch106 L3 — zero new infrastructure; (2) rendering stays on the client where React 19's primitives and the component tree already live; (3) survives `ai/rsc`'s ongoing API churn. Close: "We name `ai/rsc` once so you recognize it in the docs; we won't teach it."

Use a small two-row comparison — a plain HTML/CSS table or a tight `ArrowDiagram` is overkill here; a simple two-column prose contrast or a `Buckets`-style framing in prose suffices. **Decision: use a short `TabbedContent` with two tabs ("AI SDK UI — the path we take" / "ai/rsc — the experimental alternative")**, each a 3-bullet panel. Rationale: it visually commits to one tab being the default while keeping the alternative one click away, matching the "name and move on" posture.

`Term` candidates: `ai/rsc`, `RSC` (React Server Components — acronym re-explained in tooltip, since the student met it in Unit 6 but it's been a while).

### From a text part to a tool part: one new case

**Goal:** anchor the entire lesson on the snippet the student already owns and extend it by exactly one branch.

Content: restate the Ch106 L3 render rule — every assistant message is `{ id, role, parts }`, the client does `message.parts.map((part) => ...)` and switches on `part.type`. In Ch106 the only case was `case 'text': return <span>{part.text}</span>`. Now add one case: `case 'tool-getInvoiceById':`. Explain the naming: the part `type` is literally `tool-` + the key from the `tools` object (carried fact from Ch107 L1: `tool-getInvoiceById`). The model calling that tool is what *produces* the part; the client deciding what to render for that `type` is the generative-UI half.

**Component: `CodeVariants`** with two tabs, before/after, `syncKey` not needed.
- Tab "Ch106: text only" — the `parts.map` switch with just the `text` case (and a `default` returning `null`), `del`/`ins` not needed, this is the baseline.
- Tab "Ch107: + one tool case" — same switch with the `tool-getInvoiceById` case added via `ins=`, rendering `<InvoiceCard ... />`.
Rationale: before/after on the *same* switch is exactly what `CodeVariants` is for, and it makes "this is one added branch, not a rewrite" unmissable.

Keep the tool case's body minimal here (just `return <InvoiceCard output={part.output} />` as a teaser) — the per-state handling is the next section. One sentence: "but `part.output` only exists once the tool has finished — the next section handles the in-between."

`CodeTooltips` is not needed here; the switch is plain. Mention the **default case** rule inline in the prose ("always keep a `default` that fails gracefully — an unknown `part.type` should never crash the render") since it qualifies this exact snippet; do not defer it to a watch-out bucket.

### Rendering the four lifecycle states

**Goal:** turn the four state names from Ch107 L1 into four concrete renders, and install the per-tool-skeleton reflex.

Content: the same `tool-getInvoiceById` part moves through `state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'` (carried from L1, now rendered). Per-state UX:
- `input-streaming` — argument tokens arriving; the senior surface usually renders nothing here (or the skeleton). One line.
- `input-available` — arguments parsed, `execute` running server-side; render a **tool-specific skeleton** (`<InvoiceCard.Skeleton />`), not a generic spinner. This is the load-bearing reflex: a chat with five tools shows five different skeletons, because the skeleton is the affordance the tool-parts model buys you — the user sees *an invoice loading*, not *something loading*.
- `output-available` — the real render: `<InvoiceCard {...part.output} />`. `part.output` is now populated and typed (next section).
- `output-error` — render a sanitized failure state. **Critical correction surfaced in research:** the error text is on `part.errorText`, and it is already a sanitized string the SDK exposes — render it inside your own error component, do not reach for a raw `error.message`. Tie to the Ch106 L3 error-sanitization discipline.

**Component: `AnnotatedCode`** over a single `switch (part.state)` block (≈12 lines), one step per state, `color`-coded (`input-available`→orange skeleton, `output-available`→green, `output-error`→red). Rationale: this is the canonical shape of the lesson; `AnnotatedCode` keeps the whole switch on screen while directing attention to one state's render at a time — exactly the "glance between code and explanation" loop it's built for. Cap `maxLines` ~14.

**Visual: a `DiagramSequence`** threading the lifecycle across the server/client boundary — the keystone diagram of the lesson.
- Step 1: Model emits tool call → part appears, `state: input-streaming` (client shows nothing/skeleton-stub).
- Step 2: arguments parsed → `state: input-available`; **`execute` runs server-side** (mark this node as living on the server) → client shows `<InvoiceCard.Skeleton />`.
- Step 3: result returns → `state: output-available`, `output` populated on the part → client switches on `part.type`, renders `<InvoiceCard {...output} />`.
- Step 4 (branch): if `execute` errored → `state: output-error`, `errorText` on the part → client renders the sanitized error component.
Pedagogical goal: make visible (a) that `execute` is the only server-side step and (b) that each state is a distinct client render, not a single deferred one. Each step's body is a small two-lane HTML/CSS figure (server lane / client lane) with the active node tinted. Per-step `caption`.

`Term` candidates: `skeleton` (loading-placeholder UI — quick definition for the student who hasn't met the term as a named pattern).

### Typing the chat end-to-end with `InferUITools`

**Goal:** make `part.output` typed instead of `unknown`, paying the L1 debt where `outputSchema` was named but never shown.

Content: in v5 the student types the whole chat so `part.input` and `part.output` carry the tool's inferred shapes. The chain (verified against the official reference):
1. `InferUITools<typeof tools>` (imported from `ai`) infers `{ [toolName]: { input, output } }` from the tool registry.
2. `type MyUIMessage = UIMessage<never, UIDataTypes, MyUITools>` — the three generics are `<metadata, dataParts, tools>`; `never` for metadata and `UIDataTypes` for data parts are the defaults the student uses here.
3. `useChat<MyUIMessage>({ ... })` on the client, and the **same type is passed on the server** to the message-stream helper for full-stack type safety.
Result: inside the `case 'tool-getInvoiceById'`, `part.output` autocompletes as `{ id, customerName, total, dueDate, status }` — no cast, no `unknown`. This is where `outputSchema` from L1 finally earns its keep: it's the schema that flows through `InferUITools` to become the prop type.

**Component: `AnnotatedCode`** (3 steps) over the four-line type-derivation block (`InferUITools` → `UIMessage<...>` → `useChat<MyUIMessage>`), color-coded, so the type flow reads top-to-bottom. Then a short `Code` block (or `CodeTooltips`) showing the payoff: the `case` body with `part.output.status` autocompleting.

**`CodeTooltips`** on the payoff block is a good fit: tooltip `InferUITools` ("infers `{ input, output }` for every tool in the set"), `UIMessage` ("the typed message; generics are `<metadata, data, tools>`"), `never` ("no custom metadata on this message type"). Rationale: these are exactly the "short inline definition that would otherwise force the reader out of the code" cases the component exists for.

`Term` candidates: `InferUITools`, `UIDataTypes`.

### The tool registry lives in `lib/llm/tools.ts`

**Goal:** establish the file convention and explain *why* inline definitions break the typing just built.

Content: tools are first-class app code, version-controlled and lint-covered, the same as routes. They live in `lib/llm/tools.ts` (mirrors `lib/llm/models.ts` from Ch105 L3 and `lib/llm/prompts.ts` from Ch106 L1). The route handler does `import { tools } from '@/lib/llm/tools'` and passes `tools` to `streamText`; the client component imports the inferred `MyUIMessage` type from the **same module**. The causal link to the previous section: `InferUITools<typeof tools>` needs a single exported `tools` object to infer from — a tool defined inline in the route handler can't be imported by the client, so the message type can't see it and `part.output` collapses to `unknown`. The file convention isn't tidiness; it's what makes end-to-end typing possible. (Carried fact from L1: the running tool was deliberately kept inline there; *this* is the extraction.)

**Component: `FileTree`** showing `lib/llm/` with `models.ts`, `prompts.ts`, `tools.ts` to land the convention visually alongside its siblings. Then a tight `CodeVariants` (two tabs):
- "Inline (breaks typing)" — tool defined inside the route handler, with a comment-marked note that the client can't import it.
- "Registry (typed)" — `lib/llm/tools.ts` exporting `tools` + `MyUIMessage`, the handler importing `tools`, the client importing `MyUIMessage`.
Rationale: the failure-vs-correct framing is precisely `CodeVariants`' before/after job, and it makes the "inline is a typing bug, not a style choice" point structurally.

### Co-designing the tool output and the component props

**Goal:** install the single most senior reflex of the lesson — the schema *is* the props contract; never reshape in the component.

Content: the tool's `outputSchema` and the React component's props are **one shape, designed together.** A `getInvoiceById` tool returning `{ id, customerName, total, dueDate, status }` feeds `<InvoiceCard />` directly; a `getMonthlyRevenue` tool returning `{ months, totals }` is shaped for `<RevenueChart />`. The anti-pattern: returning a raw Drizzle row (or a different shape) from the tool and reshaping it inside the component — this couples the component to the data source's quirks and means the component "knows" where its data came from. The senior cut: when you write the tool's `outputSchema`, you are writing the component's prop type; pick the shape the component wants. This also reinforces L1's "project, don't dump" result-shaping rule — the projection target is now explicitly the component contract.

**Component: `CodeVariants`** (two tabs) contrasting:
- "Reshape in component (coupled)" — tool returns the raw row; `<InvoiceCard>` does `const total = row.amountCents / 100; const name = row.customer.displayName ?? ...` inside render.
- "Co-designed schema (decoupled)" — `outputSchema` already emits `{ customerName, total, ... }`; `<InvoiceCard {...part.output} />` with no reshaping.
Rationale: the coupling cost is only obvious when the two shapes sit side by side.

Optionally show one more pairing briefly (the `getMonthlyRevenue`→`RevenueChart` shape) in a plain `Code` block to reinforce that the pattern generalizes beyond invoices.

**Exercise — `Buckets` (two-column).** Title-frame: "Where does each transformation belong?" Buckets: "In the tool's `outputSchema`" vs "In the React component". Items (chips): "Convert `amountCents` to a formatted currency string" (→ component, presentation), "Filter rows to the current org" (→ tool, it's authorization/data), "Pick the top 5 rows" (→ tool, projection), "Choose the status badge color" (→ component, presentation), "Join customer name onto the invoice" (→ tool, shaping the contract), "Format `dueDate` as a relative time" (→ component). Goal: drill the boundary — *data selection/shaping/authorization in the tool; presentation in the component.* Grading: each chip to its correct bucket. Rationale: the boundary is fuzzy for beginners and a classification drill is the cleanest way to make them commit to a rule.

### Text and tool parts in one message

**Goal:** show that the parts array is ordered and mixed, so tools render where the model narrated them.

Content: a single assistant message can hold text parts and multiple tool parts **in render order.** The model's narration sits between tool renders: "Here's the invoice you asked about" [InvoiceCard] "— want me to send a reminder?" The client's `parts.map` already walks the array in order, so the only rule is: render each part where it sits, never collect all tool renders at the bottom. The parts-array order is meaningful and the model controls it.

**Visual: a small static `Screenshot`** (or a hand-built HTML mock inside `Figure`) of a chat bubble showing text → InvoiceCard → text → a second tool render interleaved, so the student sees the interleaving rather than just reading about it. (Static mock, since no live AI render is possible.) Caption ties it to the ordered `parts.map`.

Keep this section tight — it's a one-idea section reinforcing the Ch106 L3 parts model.

### Destructive tools: the propose/confirm pattern

**Goal:** install the human-in-the-loop reflex for side-effecting tools — the highest-stakes pattern in the lesson.

Content: when a tool's effect is destructive or costly (sending an invoice, deleting a row, charging a card), the model must **never** trigger it directly. Split the action into two tools:
- `proposeInvoiceSend` — read-only; returns a **preview shape** the client renders as a confirmation card with explicit "Send" / "Cancel" buttons.
- `confirmInvoiceSend` — does the actual work; the client only emits this tool call (via `sendMessage` / `addToolResult`-style continuation) **after the user clicks Send.**
The model proposes; the human confirms; the loop continues only on the human's click. Frame the stakes in production terms: an unguarded destructive tool means the model will eventually delete or send the wrong thing on a hallucinated argument — this is a "when," not an "if." Tie back to L1's `stopWhen` loop: the confirmation is a deliberate break in the agentic loop where control returns to the human before the next step.

**Visual: an `ArrowDiagram`** (inside `Figure`, `expandable={false}` per the LeaderLine constraint) showing the gated flow: model → `proposeInvoiceSend` (read-only) → confirmation card with two buttons → [Send click] → `confirmInvoiceSend` (the write) → result; with the "Cancel" branch terminating. Pedagogical goal: make the human-click gate a visible node in the flow, not an afterthought. Alternative if the arrow layout fights the agent: a 3-step `DiagramSequence` (propose → human decides → confirm-or-stop).

Show the two-tool shape as a `Code` block (the two `tool({...})` definitions, `proposeInvoiceSend` with `outputSchema` describing the preview, `confirmInvoiceSend` with the real `execute`) plus a short snippet of the confirmation-card component rendering the two buttons. Note the worked end-to-end version lands in Chapter 108; here we teach the shape.

`Term` candidate: `human-in-the-loop`.

### What stays the same: auth, audit, persistence

**Goal:** reassure the student that adding tool parts changes none of the seams from L1 and Ch106 L3 — composability over novelty.

Content: a quick consolidation, not new mechanics. Tool parts ride the existing protocol, so:
- **Authorization** still happens inside each tool's `execute` (L1's rule: org-scope filter, `session.orgId`); generative UI adds nothing to the trust boundary.
- **Audit** events still write in `onStepFinish` (per step) and `onFinish` (aggregate) — unchanged from L1.
- **Persistence** still saves `UIMessage[]` server-side in `toUIMessageStreamResponse({ originalMessages, onFinish })` (Ch106 L3) — but now that array **includes the tool parts and their typed outputs.** The watch-out lands here, in context: if you persist a lossy shape (or drop tool parts), the next mount loses the rendered surface — the invoice card is gone on reload. Persist the full `UIMessage[]`.
- **The Server Component shell** still loads `initialMessages` and hands them to the client (Ch106 L3) — unchanged.

No diagram needed; a short prose consolidation with a tight `Code` snippet of the unchanged handler return (`toUIMessageStreamResponse({ originalMessages, onFinish })`) to show tool parts flow through it for free.

**Exercise — `MultipleChoice` (or `TrueFalse` round) as a section/lesson capstone.** A few items probing the load-bearing decisions: which package is the production path for generative UI (AI SDK UI / tool parts, not `ai/rsc`); what `part.output` is typed as when the tool is defined inline in the route handler (`unknown` — typing breaks); why a destructive action is split into two tools (the human confirms, the model never triggers the write); which state should render a per-tool skeleton (`input-available`). Rationale: a recall check on the four decisions the lesson exists to install.

### External resources (optional)

One or two `ExternalResource` cards: the AI SDK "Generative User Interfaces" guide and the `InferUITools` reference. Keep to two.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The four tool-part lifecycle states and the `tool-<name>` part type (Ch107 L1) — name them, render them; the *definition* of tools, `execute`, `inputSchema`, `stopWhen`, `onStepFinish`/`onFinish` is L1's and is assumed.
- The `message.parts.map` render rule, `useChat`, `DefaultChatTransport`, `sendMessage`, server-side persistence via `toUIMessageStreamResponse`, error sanitization, the Server-Component-loads-history pattern (Ch106 L3) — assumed; reference, don't rebuild.
- `outputSchema` (Ch107 L1) — named there, *shown and put to work here* as the `InferUITools` props contract (this is the explicit debt being paid).
- Zod 4 discipline, `.describe()`, `z.uuid()` (Ch106 L2, Ch107 L1) — assumed.
- `lib/llm/models.ts` / `prompts.ts` conventions (Ch105 L3, Ch106 L1) — referenced as the sibling pattern for `tools.ts`.

**This lesson does NOT cover (and why):**
- `ai/rsc`, `streamUI`, `useUIState`, `useAIState` — named once as the experimental alternative in the first body section, not taught (chapter-outline cut; Vercel recommends AI SDK UI for production).
- Custom data parts (non-tool typed `UIMessage` parts) — named in passing only when discussing `UIDataTypes` in the typing section; full treatment out of chapter scope.
- Reasoning-trace rendering — out of scope (named nowhere).
- Multi-modal generative UI (image-generation tools rendering image parts) — out of scope.
- Streaming **partial** tool output (the v5 generator/`yield` shape for long-running tools) — mention as a one-line capability in the lifecycle-states section ("for long-running tools, `execute` can yield partial results and `output` populates progressively, like a streaming object"), but the default is return-once-with-a-small-schema; do not build it. (Chapter outline lists this as a "mention the capability" item, not a teach item.)
- The agentic loop internals, `stopWhen`, step caps, `prepareStep`, `toolChoice` — all Ch107 L1; referenced only where the confirm pattern breaks the loop.
- Embeddings / pgvector / RAG — Ch107 L3.
- The worked invoice-chat product (usage panel, real data wiring, the propose/confirm end-to-end) — Chapter 108. This lesson teaches the *pattern*; repeatedly forward-point to Ch108 for the product.
- AI SDK 6/7 APIs — the chapter committed to the **v5 string-mode** surface (Ch106 L2 continuity note: do not introduce v6 `Output.*` or migrate APIs mid-chapter). Author against v5: `InferUITools` from `ai`, `UIMessage<never, UIDataTypes, MyUITools>`, `useChat<MyUIMessage>`, `part.errorText`. A downstream re-verify of API stability is warranted but no migration in this lesson.

---

## Code conventions notes (for downstream agents)

- Tool registry at `lib/llm/tools.ts`; import via `@/lib/llm/tools`. Mirror the `models.ts`/`prompts.ts` module-constant convention.
- Model handles stay camelCase imports from `lib/llm/models.ts` (`smartModel` for tool-use reasoning, per L1); never inline `openai('...')`.
- Zod 4 builders: `z.uuid()` top-level (not `z.string().uuid()`); `.describe()` on non-obvious fields, read by the model.
- The inline `eq(invoices.orgId, session.orgId)` org-scope in `execute` is the **deliberate pedagogical flattening** from L1 (production uses `tenantDb(orgId)` / `db/queries/` helpers) — downstream agents must not "fix" it to look more production-real; it keeps the snippet legible.
- `withLlmQuota(...)` wraps **around** `authedRoute(...)`; snippets abbreviate both into a single `authedRoute(...)` call (Ch106 convention) — do not imply `authedRoute` owns the quota gate.
- Return typed error shapes from `execute` (`{ error: 'invoice_not_found' as const }`), never throw (L1) — and on the client, render `part.errorText`, never a raw `error.message`.
- Persist `UIMessage[]` (not `ModelMessage[]`) including tool parts; durable write in the handler's `onFinish`, not the client's.
- Keep code blocks within component `maxLines` (18 ceiling; `AnnotatedCode`/`CodeVariants`). Split long handlers; show only the load-bearing slice.
