# Chapter 108 — Project plan: Ask-your-invoices chat with tool calling

## Design decision (resolved — read first)

Two facts about the carry-in force this plan to diverge from the chapter outline's surface assumptions. Both are resolved here; slices follow the resolutions, not the outline's literal API names.

**1. The 062 lineage is an in-memory store, not Postgres/Drizzle.** The chapter outline assumes real Drizzle (`tenantDb(orgId)`, `invoiceScope`, `docker-compose postgres:18`, `pnpm db:migrate`, `usage_quota_daily`/`llm_audit_events` SQL tables). The actual 062 `solution/` (the dependency-map ancestor, the only base 108 forks) is an **in-memory singleton** (`src/server/store.ts`) read through `scopedInvoices(orgId).active()/.archived()/.includingDeleted()`, with a cookie dev-session (`getSession()`, never redirects) and a FormData `authedAction`. There is no Docker, no Postgres, no migration, no `env.ts`. **This plan forks that lineage and keeps it in-memory** (the same call the 073→104 fork made). Every outline reference to `tenantDb(orgId).invoices.active()` maps to `scopedInvoices(orgId).active()`; the two new "tables" become store arrays (`usageQuota`, `llmAuditEvents`) with helper functions; "the migration that already ran" is just the seed. The student practices the *exact same senior reflexes* (tools as the only data doorway, `orgId` from the closure, aggregate projection, server-owned loop cap, per-user quota) against the in-memory store — the AI seam is identical; only the storage primitive differs, and the inspector already carries an `index-explainer` that frames "same shapes, in-memory" honestly.

**2. The AI SDK cannot run in the verify/test pipeline.** `ai` + a provider/gateway key cannot execute in the node-env Vitest harness (no key, no network — stated three times across the 105/106/107 continuity notes) and a real model round-trip is non-deterministic. So, exactly as the 104 plan did for its read-only target: **`pnpm verify` and the lesson tests check source shape + SSR/first-paint output, never a live model call**, and the **rendered checks verify the chat shell paints and the `/invoices` two-pane layout composes** — never a streamed answer. The live happy/unhappy paths (a streamed answer, the 429 refusal, the forged-orgId proof, the step-ceiling demo) are **manual Moments of truth** the lesson MDX drives against a real key, not pipeline gates. No static or rendered check requires `AI_GATEWAY_API_KEY` to be a real key; the seeded near-cap row and the inspector toggles make the unhappy paths reachable by hand without spending money.

**3. `withLlmQuota` composition, not inline reservation (resolving the outline-aligner's flag).** Chapters 105 L2 / 106 L1 / 106 L2 / 107 standardized the daily quota as a thin wrapper composed **around** `authedRoute` — `withLlmQuota(authedRoute('member', schema, fn))` — and 106 L1 explicitly warns "later lessons must not infer that `authedRoute` owns the daily quota." The chapter outline instead inlines `reserveQuotaOrRefuse(ctx.user.id)` in the handler body. **This plan honors the taught `withLlmQuota` composition** (continuity wins over the outline; it is the syntax the student was taught and the structural lesson is stronger — quota can't be forgotten on a new route, the same "wrap first, then add capability" reflex Lesson 2 preaches for auth). The quota module still exports the same three functions (`reserveQuotaOrRefuse`, `addUsage`, `readUsage`); `withLlmQuota` is the seam that *calls* `reserveQuotaOrRefuse` before delegating to the inner handler and short-circuits a typed 429 when refused. `addUsage` runs in the route's `onStepFinish` (token accounting is per-step, inside the loop — the wrapper can't see steps). This divergence is named in Locked decisions so lesson writers reconcile the outline's inline snippet to the wrapper form.

## Project goals

