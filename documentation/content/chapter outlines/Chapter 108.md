# Chapter 108 — Project: Ask-your-invoices chat with tool calling

## Chapter framing

Chapter 108 cashes in chapter 105's "when LLMs earn their weight" framing, chapter 106's `streamText` + `useChat` + `UIMessage` parts protocol, and chapter 107's tool-calling, agentic-loop, and tool-parts rendering as one runnable "Ask the invoices" chat surface sitting on top of the chapter 062 invoices project.
The student builds a `POST /api/chat` route handler that composes `withLlmQuota(authedRoute('member', …))`, runs `streamText` with `stopWhen(stepCountIs(5))` over a Zod-defined `getInvoiceStats` tool whose `execute` reads `scopedInvoices(orgId).active()` and projects a minimal aggregate shape back to the model, plus a typed `useChat` client component that renders text parts and `tool-getInvoiceStats` parts (`input-streaming` / `input-available` / `output-available` / `output-error`) with per-state UX.
A `usageQuota` store table (the in-memory analogue of `usage_quota_daily`) tracks per-user-per-day token usage incremented inside `onStepFinish` against a 100k-token daily cap, with the request that crosses the cap refused by `withLlmQuota` before the stream starts, returning a typed `quota_exceeded` 429.

The project runs with no database, no Docker, and no auth wall: the "Postgres" is `src/server/store.ts`, a module singleton, and identity is the cookie-driven dev `getSession()` in `src/server/session.ts`. The lessons name the SQL lineage of each in-memory shape (`scopedInvoices` for the Drizzle `$dynamic()` builder, the store arrays for `usage_quota_daily` / `llm_audit_events`) so the patterns transfer to a real backend.

Threads through every lesson: **tools are the only doorway from the model into app state** — the LLM never sees the store, the `orgId`, or a row it isn't allowed to see; every read happens inside the tool's `execute` under the route's auth boundary, with `ctx.orgId` from the session context (never from the model's tool-call arguments — the model is treated as untrusted input); **the agentic loop is server-owned via `stopWhen`** — `stepCountIs(5)` is the explicit cap, no client-side `maxSteps`; **Zod is the single contract** — `inputSchema` on the tool, `outputSchema` projecting the minimal aggregate shape, the same Zod 4 discipline as chapter 042 and chapter 057; **token accounting is a first-class seam** — `withLlmQuota` reserves before the stream, `onStepFinish` increments the daily counter per step, `onFinish` writes a single audit row, the panel polls the counter; **the client is a typed `useChat` with `InferUITools<typeof tools>`** — `message.parts.map` switches on `part.type` and `part.state`, no `ai/rsc`, no raw JSON renders; **the surface refuses gracefully** — quota overruns, forged tool args, and tool errors all return typed refusal shapes the model can read or the UI can render, never thrown 500s; **everything composes with prior units** — the reads ride chapter 062's `scopedInvoices` helper, the tenancy enforcement rides chapter 057's `authedRoute`, the audit writes follow lesson 5 of chapter 057's append-only discipline (against the LLM events array), the env wiring rides the type-safe `env` from Unit 5.

### Project goals

The finished surface satisfies these goals; each one is owned by the lesson that builds the capability and confirmed in that lesson's Moment of truth.

- Typing a question about the user's invoices streams a grounded answer whose numbers match the store, because the system prompt forces a `getInvoiceStats` call before any numeric claim and the tool reads real `scopedInvoices` aggregates.
- A forged `orgId` is refused: the tool reads `orgId` from the route's auth closure (`ctx.orgId`), never from the model's tool-call arguments, so the model cannot reach another org's data.
- The request that crosses the 100k-token daily cap is refused by `withLlmQuota` before the stream starts, returning a typed `quota_exceeded` 429 the client surfaces as a friendly toast, with the input still enabled for tomorrow.
- The agentic loop is capped server-side at 5 steps via `stopWhen(stepCountIs(5))`, with no client-side `maxSteps`.
- Tools run server-side under `authedRoute('member', …)`: the `BYPASS_AUTHED_ROUTE` flag (standing in for an unauthenticated request the cookie session never produces) makes the route refuse with 401 and the model never runs.
- Tool failures return a typed `{ error }` the model and UI can render rather than throwing a 500.
- The client is a typed `useChat<InvoiceUIMessage>` (v5 shape — `sendMessage`, `message.parts`, locally managed input, `transport: new DefaultChatTransport({ api })`, no `ai/rsc`) that renders text parts and `tool-getInvoiceStats` parts across all four lifecycle states with a per-tool skeleton rather than a generic spinner, and `part.output` is typed end-to-end via `InferUITools`.
- A token-usage panel reflects accumulated usage (both input and output tokens) within its 10s poll window, and every conversation writes `'llm.step'` and `'llm.finish'` rows to the `llmAuditEvents` store array scoped to the active org.
- `src/lib/llm` is the only seam the tools, prompt, and quota live behind: the two route handlers, the quota wrapper, and the chat component (for the message type) are the only importers.

### Dependency carry-in

