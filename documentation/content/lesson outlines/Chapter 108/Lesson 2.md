# Chapter 108 — Lesson 2 outline

## Lesson title

Keep: **Streaming route under auth with the agentic loop**. Fits — it names the route, the boundary, and the loop control, which are exactly the three things installed here.

Sidebar (short): **Streaming route under auth**

## Lesson type

`Implementation`

(No per-lesson test suite ships for this project — the `lesson-verification/` slot is a harness stub, not a green gate. Verification is `pnpm verify` + a hand checklist. The test-coder still runs but produces no asserting suite; the Moment of truth is build-typecheck + manual checks. Flagged as feedback below.)

## Lesson framing

The student installs the spine every later lesson hangs off: a `POST /api/chat` route handler that streams an LLM answer only for an authenticated org member, with the agentic loop capped server-side before any tool exists. The senior payoff is the reflex **cap and wrap first, then add capability** — `authedRoute('member')` is the load-bearing wrapper and `stopWhen(stepCountIs(5))` plus `maxOutputTokens` are non-negotiable cost caps set *before* tools can run, so capability can never be added without its guardrails already in place. They also internalise the system-prompt-as-controller posture (force tool-grounding, refuse cross-org, treat user messages as untrusted input) and the two v5 stream seams (`convertToModelMessages`, `toUIMessageStreamResponse`).

## Codebase state

**Entry.** The Lesson 1 starter runs: `/invoices` renders the seeded chapter-062 list with the right-rail chat panel present but inert, `/inspector` loads with member-A's seeded ~90k usage row and an empty LLM audit-events tail. The nine LLM stubs carry `TODO(L<n>)` markers; `with-llm-quota.ts` and `authed-route.ts` ship complete. `src/app/api/chat/route.ts` is a 501 stub. `prompts.ts` returns a one-line placeholder; `audit.ts`'s two writers are no-ops; `tools.ts` already exports `InvoiceUIMessage` (over an empty tool map) so client code typechecks. `invoice-chat.tsx` is a disabled, non-interactive shell. `POST /api/chat` 404/501s.

**Exit.** `src/lib/llm/prompts.ts` returns the four-rule tool-grounded controller; `src/lib/llm/audit.ts`'s `writeLlmStepEvent`/`writeLlmFinishEvent` push real `llm.step`/`llm.finish` rows; `src/app/api/chat/route.ts` is `authedRoute('member', …)` running `streamText` (no tools yet) capped at `stepCountIs(5)` + `maxOutputTokens: 1024`, with an `onFinish` audit write and a sanitized `onError`; `invoice-chat.tsx` is a throwaway typed `useChat` smoke-test bound to a textarea rendering messages as raw text. Acting as member-A, typing a question streams a text answer; `BYPASS_AUTHED_ROUTE` makes the route refuse 401; a cross-org question is refused in the answer text; one `llm.finish` row lands in the inspector tail. The route still has no tool registry, no `onStepFinish`, and no `withLlmQuota` wrap (Lessons 3 and 4).

## Lesson sections

Implementation contract order. Intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Intro (no header) — Goal + Finished result

One-sentence goal in user terms: wire `POST /api/chat` so an authenticated org member can type a question and stream a text answer back, with the loop capped and the request refused for anyone else. Then a one-paragraph description of the working slice (no screenshot needed — output is a raw-text chat box): acting as member-A, typing "tell me a joke about invoices" streams text into a temporary box; `BYPASS_AUTHED_ROUTE` yields 401; one `llm.finish` row appears in the inspector tail. Note the chat is a throwaway smoke-test client — the real parts-rendering UI is Lesson 5.

### Your mission

Prose, woven per the contract — no subsection headers, no implementation hints, then the requirements checklist as the only list.

Open with the capability in project terms: the streaming endpoint and its guardrails, built before any tool can read a row. Then weave in the senior decisions and traps the brief pre-empts:

