## Concept 1 — Tools as the model's only doorway into the app

**Why it's hard.** Students arrive thinking the LLM "calls the database" or "uses the API." It doesn't — it emits a string that the SDK validates and dispatches. Until the student feels the model as a planner that can only ask, never act, every later rule (trust boundary, org-scope, audit) reads as defensive paranoia rather than the only thing keeping the surface honest.

**Ideal teaching artifact.** A *concept* archetype shaped as a two-pane comparison: same user prompt ("show me invoice INV-417 total"), left pane "no tools" — the model confidently hallucinates a number; right pane "one tool" — the model emits a tool call, `execute` runs the Drizzle query server-side, the real total comes back. The student toggles between the two and watches what changes: it isn't the prompt, it isn't the model — it's that the model gained a doorway. Annotate the doorway: the tool call is a JSON object the model emits, validated by the SDK, dispatched to server code the model never sees. The asymmetry is the lesson.

**Engagement.** A misconception-ambush `MultipleChoice` after the toggle — "in the right-pane trace, which of these did the model do directly?" — where every action option is a decoy and the correct answer is "none; every action ran in `execute`." Students who pick a decoy disconfirm the misconception themselves.

**Components.**
- `TabbedContent` inside a `Figure` for the two-pane comparison; each tab holds the transcript plus a small `ArrowDiagram` showing what the model "sees" vs what runs server-side.
- `MultipleChoice` for the misconception ambush.

**Project link.** Chapter 23.4's `getInvoiceStats` is exactly this shape — a single doorway, the model never touches `invoices` directly. The mental model installed here is what makes the project's authz wrap legible.

## Concept 2 — `execute` runs server-side under the same authz wrap as any handler

**Why it's hard.** Once tools feel safe ("the model can't reach the DB!"), the student under-rates that *they* still have to enforce org-scope inside `execute`. The cross-tenant leak from Unit 10 reappears here in a new costume: a tool that takes `invoiceId` as input and queries by that ID alone will happily return another org's invoice if the model emits a guessed UUID. The misconception is that the SDK does the authorization. It doesn't — `execute` is just a server function that closes over `session`.

**Ideal teaching artifact.** A *pattern* archetype delivered as a wrong-by-default repair exercise. The student is given a `getInvoiceById` tool whose `execute` queries by `invoiceId` only, plus a replay harness that fires a tool call with an `invoiceId` belonging to a different org. The repair: add `and(eq(invoices.orgId, session.orgId), …)` inside `execute`. After the fix, the replay returns the typed-error "not found" instead of the foreign row. The student feels the bug class by writing it out, not by reading about it. The fix is one line; the lesson is that the line is non-negotiable on every tool that touches a tenant-owned table.

**Engagement.** The repair itself carries the assessment — the test is a tool call with a forged `orgId` that must return the typed error. A follow-up two-question `TrueFalse` round confirms: "the SDK validates `inputSchema` and therefore authorizes the call" (false), "every tool that touches a tenant table needs an `orgId` filter inside `execute`" (true).

**Components.**
- `DrizzleCoding` for the wrong-by-default repair — the student edits the Drizzle query inside `execute`; the criteria check that the foreign-org row is excluded.
- `TrueFalse` for the recall confirmation.

**Project link.** The project's `getInvoiceStats` closes over `ctx.orgId` and never accepts `orgId` as input. The discipline installed here is what makes that closure obvious rather than fussy.

## Concept 3 — The agentic loop, `stopWhen`, and why output projection compounds

**Why it's hard.** Three misconceptions stack. First, students don't see the loop — they think "the model answers the prompt" and miss that a tool-using call sends the prompt back to the model after every tool result. Second, they don't intuit that without `stopWhen` the SDK defaults to 20 steps and they'll find out at the bill. Third, the most subtle one: every tool result is appended to the next prompt as input tokens, so a tool that dumps 200 rows pays for those rows on every subsequent loop step. Output projection isn't a style preference — it's a multiplicative cost lever.

**Ideal teaching artifact.** A *mechanics + concept* archetype built around an **agent-loop simulator**. The student drives a controllable replay of one multi-step call: scrub forward step by step, watch the model emit a tool call, the SDK run `execute`, the result feed back as a `tool` message, the model emit text or another tool call. Two knobs: `stopWhen(stepCountIs(n))` and "tool result verbosity" (raw 200-row dump vs projected `{totalCount, top5}` shape). A running ticker shows input tokens accumulating across steps. Students set the cap to 20 with raw output and watch the cost blow up; reset to 5 with projection and watch it level off. The loop becomes a visible machine they can break and tune, not a paragraph of rules.