- **From chapter 062:** `app/(app)/invoices/page.tsx`, the `invoices` store array with `deletedAt` / `archivedAt` / `version` fields, the `scopedInvoices(orgId)` helper exposing `.active() / .archived() / .includingDeleted()`, `listInvoices` and `getInvoiceDetail` in `src/lib/invoices/queries.ts`, the lifecycle Server Actions in `src/lib/invoices/actions.ts`, the seeded dataset (two orgs, 45 + 2 special acme rows and 6 globex rows, statuses across `draft` / `sent` / `paid` / `overdue`).
- **From chapter 057:** `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts` (flat `ctx` with `userId` / `orgId` / `role` / `db`), `authedAction` for any non-streaming action, the cookie-driven `getSession()` (standing in for `requireOrgUser`), the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage, …} }`, the append-only audit discipline (`pushAudit` / `pushLlmAuditEvent`).
- **From chapter 056:** `scopedInvoices(orgId)` as the only doorway into tenant-owned rows.
- **From chapter 042 / chapter 043:** Zod 4 (`z.strictObject`, `z.infer`, `z.flattenError`, `z.iso.date()`).
- **From chapter 105:** the cost-cap discipline (per-user-per-day token quota, abuse mitigation as the user-facing-LLM rule); the provider-abstraction reflex behind `lib/llm/models.ts` (a bare AI Gateway model id, no provider package).
- **From chapter 106:** `streamText`, `toUIMessageStreamResponse`, `convertToModelMessages`, the `UIMessage` parts protocol, `useChat<MyUIMessage>` with manually managed input state and a `DefaultChatTransport`, `sendMessage`, the `onFinish` audit seam, `onError` returning sanitized messages, the system-prompt-as-controller posture, the `lib/llm/prompts.ts` registry convention.
- **From lesson 1 of chapter 107:** `tool({ description, inputSchema, execute, outputSchema })`, `execute` running server-side under the route's auth context, `stopWhen(stepCountIs(n))` as the default loop control, `onStepFinish` for per-step audit and quota, the "return don't throw" error pattern inside `execute`, projecting minimal results back to the model.
- **From lesson 2 of chapter 107:** the typed `UIMessage` via `InferUITools<typeof tools>`, the `lib/llm/tools.ts` registry convention, the four part states and per-tool skeletons, the parts-array rendering pattern, `UIToolInvocation` as the stats-card prop.
- **From Unit 5 (env):** the type-safe `env` module (`@t3-oss/env-nextjs`) with `AI_GATEWAY_API_KEY` added.

### Starting file tree

The `start/` directory ships only `package.json` (identical to the solution) and installed `node_modules` — there is **no `src/`**. The whole codebase is student-authored against the lesson exercises, with `solution/` as the reference. The tree below is the *solution* shape; this chapter's new build slices are the eight LLM-specific files (the four under `src/lib/llm/` that are not `models.ts`, plus `with-llm-quota.ts`, the two route handlers, and the three `invoices/` chat components). Everything else is the chapter-062 surface the student is assumed to be able to reproduce.

```
next.config.ts                    # cacheComponents, typedRoutes, reactCompiler
.env.example                      # AI_GATEWAY_API_KEY (live model checks only)
package.json                      # ai@^5, @ai-sdk/react@^2 (no @ai-sdk/openai — gateway string)
src/
  env.ts                          # type-safe env: AI_GATEWAY_API_KEY (server-only)
  server/
    types.ts                      # Invoice, AuditLog, Organization, UsageQuotaRow,
                                  #   LlmAuditEvent, Role; roleAtLeast
    store.ts                      # the in-memory "Postgres": users, organizations,
                                  #   invoices, auditLogs, usageQuota, llmAuditEvents,
                                  #   reseed (member-A seeded at 90k today, 99k yesterday)
    session.ts                    # cookie-driven dev getSession (default org-acme:admin)
    inspector-flags.ts            # globalThis flags: BYPASS_AUTHED_ROUTE,
                                  #   MODEL_FROM_INPUT_ORGID, FORCE_TOOL_ERROR
  lib/
    result.ts                     # Result<T> + ok/err/conflict
    authed-route.ts               # authedRoute(role, schema, fn) — flat RouteCtx
    authed-action.ts              # authedAction (non-streaming actions)
    invoices/
      scoped-query.ts             # scopedInvoices(orgId).active()/.archived()/...
      queries.ts                  # listInvoices, getInvoiceDetail
      actions.ts                  # update/archive/restore/softDelete actions
    llm/
      models.ts                   # chatModel = 'openai/gpt-5-mini' (bare gateway id)
      prompts.ts                  # invoiceQAPrompt({ orgName }) — tool-grounded controller
      tools.ts                    # buildInvoiceTools({ orgId }); InvoiceTools, InvoiceUIMessage
      quota.ts                    # DAILY_TOKEN_CAP, readUsage, reserveQuotaOrRefuse, addUsage
      audit.ts                    # writeLlmStepEvent, writeLlmFinishEvent (pushLlmAuditEvent)
      with-llm-quota.ts           # withLlmQuota — reserve-before-spend middleware
  app/
    layout.tsx page.tsx globals.css _components/...   # shell (provided shape)
    (app)/
      invoices/
        page.tsx                  # list view + right-rail aside (TokenUsagePanel + InvoiceChat)
        table.tsx toolbar.tsx ... [id]/edit/...        # chapter-062 list surface
        invoice-chat.tsx          # 'use client'; useChat<InvoiceUIMessage> via DefaultChatTransport
        invoice-stats-card.tsx    # 'use client'; UIToolInvocation switch across four states
        token-usage-panel.tsx     # 'use client'; polls /api/usage every 10s
    api/
      chat/route.ts               # POST = withLlmQuota(authedRoute('member', ...))
      usage/route.ts              # GET = authedRoute('member', z.strictObject({}), ...)
    inspector/
      page.tsx                    # row counts, identity switcher, audit tail, LLM panels, flags
      actions.ts                  # resetAndReseed, switchIdentity, forceQuota, toggle flags
