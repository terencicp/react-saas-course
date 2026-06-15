# Chapter 108 — Lesson 4 outline

## Lesson title

The per-user daily token quota — fits; keep.
Sidebar (short): Daily token quota.

## Lesson type

Implementation.

## Lesson framing

The student installs the senior reflex that a user-facing LLM surface is a metered cost center, not a free function call: a per-user-per-day token budget enforced server-side, refusing over-budget requests with a typed 429 *before* the stream starts. The payoff is the **reserve-before-spend** wrapper composed AROUND auth (`withLlmQuota(authedRoute(...))`) — the structural reason a future LLM route physically cannot forget cost enforcement — plus the in-arrears `onStepFinish` accounting and the `/api/usage` read side the panel will poll. They ship the capability that lets the product cap spend without trusting the client or the model.

## Codebase state

### Entry

The chat answers grounded questions: `POST /api/chat` is live as `authedRoute('member', …)` running `streamText` with `stopWhen(stepCountIs(5))`, `maxOutputTokens: 1024`, the tool-grounded system prompt, the `getInvoiceStats` tool (closure over `ctx.orgId`, aggregate `outputSchema`, "return don't throw"), and `onStepFinish` writing one `'llm.step'` row per step plus `onFinish` writing one `'llm.finish'` row. Stubs still carrying `TODO(L4)`: `src/lib/llm/quota.ts`, `src/app/api/usage/route.ts`. `src/lib/llm/with-llm-quota.ts` ships **complete** as a provided seam (the student wires it, does not author it). The chat route does **not** yet wrap in `withLlmQuota` and its `onStepFinish` does **not** yet call `addUsage`. The seeded `usageQuota` table has `user-acme-member` at 90k today / 99k yesterday; `GET /api/usage` 404s. The smoke-test `invoice-chat.tsx` from L2 is still the client.

### Exit

`quota.ts` exports `DAILY_TOKEN_CAP = 100_000`, `readUsage`, `reserveQuotaOrRefuse`, `addUsage`. `POST /api/chat` is wrapped `withLlmQuota(authedRoute('member', …))` and its `onStepFinish` increments the daily counter via `addUsage(ctx.userId, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0))`. `GET /api/usage` returns `{ used, cap, remaining }` for the acting user. A request crossing the 100k cap is refused with HTTP 429 `{ ok: false, error: { code: 'quota_exceeded', userMessage } }` before the stream starts, the model never runs, no new `'llm.finish'` row appears. Yesterday's 99k row does not block today. Out of scope and still stubbed for L5: the three client components (the rendered usage panel and the typed parts client).

## Lesson sections

Implementation contract order. Intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Intro (no header) — Goal + Finished result

One-sentence goal in user terms: cap each user at 100,000 tokens per day so one user cannot run up an unbounded model bill, refusing gracefully once the budget is spent. One-paragraph "finished result": with the inspector's "Force quota to 99,500" applied to member-A, the next question returns a typed 429 refusal instead of an answer (no new audit row, the model never ran), and `GET /api/usage` reports today's `{ used, cap, remaining }`. No screenshot needed — this lesson's surface is server-side; the visible panel lands in L5. Optionally note the visible proof lives in the inspector's live quota counter ticking up after a normal question.

### Your mission

Prose paragraph + one requirements checklist (`Checklist`/`ChecklistItem`). No subsection headers, no implementation hints, no file/export/import names in the requirement phrasings.