- **The cap-and-wrap reflex.** `authedRoute('member')` is the load-bearing wrapper; calling `streamText` from a bare `POST` is the canonical bug class (answers any caller, burns tokens, has no `orgId` to scope by). `authedRoute` is the `Request`/`Response` sibling of chapter 057's `authedAction` — streaming responses must be route handlers, not Server Actions.
- **The step cap goes in now, before tools exist.** `stopWhen(stepCountIs(5))` pre-empts the runaway-loop window that opens the moment tools land; the SDK default `stepCountIs(20)` is too loose for a surface with a per-user cost ceiling. `maxOutputTokens: 1024` rides alongside it — a missing output cap is the same severity as a missing auth check.
- **The system prompt is the controller**, not a greeting: it forces tool-grounding ("always call getInvoiceStats before any numeric fact"), refuses cross-org questions, defines tool-error behavior, and treats user messages as untrusted input (the org name is templated in; user text stays in `messages` — the prompt-injection rule).
- **Two v5 stream seams.** `convertToModelMessages` translates the client's `UIMessage[]` rendering shape into the model's `ModelMessage[]` wire shape (skipping it is the v5-onboarding bug); `toUIMessageStreamResponse()` makes the response a stream `useChat` parses (not `toTextStreamResponse()`, a different protocol).
- **Name the validation trade.** The input schema accepts `z.array(z.unknown())` on purpose — Zod-validating the full `UIMessage` shape is heavy and the converter does the real validation; name the trade rather than over-validating.
- **Audit lineage.** The two writers are append-only `pushLlmAuditEvent` calls into the `llmAuditEvents` store array — a different table from chapter-062's `auditLogs`, so not `pushAudit`, but the same one-row-per-event discipline from chapter 057 lesson 5. Against real Postgres these are single inserts into `llm_audit_events`.

Constraints to name: streaming forces a route handler (not an action); `onError` returns a sanitized log and never leaks raw errors to the client. Out of scope (one line): the tool registry + per-step audit (Lesson 3), the `withLlmQuota` quota wrap + token increment (Lesson 4), the typed parts-rendering client (Lesson 5).

Requirements checklist — render with `Checklist`/`ChecklistItem`, each item tagged. Tests don't assert here (no suite); tag every item `[untested]` and note they are confirmed by hand. Items, phrased as outcomes:

1. Typing a question (e.g. "tell me a joke about invoices") streams a text answer back into the temporary chat box. `[untested]`
2. With `BYPASS_AUTHED_ROUTE` on, `POST /api/chat` is refused with 401 and the model never runs. `[untested]`
3. A question asking for another org's data is refused in the answer text (system prompt as controller). `[untested]`
4. Every completed conversation writes exactly one `llm.finish` row (with `finishReason: 'stop'`) to the LLM audit-events tail, scoped to the acting org. `[untested]`

### Coding time

One line directing the student to implement against the brief, then the hidden `<details>` reference. The writer wraps the solution in `<details>`.

Build prompt: implement `src/lib/llm/prompts.ts`, `src/lib/llm/audit.ts`, `src/app/api/chat/route.ts`, and the throwaway smoke-test `src/app/(app)/invoices/invoice-chat.tsx` against the brief, then read the walkthrough.

Reference solution, organised as it appears in the repo. Files in build order:

1. **`src/lib/llm/prompts.ts`** — `Code`. The single `invoiceQAPrompt({ orgName })` export: four newline-joined rules (scope to `orgName`; always call `getInvoiceStats` before numeric facts; refuse cross-org; on a tool `{ error }`, say stats are unavailable rather than invent numbers). `import 'server-only'`. Rationale callout (one sentence): the org name is templated in but user input stays in `messages` — the prompt-injection boundary.

