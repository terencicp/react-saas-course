# Chapter 112 — Project: Ask-your-invoices chat with tool calling

## Chapter framing

Chapter 112 cashes in chapter 109's "when LLMs earn their weight" framing, chapter 110's `streamText` + `useChat` + `UIMessage` parts protocol, and chapter 111's tool-calling, agentic-loop, and tool-parts rendering as one runnable "Ask the invoices" chat surface sitting on top of the Unit chapter 066 customers + invoices project. The student builds a `POST /api/chat/route.ts` route handler that wraps `authedRoute('member', …)`, runs `streamText` with `stopWhen(stepCountIs(5))` over a Zod-defined `getInvoiceStats` tool whose `execute` queries `tenantDb(orgId).invoices.active()` and projects a minimal aggregate shape back to the model, plus a typed `useChat` client component that renders text parts and `tool-getInvoiceStats` parts (`input-streaming` / `input-available` / `output-available` / `output-error`) with per-state UX. A `usage_quota_daily` table tracks per-user-per-day token usage incremented inside `onStepFinish` against a 100k-token daily cap, with the 101st request returning a typed `quota_exceeded` refusal. Each build slice closes on a runnable state: lesson 3 of chapter 112 ends with the route handler streaming text-only answers under `authedRoute` and the agentic loop capped at 5 steps; lesson 4 of chapter 112 ends with `getInvoiceStats` callable end-to-end and the daily quota enforced server-side; lesson 5 of chapter 112 ends with the client rendering text and tool parts with per-state skeletons and a live token-usage panel; lesson 6 of chapter 112 walks the "Done when" clause-by-clause.