Weave into the prose (no hints, just the shape of the problem and the traps):
- This is the cost-cap discipline from lesson 2 of chapter 105 made concrete — a per-user-per-day token budget enforced server-side with a typed refusal the client can render. Link chapter 105 lesson 2 rather than re-explaining *why* a cap exists.
- **Constraint (the senior reflex):** the reservation must run *before* the stream spends a token, which is why it lives in a middleware composed AROUND `authedRoute` (`withLlmQuota(authedRoute(...))`), not inside the handler — "wrap first, then add capability": a new LLM route cannot forget cost enforcement because the wrapper sits between request and handler. The wrapper itself is provided; the student's job is to author the quota module it calls and to wire it on.
- **Constraint (persistence shape):** the quota lives in the `usageQuota` store array keyed by `(userId, day)`; the daily reset is implicit — tomorrow's row is a fresh push, so the seed's near-cap "today" row blocks today but not tomorrow (the separate "yesterday" row proves key independence). Name the SQL lineage: ensure-then-compare is `INSERT ... ON CONFLICT DO NOTHING` then a `SELECT` against `usage_quota_daily` (pk `(userId, day)`); here two array operations stand in, readability over a single statement.
- **Trade-off to name (not hide):** this is a *soft* daily ceiling enforced as-you-go — the increment happens in arrears inside `onStepFinish` as tokens are consumed, so the step that pushes a request over the cap is charged after the fact. Acceptable for a 100k daily budget; not a hard rate limit. Pre-reserving a budgeted amount is the alternative some teams pick (name once).
- **Trade-off to name:** the course sums input + output tokens into one number; production often separates them because output tokens cost several times more. Both are optional on the v5 usage object — default to 0 with `??` so a partial usage report doesn't crash the route.
- The `/api/usage` endpoint is the read side L5's panel polls; it reuses `authedRoute('member')` so usage is per authenticated user.
- **Out of scope (one line):** the rendered usage panel and the typed client land in L5; here it's the quota module, the wrapper wiring, and the endpoint.

Requirements checklist — each a verifiable outcome, tagged. (No per-lesson test suite ships for this project; `[tested]` here means "asserted by `pnpm verify` typecheck/build", everything behavioral is `[untested]` and hand-confirmed in Moment of truth. The test-coder writes no new behavioral suite — flag this so downstream does not invent one.)

1. The request that crosses the 100,000-token cap returns HTTP 429 with `{ ok: false, error: { code: 'quota_exceeded', userMessage } }`, refused before the stream starts. `[untested]`
2. `GET /api/usage` returns today's `{ used, cap, remaining }` for the acting user. `[untested]`
3. After a normal question, the usage counter increases by the actual token count for that conversation. `[untested]`
4. A question with a long preamble increases the counter by more than a short question, because the counter sums input and output tokens. `[untested]`
5. Yesterday's near-cap row does not block today's request, because the quota is keyed by `(userId, day)`. `[untested]`
6. The slice typechecks and builds (`pnpm verify`). `[tested]`

### Coding time

One line directing the student to implement against the brief, then the hidden `<details>` reference walkthrough (writer wraps in `<details>`, collapsed). Build order: `quota.ts` → `usage/route.ts` → wire `with-llm-quota.ts` onto `chat/route.ts` → add the `addUsage` increment to the existing `onStepFinish`.

