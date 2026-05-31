# Chapter 108 — Project: Ask-your-invoices chat with tool calling

## Chapter framing

Chapter 108 cashes in chapter 105's "when LLMs earn their weight" framing, chapter 106's `streamText` + `useChat` + `UIMessage` parts protocol, and chapter 107's tool-calling, agentic-loop, and tool-parts rendering as one runnable "Ask the invoices" chat surface sitting on top of the chapter 062 customers + invoices project.
The student builds a `POST /api/chat` route handler that wraps `authedRoute('member', …)`, runs `streamText` with `stopWhen(stepCountIs(5))` over a Zod-defined `getInvoiceStats` tool whose `execute` queries `tenantDb(orgId).invoices.active()` and projects a minimal aggregate shape back to the model, plus a typed `useChat` client component that renders text parts and `tool-getInvoiceStats` parts (`input-streaming` / `input-available` / `output-available` / `output-error`) with per-state UX.
A `usage_quota_daily` table tracks per-user-per-day token usage incremented inside `onStepFinish` against a 100k-token daily cap, with the request that crosses the cap returning a typed `quota_exceeded` refusal.

Threads through every lesson: **tools are the only doorway from the model into app state** — the LLM never sees a DB connection, the `orgId`, or a row it isn't allowed to see; every Drizzle read happens inside the tool's `execute` under the same `authedRoute('member', …)` wrapper that runs the route, with `session.orgId` from context (never from the model's tool-call arguments — the model is treated as untrusted input); **the agentic loop is server-owned via `stopWhen`** — `stepCountIs(5)` is the explicit cap, no client-side `maxSteps`; **Zod is the single contract** — `inputSchema` on the tool, `outputSchema` projecting the minimal aggregate shape, the same Zod 4 discipline as chapter 042 and chapter 057; **token accounting is a first-class seam** — `onStepFinish` increments the daily counter atomically per step, `onFinish` writes a single audit-log entry, the panel polls the counter; **the client is a typed `useChat` with `InferUITools<typeof tools>`** — `message.parts.map` switches on `part.type` and `part.state`, no `ai/rsc`, no raw JSON renders; **the surface refuses gracefully** — quota overruns, forged tool args, and tool errors all return typed refusal shapes the model can read or the UI can render, never thrown 500s; **everything composes with prior units** — the Drizzle reads ride chapter 062's scoped query helpers, the tenancy enforcement rides chapter 057's `authedRoute`, the audit writes ride lesson 5 of chapter 057's `logAudit`, the env wiring rides the type-safe `env` from Unit 5.

### Project goals

The finished surface satisfies these goals; each one is owned by the lesson that builds the capability and confirmed in that lesson's Moment of truth.

- Typing a question about the user's invoices streams a grounded answer whose numbers match the database, because the system prompt forces a `getInvoiceStats` call before any numeric claim and the tool reads real Drizzle aggregates.
- A forged `orgId` is refused: the tool reads `orgId` from the route's auth closure, never from the model's tool-call arguments, so the model cannot reach another org's data.
- The request that crosses the 100k-token daily cap returns a typed `quota_exceeded` refusal (HTTP 429) the client surfaces as a friendly toast, with the input still enabled for tomorrow.
- The agentic loop is capped server-side at 5 steps via `stopWhen(stepCountIs(5))`, with no client-side `maxSteps`.
- Tools run server-side under `authedRoute('member', …)`: an unauthenticated request is refused with 401 and the model never runs.
- Tool failures return a typed `{ error }` the model and UI can render rather than throwing a 500.
- The client is a typed `useChat<InvoiceUIMessage>` (v5 shape — `sendMessage`, `regenerate`, `message.parts`, locally managed input, no `ai/rsc`) that renders text parts and `tool-getInvoiceStats` parts across all four lifecycle states with a per-tool skeleton rather than a generic spinner, and `part.output` is typed end-to-end via `InferUITools`.
- A token-usage panel reflects accumulated usage (both input and output tokens) within its 10s poll window, and every conversation writes `'llm.step'` and `'llm.finish'` rows to `llm_audit_events` scoped to the active org.
- `src/lib/llm` is the only seam the tools, prompt, and quota live behind: the two route handlers and the chat component (for the message type) are the only importers.

### Dependency carry-in

- **From chapter 062:** `app/(app)/invoices/page.tsx` and `app/(app)/customers/page.tsx`, the `invoices` table with `deletedAt` / `archivedAt` / `version` columns, the `invoiceScope(orgId)` helper exposing `.active() / .archived() / .includingDeleted()`, `listInvoices` in `src/lib/invoices/queries.ts`, the seeded dataset (two orgs, 60+ invoices each, statuses across `draft` / `sent` / `paid` / `overdue`).
- **From chapter 057:** `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts`, `authedAction` for any non-streaming action, `requireOrgUser` returning `{ user, orgId, role }`, the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage, …} }`, `logAudit(tx, event)`.
- **From chapter 056:** `tenantDb(orgId)` as the only doorway into tenant-owned tables.
- **From chapter 042 / chapter 043:** Zod 4 (`z.strictObject`, `z.infer`, `z.flattenError`).
- **From chapter 105:** the cost-cap discipline (per-user-per-day token quota, abuse mitigation as the user-facing-LLM rule); the provider-abstraction reflex behind `lib/llm/models.ts`.
- **From chapter 106:** `streamText`, `toUIMessageStreamResponse`, `convertToModelMessages`, the `UIMessage` parts protocol, `useChat<MyUIMessage>` with manually managed input state, `sendMessage` and `regenerate`, the `onFinish` audit seam, `onError` returning sanitized messages, the system-prompt-as-controller posture, the `lib/llm/prompts.ts` registry convention.
- **From lesson 1 of chapter 107:** `tool({ description, inputSchema, execute, outputSchema })`, `execute` running server-side under the route's auth context, `stopWhen(stepCountIs(n))` as the default loop control, `onStepFinish` for per-step audit and quota, the "return don't throw" error pattern inside `execute`, projecting minimal results back to the model.
- **From lesson 2 of chapter 107:** the typed `UIMessage` via `InferUITools<typeof tools>`, the `lib/llm/tools.ts` registry convention, the four part states and per-tool skeletons, the parts-array rendering pattern.
- **From Unit 5 (env):** the type-safe `env` module (`@t3-oss/env-nextjs`) with `OPENAI_API_KEY` added.

### Starting file tree (stubs marked with TODO)

```
docker-compose.yml                # provided: postgres:18
drizzle.config.ts                 # provided
next.config.ts                    # provided: cacheComponents: true
.env.example                      # provided + OPENAI_API_KEY
package.json                      # provided: ai@^5, @ai-sdk/openai, @ai-sdk/react added
scripts/seed.ts                   # provided: 2 orgs, 4 users, 60+ invoices/org,
                                  #           usage_quota_daily row for member-A
                                  #           at 90,000 tokens (close to cap)
