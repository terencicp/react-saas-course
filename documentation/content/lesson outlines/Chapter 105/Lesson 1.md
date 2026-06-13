# Lesson title

- Title: The four triggers that justify an LLM surface
- Sidebar label: When to reach for an LLM

# Lesson framing

This is the load-bearing decision lesson of Unit 22, and the unit is **conditional** — the whole point is that the student leaves able to answer "should this SaaS ship an LLM-backed surface at all?" and, for most products, correctly answer "no." Frame the lesson as a senior filter, not a tutorial. There is essentially no code to write: every concrete API call is one inline snippet at most. The deliverable is a mental model and a decision habit, not a working feature.

Pedagogical stance (from the guidelines): **decisions before syntax, trigger before tool.** The "tool" here is the entire LLM integration; the "trigger" is one of four narrowly-defined product shapes. The lesson must spend most of its weight on *what crosses the bar and what doesn't*, because the single most expensive beginner mistake in 2026 is reaching for a model on a workload a SQL query or a form already solves — the cost ledger never balances and the UX is worse. Lead every trigger with the senior reasoning, then the example.

Target student: a junior dev from another field with the rest of the course under their belt. They have just finished Unit 21 (docs, ADRs, code review) and the full SaaS stack (Postgres/Drizzle, Server Actions, auth/RBAC, Stripe, Upstash, audit log). They have probably *used* ChatGPT-style products and may have seen AI SDK tutorials online — which is a hazard, because most public tutorials and any model emitting from training data older than mid-2025 produce **v4** AI SDK shapes that are wrong by construction. The lesson must calibrate their search hits with a versioning signpost.

The hardest cognitive-load risk: conflating "we want to use AI" (a vibe) with "this surface is LLM-shaped" (a spec). Counter it by making the four triggers concrete, mutually distinct, and each paired with its sharpest anti-trigger. Use a decision-walk widget so the student internalizes the *order* a senior asks the questions in, and a classification drill so they practice sorting real workloads.

What the student should be able to do at the end: given a feature request, run it through the four-trigger filter, name which trigger (if any) it hits, name the cheaper deterministic default when it doesn't, recognize the AI SDK as the canonical Next.js integration and articulate the three reasons why, spot a v4-flavored tutorial on sight, and know that landing such a surface is an ADR-worthy architectural decision.

Keep it tight — 30 to 40 minutes. Do not bleed into cost mechanics (lesson 2), provider abstraction (lesson 3), or any generation/tool syntax (chapters 106-108). Name those as forward pointers only.

Reusable mental model to seed and reuse across sections: **the model never owns data — tools own data, the model orchestrates language.** This single sentence resolves trigger 1 vs. anti-trigger "smart search," resolves the agentic trigger, and pre-loads chapter 108. State it early, echo it in the funnel and the watch-outs.

# Lesson sections

## Introduction (no header)

Open with the senior question, stated implicitly through a scenario, not as a heading. A stakeholder drops "can we add AI to this?" into the sprint. The junior reflex is to start wiring a chat box; the senior reflex is to ask whether the *surface* is the kind that genuinely needs a probabilistic model, or whether a Server Component and a SQL query already do the job better, cheaper, and without hallucinating.

Establish the course's stance plainly: **most 2026 SaaS still ships without an LLM surface, and that is the right call.** This reframes the unit as conditional from the first paragraph — the student may finish this lesson, decide their product has none of the four triggers, and correctly skip the rest of the unit.

State what the lesson delivers: a four-trigger filter, the anti-triggers that fail it, and why the Vercel AI SDK is the integration a Next.js team reaches for when a trigger does land. Seed the reusable model ("the model never owns data — tools own data, the model orchestrates") here in one line; it pays off repeatedly.

Keep it warm and brief, ~3 short paragraphs. No code.

## What makes a surface LLM-shaped

The conceptual bar, before the four concrete shapes. An LLM earns its weight only when the surface needs one of: open-ended natural-language *input* that can't be captured by a form, natural-language *output* that prose alone can carry, or *orchestration* across steps that vary by input. If the workload is "look up rows by id and render them," that is a query and a component, not a model — name this contrast explicitly because it is the intuition the four triggers formalize.

