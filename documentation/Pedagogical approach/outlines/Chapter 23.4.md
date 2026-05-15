## Concept 1 — System topology: who runs where and who can be lied to

**Why it's hard.** Students new to LLM builds conflate three execution contexts: the model (third-party, untrusted, expensive), the route handler (their server, trusted, holds `orgId` and DB), and the client (renders parts, never sees credentials). Without the topology fixed early, every later rule ("`orgId` from closure not input", "tools as the only doorway", "system prompt as controller") reads as trivia instead of the obvious consequence of who's running what.

**Ideal teaching artifact.** A scrubbable annotated topology diagram — four labeled zones (Browser, Next.js route, OpenAI, Postgres) and a stepped sequence advancing one hop at a time as the student scrubs forward: user types question → client `useChat` POSTs `UIMessage[]` → `authedRoute` resolves `ctx.user` and `ctx.orgId` from the session cookie → `streamText` calls OpenAI with the system prompt and conversation → model emits a tool call → SDK runs `execute` server-side with `ctx.orgId` from closure → Drizzle aggregate against `invoiceScope(orgId).active()` → projected result back to model → model writes text → SSE chunks back to client → parts array updates. At each step the diagram tags the zone in one of three trust colors (trusted / semi-trusted / hostile) and highlights which secrets and identifiers exist in that zone. This is the *Concept* archetype carrying the chapter's orientation load — the student leaves with a mental picture every later rule snaps onto.

**Engagement.** A Buckets sort after the scrub: a list of facts ("`orgId`", "OpenAI API key", "user's question text", "DB connection", "tool-call arguments invented by the model", "system prompt string") dropped into three columns — *lives only on server*, *crosses the wire trusted*, *crosses the wire hostile*. Sorting forces the student to commit to the trust boundaries before any code lands.

**Components.**
- New: `TrustTopology` — a scrubbable four-zone topology diagram with a step slider and per-step trust-color highlighting of which zones hold which artifacts. Inputs: zones (label, trust class), artifacts (label, trust class, lives-in), steps (active arrow set + active artifacts). Forward-link: every later AI-surface lesson and every chapter that crosses a third-party boundary (payments in 13, auth in 9–10, search in 15).
- Alternative if not built: a hand-SVG four-zone diagram wrapped in `Figure` plus a `DiagramSequence` whose panels are successive states of the same SVG with the active arrow / artifact highlighted per step.
- Recall: `Buckets` for the trust-zone sort.

**Project link.** This topology is the project's verification surface — the inspector's "Forge orgId" and `BYPASS_AUTHED_ROUTE` toggles only make sense once the student can name which zone each artifact lives in.

---

## Concept 2 — Cap first, then add capability: `authedRoute` wraps `streamText` before tools exist

**Why it's hard.** The instinct is to wire the model first, see it work, then layer auth on top. That order produces the canonical bug — a `streamText` callable by anonymous traffic, no `orgId` in context, tokens burned, no audit trail. The chapter's reflex is the inverse: wrap, cap, then add capability. The student needs to feel the cost of the reverse order, not just be told.

**Ideal teaching artifact.** A *Pattern* archetype rendered as a wrong-by-default before/after. Tab 1 shows `route.ts` with a bare `streamText` inside an unwrapped `POST` — runs, streams, looks fine. The lesson then names three things that have already gone wrong: no caller identity, no `orgId`, the model will run for any unauthenticated curl. Tab 2 wraps the same body in `authedRoute({ role: 'member', schema, fn })` with `stopWhen(stepCountIs(5))` set before any tool is defined, and adds the `onFinish` audit write. The diff is small; the consequence is large. The lesson names that the default SDK cap is `stepCountIs(20)` and why that's too loose for a per-user quota surface — capacity has to be capped before it's granted.

**Engagement.** `Tokens` on the wrapped route, asking the student to click the four load-bearing pieces: `authedRoute`, the `role: 'member'` argument, `stopWhen(stepCountIs(5))`, and `convertToModelMessages`. Decoys include `streamText` itself, the `system` arg, and `result.toUIMessageStreamResponse()` — all real, none of them the *boundary*. Forces the student to distinguish "the API" from "the seam that holds the API safe".

