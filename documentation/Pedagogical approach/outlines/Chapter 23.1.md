# Chapter 23.1 — Pedagogical approach

## Concept 1 — The four-trigger gate

**Why it's hard.** Stakeholders pitch "let's add AI" as a feature spec, and juniors reach for an LLM because it feels modern. The bar is the opposite: most surfaces shouldn't have an LLM, and only four product shapes earn one. The student has to internalize the gate well enough to push back, not merely recite the list.

**Ideal teaching artifact.** A *misconception-first ambush*: the student is handed a deck of 10–12 plausible-sounding product asks ("dashboard chat to query our metrics," "smart category dropdown for expense entry," "summarize a customer's PDF attachment," "make the search bar feel modern with AI," "draft reminder emails for overdue invoices"). Each ask is presented on a card the student inspects before any framework is shown. They sort the cards into "LLM earns its weight" vs. "deterministic primitive wins" — and then, for the ones they put in the LLM bucket, label *which* of the four triggers applies. The reveal is in two beats: first the binary sort is graded, then the trigger labels are graded against the four-trigger taxonomy. The misclassifications are the most teachable moments — the "smart search over your own data" ask looks like trigger 1 until the student remembers `pg_trgm` from Unit 5 / 15 territory.

**Engagement.** The artifact carries the assessment. Follow it with a single multiple-choice that hardens recall by asking the student to *negate* the rule: given a one-line product ask, identify the deterministic primitive that should win instead. This locks in the anti-trigger reflex, not just the trigger reflex.

**Components.**