Threads through every lesson: **tools are the only doorway from the model into app state** — the LLM never sees a DB connection, the `orgId`, or a row it isn't allowed to see; every Drizzle read happens inside the tool's `execute` under the same `authedRoute('member', …)` wrapper that runs the route, with `session.orgId` from context (never from the model's tool-call arguments — the model is treated as untrusted input); **the agentic loop is server-owned via `stopWhen`** — `stepCountIs(5)` is the explicit cap, no client-side `maxSteps`; **Zod is the single contract** — `inputSchema` on the tool, `outputSchema` projecting the minimal aggregate shape, the same Zod 4 discipline as chapter 046 and chapter 061; **token accounting is a first-class seam** — `onStepFinish` increments the daily counter atomically per step, `onFinish` writes a single audit-log entry, the panel polls the counter; **the client is a typed `useChat` with `InferUITools<typeof tools>`** — `message.parts.map` switches on `part.type` and `part.state`, no `ai/rsc`, no raw JSON renders; **the surface refuses gracefully** — quota overruns, forged tool args, and tool errors all return typed refusal shapes the model can read or the UI can render, never thrown 500s; **everything composes with prior units** — the Drizzle reads ride chapter 066's scoped query helpers, the tenancy enforcement rides chapter 061's `authedRoute`, the audit writes ride lesson 5 of chapter 061's `logAudit`, the env wiring rides the type-safe `env` from Unit 8.

### Dependency carry-in

- **From chapter 066:** `app/(app)/invoices/page.tsx` and `app/(app)/customers/page.tsx`, the `invoices` table with `deletedAt` / `archivedAt` / `version` columns, the `invoiceScope(orgId)` helper exposing `.active() / .archived() / .includingDeleted()`, `listInvoices` in `src/lib/invoices/queries.ts`, the seeded dataset (two orgs, 60+ invoices each, statuses across `draft` / `sent` / `paid` / `overdue`).
- **From chapter 061:** `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts`, `authedAction` for any non-streaming action, `requireOrgUser` returning `{ user, orgId, role }`, the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage, …} }`, `logAudit(tx, event)`.
- **From chapter 060:** `tenantDb(orgId)` as the only doorway into tenant-owned tables.
- **From chapter 046 / chapter 047:** Zod 4 (`z.strictObject`, `z.infer`, `z.flattenError`).
- **From chapter 109:** the cost-cap discipline (per-user-per-day token quota, abuse mitigation as the user-facing-LLM rule); the provider-abstraction reflex behind `lib/llm/models.ts`.
- **From chapter 110:** `streamText`, `toUIMessageStreamResponse`, `convertToModelMessages`, the `UIMessage` parts protocol, `useChat<MyUIMessage>` with manually managed input state, `sendMessage` and `regenerate`, the `onFinish` audit seam, `onError` returning sanitized messages, the system-prompt-as-controller posture, the `lib/llm/prompts.ts` registry convention.
- **From lesson 1 of chapter 111:** `tool({ description, inputSchema, execute, outputSchema })`, `execute` running server-side under the route's auth context, `stopWhen(stepCountIs(n))` as the default loop control, `onStepFinish` for per-step audit and quota, the "return don't throw" error pattern inside `execute`, projecting minimal results back to the model.
- **From lesson 2 of chapter 111:** the typed `UIMessage` via `InferUITools<typeof tools>`, the `lib/llm/tools.ts` registry convention, the four part states and per-tool skeletons, the parts-array rendering pattern.
- **From 8.x (env):** the type-safe `env` module (`@t3-oss/env-nextjs`) with `OPENAI_API_KEY` added.

### Starter file tree (stubs marked with TODO)

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
    schema.ts                     # provided: chapter 066 schema + usage_quota_daily,
                                  #           llm_audit_events tables
    client.ts                     # provided
  env.ts                          # provided: type-safe env, OPENAI_API_KEY entry
  lib/
    tenant-db.ts                  # provided (chapter 060)
    authed-route.ts               # provided (lesson 3 of chapter 061)
    authed-action.ts              # provided (lesson 2 of chapter 061)
    audit-log.ts                  # provided
    invoices/
      scoped-query.ts             # provided (chapter 066): invoiceScope(orgId)
      queries.ts                  # provided (chapter 066): listInvoices, etc.
    llm/
      models.ts                   # provided (lesson 3 of chapter 109): chatModel = openai('gpt-chapter 021-mini')
      prompts.ts                  # TODO: invoiceQAPrompt — system prompt
                                  #       enforcing tool-grounded answers, refusing
                                  #       speculation, and the org-scope rule
      tools.ts                    # TODO: getInvoiceStats tool with inputSchema
                                  #       + outputSchema; closure over orgId
      quota.ts                    # TODO: checkAndReserveQuota(userId), addUsage,
                                  #       readUsage — DAILY_TOKEN_CAP = 100_000
      audit.ts                    # TODO: writeLlmStepEvent, writeLlmFinishEvent
                                  #       (direct inserts into llm_audit_events; same audit-log
                                  #        discipline as lesson 5 of chapter 061's logAudit but against the LLM
                                  #        events table)
  app/
    (app)/
      invoices/
        page.tsx                  # provided (chapter 066) + <InvoiceChat /> mounted in
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

Single Server Component at `/inspector`, the verification surface. The chat surface itself lives on `/invoices`; the inspector mirrors state and offers the destructive verification toggles.

- **Header:** session-user switcher (admin-A / member-A / admin-B / member-B), org switcher (orgs A and B with disjoint invoices).
- **Usage counter panel:** live read of `usage_quota_daily` for the selected user — `tokens_used / DAILY_TOKEN_CAP`, last update time. Updates within the 10 s poll window.
- **"Force quota to 99,500" button:** raw `UPDATE usage_quota_daily SET tokens_used = 99500 WHERE userId = :u AND day = current_date` so the next request crosses the cap deterministically.
- **"Force tool error" toggle:** sets a server flag making the next `getInvoiceStats.execute` return `{ error: 'stats_unavailable' }` instead of running the query — verifies the tool's "return don't throw" path and the `output-error` render.
- **"Forge orgId — replay against org B" button:** opens a sandbox panel where the student crafts a tool-call payload with `orgId` injected into the input shape (not in the schema, but the model is allowed to invent inputs); confirms the tool ignores the forged value because `orgId` comes from the closure, not the model's input.
- **"Step ceiling demo" button:** sends a deliberately under-specified question that makes the model retry tool calls; confirms the loop stops at step 5 with `finish_reason: 'stop'` and a final assistant message acknowledging the cap.
- **`llm_audit_events` tail:** last 20 events with `event`, `usage`, `finishReason`, `toolCalls`. Updates after every conversation.
- **Conversation transcript panel:** raw `UIMessage[]` of the last conversation, JSON-formatted — verifies what the client actually sends and renders.
- **Two debug flags behind toggles for the verify lesson:** `BYPASS_AUTHED_ROUTE` (sets `ctx.user` / `ctx.orgId` to the inspector's selected user without checking the session — proves the route refuses with 401 when reverted), `MODEL_FROM_INPUT_ORGID` (changes `buildInvoiceTools` to read `orgId` from the model's tool-call input — proves the cross-tenant leak when reverted).

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Typing a question about the user's invoices streams a grounded answer | Sign in as member-A in org A. Ask "how many overdue invoices do we have?". Watch `useChat`'s `status` move `submitted` → `streaming` → `ready`. Inspector transcript shows a `tool-getInvoiceStats` part with `state: 'output-available'` and an `output.count` matching `SELECT COUNT(*) FROM invoices WHERE organizationId = A AND status='overdue' AND deletedAt IS NULL AND archivedAt IS NULL` run by hand. The assistant text bubble cites that number. |
| Answers cite numbers the database actually holds | Repeat with "what's our total paid this month?". Run the equivalent Drizzle aggregate by hand against the seed. Numbers match. The system prompt forces tool-grounding — answers without a `tool-getInvoiceStats` part are an instruction-tuning bug, not a code bug; if it happens, sharpen the prompt. |
| A forged `orgId` is refused | Inspector "Forge orgId" panel: craft a message that asks the model to "use orgId = B-uuid". Send. Confirm: (a) the model's tool call's input has no `orgId` field (schema doesn't allow it), or (b) the tool ignores any extra fields the model invented because `execute` closes over `ctx.orgId` from `authedRoute`. The output reflects org A's data, not B's. Then flip `MODEL_FROM_INPUT_ORGID` — repeat — observe the cross-tenant leak (output shows org B numbers). Revert. |
| The 101st question hits the quota | Inspector "Force quota to 99,500". Ask one small question; quota crosses cap mid-stream or on the next request. The next call to `POST /api/chat` returns 429 with `{ ok: false, error: { code: 'quota_exceeded', userMessage } }`. The `useChat` `onError` toasts the user message; the input remains enabled for tomorrow. |
| `stopWhen(stepCountIs(5))` caps the loop | Inspector "Step ceiling demo": send a recursion-prone prompt. Watch transcript — at most 5 tool calls in the message's parts array. Final message has a text part explaining the cap. Then deliberately remove `stopWhen` from the route — same prompt — observe the loop running to the SDK default `stepCountIs(20)`. Revert. |
| Tools run server-side under `authedRoute` | Flip `BYPASS_AUTHED_ROUTE` OFF; clear the session cookie; send a request directly via `curl`/devtools — 401 from `authedRoute`. The model never ran. Restore session, repeat — works. Confirm `route.ts` opens with `authedRoute({ role: 'member', ... })`, not with raw `streamText`. |
| Tool errors return, do not throw | Inspector "Force tool error" ON. Ask a stats question. Stream shows `tool-getInvoiceStats` part transitions to `state: 'output-error'`; `InvoiceStatsCard` renders the destructive-styled "I couldn't load those stats" message. The model then reads the error and responds with a text bubble asking the user to rephrase. No 500 in the network tab. |
| Per-tool skeleton, not a generic spinner | Watch a slow tool call (the seed includes one large org for this). During `state: 'input-available'`, the `InvoiceStatsCard.Skeleton` renders (card layout, stat slots, shimmer in the right shape). Confirm there is no fallback `<Spinner />` anywhere in the chat tree. |
| Token-usage panel reflects accumulated usage | Open `/invoices`. Note panel reads `used: 0/100,000`. Ask one question. Panel updates within 10 s, showing the actual token count from the OpenAI usage report. Audit-log tail shows one `'llm.finish'` event and 1-2 `'llm.step'` events (one for the tool-call step, one for the synthesis step). |
| Quota counts both input and output tokens | Ask a small question; record panel delta. Ask the same question with a long preamble; the delta is larger. Confirm in `onStepFinish` that `usage.inputTokens + usage.outputTokens` is what `addUsage` receives. The audit row's payload mirrors this. |
| Typed `UIMessage` shows tool-output types at the call site | In `invoice-chat.tsx`, hover over `part.output` inside the `case 'tool-getInvoiceStats'` branch; IDE shows `{ count: number; totalAmount: number; byStatus: Record<string,number>; oldestUnpaidDueDate: string \| null }`, not `unknown`. The `InvoiceUIMessage` derived via `InferUITools` carries the contract. |
| `useChat` v5 shape, not v4 | Grep for `append(`, `reload(`, `message.content`. No hits. Hits for `sendMessage(`, `regenerate(`, `message.parts`. Input state lives in a local `useState`, not in the hook's return. |
| No `ai/rsc` import anywhere | Grep `ai/rsc`. No hits. The generative UI is the tool-parts path. |
| `lib/llm` is the only seam | Grep `from '@/lib/llm/'`. Importers are `app/api/chat/route.ts`, `app/api/usage/route.ts`, `invoice-chat.tsx` (for the message type only). No Server Component imports the tools or the prompt. |
| Audit events written on every conversation | After 5 conversations: `llm_audit_events` has 5 `'llm.finish'` rows; step-event rows match the sum of tool-calling steps. The payload includes `finishReason`, `usage`, and the tool-call summaries. |
| The chat is org-scoped through the active org | Switch session to member-B in org B. The right-rail chat is the same UI; ask "how many overdue?" — answer reflects org B counts. Audit row's `orgId` is B's. The `tenantDb(ctx.orgId).invoices.active()` inside the tool is the structural reason. |

### Concepts demonstrated → owning lesson

- `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse` — lesson 1 of chapter 110, lesson 3 of chapter 110.
- `useChat<MyUIMessage>`, `sendMessage`, `regenerate`, manually managed input state, the parts protocol — lesson 3 of chapter 110.
- `tool({ description, inputSchema, execute, outputSchema })`, `execute` server-side under auth — lesson 1 of chapter 111.
- `stopWhen(stepCountIs(n))`, the agentic loop, the server-side cap — lesson 1 of chapter 111.
- `onStepFinish` for per-step quota/audit accounting, `onFinish` for aggregate audit — lesson 1 of chapter 111 + lesson 1 of chapter 110.
- Tool-result projection (return aggregates, not raw rows) — lesson 1 of chapter 111.
- "Return don't throw" error pattern inside `execute` — lesson 1 of chapter 111.
- Tool-part lifecycle (`input-streaming` / `input-available` / `output-available` / `output-error`), per-tool skeleton — lesson 2 of chapter 111.
- `InferUITools<typeof tools>` and the typed `UIMessage` — lesson 2 of chapter 111.
- The `lib/llm/{models,prompts,tools}.ts` registry convention — lesson 3 of chapter 109 + lesson 1 of chapter 110 + lesson 2 of chapter 111.
- Per-user daily token quota, abuse mitigation, cost accounting — lesson 2 of chapter 109.
- System-prompt-as-controller, refusing speculation, force-tool-grounding — lesson 1 of chapter 110.
- `authedRoute(role, schema, fn)` wrapping the streaming handler — lesson 3 of chapter 061.
- `tenantDb(orgId)` and `invoiceScope(orgId).active()` inside the tool — lesson 2 of chapter 060 + chapter 066.
- Zod 4 `strictObject`, `z.infer`, canonical Result shape — chapter 046 + lesson 2 of chapter 061.
- `logAudit(tx, event)` inside `onStepFinish` / `onFinish` — lesson 5 of chapter 061.
- Type-safe `env` for `OPENAI_API_KEY` — 8.x.

---

## Lesson 1 — Project brief

Frames the build: a right-rail chat on `/invoices` powered by `streamText`, a single org-scoped `getInvoiceStats` tool, a 5-step `stopWhen` cap, and a per-user daily token quota with typed refusals.

Goals:

- Frame the build: a chat surface mounted in the right-rail of `/invoices` where the user types questions about their org's invoices and a tool-calling LLM answers grounded in real Drizzle data. The route handler is `POST /api/chat` wrapped in `authedRoute('member', …)`, streams `streamText` with a 5-step `stopWhen`, exposes a single tool `getInvoiceStats` whose `execute` closes over `ctx.orgId` from the session, and tracks per-user-per-day token usage with a 100k cap and a typed refusal on overrun. The client uses `useChat<InvoiceUIMessage>` and renders text parts plus `tool-getInvoiceStats` parts across the four lifecycle states. A token-usage panel shows used/remaining.
- State the "Done when" in one paragraph: grounded answers stream and cite real Drizzle numbers; forged `orgId` arguments are refused because the tool reads `orgId` from the closure, not the model; the 101st question of the day hits the quota and surfaces a typed refusal; the loop caps at 5 steps; tools never throw, they return typed errors the model and UI can render.
- Scope cuts: no `generateObject` / `streamObject` here (taught in lesson 2 of chapter 110); no `ai/rsc` / `streamUI` (named once as the experimental alternative in lesson 2 of chapter 111); no embeddings or RAG (out of scope — lesson 3 of chapter 111's lesson stays the reference); no destructive tools (propose-then-confirm pattern named in lesson 2 of chapter 111 stays a reference); no multi-modal inputs; no persisted conversation history (`useChat` keeps it in component state — refresh loses; persistence pattern named at the end as a forward pointer); no provider-swap demo (the model is fixed via `lib/llm/models.ts`); no human-in-the-loop confirmation; no E2E test against a real OpenAI call (deferred to the team's CI strategy).
- Senior payoff: the canonical 2026 shape for any LLM-backed SaaS surface — `authedRoute` wrapping `streamText`, tools as the only doorway to state, the loop server-capped, per-user quotas at `onStepFinish`, typed messages, per-tool skeletons. Future LLM surfaces in the codebase (a customer-support assistant on the invoices, an onboarding helper on settings) reuse this skeleton with a different tool registry and a different prompt.
- Show the end UX: a capture of the right-rail chat — question typed, tool-part skeleton flashes, output card renders, assistant text bubble cites the number, usage panel ticks up.
- Link the starter via `degit`.

Senior calls and watch-outs:

- Starter ships chapter 066 end-to-end plus the AI SDK packages, `OPENAI_API_KEY` env entry, the two new tables (`usage_quota_daily`, `llm_audit_events`), the provided model registry, the inspector, and every UI shell. Every change lives under `src/lib/llm/`, `src/app/api/chat/`, `src/app/api/usage/`, and three client components in `src/app/(app)/invoices/`.
- The TOC's three-build split is preserved because each closes on a runnable state: lesson 3 of chapter 112 ends with the route streaming text-only answers under auth; lesson 4 of chapter 112 ends with the tool callable and quotas live; lesson 5 of chapter 112 ends with the client rendering parts and the usage panel.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded; `/invoices` renders the chapter 066 list with an empty right-rail chat shell (input disabled); `/inspector` loads with usage at 0, audit-log empty, no events.

Estimated student time: 10 to 15 minutes.

---

## Lesson 2 — Starter walkthrough

Tours the starter file tree, the provided `lib/llm/models.ts`, the `usage_quota_daily` and `llm_audit_events` tables, and the inspector's verification toggles before any code is written.

Goals:

- Walk the file tree, calling out provided vs. stubbed. The student writes seven files: `src/lib/llm/prompts.ts`, `tools.ts`, `quota.ts`, `audit.ts`, `app/api/chat/route.ts`, `app/api/usage/route.ts`, plus the three client components (`invoice-chat.tsx`, `invoice-stats-card.tsx`, `token-usage-panel.tsx`).
- Read `src/lib/llm/models.ts` (provided): one export, `chatModel = openai('gpt-chapter 021-mini')`. The lesson notes that swapping providers is a one-line change here — provider-abstraction discipline from lesson 3 of chapter 109.
- Read `src/env.ts` (provided): `OPENAI_API_KEY` is `z.string().min(1)`, server-only. Course's type-safe env pattern.
- Read `db/schema.ts` for the new tables: `usage_quota_daily` (composite pk on `(userId, day)`, `tokensUsed` int, `updatedAt`), `llm_audit_events` (event enum `'llm.step' | 'llm.finish'`, jsonb payload). Both tables ship in the migration that's already run.
- Read the inspector end-to-end — usage counter, audit-events tail, conversation transcript panel, force-quota button, force-tool-error toggle, forge-orgId panel, step-ceiling demo button, two debug flags behind toggles (`BYPASS_AUTHED_ROUTE`, `MODEL_FROM_INPUT_ORGID`) for the verify lesson.
- Read `app/(app)/invoices/page.tsx`: the chapter 066 list view, plus a new right-rail slot rendering `<InvoiceChat />`. The slot is a shell pointing at an unwritten component.
- Read `package.json`: `ai@^5`, `@ai-sdk/openai`, `@ai-sdk/react`. Note the v5 import paths.
- Read `next.config.ts`: `cacheComponents: true` from chapter 066. The chat surface is fully client-side and won't interact with Cache Components; the streaming route handler is dynamic by definition.
- Run the app: `/invoices` renders the seeded list and the empty chat shell; `/api/chat` returns 405 (no POST defined); `/api/usage` returns 405; `/inspector` works.

Senior calls and watch-outs:

- `src/lib/llm/` is feature-shaped (Architectural Principle #4). `models.ts` lives there because the provider is a primitive shared across this and future LLM surfaces; `prompts.ts`, `tools.ts`, `quota.ts`, `audit.ts` are the per-feature seams.
- Seven student files plus three client components is the entire build surface. The chapter 066 list, the schema, and the auth wrappers don't change.
- The seeded `usage_quota_daily` row for member-A at 90,000 tokens is the surface the verify lesson exercises — a few small questions cross the cap deterministically without spending real money.
- Note that the route file is `app/api/chat/route.ts`, not a Server Action. Streaming responses are route handlers; the `authedRoute` wrapper from lesson 3 of chapter 061 is the variant of `authedAction` adapted to `Request`/`Response` shapes.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, the chat right-rail confirmed present but unwired. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 3 — Streaming route under auth with the agentic loop

Wraps `streamText` in `authedRoute('member', …)` with `stopWhen(stepCountIs(5))`, the tool-grounded system prompt, `convertToModelMessages`, `toUIMessageStreamResponse`, and an `onFinish` audit write.

Goals:

- Fill `src/lib/llm/prompts.ts`: a single export `invoiceQAPrompt({ orgName })` returning the system prompt string. Three load-bearing lines: enforce tool-grounding ("Always call getInvoiceStats before stating numeric facts"), refuse cross-org questions, define error behavior ("If a tool returns { error }, explain and ask the user to rephrase"). The prompt is the controller (lesson 1 of chapter 110's posture); user messages are untrusted input.
- Fill `src/lib/llm/audit.ts`: two direct inserts into `llm_audit_events` that mirror the audit-log discipline from lesson 5 of chapter 061's `logAudit` (one row per event, no off-transaction writes); the table differs from `auditLogs` so these aren't `logAudit` wrappers: `writeLlmStepEvent({ userId, orgId, toolCalls, finishReason, usage })` and `writeLlmFinishEvent({ userId, orgId, finishReason, usage })`. Both insert into `llm_audit_events`. Each wrapper opens a one-statement `tenantDb(ctx.orgId).transaction(async (tx) => logAudit(tx, { ... }))` — `logAudit`'s signature from lesson 5 of chapter 061 requires a `tx` so off-transaction calls don't typecheck. The route handler itself isn't transactional; the wrapper supplies the bounded one-row transaction the signature demands.
- Fill `src/app/api/chat/route.ts`. The full shape:
  - `export const POST = authedRoute({ role: 'member', schema: z.strictObject({ messages: z.array(z.unknown()) }), fn: async ({ ctx, input }) => { … } })`.
  - The input schema accepts an untyped messages array — full type validation happens inside via `convertToModelMessages`. Note the senior trade: validating the full `UIMessage` shape with Zod is heavy; the SDK's converter does the job.
  - Inside `fn`, no tools yet — wire `getInvoiceStats` in lesson 4 of chapter 112. The `authedRoute` context (per lesson 3 of chapter 061) contains `{ user, orgId, role, db }` but no display-name field, so fetch the org name with a one-line lookup before the stream: `const { name: orgName } = await ctx.db.query.organization.findFirst({ where: eq(organization.id, ctx.orgId) })`. For this lesson the route then exposes `streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), stopWhen: stepCountIs(5), onFinish: async ({ usage, finishReason }) => await writeLlmFinishEvent({ userId: ctx.user.id, orgId: ctx.orgId, finishReason, usage }), onError: ({ error }) => { /* sanitized log */ } })`.
  - Return `result.toUIMessageStreamResponse()`.
- Wire a minimal client probe to verify the route. Edit `invoice-chat.tsx` to a temporary smoke-test shape: `useChat<InvoiceUIMessage>({ api: '/api/chat' })`, a textarea bound to a local `useState`, and a Submit that calls `sendMessage({ text: input })`. Render messages as raw text (parts loop comes in lesson 5 of chapter 112). The full client lands in lesson 5 of chapter 112; this lesson's runnable state is "route streams something".
- Run the app: type a question like "tell me a joke about invoices". The model responds (text-only — no tools wired). Audit-log tail shows one `'llm.finish'` event with `finishReason: 'stop'`. The 5-step cap is set but not exercised yet (no tools to call). Confirm signed-out access returns 401 from `authedRoute`.

Senior calls and watch-outs:

- `authedRoute` is the load-bearing wrapper. Mis-wiring (calling `streamText` directly from an unwrapped `POST`) is the canonical bug class — the chat would respond to any anonymous caller, burn tokens, and have no `orgId`. Verify lesson exercises the bypass-then-revert pattern.
- `stopWhen(stepCountIs(5))` is set before tools land because the senior reflex is "cap first, then add capability" — adding tools without the cap creates a runaway-loop window. The default SDK cap (`stepCountIs(20)`) is too loose for a SaaS surface with a per-user cost ceiling.
- `convertToModelMessages` is required in v5. The model takes `ModelMessage[]` (a wire shape); the client sends `UIMessage[]` (a rendering shape). Skipping the converter is a v5-onboarding bug — surface it once at the call site.
- `toUIMessageStreamResponse()` is what makes the response a proper SSE stream the client's `useChat` understands. Not `result.toTextStreamResponse()` (a different protocol). Name once.
- `onError` returns a sanitized log; the client's `useChat` `onError` will toast a friendly message — do not leak raw errors. The chapter 110 pattern repeated.
- The audit write at `onFinish` is the aggregate event. Per-step audit lands in lesson 4 of chapter 112 once tools are wired.

Codebase state at entry: empty `lib/llm/prompts.ts`, `lib/llm/audit.ts`, empty `app/api/chat/route.ts` shell, smoke-test client.
Codebase state at exit: route handler streams text-only answers under `authedRoute('member')`, capped at 5 steps, with `onFinish` writing an audit event. Smoke-test client confirms the SSE stream. **Runnable — chat streams an answer to any question, no tools yet, no quotas yet, 401 for unauthenticated callers.**

Estimated student time: 50 to 60 minutes.

---

## Lesson 4 — Tool with closure-scoped tenancy and the daily quota

Defines `getInvoiceStats` with a closure over `ctx.orgId` (never input), aggregate `outputSchema`, "return don't throw" errors, and wires `reserveQuotaOrRefuse` plus `onStepFinish` token accounting against a 100k daily cap.

Goals:

- Fill `src/lib/llm/quota.ts`. Three exports:
  - `DAILY_TOKEN_CAP = 100_000` — sized so a typical chat session stays under, deliberate misuse trips quickly.
  - `readUsage(userId)` — single `SELECT` returning `{ used, cap, remaining }`. Used by `/api/usage` and the panel.
  - `reserveQuotaOrRefuse(userId)` — `INSERT ... ON CONFLICT (userId, day) DO NOTHING` to ensure today's row exists, then `SELECT tokens_used` and compare to cap. Returns `{ ok: true }` or `{ ok: false, error: { code: 'quota_exceeded', userMessage: 'You\'ve reached today\'s usage limit. Try again tomorrow.' } }`. The naming "reserve" hints at the lifecycle: a check runs before the model spins up; the actual increment runs inside `onStepFinish` as tokens are consumed. Some teams pre-reserve a budgeted amount; the simpler shape here is "check first, increment as we go" — name the trade-off and accept it.
  - `addUsage(userId, tokens)` — `UPDATE ... SET tokens_used = tokens_used + $tokens, updatedAt = NOW()`.
- Fill `src/app/api/usage/route.ts`: `export const GET = authedRoute({ role: 'member', schema: z.object({}), fn: async ({ ctx }) => Response.json(await readUsage(ctx.user.id)) })`.
- Fill `src/lib/llm/tools.ts`. The factory shape:
  - `export const buildInvoiceTools = (ctx: { orgId: string }) => ({ getInvoiceStats: tool({ description: '…', inputSchema: z.strictObject({ status: z.enum([…]).optional(), since: z.string().date().optional() }), outputSchema: z.strictObject({ count: z.number().int(), totalAmount: z.number(), byStatus: z.record(z.string(), z.number().int()), oldestUnpaidDueDate: z.string().date().nullable() }), execute: async (input) => { try { /* call invoiceScope(ctx.orgId).active() with optional status + since filters; aggregate via Drizzle; return projected shape */ } catch (e) { return { error: 'stats_unavailable' as const } } } }) })`.
  - The closure over `ctx.orgId` is the load-bearing pattern: `orgId` is **never** in the tool's `inputSchema`. The model cannot pass it; the model cannot fake it; the model cannot ask for another org's data. The senior rule from lesson 1 of chapter 111 made structural.
  - `outputSchema` projects an aggregate, not raw rows. A `count`, a `totalAmount`, a `byStatus` map, and a single date. This is the "return minimal" discipline from lesson 1 of chapter 111 — feeding raw rows back to the model would compound input tokens across loop steps.
  - `try/catch` returns `{ error: 'stats_unavailable' as const }` on database failure. Inferred into the union type via the `error` discriminant — the type widens but the SDK accepts it as long as it serializes.
  - Export the type: `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>; export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>;`. The client component will import only the message type.
- Wire the tool and quota into the route. Update `app/api/chat/route.ts`:
  - At the top of `fn`, call `const reserved = await reserveQuotaOrRefuse(ctx.user.id); if (!reserved.ok) return Response.json(reserved, { status: 429 });`. The check fires before the model spins up.
  - Build the tools per request: `const tools = buildInvoiceTools({ orgId: ctx.orgId });`.
  - Pass `tools` to `streamText`.
  - Add `onStepFinish: async ({ usage, toolCalls, toolResults, finishReason }) => { await addUsage(ctx.user.id, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)); await writeLlmStepEvent({ userId: ctx.user.id, orgId: ctx.orgId, toolCalls, finishReason, usage }) }`.
  - `onFinish` unchanged from lesson 3 of chapter 112.
- Run the app. Smoke-test client still in place. Ask "how many overdue invoices do we have?". Network shows the SSE stream; the audit-log tail shows two events (one `'llm.step'` for the tool-call step, one `'llm.finish'`). Inspector usage counter ticks up by the actual token count. `/api/usage` returns `{ used, cap, remaining }`. Inspector "Force quota to 99,500" then asking a small question — the next request returns 429.

Senior calls and watch-outs:

- The closure-over-`orgId` rule is the most important line in the project. Naming it twice — at the factory definition and at the audit-events panel demonstration — is intentional. The inspector's `MODEL_FROM_INPUT_ORGID` debug flag exists precisely to make the cross-tenant leak visible when reverted; verify lesson exercises this.
- `reserveQuotaOrRefuse` runs *before* `streamText` to avoid the rare-but-real case where the user is already over cap and a single small request would still spend tokens. The increment in `onStepFinish` happens as tokens are consumed. The trade-off: tokens consumed in the last step of a request that pushes over the cap are charged in arrears (the cap is a soft ceiling enforced after the request completes). Acceptable for a daily cap with a 100k budget; would not be acceptable for a hard rate limit.
- `INSERT ... ON CONFLICT DO NOTHING` to ensure today's row, then `SELECT` to compare, is two round-trips. A single `INSERT … ON CONFLICT DO UPDATE … RETURNING` would be one round-trip but cute; readability wins here. Name the trade.
- "Return don't throw" inside `execute` is the lesson 1 of chapter 111 rule. The `try/catch` wraps the Drizzle call; programmer errors (bad Drizzle types, undefined references) still bubble — those are bugs, not user-facing failures.
- `inputSchema` uses `z.strictObject` and `z.enum`. The model's tool call is validated by the SDK before `execute` runs. An invalid arg (model invents a status outside the enum) becomes a `output-error` part the model can read and react to.
- The aggregate projection means the model never sees individual invoice IDs, amounts, or customer names. The senior reflex against accidental data exposure: project at the tool boundary, not at the rendering boundary.
- `usage.inputTokens` and `usage.outputTokens` are optional on the v5 step usage object; default to 0 with `??`. The route shouldn't crash on a partial usage report.
- `writeLlmStepEvent` writes one row per step. A 3-step loop produces 3 step events plus 1 finish event. The audit-log tail tracks this for the verify pass.

Codebase state at entry: route handler streams text-only answers, no tools, no quota.
Codebase state at exit: `getInvoiceStats` tool callable end-to-end with org-scoped authz inside `execute`; quota check pre-stream, per-step increment, 429 refusal on overrun; `/api/usage` endpoint serving the panel. Smoke-test client still renders raw text. **Runnable — chat answers grounded questions with real Drizzle numbers, usage panel data available, 429 on overrun.**

Estimated student time: 60 to 75 minutes. The chapter's heaviest lesson.

---

## Lesson 5 — Typed useChat, tool parts, and the usage panel

Builds the client: `useChat<InvoiceUIMessage>` with manually managed input state, a parts-switch rendering text bubbles and `tool-getInvoiceStats` cards across all four lifecycle states with a per-tool skeleton, plus a 10s-polling token-usage panel.

Goals:

- Replace the smoke-test `invoice-chat.tsx` with the full typed component. `'use client';`
  - `import { useChat } from '@ai-sdk/react'; import type { InvoiceUIMessage } from '@/lib/llm/tools';`
  - `const { messages, sendMessage, status } = useChat<InvoiceUIMessage>({ api: '/api/chat', onError: (e) => toast.error('Something went wrong. Try again.') });`
  - `const [input, setInput] = useState('');` — manually managed input state (v5 dropped the hook's auto-managed input).
  - Form submit: `const onSubmit = (e) => { e.preventDefault(); if (status === 'streaming' || status === 'submitted' || !input.trim()) return; const text = input; setInput(''); sendMessage({ text }) };` — the `status` guard prevents double-submits, matching chapter 083's `useTransition` pattern.
  - Message render: `messages.map((m) => <MessageRow role={m.role}>{m.parts.map((part, i) => { switch (part.type) { case 'text': return <TextBubble role={m.role} key={i}>{part.text}</TextBubble>; case 'tool-getInvoiceStats': return <InvoiceStatsCard key={i} state={part.state} input={part.input} output={part.output} />; default: return null } })}</MessageRow>)`.
  - Loading indicator: while `status === 'submitted'` (model thinking, no parts yet), render a small "Thinking…" line below the last message.
- Fill `invoice-stats-card.tsx`. `'use client';` accepts `{ state, input, output }` typed via `InferUITools<InvoiceTools>['getInvoiceStats']`. Switch on state:
  - `input-streaming` → return null (the brief argument-arrival window — skip rendering, the parts protocol from lesson 2 of chapter 111).
  - `input-available` → `<InvoiceStatsCard.Skeleton />` — card-shaped skeleton with stat slots in the same layout as the real card. Not a generic spinner. The skeleton sub-component is a styled placeholder using the shadcn `<Skeleton />` primitives.
  - `output-available` → render the real card: title "Invoice stats" with optional filter hint ("Filtered by status: paid since 2026-01-01"), four stat blocks (count, totalAmount currency-formatted, byStatus as a small dl, oldestUnpaidDueDate via Temporal — fall back to "—" on null).
  - `output-error` → `<p className='text-destructive text-sm'>I couldn't load those stats. Try rephrasing.</p>`.
  - The `output-available` shape comes from the tool's `outputSchema` and is typed end-to-end via `InferUITools` — hovering `output.count` in the IDE shows `number`, not `unknown`.