**Engagement.** A `PredictOutput`-style prediction round after the simulator: three configurations (default cap + raw output, `stepCountIs(5)` + projection, `stepCountIs(2)` + projection on a workload that genuinely needs three tool calls). Student predicts which one over-pays, which one under-caps, which one is right. The simulator reveals the answer.

**Components.**
- **New component: `AgentLoopSimulator`** (see Component proposals) — drives the scrubbable replay with knobs.
- `PredictOutput` for the configuration-prediction round.
- A small `Figure` containing a Mermaid sequence diagram of the loop's seams as the static fallback for anyone who can't run the widget.

**Project link.** Chapter 23.4 sets `stopWhen(stepCountIs(5))` and projects `getInvoiceStats` to aggregates, never raw rows. The simulator is where those two numbers stop being arbitrary.

## Concept 4 — `onStepFinish` and `onFinish` fire at different beats, audit at the right one

**Why it's hard.** Both callbacks exist, both look similar, both deliver `usage` and `toolCalls`. The trap is to write audit and quota logic in `onFinish` because that's the one introduced in 23.2.1 — and then discover that a 5-step loop only writes one audit event after the whole thing finishes, and the quota check fires too late to stop step 3 from running. The senior cut is per-step seams for per-step concerns; the misuse only surfaces when the loop is doing real work.

**Ideal teaching artifact.** A *decision* archetype as a bucket-sort. The student is given six concrete jobs ("write an `llm.step.completed` audit row per tool call," "decrement the daily token quota mid-loop and cancel on overrun," "write the final cost aggregate," "compress conversation history past a threshold," "record the run's overall finish reason," "rate-limit per tool name within a single run") and sorts them into three columns: `onStepFinish`, `onFinish`, `prepareStep`. The columns are the seams; the jobs are the senior reflexes; the placement is the lesson.

**Engagement.** The bucket sort *is* the assessment. A follow-up single `MultipleChoice` confirms the load-bearing one: "where does mid-loop quota enforcement go and why?"

**Components.**
- `Buckets` in two-column-plus mode (three columns) for the seam sort.
- `MultipleChoice` for the recall confirmation.

**Project link.** The project wires `reserveQuotaOrRefuse` plus per-step token accounting in `onStepFinish` and writes the aggregate audit in `onFinish`. The bucket sort is the rehearsal.

## Concept 5 — The tool-part lifecycle on `UIMessage` and per-state UX

**Why it's hard.** The student's instinct is to render the tool result once it arrives and show a generic spinner before then. That collapses four distinct states (`input-streaming`, `input-available`, `output-available`, `output-error`) into two, and loses the affordance the parts protocol was designed to give: per-tool skeletons that tell the user *what* the model is doing, not just *that* it's doing something. A chat surface with five tools and one shimmer feels broken in a way the student can't articulate until they see the alternative.

**Ideal teaching artifact.** A *concept + pattern* archetype reusing the agent-loop simulator from Concept 3, with one assistant turn isolated and its tool-part timeline exposed. The student scrubs through the four states and watches the rendered UI change in lock-step: skeleton card with the tool's name appears at `input-available`, fills with real data at `output-available`, swaps to a sanitized error pane on `output-error`. A side toggle replaces all per-tool skeletons with a single generic spinner; the student feels the affordance disappear. The state machine is the model; the paired render is the consequence.

**Engagement.** A `Matching` exercise: four lifecycle states on the left, four UX renderings on the right (no render / per-tool skeleton / data card / error pane). The pairing locks the per-state discipline.

**Components.**
- **`AgentLoopSimulator`** (same component as Concept 3, second mode: single-turn tool-part scrubber with the skeleton/spinner toggle).
- `Matching` for the state-to-render drill.

**Project link.** Chapter 23.4's `tool-getInvoiceStats` renders across all four states with a per-tool skeleton; the lifecycle installed here is what makes that requirement read as obvious rather than ornamental.

## Concept 6 — `outputSchema` is the contract; the tool and the component are co-designed

**Why it's hard.** The default move is to write the tool first, then write a React component that consumes whatever the tool happens to return, reshaping inside the component. That works once and rots fast: every new render path adds a new reshape, every schema change breaks a component the schema author didn't know existed. The senior posture is the inverse — the component's prop shape *is* the `outputSchema`, and the tool exists to deliver that shape. The discipline only lands when the student designs schema-from-component, not the other way around.

