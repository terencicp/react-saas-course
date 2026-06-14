# Lesson 2 outline — Zod schemas as the model contract

## Lesson title

- **Title:** Zod schemas as the model contract
- **Sidebar label:** Structured output with Zod

## Lesson framing

This is the chapter's **portability lesson**. The single load-bearing idea: when the workload is "map free text to a typed row in our database" — classify, extract, fill a form — the answer is *structured data, not prose*, and the senior reaches for `generateObject` / `streamObject` with a Zod schema instead of asking `streamText` to "respond in JSON" and parsing the string. The schema does triple duty: it's the **prompt shape** (serialized to JSON Schema, sent to the model), the **runtime guard** (the SDK validates the model's output and retries on failure), and the **TypeScript type** (`result.object.amount` is a `number` at the call site, not `any`). One declaration, three jobs — the same Zod pitch from Chapter 042, with a new audience: the model.

The portability angle is the why. Free-form `streamText` output is sensitive to prompt-engineering tuned to one model; structured output puts the contract in a provider-independent schema, so the surface swaps providers cleanly (the cross-link to Chapter 105 Lesson 3, the abstraction discipline). Whenever the workload *allows* structured output, the senior calls for it.

Pedagogical spine, optimized for low cognitive load:
- **Build on, never re-teach.** Lesson 1 (this chapter) already shipped the route-handler seam (`authedRoute` + rate-limit + quota), `onFinish` for usage/audit writes, `maxOutputTokens` on every call, and the imported model handle (`chatModel` / `fastModel` from `lib/llm/models.ts`). Chapter 042 shipped Zod 4. This lesson reuses all of that as scaffolding and spends its budget on the new delta: the four object primitives and the schema-as-contract discipline. The route handler is taught as "the *same* seam, one call swapped" — the student must feel the consistency, not learn a second handler shape.
- **Lead with the decision, then the syntax.** Open with the senior question and the anti-pattern (prompt-engineered JSON), so the student understands *why this tool exists* before seeing `generateObject`. The minimal call comes second.
- **Simplified model first, complexity added in layers.** Start with the simplest case: `generateObject` + a small `z.object` + typed access. Then layer: `.describe` as prompt carrier → schema-shape constraints → `enum`/`array` modes → `streamObject` for progressive UX → the `maxRetries` cost knob. Each layer is one mental addition.
- **The schema is the floor, the prompt is the suggestion.** The single most useful framing for the refine-vs-prompt decision and the most common beginner mistake (over-strict `.refine` thrashing the retry loop and burning budget). Hard structural constraints (types, enums, required) in the schema; soft constraints (format hints like `INV-XXXX`) in the prompt.
- **Active practice where it's actually runnable.** The continuity notes are firm: the `ai` package + provider keys can't run in-browser, and `ReactCoding` is react-family only. But `ZodCoding` imports *real* Zod from esm.sh and runs `safeParse` scenarios — so the lesson's core skill (designing a schema that survives) is directly practiceable. This is the exercise the previous lesson couldn't have. The student writes the schema; fixtures prove it accepts/rejects the right shapes. Everything `ai`-specific is checked with MCQ / Sequence / Buckets, matching Lesson 1's constraint.

Mental model the student leaves with: *"Structured output = a Zod schema is the contract. The SDK sends it to the model as documentation, validates the reply against it, retries on mismatch, and hands me a typed object. It's the swap-friendly call shape, so I prefer it whenever the workload is extraction/classification/form-fill — and I keep structural rules in the schema, formatting hints in the prompt."*

Running domain: the course's invoice app (consistent with prior chapters). Examples: extract line items from a free-text description, classify inbound payment emails into status buckets, draft an invoice description from a brief. Use ONE primary schema throughout (an invoice line item) so the student tracks one shape across every section rather than re-reading a new schema each time.

No celebratory tone, adult and terse. Estimated 40–50 min.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely framed: a paragraph of invoice text arrives ("2x logo design at $400, 1x brand guidelines at $1200, due net 30"), and the app needs a typed row — `{ items: [{ description, quantity, unitAmount }], dueDate }` — to insert with Drizzle. Prose won't do; the next step is code that consumes the result. Name the temptation a junior reaches for: prompt `streamText` with "respond in JSON" and `JSON.parse` the string. Name why that's a bug class (hallucinated keys, prose wrapped around the JSON, format drift on the next model update). State the lesson's promise: `generateObject` / `streamObject` make the output type-safe, schema-validated, and auto-retried — and the schema is provider-independent, so this is the *swap-friendly* call shape.

Connect to what they know: Lesson 1 (this chapter) gave them `streamText`/`generateText`, the route-handler seam, and `onFinish`; Chapter 042 gave them Zod 4. This lesson is the same seam with the object primitives swapped in, and Zod schemas pointed at a new reader — the model.

Keep it brief and warm. The senior question is implicit, not a labeled section.

---

### Why a schema beats prompt-engineered JSON

**Goal:** Establish the decision before any syntax. The student should leave this section convinced the prompt-engineered-JSON approach is an anti-pattern on the 2026 stack, and able to articulate the three reasons.

Content:
- The anti-pattern, named: asking a model to "respond in JSON" and `JSON.parse`-ing the reply. Three concrete failure modes — hallucinated/renamed keys, conversational prose bracketing the JSON (` ```json ` fences, "Here's the data:"), and silent schema drift when the provider ships a new model.
- What `generateObject` does instead, in one sentence each: **constrains** the model's output to the schema, **validates** the reply with Zod, **retries** on malformed output, **returns a typed object**, and **absorbs provider differences** (the same schema works against OpenAI, Anthropic, Google).
- The portability win, stated as the senior call and cross-linked to Chapter 105 Lesson 3: free-form `streamText` couples the contract to prompt-engineering tuned per model; `generateObject` puts the contract in the schema, and the schema is provider-independent. *Whenever the workload allows structured output, reach for it.* This is the line the whole lesson hangs on — say it plainly.

**Component:** A `CodeVariants` (two tabs) is the right vehicle — the contrast IS the teaching.
- Tab "Prompt-engineered JSON" (label, the anti-pattern): `streamText`/`generateText` with a system prompt begging for JSON, then `JSON.parse(result.text)` wrapped in a `try/catch`. First sentence of prose: "Fragile — the model can rename keys, wrap prose around the JSON, or drift on the next model update." Use a `del`-tinted or red `data-mark-color` on the `JSON.parse` line.
- Tab "generateObject" (the discipline): the minimal `generateObject` call (previewing the next section) with `result.object` typed access. First sentence: "The schema is the contract — constrained, validated, retried, typed." Green mark on the typed `result.object` access.
Keep each tab's prose to one paragraph. This sets up the minimal call without fully teaching it yet.

**No exercise here** — the practice lands after the syntax is taught.

---

### The minimal call: schema in, typed object out

**Goal:** The student can read and write a basic `generateObject` call and understands the three jobs the schema does. This is the spine the rest of the lesson decorates.

Content:
- Introduce the primary schema once, as a plain `Code` block: `invoiceLineItemSchema = z.object({ description: z.string(), quantity: z.number(), unitAmount: z.number() })`. Keep it minimal here — `.describe` is the *next* section, deliberately staged so the student first sees the bare shape, then learns why descriptions matter.
- The call, taught with `AnnotatedCode` (multiple parts need focus): `generateObject({ model: fastModel, schema: invoiceLineItemSchema, prompt, maxOutputTokens: 500 })`. Steps:
  1. `{model}` — the imported handle from `lib/llm/models.ts` (reference Lesson 1's rule, don't re-justify at length). `fastModel` is the right pick for extraction — cheap, deterministic enough.
  2. `"schema"` — the Zod object; this is the contract. Note it's serialized and sent to the model.
  3. `"maxOutputTokens"` — non-optional, the cost cap from Lesson 1; structured output is not exempt.
  4. The return: `const { object, usage, finishReason } = await generateObject(...)`. `object` is typed by the schema — `object.unitAmount` is a `number`, not `any`. This is the TypeScript win; make it explicit.
- Drive the type point home with `CodeTooltips` on a short follow-up line (`object.unitAmount` → tooltip "Inferred as `number` from the Zod schema — no cast, no `any`, no post-parse") OR note that the AnnotatedCode step states the inferred type inline. Prefer the AnnotatedCode step carrying it to keep component count down; mention CodeTooltips only if the writer wants the hover.
- Explicitly: do NOT show `JSON.parse` or a post-`safeParse` — the SDK already validated. Showing them would teach the redundancy the lesson is arguing against.

**Component:** `AnnotatedCode` (primary), preceded by a plain `Code` block for the schema. `maxLines` default is fine.

**Terms to gloss with `Term`:** `JSON Schema` (definition: "A standard, language-neutral format for describing the shape of JSON data. The AI SDK converts the Zod schema to JSON Schema and sends it to the model as the output spec.") — first use is here.

---

### Descriptions are the model's documentation

**Goal:** The student internalizes the highest-leverage schema habit: `.describe()` on every non-obvious field. This is where a vague extraction becomes a reliable one.

Content:
- The mechanism: the SDK serializes the schema to JSON Schema; field descriptions ride along as the model's documentation for what to put there. A bare `dueDate: z.string()` yields inconsistent formats (`"30 days"`, `"2026-07-15"`, `"net 30"`); `dueDate: z.iso.datetime().describe('ISO 8601 datetime, the date the invoice must be paid by')` extracts cleanly. Note `z.iso.datetime()` is the Code-conventions top-level builder, not `z.string()` — fold the convention in naturally.
- The reflex, stated as a rule: every non-obvious field gets a `.describe`; the schema should read like a spec. Cross-link to Chapter 042 (same Zod) and Code conventions (`.describe()` strings are read by the LLM — Unit 23+ convention).
- Show the upgrade as a `CodeVariants` (two tabs, before/after of the *same* schema):
  - "Bare schema": `invoiceLineItemSchema` with no descriptions, ambiguous field names where it bites (e.g. `unitAmount` — cents? dollars? per-unit or total?). Prose: "The model guesses — `unitAmount` could come back as dollars, cents, or the line total."
  - "Described schema": each field `.describe`'d, including the units decision (`'unit price in whole dollars, not cents, before tax'`). Prose: "The schema reads like a spec; the model fills it consistently." Green marks on the `.describe` calls.
- One nuance, briefly: descriptions cost input tokens (the schema is part of the prompt). Be descriptive on ambiguous fields, terse on obvious ones; don't write essays. (This foreshadows the "trim unused fields" watch-out.)

**Component:** `CodeVariants` (before/after). This is the section's centerpiece.

**Exercise — `ZodCoding` (the lesson's hands-on core):** This is the one place the student can actually run code, and it targets the exact skill. Frame: "Here's a half-described invoice line-item schema. Tighten it so the fixtures pass." Give a starter where field *types* are right but descriptions/formats are missing or wrong, and supply fixtures that pin the contract:
  - A well-formed line item → `pass`.
  - A line item with `quantity` as a string `"2"` → `fail` (proves `z.number()`, not coercion — teaches that the *type* is the structural floor).
  - Missing `description` → `fail` (required field).
  - (Optional) a `unitAmount` of `0` → `pass` (a free line item is valid; guards against an over-eager `.positive()` the student might add).
The `^?` query renders the inferred `LineItem` type so the student watches it firm up. Grading: fixtures table flips. `instructions` prop frames the task in one paragraph.
Rationale: descriptions don't change `safeParse` behavior, so the *fixtures* exercise the structural constraints (types/required), while the lesson prose carries the description discipline — this is honest about what's runnable in-browser and still gives genuine practice on schema design. Note this clearly so the writer doesn't promise the fixtures grade the prose.

---

### What the model can render: schema-shape constraints

**Goal:** The student writes schemas that survive JSON Schema serialization — knows the top-level-object rule, the safe building blocks, and the three things to avoid.

Content, named once and crisply (this is a reference-dense section — keep it tight, use a structured layout):
- **Top level must be an object.** `z.object(...)` at the root — most providers reject a bare array or primitive at the top. (The `output: 'array'` mode, next-but-one section, is how you "return a list" without breaking this.)
- **Safe inside:** strings, numbers, booleans, `z.enum([...])`, nested objects, arrays of objects. These all serialize and extract cleanly.
- **Unions cost accuracy.** Untagged `z.union` makes the model guess which branch; prefer `z.discriminatedUnion('kind', [...])` with an explicit discriminator (Code conventions: discriminated unions for tagged variants, `z.union` only for shapeless alternatives). Frame it as: give the model a label to pick, not a shape to infer.
- **Avoid:** `z.any` / `z.unknown` (nothing to serialize, the model gets no guidance), `z.transform` (the SDK can't represent it in JSON Schema), and **recursive schemas** (the JSON Schema export blows up). Name these three as the "won't serialize / will break" set.

**Component:** A two-column `Buckets` exercise is the ideal check here — classification is exactly the skill. Buckets: "Model-safe" vs "Breaks or degrades structured output." Items (each a small schema fragment as inline code):
  - `z.object({ ... })` at the root → safe
  - `z.enum(['draft','sent','paid'])` → safe
  - `z.array(lineItemSchema)` inside an object → safe
  - `z.discriminatedUnion('kind', [...])` → safe
  - `z.any()` → breaks/degrades
  - a recursive `z.lazy(() => node)` tree → breaks/degrades
  - `z.string().transform(s => s.trim())` → breaks/degrades
  - a bare `z.array(...)` at the top level → breaks/degrades
Use `twoCol` and an `instructions` prop. This is the section's assessment; no prose-only watch-out dump.

---

### The schema is the floor, the prompt is the suggestion

**Goal:** The student makes the right refine-vs-prompt call and avoids the most expensive beginner mistake — an over-strict `.refine` that thrashes the retry loop.

Content:
- The mechanism: `.refine` runs at validation time on the returned object; on failure the SDK *retries the model* — and each retry is a full, paid call. So a schema constraint the model can't reliably satisfy isn't a guardrail, it's a cost amplifier.
- The cut, stated as the section's title made concrete: **hard structural constraints in the schema** (types, enums, required fields — things the model can always satisfy), **soft constraints in the prompt** (formatting conventions like "invoice numbers follow `INV-XXXX`"). The schema is the floor everything must clear; the prompt is the suggestion that shapes the common case.
- The worked anti-example: `invoiceNumber: z.string().refine(s => s.startsWith('INV-'))` for a *model-generated* number → the model occasionally returns `INV/0001` or `2026-INV-1`, every miss burns a retry, budget evaporates. Fix: drop the `.refine`, add "invoice numbers use the format `INV-0001`" to the prompt, keep the field `z.string()`.
- Note the legitimate use of `.refine`: cross-field invariants the model controls and can satisfy (e.g. `endDate >= startDate`) — there it's a real guard, not a thrash. Keep this to a sentence so the student doesn't conclude "never refine."

**Component:** `CodeVariants` (two tabs: "Over-strict (retry thrash)" with the `.refine` + a red mark, "Floor in schema, hint in prompt" with the `z.string()` + the prompt hint shown). Prose first-sentence carries "burns a retry on every miss" vs "reliable and cheap."

**Connects forward to** the `maxRetries` section — this is *why* the retry knob matters.

---

### Picking the output shape: object, enum, array, and streaming

**Goal:** The student picks the right one of four shapes by naming the workload, not by habit. This is the section that ties the primitives together.

Content — four shapes, each "name the workload, show the one-liner":
- **`generateObject` + `z.object`** (the default, already taught): one structured record. Extract a line item, fill a form.
- **`output: 'enum'`** — the answer is *one value from a known set* (sentiment, intent, priority bucket). `generateObject({ model, output: 'enum', enum: ['low','medium','high'], prompt })` → returns a single string, skips the schema overhead, same retry behavior, cheaper. Show the one-liner. Use for classification where the result is a label, not a record.
- **`output: 'array'`** — the workload is *a list of records*. `generateObject({ model, output: 'array', schema: lineItemSchema, prompt })` → `{ object: LineItem[] }`. Note the equivalent-but-clunkier `z.object({ items: z.array(lineItemSchema) })` and the senior reflex: pick the mode that *names* the workload ("extract a list" → `output: 'array'`). This is also how you "return an array" despite the top-level-object rule.
- **`streamObject`** — same schemas, but streams *partial objects* as fields populate. Reach for it when the schema is large (multi-section summary, long line-item list) and the user reads fields sequentially: a 4-second generation becomes 4 progressive updates instead of a 4-second spinner. The route handler returns `result.toTextStreamResponse()`; the client renders with `useObject` — **name `useObject`, point to Lesson 3, do not build the client here.** Senior cut: `generateObject` for short/single outputs, `streamObject` when there are multiple fields read in sequence.

**Component — `StateMachineWalker` (`kind="decision"`):** A decision tree is the perfect vehicle — the lesson lives in the *order the senior asks the questions*, which is exactly what the walker enforces. Tree:
- Root question: "What shape is the answer?" → branches: "One label from a fixed set" → enum leaf; "One structured record" → object/streaming sub-question; "A list of records" → array/streaming sub-question.
- Sub-question for record & list: "How big is it / does the user read it as it arrives?" → "Small, read whole" → `generateObject` leaf; "Large, read field-by-field" → `streamObject` leaf (leaf body names `useObject` + Lesson 3).
- Leaves (`verdict` + reason body):
  - `output: 'enum'` — "Classification into a known set. Cheapest, simplest return."
  - `generateObject` + object — "One typed record, read whole. The default."
  - `output: 'array'` — "Extract a list. Names the workload."
  - `streamObject` — "Large output read sequentially; progressive UX. Client uses `useObject` (Lesson 3)."
No `Figure` wrapper (the walker is self-carded). This replaces a prose decision-table with an active walk.

**Optional second pass — `TabbedContent` or just sequential `Code` blocks** showing the four call one-liners side by side, so the student has the syntax reference after walking the decision. Keep it lightweight; the walker is the centerpiece. Prefer four small `Code` blocks under the walker over a heavy component.

**Term to gloss:** none new here; `enum` and `array` are familiar.

---

### The same seam, the retry knob, and the audit write

**Goal:** Cement that structured output lives behind the *identical* route-handler stack from Lesson 1 — no new handler shape to learn — and teach the one new knob, `maxRetries`.

Content:
- **Same seam.** `generateObject` sits behind the same `authedRoute('member', schema, fn)` + rate-limit + quota stack as `streamText` (Lesson 1). The `onFinish` callback fires with the typed `object`, `usage`, and `finishReason` — the audit-event write (`llm.call.completed`) and token accounting go *there*, exactly as in Lesson 1. For `streamObject` the handler returns `result.toTextStreamResponse()` and the post-call write still lives in `onFinish`. The whole point: **the student does not learn a different handler for structured output.** Show a compact handler with `generateObject` swapped in where `streamText` was, marking the *one changed line* so the consistency is visual.
- **`maxRetries`.** When the model returns output that fails Zod parsing (or the call errors), the SDK retries — the documented default is `2`. Tie it back to the floor/suggestion section: a well-described schema with a sane floor rarely fails, so `maxRetries: 1` is often right and caps cost; raise it only when the workload genuinely benefits. Each retry is a full paid call — the knob is a cost lever, not a reliability dial. Show the knob inline. (Writer: verify the default reads `2` against the AI SDK `generateObject` reference at author time; if it's drifted, state the current default, not a hardcoded number.)
- **Defensive access for `null`.** The rare case the lesson should not skip: the model genuinely can't comply and `object` comes back `null`/unusable, or generation fails. The handler should guard the typed access (check before the Drizzle insert) and surface a clean failure, not blow up on `object.description`. One or two lines; this is the "not everything always succeeds" reflex.

**Component:** `CodeVariants` is overkill; use a single `AnnotatedCode` of the route handler with steps on (1) the unchanged `authedRoute` wrapper [reference Lesson 1], (2) the `generateObject` call — the one line that differs from `streamText`, (3) `onFinish` with the audit write, (4) `maxRetries: 1` and the rationale, (5) the `null`/empty guard before the DB write. `maxLines` may need raising toward the ceiling (18) — keep the handler tight. Color the changed call line distinctly (e.g. `color="violet"`).

---

### The structured-output lifecycle, end to end

**Goal:** A single visual that makes the schema's *dual role* — prompt shape going out, runtime guard coming back — and the retry loop concrete. This is the section that consolidates the whole lesson into one picture.

**Diagram — Mermaid `sequenceDiagram` (actors over time), wrapped in `<Figure>`:**
Actors: Client → Route handler → AI SDK → Model. Flow:
1. Client → handler: user input (free text).
2. handler → SDK: `generateObject({ schema })` (auth/quota already passed — note this as a guard, reference Lesson 1).
3. SDK → Model: prompt **+ the schema serialized to JSON Schema** (annotate this arrow — "schema goes OUT as the spec").
4. Model → SDK: raw output.
5. SDK → SDK (self-loop): validate with Zod (annotate — "schema comes BACK as the guard").
6. Loop fragment: on validation failure, retry to Model (up to `maxRetries`) — make the loop visible, this is where the cost lives.
7. SDK → handler: typed `object` + `usage`.
8. handler → handler: `onFinish` audit write (reference Lesson 1).
9. handler → Client: response.
Pedagogical goal: the student *sees* the schema travel out as documentation and back as validation, and sees the retry loop they were warned about — making the floor/suggestion and `maxRetries` lessons spatial, not just verbal. Keep it horizontal-friendly and under the height cap; a sequence diagram with ~9 messages fits.

**Exercise — `Sequence` ordering drill:** directly reinforces the diagram. Steps (source order = correct): "User input reaches the route handler" → "`authedRoute` and the quota gate pass" → "`generateObject` serializes the schema to JSON Schema and sends it with the prompt" → "The model returns structured output" → "The SDK validates the output against the Zod schema" → "On a validation miss, the SDK retries the model" → "The typed object returns and `onFinish` writes the audit event" → "The handler responds to the client". `instructions` prop frames it. This is a clean recall check of the lifecycle and a natural lesson closer.

---

### Where it earns its weight (closing, brief)

**Goal:** Land the lesson in the running app and forward-point honestly.

Content: one short paragraph naming the invoice-domain `generateObject` calls the student can now write — extract line items from a free-text description, classify inbound payment emails into status buckets (`output: 'enum'`), draft an invoice description from a brief. The senior reflex to carry forward: even when the surface is conversational Q&A (Chapter 108), the *tools* that Q&A calls use this same Zod discipline for their inputs and outputs (Chapter 107). State the one-line takeaway: structured output is the swap-friendly call shape — prefer it whenever the workload is extraction, classification, or form-fill.

Optional `ExternalResource` / `LinkCard` to the AI SDK `generateObject` reference doc. Keep to one card if used.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Zod 4 fundamentals (`z.object`, `z.enum`, `z.discriminatedUnion`, `.refine`, `z.infer`, top-level format builders like `z.iso.datetime()`) — Chapter 042. Assume fluency; only the *new audience* (the model reads the schema) is taught here.
- `streamText` / `generateText`, the messages contract, the `app/api/.../route.ts` handler shape, `authedRoute(role, schema, fn)`, `onFinish` for usage/audit, `maxOutputTokens` discipline, the imported model handle (`chatModel` / `fastModel` from `lib/llm/models.ts`) — Lesson 1 (this chapter). Referenced as settled; re-shown only where a structured-output call swaps into the *same* shape.
- The per-user quota gate, the `llm.call.completed` audit event, and the provider abstraction / portability thesis — Chapter 105. Named, not re-derived.

**This lesson does NOT cover (defer, do not teach):**
- **Client-side rendering of partial objects via `useObject`**, the `parts` array, `useChat`/`useCompletion`, manually managed input state, the Server-Component-`initialMessages` boundary — **Lesson 3 (this chapter).** `useObject` is *named* in the `streamObject` and forward-points only; the client surface is not built. Do not write a React component that consumes a stream.
- **Tool calling** — tool `inputSchema` / output schemas also use Zod, but the agentic loop and tool registration are **Chapter 107 Lesson 1.** Forward-point once (the closing); do not teach tool definitions.
- **Generative UI / `streamUI` / `ai/rsc`** — Chapter 107 Lesson 2.
- **The fully worked invoice Q&A surface** — Chapter 108. This lesson's invoice examples are illustrative call sites, not a built feature.
- Provider-specific structured-output options (reasoning tokens, prompt caching, structured tool outputs), vision/image inputs feeding a schema, caching identical structured-output calls — out of scope; the AI Gateway (Chapter 105 Lesson 3) absorbs these.
- `experimental_telemetry` / OpenTelemetry spans — Unit 19, not here.

**Exercise-tech constraint (carry from Lesson 1's continuity notes):** the `ai` package + provider keys cannot run in-browser, and `ReactCoding` is react-family only. Live coding is limited to `ZodCoding` (real Zod via esm.sh — used for the schema-design drill) plus non-coding `Buckets` / `Sequence` / `MultipleChoice`. Do **not** attempt a live `generateObject` sandbox.

---

## Code conventions to honor (skimmed, relevant subset)

- **Zod 4 top-level format builders**, never deprecated `.string().x()` chains: `z.iso.datetime()` (not `z.string()` for dates), `z.email()`, `z.url()`, `z.uuid()`. The `dueDate` example must use `z.iso.datetime()`.
- `z.object` default; `z.discriminatedUnion('kind', [...])` for tagged variants, `z.union` only for shapeless alternatives (mirrors the schema-constraints section exactly).
- Schema naming: `<entity>Schema` for canonical shapes → `invoiceLineItemSchema`, `invoiceSchema`. `<verbEntity>Schema` for action-input shapes if one appears.
- `.describe()` strings on model-read schemas — the canonical convention this lesson operationalizes (Code conventions explicitly call this an LLM-facing pattern).
- Model handle is always an imported camelCase const (`fastModel`, `chatModel`) from `lib/llm/models.ts`, never an inline `openai('gpt-X')` (Lesson 1's committed rule; do not regress).
- `maxOutputTokens` on every call — absence is a cost bug, not a simpler example (Lesson 1).
- Route handler at `app/api/.../route.ts` via `authedRoute('member', schema, async ({ ... }, request) => { ... })`; usage/audit writes inside `onFinish` only.
- `import { z } from 'zod';` (external packages first in import order).

**API-surface guardrail (verified June 2026):** This lesson uses the **v5 string-mode** structured-output API — `generateObject({ output: 'enum', enum: [...] })`, `generateObject({ output: 'array', schema })`, result destructured as `{ object, usage, finishReason }`, `streamObject(...).toTextStreamResponse()`, and client `useObject` (Lesson 3). This is consistent with Lesson 1's committed v5 vocabulary (`convertToModelMessages`, `toUIMessageStreamResponse`, `UIMessage` parts). The AI SDK's *current un-versioned* docs are drifting toward a v6 `Output.*` helper API (`Output.object()`, `Output.array()`, `Output.choice()`, `Output.text()`, `Output.json()`) used via `generateText`/`streamText` with an `experimental_output`/`output` arg. **Do not mix that surface in** — it contradicts the chapter's v5 baseline and Lesson 1/3 consistency. If the project has since pinned v6, that's a chapter-wide migration, not a per-lesson call; flag it upward rather than introducing `Output.*` here unilaterally. Note: `useObject` ships as `experimental_useObject` (alias on import) — Lesson 3's concern, mentioned here only so the `streamObject` forward-pointer names it accurately.

**Deliberate divergences to flag for downstream agents:**
- The "bare schema" tab in *Descriptions are the model's documentation* intentionally omits `.describe` (and may use a vaguer field name) to show the failure mode — this is a teaching foil, not the shipped shape. Label it as such in-tab.
- The `ZodCoding` exercise grades structural constraints (types/required) via fixtures, not the `.describe` prose (descriptions don't affect `safeParse`). The writer must frame the drill honestly — it practices schema *shape* design; the description discipline is carried by prose, not the grader.
- Schemas in early sections are shown minimal (no `.describe`, no quota wrapper) and grow across the lesson — a deliberate staged build to control cognitive load, not the final production shape.