```

### Reference solution signatures lessons display

- **Quota module** (`src/lib/llm/quota.ts`):
  - `export const DAILY_TOKEN_CAP = 100_000`.
  - `export const readUsage = async (userId: string): Promise<UsageReport>` — reads `findQuotaRow(userId, todayUtc())?.tokensUsed ?? 0`, returns `{ used, cap, remaining }`. (SQL lineage: `SELECT tokens_used FROM usage_quota_daily WHERE userId AND day = current_date`.)
  - `export const reserveQuotaOrRefuse = async (userId: string): Promise<{ ok: true } | { ok: false, error: { code: 'quota_exceeded', userMessage: string } }>` — `ensureTodayRow` (find-or-push a `tokensUsed: 0` row, the in-memory `INSERT ... ON CONFLICT DO NOTHING`), then compare `tokensUsed` to `DAILY_TOKEN_CAP`; returns refusal at-or-over cap.
  - `export const addUsage = async (userId: string, tokens: number): Promise<void>` — `ensureTodayRow` then `row.tokensUsed += tokens; row.updatedAt = …` (in-memory `UPDATE … SET tokens_used = tokens_used + $tokens`).
- **Quota middleware** (`src/lib/llm/with-llm-quota.ts`):
  - `export const withLlmQuota = (handler: (req: Request) => Promise<Response>) => async (req: Request): Promise<Response> => { const session = await getSession(); const reserved = await reserveQuotaOrRefuse(session.userId); if (!reserved.ok) return Response.json({ ok: false, error: reserved.error }, { status: 429 }); return handler(req); }` — composed AROUND `authedRoute`, reserves before the stream, short-circuits the 429.
- **Tool registry** (`src/lib/llm/tools.ts`):
  - `export const buildInvoiceTools = (ctx: { orgId: string }) => ({ getInvoiceStats: tool({ description: 'Return aggregate invoice statistics for the current organization. …', inputSchema: z.strictObject({ status: z.enum(['draft','sent','paid','overdue']).optional(), since: z.iso.date().optional() }), outputSchema: z.strictObject({ count: z.number().int(), totalAmount: z.number(), byStatus: z.record(z.string(), z.number().int()), oldestUnpaidDueDate: z.iso.date().nullable() }), execute: async (input) => { try { if (getFlag('FORCE_TOOL_ERROR')) return { error: 'stats_unavailable' as const }; const scopeOrgId = getFlag('MODEL_FROM_INPUT_ORGID') ? ((input as { orgId?: string }).orgId ?? ctx.orgId) : ctx.orgId; let query = scopedInvoices(scopeOrgId).active(); /* apply optional status/since filters; reduce over rows */ return { count, totalAmount, byStatus, oldestUnpaidDueDate } } catch { return { error: 'stats_unavailable' as const } } } }) })`.
  - `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>`.
  - `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>`.
- **System prompt** (`src/lib/llm/prompts.ts`):
  - `export const invoiceQAPrompt = (ctx: { orgName: string }): string` — joins four newline-separated rules: answer about `${ctx.orgName}` only; always call `getInvoiceStats` before any numeric fact; refuse other-org questions; on a tool `{ error }`, say stats are unavailable rather than invent numbers.
- **Audit writers** (`src/lib/llm/audit.ts`):
  - `export const writeLlmStepEvent = async (args: { userId, orgId, finishReason?, usage?, toolCalls? }): Promise<void>` — `pushLlmAuditEvent` with `event: 'llm.step'`.
  - `export const writeLlmFinishEvent = async (args: { userId, orgId, finishReason?, usage? }): Promise<void>` — `pushLlmAuditEvent` with `event: 'llm.finish'`.
- **Route handler** (`src/app/api/chat/route.ts`):
  - `export const POST = withLlmQuota(authedRoute('member', z.strictObject({ messages: z.array(z.unknown()) }), async (input, ctx) => { const org = await ctx.db.query.organization.findFirst({ where: (o) => o.id === ctx.orgId }); const orgName = org?.name ?? 'your organization'; const tools = buildInvoiceTools({ orgId: ctx.orgId }); const result = streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), tools, stopWhen: stepCountIs(5), maxOutputTokens: 1024, onStepFinish: async ({ usage, toolCalls, finishReason }) => { await addUsage(ctx.userId, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)); await writeLlmStepEvent({ userId: ctx.userId, orgId: ctx.orgId, finishReason, usage, toolCalls }) }, onFinish: ({ usage, finishReason }) => writeLlmFinishEvent({ userId: ctx.userId, orgId: ctx.orgId, finishReason, usage }), onError: ({ error }) => { /* sanitized console.error; do not leak */ } }); return result.toUIMessageStreamResponse() }))`.
  - This is a route handler, not an action; the quota reservation lives in the `withLlmQuota` wrapper, not in `fn`. The org display name comes from `ctx.db.query.organization.findFirst` (a store facade shaped like Drizzle's `db.query.*`).
- **Client component** (`invoice-chat.tsx`):
  - `'use client';`
  - `const { messages, sendMessage, status } = useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }), onError: () => toast.error('Something went wrong. Try again.') });` — the endpoint is on the transport (`@ai-sdk/react@2` removed the top-level `api` option).
  - `const [input, setInput] = useState('');` — manually managed input state (v5 no longer manages this).
  - Render loop: `messages.map((message) => message.parts.map((part, index) => { switch (part.type) { case 'text': return <p key={…}>{part.text}</p>; case 'tool-getInvoiceStats': return <InvoiceStatsCard key={…} {...part} />; default: return null } }))` — the whole tool part is spread so its discriminated `state`/`input`/`output` narrow inside the card.
- **Stats card** (`invoice-stats-card.tsx`):
  - `'use client';` `export const InvoiceStatsCard = (part: UIToolInvocation<InvoiceTools['getInvoiceStats']>)` switching on `part.state`: `input-streaming` → null; `input-available` → `<StatsSkeleton />` (card-shaped, stat slots, exposed as `InvoiceStatsCard.Skeleton`); `output-error` → the destructive "I couldn't load those stats" message; `output-available` → `'error' in part.output ? <StatsError /> :` the card rendering `count`, `totalAmount` (currency-formatted), `byStatus` as a small dl, `oldestUnpaidDueDate` (Temporal `PlainDate`, "—" on null).
- **Usage panel** (`token-usage-panel.tsx`):
  - `'use client';` `useEffect` polls `/api/usage` every 10s with an `AbortController` cleared on unmount; renders a `used / cap` bar colored by remaining (green > 50%, amber 10–50%, red < 10%) plus remaining count.
- **Usage endpoint** (`/api/usage/route.ts`):
  - `export const GET = authedRoute('member', z.strictObject({}), async (_input, ctx) => Response.json(await readUsage(ctx.userId)))`.
- **Env entries**: `AI_GATEWAY_API_KEY` (`z.string().min(1)`, server-only) in `src/env.ts`; `skipValidation` when `NODE_ENV !== 'production'` or `SKIP_ENV_VALIDATION=true`.
- **Store tables** (`src/server/store.ts`, the SQL lineage named in lessons):
  - `usageQuota: UsageQuotaRow[]` — `{ userId, day, tokensUsed, updatedAt }`, keyed by `(userId, day)` (the `usage_quota_daily` analogue, pk `(userId, day)`).
  - `llmAuditEvents: LlmAuditEvent[]` — `{ id, userId, orgId, event: 'llm.step' | 'llm.finish', payload, createdAt }` (the `llm_audit_events` analogue).

### Inspector page spec

Single Server Component at `/inspector`, the verification surface, with its mutations as Server Actions in `inspector/actions.ts`. The chat surface itself lives on `/invoices`; the inspector mirrors state and offers the verification controls. The "selected user" is the acting identity, so switching identity reframes the LLM panels. Each Implementation lesson's Moment of truth reaches for the relevant controls below.

- **Row counts:** total / active / archived / deleted for the acting org (chapter-062 holdover; the inspector and `scopedInvoices` are the only sanctioned direct readers of `store.invoices`).
- **Acting identity switcher:** a `<select>` of the four seeded `<orgId>:<role>` identities (`org-acme:admin`, `org-acme:member`, `org-globex:admin`, `org-globex:member`) posting `switchIdentity` to set the `acting-identity` cookie. This is the org + user switch (orgs A and B have disjoint invoices).
- **Reset and re-seed:** `resetAndReseed` restores the deterministic seed between demos.
- **Force version drift:** chapter-062 holdover — bumps a target invoice's `version` for the optimistic-concurrency 409 demo (`forceVersionDrift`).
- **Audit log (last 20):** the `auditLogs` tail (chapter-062 lifecycle writes).
- **LLM token quota panel:** live read of `usageQuota` for the selected user — `tokensUsed / DAILY_TOKEN_CAP`, last update time. The chat panel's poll surfaces increments within 10 s.
- **"Force quota to 99,500" button:** `forceQuota` sets the selected user's today row to `99_500` (in-memory analogue of `UPDATE usage_quota_daily SET tokens_used = 99500 …`) so the next request crosses the cap deterministically.
- **"Force tool error" toggle:** `toggleForceToolError` flips `FORCE_TOOL_ERROR`, making `getInvoiceStats.execute` return `{ error: 'stats_unavailable' }` before running — verifies the tool's "return don't throw" path and the `output-error` render.
- **`llm_audit_events` tail (last 20):** the `llmAuditEvents` array, each row showing `event`, `finishReason`, and `usage`. Updates after every conversation.
- **Forge-orgId explainer:** prose (not a sandbox panel) describing that the model may invent an `orgId` in its tool-call arguments but `getInvoiceStats` ignores it because it closes over `ctx.orgId`; to see the leak the closure prevents, flip `MODEL_FROM_INPUT_ORGID`, switch to `org-globex`, and replay.
- **Two debug flags behind toggles:** `BYPASS_AUTHED_ROUTE` (makes `authedRoute` return 401, standing in for the unauthenticated request the cookie session never produces), `MODEL_FROM_INPUT_ORGID` (makes `buildInvoiceTools`' `execute` read `orgId` from the model's tool-call input — proves the cross-tenant leak when reverted). Both default off.
- **Index & query-plan explainer:** prose describing the SQL artifacts (partial unique index on `number WHERE deleted_at IS NULL`, keyset cursor, `EXPLAIN ANALYZE` index scan) the in-memory store stands in for, including the two LLM tables.

### Concepts demonstrated → owning lesson

- `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse` — lesson 1 of chapter 106, lesson 3 of chapter 106.
- `useChat<MyUIMessage>`, `DefaultChatTransport`, `sendMessage`, manually managed input state, the parts protocol — lesson 3 of chapter 106.
- `tool({ description, inputSchema, execute, outputSchema })`, `execute` server-side under auth — lesson 1 of chapter 107.
- `stopWhen(stepCountIs(n))`, the agentic loop, the server-side cap — lesson 1 of chapter 107.
- `onStepFinish` for per-step quota/audit accounting, `onFinish` for aggregate audit — lesson 1 of chapter 107 + lesson 1 of chapter 106.
- Tool-result projection (return aggregates, not raw rows) — lesson 1 of chapter 107.
- "Return don't throw" error pattern inside `execute` — lesson 1 of chapter 107.
- Tool-part lifecycle (`input-streaming` / `input-available` / `output-available` / `output-error`), per-tool skeleton — lesson 2 of chapter 107.
- `InferUITools<typeof tools>` and the typed `UIMessage` — lesson 2 of chapter 107.
- The `lib/llm/{models,prompts,tools}.ts` registry convention — lesson 3 of chapter 105 + lesson 1 of chapter 106 + lesson 2 of chapter 107.
- Per-user daily token quota, abuse mitigation, cost accounting; `withLlmQuota` composed around auth — lesson 2 of chapter 105.
- System-prompt-as-controller, refusing speculation, force-tool-grounding — lesson 1 of chapter 106.
- `authedRoute(role, schema, fn)` wrapping the streaming handler — lesson 3 of chapter 057.
- `scopedInvoices(orgId).active()` inside the tool — lesson 2 of chapter 056 + chapter 062.
- Zod 4 `strictObject`, `z.infer`, canonical Result shape — chapter 042 + lesson 2 of chapter 057.
- Append-only audit writers (`writeLlmStepEvent` / `writeLlmFinishEvent`) inside `onStepFinish` / `onFinish`, following lesson 5 of chapter 057's `logAudit` discipline against the LLM events array — lesson 5 of chapter 057.
- Type-safe `env` for `AI_GATEWAY_API_KEY` — Unit 5.

### Lesson roadmap (owning lesson per build slice)

- **Lesson 1 — Project Overview.** Boot the project; tour the in-memory store, the LLM seam, and the inspector.
- **Lesson 2 — Streaming route under auth with the agentic loop.** `POST /api/chat` wrapped in `authedRoute('member')`, `streamText` capped at 5 steps, the tool-grounded system prompt, an `onFinish` audit write. Ends streaming text-only answers.
- **Lesson 3 — The org-scoped `getInvoiceStats` tool.** The closure-over-`orgId` tool with an aggregate `outputSchema` and "return don't throw" errors, wired into the route with per-step audit. Ends answering grounded questions with real `scopedInvoices` numbers.
- **Lesson 4 — The per-user daily token quota.** `quota.ts`, the `withLlmQuota` reserve-before-spend wrapper, `onStepFinish` token accounting, and the `/api/usage` endpoint. Ends refusing the over-cap request with a typed 429.
- **Lesson 5 — Typed `useChat`, tool parts, and the usage panel.** The full typed client rendering text and tool parts across four states with a per-tool skeleton, plus the polling usage panel. Ends with the full happy and unhappy paths live.

---

## Lesson 1 — Project Overview

An "ask-your-invoices" chat lives in the right rail of `/invoices`: the user types a question about their organization's invoices and a tool-calling LLM answers, grounded in real `scopedInvoices` data, with a live panel showing how much of today's token budget is left.
By the end of this lesson the project boots locally (no database, no Docker, no auth wall) with the seeded invoices list rendering and the chat rail present but unwired.

_(Single figure: the finished right-rail chat — a question typed, the tool-part skeleton flashing, the output card with real numbers, the assistant text bubble citing the count, and the usage panel ticking up.)_

### What we'll practice

- Wrapping a streaming LLM endpoint in the same auth boundary that guards every other mutation, so the model only ever runs for an authenticated org member.
- Treating the model as untrusted input: tools as the only doorway into app state, `orgId` from the server closure, aggregate projections instead of raw rows.
- Owning the agentic loop server-side with an explicit step cap rather than trusting a client or an SDK default.
- Accounting for cost per user per day and refusing gracefully when the budget is spent.
- Rendering a typed `useChat` surface where tool outputs are fully typed at the call site and each tool has its own loading shape.

This is the canonical 2026 shape for any LLM-backed SaaS surface. A future customer-support assistant or an onboarding helper reuses this skeleton with a different tool registry and a different prompt.

### Architecture

- **Client** — `invoice-chat.tsx` (`useChat<InvoiceUIMessage>` via `DefaultChatTransport`) in the `/invoices` right rail, rendering text and `tool-getInvoiceStats` parts; `token-usage-panel.tsx` polling `/api/usage`.
- **Route** — `POST /api/chat` as `withLlmQuota(authedRoute('member', …))`: the quota wrapper reserves before the stream, then `streamText` with the tool-grounded system prompt, `stopWhen(stepCountIs(5))`, the tool registry, `onStepFinish` (quota increment + step audit), `onFinish` (aggregate audit).
- **Feature seam** — `src/lib/llm/{prompts,tools,quota,audit,with-llm-quota}.ts`, behind which the model never sees the store or an `orgId`; `models.ts` holds the bare AI Gateway model id.
- **Data** — chapter 062's `invoices` store array read through `scopedInvoices(orgId).active()`; the `usageQuota` and `llmAuditEvents` store arrays for accounting.
- **Inspector** — `/inspector`, a Server Component mirroring quota and audit state and offering the verification toggles (Server Actions in `inspector/actions.ts`).

### Starting file tree

See the chapter framing's "Starting file tree" above. `start/` carries the full chapter-062 surface intact — the list, the store, the auth wrappers, the scoped query, the model registry, and the inspector shell — and marks the nine LLM-specific files the student writes with a `TODO(L<n>)` stub: `src/lib/llm/{prompts,tools,quota,audit}.ts`, `src/app/api/{chat,usage}/route.ts`, and the three client components in `src/app/(app)/invoices/`. The `withLlmQuota` middleware in `src/lib/llm/with-llm-quota.ts` ships complete as a provided seam. Filling the nine stubs is the whole build; `solution/` is the reference.

Deep per-file explanation of each slice lives in the lesson that first writes it: `prompts.ts`, `audit.ts`, and `route.ts` in Lesson 2; `tools.ts` (and its wiring into the route) in Lesson 3; `quota.ts`, `with-llm-quota.ts`, and `usage/route.ts` in Lesson 4; the three client components in Lesson 5.

The reference files worth reading before starting:

- `src/lib/llm/models.ts` — one role-named handle as a bare AI Gateway model id, `chatModel = 'openai/gpt-5-mini'`. The SDK routes the `provider/model` string through the Vercel AI Gateway and reads `AI_GATEWAY_API_KEY` from `process.env`, so no `@ai-sdk/openai` package is imported. Swapping providers is a one-line change here (the provider-abstraction discipline from lesson 3 of chapter 105 — never a `provider(...)` factory call).
- `src/env.ts` — `AI_GATEWAY_API_KEY` as `z.string().min(1)`, server-only; `skipValidation` off only in `production` (so `SKIP_ENV_VALIDATION=true` keeps `pnpm verify`'s build green without a real key).
- `src/server/store.ts` — the in-memory "Postgres": the `invoices` array plus the two new arrays `usageQuota` (keyed `(userId, day)`) and `llmAuditEvents` (`event: 'llm.step' | 'llm.finish'`, jsonb-shaped payload). Lessons name each one's SQL lineage.
- `src/server/session.ts` — the cookie-driven dev `getSession()`; default identity `org-acme:admin`. No auth wall, so every route renders.
- `app/(app)/invoices/page.tsx` — the chapter 062 list view plus the right-rail `<aside>` rendering `<TokenUsagePanel />` and `<InvoiceChat />`.
- `package.json` — `ai@^5`, `@ai-sdk/react@^2` (no `@ai-sdk/openai`; the gateway string needs no provider package). Note the v5 import paths.
- `next.config.ts` — `cacheComponents: true`; the chat surface is fully client-side and the streaming route handler is dynamic by definition, so neither interacts with Cache Components.
- `/inspector` end-to-end — the row counts, identity switcher, audit tail, usage counter, force-quota button, force-tool-error toggle, LLM audit-events tail, forge-orgId explainer, and the two debug flags (`BYPASS_AUTHED_ROUTE`, `MODEL_FROM_INPUT_ORGID`).

The seeded `usageQuota` row for member-A at 90,000 tokens (with a near-cap "yesterday" row to prove the daily key resets) is the surface later lessons exercise — a couple of small questions cross the cap deterministically without spending much.

### Roadmap

_(CardGrid, one Card per build lesson.)_

- **Lesson 2 — Streaming route under auth.** Adds `POST /api/chat`: `streamText` wrapped in `authedRoute('member')`, capped at 5 steps, streaming text-only answers.
- **Lesson 3 — The org-scoped tool.** Adds `getInvoiceStats`, so the chat answers questions grounded in real `scopedInvoices` aggregates.
- **Lesson 4 — The daily token quota.** Adds the `withLlmQuota` reservation, per-user-per-day token accounting, and the typed 429 refusal when the budget is spent.
- **Lesson 5 — Typed client and usage panel.** Adds the typed `useChat` surface rendering tool parts across four states with a per-tool skeleton, plus the live usage panel.

### Setup

_(Steps component.)_

1. Install dependencies: `pnpm install`.
2. Start the dev server: `pnpm dev` — `/invoices` and `/inspector` render with no login, no database, and no key needed for the shell. The store seeds deterministically on first import.

There is no Docker, no migration, and no seed script: the data lives in `src/server/store.ts` and re-seeds via the inspector's "Reset and re-seed" control.

Environment variables:

- `AI_GATEWAY_API_KEY` — server-only key the model handle reads, only needed for the live-chat Moments of truth (the streamed answer, the 429, the forged-orgId proof, the step-ceiling demo). Obtain it from the Vercel AI Gateway dashboard, copy `.env.example` to `.env`, and paste it in. No test, build, or rendered check makes a live model call, so `pnpm verify` is green without a key.

On success, `/invoices` renders the seeded list with the right-rail chat panel present, and `/inspector` loads with the seeded member-A usage row and an empty LLM audit-events tail. `POST /api/chat` and `GET /api/usage` 404 until their handlers are written. This lesson ends here — the project runs locally.

---

## Lesson 2 — Streaming route under auth with the agentic loop

Wire a `POST /api/chat` route handler that streams an LLM answer to any question, wrapped in `authedRoute('member')` and capped at a 5-step agentic loop.
When it works, acting as an org member and typing a question streams a text answer back into a temporary chat box, the `BYPASS_AUTHED_ROUTE` flag makes the request refuse with 401, and one `'llm.finish'` row lands in the LLM audit-events tail.

### Your mission

This is the spine every later lesson hangs off: the streaming endpoint and its guardrails, before any tool can read a row.
The hard senior reflex here is "cap and wrap first, then add capability" — `authedRoute('member')` is the load-bearing wrapper, and calling `streamText` from a bare `POST` is the canonical bug class: the chat would answer any caller, burn tokens, and have no `orgId` to scope by.
The 5-step `stopWhen(stepCountIs(5))` goes in now, before tools exist, because adding tools without a cap opens a runaway-loop window and the SDK default of `stepCountIs(20)` is too loose for a surface with a per-user cost ceiling.
The system prompt is the controller: it forces tool-grounding ("Always call getInvoiceStats before stating numeric facts"), refuses cross-org questions, and defines error behavior — user messages are untrusted input, not instructions.
Two v5 seams surface once here: `convertToModelMessages` translates the client's `UIMessage[]` rendering shape into the model's `ModelMessage[]` wire shape (skipping it is a v5-onboarding bug), and `toUIMessageStreamResponse()` is what makes the response a stream `useChat` understands (not `toTextStreamResponse()`, a different protocol).
The route's input schema deliberately accepts an untyped `messages` array (`z.array(z.unknown())`) — validating the full `UIMessage` shape with Zod is heavy, and the converter does the real validation; name the trade rather than over-validating.
The audit writers in `audit.ts` are append-only pushes into the `llmAuditEvents` store array via `pushLlmAuditEvent`. Name the SQL lineage: against real Postgres these would be one-row inserts into `llm_audit_events`, following lesson 5 of chapter 057's `logAudit` discipline (one row per event, no scattered writes) — here a single push stands in for the bounded one-row transaction.
`onError` returns a sanitized log and never leaks raw errors to the client; per-step audit and the tool registry are out of scope and land in Lessons 3 and 4. The quota reservation that wraps this route arrives in Lesson 4 as `withLlmQuota`.
To exercise the route before the real client exists, stand up a throwaway smoke-test client: a `useChat<InvoiceUIMessage>` bound to a local textarea that renders messages as raw text — the full parts-rendering client is Lesson 5.

- Typing a question (for example, "tell me a joke about invoices") streams a text answer back into the temporary chat box.
- With `BYPASS_AUTHED_ROUTE` on, `POST /api/chat` is refused with 401, and the model never runs.
- The system prompt is in place: a question that asks for another org's data is refused in the answer text.
- Every completed conversation writes exactly one `'llm.finish'` row (with `finishReason: 'stop'`) to the LLM audit-events tail, scoped to the acting org.

### Coding time

Implement `src/lib/llm/prompts.ts`, `src/lib/llm/audit.ts`, `src/app/api/chat/route.ts`, and the temporary smoke-test `invoice-chat.tsx` against the brief, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/prompts.ts` — the single `invoiceQAPrompt({ orgName })` export from the framing's signatures. The four newline-joined rules: scope to `orgName`, enforce tool-grounding, refuse cross-org questions, define the `{ error }` behavior. The org name is templated in; user input stays in `messages` (the prompt-injection rule).
- `src/lib/llm/audit.ts` — `writeLlmStepEvent` and `writeLlmFinishEvent`, each an append-only `pushLlmAuditEvent` into the `llmAuditEvents` array (`event: 'llm.step' | 'llm.finish'`). Rationale: this is a different table from `auditLogs`, so these are not `pushAudit` calls, but the one-row-per-event discipline carries over from lesson 5 of chapter 057.
- `src/app/api/chat/route.ts` — the `authedRoute('member', schema, async (input, ctx) => …)` shape from the framing, minus the tools, `onStepFinish`, and the `withLlmQuota` wrapper (Lessons 3 and 4). Inside `fn`, before the stream, fetch the org display name the context doesn't carry: `const org = await ctx.db.query.organization.findFirst({ where: (o) => o.id === ctx.orgId }); const orgName = org?.name ?? 'your organization';`. Then `streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), stopWhen: stepCountIs(5), maxOutputTokens: 1024, onFinish: … , onError: … })` and `return result.toUIMessageStreamResponse()`.
  - Callout: the route is a route handler, not a Server Action — streaming responses are route handlers; `authedRoute` is the `Request`/`Response` variant of `authedAction` from lesson 3 of chapter 057. The `ctx.db.query.organization.findFirst` is a store facade shaped like Drizzle's `db.query.*`.
  - Callout: `ctx` is flat (`ctx.userId` / `ctx.orgId`), not `ctx.user.id`.
  - Callout: `stopWhen(stepCountIs(5))` is set with no tools to call yet, so the cap is not exercised in this lesson — it is set first on purpose.
  - Callout: `maxOutputTokens` rides alongside `stopWhen` on every handler — the two cost caps are non-negotiable (lesson 1 of chapter 106 / lesson 1 of chapter 107); a missing output cap is the same severity as a missing auth check.