src/
  db/
    schema.ts                     # provided: chapter 062 schema + usage_quota_daily,
                                  #           llm_audit_events tables
    client.ts                     # provided
  env.ts                          # provided: type-safe env, OPENAI_API_KEY entry
  lib/
    tenant-db.ts                  # provided (chapter 056)
    authed-route.ts               # provided (lesson 3 of chapter 057)
    authed-action.ts              # provided (lesson 2 of chapter 057)
    audit-log.ts                  # provided
    invoices/
      scoped-query.ts             # provided (chapter 062): invoiceScope(orgId)
      queries.ts                  # provided (chapter 062): listInvoices, etc.
    llm/
      models.ts                   # provided (lesson 3 of chapter 105): chatModel = openai('gpt-5-mini')
      prompts.ts                  # TODO: invoiceQAPrompt — system prompt
                                  #       enforcing tool-grounded answers, refusing
                                  #       speculation, and the org-scope rule
      tools.ts                    # TODO: getInvoiceStats tool with inputSchema
                                  #       + outputSchema; closure over orgId
      quota.ts                    # TODO: reserveQuotaOrRefuse(userId), addUsage,
                                  #       readUsage — DAILY_TOKEN_CAP = 100_000
      audit.ts                    # TODO: writeLlmStepEvent, writeLlmFinishEvent
                                  #       (direct inserts into llm_audit_events; same audit-log
                                  #        discipline as lesson 5 of chapter 057's logAudit but against the LLM
                                  #        events table)
  app/
    (app)/
      invoices/
        page.tsx                  # provided (chapter 062) + <InvoiceChat /> mounted in
                                  #   a right-rail panel
        invoice-chat.tsx          # TODO: 'use client'; useChat<InvoiceUIMessage>;
                                  #       renders parts; token-usage panel
        invoice-stats-card.tsx    # TODO: 'use client'; renders the tool-part
                                  #       output across the four states with a
                                  #       per-tool skeleton (not a generic spinner)
        token-usage-panel.tsx     # TODO: 'use client'; polls /api/usage every 10s,
                                  #       renders remaining-tokens bar
    api/
      chat/
        route.ts                  # TODO: POST handler wrapped in authedRoute
                                  #       running streamText with stopWhen +
                                  #       tools + onStepFinish + onFinish
      usage/
        route.ts                  # TODO: GET handler returning today's
                                  #       { used, cap, remaining } for current user
    inspector/
      page.tsx                    # provided: org + session switcher, "Force quota
                                  #   to 99,500" button, "Force tool error" toggle,
                                  #   "Replay last conversation against other org"
                                  #   forged-orgId button, llm_audit_events tail,
                                  #   usage_quota_daily live counter, step-count
                                  #   ceiling demo button
```

### Reference solution signatures lessons display

- **Quota module** (`src/lib/llm/quota.ts`):
  - `export const DAILY_TOKEN_CAP = 100_000`.
  - `export const readUsage = async (userId: string) => { /* SELECT tokens_used FROM usage_quota_daily WHERE userId AND day = current_date */ }` returning `{ used, cap, remaining }`.
  - `export const reserveQuotaOrRefuse = async (userId: string): Promise<{ ok: true } | { ok: false, error: { code: 'quota_exceeded', userMessage: string } }>` — single-row upsert with `INSERT ... ON CONFLICT (userId, day) DO UPDATE SET tokens_used = tokens_used` (idempotent insert of the day row); then a second `SELECT` to compare `tokens_used` to `DAILY_TOKEN_CAP`; returns refusal at cap.
  - `export const addUsage = async (userId: string, tokens: number) => { /* UPDATE usage_quota_daily SET tokens_used = tokens_used + ${tokens}, updatedAt = NOW() WHERE userId AND day = current_date */ }`.
- **Tool registry** (`src/lib/llm/tools.ts`):
  - `export const buildInvoiceTools = (ctx: { orgId: string }) => ({ getInvoiceStats: tool({ description: 'Return aggregate invoice statistics for the current organization. Use this for any question that needs counts, totals, or status breakdowns of invoices.', inputSchema: z.strictObject({ status: z.enum(['draft','sent','paid','overdue']).optional(), since: z.string().date().optional() }), outputSchema: z.strictObject({ count: z.number().int(), totalAmount: z.number(), byStatus: z.record(z.string(), z.number().int()), oldestUnpaidDueDate: z.string().date().nullable() }), execute: async (input) => { try { const scope = invoiceScope(ctx.orgId).active(); /* apply optional filters; aggregate via Drizzle */ return { count, totalAmount, byStatus, oldestUnpaidDueDate } } catch (e) { return { error: 'stats_unavailable' as const } } } }) })`.
  - `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>`.
  - `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>`.
- **System prompt** (`src/lib/llm/prompts.ts`):
  - `export const invoiceQAPrompt = (ctx: { orgName: string }) => \`You are an analyst answering questions about ${ctx.orgName}'s invoices. Always call getInvoiceStats before stating numeric facts. Refuse questions about other organizations. If a tool returns { error }, explain the failure and ask the user to rephrase.\``.
- **Route handler** (`src/app/api/chat/route.ts`):
  - `'use server';` not used (this is a route handler, not an action — the `route.ts` file is implicitly server-only).
  - `export const POST = authedRoute({ role: 'member', schema: z.strictObject({ messages: z.array(z.unknown()) }), fn: async ({ ctx, input }) => { const reserved = await reserveQuotaOrRefuse(ctx.user.id); if (!reserved.ok) return Response.json(reserved, { status: 429 }); const tools = buildInvoiceTools({ orgId: ctx.orgId }); const result = streamText({ model: chatModel, system: invoiceQAPrompt({ orgName: ctx.orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), tools, stopWhen: stepCountIs(5), onStepFinish: async ({ usage, toolCalls, toolResults, finishReason }) => { await addUsage(ctx.user.id, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)); await writeLlmStepEvent({ userId: ctx.user.id, orgId: ctx.orgId, toolCalls, finishReason, usage }) }, onFinish: async ({ usage, finishReason }) => { await writeLlmFinishEvent({ userId: ctx.user.id, orgId: ctx.orgId, finishReason, usage }) }, onError: ({ error }) => { /* sanitized log; do not leak */ } }); return result.toUIMessageStreamResponse() } })`.
