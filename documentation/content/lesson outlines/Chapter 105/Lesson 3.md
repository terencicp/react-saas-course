# One-line model swaps and the AI Gateway

- Title (h1): `One-line model swaps and the AI Gateway`
- Sidebar label: `Swappable models & the Gateway`

---

## Lesson framing

This is the chapter's **vendor-durability** lesson: the third and last production discipline (after the trigger filter in L1 and the cost gauntlet in L2). The senior question it answers: *a SaaS that ships an LLM feature in 2026 will swap models several times next year — cheaper, faster, smarter, or as a fallback when the primary is down — so how is the integration shaped so a swap is one line, not a sprint of rewrites?*

**The one carry-out mental model** the student should leave with: a model is a **configuration value, not a code dependency**. The provider belongs in one file (`lib/llm/models.ts`) behind a **role-named handle** (`fastModel`, `smartModel`), every call site imports the handle, and a swap is a one-line edit nobody else's code can feel. This is the exact same discipline the student already owns from `lib/db/index.ts` (the Drizzle client) and `lib/llm/pricing.ts` (L2) and `lib/rate-limit.ts` — one place owns the config, the rest of the codebase reaches for the named export. Anchor the whole lesson to that recognition: *you've done this four times already; this is the fifth.*

**Critical accuracy update from fact-check (bakes into the whole lesson).** AI SDK 5's *global provider* now defaults to the **Vercel AI Gateway**, which means a generation call accepts a **plain `'creator/model'` string** (e.g. `model: 'openai/gpt-5.5'`) with **no provider package import** — the SDK routes it through the gateway by default. This makes the lesson's thesis more literal than the chapter outline assumed: the swap is *already* a string change, and the gateway is *already* the default path, not an opt-in you bolt on. So the lesson's spine is:
1. The model handle is the configuration boundary (string or provider-object form — show both, prefer the string).
2. Centralize it in `lib/llm/models.ts` behind role names — the SDK gives you a one-line swap, this file gives you a *zero-call-site* swap.
3. The gateway (the default behind the string) earns its weight at production with four features the bare SDK doesn't ship: failover, observability, unified billing, BYOK. Name the three triggers that flip it from "fine for a prototype" to "non-negotiable."
4. Two traps that break the clean abstraction story: **embeddings are not portable** (a swap is a re-indexing project, not a one-liner), and a model named after its vendor (`gpt5ForChat`) hardcodes the thing you were trying to abstract.

**Pedagogical stance.** This is a decisions lesson, same as L1/L2 — *zero runnable routes are built*. Every generation call is elided with the established `// model call — Chapter 106` marker; the only code that is "real" is the configuration file (`lib/llm/models.ts`), the env shape, and the failover config, because those are the lesson's actual subject (placement and configuration, not call-site mechanics). Keep tone terse and senior, consistent with L1/L2's voice. Lead each section with the failure the discipline prevents, then the discipline. The recurring beginner error this lesson kills: inlining `openai('gpt-5.5')` (or, now, the string `'openai/gpt-5.5'`) at the call site so every swap is a grep-and-replace across the codebase — and the subtler one, baking the vendor into the *variable name* so even the central file doesn't save you.

**Cognitive-load ordering.** Build complexity in stages: (1) one call site, one inlined model → show the swap pain; (2) extract to a named handle in one file → swap is one line; (3) name the role, not the vendor → swap survives a *provider* change, not just a *version* change; (4) the gateway layer behind it → swap gains failover + observability for free; (5) the embedding asterisk → not everything swaps cleanly. Each stage adds exactly one idea to the previous picture.

**Carry-debts honored from continuity:** all call-site syntax (`streamText`/`generateText`/`generateObject`) stays in Ch106; tools/agentic loop + embeddings *implementation* in Ch107; the worked invoice surface in Ch108. The L2 `withLlmQuota` composition convention and the `lib/llm/pricing.ts` model-keyed table are *prerequisites this lesson builds on*, not re-taught. The L2 provider-429 card explicitly forward-pointed "the gateway's failover removes this branch — next lesson"; this lesson closes that loop.

