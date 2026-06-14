# Embeddings and pgvector RAG

- Title (h1): Embeddings and pgvector RAG
- Sidebar label: Embeddings and RAG

## Lesson framing

This is the chapter's third and final teaching lesson. Lessons 1–2 made the model a controller that calls into app state via tools and renders typed components. This lesson answers a different senior question: when the model needs *knowledge it wasn't trained on*, how do we feed it the right slice of an internal corpus without stuffing everything into the prompt? The answer is retrieval-augmented generation (RAG) on embeddings.

The chapter outline frames this as a "decision-heavy lesson with one worked path." Honor that shape exactly. The single most important thing the student leaves with is **the trigger** — RAG is a conditional reach, not a default, and the most common beginner failure is building a vector store for a corpus that fits in a system prompt. Lead with the threshold. Everything mechanical (the two SDK primitives, the pgvector schema, the query) is in service of the one worked path that follows the decision.

Target student: a junior dev who has just learned the AI SDK Core primitives (ch106), tools (ch107 L1), Drizzle + Postgres (Unit 5), and the org-scope/multi-tenancy discipline (Unit 9). They have *not* seen embeddings before. They likely carry two misconceptions from the wider AI discourse: (1) that RAG is a mandatory part of any "AI feature," and (2) that you need a dedicated vector database (Pinecone et al.) to do it. This lesson corrects both: RAG is conditional, and pgvector on the database the app already runs is the 2026 default.

Mental model to build, in order of increasing complexity (minimize cognitive load):
1. **The problem.** The model can't answer questions about data it never saw (your handbook, the user's 10k invoices). You could paste the corpus into the prompt — until it doesn't fit, or costs too much per call.
2. **The idea.** Embed text into vectors where "similar meaning" = "close vectors." Embed the corpus once; at query time embed the question and fetch its nearest neighbors. That retrieved slice goes in the prompt. This is semantic search.
3. **The shape, not the math.** Do *not* teach vector geometry. Teach: text in → fixed-length float array out; similar texts → high cosine similarity; dimension count sizes your storage.
4. **The 2026 stack.** `embed`/`embedMany` from the AI SDK, vectors stored in a Postgres `vector` column via Drizzle's `vector()` helper + an HNSW index, queried with cosine distance.
5. **The two phases.** Index (offline, batch) and query (per-request). Keep these visually and conceptually separate — conflating them is a common confusion.
6. **The senior constraints.** `orgId` filter on every retrieval query (the worst cross-tenant leak shape), chunking as a problem-domain choice, pre-retrieval vs retrieval-as-a-tool, and the re-embedding operational reality.

Depth ceiling, per the outline: "enough to ship a 2026 SaaS RAG feature competently," not a vector-DB deep dive. Cut aggressively — no index-tuning internals, no hybrid retrieval/re-ranking beyond a name, no embedding math.

Tone and conventions: adult, terse, senior-posture. Code uses the `lib/llm/*` registry conventions established in ch105 L3 / ch106 / ch107 L1–L2: model handles live in `lib/llm/models.ts`, tools in `lib/llm/tools.ts`, route handlers wrap calls in `authedRoute(...)` with the `withLlmQuota` wrapper abbreviated inside. Zod 4 top-level builders (`z.uuid()`, `z.object`). The inline `eq(table.orgId, session.orgId)` org-scope is the deliberate pedagogical flattening carried across this chapter — production uses `tenantDb`/query helpers; downstream agents must not "fix" it.

Estimated student time: 40–50 minutes.

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the concrete problem, warmly and briefly (≤2 short paragraphs). The setup: the invoice chat from L1–L2 can answer "what's the total on invoice X?" because a *tool* fetches that row. But ask it "what's our refund policy?" or "summarize the themes across my 4,000 support tickets" and a tool that fetches one row won't help — the answer lives in a body of text the model never trained on and that's too big to hand it whole. Name the move: pull the *relevant* pieces of that corpus and feed them as context. That's retrieval. State the lesson goal: decide when retrieval earns its weight, then build the 2026 default path — `embed`/`embedMany` + pgvector via Drizzle, org-scoped.