Pedagogical purpose: give the student the *generative principle* first so the four triggers feel like instances of one idea, not a list to memorize. Minimizes cognitive load — one rule, four examples, rather than four unrelated rules.

Keep this section short (2-3 paragraphs). It is the simplified model; the next section adds the precision.

Candidate `Term` tooltips in this section: **LLM** (define once: a large language model — a system that predicts likely text continuations; probabilistic, not a database), **probabilistic** (same output is not guaranteed twice for the same input — the property that disqualifies it for exact lookups).

## The four triggers that cross the threshold

The core of the lesson. Present exactly four shapes — the course accepts these and only these. Use a `CardGrid` with four `Card`s (icon + title + body) so each trigger is visually a peer and the "four and only four" framing is unmissable, OR present them as four `### h3` subsections if the bodies grow long. Prefer h3 subsections here — each trigger needs a worked example plus its reasoning, which is more than a card body should carry. Lead each with *why the deterministic path fails*, then the example.

For each trigger, the body must answer: what is the user doing, why can't a form/query/pipeline do it, what is the model's job, and where does the real data come from (always: tools/SQL own data, the model handles language). Name the relevant primitive in passing as a forward pointer only — do not teach it.

### Open-ended Q&A grounded in app data

User asks "which invoices are overdue and trending up?" The *answer* is a function of structured data, but the *question* is natural language and the *response* needs prose. Server-side SQL can't parse the question; a search box can't compose the answer. The model reads the question, calls a `getInvoiceStats(...)` tool to get real numbers, and writes the prose — it never invents the data. Forward-point: this is the course's worked surface in chapter 108 (invoice Q&A on the invoices dashboard). Echo the reusable model here.

### Generation of structured artifacts from prompts

User types "monthly retainer, 40 hours at our standard rate"; the system drafts a typed invoice line-item row. The model maps free text to a typed schema (forward-point `generateObject`, do not explain it); the deterministic path validates and writes it. The trigger lands when the input space is too varied for a form — if a dropdown + number field captures it, use the form.

### Classification or extraction over unstructured text

Inbound support emails sorted by intent, attached PDFs summarized into structured metadata, free-form customer notes tagged with categories. The model is the only reasonable parser of genuinely unstructured text; the output is small and structured, and ordinary code consumes it downstream. Stress the asymmetry: the *input* is messy human text, the *output* is a tidy enum/object — that shape is the signature of this trigger.

### Agentic workflows the user couldn't run by hand

Multi-step flows where the model decides which tool to call next based on intermediate results — "find customers with overdue invoices, draft a reminder per customer in their tone, queue for review." Each step is deterministic; the *orchestration* is the model's job. Critical qualifier (this is where juniors over-reach): the trigger lands **only when the steps genuinely vary by input.** A fixed sequence of known steps is a pipeline — that is just code, not an agent. Forward-point chapter 107 for the loop mechanics.

Close the section by tying all four back to the generative principle from the previous section: each is open-ended language or input-varying orchestration that a deterministic primitive structurally cannot carry.

## What does not cross the bar

Equal weight to the triggers — this is where the cost discipline starts. Frame it sharply: reach for a model on the wrong workload and **you pay tokens and latency for a worse result.** Present the named anti-triggers, each paired with the cheaper deterministic default the student already knows. A two-column `Matching` exercise (anti-pattern ↔ the right tool) or `Buckets` fits well here, but first present them in prose so the student has the reasoning before the drill.

The five anti-triggers, each with its default:

- **Smart search over your own data** → Postgres full-text search / `pg_trgm` trigram similarity. Covers ~95% of the workload at zero per-query cost. (Student met Postgres in Unit 5.)
- **Form auto-fill from one typed field** → `onChange` + a deterministic lookup. Faster, cheaper, never hallucinates.
- **"Make the UI feel modern"** → not a product decision, a pitch-deck decision. The user pays the latency, you pay the tokens, the surface is worse.
- **Categorizing a fixed, knowable enum** → a regex or a small purpose-trained classifier. The LLM is overkill when the categories are known at design time. (Contrast deliberately with the extraction trigger above, where the input is genuinely unstructured — this is the subtle line and worth drawing explicitly.)
- **Replacing existing search/filter with chat** → chat is the wrong *primary* affordance for scanning a list. Add chat as an *additional* surface, never as a replacement for affordances users already know.