The project cements Unit 22 by assembling one runnable LLM-backed SaaS surface from the four seams the unit installed — the provider-abstracted model handle (chapter 105), the `streamText` route-handler + system-prompt-as-controller (chapter 106), the Zod-contracted tool with a server-side `execute` and the `stopWhen` agentic loop (chapter 107 L1), and the typed `useChat` rendering tool parts across four lifecycle states (chapter 107 L2) — plus the per-user daily token quota (chapter 105 L2) made concrete. The skills the student develops are the durable senior reflexes for any AI feature, none of which is keystrokes: (1) **treat the model as untrusted input** — tools are the only doorway into app state, `orgId` comes from the server auth closure never from the model's tool-call arguments, and the tool projects an aggregate back to the model rather than raw rows; (2) **own the agentic loop server-side** with an explicit `stopWhen(stepCountIs(5))` cap rather than trusting a client or SDK default; (3) **wrap before you add capability** — the streaming endpoint goes behind the same auth boundary that guards every mutation, and the daily quota composes around it so cost enforcement can't be forgotten; (4) **refuse gracefully with typed shapes** — quota overruns return a typed 429, tool failures return `{ error }` the model can read, both rendered as friendly UI never thrown 500s; (5) **render a typed surface** where `part.output` is the projected shape end-to-end via `InferUITools` and each tool owns its loading skeleton. The coding cements the concepts by forcing the student to wire each seam onto the previous one in dependency order (route → tool → quota → client), see the structural reason each safety property holds (flip the inspector's `MODEL_FROM_INPUT_ORGID` and watch the cross-tenant leak appear), and assemble the whole into the chat that answers "how many overdue invoices?" with a number that matches the seed.

The point is not to build a realistic AI product; it is to walk the canonical 2026 shape of an LLM surface end-to-end and cement the unit's rules. The features are the minimum that exercise each reflex once — one tool, one aggregate shape, one quota, one chat panel — so the student completes the build quickly and the structural lessons land without product noise.

## Student position

The student has finished Units 1–21 plus the three Unit 22 teaching chapters (105 "when AI earns its weight" + cost discipline + provider abstraction, 106 text/objects/chat surface, 107 tools/generative-UI/RAG) — the chapters this project consumes. They know, and the project reads against, the full lineage: TypeScript 6 strict, React 19 (Server/Client Components, the derive-don't-sync rule, refs-as-props no `forwardRef`), Next.js 16 App Router (`cacheComponents`, route handlers as the stream/SSE seam, `typedRoutes` + `as Route` casts), Tailwind v4 + shadcn/ui (committed `components/ui/*`, `cn()`, per-tool `<Skeleton>` over spinners), Zod 4 (`z.strictObject`, `z.enum`, `z.infer`, top-level format builders, `.describe()` as the model-facing field doc), the `Result<T>` + seven-code `ErrorCode` union, the org/RBAC model (`roleAtLeast`, the cookie dev-session standing in for `requireOrgUser`), `logAudit`-style append-only audit discipline, Temporal over `Date` for user-visible time, and the **Unit 22 carry-in this project assembles**: the four LLM triggers + "tools own data, the model orchestrates language" (105 L1); the cost gauntlet — `maxOutputTokens` on every call, per-user daily quota keyed by date, `withLlmQuota` composed **around** the route, pre-call reservation + post-call accounting both needed, "a missing output cap is the same severity as a missing auth check" (105 L2); provider abstraction — role-named handles in `lib/llm/models.ts` as **bare gateway strings** routed through the AI Gateway, never a `provider(...)` factory (105 L3); `streamText` vs `generateText`, `convertToModelMessages` at the handler seam, `toUIMessageStreamResponse()` as the mandatory return, the `UIMessage`/`ModelMessage` boundary, `onFinish` for audit, `onError` sanitization, system-prompt-as-controller with the prompt-injection rule (106 L1/L3); typed `useChat<MyUIMessage>` with manually-managed `useState` input, `sendMessage`/`regenerate`/`status`, `message.parts` walked with a `switch` on `part.type` (106 L3); `tool({ description, inputSchema, execute, outputSchema })`, `execute` closing over `orgId`, `stopWhen(stepCountIs(n))`, `onStepFinish` per-step metering, return-don't-throw errors, minimal-result projection (107 L1); the four tool-part states (`input-streaming`/`input-available`/`output-available`/`output-error`), `InferUITools<typeof tools>`, the `lib/llm/tools.ts` registry, per-tool skeletons, `default: return null` in the part switch (107 L2).

**Not yet known — coder agents must NOT introduce these:**
- **AI SDK v6 APIs.** The unit pins `ai@^5`; 106 L2 and 107 L2 explicitly forbid drifting to v6 `Output.*` / migrated APIs. Use only the v5 surface (`streamText`, `stopWhen: stepCountIs(5)`, `tool({ inputSchema, outputSchema })`, `InferUITools`, `toUIMessageStreamResponse`, `convertToModelMessages`, `@ai-sdk/react`'s `useChat`).
- **Real Postgres / Drizzle / pgvector / Docker.** This codebase is in-memory (062 lineage). Do **not** introduce `tenantDb` as a Drizzle facade, `drizzle-orm`, a `docker-compose.yml`, `db:migrate`, or a `vector` column. Reads go through `scopedInvoices(orgId)`; the quota and audit "tables" are store arrays. (RAG / pgvector from 107 L3 is a named forward pointer only — not built here.)
- **`generateObject` / `streamObject` / `useObject` / `useCompletion`.** Taught in 106 but out of scope; this surface is `streamText` + `useChat` only.
- **Client-side `maxSteps`, `append`, `reload`, `message.content`, `ai/rsc`, `streamUI`.** All v4 / experimental; the loop cap is server-side `stopWhen`, the client is the v5 shape (`sendMessage`, `regenerate`, `message.parts`).
- **The propose/confirm destructive-tool pattern, multi-tool registries, RAG retrieval.** Named once as forward pointers; the registry here is exactly one read-only tool (`getInvoiceStats`).
- **A live model call in any test or rendered check.** The pipeline never holds a real key; tests assert source shape + SSR output, rendered checks assert the shell paints. The streamed answer is a manual Moment of truth only.

## Scaffolding recipe

Build a single `solution/` that forks the 062 in-memory production-list app and grafts the LLM seam onto its `/invoices` right rail plus a new `/inspector` verification surface. The nine files that the slices author (the outline's "eight TODO files" + the third client component, since `invoice-chat.tsx` is authored across two slices) ship here as **`TODO(L<n>)` stubs** (typed signatures + a stub body that compiles and renders inert); everything else — the 062 carry-in, the model handle, the env module, the two new store arrays + their helpers, the `authedRoute` + `withLlmQuota` seams, the inspector — ships **complete**. The app must boot with **no login and no external services**: `/invoices` renders the seeded list with an inert chat shell in the right rail, `/inspector` renders the verification panels, and `pnpm verify` passes (no real key needed — see env below).

This recipe is the only section the scaffolding-coder reads. Build everything below now; leave only the nine `TODO(L<n>)`-marked stub bodies for the slice-coders.

### Fork

1. **Fork the 062 `solution/`** (`projects/Chapter 062/solution/`) wholesale via `rsync` (exclude `node_modules`, `.next`). It carries the in-memory store + cookie dev-session, `authedAction`, `Result<T>`, `roleAtLeast`, `scopedInvoices(orgId)`, the `/invoices` list (`page.tsx` with the `data-testid="invoices-grid"` two-pane grid + placeholder `<aside>`), the `/inspector`, the UI primitives, and the toolchain pinned. Rename the package to `chapter-108-ask-your-invoices`.
2. **Fix the `verify` script** to the locked string `"verify": "biome ci . && tsc --noEmit && SKIP_ENV_VALIDATION=true next build"` (062 ships an older `next typegen && …` form — drop `next typegen`; the locked tsconfig `include` carries both `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`). The `SKIP_ENV_VALIDATION=true` on the `next build` step is load-bearing: `next build` runs as `NODE_ENV='production'`, where `env.ts`'s `NODE_ENV !== 'production'` skip-arm is false, so without it any build-graph import of `env` fails prerender on the missing key (see Env module).

### Dependencies to add

To 062's pinned set add (runtime): `ai@^5.0.0`, `@ai-sdk/react@^2.0.0`, `@t3-oss/env-nextjs@^0.13.0`, `temporal-polyfill@^0.3.0` (the stats card formats `oldestUnpaidDueDate` via Temporal). **Do NOT add `@ai-sdk/openai`** — the model handle is a bare AI Gateway string (`'openai/gpt-5-mini'`) routed through the gateway, so no provider package is imported (105 L3 discipline). Keep all 062 deps at their pinned versions (next `16.2.7`, react/react-dom `19.2.4`, zod `^4.4.3`, etc.; full list in Locked decisions). Run `pnpm install` so the lockfile updates; confirm `pnpm-workspace.yaml` carries `allowBuilds: { sharp: true }` (062 carries it — the cold-install `next build` sharp gate).

### Env module (provided complete)

062 has no env module; add the minimal `src/env.ts` (the Unit-5 / 105 L3 seam):
```ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: { AI_GATEWAY_API_KEY: z.string().min(1) },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // The AI SDK reads AI_GATEWAY_API_KEY from process.env at call time; no test or
  // rendered check exercises a live model call. Set a real key in .env only for
  // the manual Moments of truth. `next build` runs with NODE_ENV='production', so
  // the `NODE_ENV !== 'production'` arm does NOT skip during the build — the
  // SKIP_ENV_VALIDATION=true the `verify` script sets is what keeps `pnpm verify`
  // green without a real key if any build-graph module imports `env`.
  skipValidation:
    process.env.NODE_ENV !== 'production' || process.env.SKIP_ENV_VALIDATION === 'true',
});
```
Add `.env.example` with `AI_GATEWAY_API_KEY=` and a one-line comment ("from the Vercel AI Gateway dashboard; only needed for the manual live-chat checks"). `src/lib/llm/models.ts` imports nothing from `env` — it is a bare string — but `env.ts` exists so the key is the validated seam and the security baseline (server-only env) holds. **The `verify` script's `next build` step is invoked with `SKIP_ENV_VALIDATION=true`** (see the locked `verify` string below): under `next build`, `NODE_ENV='production'` so the `NODE_ENV !== 'production'` arm is false, and any build-graph module that imports `env` would otherwise fail prerender with "Invalid environment variables" (verified June 2026 against `@t3-oss/env-nextjs@0.13`). Setting `SKIP_ENV_VALIDATION=true` on the build makes `verify` deterministically green whether or not `env` reaches the build graph.

### The two new store "tables" (provided complete)

Extend `src/server/store.ts` (keep every existing export) with two in-memory arrays + helpers, the in-memory analogue of `usage_quota_daily` and `llm_audit_events`:

- **Types** (add to `src/server/types.ts`):
  ```ts
  export type UsageQuotaRow = { userId: string; day: string; tokensUsed: number; updatedAt: string };
  export type LlmAuditEvent = {
    id: string; userId: string; orgId: string;
    event: 'llm.step' | 'llm.finish';
    payload: Record<string, unknown>; createdAt: string;
  };
  ```
- **Store arrays + helpers** (in `store.ts`): `export const usageQuota: UsageQuotaRow[]` and `export const llmAuditEvents: LlmAuditEvent[]`; `export const todayUtc = (): string` (ISO `YYYY-MM-DD`, UTC); `export const findQuotaRow(userId, day)`, `export const pushLlmAuditEvent(entry: Omit<LlmAuditEvent,'id'|'createdAt'>)` (sequential id like the existing `pushAudit`). `reseed()` must also clear `usageQuota` + `llmAuditEvents` and **seed one near-cap row** for `user-acme-member`: `{ userId: 'user-acme-member', day: todayUtc(), tokensUsed: 90_000, updatedAt: <anchor> }` (so a couple of questions cross the 100k cap deterministically), plus optionally a "yesterday" near-cap row for the same user (`day` = yesterday, `tokensUsed: 99_000`) to prove the daily key resets. These arrays are read directly only by the quota/audit `lib/llm` helpers and the inspector — same rule as `scopedInvoices` for invoices.

### The auth seams (provided complete)

062 ships only `authedAction` (FormData Server Actions). The streaming chat needs the `Request`/`Response` twin plus the quota wrapper. Add both as complete seams:

- **`src/lib/authed-route.ts`** — `import 'server-only';`. `export const authedRoute = (role: Role, schema: z.ZodType, fn) => async (req: Request): Promise<Response> => { … }`. Pipeline: **first** check the inspector's `BYPASS_AUTHED_ROUTE` flag — when **on**, skip the session resolve and return `Response.json({ ok:false, error:{ code:'unauthorized', userMessage } }, { status: 401 })` immediately (this is the only path to the 401 in dev, since the cookie session otherwise always resolves to a default; the flag stands in for "the unauthenticated request" — in real Better Auth this branch is `requireOrgUser()` redirecting/401-ing). Otherwise `getSession()` → `roleAtLeast` check (403 Result on miss) → `await req.json()` then `schema.safeParse` (400/422 Result on miss) → `await fn(parsed.data, ctx)` where `ctx = { session, orgId, userId, role, db }`. `db` is a thin facade exposing `query.organization.findFirst`-shaped reads over the store (so the route can fetch the org display name `orgName` the outline needs — back it with a seeded `organizations` array carrying `{ id, name }` for `org-acme`/`org-globex`; add that to the store). Any throw → `Response.json({ ok:false, error:{ code:'internal', … } }, { status: 500 })`. **Contract:** the inner `fn` returns a `Response` (the streamed `result.toUIMessageStreamResponse()` or a `Response.json(...)`); the wrapper does not wrap the success Response.
- **`src/lib/llm/with-llm-quota.ts`** — `import 'server-only';`. `export const withLlmQuota = (handler: (req: Request) => Promise<Response>) => async (req: Request): Promise<Response> => { … }`. It must resolve the acting user (call `getSession()`), `await reserveQuotaOrRefuse(session.userId)`, and **short-circuit** `Response.json(refusal, { status: 429 })` when `!reserved.ok`; otherwise `return handler(req)`. This is the structural seam from 105 L2 — quota composed **around** `authedRoute`, not inside it. (Provided complete and working — it imports `reserveQuotaOrRefuse` from `quota.ts`, which is a stub until L4; ship `with-llm-quota.ts` referencing it, and ship `quota.ts`'s stub exporting a `reserveQuotaOrRefuse` that returns `{ ok: true }` so the wrapper compiles and the route is reachable pre-L4. L4 fills the real reservation.)

### The `lib/llm` seam

`src/lib/llm/models.ts` — **provided complete** (105 L3): `import 'server-only';` then `export const chatModel = 'openai/gpt-5-mini';` (bare gateway string, one role-named handle, `camelCase`). One-line comment: swapping providers is a one-line change here.

The nine **`TODO(L<n>)` stubs** (typed signature + inert compiling body; the slices fill them):

- `src/lib/llm/prompts.ts` — `TODO(L2)`. Export `invoiceQAPrompt = (ctx: { orgName: string }): string`. Stub returns a one-line placeholder string.
- `src/lib/llm/audit.ts` — `TODO(L2)`. Export `writeLlmStepEvent(args)` and `writeLlmFinishEvent(args)` (both `async`, return `Promise<void>`). Stubs are no-ops.
- `src/lib/llm/tools.ts` — `TODO(L3)`. Export `buildInvoiceTools(ctx: { orgId: string })`, `type InvoiceTools = ReturnType<typeof buildInvoiceTools>`, `type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>`. Stub `buildInvoiceTools` returns `{ getInvoiceStats: tool({ description: 'TODO', inputSchema: z.strictObject({}), outputSchema: z.strictObject({}), execute: async () => ({}) }) }` so the types resolve and the client's message type compiles. (The client only ever imports `InvoiceUIMessage`.)
- `src/lib/llm/quota.ts` — `TODO(L4)`. Export `DAILY_TOKEN_CAP = 100_000`, `readUsage(userId)`, `reserveQuotaOrRefuse(userId)`, `addUsage(userId, tokens)`. Stubs: `readUsage` returns `{ used: 0, cap: DAILY_TOKEN_CAP, remaining: DAILY_TOKEN_CAP }`; `reserveQuotaOrRefuse` returns `{ ok: true } as const`; `addUsage` is a no-op. (Shipping these stubs lets `with-llm-quota.ts` and `/api/usage` compile and the route be reachable before L4.)
- `src/app/api/chat/route.ts` — `TODO(L2)` (route shape + L3 tools + L4 quota wire). Stub: `export const POST = (_req: Request) => Response.json({ ok:false, error:{ code:'not_implemented' } }, { status: 501 });` with the `TODO(L2)` marker. (501, not 405 — the outline says 405-before-handlers, but a stubbed named `POST` export means the method exists; 501 "not implemented" is the honest stub status. L2 replaces it with the real wrapped handler.)
- `src/app/api/usage/route.ts` — `TODO(L4)`. Stub: `export const GET = (_req: Request) => Response.json({ used: 0, cap: 100_000, remaining: 100_000 });` with the marker. (Returns a valid shape so the L5 panel renders zeros pre-L4; L4 wraps it in `authedRoute` reading the real `readUsage`.)
- `src/app/(app)/invoices/invoice-chat.tsx` — `TODO(L2)`/`TODO(L5)`. Stub: `'use client';` a static "Ask your invoices" card with a disabled textarea + disabled Send button and `data-testid="invoice-chat"`, no `useChat` yet. (L2 makes it the throwaway smoke-test client; L5 makes it the full typed client. The shell renders inert from scaffold so `/invoices` paints.)
- `src/app/(app)/invoices/invoice-stats-card.tsx` — `TODO(L5)`. Stub: `'use client';` exports `InvoiceStatsCard` returning `null` and `InvoiceStatsCard.Skeleton` returning a static card-shaped skeleton. (Compiles; L5 fills the four-state switch.)
- `src/app/(app)/invoices/token-usage-panel.tsx` — `TODO(L5)`. Stub: `'use client';` static bar at 0/100k with `data-testid="token-usage-panel"`, no polling. (L5 adds the `/api/usage` poll.)

### Mount the chat shell in `/invoices` (provided)

Edit `src/app/(app)/invoices/page.tsx`: replace the placeholder `<aside>…Select an invoice…</aside>` right-rail content with the chat rail — render `<TokenUsagePanel />` above `<InvoiceChat orgName={…}/>` inside the existing `<aside>` (keep the `<aside>` as the single right-rail slot; do **not** add a second grid child — the `data-testid="invoices-grid"` two-child invariant holds). Pass `orgName` from the seeded `organizations` lookup for the session's org. The page stays a Server Component composing the two Client Components via imports. Because the chat components are `'use client'` and the seeded list read is synchronous in-memory, no new Suspense seam is needed; `/invoices` keeps its existing `loading.tsx`.

### The inspector (provided complete)

Extend the carried-in `/inspector` (`src/app/inspector/page.tsx` + `actions.ts`) with the LLM verification surface — a Server Component reading the store directly, FormData server actions for the toggles (same shape as the carried-in `switchIdentity`/`resetAndReseed`/`forceVersionDrift`). Add, each with a `data-testid`:
- **Usage counter panel** (`data-testid="usage-counter"`): live read of `findQuotaRow(selectedUserId, todayUtc())` — `tokensUsed / DAILY_TOKEN_CAP` + last-update time.
- **"Force quota to 99,500" button** (`data-testid="force-quota"`): server action sets the selected user's today row `tokensUsed = 99_500`.
- **"Force tool error" toggle** (`data-testid="force-tool-error"`): server action flips a `globalThis`-backed flag (split-statement init per the Biome `noAssignInExpressions` constraint) that L3's `getInvoiceStats.execute` reads to return `{ error: 'stats_unavailable' }`.
- **`llm_audit_events` tail** (`data-testid="llm-audit-tail"`): last 20 from `llmAuditEvents`, newest first, each row `data-testid="llm-audit-row"` showing `event` + `finishReason`/`usage` from payload.
- **Forge-orgId panel** (`data-testid="forge-orgid"`): explanatory panel describing the replay-against-org-B check (the model may invent an `orgId` input; the tool ignores it because `orgId` is closure-bound). Static prose + the `MODEL_FROM_INPUT_ORGID` toggle below; no live call needed in the pipeline.
- **Two debug-flag toggles** (`data-testid="flag-bypass-authed-route"`, `data-testid="flag-model-from-input-orgid"`): `globalThis`-backed flags `BYPASS_AUTHED_ROUTE` (makes `authedRoute` refuse with 401 to prove the guard) and `MODEL_FROM_INPUT_ORGID` (makes `buildInvoiceTools` read `orgId` from the model input to expose the cross-tenant leak). Both default off; both server-action toggled. Document in panel prose that these exist to make the failure modes visible by hand.

Keep the existing `index-explainer` panel (its "same shapes, in-memory" framing now also covers the quota/audit tables). The inspector ships **complete** — no slice edits it; it is the verification substrate, built before any slice runs.

### Scripts and lesson test runner

Keep all 062 scripts (minus the `verify` fix above). Ship the **Vitest** lesson-test runner so `project-lesson-test-coder` need not bootstrap it:
- `vitest@^4.1.8` in `devDependencies` (carried from 062).
- `"test:lesson": "node scripts/test-lesson.mjs"` in scripts.
- `scripts/test-lesson.mjs` — carried from 062 verbatim (reads the lesson number from `process.argv[2]` and runs **exactly one** file: `vitest run --root . "lesson-verification/Lesson <n>.ts"`). Confirm it narrows to one file (a bare `vitest run` glob OR-matches every `Lesson *.ts`; the explicit path narrows). The runner must work in `start/` with no extra config.
- `vitest.config.ts` — carried from 062 verbatim: `environment: 'node'`, `globals: false`, `include: ['lesson-verification/**/*.ts']`, `plugins: [tsconfigPaths()]`. No DOM. The runner is node-env: tests observe SSR/first-paint output and source shape, not interaction.
- Do **not** create `lesson-verification/` test files here — `project-lesson-test-coder` fills `Lesson 2.ts … Lesson 5.ts` later. Each gate inlines its own helpers; no shared helpers module.
- **tsconfig:** keep `lesson-verification` **out of** the `tsconfig.json` `include` (run by vitest, not built) so a forward-referencing lesson test never fails `start/`'s `tsc --noEmit`.

### Scaffold acceptance

After scaffolding, `pnpm verify` passes in `solution/` with no real key (env validation skipped outside production). `pnpm dev` renders `/invoices` (default identity, no login) showing the seeded list with the inert chat shell in the right rail (`data-testid="invoice-chat"`, `data-testid="token-usage-panel"` present), the `data-testid="invoices-grid"` resolving to exactly two children. `/inspector` renders all the new panels (usage counter showing the seeded 90,000 for `user-acme-member`, empty audit tail, the toggles). `POST /api/chat` returns 501 and `GET /api/usage` returns the zero shape (stubs). `pnpm test:lesson 2` resolves and runs only `lesson-verification/Lesson 2.ts` (clean "no test file" until the test-coder writes it — confirm one path, not a glob).

## Slices

Each slice implements one lesson's build against the chapter outline's per-lesson "Your mission" + "Coding time" briefs and the reference signatures, filling the matching `TODO(L<n>)` stubs on top of the scaffold. Slices run in order; each later slice wires onto the previous. The reference content (exact signatures, the `streamText` config, the part-switch shapes) lives in the chapter outline's "Reference solution signatures" and per-lesson `<details>` blocks — reproduce it faithfully, mapping every Drizzle reference to the in-memory `scopedInvoices(orgId)` shape and folding the outline's inline-quota snippet into the `withLlmQuota` wrapper form (Locked decisions).

### Slice S1 — Streaming route under auth with the agentic loop

Scope: **Lesson 2.** Wire `POST /api/chat` as a real streaming handler — `withLlmQuota(authedRoute('member', schema, fn))` running `streamText` capped at 5 steps with the tool-grounded system prompt and an `onFinish` audit write — plus the throwaway smoke-test client. Ends streaming text-only answers (manual), 401 on bypass, one `'llm.finish'` row per conversation.

Fill these stubs:
- **`src/lib/llm/prompts.ts`** — the real `invoiceQAPrompt({ orgName })`: three load-bearing lines (force tool-grounding "Always call getInvoiceStats before stating numeric facts", refuse cross-org questions, define the `{ error }` behavior). Module function, not a `SCREAMING_SNAKE_CASE` constant (it templates `orgName`); keep user input out of `system` (prompt-injection rule — user text stays in `messages`).
- **`src/lib/llm/audit.ts`** — `writeLlmStepEvent` and `writeLlmFinishEvent`, each a direct `pushLlmAuditEvent({ userId, orgId, event, payload })` into the store array (`'llm.step'` / `'llm.finish'`), carrying `finishReason` + `usage` (+ `toolCalls` for step) in `payload`. (The outline's "bounded one-row transaction" is the SQL discipline; in-memory it's a single push — keep the one-event-per-call shape.)
- **`src/app/api/chat/route.ts`** — replace the 501 stub with `export const POST = withLlmQuota(authedRoute('member', z.strictObject({ messages: z.array(z.unknown()) }), async (input, ctx) => { … }))`. Inside `fn`: fetch `orgName` via `ctx.db.query.organization.findFirst({ where: id === ctx.orgId })`; `const result = streamText({ model: chatModel, system: invoiceQAPrompt({ orgName }), messages: convertToModelMessages(input.messages as InvoiceUIMessage[]), stopWhen: stepCountIs(5), maxOutputTokens: 1024, onFinish: ({ usage, finishReason }) => writeLlmFinishEvent({ userId: ctx.userId, orgId: ctx.orgId, finishReason, usage }), onError: ({ error }) => { /* sanitized log; never leak */ } }); return result.toUIMessageStreamResponse();`. No tools and no `onStepFinish` yet (S2/S3 add them). The route input schema deliberately accepts untyped `messages` (the converter does the real validation — name the trade, don't over-validate).
- **`src/app/(app)/invoices/invoice-chat.tsx`** — the throwaway smoke-test client: `'use client'`; `const { messages, sendMessage, status } = useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }) })` (`DefaultChatTransport` is imported from `'ai'` — see Locked decisions: `@ai-sdk/react@2`'s `useChat` removed the top-level `api` string option, the endpoint is set on the transport); `const [input, setInput] = useState('')`; a textarea bound to `input`; Submit calls `sendMessage({ text: input })` then `setInput('')`; render `messages.map` as raw text (each message's `parts` joined or `part.type === 'text'` text shown). `data-testid="invoice-chat"`. Keep it minimal — the typed parts-rendering client is S4.

Excludes: the tool (S2), per-step audit + quota (S2/S3), the typed parts client + stats card + usage-panel polling (S4). Contracts created: `POST /api/chat` (the streaming route every later slice extends), `invoiceQAPrompt`, the audit writers, `InvoiceUIMessage` consumed by the client.

Screenshot:
- L2 (`/invoices`, desktop 1280×900, state settled): the list with the chat rail present and the smoke-test client mounted (textarea + Send enabled), so the L2 lesson can show the streaming endpoint's first client. `data-testid="invoice-chat"`. (Captured here because L2 is the first slice that makes the chat shell interactive; S4 changes it, but L2 owns the "streaming route is live" surface.)

### Slice S2 — The org-scoped getInvoiceStats tool

Scope: **Lesson 3.** Add the single `getInvoiceStats` tool (closure over `orgId`, aggregate `outputSchema`, return-don't-throw) and wire it into the route with per-step audit. Ends answering grounded questions with real in-memory aggregates; the forged-orgId and step-ceiling and tool-error paths become demonstrable.

Fill / edit:
- **`src/lib/llm/tools.ts`** — the real `buildInvoiceTools({ orgId })` returning `{ getInvoiceStats: tool({ … }) }`:
  - `description`: per the outline ("Return aggregate invoice statistics for the current organization. Use this for any question that needs counts, totals, or status breakdowns of invoices.").
  - `inputSchema: z.strictObject({ status: z.enum(['draft','sent','paid','overdue']).optional(), since: z.iso.date().optional() })` — **no `orgId`** (the load-bearing line; the model cannot pass it).
  - `outputSchema: z.strictObject({ count: z.number().int(), totalAmount: z.number(), byStatus: z.record(z.string(), z.number().int()), oldestUnpaidDueDate: z.iso.date().nullable() })`.
  - `execute: async (input) => { try { const flag = <read inspector MODEL_FROM_INPUT_ORGID>; const scopeOrgId = flag ? (input as any).orgId ?? ctx.orgId : ctx.orgId; if (<read inspector FORCE_TOOL_ERROR>) return { error: 'stats_unavailable' as const }; let q = scopedInvoices(scopeOrgId).active(); /* apply status filter via .filter, since via dueAt/createdAt compare */ const rows = q.take(Number.MAX_SAFE_INTEGER); /* aggregate: count, sum(total), byStatus map, min dueAt among unpaid */ return { count, totalAmount, byStatus, oldestUnpaidDueDate }; } catch { return { error: 'stats_unavailable' as const }; } }` — closure over `ctx.orgId` is the structural reason it's safe; the `MODEL_FROM_INPUT_ORGID` read is the inspector hook that *exposes* the leak when flipped (default off → always `ctx.orgId`). Project the aggregate, never raw rows.
  - `export type InvoiceTools = ReturnType<typeof buildInvoiceTools>`; `export type InvoiceUIMessage = UIMessage<unknown, never, InferUITools<InvoiceTools>>` (already referenced by the client — now backed by the real tool).
- **`src/app/api/chat/route.ts`** — build `const tools = buildInvoiceTools({ orgId: ctx.orgId })` per request, pass `tools` to `streamText`, and add `onStepFinish: ({ usage, toolCalls, finishReason }) => writeLlmStepEvent({ userId: ctx.userId, orgId: ctx.orgId, toolCalls, finishReason, usage })`. `onFinish` unchanged from S1. (Token-accounting half of `onStepFinish` is S3.)

Excludes: token quota + `addUsage` + `/api/usage` (S3); the typed parts client (S4). The smoke-test client from S1 stays. Contracts created: `getInvoiceStats` tool, the per-step `'llm.step'` audit, the real `InvoiceUIMessage` tool-part type the client renders in S4.

Screenshot: none (no new visible surface — the tool's effect is in the streamed answer + audit tail, both manual/non-deterministic; the chat rail looks unchanged).

### Slice S3 — The per-user daily token quota

Scope: **Lesson 4.** Implement the quota module, wire the increment into the route's `onStepFinish`, and make `/api/usage` real. (`withLlmQuota` already calls `reserveQuotaOrRefuse` — this slice makes that reservation real.) Ends refusing the over-cap request with a typed 429 and the usage endpoint reporting today's used/cap/remaining.

Fill / edit:
- **`src/lib/llm/quota.ts`** — replace the stubs with the real impls over the store arrays:
  - `DAILY_TOKEN_CAP = 100_000` (already shipped).
  - `readUsage(userId)` → `{ used, cap: DAILY_TOKEN_CAP, remaining }` from `findQuotaRow(userId, todayUtc())` (used `0` if absent).
  - `reserveQuotaOrRefuse(userId)` → ensure today's row exists (push a `tokensUsed: 0` row if `findQuotaRow` misses — the in-memory analogue of `INSERT … ON CONFLICT DO NOTHING`), then compare `tokensUsed` to `DAILY_TOKEN_CAP`; return `{ ok: false, error: { code: 'quota_exceeded', userMessage } } as const` at/over cap, else `{ ok: true } as const`. Runs **before** the stream (it already does, via `withLlmQuota`) — name the "reserve before spend" reason.
  - `addUsage(userId, tokens)` → find/ensure today's row, `tokensUsed += tokens`, `updatedAt = now`. (The increment that runs as tokens are consumed.)
  - Name the trades in comments per the outline: soft daily ceiling (charged in arrears), input+output summed as one number (production separates them), two-step ensure-then-compare for readability.
- **`src/app/api/usage/route.ts`** — replace the stub: `export const GET = authedRoute('member', z.strictObject({}), async (_input, ctx) => Response.json(await readUsage(ctx.userId)))`. (Note: `GET` has no body — the `authedRoute` body-parse must tolerate an empty/absent body for `GET`; ensure the wrapper treats a missing body as `{}` so the empty schema passes. Handle that in `authed-route.ts` if not already — it's a scaffold seam, but if the GET path needs the tweak, make it here and note it.)
- **`src/app/api/chat/route.ts`** — inside the existing `onStepFinish`, add `await addUsage(ctx.userId, (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0))` alongside the S2 step-audit write. `usage.inputTokens`/`usage.outputTokens` are optional on the v5 step usage object — `?? 0`.

Excludes: the typed parts client + the rendered usage panel polling (S4 — the panel still shows static zeros until S4 wires the poll). Contracts created: the real `readUsage`/`reserveQuotaOrRefuse`/`addUsage`, the `GET /api/usage` the S4 panel polls, the 429 refusal path the S4 `onError` toasts.

Screenshot: none (the quota's effects — the 429 toast, the counter ticking — are exercised through the S4 client + inspector by hand; no new deterministic surface here).

### Slice S4 — Typed useChat, tool parts, and the usage panel

Scope: **Lesson 5.** Replace the smoke-test client with the full typed `useChat` surface — text bubbles + the `getInvoiceStats` stats card across all four tool-part states with a per-tool skeleton — and the live polling usage panel. Ends with the full surface assembled (happy + unhappy paths live, manual).

Fill / edit:
- **`src/app/(app)/invoices/invoice-chat.tsx`** — the full typed client: `'use client'`; `const { messages, sendMessage, status } = useChat<InvoiceUIMessage>({ transport: new DefaultChatTransport({ api: '/api/chat' }), onError: () => toast.error('Something went wrong. Try again.') })` (`DefaultChatTransport` from `'ai'` — the v5 endpoint seam, not the removed `api` option); local `useState` input; `onSubmit` guarded on `status === 'streaming' || status === 'submitted'` (the in-flight gate — prevents double-submit); `messages.map((m) => m.parts.map((part, i) => { const key = \`${m.id}-${i}\`; switch (part.type) { case 'text': return <TextBubble key={key} …/>; case 'tool-getInvoiceStats': return <InvoiceStatsCard key={key} {...part} />; default: return null } }))` — the tool part is spread whole into `InvoiceStatsCard` (it accepts the `UIToolInvocation` discriminated union as its props, so `part.state`/`part.input`/`part.output` narrow correctly inside the card; passing them as separate props loses the narrowing). The key is the composite `\`${m.id}-${i}\`` **never the bare index `i`** — a bare `key={i}` trips Biome's `lint/suspicious/noArrayIndexKey` and fails `biome ci` (see Toolchain constraints). A "Thinking…" line while `status === 'submitted'`. `data-testid="invoice-chat"`, the input `data-testid="chat-input"`, Send `data-testid="chat-send"`. No `append`/`reload`/`message.content`/`ai/rsc`.
- **`src/app/(app)/invoices/invoice-stats-card.tsx`** — props typed via `UIToolInvocation<InvoiceTools['getInvoiceStats']>` (imported from `'ai'`) — the tool-part discriminated union carrying `state`/`input`/`output`, so `output` is the projected shape with no `as`. (**Not** `InferUITools<InvoiceTools>['getInvoiceStats']` — that resolves to a bare `{ input, output }` with **no `state` field**, so switching on `state` won't typecheck; `UIToolInvocation<Tool>` is the public export that models the four lifecycle states.) The component takes the whole invocation as its props (`const InvoiceStatsCard = (part: UIToolInvocation<…>) => {…}`) and switches on `part.state` (switching on the destructured `state` before the switch widens `part.output` to `never`/`undefined` and breaks narrowing — switch on `part.state` and read `part.output` inside the `output-available` arm): `input-streaming → null`; `input-available → <InvoiceStatsCard.Skeleton />` (card-shaped, built from shadcn `<Skeleton />`, stat slots — **not** a generic spinner); `output-available →` the real card (`count`, `totalAmount` currency-formatted, `byStatus` as a small `<dl>`, `oldestUnpaidDueDate` via Temporal `PlainDate` with a "—" fallback on null, optional filter hint in the title); `output-error → <p className="text-destructive">I couldn't load those stats. Try rephrasing.</p>`. `data-testid="invoice-stats-card"` on the rendered card; the skeleton `data-testid="invoice-stats-skeleton"`.
- **`src/app/(app)/invoices/token-usage-panel.tsx`** — `'use client'`; `useEffect` polling `/api/usage` every 10s via `setInterval` cleared on unmount; `useState<{ used; cap; remaining } | null>`; a horizontal bar colored by remaining (green > 50%, yellow 10–50%, red < 10%) + remaining count. `data-testid="token-usage-panel"`, the bar fill `data-testid="usage-bar"`. (`/invoices/page.tsx` already mounts both in the right rail from the scaffold — no page edit needed unless the mount order changed.)

Excludes: persisting `messages` (named forward pointer — refresh loses the conversation), a distinct `quota_exceeded` toast by parsing the body (named refinement — the default `onError` toast is generic). Contracts: the full client surface; `part.output` typed end-to-end via `InferUITools`.

Screenshot:
- L5 (`/invoices`, desktop 1280×900 + mobile 390×844, state settled): the finished right-rail chat surface — the typed client shell, the usage panel bar, and the stats-card skeleton component visible in its loading shape (rendered statically so the figure is deterministic without a live call). Desktop + mobile because the `lg:grid-cols-[2fr_1fr]` rail stacks under the list on mobile. `data-testid="invoice-chat"`, `data-testid="token-usage-panel"`. (Owns the final chat surface — S4 is the last slice touching it.)

## Start derivation

Derive `start/` from the completed `solution/` by reverting the **nine slice-authored files** to their scaffold stubs (the exact `TODO(L<n>)` stubs the Scaffolding recipe describes) and **keeping everything else byte-identical** — the entire 062 carry-in, the model handle, `env.ts`, the two store arrays + helpers + seed, `authed-route.ts`, `with-llm-quota.ts`, the `/invoices` page chat-rail mount, the complete `/inspector`, the lesson-test runner, all configs. Each reverted stub body carries its `// TODO(L<n>) — <task>` marker so `rg TODO start/` enumerates the student work.

Revert to stubs (matching the Scaffolding recipe's stub bodies exactly):
- `src/lib/llm/prompts.ts` — `// TODO(L2) — invoiceQAPrompt: force tool-grounding, refuse cross-org, define the { error } behavior`. Body returns a placeholder string.
- `src/lib/llm/audit.ts` — `// TODO(L2) — writeLlmStepEvent / writeLlmFinishEvent: push one llm.step / llm.finish event into the store`. No-op bodies.
- `src/lib/llm/tools.ts` — `// TODO(L3) — getInvoiceStats: closure over orgId, aggregate outputSchema, return-don't-throw`. Stub `buildInvoiceTools` returns the empty-schema tool so `InvoiceUIMessage` still compiles.
- `src/lib/llm/quota.ts` — `// TODO(L4) — readUsage / reserveQuotaOrRefuse / addUsage over usageQuota, DAILY_TOKEN_CAP cap`. Stubs return the permissive shapes (so `with-llm-quota.ts` + `/api/usage` compile).
- `src/app/api/chat/route.ts` — `// TODO(L2) — POST = withLlmQuota(authedRoute('member', …, streamText with stopWhen + onFinish)); tools in L3, quota increment in L4`. Stub returns 501.
- `src/app/api/usage/route.ts` — `// TODO(L4) — GET = authedRoute('member', …, readUsage(ctx.userId))`. Stub returns the zero shape.
- `src/app/(app)/invoices/invoice-chat.tsx` — `// TODO(L2) — smoke-test useChat client; TODO(L5) — full typed parts-rendering client`. Stub: inert disabled card.
- `src/app/(app)/invoices/invoice-stats-card.tsx` — `// TODO(L5) — switch on part.state across the four lifecycle states, per-tool skeleton`. Stub: `null` + static skeleton.
- `src/app/(app)/invoices/token-usage-panel.tsx` — `// TODO(L5) — poll /api/usage every 10s, color the bar by remaining`. Stub: static 0/100k bar.

`start/` must pass `pnpm verify` (the stubs compile and render; the app boots with the inert shell). `rg TODO start/` lists exactly these nine markers (L2×3 across prompts/audit/route, plus tools L3, quota L4, usage L4, and the three client files L2/L5/L5).

## Locked decisions

- **In-memory store, not Drizzle/Postgres (resolves outline drift).** No Docker, no `drizzle-orm`, no `db:migrate`, no `env`-validated `DATABASE_URL`, no pgvector. Invoice reads go through `scopedInvoices(orgId).active()` (the 062 helper); the quota and audit "tables" are `usageQuota` / `llmAuditEvents` store arrays with `findQuotaRow` / `pushLlmAuditEvent` / `todayUtc` helpers. Every chapter-outline `tenantDb(orgId).invoices.active()` maps to `scopedInvoices(orgId).active()`. The `ctx.db` on the route context is a thin store facade exposing only `query.organization.findFirst` (for `orgName`).
- **No live model call in the pipeline.** `pnpm verify`, the lesson tests, and the rendered checks never execute a real `streamText`/`useChat` round-trip (no key, non-deterministic). Tests assert source shape + SSR/first-paint output; rendered checks assert the chat shell + the two-pane layout paint. The streamed answer, the 429 toast, the forged-orgId proof, and the step-ceiling demo are **manual Moments of truth** driven by the lesson MDX against a real `AI_GATEWAY_API_KEY`, reachable via the seeded near-cap row + the inspector toggles. `env.ts` skips validation outside production so the build is green without a key.
- **`withLlmQuota` composed around `authedRoute` (resolves the outline-aligner flag; honors 105 L2 / 106 L1 / 107).** The chat route is `withLlmQuota(authedRoute('member', schema, fn))`. `withLlmQuota` (provided seam) calls `reserveQuotaOrRefuse(userId)` and short-circuits a typed 429 before delegating; the route is unaware it owns quota. `addUsage` runs in the route's `onStepFinish` (per-step, inside the loop). The chapter outline's inline `reserveQuotaOrRefuse(ctx.user.id)` snippet is reconciled to this wrapper form — lesson writers present the wrapper, noting the wrapper is the structural seam (quota can't be forgotten on a new route), not an inline call. `ctx.user.id` in outline snippets = `ctx.userId` in this codebase (the 062 `AuthedCtx` shape).
- **`authedRoute` is the provided `Request`/`Response` twin of 062's `authedAction`.** Signature `authedRoute(role, schema, fn)`; `fn(parsedBody, ctx)` returns a `Response`; refusals are typed `Result`-shaped JSON with the status table (401 no identity, 403 role, 400/422 parse, 429 quota via the wrapper, 500 throw). `ctx = { session, orgId, userId, role, db }`. `GET` requests with no body parse against `z.strictObject({})` (treat absent body as `{}`).
- **One read-only tool, closure-bound `orgId`.** The registry is exactly `getInvoiceStats`. `orgId` is **never** in `inputSchema`; `execute` closes over `ctx.orgId`. The inspector's `MODEL_FROM_INPUT_ORGID` flag is the only path that reads `orgId` from model input — default off, and exists solely to make the cross-tenant leak visible when flipped. `execute` returns the aggregate projection (`{ count, totalAmount, byStatus, oldestUnpaidDueDate }`), never raw rows, and returns `{ error: 'stats_unavailable' as const }` (never throws) on the `FORCE_TOOL_ERROR` flag or a caught failure.
- **Server-owned loop + output cap, non-negotiable.** Every `streamText` call carries `stopWhen: stepCountIs(5)` and `maxOutputTokens: 1024`. No client-side `maxSteps`. A missing cap is the same severity as a missing auth check (105 L2). `stopWhen` is set in S1 before any tool exists (set first on purpose).
- **v5 AI SDK surface only.** `ai@^5`, `@ai-sdk/react@^2`. Use `streamText`, `convertToModelMessages`, `toUIMessageStreamResponse()`, `stopWhen: stepCountIs(5)`, `tool({ description, inputSchema, outputSchema, execute })`, `InferUITools` (for the `UIMessage` tool map), `UIToolInvocation<Tool>` (for a tool-part component's props — the type with `state`/`input`/`output`), `useChat<InvoiceUIMessage>`, `DefaultChatTransport`, `sendMessage`, `regenerate`, `status`, `message.parts`. **The `useChat` endpoint is set via `transport: new DefaultChatTransport({ api: '/api/chat' })`, NOT a top-level `api` option** — `@ai-sdk/react@2` removed the `api` string option from `useChat`; passing `useChat({ api: '/api/chat' })` is a hard TS error (`'api' does not exist in type 'UseChatOptions'`, verified June 2026 against `@ai-sdk/react@2.0.203`). **Forbidden:** v6 `Output.*`/migrated APIs, `@ai-sdk/openai` (bare gateway string instead), `generateObject`/`streamObject`/`useObject`/`useCompletion`, `append`/`reload`/`message.content`, `ai/rsc`/`streamUI`, client `maxSteps`, the removed top-level `useChat({ api })` option.
- **Model handle is a bare AI Gateway string.** `chatModel = 'openai/gpt-5-mini'` in `lib/llm/models.ts`, `camelCase`, `import 'server-only'`. No provider factory, no inline string at the call site, no `@ai-sdk/openai` import. The SDK reads `AI_GATEWAY_API_KEY` from `process.env` (105 L3). (gpt-5-mini is a current AI Gateway model id, verified June 2026.)
- **The `lib/llm` seam is the only doorway.** The two route handlers (`api/chat`, `api/usage`) and `invoice-chat.tsx` (for `InvoiceUIMessage` only) are the **only** importers of `@/lib/llm/*`. No Server Component imports the tools or the prompt. `with-llm-quota.ts` and `audit.ts` and `quota.ts` start `import 'server-only'`.
- **Stable selectors via `data-testid`** (rendered checks read these, never positional/text selectors):
  - 062 carry-in (unchanged): `invoices-page`, `invoices-grid` (the two-pane grid — exactly two children), `inspector-page`.
  - Chat rail: `invoice-chat`, `chat-input`, `chat-send`, `invoice-stats-card`, `invoice-stats-skeleton`, `token-usage-panel`, `usage-bar`.
  - Inspector LLM panels: `usage-counter`, `force-quota`, `force-tool-error`, `llm-audit-tail`, `llm-audit-row`, `forge-orgid`, `flag-bypass-authed-route`, `flag-model-from-input-orgid`.
- **Structural single-slot / single-element invariants** (carried from 062; the layout must not render-break):
  - The root `app/layout.tsx` resolves to one `<nav>` + one `<main>{children}</main>` (the `(app)` route group is layout-less and inherits the root layout — do **not** add an `(app)/layout.tsx`). No bare sibling fragment dropped into a flex/grid parent (the ch035 fragment-flatten footgun).
  - `data-testid="invoices-grid"` must resolve to **exactly two direct children** — the list region (left) and the chat rail `<aside>` (right). The chat rail is **one** `<aside>` slot; `<TokenUsagePanel />` + `<InvoiceChat />` nest **inside** it, never as additional grid children. A region placed as a single slot must resolve to a single element.
  - `/invoices` and `/inspector` each resolve to one root element under their `data-testid` (no top-level fragment flattening into the layout's `<main>`).
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`), carried from the 062 fork unless noted:**
  - `tsconfig.json`: `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, **both** `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` in `include`, `"allowJs": false`, **no `baseUrl`** (TS 6 errors on it — `"paths": { "@/*": ["./src/*"] }` resolves under `moduleResolution: "bundler"`), `next-env.d.ts` excluded from Biome via `files.includes`. `lesson-verification/` kept out of `include` (run by vitest, not built) so forward-referencing tests never fail `start/` tsc.
  - `next.config.ts`: `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true` (needs `babel-plugin-react-compiler@1.0.0`), `turbopack: { root: __dirname }` (multi-lockfile silence). Dynamic hrefs (e.g. the inspector's "open in two tabs" link) use `import type { Route } from 'next'` + cast `as Route` (062 already does this). The streaming `/api/chat` route handler is dynamic by definition and the chat surface is fully client-side, so neither interacts with Cache Components; `/invoices` keeps its existing `loading.tsx`.
  - `biome.json` (062 carry): `"css": { "parser": { "tailwindDirectives": true } }`, `files.includes` ignores without trailing `/**` (`["**", "!next-env.d.ts", "!.next", "!node_modules"]`). The `globalThis` lazy-init idiom for the inspector flags must be **split-statement** (`globalThis.__x ??= {…};` then read on the next line) — the one-line `??=`-in-expression form trips `lint/suspicious/noAssignInExpressions` and fails `biome ci`. Skeleton placeholder lists map over a stable string-key tuple, not `Array.from(...).map((_,i)=>key={i})` (`noArrayIndexKey`).
  - `pnpm-workspace.yaml`: `allowBuilds: { sharp: true }` (Next pulls `sharp` transitively; pnpm 11 won't build it unattended → cold-install `next build` fails without it). No `pnpm` key in `package.json`. (062 carries this; confirm it survived the fork. `ai`/`@ai-sdk/react` need no native build, so no new `allowBuilds` entry.)
  - lucide-react 1.x: no brand icons (`Github`/`Twitter`/… removed) — use non-brand glyphs only (`MessageCircle`, `Send`, `Sparkles` if present, else `Bot`/`Zap` family).
  - Tailwind v4: `motion-reduce:` on any visible animation; stack it under the responsive variant if paired (`md:motion-reduce:...`). The usage bar uses width/color utilities, not `scale-*`.
  - `verify` is exactly `biome ci . && tsc --noEmit && SKIP_ENV_VALIDATION=true next build` (the locked string; the 062 lineage's extra `next typegen` is dropped — the locked tsconfig `include` covers the generated route types). The `SKIP_ENV_VALIDATION=true` keeps the production-mode build green without a real key (see Env module / Locked decisions on no-live-call).
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, nuqs `^2.8.9`, next-themes `^0.4.6`, lucide-react `^1.17.0`, sonner `^2.0.7`, tailwindcss `^4.3.0`, `@tailwindcss/postcss@^4.3.0`, tw-animate-css `^1.4.0`, uuidv7 `^1.0.2`, babel-plugin-react-compiler `1.0.0`, vite-tsconfig-paths `^5.1.4`, `@types/node@^25.9.1`, `@types/react@^19.2.16`, `@types/react-dom@^19.2.3`, pnpm `11.3.0`. **Added for 108:** `ai@^5.0.0`, `@ai-sdk/react@^2.0.0`, `@t3-oss/env-nextjs@^0.13.0`, `temporal-polyfill@^0.3.0`. **The `ai@^5` + `@ai-sdk/react@^2` carets are the deliberate v5-line pins** — the package family has since shipped `ai@6` / `@ai-sdk/react@3` (the v6 surface the unit forbids per 106 L2 / 107 L2); the `^5`/`^2` carets cap below those majors. Do **not** bump them (the AI SDK 5 install pairing is `ai@5` + `@ai-sdk/react@2`, verified June 2026). `@ai-sdk/openai` is **not** installed (bare gateway string).
- **Code conventions (from `documentation/code standards/Code conventions.md`), applied to the surfaces slices touch:**
  - Route handlers: one handler file per route, named `POST`/`GET` exports, cheapest-first parse, RFC-9457-shaped errors with the status table (the `Result`-shaped JSON here mirrors it). The `authedRoute(role, schema, fn)` wrapper is the route twin of `authedAction`.
  - Zod 4: `z.strictObject` (extra keys are a bug), `z.enum` for the status set, top-level format builders (`z.iso.date()` not `z.string().date()`), `.describe()` is read by the model on tool input fields, `z.infer` for parsed types. No parallel type definitions.
  - Components/JSX: typed props as the parameter, refs as a regular `Ref<T>` prop (no `forwardRef`), `children: ReactNode`, `cn()` last so caller overrides win, `default: return null` in the part switch, `condition && <Node/>` only on proper booleans.
  - Hooks/Compiler: no `useMemo`/`useCallback`/`React.memo` (the Compiler memoizes); `useState` for the local chat input (URL state would be nuqs, but chat input is ephemeral local state); `useEffect` only for the external-system poll (`setInterval` cleared on unmount) — not for deriving state.
  - shadcn: primitives used as imported from `components/ui/*` (`Skeleton`, `Button`, `Card`, `Input`/textarea); the per-tool skeleton is built from `<Skeleton />`, never a generic spinner (107 L2 rule). `Card` has no `asChild` — inline its classes if a semantic root is needed.
  - Time: the stats card formats `oldestUnpaidDueDate` via `Temporal.PlainDate` (Temporal is the default; `Date` is forbidden in domain code) with `temporal-polyfill`; Temporal values are encoded as ISO strings at the RSC/wire boundary (they don't serialize).
  - Comments: rare; `TODO(L<n>) — <thing>` on every stub naming the owning lesson; runtime-invariant / senior-call notes only where the reader can't infer (the closure-`orgId` line, the trade-offs in `quota.ts`).
  - Module boundaries: `'use client'` at the smallest interactive leaf (the three chat client files); `import 'server-only'` on every `lib/llm/*` module and `authed-route.ts`; never put secrets in props (the key never reaches a Client Component — `chatModel` is server-only, the client only knows the `/api/chat` URL).

## File tree

Tree after the last slice (`solution/`). Slice-authored files tag the slice that fills them; provided/seeded files carry no slice tag. The unchanged 062 carry-in (`/invoices` list internals, `/inspector` carry-in, UI primitives, `result`/`utils`/`authed-action`/`scoped-query`/`queries`/`search-params`, configs) is elided as `… (062 lineage, unchanged)`.

```
projects/Chapter 108/solution/
├── package.json                              — chapter-108-ask-your-invoices; 062 deps + ai/@ai-sdk/react/@t3-oss/env-nextjs/temporal-polyfill; verify = biome ci . && tsc --noEmit && SKIP_ENV_VALIDATION=true next build
├── pnpm-workspace.yaml                       — allowBuilds { sharp: true } (062 carry)
├── next.config.ts                            — cacheComponents/typedRoutes/reactCompiler/turbopack (062 carry)
├── tsconfig.json                             — locked includes (.next/types + .next/dev/types); lesson-verification excluded; no baseUrl (062 carry, verify fixed)
├── biome.json                                — 062 carry (tailwindDirectives, files.includes)
├── vitest.config.ts                          — node env; include lesson-verification/**/*.ts (062 carry)
├── .env.example                              — AI_GATEWAY_API_KEY= (manual live-chat only)
├── README.md                                 — setup ladder, /invoices is the chat surface, /inspector verification, live-key note (adapted from 062)
├── AGENTS.md                                 — 062 carry + the lib/llm seam note
├── scripts/
│   └── test-lesson.mjs                       — node wrapper (runs one lesson-verification/Lesson <n>.ts) (062 carry)
├── lesson-verification/                      — (empty here; project-lesson-test-coder fills Lesson 2.ts … Lesson 5.ts later)
└── src/
    ├── env.ts                                — @t3-oss/env-nextjs; AI_GATEWAY_API_KEY server-only; skipValidation outside prod (provided)
    ├── server/
    │   ├── store.ts                          — 062 store + organizations[{id,name}] + usageQuota[] + llmAuditEvents[] + helpers + near-cap seed (provided, edited)
    │   ├── types.ts                          — 062 types + UsageQuotaRow + LlmAuditEvent (provided, edited)
    │   └── session.ts                        — 062 cookie dev-identity; never redirects (unchanged)
    ├── lib/
    │   ├── authed-action.ts                  — 062 FormData action wrapper (unchanged)
    │   ├── authed-route.ts                   — authedRoute(role, schema, fn): Request→Response twin; status table; ctx.db org facade (provided)
    │   ├── result.ts                         — 062 Result<T> (unchanged)
    │   ├── utils.ts                          — cn() (unchanged)
    │   ├── invoices/
    │   │   ├── scoped-query.ts               — scopedInvoices(orgId).active()/… (062, unchanged — the tool reads through this)
    │   │   └── … (queries.ts, search-params.ts — 062 lineage, unchanged)
    │   └── llm/
    │       ├── models.ts                     — chatModel = 'openai/gpt-5-mini' (bare gateway string, server-only) (provided)
    │       ├── with-llm-quota.ts             — withLlmQuota(handler): reserve → 429 or delegate (provided; calls quota.ts)
    │       ├── prompts.ts                     — invoiceQAPrompt({ orgName }) [filled by: S1]
    │       ├── audit.ts                       — writeLlmStepEvent / writeLlmFinishEvent → llmAuditEvents [filled by: S1]
    │       ├── tools.ts                       — buildInvoiceTools({orgId}); getInvoiceStats; InvoiceTools; InvoiceUIMessage [filled by: S2]
    │       └── quota.ts                       — DAILY_TOKEN_CAP/readUsage/reserveQuotaOrRefuse/addUsage over usageQuota [filled by: S3]
    ├── app/
    │   ├── (app)/
    │   │   └── invoices/
    │   │       ├── page.tsx                   — 062 list + chat rail mounted in <aside> (TokenUsagePanel + InvoiceChat) (provided, edited)
    │   │       ├── invoice-chat.tsx           — 'use client'; useChat<InvoiceUIMessage>; parts switch [smoke-test by: S1; full typed client by: S4]
    │   │       ├── invoice-stats-card.tsx     — 'use client'; four-state switch + per-tool Skeleton [filled by: S4]
    │   │       ├── token-usage-panel.tsx      — 'use client'; polls /api/usage every 10s; colored bar [filled by: S4]
    │   │       └── … (loading.tsx, table.tsx, toolbar.tsx, view-tabs.tsx, pagination.tsx, [id]/edit/* — 062 lineage, unchanged)
    │   ├── api/
    │   │   ├── chat/
    │   │   │   └── route.ts                   — POST = withLlmQuota(authedRoute('member', …, streamText: stopWhen+maxOutputTokens+onFinish[+tools S2][+onStepFinish/addUsage S2/S3])) [filled by: S1, edited by: S2, S3]
    │   │   └── usage/
    │   │       └── route.ts                   — GET = authedRoute('member', …, readUsage(ctx.userId)) [filled by: S3]
    │   ├── inspector/
    │   │   ├── page.tsx                       — 062 panels + usage-counter/force-quota/force-tool-error/llm-audit-tail/forge-orgid/two debug flags (provided, edited)
    │   │   ├── actions.ts                     — 062 actions + force-quota/force-tool-error/flag toggles (provided, edited)
    │   │   └── loading.tsx                    — (062 lineage, unchanged)
    │   ├── _components/ …                      — (062 lineage: providers, submit-button)
    │   ├── layout.tsx                          — root layout: one <nav> + one <main>{children} (single-slot invariant; 062 carry)
    │   ├── globals.css                         — (062 lineage, unchanged)
    │   └── page.tsx                            — redirect / → /invoices (062 carry)
    └── components/ui/*                         — (shadcn primitives incl. skeleton/button/card/input, unchanged)
```

`start/` is identical except the nine slice-authored files are reverted to their `TODO(L<n>)` stubs (`prompts.ts`, `audit.ts`, `tools.ts`, `quota.ts`, `api/chat/route.ts`, `api/usage/route.ts`, `invoice-chat.tsx`, `invoice-stats-card.tsx`, `token-usage-panel.tsx` — note `invoice-chat.tsx` reverts to the inert-shell stub, not the smoke-test client); everything else (the provided seams, `env.ts`, the store edits + seed, the `/invoices` page mount, the complete `/inspector`, all configs, the runner) is byte-identical.

## Verification

### Static checks (the reviewer executes)

Scope tagged per check. No check requires a real `AI_GATEWAY_API_KEY` or a live model call. Paths under `src/app/(app)/...` contain parens/spaces — quote them.

- **(both) `pnpm verify` passes** in `solution/` and `start/` — `biome ci . && tsc --noEmit && SKIP_ENV_VALIDATION=true next build` green, with env validation skipped on the build via `SKIP_ENV_VALIDATION=true` (no real key needed). The `start/` stubs compile and the app boots with the inert chat shell.
- **(both) the lesson-test runner narrows to one file:** `pnpm test:lesson 2` resolves and runs only `lesson-verification/Lesson 2.ts` (one path, no glob OR-match) — clean "no test files found" until the test-coder writes it.
- **(start) `rg "TODO" start/src/` enumerates exactly the nine slice markers** (prompts L2, audit L2, tools L3, quota L4, chat route L2, usage route L4, invoice-chat L2/L5, invoice-stats-card L5, token-usage-panel L5); **(solution)** those nine files carry **zero** `TODO(L` markers (bodies filled).
- **(solution) the chat route is wrapped + capped + audited** (load-bearing — fails if the route ships inert): in `"src/app/api/chat/route.ts"` — `grep -q "withLlmQuota" …` (quota composed around) **and** `grep -q "authedRoute" …` (auth wrap) **and** `grep -q "stepCountIs(5)" …` (server loop cap) **and** `grep -q "maxOutputTokens" …` (output cap) **and** `grep -q "toUIMessageStreamResponse" …` (v5 return) **and** `grep -q "convertToModelMessages" …` (the seam) **and** `grep -q "onFinish" …` (audit). Negative: `! grep -q "maxSteps" …` (no client loop control) and `! grep -q "@ai-sdk/openai" …` (bare gateway string).
- **(solution) the tool is org-scoped and projects an aggregate** (load-bearing — fails if `getInvoiceStats` ships inert or leaks rows): in `"src/lib/llm/tools.ts"` — `grep -q "getInvoiceStats" …` **and** `grep -q "scopedInvoices" …` (reads through the 062 scope helper, not raw store) **and** `grep -q "outputSchema" …` **and** `grep -q "stats_unavailable" …` (return-don't-throw) **and** `grep -q "InferUITools" …` (the typed message). Negative — `orgId` is **not** in the input schema: the `inputSchema` block must not contain `orgId` (confirm `inputSchema` lists only `status`/`since` — e.g. `rg "inputSchema" -A4 "src/lib/llm/tools.ts"` shows no `orgId`).
- **(solution) the quota enforces a real cap** (load-bearing — fails if quota is inert): in `"src/lib/llm/quota.ts"` — `grep -q "DAILY_TOKEN_CAP" …` **and** `grep -qE "100_?000" …` (the 100k cap is real, not a placeholder) **and** `grep -q "quota_exceeded" …` (the typed refusal) **and** `grep -q "usageQuota\|findQuotaRow" …` (reads the real store array). The route increments per step: `grep -q "addUsage" "src/app/api/chat/route.ts"` and `grep -q "onStepFinish" "src/app/api/chat/route.ts"`.
- **(solution) the wrapper reserves before the stream:** `grep -q "reserveQuotaOrRefuse" "src/lib/llm/with-llm-quota.ts"` **and** `grep -qE "429" "src/lib/llm/with-llm-quota.ts"` (the short-circuit). (Proves quota is structural in the wrapper, not inlined in the handler — the resolved design.)
- **(solution) the usage endpoint is auth-wrapped and real:** `grep -q "authedRoute" "src/app/api/usage/route.ts"` **and** `grep -q "readUsage" "src/app/api/usage/route.ts"`.
- **(solution) the system prompt is the controller:** in `"src/lib/llm/prompts.ts"` — `grep -qi "getInvoiceStats" …` (forces tool-grounding) **and** `grep -qi "other organization\|cross-org\|another org" …` (refuses cross-org). `grep -q "orgName" …` (templates the org, not user data).
- **(solution) the audit writers hit the real array:** `grep -q "pushLlmAuditEvent" "src/lib/llm/audit.ts"` and both `grep -q "llm.step" …` and `grep -q "llm.finish" …`.
- **(solution) the client is the typed v5 shape** (load-bearing — fails if the client ships v4 or inert): in `"src/app/(app)/invoices/invoice-chat.tsx"` — `grep -q "useChat<InvoiceUIMessage>" …` (the typed generic) **and** `grep -q "sendMessage" …` **and** `grep -q "message.parts\|m.parts\|.parts.map" …` **and** `grep -q "tool-getInvoiceStats" …` (renders the tool part). Negative: `! grep -qE "append\(|reload\(|message\.content|ai/rsc|streamUI" …` (no v4/experimental surface).
- **(solution) the stats card renders four states with a per-tool skeleton, not a spinner:** in `"src/app/(app)/invoices/invoice-stats-card.tsx"` — `grep -q "input-available" …` and `grep -q "output-available" …` and `grep -q "output-error" …` and `grep -q "Skeleton" …`; negative `! grep -rqi "spinner" "src/app/(app)/invoices/"` (the `-r` recurses the chat tree — a bare `grep -qi pattern DIR/` without `-r` greps the directory entry, not its files, and is a no-op).
- **(solution) the usage panel polls:** in `"src/app/(app)/invoices/token-usage-panel.tsx"` — `grep -q "/api/usage" …` and `grep -q "setInterval" …` and `grep -q "clearInterval" …` (cleared on unmount).
- **(both) the `lib/llm` seam is sealed** (the only importers are the two routes + the chat client): `rg -l "@/lib/llm/" src/` lists only `src/app/api/chat/route.ts`, `src/app/api/usage/route.ts`, `src/lib/llm/*` (intra-seam), and `src/app/(app)/invoices/invoice-chat.tsx` — **no** Server Component (`page.tsx`, inspector) imports the tools or prompt. (`invoice-chat.tsx` imports only the `InvoiceUIMessage` type.)
- **(both) the model handle is a bare gateway string:** `grep -q "openai/gpt-5-mini" "src/lib/llm/models.ts"` and `! grep -rq "@ai-sdk/openai" src/` (no provider package imported anywhere).
- **(both) no Drizzle/Docker crept in (in-memory invariant):** `! grep -rq "drizzle-orm" src/` and no `docker-compose.yml` at the solution root and `! grep -rq "tenantDb" src/` (reads go through `scopedInvoices`).
- **(both) the two new store arrays + helpers exist:** `grep -q "usageQuota" src/server/store.ts` and `grep -q "llmAuditEvents" src/server/store.ts` and `grep -q "pushLlmAuditEvent" src/server/store.ts` and `grep -q "todayUtc" src/server/store.ts`; the near-cap seed: `grep -q "90_?000\|90000" src/server/store.ts`.
- **(both) the provided seams exist:** `test -f src/lib/authed-route.ts && test -f src/lib/llm/with-llm-quota.ts && test -f src/lib/llm/models.ts && test -f src/env.ts`.

### Rendered checks (slice coders + inspector run against the running app)

The pipeline boots the in-memory app (no Docker, no third-party round-trip, no login, default dev identity `org-acme:admin`). Only the **deterministically-rendered** chat shell + the two-pane layout are checked — never a streamed answer (no key, non-deterministic). Each check is owned by the slice after which visiting `/invoices` first renders the surface end-to-end.

| field | r-chat-rail-mounted | r-invoices-two-pane | r-stats-skeleton-shape | r-usage-panel-paints |
|---|---|---|---|---|
| **id** | r-chat-rail-mounted | r-invoices-two-pane | r-stats-skeleton-shape | r-usage-panel-paints |
| **slice** | S1 | S1 | S4 | S4 |
| **route** | `/invoices` | `/invoices` | `/invoices` | `/invoices` |
| **viewport** | 1280×900 | 1280×900 (desktop) | 1280×900 | 390×844 (mobile) |
| **state** | settled (default identity) | settled | settled | settled |
| **intent** | the chat rail mounts in the right rail with the smoke-test client interactive and the list still rendering, so L2's "streaming route is live" figure is capturable | the list+chat compose as a two-pane layout: exactly two grid children, list left and chat rail right, in one row at desktop width | the per-tool stats skeleton renders in its card shape (the loading affordance the tool-parts model provides), not a generic spinner — verified statically since a live call is non-deterministic | the usage panel paints its bar and the rail stacks under the list on mobile, confirming the responsive `lg:grid-cols` collapse |
| **selectors** | `invoice-chat`, `chat-input`, `chat-send`, `invoices-page` | `invoices-grid` | `invoice-stats-skeleton` | `token-usage-panel`, `usage-bar`, `invoices-grid` |
| **assertion** | `invoice-chat` resolves to exactly one element, is a descendant of `invoices-page`, and contains a visible `chat-input` textarea + `chat-send` button; the page did not crash into an error boundary (`invoices-page` present ⇒ no thrown render) | `invoices-grid` has exactly **two** direct children; at 1280 the first (list region) sits left and the second (chat rail `<aside>`) sits right in the same row (the right child's left edge ≥ the left child's right edge, both top-aligned) — the single-slot rail did not split into extra cells | `invoice-stats-skeleton` resolves to exactly one element built from skeleton blocks (≥ 2 child placeholder elements, a card shape), and no element matching a generic spinner (`[data-testid="invoice-stats-skeleton"]` exists; no `.animate-spin`/spinner in the chat subtree) — rendered by mounting the component's `.Skeleton` directly | at 390 width `invoices-grid` stacks to one column (the two children are vertically stacked, the chat rail's top edge ≥ the list region's bottom edge), `token-usage-panel` resolves to one element, and `usage-bar` is present with a non-zero width style — the panel paints its budget bar |

- **r-chat-rail-mounted (S1):** owned by S1 — the first slice's render checkpoint is that the chat rail mounts and the smoke-test client is interactive on the seeded list. Child-count + descendant condition, holds at any width; the 1280×900 tag matches the L2 screenshot.
- **r-invoices-two-pane (S1):** owned by S1 — guards the `invoices-grid` two-child single-slot invariant (a fragment-flattened rail would split into extra grid cells and the L2/L5 figures would render wrong). The two-child condition holds at any width; the **left/right geometry is desktop-only** (tagged 1280×900) — at mobile the grid is one column.
- **r-stats-skeleton-shape (S4):** owned by S4 — the per-tool skeleton is the load-bearing affordance of the tool-parts model (107 L2). Verified by mounting `InvoiceStatsCard.Skeleton` directly (deterministic, no live call). Child-count + no-spinner condition, holds at any width.
- **r-usage-panel-paints (S4):** owned by S4 — confirms the usage panel paints and the responsive rail collapses to one column on mobile (the `lg:grid-cols-[2fr_1fr]` → single column). Geometric stacking condition is **mobile-specific** (tagged 390×844).

Every slice with a screenshot (S1, S4) owns a rendered check covering that surface (S1 → r-chat-rail-mounted + r-invoices-two-pane; S4 → r-stats-skeleton-shape + r-usage-panel-paints). S2 and S3 add no visible deterministic surface (their effects are streamed answers / audit rows / the 429, all manual Moments of truth), so they carry no screenshot and no rendered check — their correctness is the static greps above.