**Ideal teaching artifact.** A *pattern* archetype shaped as a "write the schema to fit the component" exercise. The student is shown a finished `<InvoiceCard />` with its prop types visible (`{ id, customerName, total, dueDate, status: 'paid' | 'open' | 'overdue' }`) and must author the Zod `outputSchema` so the inferred type matches the prop contract exactly. The grader checks the schema's inferred shape against the component's props; mismatches surface as concrete type errors, not "wrong answer." The lesson is that the schema isn't a validator the student picks freely — it's the same shape as something already fixed by the UI.

**Engagement.** The exercise carries the assessment. A small `MultipleChoice` follow-up confirms the anti-pattern: "if the tool returns `{ paymentStatus }` and the component expects `status`, where does the rename go?" — the correct answer is "in the tool, by changing the schema," not "in the component."

**Components.**
- `ZodCoding` for the schema-from-component exercise — the student writes the Zod schema; criteria match the component's prop type.
- `MultipleChoice` for the rename-location confirmation.

**Project link.** The project's `tool-getInvoiceStats` `outputSchema` is the same shape its `<InvoiceStatsCard />` consumes; the co-design discipline installed here is why the card has no internal reshape.

## Concept 7 — Side-effecting tools split into propose and confirm

**Why it's hard.** The model is a planner. Planners that can also execute destructive actions without a human gate will eventually delete the wrong invoice. Students under-rate this because in their dev environment the model has always done what they asked; the misfire only shows up at scale and at cost. The fix isn't to make the model more careful — it's to design the surface so the model cannot perform the destructive step without a human click, by splitting it into two tools where the second one is gated client-side.

**Ideal teaching artifact.** A *concept* archetype shaped as a disaster replay. Two scenarios run side-by-side in a `TabbedContent` panel. Left tab: single `deleteInvoice` tool. The student sees a transcript where the user asks "remove the duplicate invoice from last week" and the model picks the wrong one — the row is gone before the user can react. Right tab: split `proposeInvoiceDelete` + `confirmInvoiceDelete`. Same prompt; the propose tool returns a preview card the client renders with an explicit "confirm" button; nothing happens until the user clicks; the model can't fire `confirmInvoiceDelete` itself because the client gates it. The asymmetry is the entire pattern.

**Engagement.** A `Sequence` drill: given the propose/confirm flow, drag four events into order (model emits `propose` call, client renders confirmation card with user data, user clicks confirm, client emits `confirm` tool call to next step). Followed by a single `MultipleChoice`: "which tools in this app warrant the split?" with the rubric being "any tool whose `execute` mutates state the user cannot easily undo."

**Components.**
- `TabbedContent` inside a `Figure` for the disaster replay — left tab single-tool, right tab split design. Each tab contains an annotated transcript and a small `ArrowDiagram` showing where the human enters.
- `Sequence` for the propose/confirm event ordering.
- `MultipleChoice` for the "which tools warrant the split" recall.

## Concept 8 — Retrieval earns its weight only above the prompt-stuff threshold

**Why it's hard.** Students arriving from blog posts and demos assume RAG is the canonical AI feature shape — every LLM surface "needs a vector store." It doesn't. A 5-page FAQ belongs in the system prompt; reaching for pgvector there is over-engineering with operational tail. The threshold isn't "do you have docs?" — it's "is the corpus large enough that prompt-stuffing breaks, or fast-moving enough that recency matters?" The senior reflex is to make the cut before the mechanics arrive.

**Ideal teaching artifact.** A *decision* archetype as a workload sort. The student is shown six concrete SaaS scenarios — "200-word product policy that updates monthly," "10,000 customer invoices for grounded Q&A," "company handbook of 80 pages, fully internal, updates per quarter," "yesterday's Slack threads for a search surface," "public-domain API docs the model has already trained on," "a single FAQ page" — and sorts them into three buckets: `prompt-stuff`, `RAG via pre-retrieval`, `RAG as a tool`. Each bucket has a one-line rubric visible: prompt-stuff if it fits and updates slowly, pre-retrieval if every turn likely needs lookup, tool-based if some turns are general and some need grounding. The classification is the senior cut.

**Engagement.** The sort carries the assessment. A follow-up single `MultipleChoice` confirms the over-engineering trap: "your knowledge base is 6 short pages and rarely changes — pick the right shape" with the correct answer being "system prompt, not RAG."

**Components.**
- `Buckets` in three-column mode for the workload sort.
- `MultipleChoice` for the over-engineering confirmation.

## Concept 9 — The two-phase RAG pipeline and the `orgId` filter on every retrieval