Pedagogical note: the fixed-enum anti-trigger vs. the extraction trigger is the highest-confusion pair. Place them near each other and make the distinguishing question explicit: *are the categories knowable at design time?* If yes → classifier/regex; if the input is open-ended text needing genuine language understanding → LLM.

### Exercise — sort the workload

Place a `Buckets` drill here with three buckets: **LLM earns it**, **Deterministic default**, and optionally **Depends — name the question**. Items are realistic SaaS feature requests phrased so the answer requires applying the filter, not pattern-matching the prose (per the MCQ/exercise guidance, do not reuse the lesson's exact wording). Examples: "tag inbound emails by intent" (LLM), "autocomplete a country field from two typed letters" (deterministic), "summarize an uploaded contract PDF into key terms" (LLM), "filter the invoices table by status and date" (deterministic), "let users ask the dashboard questions in English" (LLM), "categorize transactions into one of five fixed accounting buckets" (deterministic — knowable enum). Grading: each chip is right/wrong on Check. Goal: the student practices the trigger/anti-trigger cut on fresh inputs.

## The four-trigger funnel

A decision diagram that encodes the *order* a senior asks the questions. Two complementary vehicles — pick `StateMachineWalker` as the primary because it forces a committed walk and the lesson lives in the question order, and optionally a static Mermaid `flowchart LR` inside a `<Figure>` as an at-a-glance summary if a single visual is wanted alongside.

Primary: a `StateMachineWalker` (`kind="decision"`, no `<Figure>` wrapper — it is its own card). The question chain:

1. **Is the surface user-facing?** (No → it is backend logic; deterministic code, stop.)
2. **Does it need open-ended natural-language input or output?** (No → form / query / fixed pipeline, stop.)
3. **Is the answer purely a function of typed data the user could otherwise query directly?** (Yes, and no language is needed to ask or answer → search/filter UI, stop.)
4. **Do the steps vary by input, or is the sequence fixed?** (Fixed → pipeline/code, stop.)

Leaves: the four trigger verdicts (each `<Leaf verdict=...>` names the trigger and the primitive it forward-points to) plus the deterministic-default leaves (Postgres FTS, structured form, fixed pipeline, search/filter UI). Pedagogical goal: internalize that a senior reaches for the *default* at every branch and only the LLM survives when natural language is essential and no deterministic primitive carries it. This widget is the spine of the lesson — it operationalizes every preceding section into a reusable mental procedure.

Keep the walker shallow (4 question nodes, ~8 leaves) so it reads as a procedure, not a maze.

## Why the AI SDK is the canonical Next.js integration

Now that the student knows *when* a trigger lands, name *what they reach for*. Three reasons, framed as senior defaults, not a feature tour:

1. **It owns the React 19 streaming model.** Server-streamed text deltas and partial objects compose with Suspense and Server Components by design — forward-point only, the mechanics are chapter 106.
2. **Provider abstraction is first-class.** Swapping the model behind a feature is a one-identifier change, not a rewrite — forward-point lesson 3. This is the durability argument: the provider landscape accelerates (a major model from a new provider lands almost monthly), and the SDK is the layer that keeps the integration from rotting.
3. **The surface is tight.** Five primitives a senior actually reaches for — `streamText`, `generateText`, `generateObject`, `streamObject`, and the `useChat`/`useCompletion` hooks — no sprawl. List them so the student knows the shape of what is coming, but do not teach any.

Then the brief alternatives cut, *once*, for the reader who has seen them — this satisfies the guideline to mention alternatives so the choice is understood:

- **Calling provider SDKs directly** locks the call site to one vendor and loses the unified streaming shape. Only reason to reach for it: a provider feature the AI SDK hasn't surfaced yet (rare in 2026).
- **Hosting LangChain server-side** ships a heavier programming model (chains, agents, retrievers) and a different streaming primitive that fights the App Router. Reach for it only for research-style multi-agent orchestration outside the user-request path.

The course picks the AI SDK. Keep this comparison to a few sentences — it is a signpost, not a survey.

Candidate `Term` tooltips: **streaming** (server sends the response token-by-token as it is generated rather than waiting for the whole thing — what makes a chat feel live), **provider** (the company/API serving the model: OpenAI, Anthropic, Google — distinct from the SDK, which is vendor-neutral).

## The version that matters — AI SDK v5, not v4

A short, high-value signpost section. The student *will* search for AI SDK help and a model *will* hand them v4 code. Name the v5 shapes so they can calibrate their hits. Do not teach the APIs — just flag the shape so a v4 tutorial is recognizable on sight. Present as a compact before/after, ideally a small two-column `Matching` (v4 shape ↔ v5 replacement) or a simple `Code`-free table in prose:

- `UIMessage` carries a **`parts` array**, not v4's flat `.content`.
- **`sendMessage` / `regenerate`** replace v4's `append` / `reload`.
- Input state is **manually managed** (plain `useState`), not owned by the hook.
- **`stopWhen` with `stepCountIs(n)`** replaces client-side `maxSteps`.

State the rule plainly: any tutorial or AGENTS prompt that emits these v4 shapes is wrong by construction for this stack. Mechanics land in chapters 106-107; this is the calibration signpost only. (Verified current: v5 stable since July 2025; these are the canonical v5 surfaces.)

Optional `VideoCallout`: if the resourcer finds a short, recent (post-July-2025, ideally 2026) official Vercel "AI SDK 5" overview that frames the v5 model without diving into syntax, embed it here as supplementary framing. Gate strictly on recency — a pre-v5 video actively miseducates here. If none qualifies, omit.

## The architectural rule — server calls, client streams

The one architectural shape the student must hold before any code in chapter 106. Every LLM call runs on the **server**; the Client Component subscribes to the stream via the hooks; **provider keys never reach the browser.** The route handler (or Server Action) is the seam — the *same* rule the student already learned for `authedAction`/`authedRoute` (Unit 6 / lesson 3 of chapter 057). Anchor it to that prior knowledge explicitly: this is not a new rule, it is the existing server-seam rule applied to LLM workloads.

Make the key point that the AI SDK **enforces this by shape** — the React hooks expect a server endpoint, not a key — so the secure architecture is the path of least resistance, not extra discipline.

A small diagram earns its place here: a minimal three-box `<Figure>` (custom HTML or `<ArrowDiagram>`, or a tiny Mermaid `flowchart LR`) — **Client Component (`useChat`) → server route handler (auth + key) → provider** — with the key annotated as living only on the server box. Pedagogical goal: cement the trust boundary visually before the student sees the streaming code in chapter 106. Keep it tiny; this is a reinforcement visual, not a system diagram.

Forward-point: cost guards (lesson 2) and provider config (lesson 3) live *inside* this server seam.

## Landing this surface is an architectural decision

Tie the lesson to Unit 21's ADR discipline (lesson 4 of chapter 101, the three-test inclusion rule). An LLM-backed surface passes all three tests: it touches multiple files (route handler, schema, client component, env, billing), reasonable alternatives exist (no LLM, a different provider, a hosted RAG service), and reversal costs more than one PR (the surface, the rate limiter, the quota, the audit log, possibly Stripe metering). Therefore: when this shape lands in a real codebase, **write an ADR.**

Be explicit about scope: the course's running app (chapter 108) does not write a fresh ADR as a deliverable, but the student is told to write one in their *own* codebase when this decision lands. This keeps the senior habit attached to the decision without inflating the project.

Keep this section short — it is a habit reminder, not new theory. Reinforces the course's decisions-over-syntax thesis at exactly the moment a student is tempted to start coding.

## Pushing back, and the failure modes

Fold the chapter outline's watch-outs into a closing section that teaches the senior *posture*, not a bullet dump (per guidelines, watch-outs belong with the concept they qualify — but several here are postural and cohere as "how a senior responds when the pressure to add AI arrives"). Frame as: the trigger has to be real, and here is how a senior holds the line. Use `Aside` (caution) blocks sparingly for the two or three sharpest, weave the rest into prose:

- A stakeholder asking "can we add AI?" is not a spec — the LLM is the *how*, never the *what*. Push back unless the surface hits one of the four triggers.
- Building chat as a *replacement* for filters/search is a double regression: worse UX and added token cost. Chat is additive.
- The model is never the source of truth — tools own data, the model orchestrates. (Final echo of the reusable model.)
- "We'll worry about cost later" is wrong the moment the surface is public — costs and abuse are first-class from day one (forward-point lesson 2).
- Picking a provider SDK because a model team's blog post used it locks the call site to that vendor — the AI SDK exists to prevent exactly this (forward-point lesson 3).

### Exercise — is the trigger real?

Close with 2-3 `MultipleChoice` cards presenting a feature request and asking which trigger it hits *or* which deterministic default applies. Write distractors that are plausible mis-applications (e.g., a "smart search" request dressed up as Q&A). Phrase so the student reasons rather than matches prose. Include an `McqWhy` on each naming the deciding question. Goal: final self-check that the filter transfers to ambiguous inputs. (One of these can double as the conditional-stance check: a request that hits *no* trigger, whose correct answer is "ship no LLM surface.")

## External resources (optional)

If the resourcer finds high-quality, current (2026 or post-v5) material, add 1-2 `ExternalResource` cards: the AI SDK's own "Foundations / when to use" docs and/or the Vercel "AI SDK 5" announcement. Gate on recency — anything pre-July-2025 risks teaching v4 shapes. Omit rather than ship a stale link.

# Scope

This lesson is **decisions only** — no working feature, no real call-site code beyond at most one-line inline snippets used purely to name a primitive.

Explicitly out of scope (forward-pointed, not taught):

- **Generation primitives** — `streamText`, `generateText`, `generateObject`, `streamObject`. Chapter 106. Name them as the SDK's tight surface; do not show usage.
- **UI hooks and the `parts` shape mechanics** — `useChat`, `useCompletion`, `useObject`, the `convertToModelMessages` / `toUIMessageStreamResponse` contract. Chapter 106. The v5-vs-v4 section names the *shapes* for calibration only; it does not teach the hooks.
- **Tools, the agentic loop, `stopWhen`/`stepCountIs`** — Chapter 107. The agentic trigger names the concept; the loop mechanics are not taught.
- **Generative UI (`ai/rsc`, tool parts) and embeddings/vector search** — Chapter 107. Mention embeddings only if needed; do not open the portability discussion (that is lesson 3's chat-vs-embedding swap point).
- **The worked invoice-Q&A surface end to end** — Chapter 108. Named once as the "in our app" pointer under trigger 1; not built.
- **Token cost, quotas, rate limits, the seven abuse shapes, the `usage` field, the cost dashboard** — lesson 2 of this chapter. This lesson may say "cost is first-class from day one" as a forward pointer but must not teach any mechanism.
- **Provider abstraction syntax, `lib/llm/models.ts`, named handles, the AI Gateway, failover, env keys** — lesson 3 of this chapter. The "why the AI SDK" section may say "one-identifier swap" as the value proposition but must not show the file or the gateway config.
- **Self-hosted models, fine-tuning, RAG pipeline operations** — out of scope for the entire course.

Prerequisites to redefine *concisely* (the student has these; one line each, do not re-teach):

- **Server vs. Client Components and the server seam** — used to anchor "server calls, client streams." Reference `authedAction`/`authedRoute` (Unit 6 / lesson 3 of chapter 057) as the existing rule.
- **Postgres full-text / `pg_trgm`** — named as the anti-trigger default (Unit 5). One phrase; no SQL.
- **ADR three-test inclusion rule** — named to justify the ADR habit (lesson 4 of chapter 101). One sentence restating the three tests.
- **Audit log, Upstash, Stripe entitlements** — named only in the ADR "reversal cost" list to show the blast radius; not explained.

# Code conventions note

This lesson is effectively code-free, so most of `Code conventions.md` does not apply. The only code-adjacent artifacts are: inline primitive names (`streamText`, `generateObject`, `useChat`, `getInvoiceStats`) rendered as inline code, and the optional tiny architecture diagram. Inline identifiers must match the canonical v5 surface (verified current). No multi-line code blocks are expected; if any appear they would signal scope creep into chapter 106. Deliberate divergence from convention: the lesson intentionally ships *no* runnable code — this is a decision lesson by design, flagged here so downstream agents do not "helpfully" add call-site examples.