**Components.**
- `CodeVariants` with two tabs — *unwrapped* and *wrapped* — and prose under each naming what the wrap buys.
- `Tokens` for the recall.

**Project link.** Lesson 23.4.3 lands this directly; the verify lesson's `BYPASS_AUTHED_ROUTE` toggle is the runtime proof.

---

## Concept 3 — Server-owned agentic loop via `stopWhen`

**Why it's hard.** "Agentic loop" sounds like client behavior to students coming from front-end-first work. They expect a `maxSteps` prop on `useChat` or an iteration count somewhere on the client. The truth is the opposite: the loop runs entirely inside `streamText` on the server, and the only client-visible signal is `status` plus the parts array growing. A runaway loop without `stopWhen` is a cost incident, not a UX bug.

**Ideal teaching artifact.** A *Mechanics*-meets-*Concept* live simulator. The student sees a small interactive widget — a "step ceiling sandbox" — with a single slider (`stopWhen(stepCountIs(N))` from 1 to 20) and a pre-recorded recursion-prone conversation. As the student moves the slider, a stepped transcript renders the model's loop terminating at step N: tool call → projected output → tool call → projected output → ... → "I've hit my step limit, here's my best answer." A small token-cost counter below the transcript updates as the slider moves, so dragging from 5 to 20 visibly multiplies the cost. The student feels the difference between "cap I set" and "cap the SDK defaulted to" without spending a real cent.

**Engagement.** A `PredictOutput`-style question after the simulator: given a transcript and a `stopWhen` value, predict the final `finishReason` (`'stop'` vs `'tool-calls'` vs the step-cap reason). Two rounds, one where the cap binds, one where it doesn't.

**Components.**
- New: `AgenticLoopSimulator` — a slider-driven widget rendering a stepped pre-canned conversation with a token-cost counter. Inputs: a fixture transcript (array of `{ role, parts, usage }`), min/max step counts, cost-per-1k-tokens. Forward-link: useful any time a future chapter teaches a server-owned iteration cap (queue retries in 18, webhook replay in 13). If those forward-links don't materialize, downgrade to the alternative.
- Alternative if not built: a `DiagramSequence` whose frames are pre-rendered loop states at each `stopWhen` value, paired with a static table of cost-vs-cap.
- Recall: `PredictOutput`.

**Project link.** The verify lesson's "Step ceiling demo" button in the inspector exercises this live against the real route.

---

## Concept 4 — Tools as the only doorway: `orgId` from closure, never from input

**Why it's hard.** The model is a stranger who will write convincing JSON. Given the chance to invent a tool argument called `orgId`, it will, especially under prompt-injection. Students conditioned on "validate your inputs with Zod" reach for `inputSchema: z.strictObject({ orgId: z.string().uuid(), ... })` and a server-side `tenantDb(input.orgId)` call. That looks safe and is in fact the worst class of LLM-in-SaaS bug — cross-tenant data leak rubber-stamped by Zod. The structural fix is to remove `orgId` from the model's vocabulary entirely: it lives in the closure `execute` captures from the route's auth context.

**Ideal teaching artifact.** A *Pattern* archetype framed as a misconception-first ambush. Open with a code block showing the naive shape — `orgId` in `inputSchema`, `tenantDb(input.orgId)` inside `execute`. Ask the student to spot the bug before any prose names it. Then a forge-the-call panel — the student edits a JSON payload representing the model's tool-call arguments and tries to inject `orgId = "<other-org-uuid>"`. Two side-by-side mini-routes run the same payload: the *unsafe* route reads `input.orgId` and returns the other org's aggregate; the *safe* route ignores the field because `orgId` comes from a closure over `ctx.orgId` and the `inputSchema` doesn't even define `orgId` (strict mode would reject it; in lax mode the field is silently dropped). The student watches the same forged payload return two different answers. Then the safe shape is the only shape left on screen.

