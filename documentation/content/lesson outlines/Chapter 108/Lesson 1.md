# Chapter 108 — Lesson 1 outline

## Lesson title

- Page title: **Project overview** (the chapter-outline title fits; sentence case, no markup).
- Sidebar title: **Overview**

## Lesson type

`Project overview` (first lesson of the project chapter; no feature built, no test-coder run).

## Lesson framing

The student leaves with the running skeleton of a production-shaped, LLM-backed SaaS surface — an "ask-your-invoices" chat in the `/invoices` right rail — and the mental model that makes the rest of the chapter senior work rather than glue: tools are the only doorway from the model into app state, the agentic loop is server-owned, cost is accounted per user, and the client is typed end-to-end. No code is written; the payoff is orientation — the student boots the chapter-062 invoices surface with the chat rail present-but-unwired, tours the in-memory store, the `src/lib/llm` seam, and the `/inspector` verification page, and understands which nine stubs they fill across Lessons 2–5 and why each lives where it does.

## Lesson sections

Section list per the **Project overview** contract: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No exercises, no tests.

### What we're building (intro, no header)

One paragraph naming the surface in user terms: in the right rail of `/invoices`, the user types a question about their organization's invoices and a tool-calling LLM answers, grounded in real `scopedInvoices` data, with a live panel showing how much of today's token budget remains. State the end-state of *this* lesson explicitly: the project boots locally with no database, no Docker, no auth wall — the seeded invoices list renders and the chat rail is present but unwired (the route handlers 404 until Lessons 2–4 write them). Name the running theme once, plainly: the model is treated as untrusted input.

Single figure: a `Screenshot` of the finished right-rail chat — a question typed, the tool-part skeleton flashing, the output card with real numbers, an assistant text bubble citing the count, and the usage panel ticking up. This is the finished-state target, not this lesson's boot state; caption it as such so the student isn't confused that their fresh boot looks emptier. The screenshot is produced later by the figure pipeline; brief it here.

### What we'll practice

Header: **What we'll practice**. A short bulleted list (skills, not features), lifted from the chapter-outline Lesson 1 "What we'll practice", framed as senior reflexes the student is installing:

- Wrapping a streaming LLM endpoint in the same auth boundary that guards every other mutation, so the model only runs for an authenticated org member.
- Treating the model as untrusted input: tools as the only doorway into app state, `orgId` from the server closure (never the model's arguments), aggregate projections instead of raw rows.
- Owning the agentic loop server-side with an explicit step cap rather than trusting a client or an SDK default.
- Accounting for cost per user per day and refusing gracefully when the budget is spent.
- Rendering a typed `useChat` surface where tool outputs are fully typed at the call site and each tool has its own loading shape.

Close with the transfer note (one sentence): this is the canonical 2026 shape for any LLM-backed SaaS surface — a future support assistant or onboarding helper reuses this skeleton with a different tool registry and prompt.

### Architecture

Header: **Architecture**. Shape only — the labeled-list form from the contract. Five layers, lifted from the chapter-outline Lesson 1 "Architecture", each one sentence naming the file(s) and the role:

- **Client** — `invoice-chat.tsx` (`useChat<InvoiceUIMessage>` via `DefaultChatTransport`) in the `/invoices` right rail, rendering text and `tool-getInvoiceStats` parts; `token-usage-panel.tsx` polling `/api/usage`.
- **Route** — `POST /api/chat` as `withLlmQuota(authedRoute('member', …))`: the quota wrapper reserves before the stream, then `streamText` with the tool-grounded system prompt, `stopWhen(stepCountIs(5))`, the tool registry, `onStepFinish` (quota increment + step audit), `onFinish` (aggregate audit).
- **Feature seam** — `src/lib/llm/{prompts,tools,quota,audit,with-llm-quota}.ts`, behind which the model never sees the store or an `orgId`; `models.ts` holds the bare AI Gateway model id.
- **Data** — chapter 062's `invoices` store array read through `scopedInvoices(orgId).active()`; the `usageQuota` and `llmAuditEvents` store arrays for accounting.
- **Inspector** — `/inspector`, a Server Component mirroring quota and audit state and offering the verification toggles.

Diagram decision: a `D2` `direction: right` system-architecture diagram in a `<Figure>` clarifies the request path the prose lists flatly — Client → Route (`withLlmQuota` wrapping `authedRoute` wrapping `streamText`) → tool `execute` → `scopedInvoices` → store, with the Inspector reading store state on the side. The value it carries that prose can't: it makes the *nesting* (`withLlmQuota` around `authedRoute` around the stream) and the one-doorway funnel (everything into the store passes through `scopedInvoices`) visually obvious. Keep it horizontal, cap height per the diagram guidelines. If the figure agent judges the labeled list sufficient, the list alone satisfies the contract — the diagram is a clarity add, not a requirement.

### Starting file tree

Header: **Starting file tree**. A `FileTree` showing the solution shape, annotated per the contract: comment one line only on files changed from chapter 062 or that lessons will touch; leave the rest uncommented; **bold** the nine TODO-stub files as the highlighted focus. Source the tree from the chapter-outline "Starting file tree" block. Mark, in their comments, which lesson writes each stub:

- `src/lib/llm/prompts.ts` **bold** — TODO(L2)
- `src/lib/llm/audit.ts` **bold** — TODO(L2)
- `src/app/api/chat/route.ts` **bold** — TODO(L2, extended L3/L4)
- `src/lib/llm/tools.ts` **bold** — TODO(L3)
- `src/lib/llm/quota.ts` **bold** — TODO(L4)
- `src/lib/llm/with-llm-quota.ts` — ships complete (provided seam; not a stub)
- `src/app/api/usage/route.ts` **bold** — TODO(L4)
- `src/app/(app)/invoices/invoice-chat.tsx` **bold** — TODO(L2 smoke-test, L5 full)
- `src/app/(app)/invoices/invoice-stats-card.tsx` **bold** — TODO(L5)
- `src/app/(app)/invoices/token-usage-panel.tsx` **bold** — TODO(L5)

Uncommented (carried intact from chapter 062, no annotation): the list surface (`table.tsx`, `toolbar.tsx`, `view-tabs.tsx`, `pagination.tsx`, `[id]/edit/*`, etc.), `store.ts`, `session.ts`, `scoped-query.ts`, `queries.ts`, `actions.ts`, `result.ts`, `authed-route.ts`, `authed-action.ts`, the shell.

After the tree, a short prose block (the "reference files worth reading before starting" list, condensed — these are *reads*, not edits, so they belong as prose not as bold tree focus):

- `src/lib/llm/models.ts` — one role-named handle, `chatModel = 'openai/gpt-5-mini'`, a bare AI Gateway `provider/model` string; the SDK routes it through the gateway and reads `AI_GATEWAY_API_KEY`, so no `@ai-sdk/openai` package. Swapping providers is a one-line change here.
- `src/server/store.ts` — the in-memory "Postgres": the `invoices` array plus the two new arrays `usageQuota` (keyed `(userId, day)`, the `usage_quota_daily` analogue) and `llmAuditEvents` (`event: 'llm.step' | 'llm.finish'`, the `llm_audit_events` analogue). Name each one's SQL lineage so the patterns transfer to a real backend.
- `src/server/session.ts` — the cookie-driven dev `getSession()`, default identity `org-acme:admin`; no auth wall, so every route renders.
- `src/server/inspector-flags.ts` — `BYPASS_AUTHED_ROUTE`, `MODEL_FROM_INPUT_ORGID`, `FORCE_TOOL_ERROR`, all default off; these drive the later Moments of truth.
- `app/(app)/invoices/page.tsx` — the chapter-062 list view plus the right-rail `<aside>` rendering `<TokenUsagePanel />` and `<InvoiceChat />`.
- `package.json` — `ai@^5`, `@ai-sdk/react@^2` (no `@ai-sdk/openai`); note the v5 import paths.
- `src/env.ts` — `AI_GATEWAY_API_KEY` as `z.string().min(1)`, server-only; `skipValidation` on outside production so `pnpm verify` stays green without a real key.
- The `/inspector` page end-to-end — row counts, identity switcher, audit tail, usage counter, force-quota button, force-tool-error toggle, LLM audit-events tail, forge-orgId explainer, the two debug flags.

One closing sentence on the seeded state that later lessons exercise: member-A's `usageQuota` row is seeded at 90,000 tokens today (with a near-cap "yesterday" row proving the daily key resets), so a couple of small questions cross the cap deterministically without spending much.

Use `Code` for any inline snippet (e.g. the `chatModel` line); the tree itself is `FileTree`, not a code block. No `AnnotatedCode` needed here — nothing is being walked through step-by-step.

### Roadmap

Header: **Roadmap**. `CardGrid` with one `Card` per build lesson (Lessons 2–5), each titled with the lesson number and short title and one sentence naming what it adds. Source from the chapter-outline Lesson 1 "Roadmap":

- **Lesson 2 — Streaming route under auth.** Adds `POST /api/chat`: `streamText` wrapped in `authedRoute('member')`, capped at 5 steps, streaming text-only answers.
- **Lesson 3 — The org-scoped tool.** Adds `getInvoiceStats`, so the chat answers questions grounded in real `scopedInvoices` aggregates.
- **Lesson 4 — The daily token quota.** Adds the `withLlmQuota` reservation, per-user-per-day token accounting, and the typed 429 refusal when the budget is spent.
- **Lesson 5 — Typed client and usage panel.** Adds the typed `useChat` surface rendering tool parts across four states with a per-tool skeleton, plus the live usage panel.

### Setup

Header: **Setup**. A `Steps` component with the exact command sequence, then the env-var note, then the expected result. Per the contract, the first step must direct the student to the starter.

Steps:
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 108/start/`.
2. Install dependencies: `pnpm install`.
3. Start the dev server: `pnpm dev` — `/invoices` and `/inspector` render with no login, no database, and no key needed for the shell. The store seeds deterministically on first import.

Note (Aside or plain prose): there is no Docker, no migration, no seed script — the data lives in `src/server/store.ts` and re-seeds via the inspector's "Reset and re-seed" control.

Environment variables:
- `AI_GATEWAY_API_KEY` — server-only key the model handle reads; needed only for the live-chat Moments of truth in Lessons 2–5 (the streamed answer, the 429, the forged-orgId proof, the step-ceiling demo). Obtain it from the Vercel AI Gateway dashboard, copy `.env.example` to `.env`, paste it in. No test, build, or rendered check makes a live model call, so `pnpm verify` is green without a key.

Expected result (one sentence per the contract): on success `/invoices` renders the seeded list with the right-rail chat panel present, and `/inspector` loads with the seeded member-A usage row and an empty LLM audit-events tail; `POST /api/chat` and `GET /api/usage` 404 until their handlers are written. The lesson ends here — the project runs locally.

Use `Code` for command blocks (these are setup commands, simple blocks).

## Scope

- **No technology rationale or teaching of the SDK primitives** (`streamText`, `useChat`, `tool`, `stopWhen`, the parts protocol, `InferUITools`). Those were taught in chapters 105–107 and are *applied* in Lessons 2–5; the overview only names them. Per the contract, technology rationale belongs in regular lessons, not the overview.
- **No code is written and no feature is built.** Each of the nine stubs is owned by a later lesson: `prompts.ts` + `audit.ts` + `route.ts` (Lesson 2), `tools.ts` (Lesson 3), `quota.ts` + `with-llm-quota.ts` + `usage/route.ts` (Lesson 4), the three client components (Lesson 5). The overview points at them, does not explain them.
- **No deep per-file walkthrough of the chapter-062 surface** (the list, optimistic concurrency, nuqs URL state). That is the prior project's material; this chapter assumes the student can reproduce it. Reference chapter 062, do not re-teach.
- **No quiz** (project chapters use the project as the assessment).