- **Client component** (`invoice-chat.tsx`):
  - `'use client';`
  - `const { messages, sendMessage, status } = useChat<InvoiceUIMessage>({ api: '/api/chat', onError: (e) => toast.error('Something went wrong. Try again.') });`
  - `const [input, setInput] = useState('');` — manually managed input state (v5 no longer manages this).
  - Render loop: `messages.map((m) => m.parts.map((part, i) => { switch (part.type) { case 'text': return <TextBubble role={m.role} text={part.text} key={i} />; case 'tool-getInvoiceStats': return <InvoiceStatsCard state={part.state} input={part.input} output={part.output} key={i} />; default: return null } }))`.
- **Stats card** (`invoice-stats-card.tsx`):
  - `'use client';` switch on `state`: `input-streaming` → null; `input-available` → `<InvoiceStatsCard.Skeleton />` (a card-shaped skeleton with stat slots, not a generic spinner); `output-available` → renders `count`, `totalAmount` (currency-formatted), `byStatus` as a small dl, `oldestUnpaidDueDate` (Temporal formatted); `output-error` → `<p className='text-destructive'>I couldn't load those stats. Try rephrasing.</p>`.
- **Usage panel** (`token-usage-panel.tsx`):
  - `'use client';` polls `/api/usage` every 10 s; renders a horizontal bar `used / cap` plus remaining count.
- **Usage endpoint** (`/api/usage/route.ts`):
  - `export const GET = authedRoute({ role: 'member', schema: z.object({}), fn: async ({ ctx }) => Response.json(await readUsage(ctx.user.id)) })`.
- **Env entries**: `OPENAI_API_KEY` (string, server-only) added to `src/env.ts`.
- **Schema additions** (already shipped in `db/schema.ts`):
  - `usage_quota_daily` — `userId uuid fk`, `day date`, `tokensUsed int default 0`, `updatedAt timestamptz`, pk `(userId, day)`.
  - `llm_audit_events` — id, userId, orgId, event (`'llm.step'` | `'llm.finish'`), payload jsonb, createdAt.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface. The chat surface itself lives on `/invoices`; the inspector mirrors state and offers the destructive verification toggles. Each Implementation lesson's Moment of truth reaches for the relevant controls below.

- **Header:** session-user switcher (admin-A / member-A / admin-B / member-B), org switcher (orgs A and B with disjoint invoices).
- **Usage counter panel:** live read of `usage_quota_daily` for the selected user — `tokens_used / DAILY_TOKEN_CAP`, last update time. Updates within the 10 s poll window.
- **"Force quota to 99,500" button:** raw `UPDATE usage_quota_daily SET tokens_used = 99500 WHERE userId = :u AND day = current_date` so the next request crosses the cap deterministically.
- **"Force tool error" toggle:** sets a server flag making the next `getInvoiceStats.execute` return `{ error: 'stats_unavailable' }` instead of running the query — verifies the tool's "return don't throw" path and the `output-error` render.
- **"Forge orgId — replay against org B" button:** opens a sandbox panel where the student crafts a tool-call payload with `orgId` injected into the input shape (not in the schema, but the model is allowed to invent inputs); confirms the tool ignores the forged value because `orgId` comes from the closure, not the model's input.
- **"Step ceiling demo" button:** sends a deliberately under-specified question that makes the model retry tool calls; confirms the loop stops at step 5 with `finish_reason: 'stop'` and a final assistant message acknowledging the cap.
- **`llm_audit_events` tail:** last 20 events with `event`, `usage`, `finishReason`, `toolCalls`. Updates after every conversation.
- **Conversation transcript panel:** raw `UIMessage[]` of the last conversation, JSON-formatted — verifies what the client actually sends and renders.
- **Two debug flags behind toggles:** `BYPASS_AUTHED_ROUTE` (sets `ctx.user` / `ctx.orgId` to the inspector's selected user without checking the session — proves the route refuses with 401 when reverted), `MODEL_FROM_INPUT_ORGID` (changes `buildInvoiceTools` to read `orgId` from the model's tool-call input — proves the cross-tenant leak when reverted).

### Concepts demonstrated → owning lesson

- `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse` — lesson 1 of chapter 106, lesson 3 of chapter 106.
- `useChat<MyUIMessage>`, `sendMessage`, `regenerate`, manually managed input state, the parts protocol — lesson 3 of chapter 106.
- `tool({ description, inputSchema, execute, outputSchema })`, `execute` server-side under auth — lesson 1 of chapter 107.
- `stopWhen(stepCountIs(n))`, the agentic loop, the server-side cap — lesson 1 of chapter 107.
- `onStepFinish` for per-step quota/audit accounting, `onFinish` for aggregate audit — lesson 1 of chapter 107 + lesson 1 of chapter 106.
- Tool-result projection (return aggregates, not raw rows) — lesson 1 of chapter 107.
- "Return don't throw" error pattern inside `execute` — lesson 1 of chapter 107.
- Tool-part lifecycle (`input-streaming` / `input-available` / `output-available` / `output-error`), per-tool skeleton — lesson 2 of chapter 107.
- `InferUITools<typeof tools>` and the typed `UIMessage` — lesson 2 of chapter 107.
- The `lib/llm/{models,prompts,tools}.ts` registry convention — lesson 3 of chapter 105 + lesson 1 of chapter 106 + lesson 2 of chapter 107.
- Per-user daily token quota, abuse mitigation, cost accounting — lesson 2 of chapter 105.
- System-prompt-as-controller, refusing speculation, force-tool-grounding — lesson 1 of chapter 106.
- `authedRoute(role, schema, fn)` wrapping the streaming handler — lesson 3 of chapter 057.
- `tenantDb(orgId)` and `invoiceScope(orgId).active()` inside the tool — lesson 2 of chapter 056 + chapter 062.
- Zod 4 `strictObject`, `z.infer`, canonical Result shape — chapter 042 + lesson 2 of chapter 057.
- `logAudit(tx, event)` inside `onStepFinish` / `onFinish` — lesson 5 of chapter 057.
- Type-safe `env` for `OPENAI_API_KEY` — Unit 5.