**Engagement.** A short `MultipleChoice` — "Where should `orgId` come from inside the tool's `execute`?" with four plausible options (the model's tool-call input after Zod validation; a hidden field in the system prompt; the closure capturing `ctx` from `authedRoute`; a header on the route's `Request`). Only one correct.

**Components.**
- New: `ToolBoundaryForge` — a two-panel widget. Left panel: the student edits a JSON tool-call payload. Right panel: two mini-result cards showing what each version of `execute` returns (one reads `input.orgId`, one ignores it). Inputs: a fixture dataset of two orgs' aggregates keyed by `orgId`, an editable JSON payload. Forward-link: any tenancy-scoped boundary lesson (10.1, 10.2.3, 11.3) where "the caller is hostile" is the same shape — reusable. Build candidate.
- Alternative if not built: `CodeVariants` with three tabs (*naive — orgId in input*, *safe — orgId from closure*, *what the forged payload does to each*) plus a `Figure`-wrapped hand-SVG showing the trust boundary the closure draws.
- Recall: `MultipleChoice`.

**Project link.** The inspector's `MODEL_FROM_INPUT_ORGID` toggle plus the "Forge orgId" panel are the runtime form of this exact widget; the lesson seeds the mental model so the verify pass clicks.

---

## Concept 5 — Aggregate projection: the model never sees raw rows

**Why it's hard.** With Drizzle in hand the obvious move is to return the rows the user asked about. That looks like a fine `outputSchema` and produces correct answers on the first turn. It also doubles input tokens on the second step (the model now re-sees every row in the conversation) and quietly leaks per-row fields — customer names, individual amounts, IDs — that the question didn't need. The senior reflex is to project at the tool boundary: shapes carry counts, sums, breakdowns, never rows.

**Ideal teaching artifact.** A *Decision* artifact: a side-by-side token-cost comparison of two `outputSchema` definitions over the same three-step conversation. Schema A returns `z.array(z.object({ id, status, amount, dueDate, customerName }))`. Schema B returns `z.strictObject({ count, totalAmount, byStatus, oldestUnpaidDueDate })`. A small fixture runs both through a three-step loop; a stacked bar shows input vs output tokens per step for each schema. Schema A's input tokens balloon by step 2 because the row payload re-enters context; Schema B's stay flat. The lesson names the second cost — Schema A puts customer names in front of the model on every subsequent turn, which is a different conversation about data minimization, not cost.

**Engagement.** `Buckets`: given a question ("how many overdue?", "show me the three oldest unpaid invoices", "what's the total paid this quarter?"), sort each into *aggregate tool answers it* vs *aggregate doesn't fit; needs a list-tool with limit*. Forces the student to recognize when projection has crossed from discipline into wrong tool.

**Components.**
- `Figure` wrapping a hand-SVG stacked-bar chart comparing token counts across two schemas. Single-use, no widget needed — the comparison is static.
- `CodeVariants` with the two `outputSchema` definitions side by side.
- Recall: `Buckets`.

**Project link.** `getInvoiceStats` ships Schema B; the lesson is the reason the chapter's tool isn't `listInvoices`.

---

## Concept 6 — Return don't throw: typed errors the model can read

**Why it's hard.** Server-side `execute` looks like any other async function, and the reflex is to let exceptions propagate — the route's error handler will catch them. In an agentic loop that's wrong: a thrown exception aborts the step, the model gets no signal it can react to, the user sees a stack-trace toast. The right shape returns a discriminated `{ error: 'stats_unavailable' as const }` shape the model reads in the next step ("explain and ask the user to rephrase") and the UI renders as `state: 'output-error'`. Errors are values, not control flow, *especially* across an LLM boundary.