- Smoke-test `invoice-chat.tsx` — `'use client'`; `useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }) })` (the endpoint is on the transport — `@ai-sdk/react@2` removed the top-level `api` option); a textarea bound to local `useState`; Submit calls `sendMessage({ text: input })`; messages render as raw text. For topics already covered, link rather than re-explain: `convertToModelMessages` and the parts protocol to lesson 3 of chapter 106, `authedRoute` to lesson 3 of chapter 057, `onError` sanitization to chapter 106.

### Moment of truth

This project ships no per-lesson test suite (the `lesson-verification/` directory is the harness slot, not a green gate here). Run `pnpm verify` (Biome CI + `tsc --noEmit` + `next build` with `SKIP_ENV_VALIDATION=true`) to confirm the slice typechecks and builds, then confirm behavior by hand:

- [ ] Acting as member-A, typing "tell me a joke about invoices" streams a text answer into the smoke-test box.
- [ ] With the inspector's `BYPASS_AUTHED_ROUTE` flag on, `POST /api/chat` returns 401 from `authedRoute`; the model never ran. Revert.
- [ ] Asking for another organization's data is refused in the answer text (the system prompt as controller).
- [ ] After one conversation, the inspector's LLM audit-events tail shows exactly one `'llm.finish'` row with `finishReason: 'stop'`, scoped to org-acme.

