# Chapter 107 — Tool calling, generative UI, and retrieval

## Lesson 1 — Tools and the agentic loop

**Taught.** Defined the three-part tool contract (`description`/`inputSchema`/`execute`), the server-side trust boundary and org-scope rule, the v5 `stopWhen` agentic loop with `stepCountIs`/`hasToolCall`/custom-predicate stop conditions, `onStepFinish` vs `onFinish` metering, error-as-return, result projection, `toolChoice`, and `prepareStep`; all via the running `getInvoiceById` example.

**Cut.** Nothing significant was dropped from the chapter-outline scope; all topics listed for this lesson were delivered.

**Debts.**
- `outputSchema` — named and its typing purpose stated, but not shown in code; Lesson 2 puts it to work as the `InferUITools` props contract.
- Four tool-part lifecycle states (`input-streaming`, `input-available`, `output-available`, `output-error`) — named and meanings given, but rendering them as React components is entirely deferred to Lesson 2.
- Destructive tool propose/confirm pattern — flagged as a one-line watch-out at the end of the composed-handler section; full treatment in Lesson 2.
- Tool registry extracted to `lib/llm/tools.ts` — deliberately kept inline/near the handler here; Lesson 2 does the extraction and introduces `InferUITools`.

**Terminology.**
- `tool({ description, inputSchema, execute })` — v5 helper; `inputSchema` was `parameters` in v4.
- `outputSchema` — optional v5 field for end-to-end typing (not yet shown in code).
- `stopWhen: stepCountIs(n)` — server-side loop cap (replaces v4 client-side `maxSteps` on `useChat`); default when omitted is `stepCountIs(20)`.
- `hasToolCall('finish')` — explicit-completion stop condition.
- `onStepFinish({ usage, toolCalls, toolResults, finishReason })` — per-step callback; `usage` here is the single step's usage.
- `onFinish({ totalUsage })` — once-per-turn aggregate; `totalUsage` is the cross-step total (not the last step's `usage`).
- `toolChoice: 'auto' | 'required' | 'none' | { type: 'tool', toolName }` — model/tool-call override.
- `prepareStep({ stepNumber }) => Partial<CallSettings>` — per-step settings mutation; power tool, narrow trigger.
- `tool-getInvoiceById` — the part `type` name the model's call emits on the assistant message (key from the `tools` object).
- `smartModel` — correct model handle for tool-use reasoning (from `lib/llm/models.ts`; ch105 L3 rule).

**Patterns and best practices.**
- `execute` closes over the handler's `session`/`orgId`; every tool touching a tenant-owned table must filter by `session.orgId` — an unscoped tool is a bug class, not a shortcut.
- In production the scope filter is structural via `tenantDb(orgId)` / `db/queries/` helpers; the inline `eq(invoices.orgId, session.orgId)` in lesson snippets is a deliberate pedagogical flattening — downstream agents must not "fix" it.
- Return typed error shapes from `execute` (`{ error: 'invoice_not_found' as const }`); never throw — a thrown error breaks the stream.
- Project the minimal result shape the model needs; never return the full Drizzle row — input tokens compound across every remaining loop step.
- Always set an explicit `stopWhen` on every multi-step call; omitting it defaults to 20 steps (cost bug).
- `stepCountIs(2)` for one-tool-plus-summary, `stepCountIs(5)` for most multi-tool, `stepCountIs(10)` for genuinely chained workloads.
- `maxOutputTokens` must appear alongside `stopWhen` on any complete handler (both cost caps are non-negotiable per ch105 L2).
- `onStepFinish` increments rolling quota mid-loop; `onFinish` writes the aggregate ledger — both are needed.
- `toolChoice: 'auto'` is the correct default; `'required'` only for surfaces that must ground in data.
- Reach for `prepareStep` only when a single static call shape doesn't fit; the normal handler has none.

**Misc.**
- The tool in lesson code is defined co-located with the handler (not in `lib/llm/tools.ts`); Lesson 2 moves it to the registry.
- `withLlmQuota` wrapper is abbreviated inside `authedRoute(...)` call in snippets — matches ch106 convention; full form is ch105 L2.
- `z.uuid()` top-level Zod 4 builder used (not `z.string().uuid()`); `.describe()` on tool input fields is read by the model.
- The lesson closes with a forward pointer: Lesson 2 takes the tool-part `output` and renders it as a bespoke React component.

---

## Lesson 2 — Generative UI via tool parts

**Taught.** Rendering tool parts as typed React components by switching on `part.type` and `part.state`; end-to-end typing via `InferUITools`/`MyUIMessage`; tool registry convention at `lib/llm/tools.ts`; per-tool skeletons over generic spinners; co-designing `outputSchema` and component props as one contract; interleaved text+tool parts in render order; propose/confirm pattern for destructive tools; persistence of full `UIMessage[]` including tool parts.

**Cut.** Custom data parts (`UIDataTypes` non-tool parts) named in passing only; streaming partial tool output (generator/`yield` shape) mentioned as a one-line capability without building it; multi-modal generative UI and reasoning-trace rendering omitted entirely. The worked invoice-chat product is deferred to Chapter 108 — this lesson teaches the pattern only.

**Debts.**
- `outputSchema` debt from Lesson 1 is now paid: shown as the `InferUITools` source and component prop contract.
- Propose/confirm end-to-end wiring (real preview data, continuation call) — shape taught here, full product in Chapter 108.
- `UIDataTypes` (custom non-tool data parts) — named as a `UIMessage` generic slot, not taught; no explicit forward pointer to a specific lesson.

**Terminology.**
- `tool-getInvoiceById` — `part.type` string: literal `tool-` + key from `tools` object.
- `part.state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'` — four lifecycle states; `part.output` only exists in `output-available`.
- `part.errorText` — SDK-sanitized error string in `output-error` state; never use raw `error.message`.
- `InferUITools<typeof tools>` — infers `{ [toolName]: { input, output } }` from the tool registry; imported from `ai`.
- `UIDataTypes` — default generic slot for non-tool data parts on `UIMessage`; used as default, not taught.
- `MyUIMessage = UIMessage<never, UIDataTypes, InferUITools<typeof tools>>` — the typed chat message; `never` for no custom metadata.
- `useChat<MyUIMessage>({ ... })` — typed chat hook; same type passed on server to message-stream helper for full-stack safety.
- `ai/rsc` / `streamUI` / `useUIState` / `useAIState` — experimental alternative; named once, not taught.
- Skeleton — loading placeholder shaped like the incoming content; per-tool, not generic.
- `proposeInvoiceSend` / `confirmInvoiceSend` — the two-tool propose/confirm naming convention.

**Patterns and best practices.**
- Always keep `default: return null` in the `part.type` switch — unknown part types must never crash the render.
- Render all four lifecycle states: nothing (or skeleton) on `input-streaming`, per-tool skeleton on `input-available`, real component on `output-available`, sanitized error component on `output-error`.
- Use tool-specific skeletons (e.g. `<InvoiceCard.Skeleton />`), not a single generic spinner — the specificity is the affordance the tool-parts model provides.
- `outputSchema` and component props are one contract, designed together — never reshape tool output inside the component; the component must not know where its data came from.
- Data selection, shaping, and authorization live in the tool's `execute`; presentation lives in the component.
- Tools must live in `lib/llm/tools.ts` (not inline in route handlers) — `InferUITools` needs an exported `tools` object the client can import; inline breaks `part.output` typing silently.
- Export `MyUIMessage` from `lib/llm/tools.ts`; import it on both the route handler and the client component.
- Persist full `UIMessage[]` including tool parts in `onFinish`; dropping tool parts means rendered components vanish on next mount.
- Destructive tools: `proposeX` is read-only (returns a preview), `confirmX` does the write; the client only emits `confirmX` after a human click — the model never triggers the write directly.
- Render each part where it sits in `parts.map` order; never collect tool renders at the bottom of the bubble.

**Misc.**
- The `inline tool in handler → breaks typing` footgun produces no error at compile or runtime — the cost is silently losing `part.output` autocomplete; this is the core motivation for the registry file rule.
- Lesson snippets abbreviate `authedRoute(...)` to include the `withLlmQuota` wrapper per ch106 convention; full form is ch105 L2.
- The `eq(invoices.orgId, session.orgId)` inline org-scope in snippets is pedagogical flattening from L1 — production uses `tenantDb`/query helpers; do not "fix" it.
- v5 API surface used throughout: `InferUITools`, `UIMessage<never, UIDataTypes, MyUITools>`, `useChat<MyUIMessage>`, `part.errorText`; do not introduce v6 `Output.*` or migrate APIs (ch106 L2 continuity constraint).
- Propose/confirm continuation: the lesson implements the confirm step via `sendMessage({ text: 'Yes, send it.' })` (a new user turn that re-enters the chat loop), not `addToolResult` — Ch108 must wire the full end-to-end against this simpler continuation shape.

---

## Lesson 3 — Embeddings and pgvector RAG

**Taught.** RAG trigger (two-condition threshold: internal corpus + too large or too fast-changing for prompt-stuffing); embedding mental model (fixed-length float vector, cosine similarity, cosine distance inversion); `embed`/`embedMany` from `'ai'`; `embeddingModel` named export in `lib/llm/models.ts` using AI Gateway string-id form; `documentChunks` Drizzle schema with `vector({ dimensions: 1536 })`, HNSW index, and `embeddingModel` text column; two-phase pipeline (index offline with `embedMany` + batch insert, query per-request with `embed` + cosine similarity query); `findRelevantChunks` helper using `cosineDistance` from `drizzle-orm` + `sql<number>` similarity expression + `orgId` filter + `.limit(5)`; pre-retrieval pattern (retrieved context injected into system prompt, not `messages`); retrieval-as-a-tool alternative (`searchKnowledgeBase` tool); multi-tenant rule for retrieval; corpus freshness lifecycle (re-embedding, FK cascade deletes, dedup at insert).

**Cut.** `cosineSimilarity` in-memory utility (was in the chapter outline; lesson uses only the DB query path — appropriate for the corpus sizes this feature targets). Production vector-index tuning (HNSW `m`/`ef_construction`) named as out of scope. Hybrid retrieval, re-ranking, and a full chunker survey named once then dropped. The "ask-your-invoices" product surface explicitly deferred to Chapter 108.

**Debts.**
- The worked product RAG surface (invoice chat with tool calling + RAG combined) — Chapter 108's project.
- Per-user token quota enforcement (abbreviated as `withLlmQuota`) — full form is ch105 L2, not re-taught here.
- Background-job mechanics for re-index backfills — deferred to Unit 12 patterns; lesson names the need without building it.

**Terminology.**
- RAG — Retrieval-Augmented Generation; fetching relevant text from a corpus and adding it to the model's prompt so the answer is grounded in that text.
- Corpus — the body of documents retrieved from.
- Embedding — a fixed-length `number[]` produced by an embedding model; same text → same vector.
- Embedding model — a model that turns text into a vector; distinct from chat/completion models.
- Cosine similarity — higher = more semantically similar; `1 − cosineDistance`.
- Cosine distance — what Postgres computes; lower = closer. `orderBy(desc(similarity))` is equivalent to `orderBy(asc(distance))`.
- Dimensions — fixed vector length; `text-embedding-3-small` → 1536. Must match `vector({ dimensions: 1536 })` column exactly.
- pgvector — Postgres extension adding `vector` column type and similarity operators.
- HNSW — approximate-nearest-neighbor index type used here; named, defaults used, not tuned.
- Pre-retrieval pattern — embed + query runs before every `streamText` call; suited to surfaces where every turn needs the corpus.
- Retrieval-as-a-tool — `searchKnowledgeBase` tool; model decides when to call it; suited to mixed surfaces.
- `embeddingModel` (column) — stores which model produced each vector; enables rolling re-index.
- `embeddingModel` (registry export) — bare gateway-string form `export const embeddingModel = 'openai/text-embedding-3-small'` in `lib/llm/models.ts`; no factory call, no imported provider package.

**Patterns and best practices.**
- `embed`/`embedMany` import from `'ai'`; embedding model handle is a dedicated named export `embeddingModel` in `lib/llm/models.ts` — same file as chat handles.
- Embedding model handle is sticky: swapping it requires re-embedding the entire corpus (new vector space, possibly different dimension). Treat it as a far stickier choice than a chat model handle.
- `documentChunks` table: `vector({ dimensions: 1536 }).notNull()`, HNSW index with `vector_cosine_ops` (must match; mismatch causes migration failure), `embeddingModel text` on every row.
- Index phase is a plain async function or script, not a route handler — runs on upload or as a one-time backfill.
- Chunk size guardrails: too large → retrieval returns mostly-irrelevant surrounding text; too small → passage loses context. Sweet spot: a coherent passage, a few sentences to a paragraph, with neighbour overlap.
- Retrieved context goes in the **system prompt** (trusted, server-side authorized), never in `messages` (untrusted user input).
- Every retrieval query must filter by `session.orgId` — an unscoped vector query leaks cross-tenant data and the model quotes it as the answer. Treat a missing orgId filter as a security bug.
- For retrieval-as-a-tool, the `orgId` filter lives inside `execute`, same as every other tool.
- Do not run pre-retrieval and `searchKnowledgeBase` tool on the same surface without deciding which fires first — double-retrieval or context confusion results.
- Deduplicate chunks at insert time; duplicate passages consume top-K slots and bias the answer.
- `stopWhen: stepCountIs(5)` and `maxOutputTokens` remain non-negotiable on every handler, including RAG handlers.
- RAG **grounds** answers (reduces hallucination against the corpus); it does not **validate** them — a wrong corpus produces a confidently wrong answer.

**Misc.**
- Lesson example uses a generic handbook corpus deliberately; invoices are an exact-lookup use case handled by the `getInvoiceById` tool (L1), not RAG.
- `sql<number>` wrapper is required to type the computed similarity expression in Drizzle; `cosineDistance` is imported from `drizzle-orm`.
- `authedRoute` + `withLlmQuota` abbreviated per chapter convention; full form is ch105 L2.
- Inline `eq(documentChunks.orgId, orgId)` is pedagogical flattening; production uses `tenantDb`/query helpers (same L1 note applies).
- **Intentional divergence from ch105 L3:** ch105 L3 seeded `embeddingModel` as `text-embedding-3-large` (3072 dims). This lesson overwrites it to `text-embedding-3-small` (1536 dims) to stay under pgvector's HNSW 2000-dimension limit. Ch108 must use `'openai/text-embedding-3-small'` (bare gateway string) and `vector({ dimensions: 1536 })`; do not reintroduce `text-embedding-3-large`, the gateway-object factory form, or any model with >2000 dims for this embedding handle.