### Lesson roadmap (owning lesson per build slice)

- **Lesson 1 — Project Overview.** Run the starter; tour the provided files and the inspector.
- **Lesson 2 — Streaming route under auth with the agentic loop.** `POST /api/chat` wrapped in `authedRoute('member')`, `streamText` capped at 5 steps, the tool-grounded system prompt, an `onFinish` audit write. Ends streaming text-only answers.
- **Lesson 3 — The org-scoped `getInvoiceStats` tool.** The closure-over-`orgId` tool with an aggregate `outputSchema` and "return don't throw" errors, wired into the route with per-step audit. Ends answering grounded questions with real Drizzle numbers.
- **Lesson 4 — The per-user daily token quota.** `quota.ts`, the pre-stream reservation, `onStepFinish` token accounting, and the `/api/usage` endpoint. Ends refusing the over-cap request with a typed 429.
- **Lesson 5 — Typed `useChat`, tool parts, and the usage panel.** The full typed client rendering text and tool parts across four states with a per-tool skeleton, plus the polling usage panel. Ends with the full happy and unhappy paths live.

---

## Lesson 1 — Project Overview

An "ask-your-invoices" chat lives in the right rail of `/invoices`: the user types a question about their organization's invoices and a tool-calling LLM answers, grounded in real Drizzle data, with a live panel showing how much of today's token budget is left.
By the end of this lesson the chapter 062 starter runs locally with the seeded invoices list rendering and the chat shell present but unwired.

_(Single figure: the finished right-rail chat — a question typed, the tool-part skeleton flashing, the output card with real numbers, the assistant text bubble citing the count, and the usage panel ticking up.)_

### What we'll practice

- Wrapping a streaming LLM endpoint in the same auth boundary that guards every other mutation, so the model only ever runs for an authenticated org member.
- Treating the model as untrusted input: tools as the only doorway into app state, `orgId` from the server closure, aggregate projections instead of raw rows.
- Owning the agentic loop server-side with an explicit step cap rather than trusting a client or an SDK default.
- Accounting for cost per user per day and refusing gracefully when the budget is spent.
- Rendering a typed `useChat` surface where tool outputs are fully typed at the call site and each tool has its own loading shape.

This is the canonical 2026 shape for any LLM-backed SaaS surface. A future customer-support assistant or an onboarding helper reuses this skeleton with a different tool registry and a different prompt.

### Architecture

- **Client** — `invoice-chat.tsx` (`useChat<InvoiceUIMessage>`) in the `/invoices` right rail, rendering text and `tool-getInvoiceStats` parts; `token-usage-panel.tsx` polling `/api/usage`.
- **Route** — `POST /api/chat` wrapped in `authedRoute('member')`: `streamText` with the tool-grounded system prompt, `stopWhen(stepCountIs(5))`, the tool registry, `onStepFinish` (quota + step audit), `onFinish` (aggregate audit).
- **Feature seam** — `src/lib/llm/{prompts,tools,quota,audit}.ts`, behind which the model never sees a DB connection or an `orgId`; `models.ts` (provided) holds the provider handle.
- **Data** — chapter 062's `invoices` read through `invoiceScope(orgId).active()`; `usage_quota_daily` and `llm_audit_events` for accounting.
- **Inspector** — `/inspector`, a Server Component mirroring quota, audit, and transcript state and offering the destructive verification toggles.

### Starting file tree

See the chapter framing's "Starting file tree" above. The eight TODO-marked files are the highlighted focus: `src/lib/llm/{prompts,tools,quota,audit}.ts`, `src/app/api/chat/route.ts`, `src/app/api/usage/route.ts`, and the three client components in `src/app/(app)/invoices/`. Everything else — the chapter 062 list, the schema, the auth wrappers, the model registry, the seed, and the inspector — ships provided.

Deep per-file explanation of each stub lives in the lesson that first writes it: `prompts.ts` and `audit.ts` and `route.ts` in Lesson 2, `tools.ts` in Lesson 3, `quota.ts` and `usage/route.ts` in Lesson 4, the three client components in Lesson 5.

The provided files worth reading before starting:

- `src/lib/llm/models.ts` — one export, `chatModel = openai('gpt-5-mini')`. Swapping providers is a one-line change here (the provider-abstraction discipline from lesson 3 of chapter 105).
- `src/env.ts` — `OPENAI_API_KEY` as `z.string().min(1)`, server-only.
- `src/db/schema.ts` — the two new tables: `usage_quota_daily` (composite pk on `(userId, day)`, `tokensUsed` int, `updatedAt`) and `llm_audit_events` (event enum `'llm.step' | 'llm.finish'`, jsonb payload). Both ship in the migration that has already run.
- `app/(app)/invoices/page.tsx` — the chapter 062 list view plus a new right-rail slot rendering `<InvoiceChat />` (a shell pointing at an unwritten component).
- `package.json` — `ai@^5`, `@ai-sdk/openai`, `@ai-sdk/react` (note the v5 import paths).
- `next.config.ts` — `cacheComponents: true` from chapter 062; the chat surface is fully client-side and the streaming route handler is dynamic by definition, so neither interacts with Cache Components.
- `/inspector` end-to-end — the usage counter, audit-events tail, conversation transcript panel, force-quota button, force-tool-error toggle, forge-orgId panel, step-ceiling demo button, and the two debug flags (`BYPASS_AUTHED_ROUTE`, `MODEL_FROM_INPUT_ORGID`).

The seeded `usage_quota_daily` row for member-A at 90,000 tokens is the surface later lessons exercise — a few small questions cross the cap deterministically without spending real money.

### Roadmap

_(CardGrid, one Card per build lesson.)_

- **Lesson 2 — Streaming route under auth.** Adds `POST /api/chat`: `streamText` wrapped in `authedRoute('member')`, capped at 5 steps, streaming text-only answers.
- **Lesson 3 — The org-scoped tool.** Adds `getInvoiceStats`, so the chat answers questions grounded in real Drizzle aggregates.
- **Lesson 4 — The daily token quota.** Adds per-user-per-day token accounting and the typed 429 refusal when the budget is spent.
- **Lesson 5 — Typed client and usage panel.** Adds the typed `useChat` surface rendering tool parts across four states with a per-tool skeleton, plus the live usage panel.