2. **`src/lib/llm/audit.ts`** — `Code`. `writeLlmStepEvent` and `writeLlmFinishEvent`, each an append-only `pushLlmAuditEvent` (`event: 'llm.step' | 'llm.finish'`, jsonb-shaped `payload`). Cover the `[untested]` organisation choices: these are a different table from `auditLogs` so not `pushAudit`; the one-row-per-event discipline carries from chapter 057 lesson 5 (link, don't re-explain). Note `writeLlmStepEvent` is defined here but only wired in Lesson 3 — built now because both writers live in one file.

3. **`src/app/api/chat/route.ts`** — `AnnotatedCode` (multiple parts need student focus: the wrapper, the org-name fetch, the `streamText` config, the callbacks). Show the **Lesson-2 version** — `authedRoute('member', schema, fn)` *without* the `tools` arg, *without* `onStepFinish`, *without* the `withLlmQuota` wrap and *without* the `addUsage`/`writeLlmStepEvent` calls that the final solution file carries. Explicitly callout that the final `route.ts` in the repo has more (tools, per-step audit, quota wrap) which arrives in Lessons 3–4 — the student should not be alarmed the reference file differs from this slice. Steps to annotate:
   - The `authedRoute('member', z.strictObject({ messages: z.array(z.unknown()) }), …)` shape — route handler, not action; `ctx` is flat (`ctx.userId` / `ctx.orgId`, never `ctx.user.id`).
   - The org-name fetch the context doesn't carry: `const org = await ctx.db.query.organization.findFirst({ where: (o) => o.id === ctx.orgId }); const orgName = org?.name ?? 'your organization';` — callout: `ctx.db.query.organization.findFirst` is a store facade shaped like Drizzle's `db.query.*`.
   - `streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), stopWhen: stepCountIs(5), maxOutputTokens: 1024, … })` — callout: `stopWhen` is set with no tools to call yet, so the cap isn't exercised this lesson; it's set first on purpose. Callout: the two cost caps (`stopWhen` + `maxOutputTokens`) are non-negotiable.
   - `onFinish` → `writeLlmFinishEvent({ userId, orgId, finishReason, usage })`; `onError` → sanitized `console.error`, no raw leak.
   - `return result.toUIMessageStreamResponse()` — callout: not `toTextStreamResponse()`, a different protocol `useChat` can't parse.

4. **`src/app/(app)/invoices/invoice-chat.tsx`** (smoke-test version) — `Code`. `'use client'`; `useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`; a textarea bound to local `useState`; submit calls `sendMessage({ text: input })`; messages render as raw text (`message.parts.map` over `text` parts only, or simplest possible rendering). Callout: the endpoint is on the transport — `@ai-sdk/react@2` removed `useChat`'s top-level `api` option. Note this is throwaway scaffolding; Lesson 5 replaces it with the typed parts-rendering client. `InvoiceUIMessage` already imports cleanly from `tools.ts`'s start stub (empty tool map), so this typechecks before Lesson 3 builds the real tool.

For topics owned by regular lessons, link rather than re-explain: `convertToModelMessages` and the `UIMessage` parts protocol → chapter 106 lesson 3; `streamText` / `toUIMessageStreamResponse` / `onError` sanitization → chapter 106 lesson 1; `authedRoute` → chapter 057 lesson 3; the append-only audit discipline → chapter 057 lesson 5; Zod 4 `strictObject` → chapter 042.

External resources slot (no header, after the `<details>`) is the resourcer's later — leave a placeholder note only.

### Moment of truth

State plainly: this project ships no per-lesson test suite (the `lesson-verification/` directory is a harness slot, not a green gate). The command is `pnpm verify` (Biome CI + `tsc --noEmit` + `next build` with `SKIP_ENV_VALIDATION=true`) — expected output: green typecheck and successful build with no real key. Then a `Checklist` the student ticks by hand (mirrors the four mission requirements):

- [ ] Acting as member-A, typing "tell me a joke about invoices" streams a text answer into the smoke-test box.
- [ ] With the inspector's `BYPASS_AUTHED_ROUTE` flag on, `POST /api/chat` returns 401 from `authedRoute`; the model never ran. Revert.
- [ ] Asking for another organization's data is refused in the answer text.
- [ ] After one conversation, the inspector's LLM audit-events tail shows exactly one `llm.finish` row with `finishReason: 'stop'`, scoped to org-acme.

Note these checks need `AI_GATEWAY_API_KEY` set (the live-model Moments); `pnpm verify` itself is green without a key.

## Scope

Does **not** cover:
- The `getInvoiceStats` tool, the closure-over-`orgId` rule, the aggregate `outputSchema`, or per-step `onStepFinish` audit — **Lesson 3**.
- The `withLlmQuota` reserve-before-spend wrap, `quota.ts`, the `onStepFinish` token increment, or `/api/usage` — **Lesson 4**.
- The typed parts-rendering `useChat` client, the `InvoiceStatsCard` four-state card, the per-tool skeleton, and the polling usage panel — **Lesson 5**.
- `streamText` / `useChat` / parts-protocol fundamentals — taught in **chapter 106**; reference, don't re-teach.
- `authedRoute` internals — taught in **chapter 057 lesson 3**.
```