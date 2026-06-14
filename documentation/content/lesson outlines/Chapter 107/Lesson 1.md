# Tools and the agentic loop

Title (h1): `Tools and the agentic loop`
Sidebar label: `Tools & the agentic loop`

---

## Lesson framing

This is the keystone lesson of Chapter 107 and its heaviest (50–60 min). It is where the LLM stops being a string generator and becomes a **planner that calls the app's own functions**. Everything in lessons 2 (generative UI) and 3 (RAG) is built on the tool primitive defined here, so the mental model must land cleanly.

**The one load-bearing idea.** A tool is the LLM's *only safe doorway into the app's state*. The model proposes; the tool disposes. Every database read/write the model triggers runs inside a tool's `execute`, which executes server-side under the exact same `authedRoute` + org-scope + quota stack as any other handler. The model never sees a connection string, an API key, or a row it isn't allowed to see — the tool projects the safe slice. This is the senior reflex the whole lesson orbits: *an unauthenticated/unscoped tool is a cross-tenant bug class, the Unit 9 leak moved into AI*.

**Pedagogical strategy — build one tool, then loop it.** Cognitive load is the enemy here; the outline lists ~13 sub-topics. The fix is a single running example carried through the whole lesson: `getInvoiceById` (chosen because the invoice domain is already the student's mental furniture from chapters 106's `invoiceLineItemSchema` and the entire Unit 7 data layer). Stage the complexity:
1. First teach the *three-part tool definition* (`description` / `inputSchema` / `execute`) in isolation — what it is, statically.
2. Then teach *where `execute` runs* — the trust boundary — because that's the senior payload and it's invisible in the syntax.
3. Then *wire one tool into `streamText`* and watch a single round-trip.
4. Then introduce the *loop* — why one step isn't enough, `stopWhen`, step caps.
5. Then the *operational seams* (`onStepFinish` audit/quota, error-as-return, result projection, `toolChoice`, `prepareStep`).

Each stage adds exactly one new idea to a shape the student already holds. Resist front-loading all the knobs.

**What the student already knows (lean on it, do not re-teach).** From ch106 L1: the `app/api/chat/route.ts` handler shape, `streamText`, `convertToModelMessages`, `onFinish`, `toUIMessageStreamResponse`, the system-prompt-as-controller rule, the `finishReason` union (incl. the `'tool-calls'` value that was *forward-pointed to this exact lesson*). From ch106 L3: `UIMessage.parts` as the render source of truth and the walk-the-array/switch-on-`type` rule. From ch105 L2: the cost-cap discipline, `usage` shape, `logAudit`/`recordLlmUsage`, `withLlmQuota` composed *around* `authedRoute`. From ch105 L3: `lib/llm/models.ts` handles. From ch106 L2: Zod 4 discipline + `.describe()`. The lesson's job is to *connect tools to all of this*, not re-derive any of it.

