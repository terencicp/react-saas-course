# Chapter 108 — Lesson 5 outline

## Lesson title

- Page title: **Typed useChat, tool parts, and the usage panel** (chapter-outline title fits — keep).
- Sidebar (short): **Typed client and usage panel**

## Lesson type

`Implementation`

(No per-lesson test suite — this project's verification is `pnpm verify` + a manual checklist. The test-coder does **not** run for this lesson; the writer renders the Implementation section list but the "Moment of truth" command is `pnpm verify`, not `pnpm test:lesson 5`.)

## Lesson framing

The student installs the canonical 2026 reflex for the *client* half of an LLM surface: a `useChat` typed end-to-end by `InferUITools`, so tool outputs narrow at the call site with zero `as` casts, and a parts-array render that switches on `part.type`/`part.state` to give each tool its own loading shape — a card-shaped skeleton, not a generic spinner. They ship the final UI on top of the route, tool, and quota already standing: text bubbles, a four-state `getInvoiceStats` card, a friendly quota-refusal toast, a double-submit gate, and a polling token-usage panel. Walking away, they own the type contract that makes a typed chat client honest and the per-tool-state UX that makes it feel finished — the skeleton reusable for any future tool registry.

## Codebase state

**Entry.** Lessons 2–4 are done: `POST /api/chat` is `withLlmQuota(authedRoute('member', …))` running `streamText` with the tool-grounded prompt, `stopWhen(stepCountIs(5))`, `maxOutputTokens: 1024`, `onStepFinish` (quota increment + step audit), `onFinish` (finish audit); `buildInvoiceTools`/`InvoiceTools`/`InvoiceUIMessage` exist in `lib/llm/tools.ts`; `quota.ts`, `with-llm-quota.ts`, and `GET /api/usage` are live. The chat is still driven by the Lesson-2 **smoke-test** `invoice-chat.tsx` (a textarea bound to `useState`, messages rendered as raw text). The three real client stubs are unfilled: `invoice-chat.tsx` (smoke-test version to replace), `invoice-stats-card.tsx` (`TODO(L5)`), `token-usage-panel.tsx` (`TODO(L5)`). `page.tsx` already imports and mounts `<TokenUsagePanel />` and `<InvoiceChat orgName={…} />` in the right-rail `<aside>` (the mount is provided; the components are stubs).

**Exit.** The full client ships: `invoice-chat.tsx` is the typed `useChat<InvoiceUIMessage>` rendering text parts and `<InvoiceStatsCard {...part} />` across four states with a `submitted`-state "Thinking…" line, a local-`useState` input, an in-flight + empty-input submit guard, and an `onError` toast; `invoice-stats-card.tsx` switches on `part.state` (skeleton / null / error / real card) with `InvoiceStatsCard.Skeleton` exposed; `token-usage-panel.tsx` polls `/api/usage` every 10s with `AbortController` + `setInterval` cleanup and a threshold-colored bar. Both happy path (skeleton → card → text bubble) and unhappy paths (tool error card, quota toast, double-submit gate) work live. This is the final lesson — the project is complete.

## Lesson sections

Implementation type. Sections in contract order.

### Goal + Finished result (intro, no header)

- One-sentence goal in user terms: replace the smoke-test box with the real chat UI — typed `useChat` rendering text bubbles and invoice-stats cards across every tool-part state, plus a panel showing how much of today's token budget is left.
- One-paragraph description of the feature working: asking "how many overdue invoices do we have?" flashes a card-shaped skeleton, renders the real numbers, then the assistant text bubble citing the count; the quota refusal surfaces as a friendly toast.
- A `Screenshot` (or one figure) of the finished right rail: usage bar above the chat, a stats card with real numbers, an assistant bubble. Reuse / crop the Lesson-1 finished-app figure if available.

### Your mission (h2)

Coherent prose (no subsection headers, no implementation hints), then a single requirements `Checklist` (no chips — this project has no automated tests, so the tested/untested split does not apply; every item is a hand-verified outcome confirmed in Moment of truth).

Prose threads to weave (user terms, decisions-first):
- The type contract is the whole point: `useChat<InvoiceUIMessage>` carries the `InferUITools` generic (107 L2), so in the `tool-getInvoiceStats` branch `part.output` is the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` shape (a union with the `{ error }` arm), not `unknown`, and no `as` casts are needed — without the generic every switch branch needs a cast.
- Input state is a local `useState` — the v5 change from v4's auto-managed input. The submit handler guards on `status === 'streaming' || status === 'submitted'` plus an empty-input guard to block double-submits (same in-flight gate `useTransition` gives in chapter 079).
- Render walks `messages.map → parts.map` switching on `part.type`: `text` → a bubble, `tool-getInvoiceStats` → `<InvoiceStatsCard {...part} />` (spread the **whole** part so the discriminated `state`/`input`/`output` narrow inside the card), `default → null` so unknown/transient part types degrade gracefully (107 L2's "always have a default case").
- The stats card takes the whole `UIToolInvocation` and switches on `part.state` across all four states; `input-available` renders a per-tool, card-shaped skeleton (`InvoiceStatsCard.Skeleton`), not a generic `<Spinner />` — the skeleton's shape conveys what is coming. `output-available` guards `'error' in part.output` to fall to the error message.
- The usage panel polls `/api/usage` every 10s in the one allowed `useEffect` (polling an external system), with `AbortController` + `setInterval` cleared on unmount, coloring the bar by remaining budget. Name once that 10s is the simple default for a personal-quota surface; a team billing dashboard would want a sharper signal.
- The quota refusal surfaces through `useChat`'s `onError` as a sanitized toast while the input stays enabled; rendering a distinct `quota_exceeded` message by parsing the body is a named refinement, not the default.
- Resist persisting `messages` — scoped to in-memory chat state; a refresh loses the conversation (persistence is a named forward pointer).
- The chat lives in the `/invoices` right rail (co-located with the data it discusses), not a separate `/chat` route — the UX call.

Checklist items (each one verifiable outcome, phrased as the outcome — no files/exports):
1. Asking "how many overdue invoices do we have?" moves status `submitted → streaming → ready`, flashes a card-shaped skeleton during `input-available`, renders the real numbers, then an assistant text bubble citing the count.
2. The loading affordance is the per-tool stats-card skeleton (card layout with stat slots), with no generic spinner anywhere in the chat tree.
3. In the `tool-getInvoiceStats` branch, `part.output` is the projected `{ count, totalAmount, byStatus, oldestUnpaidDueDate }` type (union with the `{ error }` arm), not `unknown`, end-to-end.
4. A tool-error part (`output-error`, or `output-available` whose output carries `{ error }`) renders the destructive "I couldn't load those stats" message rather than a broken card.
5. The usage panel reflects accumulated usage within its 10s poll window, coloring the bar by remaining budget.
6. Triggering the quota refusal toasts the friendly message while the input stays enabled.
7. Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat`.
8. The client is the v5 shape — `sendMessage`, `message.parts`, locally managed input, `DefaultChatTransport` — with no `append`, `reload`, `message.content`, or `ai/rsc`.

### Coding time (h2)

One line directing the student to implement the full `invoice-chat.tsx`, `invoice-stats-card.tsx`, and `token-usage-panel.tsx` against the brief (the panel + chat are already mounted in `page.tsx`'s `<aside>`), then the reference walkthrough hidden in `<details>` (writer wraps in `<details>`).

Organize the reference exactly as the repo: three files, in build order chat → card → panel.

**`invoice-chat.tsx`** — present with `Code` (full file is ~100 lines but reads top-to-bottom; if focus-splitting is needed use `AnnotatedCode` on the `useChat` call + the `parts.map` switch only). Cover:
- `'use client'`; `useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }), onError: () => toast.error('Something went wrong. Try again.') })` — destructures `messages`, `sendMessage`, `status`. Callout: the endpoint is on the **transport** — `@ai-sdk/react@2` removed the top-level `api` option from `useChat`.
- Local `const [input, setInput] = useState('')` (v5 no longer manages input) — link the v5 input change to 106 L3 rather than re-explaining.
- `inFlight = status === 'streaming' || status === 'submitted'`; `onSubmit` `preventDefault`s, returns early when `inFlight || input.trim() === ''`, calls `sendMessage({ text: input })`, clears input. Callout: this is the same in-flight gate as chapter 079 — link, don't re-teach. The Send button is also `disabled={inFlight}`.
- Render: `messages.map((message) => …)` keyed by `message.id`, role label, then `message.parts.map((part, index) => switch(part.type))` with `text` → `<p className="whitespace-pre-wrap">`, `tool-getInvoiceStats` → `<InvoiceStatsCard key={…} {...part} />`, `default → null`. Key is `${message.id}-${index}`. A `status === 'submitted'` "Thinking…" line.
- Takes `orgName: string` as a prop (the page passes it from `organizations.find(...)?.name`).
- Callout: spreading `{...part}` (not passing `state`/`input`/`output` as separate props) is what preserves the discriminated narrowing inside the card.

**`invoice-stats-card.tsx`** — this is the file where student focus must be directed at the switch and the narrowing, so present the `InvoiceStatsCard` switch with `AnnotatedCode` (steps: prop type `UIToolInvocation<InvoiceTools['getInvoiceStats']>` → `input-streaming → null` → `input-available → <StatsSkeleton />` → `output-error → <StatsError />` → `output-available` with the `'error' in part.output` guard and the real card). Present the `StatsSkeleton`/`StatsError`/format helpers with plain `Code`. Cover:
- Prop typed `StatsInvocation = UIToolInvocation<InvoiceTools['getInvoiceStats']>` — the **same source** the chat narrows from, so the card's prop type can't drift from the message type.
- Callout: switch on `part.state` directly, **not** a destructured `const { state } = part` — destructuring before the switch widens `part.output` away from the narrowed arm (this is a real type-narrowing trap worth a one-line callout).
- `input-streaming → null` (the args are still streaming, nothing useful to show yet); `input-available → <StatsSkeleton />`; `output-error → <StatsError />`; `output-available →` guard `'error' in part.output ? <StatsError /> :` destructure `{ count, totalAmount, byStatus, oldestUnpaidDueDate }`, read `part.input.status` for an optional filter hint in the title.
- The card body: `count` (`tabular-nums`), `totalAmount` via `Intl.NumberFormat` currency (USD), `byStatus` as a small `<dl>` over `Object.entries`, `oldestUnpaidDueDate` via Temporal `PlainDate.from(iso).toLocaleString(...)` with a `"—"` fallback on null — link Temporal to Unit 17 rather than re-explaining.
- `StatsSkeleton`: card-shaped, built from shadcn `<Skeleton />`, stat slots mapped over a stable `['count','total','oldest'] as const` tuple (callout: the string-key tuple keeps Biome's `noArrayIndexKey` happy — a tiny but real lint constraint). `InvoiceStatsCard.Skeleton = StatsSkeleton` so the loading shape is reusable.
- Callout: per-tool skeleton over a generic spinner is the 107 L2 rule — link, state the principle once (the shape conveys what is coming; a 5-tool chat would have 5 skeletons).

**`token-usage-panel.tsx`** — plain `Code`. Cover:
- `'use client'`; `useState<Usage | null>`; the single `useEffect` polling `/api/usage`: `AbortController`, an async `poll()` that `fetch`es with `signal`, sets state on `res.ok`, swallows transient/aborted failures; `void poll()` once then `setInterval(() => void poll(), 10_000)`; cleanup aborts the controller and clears the interval. Callout: this is the **one allowed `useEffect`** — polling an external system (the React-effects discipline from the React unit) — link, don't re-litigate.
- Derive `used`/`cap`/`remaining` with `??` fallbacks; `remainingFraction = remaining / cap`; `barColor` thresholds (green > 0.5, amber 0.1–0.5, red < 0.1); width `Math.min(100, round(used/cap*100))%`; `motion-reduce:transition-none` on the bar.
- Rationale (one line): 10s interval is the simple default; a server-sent usage signal or an `onFinish`-triggered re-poll are the named refinements.

**`page.tsx`** — note (one line, no full re-listing): the mount is already provided — `<aside>` holds `<TokenUsagePanel />` above `<InvoiceChat orgName={orgName} />`, two grid children only (list region + rail). The student does not edit `page.tsx` in this lesson; it ships wired in `start/`. (If the start stub differs, the writer should confirm — per the code outline `page.tsx` is **not** among the nine reverted stubs, so it ships complete.)

Link-don't-explain register: typed `UIMessage` + parts protocol + tool-part lifecycle → 107 L2 and 106 L3; in-flight guard → chapter 079; Temporal formatting → Unit 17; `useEffect`-for-external-systems → the React unit.

Forward pointers (named once at the end of the walkthrough, not built): persisting `messages` for future surfaces; chapter 080's user/operator message split; chapter 082's security-baseline audit reaching for the `authedRoute` wrap and the closure-`orgId` rule; Unit 18's integration tests mocking the model via `MockLanguageModelV2` with `execute` unit-testable as a plain function; chapter 092's `llm_audit_events` as the operator-truth side; Unit 14's "90% of quota" notification through the dispatcher; 107 L3's RAG as the next reach when questions outgrow aggregate tools.

(External resources, if any, appended here after the `<details>` with no header — added later by the resourcer.)

### Moment of truth (h2)

No per-lesson test suite. Command: `pnpm verify` (Biome CI + `tsc --noEmit` + `next build` with `SKIP_ENV_VALIDATION=true`) to confirm the full surface typechecks and builds — show the expected green output. Then a manual `Checklist` (use `chip="untested"` on every item — there is no automated coverage, so all are hand-verified). Note the live chat checks need `AI_GATEWAY_API_KEY` set in `.env`.

Items:
1. Acting as member-A, asking "how many overdue invoices do we have?" moves status `submitted → streaming → ready`, flashes the `InvoiceStatsCard.Skeleton` during `input-available`, renders the real card, then an assistant text bubble citing the count.
2. A grep for `<Spinner` finds none in the chat tree; the loading shape is the per-tool skeleton.
3. Hovering `part.output` in the `tool-getInvoiceStats` branch shows the projected shape, not `unknown`; the card's prop is typed from the same `UIToolInvocation<InvoiceTools['getInvoiceStats']>` source.
4. With the inspector's "Force tool error" on, the card renders the destructive `output-error` message and the model's follow-up asks for a rephrase. Revert.
5. The usage panel ticks up within 10s of a question and colors the bar by remaining budget.
6. With "Force quota to 99,500" applied, one small question toasts the friendly message via `onError` and leaves the input enabled. Reset and re-seed after.
7. Clicking Send twice rapidly while a request is in flight produces only one `POST /api/chat` in the network tab.
8. Switching to org-globex (member) and asking the same question reflects org-globex's counts, with the audit row's `orgId` set to org-globex — `scopedInvoices(ctx.orgId).active()` inside `execute` is the structural reason.
9. Grep confirms the v5 shape and the seam: no `append(`, `reload(`, `message.content`, `ai/rsc`, or `streamUI`; hits for `sendMessage(`, `message.parts`, `DefaultChatTransport`; the only importers of `@/lib/llm/` are the two route handlers, `with-llm-quota.ts`, and `invoice-chat.tsx` (for the message type), with no Server Component importing the tools or the prompt.

## Scope

This lesson builds only the **client** surface and its read endpoint consumption. It does not cover:
- The streaming route, the agentic loop, or the system prompt — Lesson 2.
- The `getInvoiceStats` tool, the closure-over-`orgId` rule, or the per-step audit — Lesson 3.
- The quota module, `withLlmQuota`, token accounting, or the `/api/usage` endpoint itself — Lesson 4.
- The tool-part lifecycle states and `InferUITools` as concepts (rendered here, taught) — lesson 2 of chapter 107.
- The `useChat`/`DefaultChatTransport`/parts-protocol primitives — lesson 3 of chapter 106.
- Persisting chat history, RAG, and the operator/observability split — named as forward pointers only (chapters 080 / 092, Unit 18, 107 L3).

## Components used

- `Code` — `invoice-chat.tsx`, `token-usage-panel.tsx`, the skeleton/error/format helpers, and the `pnpm verify` output block.
- `AnnotatedCode` — the `InvoiceStatsCard` `part.state` switch (focus the student on each state's render and the narrowing trap); optionally the chat's `useChat` call + `parts.map` switch.
- `CodeTooltips` — optional, on the `useChat<InvoiceUIMessage>` line and the `UIToolInvocation<…>` prop to show the inferred output type inline (`{ count, totalAmount, byStatus, oldestUnpaidDueDate } | { error }`).
- `Checklist` + `ChecklistItem` — the "Your mission" requirements (no chips) and the "Moment of truth" manual checklist (`chip="untested"`). Distinct `id`s.
- `Screenshot` / `Figure` — the finished right-rail figure in the intro.
- No diagram needed: the four-state lifecycle is owned by 107 L2 and the `AnnotatedCode` switch carries the state→render mapping; prose plus the annotated card is sufficient.