---

## Lesson 3 — The org-scoped getInvoiceStats tool

Give the chat a single tool, `getInvoiceStats`, so it answers questions grounded in real invoice aggregates rather than guessing.
When it works, asking "how many overdue invoices do we have?" returns a number that matches the store, and a forged `orgId` in the model's arguments cannot reach another org's data.

### Your mission

This lesson turns the chat from a text generator into a grounded analyst, and it carries the single most important rule of the project.
The tool is built per request by `buildInvoiceTools({ orgId: ctx.orgId })`, and `orgId` is **never** in the tool's `inputSchema` — the model cannot pass it, fake it, or ask for another org's data, because `execute` closes over `ctx.orgId` from `authedRoute`. This is the senior rule from lesson 1 of chapter 107 made structural; the inspector's `MODEL_FROM_INPUT_ORGID` flag exists precisely to make the cross-tenant leak visible if you break it.
`outputSchema` projects an aggregate, not raw rows — a `count`, a `totalAmount`, a `byStatus` map, one date — which is the "return minimal" discipline: feeding raw rows back to the model would compound input tokens across loop steps and leak invoice numbers, amounts, and customer names the model never needs to see. Project at the tool boundary, not the rendering boundary.
Errors follow "return don't throw": a `try/catch` around the read returns `{ error: 'stats_unavailable' as const }` on failure, which the SDK accepts as long as it serializes; the inspector's `FORCE_TOOL_ERROR` flag is the deterministic way to exercise this path. Programmer errors (bad types, undefined references) still bubble, because those are bugs, not user-facing failures.
The SDK validates the model's tool arguments against `inputSchema` (`z.strictObject`, `z.enum`, `z.iso.date()`) before `execute` runs, so an invented status outside the enum becomes an `output-error` the model can read and react to.
Wiring the tool into the route also adds the per-step audit seam: `onStepFinish` writes one `'llm.step'` row per step via `writeLlmStepEvent`, so a 3-step loop produces 3 step rows plus the 1 finish row.
The smoke-test client from Lesson 2 stays in place; the typed parts-rendering client and the token-counting half of `onStepFinish` are out of scope and land in Lessons 5 and 4 respectively.