**Ideal teaching artifact.** A *Pattern* archetype, wrong-then-right. Tab 1: `execute` that lets Drizzle throw. The lesson narrates what the loop sees — step aborted, no tool result, the model has nothing to react to, the loop terminates with `finishReason: 'error'`, the UI's chat tree gets stuck on a generic spinner. Tab 2: the same `execute` wrapped in `try { ... } catch (e) { return { error: 'stats_unavailable' as const } }`. The lesson traces what the loop sees now — the tool result is a value, the model reads it, the system prompt's "if a tool returns `{ error }`, explain and ask the user to rephrase" line fires, the UI's `output-error` branch renders a destructive-styled card. The error is part of the conversation, not a 500. Inline note on what *doesn't* get caught — programmer errors (bad Drizzle types, undefined refs) still bubble; this isn't a blanket swallow.

**Engagement.** A `TrueFalse` round with five statements: "throwing aborts the step", "throwing produces a `tool-getInvoiceStats` part in `output-error` state" (false — the part doesn't transition; the step itself errors), "the model can react to a returned `{ error }` value", "the route's `onError` handler is the right place to recover from a tool failure" (false — too late), "the `as const` on the error tag is what makes the discriminant narrow at the rendering boundary".

**Components.**
- `CodeVariants` with two tabs (*throws*, *returns*) and a `Figure`-wrapped hand-SVG of the loop's step sequence under each, showing where the chain breaks vs continues.
- `TrueFalse` for recall.

**Project link.** The inspector's "Force tool error" toggle is the runtime form; verify lesson watches the `output-error` branch render.

---

## Concept 7 — Reserve-then-increment: the quota lifecycle

**Why it's hard.** Per-user-per-day token quotas sound like a counter and a comparison. The lifecycle is more subtle: the cap has to be checked *before* the model spins up (an over-cap user shouldn't burn a single token), but tokens only become known *during* the run (`onStepFinish` is the seam the SDK gives), and the final step that pushes a user over the cap is charged in arrears. The student needs to internalize the three-phase shape — *reserve* (cheap, before stream), *increment* (per step, as tokens consumed), *check next request* (post-cap requests are rejected with a typed `quota_exceeded`). And they need to feel the trade — a daily soft-cap with sub-cent variance is fine; a hard rate limit on dollars wouldn't be.

**Ideal teaching artifact.** A *Concept* artifact rendered as a stepped timeline. The student scrubs through a single request's lifecycle: t=0 `reserveQuotaOrRefuse` returns `{ ok: true }` because today's row exists and `tokens_used = 99,800 < 100,000` → t=1 `streamText` begins → t=2 step 1 finishes, `usage.inputTokens + usage.outputTokens = 180`, `addUsage` writes `tokens_used = 99,980` → t=3 step 2 finishes, +220 tokens, `tokens_used = 100,200` (*over cap, but the request completes*) → t=4 next request: `reserveQuotaOrRefuse` returns `{ ok: false, error: { code: 'quota_exceeded', ... } }`, route returns 429. A second scrub track shows the alternate world where `reserveQuotaOrRefuse` runs *after* `streamText` — the cap doesn't bind until the first step, every over-cap request burns a step. The lesson names the trade explicitly: the chapter picks the soft-cap shape, names what would change for a hard limit (pre-reserve a budget, refund on `onFinish`).

The second beat is necessary here: the *Pattern* of the SQL primitives. Show `reserveQuotaOrRefuse` as `INSERT ... ON CONFLICT DO NOTHING` (idempotent row creation) then a `SELECT ... < cap` comparison. Two round-trips, deliberately — the senior trade names that a single `INSERT … ON CONFLICT DO UPDATE … RETURNING` would be one round-trip but obscure. Readability wins for a daily quota at human-scale write rates.

**Engagement.** `Sequence` — drag the five lifecycle steps into the right order (reserve, stream begins, `onStepFinish` increments, `onFinish` writes aggregate audit, next request hits `reserveQuotaOrRefuse`). Then a follow-up `MultipleChoice` on the trade: "Why not check the quota inside `onStepFinish` instead of before `streamText`?" with the correct answer naming that an over-cap caller would still burn the first step.