**Why it's hard.** Two distinct misconceptions live in the same lesson. The first is shape: students don't separate the index phase (chunk → `embedMany` → insert) from the query phase (`embed` the question → similarity select → inject into prompt), and end up trying to embed-on-write per row or embed-on-read per question. The second is more dangerous: cross-tenant leak via retrieval. Every `document_chunks` row carries `orgId`; every similarity query must filter by `session.orgId`; a missing filter means the model is handed another org's text and quotes it in the answer. The Unit 10 discipline reappears in a vector table the student hasn't built before.

**Ideal teaching artifact.** Two beats. First, a static *concept* diagram in a `Figure` — a hand-authored SVG (or Mermaid flowchart) showing the two phases on a single page with the shared `document_chunks` table in the middle: index phase on the left feeds rows in, query phase on the right pulls rows out by cosine similarity. The seam between the phases is the table, and the diagram makes that visible at a glance. Second, a *pattern* repair exercise: the student is given a working Drizzle similarity query that returns the top-5 chunks for a question, except the `where` clause has no `orgId` filter. A replay seeds the table with chunks from two orgs and runs the query under one session — the student sees the foreign-org chunks in the results, adds `eq(documentChunks.orgId, session.orgId)`, re-runs, and watches them disappear. The fix is one line; the rule is non-negotiable.

**Engagement.** The repair carries the assessment for the org-scope rule. A short `Sequence` drill confirms the two-phase shape: drag five steps into order (chunk docs, `embedMany` the chunks, insert with embeddings, `embed` the question at query time, similarity-select top-K and inject into system prompt).

**Components.**
- `Figure` with a hand-authored SVG (or Mermaid flowchart) for the two-phase pipeline diagram.
- `DrizzleCoding` for the org-scope repair, seeded with two-org chunks and a similarity query.
- `Sequence` for the index/query ordering drill.

## Component proposals

**`AgentLoopSimulator`** — a controllable replay of a multi-step `streamText` call. Inputs: a fixture (initial prompt, tool definitions with mocked `execute` outputs at varying verbosities), a `stopWhen` knob (`stepCountIs(n)`), a "tool result verbosity" toggle (raw dump vs projected shape). Renders a scrubbable timeline of loop steps showing model decision (text / tool call), tool execution, result fed back, and a running token ticker. A second mode isolates a single tool call and exposes its `UIMessage` part lifecycle (`input-streaming` → `input-available` → `output-available` → `output-error`) paired with the rendered UI per state, plus a skeleton/spinner toggle.
- **Uses in this chapter:** Concept 3 (loop + projection + step cap), Concept 5 (tool-part lifecycle).
- **Forward-links:** Chapter 23.4 (the project's 5-step `getInvoiceStats` loop is exactly this shape and could embed the simulator pre-loaded with its fixture); any future agentic-systems content. Compounds.
- **Leanest v1:** Drop the second mode. Build only the loop-step scrubber with the two knobs and the token ticker; render tool-part states as static text labels rather than paired UI for Concept 5, and use a side-by-side static `Figure` for the skeleton-vs-spinner contrast. The simulator still carries Concept 3's full weight, and Concept 5 falls back to a Mermaid state machine plus the `Matching` drill. Probably worth building the full thing — the second mode is small relative to the first — but v1 ships with one mode if scope is tight.

## Build priority

`AgentLoopSimulator` is the only proposal and it earns the build: it carries two of the chapter's heaviest concepts (the agentic loop with token compounding, and the tool-part lifecycle), has a credible forward-link into the unit's project, and its full version isn't dramatically larger than v1. Build the loop-step scrubber first; the single-turn lifecycle mode is a follow-up if v1 ships before the lifecycle drill lands.

## Open pedagogical questions

- Concept 7's disaster replay reads more powerfully if the "wrong invoice deleted" transcript is plausible to a SaaS engineer; the worked invoice surface lives in Chapter 23.4. Open question: stage the replay with a generic destructive tool here (delete-row scenario in the abstract) and let 23.4 carry the worked version, or push the full replay into the project chapter and keep Concept 7 to a propose/confirm pattern diagram?
- Concept 9's org-scope repair on a vector table sits in `DrizzleCoding`, but pgvector's `vector` column and cosine operator (`<=>`) require the in-browser PGlite runtime to load the extension. Open question: confirm PGlite ships pgvector at the version the course pins, or fall back to a `where`-clause repair on a non-vector seeded result set (still teaches the rule, loses the similarity texture).