- Primary: `Buckets` (two-column layout) for the LLM/not-LLM sort, followed by a second `Buckets` pass with four columns (one per trigger) over the LLM-bucket subset. The two-stage sort mirrors the senior decision shape.
- Follow-up: `MultipleChoice` for the anti-trigger negation.
- Alternative (if `Buckets` can't carry the two-stage flow without authoring contortion): a sketched `DecisionFunnel` component (see proposals).

**Project link.** Unit 23.4 builds the invoice Q&A surface as trigger 1 (open-ended Q&A grounded in app data). The sort should plant one card phrased as the invoice Q&A so the student arrives at 23.4 with the trigger label pre-attached.

---

## Concept 2 — The senior architecture seam: server-side calls, client-side streaming

**Why it's hard.** Provider SDK quickstarts and YouTube demos routinely instantiate the model in a Client Component and ship the API key to the browser. The student needs the architectural muscle memory that *every* LLM call lives behind an authenticated server seam, identical to the database-query rule from Unit 7 / 10, before any syntax lesson begins.

**Ideal teaching artifact.** A *wrong-by-default annotated diagram* using the ArrowDiagram archetype. Start from the naive shape the student would copy from a vendor's "5-minute chat" tutorial: browser → OpenAI directly, with the API key in `process.env.NEXT_PUBLIC_…`. Three labeled failure arrows fan out from that shape — *key exfiltrated by any visitor*, *no auth/tenancy check*, *no quota/audit seam*. Then the same diagram is redrawn in the correct shape: browser hook → route handler under `authedRoute` → AI SDK → provider. The same three failure arrows are now structurally absorbed. The student sees the seam *as the thing that absorbs three classes of bug at once*, not as a deployment detail.

**Engagement.** A short `Tokens` round on a labeled diagram (or a code stub of the wrong shape): click the parts that violate the seam — the `NEXT_PUBLIC_` prefix, the browser-side `openai(...)` instantiation, the missing auth wrapper.

**Components.**

- Primary: `Figure` containing an `ArrowDiagram` with the wrong-shape and correct-shape laid out as two adjacent panels (or wrap with `TabbedContent` to scrub between them).
- Follow-up: `Tokens` on the wrong-shape code stub.

**Project link.** Lesson 23.4.3 wraps `streamText` in `authedRoute('member', …)`. This concept is the architectural justification the student arrives with.

---

## Concept 3 — The cost ledger as a live model

**Why it's hard.** "Tokens cost money" registers as a slogan, not a model. The student needs a felt sense of how a single chat session's input/output token mix compounds across users, days, and abuse shapes — and where in the request lifecycle each enforcement point sits. Without that felt sense, `maxOutputTokens` looks like a knob to tweak rather than a structural cap.

**Ideal teaching artifact.** Two beats. First, a *controllable cost simulator* in the explorable-explanation tradition (Bartosz / Nicky Case territory). The student gets sliders for: daily active users, average questions per user, average input tokens, average output tokens, model price (with three preset model tiers), and an "abuse fraction" (% of users hammering the surface). Outputs: projected daily spend, projected monthly spend, distribution of spend across users (a small histogram showing the top-1% user's share). The reveal is the long tail — moving the abuse slider from 0% to 1% shifts more spend than doubling the user base. The student *sees* why per-user quotas are first-class.

Second, a *request-lifecycle scrubber* showing one request's path through the cost seams: incoming request → `authedRoute` → rate-limit check → quota check → pre-call estimate → model call → `usage` parse → counter increment + audit write → stream response. Each frame highlights one seam, with the failure mode of skipping that seam in a side panel. This is the Distill-style scrollytelling beat — the diagram doesn't show a static lifecycle, it shows *the same request stepping through the guards one at a time*.

**Engagement.** After the simulator, a `PredictOutput`-style drill: given a scenario ("100 DAU, 20 questions/user, model X, no `maxOutputTokens` cap, one user runs an injection loop"), predict the day-end bill within an order of magnitude. After the scrubber, a `Sequence` exercise asking the student to drop the seven seams into request order — the order *is* the assessment.

**Components.**

- Primary (simulator): sketched `LLMCostSimulator` component (see proposals). Single-use risk is real — flag for forward-link discipline.
- Primary (scrubber): `DiagramSequence` wrapping a hand-SVG of the request lifecycle, one frame per seam. This reuses an existing component, which is the right call.
- Engagement: `PredictOutput` (or `MultipleChoice` with order-of-magnitude options), then `Sequence`.

**Project link.** Lesson 23.4.4 wires `reserveQuotaOrRefuse` plus `onStepFinish` token accounting. The student should arrive having internalized *why* the quota check sits inside the auth wrapper, not as a top-of-handler line.

---

## Concept 4 — Burst vs. sustained: why two limiters, not one

**Why it's hard.** Students who've seen rate limiting (Chapter 15.3) will assume one limiter suffices. The cut is shape, not magnitude: a sliding-window rate limit caps burst rate; a daily token counter caps sustained spend. The keys are different, the windows are different, the failure modes are different. Conflating them leaves one of the two attack shapes uncovered.

**Ideal teaching artifact.** A *two-attacker comparison* in tabbed panels. Tab A: "the hammerer" — a user firing 50 requests/second; show the sliding-window limiter catching it on request 11 while the daily counter sits at 2% used. Tab B: "the pacer" — a user firing one request every 30 seconds for 18 hours; show the sliding window staying green the entire time while the daily counter creeps up and finally trips at hour 16. A third tab combines both behaviors — both limiters fire at different times. Each tab shows the two counters as parallel timeline strips so the student watches *which* line crosses *which* threshold *when*. The point lands without the instructor having to name it: one limiter would miss one attacker.

**Engagement.** `Matching` exercise: left column lists six attacker behaviors ("scripted burst at 3am," "one query per minute all day," "100 concurrent sessions for 30 seconds," etc.), right column lists which limiter catches it (rate limit, daily quota, both, neither — escalate to auth).

**Components.**

- Primary: `TabbedContent` wrapping a `Figure` with hand-SVG timeline strips for each attacker. Static SVG is enough — the contrast between which line crosses which threshold is the lesson.
- Engagement: `Matching`.

**Project link.** Unit 23.4 uses the daily quota only (the project ships one shape, not both). This concept ensures the student knows the rate limiter is the unshown half of the pair.

---

## Concept 5 — The seven abuse shapes and their structural mitigations

**Why it's hard.** Listing seven items as a flat enumeration is exactly the "exhaustive survey" failure mode the pedagogical guidelines warn against. The student needs the *pattern* — every abuse shape is named with its structural (not procedural) mitigation, and the mitigation lives *in a seam* (the auth wrapper, the `stopWhen` config, the audit log shape) rather than in a reviewer's vigilance.

**Ideal teaching artifact.** A *threat-and-seam matching grid* presented as a Pattern archetype walkthrough. The student is shown the seven abuse shapes as red-team scenarios (one sentence each, phrased as the attacker's playbook, not as a defender's checklist). For each scenario, the student picks the seam where the mitigation belongs: "the auth wrapper," "the `maxOutputTokens` arg," "the `stopWhen` config," "the audit-log event shape," "the env validator," "the route handler's error catch." The reveal frames the senior cut: *the mitigation is always a seam, never a reminder*. A missed `maxOutputTokens` is a structural bug, not a code-review miss.

**Engagement.** The matching grid is itself the assessment. Follow with a short `TrueFalse` round on the seam claims ("Logging raw prompts is mitigated by reviewer discipline" — false, it's mitigated by the audit-log event shape itself).

**Components.**

- Primary: `Matching` (seven attack shapes left, six or seven seams right; one seam may serve two attacks, which itself is the lesson).
- Follow-up: `TrueFalse`.

**Project link.** The project's `llm_audit_events` table and the `stopWhen(stepCountIs(5))` cap in 23.4.3 both land here as concrete instances of "the mitigation is a seam."

---

## Concept 6 — Role-named handles: one place to swap

**Why it's hard.** The student's instinct, transferred from every vendor quickstart they've read, is to write `openai('gpt-X')` at the call site. The senior cut is twofold: indirect through a single file, *and* name the export by role (`fastModel`) not by vendor (`openai4oForChat`). The two-step is non-obvious — students who get the indirection often still bake the provider into the variable name.

**Ideal teaching artifact.** A *refactor-under-pressure walkthrough* using the Pattern archetype. Start with a small toy codebase (three call sites: chat, summary, classification) where each call site inlines `openai('gpt-X')`. Tell the student the model team just announced a switch to a cheaper provider for chat only. The student does a `grep` mental pass and counts the touch sites. Reveal: nine lines across three files. Then introduce `lib/llm/models.ts` with vendor-named exports (`openaiChatModel`, `openaiSummaryModel`) — re-run the same scenario. Reveal: still three files because the export *names* leak the vendor. Finally, role-named handles (`chatModel`, `summaryModel`) — one-line swap in one file. The student feels the savings compound across two levels of indirection.

**Engagement.** `Tokens` exercise on a small codebase fragment: click every spot that would need to change for a vendor swap, under each of the three versions of the codebase. The shrinking click count is the lesson.

**Components.**

- Primary: `CodeVariants` (three tabs: inlined, vendor-named indirect, role-named indirect), each tab with the same three call sites + the central file (if any) shown via `Code` blocks.
- Engagement: `Tokens` on a code block representative of each variant.

**Project link.** Lesson 23.4.2 hands the student a pre-built `lib/llm/models.ts` with `fastModel` and `smartModel`. The student should arrive understanding the role-naming choice, not just accepting the file.

---

## Concept 7 — The AI Gateway threshold and the four production features

**Why it's hard.** "Use a gateway in production" is the kind of advice students nod at and forget — it sounds like an ops platitude. The student needs the *trigger* (three concrete conditions that flip the gateway from optional to default) and the *value* (four production features that map one-to-one to specific failure modes a single-provider setup leaves open). Without the trigger, the gateway gets adopted prematurely; without the value, it gets postponed past the moment it earns its weight.

**Ideal teaching artifact.** A *Decision archetype with two halves*. First half: a three-condition trigger checklist presented as `Cards`, each with the senior question that flips it ("Is live traffic depending on this surface?", "Are different surfaces routing to different models?", "Does the operator need per-user cost data?"). The student isn't quizzed yet — they're calibrating. Second half: a *failover scrubber* showing one request's path under three regimes — (a) single provider, primary down → user sees a 5xx; (b) route-handler retry logic, primary down → 800ms slower response, duplicate retry code in every route; (c) AI Gateway, primary down → transparent failover, observability event recorded, no duplicate code. The three regimes are stacked, scrubbed by the same "primary provider goes down" event, so the student watches three outcomes from one cause.

**Engagement.** `MultipleChoice` (multi-select) where the student picks which of the four gateway features (failover, observability, unified billing, BYOK) addresses which of the failure modes from the prior concepts (provider 429 fallout, cost-attribution gaps, multi-provider key sprawl, etc.).

**Components.**

- Primary (checklist): `Card` grid for the three triggers.
- Primary (failover scrubber): `DiagramSequence` over three stacked timeline strips (hand-SVG inside the sequence frames).
- Engagement: `MultipleChoice`.

**Project link.** Unit 23.4 does not wire a gateway (the project runs against a single provider). The concept lands as forward guidance — the student finishes the unit knowing what they would add at the production threshold.

---

## Concept 8 — The embedding-portability trap

**Why it's hard.** The whole chapter has trained the student to think "abstraction wins, swap is one line." Embeddings break that frame, and the student needs the break to land hard. A vector indexed under one provider's embedding model is *not* queryable against another's — the spaces are different. The student who treats the embedding-model handle as just another role-named swap will discover the breakage at re-indexing time, expensively.

**Ideal teaching artifact.** A *visual contradiction*. Two side-by-side panels showing the same set of three documents embedded under two different provider models. Each document is plotted as a point in a low-dimensional projection of its embedding vector. A query vector ("invoices overdue this month") is plotted in both spaces. The nearest-neighbor lookup in space A returns document 2; in space B it returns document 1 — the *answers disagree*. The student sees, in one glance, that the vector spaces aren't a shared coordinate system. The accompanying prose names the cost: an embedding-model swap is a re-indexing project, not a config change.

**Engagement.** `TrueFalse` round on five claims that mix portable abstractions (chat model swap, gateway swap, schema-driven `generateObject` swap) with non-portable ones (embedding model swap, fine-tuned model swap). The student sorts which abstractions hold and which leak.

**Components.**

- Primary: `Figure` wrapping a hand-SVG of two 2D vector-space projections with the query and document points plotted. Single-use, no forward-link to compound the build — hand-SVG is the right call.
- Engagement: `TrueFalse`.

**Project link.** Unit 23.4 does not ship embeddings; 23.3.3 does. The concept lands here as the boundary condition on the abstraction story the chapter has spent two lessons building.

---

## Component proposals

**`DecisionFunnel` (alternative to `Buckets` for Concept 1).** Sketch: a vertical or horizontal multi-step sort where each card flows through a sequence of yes/no questions, branching into terminal buckets. Inputs: cards, questions, terminal buckets, expected path per card. Shows: the four-trigger funnel from the chapter's mermaid diagram, made interactive.

- Uses in this chapter: Concept 1 (alternative).
- Forward-links: Decision archetype lessons across the course — Chapter 5.x feature-flag decisions, Chapter 13.x billing-tier triggers, Chapter 17.x GDPR-applicability flowcharts. The funnel shape recurs whenever a chapter teaches a multi-condition trigger.
- Leanest v1: a `Buckets`-style drag interaction with a single question above the columns; iterate to multi-step branching only if the simpler version doesn't carry the cause-and-effect.

**`LLMCostSimulator` (Concept 3, primary).** Sketch: a controllable widget with six sliders (DAU, questions/user, input tokens, output tokens, model price tier, abuse fraction) and three live outputs (daily spend, monthly spend, top-1%-user spend share). Optional: a small bar showing spend distribution across users.

- Uses in this chapter: Concept 3.
- Forward-links: Unit 13 / 14 pricing-tier lessons (the same "model the long tail" framing applies to free-tier abuse modeling); Unit 17 cost-observability dashboards (the simulator's outputs preview the real dashboard's shape). Two credible forward-links — worth building.
- Leanest v1: three sliders (DAU, output tokens, abuse fraction) and one output (monthly spend). The long-tail reveal needs the abuse slider and a histogram, but everything else can be cut from v1 and still teach.

## Build priority

`LLMCostSimulator` carries the most teaching load in this chapter — Concept 3 is the chapter's load-bearing production-discipline beat, and the felt sense of long-tail spend is the thing that turns "tokens cost money" from slogan to model. It also has two credible forward-links into the billing and operator-dashboard units, which justifies the build cost.

`DecisionFunnel` is the right second priority because the funnel shape recurs across every Decision-archetype chapter. Build it only if `Buckets` proves too flat for the two-stage sort in Concept 1; if `Buckets` carries the load, defer.

## Open pedagogical questions

- The cost simulator's "model price tier" abstraction risks pinning the student to 2026 price points that will age. Consider whether the slider should expose raw $/1k-tokens rather than named tiers, trading concreteness for durability.
- Concept 2's "wrong-by-default" diagram works well when the wrong shape is one the student would actually copy. Worth confirming with sample tutorials at chapter-draft time that the inlined-key-in-client-component shape is still the dominant naive pattern in vendor docs, or substituting a different naive shape if the landscape has shifted.