**Components.**
- New: `QuotaLifecycleScrubber` — a two-track scrubbable timeline. Inputs: a sequence of events (`{ t, event, used, cap }`), two configurations of `reserveQuotaOrRefuse` placement. Forward-link: any future rate-limit / billing-meter lesson (Stripe metered billing in 13; per-org API key rate limit in 17 or 18). Build candidate if those forward-links land.
- Alternative if not built: `DiagramSequence` whose panels are pre-rendered states of the timeline, plus a `Figure` with a small two-row table showing the *reserve-before* vs *reserve-after* outcomes.
- `Code` for the SQL primitives.
- Recall: `Sequence` then `MultipleChoice`.

**Project link.** Lesson 23.4.4 wires this end-to-end; the inspector's "Force quota to 99,500" button is the runtime probe.

---

## Concept 8 — The parts protocol and the tool-part lifecycle

**Why it's hard.** Coming from v4 (or from a chat-bubble-shaped mental model in general), students expect `message.content` — a string. v5's `UIMessage` is a *parts array*, and a single assistant turn can contain a text part, then a `tool-getInvoiceStats` part transitioning through four states (`input-streaming` → `input-available` → `output-available` → `output-error`), then another text part. The render isn't "show the message"; it's "iterate the parts, switch on `type`, then switch on `state` for tool parts". The student needs to see the parts array *grow over time* to feel why a state machine is the right rendering model.

**Ideal teaching artifact.** A *Mechanics* artifact rendered as a real-artifact replica: a live transcript inspector that plays back a recorded conversation frame-by-frame. The student scrubs a slider from 0% to 100% of the conversation's wall-clock; on the left, the parts array (raw JSON, formatted) grows item by item with state transitions highlighted (`state: 'input-streaming'` → `'input-available'` flashes); on the right, the rendered chat UI updates in lockstep, the skeleton appearing during `input-available`, the card flipping in at `output-available`. The state machine isn't a diagram of abstract boxes — it's the literal `state` field changing on the literal `part` the student sees. Mid-scrub the lesson asks: "what would the UI render right now if you missed the `default` case in the switch?" — answer: nothing, which is the point of always having a default fallback.

**Engagement.** A `Matching` drill — four part states on the left (`input-streaming`, `input-available`, `output-available`, `output-error`), four UI behaviors on the right (render nothing; render the per-tool skeleton; render the stats card with real data; render the destructive-styled error). Single-pass.

**Components.**
- New: `PartsTimelinePlayer` — a scrubbable transcript player. Inputs: a fixture conversation (array of `{ t, message }` snapshots), the same render function the lesson's UI uses. Forward-link: any future streaming-UI surface lesson (background-job progress in 18, dispatcher events in 14). Build candidate.
- Alternative if not built: `DiagramSequence` whose panels are six successive snapshots of the parts array side-by-side with the rendered UI (JSON on the left, UI on the right) — much cheaper, still shows the growth.
- Recall: `Matching`.

**Project link.** Lesson 23.4.5 is the implementation; the inspector's "Conversation transcript panel" is the runtime form of the player.

---

## Concept 9 — End-to-end typing via `InferUITools`

**Why it's hard.** Without the type wiring, `part.output` is `unknown` at the rendering boundary, and every branch of the switch needs an `as` cast or runtime parsing. With it, hovering `part.output` in the `case 'tool-getInvoiceStats'` branch shows `{ count: number; totalAmount: number; byStatus: Record<string, number>; oldestUnpaidDueDate: string | null }`. The contract flows from one source (`outputSchema` on the tool definition) to two consumers (the route's `execute` return type, the client's part-render switch) without restating the shape anywhere. Students who haven't internalized "the schema is the contract" reach for duplicate type definitions and lose the link.

**Ideal teaching artifact.** A *Concept* artifact: a type-flow diagram showing the contract's single source and three destinations. One box at the top — `outputSchema: z.strictObject({...})`. Arrows down to: (1) `execute`'s return type (must match), (2) `InvoiceTools = ReturnType<typeof buildInvoiceTools>`, (3) `InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>`. From `InvoiceUIMessage`, arrows to: `useChat<InvoiceUIMessage>` in the client, the `part.output` slot in the parts switch, the `InvoiceStatsCard` props. Hover any node and the diagram highlights every node that derives from it. The lesson follows the diagram with a `TypeCoding` exercise: given the `outputSchema` and the `useChat` generic, the student writes the `case 'tool-getInvoiceStats'` branch and a Twoslash `^?` check confirms `part.output` is the projected shape, not `unknown`.