### Setup

_(Steps component.)_

1. Clone the starter: `pnpm dlx degit <starter-repo> ask-your-invoices && cd ask-your-invoices`.
2. Install dependencies: `pnpm install`.
3. Copy the env template: `cp .env.example .env`.
4. Start Postgres: `docker compose up -d`.
5. Apply the migration: `pnpm db:migrate`.
6. Load the seed: `pnpm db:seed`.
7. Start the dev server: `pnpm dev`.

Environment variables:

- `DATABASE_URL` — connection string for the local Postgres started by `docker compose`. The template's default matches `docker-compose.yml`; no change needed for local work.
- `OPENAI_API_KEY` — server-only key the model handle reads. Obtain it from the OpenAI dashboard (`platform.openai.com` → API keys) and paste it into `.env`. Each verify pass costs a few cents in tokens.

On success, `/invoices` renders the chapter 062 list with an empty right-rail chat shell (input disabled), and `/inspector` loads with usage at 0 and an empty audit-events tail. `POST /api/chat` and `GET /api/usage` return 405 (no handlers defined yet). This lesson ends here — the starter runs locally.

---

## Lesson 2 — Streaming route under auth with the agentic loop

Wire a `POST /api/chat` route handler that streams an LLM answer to any question, wrapped in `authedRoute('member')` and capped at a 5-step agentic loop.
When it works, signing in as an org member and typing a question streams a text answer back into a temporary chat box, an unauthenticated request is refused with 401, and one `'llm.finish'` row lands in the audit-events tail.

### Your mission

This is the spine every later lesson hangs off: the streaming endpoint and its guardrails, before any tool can read a row.
The hard senior reflex here is "cap and wrap first, then add capability" — `authedRoute('member')` is the load-bearing wrapper, and calling `streamText` from a bare `POST` is the canonical bug class: the chat would answer any anonymous caller, burn tokens, and have no `orgId` to scope by.
The 5-step `stopWhen(stepCountIs(5))` goes in now, before tools exist, because adding tools without a cap opens a runaway-loop window and the SDK default of `stepCountIs(20)` is too loose for a surface with a per-user cost ceiling.
The system prompt is the controller: it forces tool-grounding ("Always call getInvoiceStats before stating numeric facts"), refuses cross-org questions, and defines error behavior — user messages are untrusted input, not instructions.
Two v5 seams surface once here: `convertToModelMessages` translates the client's `UIMessage[]` rendering shape into the model's `ModelMessage[]` wire shape (skipping it is a v5-onboarding bug), and `toUIMessageStreamResponse()` is what makes the response a stream `useChat` understands (not `toTextStreamResponse()`, a different protocol).
The route's input schema deliberately accepts an untyped `messages` array — validating the full `UIMessage` shape with Zod is heavy, and the converter does the real validation; name the trade rather than over-validating.
The audit wrappers in `audit.ts` write directly to `llm_audit_events` rather than wrapping `logAudit` (a different table), but they keep its discipline: each opens a one-statement `tenantDb(orgId).transaction((tx) => logAudit(tx, …))`-shaped write, because `logAudit`'s signature requires a `tx` so off-transaction writes don't typecheck — the route itself isn't transactional, so the wrapper supplies the bounded one-row transaction the signature demands.
`onError` returns a sanitized log and never leaks raw errors to the client; per-step audit and the tool registry are out of scope and land in Lessons 3 and 4.
To exercise the route before the real client exists, stand up a throwaway smoke-test client: a `useChat<InvoiceUIMessage>` bound to a local textarea that renders messages as raw text — the full parts-rendering client is Lesson 5.

- Typing a question (for example, "tell me a joke about invoices") streams a text answer back into the temporary chat box.
- An unauthenticated request to `POST /api/chat` is refused with 401, and the model never runs.
- The system prompt is in place: a question that asks for another org's data is refused in the answer text.
- Every completed conversation writes exactly one `'llm.finish'` row (with `finishReason: 'stop'`) to the audit-events tail, scoped to the signed-in org.

### Coding time