---

## Lesson sections

### Intro (no header)

Open with the churn, concretely, to motivate the discipline before naming it. A representative shape: *you shipped the invoice chat on one provider's model in spring; by autumn a competitor released a model that's half the price and noticeably better at numbers, and your CFO wants the cheaper bill.* Then the gut-punch: if you typed the model name at the call site, that swap is now a grep across every route, every test, every fixture — a multi-day PR with a blast radius, for what should be a one-character change. The provider landscape is *accelerating, not stabilizing* (echo L1's "a major model lands almost every month") — so a SaaS that can't swap cheaply is paying a tax on every release someone else ships.

State the lesson's promise plainly: by the end, a model swap in your codebase is a one-line edit in one file, and you'll know exactly when to put the AI Gateway behind it. Connect to prior knowledge in one sentence — *this is the `lib/db/index.ts` discipline, applied to the model* — so the student files it under a pattern they already trust rather than a new thing to learn.

One scoping sentence (mirror L2's): *this is a lesson about where the model name lives and what sits behind it, not about how to write the call — every generation line stays elided, the way it has all chapter.*

### The model handle is the configuration boundary

**Goal:** establish that the AI SDK's value proposition *is* the swappable model argument, and that this is what makes calling a raw provider SDK the anti-pattern.

Teach: every generation call (`streamText`, `generateText`, `generateObject`) takes a `model` argument, and **the body of the call is identical regardless of which provider is behind that argument** — same function, same schema for `generateObject`, same tool definitions. Only the `model` value changes on a swap. *That* uniformity is the entire reason the AI SDK exists and the entire reason reaching for a provider's own SDK locks you in: the provider SDK's call shape is the vendor's shape, so a swap rewrites the call, not just a string.

**Critical: show both handle forms, prefer the string (fact-check).** Two ways to name a model in AI SDK 5:
- **Plain string, `'creator/model'`** — e.g. `'openai/gpt-5.5'`, `'anthropic/claude-...'`, `'google/gemini-...'`. This is the *global provider* form: the SDK routes it through the Vercel AI Gateway by default, no provider package installed, no import. This is the 2026 default and the lesson's recommended shape.
- **Provider-object form** — `openai('gpt-5.5')` from `@ai-sdk/openai`. Needed only when you want a provider directly (no gateway) or provider-specific config the gateway string doesn't expose. Name it as the escape hatch, not the default.

Use **`CodeVariants`** here (two tabs: "Gateway string (default)" vs "Provider object (direct)"), each a 3–4 line elided sketch showing the *same* `streamText`-shaped call with only the `model` differing, model line elided after the argument. Prose per tab ≤ one paragraph per the component's rule: tab 1 "no install, routes through the gateway, the 2026 default"; tab 2 "import a provider package, talk to the vendor directly — reach for this only for provider-specific options." Mark the `model:` line in each. This visual makes "only the argument changes" land in one glance and quietly introduces the gateway as the *default*, setting up the later gateway section as "you're already using it" rather than "now add this."

Watch-out to fold in: the string form means the gateway is on by default — students who've read older (v4-era) tutorials will expect to import a provider for every call; flag that as a stale-tutorial fingerprint (consistent with L1/L2's v4-vs-v5 calibration habit).

`Term` candidates: **AI Gateway** (first mention — short def: a single managed endpoint that routes your model calls to any provider, adding failover, usage tracking, and one billing relationship; the AI SDK's default target in v5). **global provider** (the SDK-level default that turns a plain model string into a routed call).

### One file owns the model: `lib/llm/models.ts`

**Goal:** the load-bearing pattern of the lesson. The SDK gives you a *one-line* swap; centralization gives you a *zero-call-site* swap. Make the difference visceral.

Teach the failure first. Picture the model string (or `openai(...)` call) typed inline at the call site. Now five surfaces use it. A swap is five edits — and the test fixtures, and the one route someone added last week that you'll forget. The string being short doesn't save you; the *number of places* is the cost. This is the same reason the Drizzle client isn't `new Pool(...)`'d in every query file.

Then the discipline: a single module, `lib/llm/models.ts`, exports **named handles** bound to model identifiers. Every call site imports the handle. A swap is now a **one-line edit in `models.ts`, and not one call site changes.** Drive the recognition home: this file is the sibling of `lib/db/index.ts` (DB client), `lib/llm/pricing.ts` (the price table you wrote in L2 — note it's keyed by the *same* model ids, so the two files move together on a swap), `lib/rate-limit.ts`, `lib/auth.ts`. One concept, one file (cite the conventions' "one concept per file" + the `lib/` SDK-adapter carve-out).

Use **`AnnotatedCode`** on a real (non-elided) `lib/llm/models.ts` — this *is* the file the lesson teaches, so it's worth real code. Suggested shape:
```ts
import 'server-only';

export const fastModel = 'openai/gpt-5-mini';
export const smartModel = 'anthropic/claude-sonnet-...';
export const embeddingModel = 'openai/text-embedding-...';
```
Annotated steps: (1) `import 'server-only'` — the model file reads provider config / is the seam to the model; it must never reach the browser (tie to conventions: secret-touching `lib/` modules begin with this; tie to L1's server-seam rule). (2) the handles are plain strings routed through the gateway — the swap target is the right-hand side. (3) `camelCase`, not `SCREAMING_SNAKE` — cite the convention explicitly (these are runtime config / "model handles stay camelCase" is literally in the conventions doc, line 68), because a student's instinct is to shout a constant. (4) one export per *role* (next section earns this). Keep the embedding handle visible but defer its asterisk to its own section.

`Term`: **handle** (a named reference you import instead of inlining the underlying value — here, a model id behind a role name).

### Name the role, not the vendor

**Goal:** the sharp senior cut that most "I extracted it to a file" attempts still get wrong. Centralizing in one file survives a *version bump*; naming by role survives a *provider switch*.

Teach the trap by contrast. A file that exports `gpt5ForChat`, `openaiFast`, `claudeSummarizer` has *hardcoded the vendor into the identifier*. The day you move chat from OpenAI to Anthropic, the variable name `gpt5ForChat` is now a lie, and either you rename it (and every import — back to the grep you were avoiding) or you keep a misleading name forever. The vendor leaked one level up, from the call site into the name.

The fix: name the **role the model plays**, not the provider behind it. `fastModel`, `smartModel`, `summarizerModel`, `extractorModel`, `chatModel`, `embeddingModel`. The role is *stable across a swap* — "the fast model" is still the fast model after you change which vendor provides it; only the string on the right-hand side moves. The senior framing: *the call site asks for a capability ("give me the fast one"), not a vendor ("give me OpenAI"). Capabilities are stable; vendors churn.*

Use **`CodeVariants`** (two tabs: "Vendor-named (leaks)" vs "Role-named (stable)") showing the *same* two-handle file, with `del`/`ins` framing. Tab 1: `export const gpt5ForChat = 'openai/gpt-5.5';` flagged as the leak. Tab 2: `export const smartModel = 'openai/gpt-5.5';` — same right-hand side, honest left-hand side. Per-tab prose: tab 1 "the swap renames the variable and every import — you rebuilt the grep"; tab 2 "swap the string, the name still tells the truth." This is the cleanest possible before/after, exactly what `CodeVariants` `del`/`ins` is for.

Small reinforcement exercise — a **`Buckets`** (twoCol) sorting handle names into "Role-named (good)" vs "Vendor-named (leaks)": items like `fastModel`, `summarizerModel`, `embeddingModel`, `chatModel` (good) vs `gpt5ForChat`, `claudeFast`, `openaiSummarizer`, `geminiExtractor` (leaks). Low-stakes, fast, drills the one discriminator the section teaches. Grading: each item's bucket is unambiguous (does the vendor name appear in the handle?).

### What the AI Gateway buys you in production

**Goal:** name the four production features the gateway adds over the bare SDK, and reframe "should I use the gateway?" as "you already are (the string routes through it) — the question is whether you *configure* it for production." Cap complexity: introduce the gateway as a layer that *absorbs* concerns, one concern per feature.

Lead with the reframe enabled by the earlier section: because the plain model string already routes through the gateway by default, the student isn't *adding* the gateway — they're deciding whether to lean on what it offers. The four features (one sentence each, no deep dive — this is a "what it's for" map, not a setup guide):
- **Automatic failover** — when the primary provider returns 429/5xx or times out, the gateway retries the next provider in a fallback list, transparently. (This is the concrete close of L2's provider-429 card.)
- **Observability** — latency, error rate, cost-per-request, per-user attribution, *without instrumenting your own routes*. Tie to L2: the operator cost dashboard L2 described as a Drizzle query over `audit_logs` is the *in-app* view; the gateway dashboard is the *infrastructure* view of the same spend. Both exist; name the overlap so the student doesn't think one replaces the other.
- **Unified billing** — one invoice across every provider instead of N vendor relationships and N cards.
- **BYOK key management** — bring your own provider keys, held at the gateway boundary so they never sprawl across your app's env on every deploy target (name it; the compliance/scale angle is a pointer, not a deep dive).

**The three triggers that flip the gateway from optional to non-negotiable** (mirror L1's "four triggers" and "trigger before tool" pedagogy — defaults before conditionals): any one fires → configure the gateway's production features.
1. **Live traffic depends on the surface** — a user-facing surface that earned its weight (the L1 triggers) can't eat a provider outage gracefully without failover.
2. **Multi-model routing is part of the product** — a fast model for autocomplete *and* a smart model for the long draft; the gateway routes in one place instead of N call-site branches.
3. **Cost observability is a product requirement** — the operator needs per-user/per-surface spend (L2's dashboard); the gateway exposes it without per-route instrumentation.

Until at least one fires, the bare string-through-gateway default is plenty (it *is* the gateway, just unconfigured). Make explicit: prototype = string routes through gateway, no extra config; production = the same string, plus a failover list and you read the dashboard.

**Diagram (the lesson's anchor visual): the abstraction layers.** Use **`ArrowDiagram`** inside a `<Figure>` (HTML boxes connected by arrows — the relevant figure is a vertical/horizontal stack of named layers, which `ArrowDiagram` handles well and lets each box carry a short sublabel). Four (really five) stacked boxes, top→down, single arrow chain:
1. **Application code** (route handler / Server Action) — sublabel "imports a role handle, never a model string"
2. **`lib/llm/models.ts`** — sublabel "the named handle; absorbs *role* changes"
3. **AI SDK call** (`streamText` etc.) — sublabel "absorbs *provider* differences (one call shape)"
4. **AI Gateway** — sublabel "absorbs *availability + observability* (failover, metrics)"
5. **Provider(s)** with a small fallback fan (primary + 1–2 fallbacks) — sublabel "does the work"
Pedagogical goal: make visible *which layer absorbs which kind of change* — the whole lesson in one picture. Each layer earns its weight against a different axis of churn (role / vendor-shape / availability / the work itself). Caption states exactly that: "four layers, four kinds of change each one absorbs." Keep it horizontal-friendly and under the height cap; if vertical reads better for a 5-box stack, a compact vertical column with right-side sublabels is acceptable (it's a layer cake, which is naturally vertical) — note the vertical-space cap, keep boxes compact.

`Term`: **failover** (automatic retry against a backup provider when the primary errors or times out, so one vendor's outage isn't your outage). **BYOK** (bring your own key — you supply your own provider API keys to the gateway rather than billing through it).

### Failover without the gateway, and with it

**Goal:** show the *shape* of failover both ways so the student sees why the gateway is preferred (the manual version is duplicated code in every surface). Reinforce "structural over per-call," the recurring chapter theme.

Two shapes:
- **Without the gateway** — the route handler catches the provider error (429/5xx/timeout) and re-issues the call against a different handle. Works, but: the retry logic is *duplicated in every surface*, and every new route is one more place to forget it — the same bug class as a forgotten auth check or a missing `maxOutputTokens` (callback to L2's "structural, not a reminder" rule).
- **With the gateway** — failover is *configuration*, one place: a primary model plus a `models` fallback array. **Fact-checked shape:** `providerOptions.gateway.models: ['anthropic/claude-...', 'google/gemini-...']` alongside the primary `model`. The gateway tries them in order on failure.

Use **`CodeVariants`** (two tabs: "Catch-and-retry (every route)" vs "Gateway fallback list (one config)"). Tab 1: a ~5-line elided try/catch sketch — `try { /* model call — Chapter 106 */ } catch (e) { if (isProviderError(e)) { /* retry with fallbackModel — Chapter 106 */ } }` — model lines elided, mark the catch as "the part you copy into every surface." Tab 2: the gateway config object — `model: smartModel`, `providerOptions: { gateway: { models: [smartFallbackA, smartFallbackB] } }` — mark the `models:` array. Per-tab prose: tab 1 "works, but it's the same block in every route — N places to forget"; tab 2 "the fallback chain is config, declared once." The course's stance line: **prefer the gateway; route-level catch-and-retry is duplicate code the gateway deletes.**

Note for the syntax author: the fallback handles (`smartFallbackA` etc.) are themselves role-named entries that could live in `models.ts` too — keep consistent with the central-file discipline. `isProviderError` / `fallbackModel` are illustrative seams.

### Env discipline: provider keys are configuration, not deploy artifacts

**Goal:** close the security/config seam — where keys live and the three things you never do with them. Short, sharp, builds on the env-validation seam the student already owns.

Teach: provider keys live in **env**, validated through the env-validation seam (the `@t3-oss/env-nextjs` + Zod `env.ts` from the env chapter — cite as prerequisite, don't re-teach). Naming convention: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY`. The AI SDK *auto-reads* `<PROVIDER>_API_KEY` from `process.env` for first-party providers — **no explicit key pass at the call site** (this is why the handle is just a model string, not a model-plus-key). Once the gateway is in front, the gateway's key (`AI_GATEWAY_API_KEY`, or Vercel's OIDC token in deployment) is what's needed; the per-provider keys move *into the gateway's* BYOK config rather than your app's env on every target.

The three nevers (frame as structural guarantees the SDK's shape already gives you, mirroring L1's "the hooks force the server seam for free"):
- **Never read a key from a database row** — env is the canonical seam; the DB is for tenant-scoped data (callback to conventions).
- **Never accept a key from a query parameter / request** — it'd be in logs, history, referrers.
- **Never expose a key to the browser** — and you can't accidentally, because the SDK's hook-based shape (`useChat`/`useCompletion`, L1) forces the call onto the server; only `NEXT_PUBLIC_*` reaches the client and a key is never that.

Tie the boot-time guarantee: a missing `OPENAI_API_KEY` should fail `pnpm build` via the env validator (conventions: "Missing `DATABASE_URL` fails `pnpm build`"), not 5xx the surface at first real traffic. The env validator catches the missing key at boot; the alternative is discovering it in production.

Use a small **`Code`** block (not elided — env shape is real and short): the relevant `env.ts` server-block additions, e.g. `OPENAI_API_KEY: z.string().min(1)`, `AI_GATEWAY_API_KEY: z.string().min(1)`, inside the existing `server: { ... }` schema. One block, no annotation needed; the prose carries it.

Watch-out: pointing at the gateway but *also* leaving the SDK abstraction inlined — the gateway is portable *routing*, it is **not** a code abstraction; `lib/llm/models.ts` and the gateway are *both* needed and earn their weight on different axes (the diagram already made this point; restate in one line).

### The embedding asterisk: not everything swaps cleanly

**Goal:** the one hard exception to the entire "swaps are one line" thesis. This is the trap that bites teams who internalize the chat-model story and assume it generalizes. High-value because it's counterintuitive and expensive to learn the hard way.

Teach the trap plainly: **embeddings are not portable across providers.** A vector you indexed with one provider's embedding model **cannot be queried against another provider's embeddings** — the vector spaces are different geometries, so the numbers are meaningless across models. **Fact-check makes this sharper than the outline:** this holds *even within the same vendor and even at the same dimension count* — swapping one embedding model version for another without re-embedding can drop recall to ~0.000 (cite the real-world finding as a "this is not theoretical" aside, no link needed inline). So the embedding-model handle in `models.ts` is a **one-way commitment** until you re-embed the entire corpus.

The senior consequence: treat the **embedding handle as a separate, far more conservative swap target** than the chat handle. Swapping `smartModel` is a one-line edit shipped today. Swapping `embeddingModel` is a **re-indexing project** — re-embed every stored document, rebuild the index, plan a migration window, eat the API cost of re-embedding the corpus. Same file, same `models.ts` line visually, *wildly* different blast radius. The discipline (one place owns it) still holds; the *cost of exercising the swap* is what differs, and conflating the two is the error.

Scope guard: the course does **not** build embeddings here — embeddings/vector search land in Ch107 (cite). The takeaway is narrow and durable: *the clean abstraction story for chat models does not extend to embeddings; price an embedding swap as a migration, not a config change.*

Reinforce with a tight **`TrueFalse`** round (3–4 statements) on the swap-cost distinction — e.g. "Swapping `smartModel` to a different vendor is a one-line edit" (true), "Swapping `embeddingModel` to a different vendor is a one-line edit" (false — re-indexing project), "A vector indexed with provider A can be queried against provider B's embeddings" (false), "Embeddings from two *versions* of the same vendor's model are interchangeable" (false). Fast, drills exactly the counterintuitive bit. Place it right after the teach so the surprise is fresh.

`Term`: **embedding** (a list of numbers a model assigns to text so that similar meanings sit close together; the coordinates are only meaningful within the exact model that produced them). **vector space** (the geometry an embedding model maps text into — different models use incompatible geometries, which is why embeddings don't transfer).

### Structured output swaps cleaner than free-form prose

**Goal:** a senior heuristic that pays off the swap discipline — *how you shape the call changes how cheaply it swaps.* Short, ties back to L1's structured-generation trigger.

Teach: a surface built on `generateObject` with a Zod schema returns typed data *regardless of provider* — the **schema is the contract, the model is the implementation**. The Zod schema absorbs the small prompt-shape differences between providers, so the same schema validates whatever vendor you point at. A surface built on `streamText` with a carefully prompt-engineered free-form response is more fragile across a swap: the prompt was tuned to *one* model's quirks, and a different model may format prose differently, so the swap can silently degrade output quality even though the code compiled.

The heuristic: **when the workload is structured (extraction, classification, form-fill — L1's triggers 2 and 3), reach for `generateObject` first; the abstraction wins are larger and the swap is cleaner.** Free-form `streamText` is right for genuine prose (L1's trigger 1's *answer*), but know that you're trading some swap-portability for it. Frame as a senior trade-off the student now has the vocabulary for, not a rule.

Keep this section short — one paragraph plus maybe an inline-level note. `generateObject` syntax is Ch106; here it's named as a *portability property*, not taught. Use a single tiny elided inline `Code` line at most (`// generateObject({ schema, model: extractorModel }) — Chapter 106`) to anchor the name; the point is the heuristic, not the call.

### A line on LangChain and raw provider SDKs

**Goal:** close the "but what about X" loop for the reader who's seen the alternatives, in one tight beat (mirror L1's "AI SDK as canonical" treatment — don't re-litigate, just place them). Keep to a short paragraph or a 2-card `CardGrid`.

- **Raw provider SDKs** — lock the call site to the vendor's shape (a swap rewrites the call, not a string) and lose the unified streaming model. The *only* reason to reach for one: a provider feature the AI SDK hasn't surfaced yet — rare in 2026.
- **LangChain** — a heavier programming model (chains, agents, retrievers) that fights React Server Components and the App Router's streaming primitive. Reach for it when the workload is research-style multi-agent orchestration *outside* the user-request path — not for a Next.js SaaS surface, where the AI SDK is the fit.

State the verdict the course already committed to in L1: *the AI SDK is the canonical Next.js integration; these are the named alternatives and the narrow cases where they fit.* If a `CardGrid` reads cleaner than prose, use two `Card`s (title = the alternative, body = the lock-in + the narrow fit). Don't over-invest — this is a "you'll see these mentioned; here's where they sit" beat.

### The decision is an ADR (closing senior beat)

**Goal:** land the durable senior takeaway and close the chapter's through-line, consistent with L1/L2 ending on the senior framing.

Teach (brief — it's a pointer, not a section to belabor): picking the provider, choosing the gateway, and committing to an embedding model are each **architectural decisions** under the three-test inclusion rule from the docs/ADR unit (cite L1's reference) — they touch multiple files (route, `models.ts`, `env.ts`, billing, possibly the vector index), reasonable alternatives exist (no LLM, a different provider, a hosted RAG service), and reversal costs more than one PR (the embedding commitment especially — a re-indexing project). The senior writes **one ADR per decision.** Name the expectation; the course's running app doesn't own a real provider commitment so there's no ADR deliverable here (consistent with L1's framing), but when this shape lands in the student's own codebase, it's an ADR.

Close the chapter arc in 2–3 sentences: across three lessons the student learned the *filter* (when an LLM earns its weight — L1), the *guardrails* (bounding spend before launch — L2), and now the *durability* (a swap is one line, the gateway is the production default). What remains is the call-site mechanics — `streamText`, `generateObject`, the hooks — which Ch106 installs inside the structurally-sound shape these three lessons drew. End on the carry-out: **the model is a configuration value behind a role-named handle in one file; the provider churns, your call sites don't.**

### External resources

Two **`ExternalResource`** cards (mirror L2's two-card close, no YouTube — decisions lesson, nothing to watch typed):
1. **AI SDK — Provider & Model Management** (`ai-sdk.dev/docs/ai-sdk-core/provider-management`) — the canonical reference for the global provider, plain model strings, and custom provider registries. Description: where the `'creator/model'` string form and provider abstraction are documented.
2. **Vercel AI Gateway — Model Fallbacks / Provider Options** (`vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks`) — the canonical reference for the `providerOptions.gateway.models` failover array and routing controls. Description: how failover and routing order are configured.

Note for resourcer: verify both URLs resolve to current pages; the gateway docs reorganize, fall back to `vercel.com/docs/ai-gateway` if the deep link 404s.

---

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- The AI SDK is the canonical Next.js LLM integration; LLM calls run server-side; the provider key never reaches the browser (L1 — server seam).
- `lib/llm/pricing.ts` is a model-keyed price table + `costCents` function (L2); the audit `llm.call.completed` event carries `{ userId, orgId, surface, model, ... }` (L2). This lesson references both as existing; it doesn't rebuild them.
- `lib/db/index.ts` (Drizzle client), `lib/rate-limit.ts` (`safeLimit`), `lib/auth.ts` — the one-file-owns-the-config precedents this lesson generalizes from.
- `env.ts` validates env at build time via `@t3-oss/env-nextjs` + Zod; missing required env fails `pnpm build` (env chapter).
- The three-test ADR inclusion rule (docs/ADR unit, referenced via L1).

**This lesson does NOT cover (defer, with destination):**
- Call-site syntax of `streamText` / `generateText` / `generateObject` (and `maxOutputTokens`, `onFinish` mechanics) — **Ch106**. Every generation line stays elided with `// model call — Chapter 106`.
- The UI hooks (`useChat` / `useCompletion`) and the `UIMessage` `parts` shape — **Ch106**.
- Tools, the agentic loop, `stopWhen`/`stepCountIs` — **Ch107**.
- Generative UI (`ai/rsc`) — **Ch107**.
- Embeddings / vector search *implementation* (indexing, similarity query, the vector column) — **Ch107**. This lesson teaches only the *portability property* of the embedding handle, not how to embed.
- The AI Gateway's *setup steps* (dashboard, project linking, key provisioning) — named as the production default; the wiring is project-time work, not a course lesson. Show the *config shape* (fallback array, env names), not a setup walkthrough.
- The cost gauntlet (quota, rate limit, the seven abuse shapes) — **L2** (prerequisite); this lesson only *closes* L2's provider-429 forward-reference via gateway failover.
- The worked invoice Q&A surface end to end — **Ch108**.
- Self-hosted models (Ollama, vLLM, Replicate), fine-tuning, custom model deployment — **out of scope for the course**.
- LLM response caching (semantic / exact-match) — **out of scope**; name once that the gateway offers it, the course doesn't build it (or omit if it bloats — optional).

---

## Code conventions notes (for downstream agents)

- **`lib/llm/models.ts` is the canonical artifact this lesson establishes** — the conventions doc (line 560) explicitly reserves "the `lib/llm/models.ts` handle pattern" for this unit. This lesson is where it's first committed. Shape: `import 'server-only';` at top (SDK-adapter `lib/` carve-out, conventions line 121/133), one `export const` per role handle, **`camelCase` not `SCREAMING_SNAKE`** (conventions line 68 names model handles as the explicit camelCase carve-out — call this out, it's counterintuitive), no barrel file, no React imports.
- Model identifiers use the **`'creator/model'` slash form** (fact-checked: `openai/gpt-5.5`, not the older `openai:gpt-...` colon form). Keep model *version* numbers illustrative/placeholder-ish so the lesson doesn't pin to a model that's superseded by ship time (resourcer/fact-checker should sanity-check the exemplar names are plausible-current, but the pattern is the point, not the specific model).
- Failover config form (fact-checked): `providerOptions: { gateway: { models: [...fallbacks] } }` alongside the primary `model`. Provider-specific options key on the *provider name* (`openai`, `anthropic`), not `gateway`.
- Env var names: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY`; validated in `env.ts` `server` block (`z.string().min(1)`), server-only.
- **Deliberate divergence (note for downstream):** all generation call sites are intentionally elided skeletons (`// model call — Chapter 106`), consistent with L1/L2. The only *complete* code is `lib/llm/models.ts`, the `env.ts` additions, and the gateway failover config object — because configuration/placement is this lesson's actual subject. This is pedagogy-driven staging, not an omission.
- Status codes / error shape if any surface response is shown: reuse the course's RFC 9457 Problem Details + 429/503 conventions from L2 — but this lesson likely shows *no* response code (it's config-layer), so probably N/A.

---

## Fact-check log (research done; bake into writing)

1. **AI SDK 5 global provider defaults to the Vercel AI Gateway** — a plain `'creator/model'` string (e.g. `'openai/gpt-5.5'`) routes through the gateway with no provider package import. *This updates the chapter outline*, which framed the gateway as a thing you point the SDK at; in v5 it's the default path. The lesson leads with the string form and frames the gateway as "already on, configure it for prod." (Sources: ai-sdk.dev provider-management; ai-sdk.dev ai-gateway provider page; vercel.com AI Gateway docs.)
2. **Failover shape** = `providerOptions.gateway.models: [...]` array, tried in order on failure; per-provider timeouts also trigger fast failover. (Sources: vercel.com/docs/ai-gateway model-fallbacks, provider-options, provider-timeouts.)
3. **Model string uses `/` (slash), `creator/model`** — not the colon form some older docs show. Standardize on slash.
4. **Embeddings non-portability is *harder* than the outline implies** — fails even same-vendor/same-dimension; real-world swaps without re-embedding drop recall to ~0.000. The "re-indexing project, not a config change" framing is confirmed and should be stated strongly. (Sources: Medium "Different Embedding Models, Different Spaces"; Mixpeek embedding-portability-versioning; Milvus 2026 embedding guide.)
5. **Provider-object form (`openai('...')` via `@ai-sdk/openai`) still valid** — the escape hatch for direct-provider / provider-specific options. Present it as secondary to the gateway string. (Source: ai-sdk.dev choosing-a-provider.)