**Engagement.** The `TypeCoding` exercise *is* the assessment for this concept — the artifact is the diagram, the engagement is the type check. Follow with a single `Tokens` click asking the student to point at the source of truth in the `tools.ts` file (the `outputSchema` line, not the type alias, not the `InferUITools` invocation).

**Components.**
- `Figure` wrapping a hand-SVG type-flow diagram with one source and four derived nodes. Static layout — no interactivity is load-bearing here; the diagram conveys *connectivity*, and `TypeCoding` carries the active part.
- `TypeCoding` for the live assessment.
- `Tokens` for the source-of-truth click.

**Project link.** The verify lesson's hover-and-confirm step (IDE shows the projected shape, not `unknown`) is the runtime payoff of the diagram.

---

## Concept 10 — Per-tool skeleton over generic spinner

**Why it's hard.** A generic spinner reads as "something is loading" and conveys nothing about what's about to appear. A per-tool skeleton — a card-shaped placeholder with stat-block slots in the same layout as the real card — reads as "*this specific shape* is about to appear here," and the layout doesn't reflow when the data arrives. The senior reflex is shape-aware loading states; the student instinct is `<Spinner />` everywhere. The cost is small per use and compounding across tools.

**Ideal teaching artifact.** A *Pattern* artifact: side-by-side comparison of two chat UIs answering the same question, played back from a fixture. Left UI uses `<Spinner />` during `input-available`; right UI uses `<InvoiceStatsCard.Skeleton />`. The student plays both at once with a single timeline scrubber; the left UI shows the spinner, then the card pops in and the surrounding layout jumps; the right UI shows the skeleton in the card's exact footprint, then the skeleton's slots fill with real values in place. The visual difference is small per frame and obvious over the whole animation. The lesson then names the second consequence — the skeleton's shape is information for the user about what's coming.

**Engagement.** `MultipleChoice`: "Why does the chapter's stats card use a shape-matched skeleton instead of a centered spinner?" with three plausible reasons (a) it conveys the shape of the answer; (b) it prevents layout shift when the data arrives; (c) it's required by `useChat` — the third is the decoy, the first two are both correct (multi-select mode).

**Components.**
- `TabbedContent` with two panels — *spinner UI* and *skeleton UI* — each containing a small replay component or, more simply, an animated GIF / video loop captured from the real `/invoices` surface.
- Alternative (cleaner): a `Figure` with two side-by-side embedded autoplaying short videos comparing the two loading states.
- Recall: `MultipleChoice`.

**Project link.** Lesson 23.4.5's `<InvoiceStatsCard.Skeleton />` and the grep-for-`<Spinner` step in verify enforce this directly.

---

## Component proposals

- **`TrustTopology`** — scrubbable four-zone topology diagram with per-step trust-color highlighting of which artifacts live where.
  - Uses in this chapter: Concept 1.
  - Forward-links: every chapter crossing a third-party trust boundary (Stripe in 13, OAuth in 9, search providers in 15, observability sinks in 20). Strong reuse.
  - Leanest v1: static four-zone hand-SVG inside a `Figure`, plus a `DiagramSequence` whose frames swap which arrows and artifacts are highlighted. The "trust colors" can be CSS classes on the SVG. If v1 lands well, the bespoke version's only added value is the slider; ship v1 first.

- **`AgenticLoopSimulator`** — slider-driven widget rendering a stepped pre-canned conversation with a token-cost counter, parameterized by `stopWhen(stepCountIs(N))`.
  - Uses in this chapter: Concept 3.
  - Forward-links: queue retry caps in Unit 18, webhook replay caps in 13, any "iteration bound" lesson. Plausible but not guaranteed — depends on whether those chapters lean on a similar simulator.
  - Leanest v1: a `DiagramSequence` of five pre-rendered loop transcripts at `N = 1, 3, 5, 10, 20` with a token-cost subtitle baked in. Loses live slider feel; keeps the core insight.

