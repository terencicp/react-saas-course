# Chapter 108 — Lesson 3 outline

## Lesson title

The org-scoped `getInvoiceStats` tool

Title from the chapter outline fits — it names the single artifact built and the load-bearing property (org-scoped). Keep it.

- Page title: `The org-scoped getInvoiceStats tool`
- Sidebar (short): `Org-scoped tool`

## Lesson type

`Implementation`

(Test-coder does NOT run — this project ships no per-lesson test suite. Verification is `pnpm verify` plus a by-hand checklist against the inspector. The writer renders the Implementation section list.)

## Lesson framing

The student installs the project's single most important senior rule structurally, not by convention: the LLM is untrusted input, and the only doorway from the model into tenant data is a tool whose `execute` closes over `ctx.orgId` from the route's auth boundary — `orgId` is absent from the tool's `inputSchema`, so a forged tool-call argument cannot cross tenants. They turn the chat from a text generator into a grounded analyst by adding `getInvoiceStats`: a Zod-contracted tool that reads `scopedInvoices(orgId).active()`, projects a minimal aggregate (not raw rows) back to the model, and returns-don't-throws on failure. Wiring it into the route adds the per-step audit seam. The payoff is the reflex that the tenancy boundary lives in the closure, the cost boundary in the projection, and the failure boundary in a typed return — none of them in the model's hands.

## Codebase state

### Entry

The Lesson 2 slice is in place: `POST /api/chat` exists as `authedRoute('member', z.strictObject({ messages: z.array(z.unknown()) }), fn)` running `streamText` with the tool-grounded system prompt (`invoiceQAPrompt`), `stopWhen(stepCountIs(5))`, `maxOutputTokens: 1024`, `onFinish` writing one `'llm.finish'` row, and `onError` sanitizing. No tools are passed yet, so the loop never branches and answers are text-only. `src/lib/llm/prompts.ts` and `src/lib/llm/audit.ts` are written (both audit writers exist; only `writeLlmFinishEvent` is wired). `src/lib/llm/tools.ts` is still a `TODO(L3)` stub. The smoke-test `invoice-chat.tsx` from Lesson 2 (textarea + raw-text render) is the only client. Provided seams untouched by the student and available: `scopedInvoices(orgId).active()/.archived()/.includingDeleted()` (`src/lib/invoices/scoped-query.ts`), the inspector flags `FORCE_TOOL_ERROR` / `MODEL_FROM_INPUT_ORGID` via `getFlag` (`src/server/inspector-flags.ts`), `Invoice` type, the inspector page with its row-count and audit-tail panels and the two flag toggles.

### Exit

`src/lib/llm/tools.ts` exports `buildInvoiceTools({ orgId })` (the `getInvoiceStats` tool), `InvoiceTools`, and `InvoiceUIMessage`. `src/app/api/chat/route.ts` builds `const tools = buildInvoiceTools({ orgId: ctx.orgId })` per request, passes `tools` to `streamText`, and adds `onStepFinish` writing one `'llm.step'` row per step via `writeLlmStepEvent`. The chat now answers numeric questions with real `scopedInvoices` aggregates; a multi-step conversation produces N `'llm.step'` rows + 1 `'llm.finish'` row; the cross-tenant leak is provably impossible without flipping `MODEL_FROM_INPUT_ORGID`. Still out: `withLlmQuota` is not wrapped, `onStepFinish` does NOT yet call `addUsage` (Lesson 4), and the typed parts-rendering client (`InvoiceStatsCard`) does not exist (Lesson 5) — so tool parts still render as nothing useful in the smoke-test box; the by-hand checks read the inspector panels and network tab.

## Lesson sections