- Fill `token-usage-panel.tsx`. `'use client';`
  - `useEffect` polling `/api/usage` every 10 s with `setInterval`; cleared on unmount.
  - State: `const [usage, setUsage] = useState<{ used: number; cap: number; remaining: number } | null>(null);`.
  - Render: a small panel in the corner with the bar (`used / cap`), the remaining count, the cap. Color the bar based on remaining: green > 50%, yellow 10-50%, red < 10%.
  - Also poll once on submit (the chat doesn't expose an `onFinish` to fire a fresh poll; the 10 s interval is adequate). Optional refinement named only in prose.
- Mount the panel in the right-rail of `/invoices/page.tsx` next to `<InvoiceChat />`.
- Run the app. Sign in as member-A. Ask "how many overdue invoices do we have?". Watch:
  - Status moves `submitted` → `streaming` → `ready`.
  - Skeleton flashes briefly during `input-available`.
  - Card renders with the real numbers.
  - Assistant text bubble follows, citing the count.
  - Usage panel updates within 10 s.
- Verify the quota refusal UX: trigger "Force quota to 99,500", ask one small question, the SSE stream returns 429, the `useChat` `onError` toasts the message, the input remains usable. (Optionally render an inline banner instead of a toast — the toast is the simpler default.)

Senior calls and watch-outs:

- `useChat<InvoiceUIMessage>` is the typed shape. Without the generic, `part.output` is `unknown` and every switch branch needs `as` casts — the type contract is the whole point of the `InferUITools` pattern from lesson 2 of chapter 111. Name at the call site.
- Manually managed input state (the `useState` + `onChange`) is a v5 change from v4's auto-managed input. The TOC explicitly names this; mention once.
- The `status` guard prevents double-submits the way `useTransition` does in chapter 083. The patterns rhyme: an in-flight request's button is disabled.
- The per-tool skeleton over a generic spinner is the lesson 2 of chapter 111 rule. A 5-tool chat would have 5 different skeletons; this chat has one. The shape matters because the skeleton conveys what's coming.
- The 10 s poll interval is the simple default. Alternatives (a server-sent event for usage updates, an `onFinish` callback on `useChat` triggering a fresh poll) are named once. The 10 s interval is acceptable for a personal-quota surface; a team-wide-billing dashboard would need a sharper signal.
- The `default` case in the parts switch returns `null` — graceful fallback for unknown part types (future tools added, transient parts, etc.). lesson 2 of chapter 111's "always have a default case" rule.
- Resist persisting `messages` to localStorage / DB. The TOC scoped the project to in-memory chat state; refresh loses. Persistence (load on mount via `getServerSnapshot`, save on `onFinish`) is named once as a forward pointer for future surfaces.
- The `onError` toast is the simple sanitized UX. Showing a different message for `quota_exceeded` (parse the response body before toasting) is a small refinement; the lesson keeps the single toast for clarity. Name the refinement.
- The chat lives in the right-rail of `/invoices` because that's the surface the user reaches for when answering "how many overdue?" — co-located with the data it discusses. Not a separate `/chat` route. Co-location is the UX call.

Codebase state at entry: tool callable, quotas live, smoke-test client renders raw text.
Codebase state at exit: full typed `useChat` rendering text parts and `tool-getInvoiceStats` parts across four states with a per-tool skeleton; token-usage panel polling `/api/usage`; quota refusal surfaces as a toast; status guard prevents double-submit. **Runnable — full happy and unhappy paths live; ready for verify pass.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 6 — Verify

Walks every "Done when" clause: grounded answers cite real Drizzle numbers, forged `orgId` is refused, the loop caps at 5 steps, the quota returns 429, tools return typed errors instead of throwing, and the `authedRoute` wrap holds.

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe is the script; this lesson is the execution plus surrounding senior commentary.
- **Grounded answer streams:** sign in as member-A, ask "how many overdue invoices do we have?". Watch the status transitions, the skeleton flash, the card render, the text bubble cite. Run the equivalent Drizzle query by hand in `psql`; numbers match. Inspector transcript confirms the message has a `tool-getInvoiceStats` part with `state: 'output-available'`.
- **Numbers cite real data:** repeat with "what's our total paid this month?". Hand-run the aggregate. Numbers match. If the model answers without calling the tool, sharpen the system prompt — name once that the prompt is the lever for instruction-following, not the code.
- **Forged `orgId` refused:** Inspector "Forge orgId" panel. Inject `orgId = B-uuid` into a tool-call payload. Confirm the request schema validation strips the field (or the tool's `execute` ignores it because `orgId` comes from `ctx`). Output reflects org A's data. Then flip `MODEL_FROM_INPUT_ORGID` (changes `buildInvoiceTools` to read `orgId` from input); repeat; observe the leak (org B numbers). Revert. Name this the worst class of LLM-in-SaaS bug.
- **Step ceiling caps:** Inspector "Step ceiling demo". Send a prompt designed to make the model retry. Transcript shows at most 5 `tool-getInvoiceStats` parts. Final message text acknowledges the cap. Then remove `stopWhen` from the route; repeat; observe up to 20 steps. Revert.
- **Tool error path:** Inspector "Force tool error" ON. Ask a stats question. `tool-getInvoiceStats` part shows `state: 'output-error'`; `InvoiceStatsCard` renders the destructive message; the model's follow-up text asks for a rephrase. No 500 in network. Revert toggle.
- **Per-tool skeleton:** during a slow tool call (the large-org seed makes this visible), confirm `InvoiceStatsCard.Skeleton` renders during `input-available` — card-shaped, not a spinner. Grep the codebase for `<Spinner` and confirm none in the chat tree.
- **Quota refusal:** Inspector "Force quota to 99,500". Ask one small question. Response 429. `useChat`'s `onError` fires; toast shows the user message. Audit-events tail: no new `'llm.finish'` (the model never ran). The input remains enabled; tomorrow's request would work.
- **Usage panel reflects accumulated tokens:** clear quota (re-seed). Ask one question. Within 10 s, panel ticks from 0 to the actual token count. Repeat — panel ticks higher. Audit-events payload shows `usage.inputTokens` + `usage.outputTokens` matching the sum.
- **Quota counts both directions:** ask the same question with a long preamble. Panel delta is bigger. The senior cut: in production, separate input/output counters help reason about cost (output tokens are 5x input tokens at OpenAI list price); the course simplifies to a single sum.
- **`authedRoute` refusal:** flip `BYPASS_AUTHED_ROUTE` OFF (the default); clear session cookie; `curl POST /api/chat` — 401. Restore session; works. Confirm `route.ts` opens with `authedRoute({...})`. The bypass debug flag is a verification tool, not a feature.
- **Typed `UIMessage` at the call site:** open `invoice-chat.tsx`; hover `part.output` in the `tool-getInvoiceStats` branch; IDE shows the projected shape. Open `invoice-stats-card.tsx`; props are typed from the same source. End-to-end typing via `InferUITools<InvoiceTools>`.
- **`useChat` v5 shape:** grep `append(`, `reload(`, `message.content`. No hits. Grep `sendMessage(`, `regenerate(`, `message.parts`. Hits in the right places. Grep `ai/rsc`, `streamUI`. No hits.
- **`lib/llm` is the only seam:** grep `from '@/lib/llm/`. Importers are the two route handlers and the chat component (for the message type). No Server Components import the tools or the prompt. The seam holds.
- **Audit events written:** clear the audit-events table (inspector reset). Run 3 questions. `llm_audit_events` has 3 `'llm.finish'` rows plus N `'llm.step'` rows (depends on tool-call patterns). Each payload includes `finishReason`, `usage`, and a tool-call summary.
- **Org-scoped through the active org:** switch to member-B in org B. Ask the same question. Numbers reflect org B. Audit-events `orgId` is B's. The `tenantDb(ctx.orgId).invoices.active()` inside `execute` is the structural reason.
- **Double-submit guard:** click Send twice rapidly while one request is in flight. Only one POST in network. The `status === 'streaming' || 'submitted'` guard in `onSubmit` is the gate.
- Name the senior calls one more time:
  - `authedRoute` wraps every streaming handler. The model never runs outside the wrapper.
  - Tools are the only doorway from the model into app state. `orgId` from closure, never from input. Aggregate projection, not raw rows.
  - `stopWhen(stepCountIs(5))` is set explicitly. No client-side `maxSteps`.
  - `onStepFinish` accounts tokens against the per-user daily cap; `onFinish` writes the aggregate audit.
  - Tools return typed errors; they do not throw.
  - The system prompt is the controller; user messages are untrusted input.
  - Tool parts render through a per-type, per-state switch with per-tool skeletons. No `ai/rsc`.
  - Typed `UIMessage` via `InferUITools` gives end-to-end types at the rendering boundary.
- Forward references:
  - Chapter 084 — error discipline; the LLM surface's user/operator message split is one audit row, the sanitized toast vs. the audit-events payload.
  - Chapter 086 — security baseline audit; the route's `authedRoute` wrap and the closure-`orgId` rule are two seeded audit findings.
  - Unit 19 — testing; the integration tests for this route mock the model via the AI SDK's `MockLanguageModelV2` (named once); the tool's `execute` is unit-testable as a plain function.
  - Chapter 096 — structured logs; the `llm_audit_events` table is the operator-truth side, the chat UI is the user-facing side.
  - Chapter 14 — notifications; a "you've used 90% of today's quota" notification routes through the dispatcher (named once as a forward pointer).
  - lesson 3 of chapter 111 — RAG; the next senior reach when invoice-stats questions outgrow what aggregate tools can answer ("explain why we have so many overdue this month" needs grounding in invoice descriptions, which exceeds aggregates).

Senior calls and watch-outs:

- Verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- Deliberate failure demos (remove `stopWhen`, flip `MODEL_FROM_INPUT_ORGID`, flip `BYPASS_AUTHED_ROUTE`, "Force tool error", "Force quota to 99,500") must run as named single-flag changes. Verify each in isolation, then revert.
- The quota's daily-reset is implicit in the `(userId, day)` pk: tomorrow's row is a fresh insert. The chapter does not exercise this in real time; the seed includes a row for "yesterday" near the cap to confirm yesterday's row doesn't block today's request (a quick `psql` check, named in the verify steps but not script-fired).
- The chapter ships against a real provider (OpenAI). Each verify pass costs a small number of cents in tokens. The seed's pre-loaded quota row at 90,000 minimizes the spend needed to reach the cap — naming the cost trade is the senior posture, not a watch-out.

Codebase state at entry: full chat surface wired, all paths runnable.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`authedRoute` wrap, closure-`orgId` rule, `stopWhen(stepCountIs(5))`, `onStepFinish` quota accounting, "return don't throw" inside `execute`, aggregate projection via `outputSchema`, per-tool skeleton, typed `UIMessage` via `InferUITools`, quota refusal as typed Result, no `ai/rsc`) and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.