- **`ToolBoundaryForge`** — two-panel widget where the student edits a JSON tool-call payload and watches two `execute` implementations (one reads `input.orgId`, one ignores it) return different aggregates.
  - Uses in this chapter: Concept 4.
  - Forward-links: every tenancy-boundary lesson (10.1, 10.2, 11.3) can use the same "hostile caller forges input" frame. Strong reuse if back-applied; otherwise single-use forward.
  - Leanest v1: `CodeVariants` with three tabs (*naive*, *safe*, *forged payload run against each*) plus a single static comparison table showing the two return values. No live editing; the misconception still ambushes.

- **`QuotaLifecycleScrubber`** — two-track scrubbable timeline contrasting *reserve-before-stream* vs *reserve-after-stream* across a multi-step request and the next request that hits cap.
  - Uses in this chapter: Concept 7.
  - Forward-links: Stripe metered billing in 13 (per-event accounting), per-org rate limits in 17/18. Likely.
  - Leanest v1: `DiagramSequence` with eight panels split into two rows (one row per configuration) showing `tokens_used` ticking up step by step. Loses the side-by-side scrub feel; keeps the trade-off legible.

- **`PartsTimelinePlayer`** — scrubbable conversation player rendering raw `UIMessage[]` JSON on the left and the live chat UI on the right at each timestamp.
  - Uses in this chapter: Concept 8.
  - Forward-links: every future streaming-UI surface — background job progress in 18, dispatcher events in 14, any SSE-driven page. Strong reuse for an AI-heavy curriculum.
  - Leanest v1: `DiagramSequence` of six pre-rendered snapshots, JSON on the left, UI on the right. The growth-over-time feel survives; the smooth scrub doesn't.

## Build priority

The three components carrying the most teaching load across this chapter *and* the curriculum are, in order:

1. **`PartsTimelinePlayer`** — the parts protocol is the load-bearing v5 mental model and reappears across every streaming surface the course teaches. The diff between the v1 (`DiagramSequence` of snapshots) and the full widget is meaningful for one specific failure mode — feeling state transitions happen smoothly — but v1 already teaches the parts-array shape. Build v1 first, upgrade if a second AI-streaming chapter wants the smooth scrub.
2. **`ToolBoundaryForge`** — the closure-`orgId` rule is the chapter's most important line, and the misconception-first ambush only fully works when the student edits the payload themselves. The forward reuse against tenancy lessons is real if applied. Build the full widget here; the leaner v1 loses the active-participation beat that makes the misconception stick.
3. **`TrustTopology`** — orients the entire chapter and every later third-party-boundary lesson. Ship v1 (hand-SVG + `DiagramSequence`); the bespoke widget adds polish, not new teaching power.

`AgenticLoopSimulator` and `QuotaLifecycleScrubber` are demoted to v1 (`DiagramSequence`) by default and only promoted if a forward chapter pulls on them — single-chapter use doesn't justify the bespoke build.

## Open pedagogical questions

- The chapter ships against a real OpenAI provider, and several artifacts (the parts player, the loop simulator) replay pre-recorded conversations. Decide whether the lesson surfaces those fixtures as "captured from a real run against the seeded DB" (high authenticity, requires capture tooling) or treats them as authored transcripts (cheaper, slightly less honest).
- Concept 7's lifecycle scrubber names the soft-cap vs hard-cap trade explicitly. Confirm the course's stance is that a daily soft cap is the canonical 2026 default for a per-user SaaS LLM surface — if so, the alternative is named once and dropped; if the course wants to teach the pre-reserve hard-cap shape later, add a forward pointer now.
- The `default` case in the parts switch returns `null` and the lesson names this as graceful forward-compat. Decide whether the course wants a stronger version (a dev-mode warning log on unknown part types) — if yes, name it once in Concept 8's prose so the verify lesson can grep for it.