Code-sample handling:
- `quota.ts` — `Code` for the full module (one file, four exports, read top-to-bottom). The four module comments in the solution carry the rationale; the writer can lean on them rather than re-prose. If focus-splitting is wanted, `AnnotatedCode` highlighting (a) `ensureTodayRow` as the find-or-push / `ON CONFLICT DO NOTHING` analogue, (b) `reserveQuotaOrRefuse`'s ensure-then-`>=`-cap refusal, (c) `addUsage`'s in-arrears `+=`. Prefer plain `Code` unless the writer judges the three-seam split clarifies — keep it one block by default.
- `with-llm-quota.ts` — show as a **provided** seam with `Code` (it ships complete); explain its three moves (resolve user from `getSession()`, `reserveQuotaOrRefuse`, short-circuit `Response.json(..., { status: 429 })` or delegate) and why it composes around auth. Do not present it as student-authored.
- `usage/route.ts` — `Code`, three lines; callout that GET carries no body so it parses against `z.strictObject({})` (the wrapper treats absent body as `{}`).
- `chat/route.ts` diff — `CodeVariants` (before = L3's export, after = `withLlmQuota(...)` wrap + the `addUsage` line inside `onStepFinish`), so the two surgical changes against an existing file are unmistakable. Alternatively `Code` with the two changed regions called out — `CodeVariants` preferred because this is a before/after on a file the student already wrote.

Cover every `[untested]` requirement in the walkthrough:
- Reqs 1, 5 (refusal + daily-key independence): `reserveQuotaOrRefuse` ensures today's row then compares `tokensUsed >= DAILY_TOKEN_CAP`; the `(userId, day)` key means today's row is independent of yesterday's. Callout: the refusal returns the canonical Result error shape (`code: 'quota_exceeded'`), and the **wrapper** — not the handler — emits the 429; the route never calls `reserveQuotaOrRefuse` itself.
- Req 2 (`/api/usage`): `readUsage` reads `findQuotaRow(userId, todayUtc())?.tokensUsed ?? 0`, returns `{ used, cap, remaining }` with `remaining` floored at 0 via `Math.max`.
- Reqs 3, 4 (counter increments, sum): `addUsage` in `onStepFinish` adds `(usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)`. Callout: both fields optional on the v5 step usage object — `??` to 0; a missing field must not crash the route.

Decision rationale (one line each): reserve-before-spend lives in the wrapper for the structural "can't forget" property; ensure-then-compare over a single SQL statement for readability; in-arrears soft ceiling vs. pre-reservation; single-sum tokens vs. split pricing. For the canonical Result shape and Zod discipline link chapter 042 + lesson 2 of chapter 057; for `authedRoute` link lesson 3 of chapter 057; for the cost-cap rationale link lesson 2 of chapter 105. Do not re-explain those here.

External resources slot: appended after the `<details>` with no header (resourcer fills later) — none authored here.

### Moment of truth

Header "Moment of truth". State plainly: this project ships **no per-lesson test suite** (`lesson-verification/` is the harness slot, not a green gate). The command is `pnpm verify` (Biome CI + `tsc --noEmit` + `next build` with `SKIP_ENV_VALIDATION=true`), expected to pass clean — show the expected tail (build succeeded / no type errors). Do **not** emit `pnpm test:lesson 4`; it does not exist for this chapter. Then a hand-confirm `Checklist`:

- [ ] Switch the inspector identity to `org-acme:member` (the seed's near-cap row is for `user-acme-member`, not the default admin). Apply "Force quota to 99,500", then ask one small question — the next `POST /api/chat` returns 429 with the `quota_exceeded` Result shape; no new `'llm.finish'` row appears (the model never ran).
- [ ] `GET /api/usage` returns `{ used, cap, remaining }` for the acting user.
- [ ] After "Reset and re-seed", acting as member-A, asking one question ticks the inspector's usage counter up from the seeded 90k baseline by the conversation's actual token count, and the audit payload's `usage.inputTokens + usage.outputTokens` matches the delta.
- [ ] The same question with a long preamble increases the counter by more than the short question did.
- [ ] The seed's "yesterday" 99k row does not block today's request: acting as member-A, today's row starts at the seeded 90k, independent of yesterday's 99k.

Note for the writer: these live checks require `AI_GATEWAY_API_KEY` (set in `.env`); name that the 429 / daily-key checks (which short-circuit before the model) work without a key, but the counter-increment checks need a real model call.

## Scope

- The rendered token-usage panel (polling `/api/usage`, the colored bar) and the typed `useChat` client — **Lesson 5**. This lesson builds only the endpoint the panel will poll.
- The streaming route, the agentic-loop cap, and the system prompt — **Lesson 2** (already built at entry).
- The `getInvoiceStats` tool, the closure-over-`orgId` rule, per-step `'llm.step'` audit — **Lesson 3** (already built at entry); this lesson only adds the `addUsage` line beside the existing step-audit write.
- The cost-cap rationale (why per-user-per-day, abuse mitigation as the user-facing-LLM rule) — taught in **lesson 2 of chapter 105**; reference, do not re-teach.
- The `authedRoute` wrapper internals and the canonical Result shape — **chapter 057 lesson 3** / **chapter 042**; reference.
- A "90% of quota" notification through the dispatcher (Unit 14) and integration-testing the quota with a mocked model (Unit 18) — named as forward pointers in L5, not here.