Implement `src/lib/llm/prompts.ts`, `src/lib/llm/audit.ts`, `src/app/api/chat/route.ts`, and the temporary smoke-test `invoice-chat.tsx` against the brief and the tests, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/prompts.ts` — the single `invoiceQAPrompt({ orgName })` export from the framing's signatures. Three load-bearing lines: enforce tool-grounding, refuse cross-org questions, define the `{ error }` behavior.
- `src/lib/llm/audit.ts` — `writeLlmStepEvent` and `writeLlmFinishEvent`, each a direct insert into `llm_audit_events` inside a bounded one-row transaction. Rationale: the table differs from `auditLogs`, so these are not `logAudit` wrappers, but the one-row-per-event, no-off-transaction-writes discipline carries over from lesson 5 of chapter 057.
- `src/app/api/chat/route.ts` — the `authedRoute({ role: 'member', schema, fn })` shape from the framing, minus the tools and `onStepFinish` (Lessons 3 and 4). Inside `fn`, before the stream, fetch the org display name the context doesn't carry: `const { name: orgName } = await ctx.db.query.organization.findFirst({ where: eq(organization.id, ctx.orgId) })`. Then `streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), stopWhen: stepCountIs(5), onFinish: … , onError: … })` and `return result.toUIMessageStreamResponse()`.
  - Callout: the route is a route handler, not a Server Action — streaming responses are route handlers; `authedRoute` is the `Request`/`Response` variant of `authedAction` from lesson 3 of chapter 057.
  - Callout: `stopWhen(stepCountIs(5))` is set with no tools to call yet, so the cap is not exercised in this lesson — it is set first on purpose.
- Smoke-test `invoice-chat.tsx` — `'use client'`; `useChat<InvoiceUIMessage>({ api: '/api/chat' })`; a textarea bound to local `useState`; Submit calls `sendMessage({ text: input })`; messages render as raw text. For topics already covered, link rather than re-explain: `convertToModelMessages` and the parts protocol to lesson 3 of chapter 106, `authedRoute` to lesson 3 of chapter 057, `onError` sanitization to chapter 106.

### Moment of truth

Run the lesson's test suite: `pnpm test chapter-108/lesson-2` (expected: all green, with assertions on the streamed text answer, the 401 for an unauthenticated request, and the single `'llm.finish'` row).

Confirm by hand what the tests don't cover:

- [ ] Signed in as member-A, typing "tell me a joke about invoices" streams a text answer into the smoke-test box.
- [ ] Clearing the session cookie and sending `POST /api/chat` (via `curl` or devtools) returns 401 from `authedRoute`; the model never ran.
- [ ] Asking for another organization's data is refused in the answer text (the system prompt as controller).
- [ ] After one conversation, the inspector's audit-events tail shows exactly one `'llm.finish'` row with `finishReason: 'stop'`, scoped to org A.

---

## Lesson 3 — The org-scoped getInvoiceStats tool

Give the chat a single tool, `getInvoiceStats`, so it answers questions grounded in real invoice aggregates rather than guessing.
When it works, asking "how many overdue invoices do we have?" returns a number that matches the database, and a forged `orgId` in the model's arguments cannot reach another org's data.

### Your mission

This lesson turns the chat from a text generator into a grounded analyst, and it carries the single most important rule of the project.
The tool is built per request by `buildInvoiceTools({ orgId: ctx.orgId })`, and `orgId` is **never** in the tool's `inputSchema` — the model cannot pass it, fake it, or ask for another org's data, because `execute` closes over `ctx.orgId` from `authedRoute`. This is the senior rule from lesson 1 of chapter 107 made structural; the inspector's `MODEL_FROM_INPUT_ORGID` flag exists precisely to make the cross-tenant leak visible if you break it.
`outputSchema` projects an aggregate, not raw rows — a `count`, a `totalAmount`, a `byStatus` map, one date — which is the "return minimal" discipline: feeding raw rows back to the model would compound input tokens across loop steps and leak invoice IDs, amounts, and customer names the model never needs to see. Project at the tool boundary, not the rendering boundary.
Errors follow "return don't throw": a `try/catch` around the Drizzle call returns `{ error: 'stats_unavailable' as const }` on database failure, which the SDK accepts as long as it serializes; programmer errors (bad Drizzle types, undefined references) still bubble, because those are bugs, not user-facing failures.
The SDK validates the model's tool arguments against `inputSchema` (`z.strictObject`, `z.enum`) before `execute` runs, so an invented status outside the enum becomes an `output-error` the model can read and react to.
Wiring the tool into the route also adds the per-step audit seam: `onStepFinish` writes one `'llm.step'` row per step via `writeLlmStepEvent`, so a 3-step loop produces 3 step rows plus the 1 finish row.
The smoke-test client from Lesson 2 stays in place; the typed parts-rendering client and the token-counting half of `onStepFinish` are out of scope and land in Lessons 5 and 4 respectively.

- Asking "how many overdue invoices do we have?" returns a number matching `SELECT COUNT(*) FROM invoices WHERE organizationId = A AND status='overdue' AND deletedAt IS NULL AND archivedAt IS NULL`, run by hand against the seed.
- Asking "what's our total paid this month?" returns a total matching the equivalent Drizzle aggregate run by hand.
- A message that asks the model to "use orgId = B-uuid" still returns org A's data, because `execute` reads `orgId` from the closure (the inspector's forge-orgId panel makes this concrete); flipping `MODEL_FROM_INPUT_ORGID` and repeating shows the leak, confirming the closure is the structural reason it is safe.
- The step-ceiling demo (a recursion-prone prompt) produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap; removing `stopWhen` lets the loop run to the SDK default.
- With the inspector's "Force tool error" toggle on, a stats question produces a `tool-getInvoiceStats` part in `state: 'output-error'` and a follow-up text answer asking the user to rephrase, with no 500 in the network tab.
- Each conversation writes one `'llm.step'` row per loop step plus one `'llm.finish'` row, scoped to the active org.

### Coding time

Implement `src/lib/llm/tools.ts` and wire it into `src/app/api/chat/route.ts` against the brief and the tests, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/tools.ts` — the `buildInvoiceTools` factory from the framing's signatures: the `getInvoiceStats` tool with its description, `inputSchema` (`status?`, `since?` — no `orgId`), `outputSchema` (the aggregate projection), and an `execute` that calls `invoiceScope(ctx.orgId).active()` with the optional filters, aggregates via Drizzle, and returns the projected shape inside a `try/catch` that returns `{ error: 'stats_unavailable' as const }`. Plus `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>` and `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>` — the client imports only the message type.
  - Callout: the closure over `ctx.orgId` is the load-bearing line; `orgId` is absent from `inputSchema` on purpose.
  - Rationale: the `{ error }` discriminant widens the inferred union but the SDK accepts it because it serializes.
- `src/app/api/chat/route.ts` — build `const tools = buildInvoiceTools({ orgId: ctx.orgId })` per request, pass `tools` to `streamText`, and add `onStepFinish` writing `writeLlmStepEvent({ userId, orgId, toolCalls, finishReason, usage })` per step. `onFinish` is unchanged from Lesson 2; the token-accounting half of `onStepFinish` is added in Lesson 4. For the tool/loop primitives, link to lesson 1 of chapter 107 rather than re-explaining; for the scoped query helpers, link to chapter 062.

### Moment of truth

Run the lesson's test suite: `pnpm test chapter-108/lesson-3` (expected: all green, with assertions on the grounded count matching a hand-run query, the forged-`orgId` request still returning org A's data, the 5-step cap, and the `output-error` path).

Confirm by hand what the tests don't cover:

- [ ] Asking "what's our total paid this month?" returns a total matching the Drizzle aggregate run by hand in `psql`; the assistant text bubble cites it. (If the model answers without a `tool-getInvoiceStats` part, sharpen the system prompt — the prompt is the lever for instruction-following, not the code.)
- [ ] In the inspector's forge-orgId panel, injecting `orgId = B-uuid` still yields org A's numbers; flipping `MODEL_FROM_INPUT_ORGID` and repeating shows org B's numbers — the worst class of LLM-in-SaaS bug. Revert.
- [ ] The step-ceiling demo produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap; removing `stopWhen` and repeating shows the loop running to the SDK default. Revert.
- [ ] With "Force tool error" on, a stats question shows the `output-error` state and a rephrase prompt from the model, with no 500 in the network tab. Revert.
- [ ] After a multi-step conversation, the audit-events tail shows one `'llm.step'` row per step plus one `'llm.finish'` row, all scoped to the active org.

---

## Lesson 4 — The per-user daily token quota