- Asking "how many overdue invoices do we have?" returns a count matching the seed's overdue active rows for org-acme (`scopedInvoices('org-acme').active()` filtered to `status === 'overdue'`), confirmed by hand against the inspector's count panel.
- Asking "what's our total paid this month?" returns a total matching the equivalent reduce over the active rows.
- A message that asks the model to "use orgId = org-globex" still returns org-acme's data, because `execute` reads `orgId` from the closure; flipping `MODEL_FROM_INPUT_ORGID` and repeating shows the leak, confirming the closure is the structural reason it is safe.
- A recursion-prone prompt produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap; removing `stopWhen` lets the loop run to the SDK default.
- With the inspector's "Force tool error" toggle on, a stats question produces a `tool-getInvoiceStats` part in `state: 'output-error'` and a follow-up text answer asking the user to rephrase, with no 500 in the network tab.
- Each conversation writes one `'llm.step'` row per loop step plus one `'llm.finish'` row, scoped to the active org.

### Coding time

Implement `src/lib/llm/tools.ts` and wire it into `src/app/api/chat/route.ts` against the brief, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/tools.ts` — the `buildInvoiceTools` factory from the framing's signatures: the `getInvoiceStats` tool with its description, `inputSchema` (`status?`, `since?` — no `orgId`), `outputSchema` (the aggregate projection), and an `execute` that calls `scopedInvoices(scopeOrgId).active()` with the optional filters, reduces over the rows, and returns the projected shape inside a `try/catch` that returns `{ error: 'stats_unavailable' as const }`. The two inspector flags branch inside `execute`: `FORCE_TOOL_ERROR` returns the error shape early, `MODEL_FROM_INPUT_ORGID` reads `orgId` from the model input (otherwise `scopeOrgId` is `ctx.orgId`). Plus `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>` and `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>` — the client imports only the message type.
  - Callout: the closure over `ctx.orgId` is the load-bearing line; `orgId` is absent from `inputSchema` on purpose.
  - Rationale: the `{ error }` discriminant widens the inferred union but the SDK accepts it because it serializes.
- `src/app/api/chat/route.ts` — build `const tools = buildInvoiceTools({ orgId: ctx.orgId })` per request, pass `tools` to `streamText`, and add `onStepFinish` writing `writeLlmStepEvent({ userId: ctx.userId, orgId: ctx.orgId, toolCalls, finishReason, usage })` per step. `onFinish` is unchanged from Lesson 2; the token-accounting half of `onStepFinish` is added in Lesson 4. For the tool/loop primitives, link to lesson 1 of chapter 107 rather than re-explaining; for the scoped query helper, link to chapter 062.

### Moment of truth

Run `pnpm verify` to confirm the slice typechecks and builds (there is no per-lesson test suite), then confirm behavior by hand:

- [ ] Asking "what's our total paid this month?" returns a total matching a reduce over org-acme's active paid rows; the assistant text bubble cites it. (If the model answers without a `tool-getInvoiceStats` part, sharpen the system prompt — the prompt is the lever for instruction-following, not the code.)
- [ ] With `MODEL_FROM_INPUT_ORGID` off, asking the model to use `orgId = org-globex` still yields org-acme's numbers; flipping `MODEL_FROM_INPUT_ORGID`, switching to org-globex, and repeating shows org-globex's numbers — the worst class of LLM-in-SaaS bug. Revert.
- [ ] A recursion-prone prompt produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap; removing `stopWhen` and repeating shows the loop running to the SDK default. Revert.
- [ ] With "Force tool error" on, a stats question shows the `output-error` state and a rephrase prompt from the model, with no 500 in the network tab. Revert.
- [ ] After a multi-step conversation, the LLM audit-events tail shows one `'llm.step'` row per step plus one `'llm.finish'` row, all scoped to the active org.

---

## Lesson 4 — The per-user daily token quota

Cap each user at 100,000 tokens per day so a single user cannot run up an unbounded model bill, refusing gracefully once the budget is spent.
When it works, the request that crosses the cap returns a typed 429 refusal instead of an answer, and the `/api/usage` endpoint reports today's used, cap, and remaining tokens.

### Your mission

This is the cost-cap discipline from lesson 2 of chapter 105 made concrete: a per-user-per-day token budget, enforced server-side, with a typed refusal the client can render.
The quota lives in the `usageQuota` store array (the `usage_quota_daily` analogue), keyed by `(userId, day)`, and the daily reset is implicit — tomorrow's row is a fresh push, so the seed's near-cap row for member-A blocks today but not tomorrow (the seed's separate "yesterday" row proves the key independence).
Reservation runs *before* `streamText`, and that is why it lives in a `withLlmQuota` middleware composed AROUND `authedRoute` (`withLlmQuota(authedRoute(...))`) rather than inside `fn` — the senior reflex "wrap first, then add capability": a new LLM route physically cannot forget cost enforcement because the wrapper sits between the request and the handler. `withLlmQuota` resolves the user from `getSession()`, calls `reserveQuotaOrRefuse(session.userId)`, and short-circuits a typed 429 before delegating.
`reserveQuotaOrRefuse(userId)` ensures today's row exists (`ensureTodayRow` — find-or-push a `tokensUsed: 0` row, the in-memory `INSERT ... ON CONFLICT DO NOTHING`), then compares `tokensUsed` to `DAILY_TOKEN_CAP`, returning `{ ok: false, error: { code: 'quota_exceeded', userMessage } }` at or over the cap.
The actual increment happens as tokens are consumed, inside `onStepFinish` via `addUsage`, summing `usage.inputTokens + usage.outputTokens` (both optional on the v5 usage object — default to 0 with `??` so a partial usage report doesn't crash the route).
Name the trade-off: this is a soft daily ceiling enforced as we go, so tokens consumed in the step that pushes a request over the cap are charged in arrears — acceptable for a 100k daily budget, but not for a hard rate limit.
Name the SQL lineage: against real Postgres the ensure-then-compare would be `INSERT ... ON CONFLICT DO NOTHING` then a `SELECT` (or one `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`); here the find-or-push and the comparison are two array operations, readability over a single statement.
The course counts input and output tokens as a single sum; production often separates them because output tokens cost several times more — name the simplification.
The `/api/usage` endpoint is the read side the Lesson 5 panel will poll; it reuses `authedRoute('member')` so usage is per authenticated user.
The quota module, the middleware, and the endpoint are the whole surface here; the rendered usage panel is out of scope and lands in Lesson 5.

- The request that crosses the 100,000-token cap returns HTTP 429 with `{ ok: false, error: { code: 'quota_exceeded', userMessage } }` (use the inspector's "Force quota to 99,500" then ask one small question).
- `GET /api/usage` returns today's `{ used, cap, remaining }` for the acting user.
- After a normal question, the inspector's usage counter ticks up by the actual token count for that conversation.
- A question with a long preamble increases the counter by more than a short question, because `onStepFinish` adds `usage.inputTokens + usage.outputTokens`.
- Yesterday's near-cap seed row does not block today's request, because the quota is keyed by `(userId, day)`.

### Coding time

Implement `src/lib/llm/quota.ts`, `src/lib/llm/with-llm-quota.ts`, and `src/app/api/usage/route.ts`, then wrap `src/app/api/chat/route.ts` in `withLlmQuota` and add the increment to its `onStepFinish`, against the brief, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `src/lib/llm/quota.ts` — `DAILY_TOKEN_CAP = 100_000`; `readUsage(userId)` (returns `{ used, cap, remaining }` from `findQuotaRow`); `reserveQuotaOrRefuse(userId)` (`ensureTodayRow`-then-compare, returning the typed refusal at cap); `addUsage(userId, tokens)` (`ensureTodayRow` then `row.tokensUsed += tokens`). Signatures in the framing.
  - Rationale: the check-then-increment shape is a soft ceiling; pre-reserving a budgeted amount is the alternative some teams pick.
- `src/lib/llm/with-llm-quota.ts` — the `withLlmQuota` middleware from the framing's signatures: `getSession()` → `reserveQuotaOrRefuse(session.userId)` → short-circuit `Response.json({ ok: false, error }, { status: 429 })` or delegate. `import 'server-only'`.
- `src/app/api/usage/route.ts` — `export const GET = authedRoute('member', z.strictObject({}), async (_input, ctx) => Response.json(await readUsage(ctx.userId)))`.
- `src/app/api/chat/route.ts` — wrap the existing `authedRoute(...)` export in `withLlmQuota(...)`. Inside the existing `onStepFinish`, add `await addUsage(ctx.userId, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0))` alongside the step-audit write from Lesson 3.
  - Callout: the reservation is in the wrapper, not `fn` — the route never calls `reserveQuotaOrRefuse` itself.
  - Callout: `usage.inputTokens` / `usage.outputTokens` are optional on the v5 step usage object — `??` to 0.
  - For the canonical Result shape and Zod discipline, link to chapter 042 and lesson 2 of chapter 057.

### Moment of truth

Run `pnpm verify` to confirm the slice typechecks and builds (there is no per-lesson test suite), then confirm behavior by hand:

- [ ] With the inspector's "Force quota to 99,500" applied (acting as member-A), asking one small question makes the next `POST /api/chat` return 429 with the `quota_exceeded` Result shape; no new `'llm.finish'` row appears (the model never ran).
- [ ] `GET /api/usage` returns `{ used, cap, remaining }` for the acting user.
- [ ] After "Reset and re-seed" and asking one question, the inspector's usage counter ticks up from the seeded baseline by the actual token count, and the audit payload's `usage.inputTokens + usage.outputTokens` matches the delta.
- [ ] Asking the same question with a long preamble increases the counter by more than the short question did.
- [ ] The seed's "yesterday" near-cap row does not block today's request, confirmed by acting as member-A (today's row starts at the seeded 90k, independent of yesterday's 99k).

---

## Lesson 5 — Typed useChat, tool parts, and the usage panel

Replace the smoke-test client with the real chat UI: a typed `useChat` that renders text bubbles and invoice-stats cards across every tool-part state, plus a panel showing how much of today's token budget is left.
When it works, asking a question flashes a card-shaped skeleton, then renders the real numbers, then the assistant's text bubble — and the quota refusal surfaces as a friendly toast.

### Your mission

This lesson assembles the full client surface on top of the route, tool, and quota already in place, and the type contract is the whole point.
`useChat<InvoiceUIMessage>` carries the generic from `InferUITools` (lesson 2 of chapter 107), so `part.output` in the `tool-getInvoiceStats` branch is the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` shape (a union with the `{ error }` arm), not `unknown`, and no `as` casts are needed — without the generic, every switch branch needs a cast.
Input state lives in a local `useState`, a v5 change from v4's auto-managed input (the TOC names this explicitly); the submit handler guards on `status === 'streaming' || status === 'submitted'` (plus an empty-input guard) to prevent double-submits, the same in-flight gate `useTransition` provides in chapter 079.
The render walks `messages.map((m) => m.parts.map(…))` with a `switch` on `part.type`: a `text` part renders a bubble, a `tool-getInvoiceStats` part renders `<InvoiceStatsCard {...part} />` (the whole tool part is spread so its discriminated `state`/`input`/`output` narrow inside the card), and a `default` branch returns `null` so unknown or transient part types degrade gracefully (lesson 2 of chapter 107's "always have a default case").
The stats card takes the whole `UIToolInvocation` as its prop and switches on `part.state` across all four lifecycle states; the `input-available` state renders a per-tool, card-shaped skeleton built from a shadcn `<Skeleton />` primitive (exposed as `InvoiceStatsCard.Skeleton`) — not a generic `<Spinner />`. In `output-available`, it guards `'error' in part.output` to fall to the error message, because the output union carries the `{ error }` arm. The skeleton's shape conveys what is coming; a 5-tool chat would have 5 skeletons, this one has one.
The usage panel polls `/api/usage` every 10s in a `useEffect` (the one allowed effect — polling an external system), with an `AbortController` and `setInterval` cleared on unmount, coloring the remaining-tokens bar by threshold; the 10s interval is the simple default for a personal-quota surface (a team-wide billing dashboard would need a sharper signal — name the alternatives once).
The quota refusal surfaces through `useChat`'s `onError`, which toasts a sanitized friendly message while the input stays enabled; rendering a distinct message for `quota_exceeded` by parsing the response body is a named refinement, not the default.
Resist persisting `messages` — the project is scoped to in-memory chat state, so a refresh loses the conversation; persistence is a named forward pointer.
The chat lives in the `/invoices` right rail because that is where the user reaches when answering "how many overdue?", co-located with the data it discusses, not on a separate `/chat` route — the co-location is the UX call.

- Asking "how many overdue invoices do we have?" moves `useChat`'s status `submitted` → `streaming` → `ready`, flashes a card-shaped skeleton during `input-available`, renders the real numbers, then an assistant text bubble citing the count.
- The loading skeleton is the per-tool `InvoiceStatsCard.Skeleton` (card layout with stat slots), with no generic `<Spinner />` anywhere in the chat tree.
- Hovering `part.output` in the `tool-getInvoiceStats` branch shows the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` type (union with the `{ error }` arm), not `unknown`, end-to-end via `InferUITools`.
- A `tool-getInvoiceStats` part in `output-error` (or an `output-available` whose `part.output` carries `{ error }`) renders the destructive-styled "I couldn't load those stats" message rather than a broken card.
- The usage panel reflects accumulated usage within its 10s poll window, coloring the bar by remaining budget.
- Triggering the quota refusal (inspector "Force quota to 99,500", then one small question) toasts the friendly message via `onError` while the input stays enabled.
- Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat`, because the status guard gates the submit.
- The chat is the v5 shape — `sendMessage`, `message.parts`, locally managed input, `DefaultChatTransport` — with no `append`, `reload`, `message.content`, or `ai/rsc` anywhere.

### Coding time

Implement the full `src/app/(app)/invoices/invoice-chat.tsx`, `invoice-stats-card.tsx`, and `token-usage-panel.tsx`, and mount the panel in the `/invoices` right-rail `<aside>` in `page.tsx`, against the brief, then read the reference walkthrough below.

_(Hidden `<details>` reference solution.)_

- `invoice-chat.tsx` — the typed `useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }), onError: () => toast.error('Something went wrong. Try again.') })` from the framing; local `useState` input; the `onSubmit` in-flight + empty guard; the `messages.map` / `parts.map` switch with `text`, `tool-getInvoiceStats` (spreading `{...part}` into `<InvoiceStatsCard />`), and `default → null` branches; a "Thinking…" line while `status === 'submitted'`. Takes `orgName` as a prop (the page passes it).
- `invoice-stats-card.tsx` — prop typed as `UIToolInvocation<InvoiceTools['getInvoiceStats']>`; switch on `part.state`: `input-streaming → null`, `input-available → <StatsSkeleton />`, `output-error → <StatsError />`, `output-available →` `'error' in part.output ? <StatsError /> :` the real card (title with optional filter hint from `part.input.status`, `count`, `totalAmount` currency-formatted, `byStatus` as a small dl, `oldestUnpaidDueDate` via Temporal `PlainDate` with a "—" fallback on null). `InvoiceStatsCard.Skeleton = StatsSkeleton`.
  - Callout: switch on `part.state` (not a destructured `state` — destructuring before the switch widens `part.output` away from the narrowed arm).
  - Callout: the per-tool skeleton over a generic spinner is the lesson 2 of chapter 107 rule; the shape conveys what is coming.
- `token-usage-panel.tsx` — `useEffect` polling `/api/usage` every 10s via `setInterval` cleared on unmount, with an `AbortController`; `useState<Usage | null>`; a bar colored by remaining (green > 50%, amber 10–50%, red < 10%). Mount it in the `/invoices` right-rail `<aside>` above `<InvoiceChat />`.
  - Rationale: the 10s interval is the simple default; a server-sent usage signal or an `onFinish`-triggered re-poll are named refinements.
- For the typed `UIMessage` and parts protocol, link to lesson 2 of chapter 107 and lesson 3 of chapter 106 rather than re-explaining; for the in-flight guard, link to chapter 079.
- Forward pointers (named once, not built): persisting `messages` on mount/`onFinish` for future surfaces; chapter 080's user/operator message split; chapter 082's security-baseline audit reaching for the `authedRoute` wrap and the closure-`orgId` rule; Unit 18's integration tests mocking the model via `MockLanguageModelV2` with the tool's `execute` unit-testable as a plain function; chapter 092's `llm_audit_events` as the operator-truth side; Unit 14's "90% of quota" notification through the dispatcher; lesson 3 of chapter 107's RAG as the next reach when questions outgrow aggregate tools.

### Moment of truth

Run `pnpm verify` to confirm the full surface typechecks and builds (there is no per-lesson test suite), then confirm behavior by hand:

- [ ] Acting as member-A, asking "how many overdue invoices do we have?" moves status `submitted` → `streaming` → `ready`, flashes the `InvoiceStatsCard.Skeleton` during `input-available`, renders the real card, then an assistant text bubble citing the count.
- [ ] A grep for `<Spinner` finds none in the chat tree; the loading shape is the per-tool skeleton.
- [ ] Hovering `part.output` in the `tool-getInvoiceStats` branch shows the projected shape, not `unknown`; `invoice-stats-card.tsx`'s prop is typed from the same `UIToolInvocation<InvoiceTools['getInvoiceStats']>` source.
- [ ] With "Force tool error" on, the card renders the destructive `output-error` message and the model's follow-up asks for a rephrase.
- [ ] The usage panel ticks up within 10s of a question and colors the bar by remaining budget.
- [ ] With "Force quota to 99,500" applied, one small question toasts the friendly message via `onError` and leaves the input enabled.
- [ ] Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat` in the network tab.
- [ ] Switching to org-globex (member) and asking the same question reflects org-globex's counts, with the audit row's `orgId` set to org-globex — the `scopedInvoices(ctx.orgId).active()` inside `execute` is the structural reason.
- [ ] Grep confirms the v5 shape and the seam: no `append(`, `reload(`, `message.content`, `ai/rsc`, or `streamUI`; hits for `sendMessage(`, `message.parts`, `DefaultChatTransport`; the only importers of `@/lib/llm/` are the two route handlers, `with-llm-quota.ts`, and `invoice-chat.tsx` (for the message type), with no Server Component importing the tools or the prompt.