Implementation type — section order: Goal + Finished result (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: give the chat a single tool, `getInvoiceStats`, so it answers questions grounded in real invoice aggregates rather than guessing. Then a one-paragraph description of the feature working: asking "how many overdue invoices do we have?" returns a number that matches the store, and a forged `orgId` in the model's tool-call arguments cannot reach another org's data. No screenshot needed (the typed card UI is Lesson 5; here the proof is the inspector panels and the answer text). Prose only.

### Your mission

Header: `Your mission`. Written as the contract's coherent brief — opening prose, then one requirements checklist, no subsection headers, no implementation hints. Use a `Checklist` with `ChecklistItem`s tagged via the chip.

Prose weaves:

- **Feature** (user terms): the chat reads real invoice aggregates for the current org through one tool and grounds every numeric claim in them.
- **The senior rule (load-bearing):** the model is untrusted input. The tool is built per request by `buildInvoiceTools({ orgId: ctx.orgId })`; `orgId` is **never** in `inputSchema`, so the model cannot pass, fake, or request another org's data — `execute` closes over `ctx.orgId` from `authedRoute`. The inspector's `MODEL_FROM_INPUT_ORGID` flag exists precisely to make the cross-tenant leak visible if you break this.
- **Constraint — return minimal:** `outputSchema` projects an aggregate (`count`, `totalAmount`, `byStatus`, one date), not raw rows. Feeding rows back to the model would compound input tokens across loop steps and leak invoice numbers, amounts, and customer names the model never needs. Project at the tool boundary, not the rendering boundary.
- **Constraint — return don't throw:** a `try/catch` around the read returns `{ error: 'stats_unavailable' as const }` on failure; the SDK accepts it because it serializes. The inspector's `FORCE_TOOL_ERROR` flag exercises this deterministically. Programmer errors (bad types, undefined refs) still bubble — those are bugs, not user-facing failures.
- **The SDK validates `inputSchema` before `execute` runs** — an invented status outside the enum becomes an `output-error` the model can read and react to, no manual guard needed.
- **Route delta:** wiring the tool adds the per-step audit seam — `onStepFinish` writes one `'llm.step'` row per step, so a 3-step loop produces 3 step rows + 1 finish row.
- **Out of scope (one line):** the typed parts-rendering client (`InvoiceStatsCard`, Lesson 5) and the token-counting half of `onStepFinish` (`addUsage`, Lesson 4); the Lesson 2 smoke-test client stays.

Requirements checklist (each a verifiable outcome, tagged):

1. `[untested]` Asking "how many overdue invoices do we have?" returns a count matching the seed's overdue active rows for org-acme, confirmed against the inspector's row-count panel.
2. `[untested]` Asking "what's our total paid this month?" returns a total matching a reduce over the active paid rows.
3. `[untested]` A message asking the model to "use orgId = org-globex" still returns org-acme's data; flipping `MODEL_FROM_INPUT_ORGID` and repeating shows the leak — proving the closure is the structural reason it's safe.
4. `[untested]` A recursion-prone prompt produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap.
5. `[untested]` With "Force tool error" on, a stats question produces a tool part in `output-error` and a follow-up text answer asking to rephrase, with no 500 in the network tab.
6. `[untested]` Each conversation writes one `'llm.step'` row per loop step plus one `'llm.finish'` row, scoped to the active org.

(All `[untested]` — no automated suite; the student ticks each off by hand against the inspector/network tab. The chip should read `untested` so the writer renders it accurately and the student isn't waiting for a green gate.)

### Coding time

Header: `Coding time`. One line directing the student to implement `src/lib/llm/tools.ts` and wire it into `src/app/api/chat/route.ts` against the brief and confirm by hand, then read the reference walkthrough. The full walkthrough goes in a `<details>` (writer wraps it; collapsed by default).

Inside `<details>`, two files in repo order:

**`src/lib/llm/tools.ts`** — the full `buildInvoiceTools` factory. Use `AnnotatedCode` here: the file is one dense block where student focus must land on distinct parts in sequence — (a) the `inputSchema` and its deliberate absence of `orgId`, (b) the `outputSchema` aggregate projection, (c) the `execute` closure over `ctx.orgId` and the `scopeOrgId` branch, (d) the `try/catch` returning `{ error: 'stats_unavailable' as const }`, (e) the `InvoiceTools` / `InvoiceUIMessage` type exports. Steps and rationale:

- `'server-only'` import at top — the tool never reaches the client bundle.
- `inputSchema: z.strictObject({ status: z.enum(['draft','sent','paid','overdue']).optional(), since: z.iso.date().optional() })` — **callout:** `orgId` is absent on purpose; this is the load-bearing line. `strictObject` rejects unknown keys (same Zod 4 discipline as chapter 042).
- `outputSchema: z.strictObject({ count, totalAmount, byStatus: z.record(z.string(), z.number().int()), oldestUnpaidDueDate: z.iso.date().nullable() })` — the minimal aggregate; rationale (one line): projecting here caps input-token growth across loop steps and keeps row-level PII off the wire.
- `execute`: order of branches matters — `FORCE_TOOL_ERROR` returns the error shape first; then `scopeOrgId = getFlag('MODEL_FROM_INPUT_ORGID') ? (input.orgId ?? ctx.orgId) : ctx.orgId` (default path is always `ctx.orgId`); then `scopedInvoices(scopeOrgId).active()` with optional `status`/`since` filters; reduce over `rows` for `totalAmount`, `byStatus`, and `oldestUnpaidDueDate` (oldest non-paid dued row). The whole body sits in `try/catch` returning `{ error: 'stats_unavailable' as const }`.
  - **Rationale (one line):** the `{ error }` discriminant widens the inferred return union, but the SDK accepts it because it serializes — this is the "return don't throw" contract.
  - **Untested-requirement coverage:** the `since` filter uses an `isoDate(inv.createdAt)` slice-to-day helper so date comparison is lexicographic on `YYYY-MM-DD`; `byStatus` uses a typed reduce accumulator; `oldestUnpaidDueDate` narrows with a type guard (`inv is Invoice & { dueAt: string }`) before comparing, returning `null` when none. Name these as the non-obvious organization choices.
  - **Callout (looks unusual at a glance):** `query.take(Number.MAX_SAFE_INTEGER)` — the scoped-query builder is keyset/pagination-shaped (chapter 062), so an explicit large `take` materializes all rows for the aggregate; link to chapter 062 for the builder rather than re-explaining.
- Type exports: `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>` and `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>` — the client imports only `InvoiceUIMessage`. Link the typed-`UIMessage`/`InferUITools` mechanism to lesson 2 of chapter 107 rather than re-explaining.

**`src/app/api/chat/route.ts`** — show the delta from Lesson 2, not the whole file rewritten. Use `CodeVariants` (before = Lesson 2 route, after = this lesson's route) or a focused `Code` block showing only the changed lines with a one-line lead-in. The two changes: (1) `const tools = buildInvoiceTools({ orgId: ctx.orgId })` built per request before `streamText`, passed as `tools`; (2) add `onStepFinish: async ({ usage, toolCalls, finishReason }) => writeLlmStepEvent({ userId: ctx.userId, orgId: ctx.orgId, finishReason, usage, toolCalls })`.

- **Callout:** `onStepFinish` here does the step-audit write **only**. The `addUsage` token increment lives alongside it but is a Lesson 4 addition — do not add it now. (Important: the committed solution route already contains `withLlmQuota(...)` wrapping and the `addUsage` line; the writer must present the Lesson-3 route WITHOUT those, matching the Entry/Exit state above. Flag this clearly so a code sample copied verbatim from the solution doesn't leak Lesson 4 work into Lesson 3.)
- **Callout:** `tools` is built per request (closes over the request's `ctx.orgId`), never module-level — a module-level tool would close over a stale or wrong org.
- For the tool/loop primitives (`tool`, `stopWhen`, `stepCountIs`, the agentic loop), link to lesson 1 of chapter 107; for `scopedInvoices`, link to chapter 062; for the append-only audit discipline, link to lesson 5 of chapter 057.

No external resources expected for this lesson (the resourcer appends them here later if any; no header).

### Moment of truth

Header: `Moment of truth`. No `pnpm test:lesson 3` — this project has no per-lesson suite. The command is `pnpm verify` (Biome CI + `tsc --noEmit` + `next build` with `SKIP_ENV_VALIDATION=true`); expected output: clean typecheck and a successful build (no green test summary). State plainly that verification here is `pnpm verify` for the slice's type/build health plus the by-hand checklist below (live model checks need `AI_GATEWAY_API_KEY` in `.env`).

By-hand checklist (`Checklist` / `ChecklistItem`, each ticked as confirmed; mirrors the chapter outline's Lesson 3 list):

1. Asking "what's our total paid this month?" returns a total matching a reduce over org-acme's active paid rows; the assistant text bubble cites it. (If the model answers with no `tool-getInvoiceStats` part, sharpen the system prompt — the prompt is the lever for instruction-following, not the code.)
2. With `MODEL_FROM_INPUT_ORGID` off, asking the model to use `orgId = org-globex` still yields org-acme's numbers; flipping the flag, switching to org-globex, and repeating shows org-globex's numbers — the worst class of LLM-in-SaaS bug. Revert the flag.
3. A recursion-prone prompt produces at most five `tool-getInvoiceStats` parts and a final message acknowledging the cap; removing `stopWhen` and repeating shows the loop running to the SDK default. Revert.
4. With "Force tool error" on, a stats question shows the `output-error` state and a rephrase prompt from the model, with no 500 in the network tab. Revert.
5. After a multi-step conversation, the inspector's LLM audit-events tail shows one `'llm.step'` row per step plus one `'llm.finish'` row, all scoped to the active org.

(Reference the inspector controls by the names in the chapter outline's Inspector page spec: `MODEL_FROM_INPUT_ORGID` toggle, "Force tool error" toggle, identity switcher, `llm_audit_events` tail, row-count panel.)

## Scope

- **Token accounting / `addUsage` in `onStepFinish`, the quota wrapper, `/api/usage`, the 429 refusal** — Lesson 4 (the per-user daily token quota). This lesson wires `onStepFinish` for step-audit only and leaves the route un-wrapped.
- **The typed parts-rendering client (`InvoiceStatsCard` across four states, the per-tool skeleton, the typed `useChat` render loop) and the usage panel** — Lesson 5. Tool parts here are only inspected via the inspector/network tab, not rendered as cards.
- **The system prompt, `prompts.ts`, `audit.ts`, the base streaming route, `convertToModelMessages` / `toUIMessageStreamResponse`, `authedRoute`** — Lesson 2 (and lesson 3 of chapter 106 / lesson 3 of chapter 057). This lesson treats them as in-place; it does not re-teach them.
- **The tool/loop SDK primitives (`tool`, `inputSchema`/`outputSchema`, `execute` server-side, `stopWhen`, the agentic loop, projecting minimal results, return-don't-throw)** — taught in lesson 1 of chapter 107; link, don't re-explain.
- **The typed `UIMessage` / `InferUITools` mechanism** — lesson 2 of chapter 107; link.
- **`scopedInvoices` and the keyset builder** — chapter 062; link.
- **RAG / vector search as the next reach when questions outgrow aggregate tools** — lesson 3 of chapter 107; a one-line forward pointer at most, not built here.