Connect to prior knowledge explicitly: this rides the same `streamText` route handler (ch106 L1), the same `lib/llm/models.ts` registry (ch105 L3), the same Drizzle/Postgres the app already runs (Unit 5), and the same `session.orgId` multi-tenancy discipline (Unit 9). RAG is not a new stack; it's a query that enriches the system prompt.

`Term` candidates in this section: **RAG** (Retrieval-Augmented Generation — fetching relevant text from a corpus and adding it to the model's prompt so the answer is grounded in that text), **corpus** (the body of documents you retrieve from).

### When retrieval earns its weight

**The load-bearing section. Lead the lesson with the decision, per the outline's "trigger before tool" mandate.**

Teach the senior threshold as two conditions that must *both* hold for RAG to pay off:
- The corpus is **internal** — the model can't have trained on it (your handbook, customer-specific KB, the user's own data, transcripts). Public, well-known information the model already knows doesn't need retrieval.
- AND either it's **too large to fit the context window**, OR it's **small but updates fast enough that recency matters** (so you can't bake it into a fixed system prompt).

Below the threshold — a 5-page FAQ, a one-paragraph policy — the senior move is to **paste it into the system prompt** and *not* build a vector store. Above it — a 200-page handbook, 10,000 invoices, a growing ticket archive — RAG is the path. Reinforce with the cost discipline from ch105 L2: prompt-stuffing N tokens of context on *every* call burns budget linearly; retrieval pays the embedding cost once and bounds the per-query context. Make this the senior framing: RAG is a cost-and-fit decision, not an "is this an AI feature" decision.

Name once, then move on (do not teach): a long-context-window model is the alternative to retrieval for mid-size corpora, but the cut still favors retrieval at scale (cost compounds per call; context windows have a ceiling and recall degrades in very long prompts).

**Decision aid — `StateMachineWalker` (`kind="decision"`).** This is the ideal use: it forces the student through the *order* a senior asks the questions in. Build the tree:
- Root `Question` "Is the answer in data the model was trained on?" → Branch "Yes, it's public/general knowledge" → `Leaf` verdict "Just ask the model" (no retrieval, no tool — free-text answer is fine). → Branch "No, it's internal/private" → next question.
- `Question` "Does the whole corpus fit comfortably in the system prompt (and rarely changes)?" → Branch "Yes — a few pages, stable" → `Leaf` verdict "Paste it in the system prompt" (over-engineering to build a vector store; the lower threshold). → Branch "No — large, or changes often" → next question.
- `Question` "Is it a single fact/row lookup or a broad semantic question?" → Branch "A specific record by id/key" → `Leaf` verdict "A tool, not RAG" (cross-link L1: `getInvoiceById` fetches one row deterministically; embeddings are for fuzzy semantic match, not exact lookup — an important distinction students conflate). → Branch "A fuzzy semantic question over many documents" → `Leaf` verdict "RAG with pgvector" (the rest of this lesson).

The pedagogical goal: the walker disambiguates RAG from the two things beginners reach for it instead of — prompt-stuffing (too small) and tool calls (exact lookup). Place this immediately after the threshold prose so the decision is concrete before any code.

### What an embedding is

Build the mental model in one tight pass — *shape, not math* (outline is explicit: "Do not teach the math; teach the shape").

Teach:
- An embedding is a **fixed-length array of floats** produced by an *embedding model* (a different model class than the chat models from ch106). Same input text → same vector.
- Texts with **similar meaning map to nearby vectors**; "nearby" is measured by **cosine similarity**, a number where higher = more similar. (State the range pragmatically: cosine *similarity* runs roughly −1…1, and for the normalized embeddings these models produce, in practice you treat higher-is-closer; the database equivalent is **cosine distance** = `1 − similarity`, lower-is-closer. Flag the inversion explicitly — it bites students in the query later.)
- Semantic search = embed the corpus once, embed the query, find nearest neighbors. That's the whole idea.
- The **dimension count** is a number to budget around because it sizes storage: `text-embedding-3-small` produces **1536**-dimensional vectors. One row's embedding is 1536 floats. Name the model and number; this feeds the schema in the next section.

**Visual — a small `Figure` with hand-authored HTML/CSS (not a complex graph).** Goal: make "similar meaning = close vectors" tangible without teaching geometry. A simple 2D scatter (clearly labeled "a 2D cartoon of a 1536-dimensional space") with a few labeled points: "invoice", "bill", "receipt" clustered tight; "refund policy" nearby; "office cat" far away. A query point "unpaid invoices" lands inside the invoice cluster, with a short arrow to its nearest neighbors. Caption states plainly this is an intuition pump, real vectors have 1536 dimensions and can't be drawn. This is a low-effort, high-payoff intuition aid; keep it small (well under the height cap).

`Term` candidates: **embedding model** (a model that turns text into a fixed-length vector, distinct from a chat/completion model), **cosine similarity** (a score for how close two vectors point in the same direction; higher = more semantically similar), **dimensions** (the fixed length of the vector; 1536 for text-embedding-3-small).

### The two SDK primitives: `embed` and `embedMany`

Teach the AI SDK's two embedding entry points. Keep this mechanical and short — the decision was the hard part.

- `embed({ model, value })` → returns `{ embedding, usage }`. One string in, one vector out. Use at **query time** (embed the user's question).
- `embedMany({ model, values })` → returns `{ embeddings, usage }`, embeddings in input order. Many strings in, many vectors out. Use at **index time** (embed the whole corpus in batches). Note it auto-splits oversized batches under the model's per-call limit — the senior doesn't hand-chunk the API call (that's separate from chunking the *documents*).

**Model handle through the registry.** Both pass through `lib/llm/models.ts` as a dedicated named export `embeddingModel` (mirrors the role-named chat handles from ch105 L3). Show the registry line. Use the **AI Gateway string-id form** the AI SDK v5 docs now use — `'openai/text-embedding-3-small'` — which matches ch105 L3's "AI Gateway as the production default" thread; mention the provider-factory form (`openai.embeddingModel('text-embedding-3-small')`) as the alternative for direct-provider setups in one line. **(Verified against current AI SDK docs, June 2026 — the gateway string-id form is the documented default; `embed`/`embedMany`/`cosineSimilarity` all import from `'ai'`.)**

Cross-link the **embedding-portability trap** named in ch105 L3: model handles are swappable for chat, but you **cannot** hot-swap an embedding model the way you swap a chat model — changing it changes the vectors, so the whole corpus must be re-embedded (picked up in the operational section). Plant the flag here.

**Code — `Code` blocks (two small ones) or a `CodeVariants` with two tabs ("Single query — `embed`" / "Batch index — `embedMany`").** `CodeVariants` is slightly better here because the two are an A/B of the same idea (one vs many) with a one-line framing each. Show the import from `'ai'`, the `embeddingModel` import from `@/lib/llm/models`, and the return-shape destructure. Keep each ≤8 lines. Emphasize in prose: the corpus-indexing job is a **one-shot async function or script**, not a route handler — it runs on document upload or as a backfill, not per request.

`Term` candidates: **AI Gateway** (Vercel's provider-routing layer; lets you name a model as a `provider/model` string and swap providers without code changes — from ch105 L3, re-surface briefly).

### Storing vectors: pgvector and the Drizzle `vector` column

Establish the storage layer as the 2026 SaaS default and justify the choice.

Teach:
- **pgvector** is a Postgres extension adding a `vector` column type and similarity operators. The senior reflex: the app **already runs Postgres** (Unit 5), so vectors live in the same database — one fewer moving part, one fewer credential, one fewer failure mode. Reach for a dedicated vector DB (Pinecone, Upstash Vector, Qdrant) **only** when the corpus exceeds what pgvector handles at the team's scale (roughly tens of millions of vectors) or the workload genuinely needs a managed service. Name those products *once* as the alternative; do not compare them.
- **The schema.** A `documentChunks` table: `id` (uuidv7, Unit 5 convention), `orgId` (the tenancy column — load-bearing, see retrieval section), `documentId` (FK to the parent document), `content text` (the chunk's text, returned to put in the prompt), `embedding vector(1536)` (Drizzle's `vector('embedding', { dimensions: 1536 })`), and `embeddingModel text` (the model identifier, for re-indexing — see operational section). Mention the **HNSW index** on `embedding` by name and show its Drizzle form once (`index(...).using('hnsw', table.embedding.op('vector_cosine_ops'))`), then state you don't tune it here — defaults are fine for the course's scale. **(Verified June 2026: Drizzle's `vector()` helper takes `{ dimensions }`; HNSW index uses `.using('hnsw', col.op('vector_cosine_ops'))` — the `vector_cosine_ops` operator class is required or the migration fails. Use `vector_cosine_ops` because these embeddings are normalized and cosine is the correct metric.)**

**Code — `AnnotatedCode`.** The schema is one block with several parts the student must focus on in turn; this is exactly `AnnotatedCode`'s job. Steps:
1. `{table declaration line}` — a normal Drizzle `pgTable`, nothing exotic.
2. `"orgId"` (color green) — the tenancy column; every chunk belongs to one org. Foreshadow the retrieval filter.
3. `"content"` — the raw text; this is what gets returned and injected into the prompt.
4. `vector('embedding', { dimensions: 1536 })` (color blue) — the pgvector column; 1536 matches the embedding model's output exactly. Mismatch = error.
5. `"embeddingModel"` (color orange) — tracks which model produced the vector, so a future re-index is possible.
6. The HNSW index line (color violet) — names the index, says "defaults are fine here," points to scope-cut for tuning.

Keep `maxLines` modest; the table is short. In prose right after, restate the dimension-must-match rule as the first thing that breaks if you swap models without re-embedding.

`Term` candidates: **pgvector** (a Postgres extension that adds a vector column type and similarity operators), **HNSW** (Hierarchical Navigable Small World — the approximate-nearest-neighbor index type pgvector uses to make similarity search fast at scale; you enable it, you don't tune it here).

### The two-phase pipeline: index, then query

The conceptual spine. Make the two phases unmistakably separate, then show each in code.

Teach the shapes first:
- **Index phase (offline/batch).** Take a document → **chunk** it into passages → `embedMany` the chunks → insert rows (`content` + `embedding` + `orgId` + `embeddingModel`) into `documentChunks`. Runs on upload or as a backfill.
- **Query phase (per-request).** `embed` the user's question → Drizzle similarity query for the top-K nearest chunks (filtered by `orgId`) → format their `content` into a context string → inject into the **system prompt** → `streamText`.

**Diagram — `DiagramSequence`.** Goal: show the two phases and the seam (the `documentChunks` table is the shared artifact written by phase 1 and read by phase 2). This is a temporal pipeline; the sequence component lets the student scrub it. Steps (each a small horizontal node strip built with simple HTML, one node highlighted per step):
1. Index — "Document in" → chunker splits into passages.
2. Index — `embedMany(chunks)` produces vectors.
3. Index — insert rows into `documentChunks` (highlight the table; caption: "written once, offline").
4. Query — user question → `embed(question)` (new strip begins; caption notes "now per-request").
5. Query — similarity query reads `documentChunks`, returns top-K chunks (highlight the table again — the seam).
6. Query — top-K `content` → system prompt enrichment → `streamText` → grounded answer.

Per-step captions carry the one-line "what happens here." The two-strip framing (steps 1–3 vs 4–6 sharing the table) makes the offline/online split land.

**Chunking — name the choice, don't get lost in it.** State: the SDK does *not* ship a chunker. Chunking is a problem-domain decision — paragraph chunks for prose, fixed-token windows for code, sentence/utterance chunks for transcripts. The call is `@langchain/text-splitters` or a hand-rolled splitter. Give the two senior guardrails as a tight pair (these are the chunk-size watch-outs, taught inline here, not bundled at the end): chunks **too large** (whole pages) → retrieval returns mostly-irrelevant text and the answer drifts; chunks **too small** (single sentences) → retrieval loses the surrounding context the passage needs to make sense. The sweet spot is a coherent passage with a little overlap. Do not enumerate splitter libraries' pros/cons.

**Index-phase code — a small `Code` block.** A one-shot `async function indexDocument(doc)`: chunk → `embedMany` → `db.insert(documentChunks).values(rows)`. Keep it ≤12 lines; the point is the *three steps in order*, not production-grade ingestion. State in prose this is illustrative — real ingestion adds dedup, batching, and error handling (dedup is a watch-out: see below).

**Query-phase code — `AnnotatedCode`.** The similarity query is the technically richest snippet and deserves stepped focus. Show the Drizzle query that returns top-K chunks. Steps:
1. `embed(question)` — get the query vector (color blue).
2. The `cosineDistance(documentChunks.embedding, queryEmbedding)` expression and the `1 - distance` similarity (color orange) — explicitly call out the distance↔similarity inversion flagged earlier (lower distance = closer; we order by distance ascending, or by `1 - distance` descending).
3. `.where(eq(documentChunks.orgId, session.orgId))` (color **red** — the load-bearing line; tint it to draw the eye) — the tenancy filter; foreshadow the dedicated section.
4. `.orderBy(...)` + `.limit(5)` — nearest-K, K small (5 is a sane default; large K reintroduces the cost problem RAG solves).

Use the current Drizzle shape: `cosineDistance` imported from `drizzle-orm`, `sql<number>` for the `1 - (...)` similarity expression, `.orderBy`, `.limit`. **(Verified June 2026 against Drizzle's vector-similarity guide.)** Optionally apply a small `data-mark-color` discipline mirroring `AnnotatedStep` colors. Keep `maxLines` within ceiling.

### The RAG query in a route handler

Show the *one worked path* end to end: retrieval wired into the `streamText` handler from ch106 L1.

Teach the shape: in `app/api/chat/route.ts`, **before** calling `streamText`, take the user's latest question, `embed` it, run the similarity query (org-scoped), join the top-K chunks' `content` into a `relevantContext` string, and inject it into the **system prompt** as `Relevant context:\n${relevantContext}`. The user's question stays in `messages` (untrusted data); the retrieved context goes in the **system prompt** (trusted, because the retrieval was authorized server-side under `session.orgId`).

**This is a security teaching moment — cross-link ch106 L1's prompt-injection rule.** The system prompt remains the controller; retrieval *enriches* it but does not hand control to the corpus. Add the senior caveat the outline names as a watch-out: retrieved content **grounds** the answer, it does not **validate** it — RAG reduces hallucination over the corpus, it doesn't make the corpus true or the answer correct. Don't let students treat retrieved text as authoritative.

**Code — `AnnotatedCode`.** One handler block, building on the ch106/L1 handler the student already knows. Steps:
1. `authedRoute('member', ...)` wrapper line (color grey/blue) — same auth seam as every handler; `session` is in scope. Note the `withLlmQuota` abbreviation per chapter convention.
2. The retrieval block — `embed` + similarity query + `relevantContext` join (color orange) — "this runs before the model call."
3. The `system` prompt assembly with `Relevant context:` interpolation (color green) — context goes here, in the trusted controller, not in `messages`.
4. `streamText({ model: smartModel, system, messages, stopWhen: stepCountIs(...), maxOutputTokens })` (color blue) — unchanged from ch106; note `stopWhen` + `maxOutputTokens` are still the non-negotiable cost caps (ch105 L2 / ch107 L1 continuity). `messages` still carries the raw user turn.
5. `toUIMessageStreamResponse()` — same return as ch106 L3.

In prose, name this the **pre-retrieval pattern**: retrieve on every turn, before the model runs. Sets up the contrast in the next section.

### Pre-retrieval vs retrieval as a tool

Present the second architecture and give the senior cut for choosing.

Teach: instead of always retrieving up front, define a `searchKnowledgeBase` **tool** (ch107 L1's tool primitive) whose `execute` does the embed-and-query. The model decides *when* to call it via the agentic loop. This is retrieval-as-a-tool.

The senior cut (the decision, stated crisply):
- **Pre-retrieval** is the default for surfaces where **every turn likely needs the corpus** (a docs Q&A bot, a "chat with this handbook" surface). One query per turn, deterministic, simplest.
- **Retrieval-as-a-tool** is the call for **mixed surfaces** where some questions need lookup and many don't (a general assistant that occasionally consults the KB). Saves an embedding call + query on turns that don't need it, and lets the model combine retrieval with other tools in one loop.

Both compose with everything taught. Connect to L1: as a tool, the `orgId` filter lives inside `execute` exactly like every other tool's org-scope; the result feeds back through `stopWhen`.

**Watch-out, taught inline here (not bundled):** don't run *both* in the same surface without deciding which fires first — if context is already pre-injected, the model may still call `searchKnowledgeBase` and double-retrieve, or get confused about whether it already has the context. Pick one per surface.

**Code — `CodeVariants` with two tabs ("Pre-retrieval (every turn)" / "Retrieval as a tool (model decides)").** This is a textbook A/B comparison — same goal, two shapes — so `CodeVariants` is the right component. Tab 1: the condensed pre-retrieval handler (point back to the worked block above). Tab 2: the `searchKnowledgeBase` tool definition (`tool({ description, inputSchema: z.object({ query: z.string() }), execute })` with the embed+query+orgId inside) plus the one-line `tools: { searchKnowledgeBase }` on `streamText`. One-paragraph framing per tab leading with the "use when…". Keep each ≤14 lines.

**Exercise — `MultipleChoice` (or a 3-question `TrueFalse` round).** Check the architecture decision, which is the lesson's real payload. Present 3–4 short scenarios; for each, the student picks the right reach: *paste in prompt* / *tool (exact lookup)* / *RAG pre-retrieval* / *RAG as a tool*. Examples: "A 2-page returns policy that rarely changes" → paste in prompt. "Fetch invoice #INV-203 by its number" → tool, exact lookup. "Chat with our 300-page engineering handbook" → RAG pre-retrieval. "A general support assistant that occasionally needs to cite the handbook" → RAG as a tool. This exercise is the assessment of the lesson's core decision; place it right after this section. (Note: a coding sandbox is *not* appropriate here — embeddings/pgvector can't run in the `ReactCoding` iframe per the react-only constraint, and there's no Drizzle-against-pgvector live runner; keep practice to decision-checking MCQ. Do not propose a custom live-embedding exercise.)

### Authorizing retrieval: the multi-tenant rule

Short, sharp, non-negotiable. The outline calls this "the worst cross-tenant leak shape."

Teach: every `documentChunks` row carries an `orgId`; every retrieval query **must** filter by `session.orgId` (Unit 9's discipline applied to the vector table). State the failure vividly: a retrieval that returns another org's chunks doesn't just leak the data — **the model will then quote it in the answer**, surfacing one tenant's private documents inside another tenant's chat. This is strictly worse than a normal query leak because the leaked content is laundered into natural-language output the user reads as their own answer.

Reinforce: the filter goes wherever the query lives — in the route handler for pre-retrieval, **inside `execute`** for retrieval-as-a-tool (same rule as every tool in L1). An unscoped retrieval query is a bug class, not a shortcut. Point back to the red-tinted `.where(eq(...orgId...))` step in the query-phase `AnnotatedCode` so the student connects the rule to the code they already saw.

Keep it to a few tight paragraphs + an `Aside type="danger"` stating the rule as a one-liner the student can carry. No diagram needed — the weight is the rule.

### Keeping the corpus fresh: re-embedding and updates

The operational reality, briefly. Outline: "name the discipline; do not teach the migration mechanics."

Teach three facts:
- **Embedding models change.** Switching from `text-embedding-3-small` to a newer model means **re-embedding the whole corpus** — new model, new vector space, old vectors are incomparable (and may not even match the column's dimension). This is the embedding-portability trap from ch105 L3, now concrete. The `embeddingModel` column on each row exists precisely so a rolling re-index is possible (re-embed rows tagged with the old model, in batches).
- **Documents change.** A document update triggers a chunk-level re-embed of that document; a delete cascades to its chunks (standard FK cascade, Unit 5).
- **Dedup at insert.** Don't insert the same passage twice — duplicate chunks mean the same text appears multiple times in top-K, wasting the K budget and biasing the answer. (This is the dedup watch-out, taught inline where it belongs.)

Keep this to one compact section — three bullets' worth of prose. No code; the mechanics (a backfill job) are out of scope and reuse Unit 12 background-work patterns the student already has.

### External resources (optional, end of lesson)

Two `ExternalResource` cards max: the AI SDK Embeddings doc page and the Drizzle pgvector / vector-similarity-search guide. These are the two canonical references for the exact APIs taught. Do not pad with vector-theory links — out of scope.

---

## Scope

**Prerequisites (assume taught; redefine in one line only if used):**
- AI SDK Core primitives, `streamText`, the route-handler seam, system-prompt-as-controller, prompt-injection rule (ch106 L1).
- `UIMessage`/`messages` contract and `toUIMessageStreamResponse` (ch106 L3).
- The tool primitive — `tool({ description, inputSchema, execute })`, server-side `execute`, org-scope inside `execute`, the `stopWhen` agentic loop (ch107 L1). Re-explain only the one-line shape when introducing retrieval-as-a-tool.
- `lib/llm/models.ts` role-named handles, AI Gateway, the embedding-portability trap, cost caps `stopWhen`/`maxOutputTokens` (ch105 L2–L3).
- Drizzle `pgTable`, columns, FK/cascade, indexes, uuidv7, Postgres on Neon (Unit 5).
- `session.orgId` multi-tenancy / org-scoping discipline (Unit 9).
- Zod 4 schema basics (ch042 / ch106 L2).

**This lesson does NOT cover (route elsewhere or omit):**
- The math of embeddings, dimensionality reduction, vector-space geometry — out of scope; teach shape only.
- Production vector-index tuning (HNSW `m`/`ef_construction`, IVFFlat lists) — out of scope; name HNSW, use defaults.
- Hybrid retrieval (BM25 + vector), re-ranking, query rewriting — named once as "more advanced"; the lesson teaches the default semantic path only.
- Managed vector databases (Pinecone, Upstash Vector, Qdrant) — named once as the alternative when pgvector is outgrown; not compared or configured.
- Multi-modal embeddings (image/audio) — out of scope.
- Building the full ingestion pipeline (batching, retries, observability) and the re-index backfill job mechanics — named, deferred to the student's existing Unit 12 background-work toolkit; not built here.
- A deep chunking-strategy survey — name the choice + two guardrails (too big / too small); don't enumerate libraries.
- Rendering retrieved chunks as generative-UI components — that's ch107 L2's pattern; this lesson puts retrieved `content` in the prompt, it doesn't render it.
- **The worked "ask-your-invoices" RAG product** — that's the chapter's domain and the next chapter. The invoice *stats tool* (exact lookup, not RAG) and the per-user token quota land in Chapter 108 (the project). This lesson teaches the RAG pattern in isolation; do not build the product surface. Note: ch108's project leans on the *tool* path (`getInvoiceStats`), so keep this lesson's worked example a *generic corpus* (handbook / docs / tickets), not invoices, to avoid implying invoices need RAG — they're an exact-lookup case, which the L1 tool already handles.