Cap each user at 100,000 tokens per day so a single user cannot run up an unbounded model bill, refusing gracefully once the budget is spent.
When it works, the request that crosses the cap returns a typed 429 refusal instead of an answer, and the `/api/usage` endpoint reports today's used, cap, and remaining tokens.

### Your mission

This is the cost-cap discipline from lesson 2 of chapter 105 made concrete: a per-user-per-day token budget, enforced server-side, with a typed refusal the client can render.
The quota lives in `usage_quota_daily`, keyed by `(userId, day)`, and the daily reset is implicit — tomorrow's row is a fresh insert, so the seed's near-cap row for member-A blocks today but not tomorrow.
`reserveQuotaOrRefuse(userId)` runs *before* `streamText`, not after, to avoid the rare-but-real case where a user already over cap spends tokens on one more request; it ensures today's row exists (`INSERT ... ON CONFLICT DO NOTHING`), then `SELECT`s `tokens_used` and compares to `DAILY_TOKEN_CAP`, returning the canonical Result shape `{ ok: false, error: { code: 'quota_exceeded', userMessage } }` at the cap.
The actual increment happens as tokens are consumed, inside `onStepFinish` via `addUsage`, summing `usage.inputTokens + usage.outputTokens` (both optional on the v5 usage object — default to 0 with `??` so a partial usage report doesn't crash the route).
Name the trade-off the "reserve" naming hints at: this is a soft daily ceiling enforced as we go, so tokens consumed in the step that pushes a request over the cap are charged in arrears — acceptable for a 100k daily budget, but not for a hard rate limit.
Name the second trade: the two round-trips (`INSERT ... DO NOTHING` then `SELECT`) could be one `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, but readability wins here.
The course counts input and output tokens as a single sum; production often separates them because output tokens cost several times more — name the simplification.
The `/api/usage` endpoint is the read side the Lesson 5 panel will poll; it reuses `authedRoute('member')` so usage is per authenticated user.
The quota module and endpoint are the whole surface here; the rendered usage panel is out of scope and lands in Lesson 5.

- The request that crosses the 100,000-token cap returns HTTP 429 with `{ ok: false, error: { code: 'quota_exceeded', userMessage } }` (use the inspector's "Force quota to 99,500" then ask one small question).
- `GET /api/usage` returns today's `{ used, cap, remaining }` for the signed-in user.
- After a normal question, the inspector's usage counter ticks up by the actual token count for that conversation.
- A question with a long preamble increases the counter by more than a short question, because `onStepFinish` adds `usage.inputTokens + usage.outputTokens`.
- Yesterday's near-cap seed row does not block today's request, because the quota is keyed by `(userId, day)`.

### Coding time

Implement `src/lib/llm/quota.ts` and `src/app/api/usage/route.ts`, and wire the reservation and increment into `src/app/api/chat/route.ts`, against the brief and the tests, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/quota.ts` — `DAILY_TOKEN_CAP = 100_000`; `readUsage(userId)` (single `SELECT` returning `{ used, cap, remaining }`); `reserveQuotaOrRefuse(userId)` (ensure-row-then-compare, returning the typed refusal at cap); `addUsage(userId, tokens)` (`UPDATE ... SET tokens_used = tokens_used + $tokens, updatedAt = NOW()`). Signatures in the framing.
  - Rationale: the check-then-increment shape is a soft ceiling; pre-reserving a budgeted amount is the alternative some teams pick.
- `src/app/api/usage/route.ts` — `export const GET = authedRoute({ role: 'member', schema: z.object({}), fn: async ({ ctx }) => Response.json(await readUsage(ctx.user.id)) })`.
- `src/app/api/chat/route.ts` — at the top of `fn`, `const reserved = await reserveQuotaOrRefuse(ctx.user.id); if (!reserved.ok) return Response.json(reserved, { status: 429 });`. Inside the existing `onStepFinish`, add `await addUsage(ctx.user.id, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0))` alongside the step-audit write from Lesson 3.
  - Callout: `usage.inputTokens` / `usage.outputTokens` are optional on the v5 step usage object — `??` to 0.
  - For the canonical Result shape and Zod discipline, link to chapter 042 and lesson 2 of chapter 057.

### Moment of truth

Run the lesson's test suite: `pnpm test chapter-108/lesson-4` (expected: all green, with assertions on the 429 refusal shape at the cap, the `/api/usage` payload, and the counter incrementing by the input+output token sum).

Confirm by hand what the tests don't cover:

- [ ] With the inspector's "Force quota to 99,500" applied, asking one small question makes the next `POST /api/chat` return 429 with the `quota_exceeded` Result shape; no new `'llm.finish'` row appears (the model never ran).
- [ ] `GET /api/usage` returns `{ used, cap, remaining }` for the signed-in user.
- [ ] After re-seeding to clear the quota and asking one question, the inspector's usage counter ticks from 0 to the actual token count, and the audit payload's `usage.inputTokens + usage.outputTokens` matches the delta.
- [ ] Asking the same question with a long preamble increases the counter by more than the short question did.
- [ ] A quick `psql` check confirms the seed's "yesterday" near-cap row does not block today's request.

---

## Lesson 5 — Typed useChat, tool parts, and the usage panel

Replace the smoke-test client with the real chat UI: a typed `useChat` that renders text bubbles and invoice-stats cards across every tool-part state, plus a panel showing how much of today's token budget is left.
When it works, asking a question flashes a card-shaped skeleton, then renders the real numbers, then the assistant's text bubble — and the quota refusal surfaces as a friendly toast.

### Your mission

This lesson assembles the full client surface on top of the route, tool, and quota already in place, and the type contract is the whole point.
`useChat<InvoiceUIMessage>` carries the generic from `InferUITools` (lesson 2 of chapter 107), so `part.output` in the `tool-getInvoiceStats` branch is the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` shape, not `unknown`, and no `as` casts are needed — without the generic, every switch branch needs a cast.
Input state lives in a local `useState`, a v5 change from v4's auto-managed input (the TOC names this explicitly); the submit handler guards on `status === 'streaming' || status === 'submitted'` to prevent double-submits, the same in-flight gate `useTransition` provides in chapter 079.
The render walks `messages.map((m) => m.parts.map(…))` with a `switch` on `part.type`: a `text` part renders a bubble, a `tool-getInvoiceStats` part renders the stats card, and a `default` branch returns `null` so unknown or transient part types degrade gracefully (lesson 2 of chapter 107's "always have a default case").
The stats card switches on `part.state` across all four lifecycle states, and the `input-available` state renders a per-tool, card-shaped `<InvoiceStatsCard.Skeleton />` built from shadcn `<Skeleton />` primitives — not a generic `<Spinner />`. The skeleton's shape conveys what is coming; a 5-tool chat would have 5 skeletons, this one has one.
The usage panel polls `/api/usage` every 10s with a `setInterval` cleared on unmount, coloring the remaining-tokens bar by threshold; the 10s interval is the simple default for a personal-quota surface (a team-wide billing dashboard would need a sharper signal — name the alternatives once).
The quota refusal surfaces through `useChat`'s `onError`, which toasts a sanitized friendly message while the input stays enabled; rendering a distinct message for `quota_exceeded` by parsing the response body is a named refinement, not the default.
Resist persisting `messages` — the project is scoped to in-memory chat state, so a refresh loses the conversation; persistence is a named forward pointer.
The chat lives in the `/invoices` right rail because that is where the user reaches when answering "how many overdue?", co-located with the data it discusses, not on a separate `/chat` route — the co-location is the UX call.

- Asking "how many overdue invoices do we have?" moves `useChat`'s status `submitted` → `streaming` → `ready`, flashes a card-shaped skeleton during `input-available`, renders the real numbers, then an assistant text bubble citing the count.
- The loading skeleton is the per-tool `InvoiceStatsCard.Skeleton` (card layout with stat slots), with no generic `<Spinner />` anywhere in the chat tree.
- Hovering `part.output` in the `tool-getInvoiceStats` branch shows the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` type, not `unknown`, end-to-end via `InferUITools`.
- A `tool-getInvoiceStats` part in `output-error` renders the destructive-styled "I couldn't load those stats" message rather than a broken card.
- The usage panel reflects accumulated usage within its 10s poll window, coloring the bar by remaining budget.
- Triggering the quota refusal (inspector "Force quota to 99,500", then one small question) toasts the friendly message via `onError` while the input stays enabled.
- Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat`, because the status guard gates the submit.
- The chat is the v5 shape — `sendMessage`, `regenerate`, `message.parts`, locally managed input — with no `append`, `reload`, `message.content`, or `ai/rsc` anywhere.

### Coding time

Implement the full `src/app/(app)/invoices/invoice-chat.tsx`, `invoice-stats-card.tsx`, and `token-usage-panel.tsx`, and mount the panel in `/invoices/page.tsx`, against the brief and the tests, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `invoice-chat.tsx` — the typed `useChat<InvoiceUIMessage>({ api: '/api/chat', onError: (e) => toast.error('Something went wrong. Try again.') })` from the framing; local `useState` input; the `onSubmit` status guard; the `messages.map` / `parts.map` switch with `text`, `tool-getInvoiceStats`, and `default → null` branches; a "Thinking…" line while `status === 'submitted'`.
- `invoice-stats-card.tsx` — props typed via `InferUITools<InvoiceTools>['getInvoiceStats']`; switch on `state`: `input-streaming → null`, `input-available → <InvoiceStatsCard.Skeleton />`, `output-available →` the real card (title with optional filter hint, `count`, `totalAmount` currency-formatted, `byStatus` as a small dl, `oldestUnpaidDueDate` via Temporal with a "—" fallback on null), `output-error →` the destructive message.
  - Callout: the per-tool skeleton over a generic spinner is the lesson 2 of chapter 107 rule; the shape conveys what is coming.
- `token-usage-panel.tsx` — `useEffect` polling `/api/usage` every 10s via `setInterval` cleared on unmount; `useState<{ used; cap; remaining } | null>`; a bar colored by remaining (green > 50%, yellow 10–50%, red < 10%). Mount it in the `/invoices` right rail next to `<InvoiceChat />`.
  - Rationale: the 10s interval is the simple default; a server-sent usage signal or an `onFinish`-triggered re-poll are named refinements.
- For the typed `UIMessage` and parts protocol, link to lesson 2 of chapter 107 and lesson 3 of chapter 106 rather than re-explaining; for the in-flight guard, link to chapter 079.
- Forward pointers (named once, not built): persisting `messages` on mount/`onFinish` for future surfaces; chapter 080's user/operator message split; chapter 082's security-baseline audit reaching for the `authedRoute` wrap and the closure-`orgId` rule; Unit 18's integration tests mocking the model via `MockLanguageModelV2` with the tool's `execute` unit-testable as a plain function; chapter 092's `llm_audit_events` as the operator-truth side; Unit 14's "90% of quota" notification through the dispatcher; lesson 3 of chapter 107's RAG as the next reach when questions outgrow aggregate tools.

### Moment of truth

Run the lesson's test suite: `pnpm test chapter-108/lesson-5` (expected: all green, with assertions on the rendered tool-part states, the typed `part.output`, the double-submit guard, and the v5-shape / no-`ai/rsc` checks).

Confirm by hand what the tests don't cover:

- [ ] Signed in as member-A, asking "how many overdue invoices do we have?" moves status `submitted` → `streaming` → `ready`, flashes the `InvoiceStatsCard.Skeleton` during `input-available`, renders the real card, then an assistant text bubble citing the count.
- [ ] A grep for `<Spinner` finds none in the chat tree; the loading shape is the per-tool skeleton.
- [ ] Hovering `part.output` in the `tool-getInvoiceStats` branch shows the projected shape, not `unknown`; `invoice-stats-card.tsx` props are typed from the same source.
- [ ] With "Force tool error" on, the card renders the destructive `output-error` message and the model's follow-up asks for a rephrase.
- [ ] The usage panel ticks up within 10s of a question and colors the bar by remaining budget.
- [ ] With "Force quota to 99,500" applied, one small question toasts the friendly message via `onError` and leaves the input enabled.
- [ ] Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat` in the network tab.
- [ ] Switching to member-B in org B and asking the same question reflects org B's counts, with the audit row's `orgId` set to B — the `tenantDb(ctx.orgId).invoices.active()` inside `execute` is the structural reason.
- [ ] Grep confirms the v5 shape and the seam: no `append(`, `reload(`, `message.content`, `ai/rsc`, or `streamUI`; hits for `sendMessage(`, `regenerate(`, `message.parts`; the only importers of `@/lib/llm/` are the two route handlers and `invoice-chat.tsx` (for the message type), with no Server Component importing the tools or the prompt.