**Versioning posture.** Chapter is committed to AI SDK **v5**. Teach v5 names exactly: `inputSchema` (not v4 `parameters`), `outputSchema`, `stopWhen`/`stepCountIs` (not v4 client-side `maxSteps`). The v4→v5 renames are the single highest-value watch-out because they produce confusing first-compile type errors and every stale tutorial uses the old names. Do **not** introduce any v6 API surface (an "AI SDK 6" blog exists as of mid-2026 but the chapter's stack is v5; flagging v6 would violate the chapter-wide-decision rule in the continuity notes).

**The model never owns data; tools own data, the model orchestrates language** — this is the ch105 L1 carry-out sentence, and this lesson is where the student finally sees the machinery behind it. Echo it.

**No live AI sandbox in this chapter (hard constraint).** Per all of ch106's continuity notes: `@ai-sdk/react` / the `ai` package + provider keys cannot run in-browser, and `ReactCoding` is react-family only. Every interactive check in this lesson is MCQ / Sequence / Buckets / Dropdowns over *static* code. Do not propose a runnable tool sandbox.

---

## Lesson sections

### Introduction (no header — opening prose)

Open on the senior question made concrete, not abstract. Ch106 left the student with a chat that can *talk about* invoices but can't *look one up* — ask it "what's the total on invoice INV-0042?" and it hallucinates, because the model only has its training data and the conversation, never the database. State the gap in one sentence: the model can transform text but cannot reach into the app. Tools are how it reaches.

Preview the end state in one line: by the end, the student can define a tool, explain exactly where its code runs and why that matters for security, and cap a multi-step agent loop. Connect explicitly to the `'tool-calls'` `finishReason` value ch106 named and deferred "to Chapter 107" — *this is that chapter*. Keep it to ~5 lines, warm and terse. No "what is a function" energy.

### A tool is a function the model can ask you to run

Teach the three-part definition statically, before any execution concerns. The shape:

```ts
const getInvoiceById = tool({
  description: 'Look up a single invoice by its ID for the current organization.',
  inputSchema: z.object({
    invoiceId: z.uuid().describe('The UUID of the invoice to look up.'),
  }),
  execute: async ({ invoiceId }) => { /* ... server-side query ... */ },
});
```

Use **`AnnotatedCode`** here — this is exactly the "direct attention to multiple parts of one block" case the component exists for. Three steps, one per field, blue default tint:
- Step 1 (`"description"` + its line): the most under-rated field. The model reads it to decide *when* to reach for this tool. A vague description ("gets data") means the model picks the wrong tool or none. Frame it as a one-line spec written *for the model as if it were a junior contractor* — same posture as ch106 L2's `.describe()` discipline. This is a prompt, not a comment.
- Step 2 (`inputSchema` block): a Zod schema the SDK serializes to JSON Schema and sends to the model as the tool's call signature. When the model emits a tool call, the SDK **validates the model's arguments against this schema before `execute` ever runs**. Note `z.uuid()` is the top-level Zod 4 builder (not `z.string().uuid()`) — same convention as ch106 L2 — and `.describe()` on the field is read by the model (cross-ref Code conventions line 262). Tie back: this is the *same three-in-one Zod contract* from ch106 L2, now pointed at a tool instead of a structured-output call.
- Step 3 (`execute` line): the async function that does the actual work and returns the result. Defer the *where it runs* payload to the next section — here just name it as "the body."

Name the v5 renames *once, in place*: `inputSchema` was `parameters` in v4; `outputSchema` is a new optional v5 field for end-to-end typing (introduce its purpose now, show it in the generative-UI lesson). Put this in an `Aside` (note) so it doesn't break the teaching flow but is unmissable — stale tutorials use `parameters` and the student will hit a type error.

Add a `Term` on **JSON Schema** (definition: the language-neutral schema format the SDK serializes your Zod schema into to describe the tool to the model — already named in ch106 L2 but worth a one-hover refresher here).

### Where `execute` runs — the trust boundary

This is the load-bearing section; mark it as the senior payload. The teaching move: make the *invisible* visible. The syntax gives no hint that `execute` is special, but it is — it runs **server-side, inside the same Next.js route handler that called `streamText`**, never on the model's side and never in the browser.

Spell out the senior consequences as a tight list (prose, not bullets-for-bullets'-sake):
- `execute` closes over the handler's scope: the `session`, the `orgId`, the audit logger, the `db` client. The model asks "look up invoice X"; it is the *tool's code* that checks `session.orgId` against the requested row — not the model, never a string the model emits.
- The model never receives a DB connection, an API key, or a row outside its org. The tool **projects the safe slice** and hands back only that.
- Therefore tools inherit the entire ch057/Unit 9 authz stack for free *only if you put the scope filter inside `execute`*. Omitting it is the classic cross-tenant leak, now reachable by anything the model decides to call.

Make this concrete with `CodeVariants` (the before/after / wrong-vs-right case the component is built for). Two tabs:
- **Tab "Leaks across tenants"** (`del`-marked query line): `execute` queries `invoices` by `invoiceId` alone — `db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) })`. First sentence of prose: "The model can now read any org's invoice — the worst Unit 9 bug, reachable by a sentence." 
- **Tab "Org-scoped"** (`ins`-marked): adds `and(eq(invoices.id, invoiceId), eq(invoices.orgId, session.orgId))`. Prose: the scope filter lives *inside* `execute`, closing over the handler's `session`; this is non-negotiable on every tool that touches a tenant-owned table.

State the rule as a named reflex in bold: **an unauthenticated or unscoped tool is a bug class, not a shortcut.** Cross-link the `tenantDb(orgId)` factory from Code conventions (Data layer) as the project's structural enforcement — in the real app the tool calls a `db/queries/` helper that already closes over the tenant scope, so the filter isn't hand-written per tool. Note this is the production shape; the inline `eq(...orgId...)` in snippets is the pedagogically-flattened version (flag the divergence so downstream agents know it's deliberate).

This section earns a **diagram is not needed yet** — hold the full loop diagram for the loop section. A single small `ArrowDiagram` *could* show "model (no DB) → tool call → execute (has DB) → safe slice back," but it risks duplicating the loop diagram; **decision: skip the standalone trust-boundary diagram, fold the server boundary into the one loop diagram later.** Keep this section prose + the CodeVariants.

### Wiring one tool into `streamText`

Show the call site. The student knows the ch106 handler; show the *delta* only — the `tools` option added to the existing `streamText` call.

```ts
const result = streamText({
  model: smartModel,
  messages: convertToModelMessages(messages),
  tools: { getInvoiceById },
  // stopWhen: ... ← next section
});
```

Use a plain **`Code`** block (simple delta, no multi-part focus needed). Highlight the `tools` line. Reinforce: model handle imported from `lib/llm/models.ts` (ch105 L3 rule — `smartModel` is the right pick because tool-use reasoning wants the stronger model), `messages` still converted via `convertToModelMessages`, return still `toUIMessageStreamResponse()`. The tools object maps a *name the model sees* (the key) to the tool definition. The key becomes the `tool-<name>` part type on the wire — forward-link to the next section.

Now show the lifecycle on the wire, connecting to ch106 L3's parts array. When the model invokes the tool, the assistant message grows a part with `type: 'tool-getInvoiceById'` that moves through four states:
- `input-streaming` — argument tokens arriving
- `input-available` — arguments parsed + validated, `execute` running
- `output-available` — result returned
- `output-error` — `execute` threw (see error section)

Use a small **`Buckets` is wrong here / instead use a tight definition list or inline prose** — these four states are a *sequence*, so a `Sequence` exercise fits better as the check (see exercises). For *teaching* the states, just list them inline with one phrase each. Be explicit: the actual *rendering* of these states as React components is **lesson 2** — name it and move on. Here the student only needs to know the states exist and what each means, because `onStepFinish` and error handling reference them.

`Term` on **round-trip** is unnecessary; the audience knows it. No tooltips this section.

### Why one step isn't enough — the agentic loop

This is the conceptual heart. Lead with the failure the student would hit naively: if the call ran the model *once*, the model would emit a tool call and stop — it would never *see the tool's result*, so it could never answer the question with the data. The loop exists to feed the result back.

Walk the loop in prose first (the mechanism), then formalize with `stopWhen`:
1. Prompt → model.
2. Model emits a tool call (or final text).
3. SDK validates the call's args against `inputSchema`, runs `execute` server-side.
4. SDK appends the result as a tool-result message.
5. SDK asks the model *again*, now with the result in context.
6. Loop until the model returns text with no tool call — *or a stop condition fires*.

Then the senior knob: **`stopWhen`**. v5 made the loop a *server-side* concern (v4 put `maxSteps` on the client `useChat`; this is the single biggest v4→v5 shift for agents — name it). Show:

```ts
streamText({ model: smartModel, messages, tools, stopWhen: stepCountIs(5) });
```

Critical facts to state plainly:
- **Without `stopWhen`, the SDK defaults to `stepCountIs(20)`** (verified against current docs, mid-2026) — a 20-step ceiling that burns budget on workloads that should cap far lower. Omitting it is a cost bug, not a simpler example. This is the ch105 L2 cost-cap discipline *generalized from `maxOutputTokens` to step count* — make that link explicit; the same senior who never ships a call without `maxOutputTokens` never ships a multi-step call without an explicit `stopWhen`. Precision note for the writer: `stopWhen` conditions are only *evaluated when the last step produced tool results* — a model turn that returns plain text always completes immediately regardless of the cap. So the cap governs *tool-using* loops specifically; phrase it that way, don't imply it truncates ordinary text replies.
- **With a single step (`stepCountIs(1)` or no tools loop), the model can't react to the result** and the answer never reads the data — the naive failure above.

The senior cut as a small decision table (prose or a tiny three-row table):
- `stepCountIs(2)` — one tool call + a summary turn (the common "look it up and tell me" shape).
- `stepCountIs(5)` — most multi-tool workloads; the sensible default.
- `stepCountIs(10)` — only when the workload is genuinely multi-tool/chained.

**Diagram (Mermaid `sequenceDiagram`, wrapped in `<Figure>`).** This is the lesson's keystone visual and the outline's named deliverable. Sequence is the right shape (actors over time → Mermaid is the top pick per diagrams INDEX). Actors: `Client`, `Route handler`, `Model`. Flow: Client → Route handler (user message) → handler calls `streamText({ tools, stopWhen })` → Model decides → **alt fragment**: [tool call] handler/SDK validates input against `inputSchema` → runs `execute` *server-side* (note: "DB access lives here, org-scoped") → appends tool-result → loops back to Model; [final text] → handler runs `onFinish` → `toUIMessageStreamResponse` back to Client. Use a Mermaid `loop` or `alt` block to show the iteration. Pedagogical goal: make the loop's iteration **and** the server-side residence of `execute` visible in one picture — the two things prose alone leaves abstract. Keep it compact (≤ ~3 actors, horizontal time) per the vertical-space constraint; bump `messageText` font via `themeCSS` if it renders small (per mermaid.md). Caption: "The agentic loop — `execute` runs server-side; `stopWhen` caps the iterations (Unit 23)."

**Exercise — `Sequence`** right after the diagram, to make the student reconstruct the loop from memory (active recall beats re-reading). Provide the steps shuffled; source order is the loop order. Steps (≈6): "User message hits the route handler" → "Model emits a `tool-getInvoiceById` call" → "SDK validates the arguments against `inputSchema`" → "`execute` runs server-side and queries the org's invoice" → "The tool result is appended and the model is called again" → "The model returns final text and `onFinish` fires." This directly tests the mechanism the diagram showed.

### Stop conditions beyond a step cap

Short section; the outline lists three. `stepCountIs(n)` is the default reach (already taught). Add the other two as conditional tools:
- **`hasToolCall('finish')`** — the explicit-completion pattern. Define a no-op `finish` tool whose only job is to signal "done"; the loop halts when the model calls it. Useful when the workload has a clear terminal state the model can recognize. Show the one-line `stopWhen: hasToolCall('finish')`.
- **Custom predicate** `({ steps }) => boolean` — lets the senior cap by *token budget* or *elapsed time* instead of raw step count (e.g., "stop if cumulative usage crosses N tokens"). One-line shape; do not over-engineer. Connect to ch105 L2: a 5-step loop that already burned 50k tokens is a runaway, and this predicate is one place to catch it.

Note `stopWhen` accepts an **array** of conditions (stops when any fire) — mention in one clause so the student isn't surprised by `stopWhen: [stepCountIs(5), hasToolCall('finish')]`. Use a single `Code` block with all three forms commented, or three tiny blocks. Keep it light — `stepCountIs` is the workhorse; the others are named, not drilled.

### Auditing and metering every step — `onStepFinish`

Connect hard to ch105 L2 and ch106 L1's `onFinish`. The teaching frame: `onFinish` fires **once at the end** with the aggregate; `onStepFinish` fires **after each step in the loop** with that step's `usage`, `toolCalls`, `toolResults`, `finishReason`. The two compose — they don't replace each other.

Show the shape:

```ts
streamText({
  model: smartModel,
  messages,
  tools,
  stopWhen: stepCountIs(5),
  onStepFinish: ({ usage, toolCalls, toolResults, finishReason }) => {
    // per-step audit + rolling quota increment
  },
  onFinish: ({ totalUsage }) => {
    // aggregate ledger write (Chapter 105 L2)
  },
});
```

Senior reflexes to state:
- Per-step audit events land here: a `llm.step.completed` event carrying the tool name + arg *shape* (never the raw values if they could be PII — echo ch105 L2's "hash + metadata, never the raw prompt"). 
- The **rolling token counter** is incremented against the user's quota *mid-loop* — a runaway loop should be caught *while running*, not after. This is *why* per-step accounting exists; `onFinish` alone bills the user after the damage.
- Cross-ref the v5 fact (from ch105 L2 continuity): `usage` in `onStepFinish` is the **last/that-step** usage; **`totalUsage`** in `onFinish` is the cross-step aggregate. Getting these backwards mis-bills. State it once, clearly.

Use **`AnnotatedCode`** on the block above — two steps (`onStepFinish` highlighted orange "per-step, runs in the loop"; `onFinish` highlighted green "once, at the end, aggregate"). The color contrast carries the "two different slots" point visually.

`Term` on **metering** (definition: counting resource use — here tokens — per unit of work to enforce a quota or bill it).

### Returning errors instead of throwing

A focused, high-value pattern. The senior rule: when the tool's *underlying work* fails (row not found, permission denied, upstream fetch error), **return a typed error result the model can read and react to** — do not throw. Rationale, stated as cause→effect:
- A thrown error inside `execute` breaks the stream → the user sees a 500, the conversation dies.
- A *returned* `{ error: 'invoice_not_found' }` flows back as a tool result → the model can recover gracefully: "I couldn't find an invoice with that ID — can you double-check it?"

Show with `CodeVariants`, two tabs (wrong/right is exactly this component's job):
- **"Throws — kills the stream"**: `execute` does `if (!invoice) throw new Error('not found')`. Prose: breaks the v5 stream protocol; the whole turn errors; bad UX.
- **"Returns — the model recovers"**: wrap the DB call in `try/catch`; on a missing row return `{ error: 'invoice_not_found' as const }`; on a caught DB error return `{ error: 'lookup_failed' as const }`. Prose: the model reads the result and apologizes/asks; only *programmer* errors should bubble to the framework boundary.

Tie to Code conventions error handling: "return the expected, throw the unexpected" — this is that exact rule applied inside `execute`. The `as const` / a small Zod `outputSchema` union locks the error shape at the type level (forward-link to lesson 2's `outputSchema` typing). Connect to ch106 L3's error-sanitization discipline: even the friendly recovery text shouldn't leak raw DB error strings.

Map the `output-error` part state (from the lifecycle section) to "this is what the client sees when you *do* throw, or when the SDK can't validate" — so the student connects the two. 

### Don't dump rows back — project the result

Cost-and-correctness section. The model sees tool results as JSON injected into the next step's context. The senior reflex: **project, not dump.** A tool that returns a 200-row query result blows the *input* token budget on the very next loop step (and every step after, since it stays in context). Return the minimal shape the model needs to answer — totals, top-N, a derived summary — not raw rows.

Make the cost compounding explicit and link to ch105 L2: input tokens are paid *per step*, so a fat tool result is multiplied by the remaining loop length. This is the cost-discipline lens applied to tool design.

The `outputSchema` is where this discipline is *locked at the type level* — define the shape you intend the model to see, and the tool can't accidentally leak the whole row. Show a one-line contrast (plain `Code`, two short snippets or a `CodeVariants`): returning `invoice` (the full Drizzle row, dozens of fields incl. internal ones) vs. returning `{ id, customerName, total, dueDate, status }`. First sentence of the "dump" variant: "Every field rides into the next step's prompt, on every remaining step." Forward-link: lesson 2 makes this same projected shape *also* the React component's props contract.

`Term` on **projection** (definition: selecting and reshaping only the fields a consumer needs, instead of passing the whole record).

### Forcing or forbidding tool use — `toolChoice`

Brief. The default is `'auto'` (model decides). Name all four values and their triggers tightly:
- `'auto'` (default) — model decides; the right reach for ~95% of surfaces.
- `'required'` — force a tool call on the first step; the reach for "must ground in data" surfaces where a free-text answer would be a regression.
- `'none'` — disable tools for this call (e.g., a follow-up summarization turn).
- `{ type: 'tool', toolName: '...' }` — force a specific tool.

One `Code` block showing the option; one sentence of senior guidance: reach past `'auto'` only when the workload *demands* grounding. Keep it short — this is a knob, not a concept.

### Adapting the call mid-loop — `prepareStep` (when one shape won't fit)

Last and deliberately under-taught — the outline says "name the hook; do not over-teach it." Frame it as a *narrow* power tool with the trigger named first (per the "trigger before tool" pedagogical filter). `prepareStep({ stepNumber, steps }) => Partial<...settings>` runs *before* each step and can change settings between steps. Two legitimate triggers, named concretely:
- "First step plans with `smartModel`, follow-ups execute with `fastModel`" — a cost optimization once a workload is proven.
- "After the DB is queried, drop the query tools so the model can't re-query in a loop" — narrowing the tool set mid-run.

Show a *single* compact `Code` block illustrating the model-swap case, with a one-line comment. Explicitly say: reach for this *only* when a single static call shape genuinely doesn't fit; the default multi-step call has *no* `prepareStep`. This prevents juniors from cargo-culting it onto every handler.

### The shape that composes everything

Closing synthesis section — assemble the full handler so the student sees the seams fit together (the outline's "worked posture"). One **`AnnotatedCode`** block (this is the payoff; ≤18 lines, scrolls if needed) showing the `app/api/chat/route.ts` handler with: the `authedRoute('member', chatRequestSchema, async ({ messages }, request) => ...)` wrapper (ch106 L1 shape), `streamText` with `model: smartModel`, `tools: { getInvoiceById }`, `stopWhen: stepCountIs(5)`, `onStepFinish` (per-step audit), `onFinish` (aggregate), and `return result.toUIMessageStreamResponse()`. Annotate ~5 steps, each linking back to its source chapter:
1. The wrapper — auth + org scope + body validation (ch057/ch106 L1); restate that `withLlmQuota(...)` wraps *around* this in production (ch105 L2 — the lesson abbreviates it).
2. `tools` — the doorway; `execute` closes over `session`/`orgId` from the wrapper.
3. `stopWhen` — the cap; the cost-discipline reflex.
4. `onStepFinish` / `onFinish` — the two metering slots.
5. The return — same v5 parts protocol `useChat` already speaks (ch106 L3).

State the carry-out reflex one final time: every tool in this app lives inside the same wrapper every route does — *an unauthenticated tool is a bug class*. End by forward-pointing: lesson 2 takes the tool-part *output* and renders it as a bespoke React component instead of JSON.

### Watch-outs (distribute, do not bundle)

Per the pedagogy rule, watch-outs belong in the section teaching their concept — **do not** create a standalone watch-outs section. Placement map for the writer:
- v4 `parameters` → v5 `inputSchema` rename → the tool-definition section (`Aside`).
- v4 client `maxSteps` → v5 server `stopWhen` → the loop section.
- Omitting `stopWhen` → default-20 budget burn → the loop section.
- Unscoped `execute` → cross-tenant leak → the trust-boundary section (it's the spine there).
- Throwing instead of returning → the error section.
- Dumping raw rows → the projection section.
- Vague `description` → the tool-definition section.
- **Templating the tool name (or a tool's behavior) from user input** → trust-boundary section, one sentence: never let request data choose or shape which tool runs.
- **Destructive tools (delete/charge) without a confirmation step** → mention once at the end of the composes-everything section as a forward-pointer: design destructive surfaces so they require a *UI-side human confirmation* before the next agent step; the full propose/confirm pattern is **lesson 2**. Name it as a watch-out only here, per the chapter outline.

### External resources (optional `ExternalResource` cards)

Two at most, at the very end: the AI SDK "Tool Calling" core doc and the "Agents: Loop Control" doc (both `ai-sdk.dev`). These are the canonical references for the exact API surface taught. Optional — include only if they add beyond the lesson.

---

## Scope

**This lesson covers:** the `tool({ description, inputSchema, execute })` definition; the v5 `inputSchema`/`outputSchema` rename; where `execute` runs (the server-side trust boundary) and org-scoping inside it; wiring one tool into `streamText`; the four tool-part lifecycle states (named, not rendered); the agentic loop and `stopWhen` (`stepCountIs`, `hasToolCall`, custom predicates, array form, default-20); `onStepFinish` vs `onFinish` for per-step vs aggregate audit/quota; error-as-return inside `execute`; result projection / not dumping rows; `toolChoice`; `prepareStep` (named, narrow trigger); and the fully-composed handler.

**Explicitly NOT in this lesson (defer / out of scope):**
- **Rendering tool parts as bespoke React components** (the generative-UI switch on `part.type`/`part.state`, per-tool skeletons, `InferUITools`, the typed `useChat<MyUIMessage>`) — **lesson 2**. This lesson *names* the four states and *names* `outputSchema`'s typing purpose, but builds no client rendering.
- **The propose/confirm pattern for destructive tools** — full treatment in **lesson 2**; named here only as a one-line watch-out.
- **Embeddings, `embed`/`embedMany`, pgvector, RAG, retrieval-as-a-tool** — **lesson 3**.
- **The `lib/llm/tools.ts` registry file convention and inferred message typing** — introduced in **lesson 2** (this lesson can define the tool inline or near the handler; note to the writer: keep the example co-located, and let lesson 2 do the "extract to `lib/llm/tools.ts`" move so it owns the registry + `InferUITools` story).
- **The worked invoice Q&A surface** (full UI, usage panel, persistence wiring) — **Chapter 108**.
- **MCP servers / dynamic tools** — out of scope (named in the SDK, rare in 2026 SaaS).
- **Multi-modal tools** (file/image inputs) — out of scope.
- **Streaming partial tool output** (generator-shape `execute`) — out of scope here; lesson 2 mentions it.
- **AI SDK v6** anything — chapter is v5; no forward-port without a chapter-wide decision.

**Prerequisites to restate concisely (do not re-teach):** the `app/api/chat/route.ts` + `authedRoute(role, schema, fn)` handler shape and `streamText`/`convertToModelMessages`/`onFinish`/`toUIMessageStreamResponse` (ch106 L1 — one-line refresher each); `UIMessage.parts` walk-and-switch render rule (ch106 L3 — one line); `usage` shape, `logAudit`/`recordLlmUsage`, `withLlmQuota` composition, `maxOutputTokens` discipline (ch105 L2 — reference, don't re-derive); `lib/llm/models.ts` handles (ch105 L3 — one line); Zod 4 top-level builders + `.describe()` (ch106 L2 — one line); `tenantDb(orgId)`/`db/queries/` (Unit 7/10 — one line as the production enforcement of org-scope).

---

## Code conventions notes for the writer

- **`z.uuid()`**, not `z.string().uuid()` (Zod 4 top-level builder; Code conventions "Schemas with Zod 4"). `.describe()` on tool input fields — the LLM reads them (conventions line 262).
- **Model handles imported** from `lib/llm/models.ts` (`smartModel` for tool-use reasoning); never an inline `openai('...')` string (ch105 L3).
- **`maxOutputTokens`** should appear on the `streamText` call in any "complete handler" snippet — it's a non-negotiable per ch105/ch106; omitting it would teach a cost bug. (Abbreviated snippets focusing on one option may elide it with a `// + maxOutputTokens, see ch105` comment — flag the elision.)
- **Error shape**: `{ error: '...' as const }` returns from `execute` align with the conventions' "return the expected, throw the unexpected"; the route handler's thrown-error boundary returns RFC 9457 Problem Details (conventions "Route handlers", "Error handling").
- **Naming**: tools are `camelCase` verb-led handles (`getInvoiceById`), matching the `getInvoice(id)` read-helper convention.
- **Deliberate pedagogical divergences (flag in-text so downstream agents don't "fix" them):** (1) inline `eq(invoices.orgId, session.orgId)` instead of the production `tenantDb`/`db/queries/` helper — flattened for visibility; (2) tool defined near the handler rather than in `lib/llm/tools.ts` — the registry extraction is lesson 2's job; (3) `withLlmQuota` folded into the abbreviated `authedRoute` call — same convention ch106 used.
