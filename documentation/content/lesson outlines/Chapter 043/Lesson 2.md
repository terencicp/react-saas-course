# Parse on entry, every time

**Title:** Parse on entry, every time
**Sidebar label:** Parse on entry

## Lesson framing

Lesson 1 built the empty five-seam skeleton (`parse → authorize → mutate → revalidate → return`) and the golden rule that every action argument is attacker-controlled.
This lesson fills the **first** seam and makes it a non-negotiable habit: the action's opening line is a `safeParse` against a `drizzle-zod`-derived schema, and **nothing** — no `cookies()`, no `db`, no `console.log` — runs before that parse succeeds.

Pedagogical center of gravity: this is a **discipline lesson**, not a syntax lesson. The student already owns all the Zod mechanics from Chapter 042 (`safeParse`, `treeifyError`, `Object.fromEntries`, coercion, `createInsertSchema`, refinement-on-top). The new thing is not *how* to parse — it's *that you always parse, first, at this exact seam*, and *which rules belong in the schema versus the action body*. So the lesson leans on **the why** (the three attack vectors HTML validation can't stop) and **the placement** (parse before everything, business rules after the parse), reusing Chapter 042 syntax rather than re-teaching it.

The motivating frame is concrete production stakes: a curl request, a stale client after a deploy, a JS-disabled submit. These three are the spine — they make "the browser already validated" visibly insufficient and justify the reflex. Lead with them.

The mental model to leave the student with, stated as a one-liner the lesson returns to: **Zod proves the shape; the action body proves the business rules.** Shape rules (types, lengths, formats, cross-field) live in the schema and parse without a database. Cross-resource rules (uniqueness, plan limits, suppression lists) need IO and live in the action body after the parse, producing the same failure channel with a different `code`.

Cognitive-load management: introduce the parse line first in isolation against the running `createInvoice` example, *then* show where the schema comes from (`createInsertSchema` + `.omit` + refinement), *then* layer the schema-vs-body split, *then* the watch-outs. Don't front-load the full assembled action — build the entry seam, lock it, then widen.

Hard constraint from Lesson 1's continuity notes: **the canonical `Result` shape is Lesson 3's to define.** This lesson must show the parse *returning a failure* and *passing typed data forward*, but must NOT define `Result<T>`, the `code` enum, or the `ok`/`err` helpers. Use a deliberately provisional inline failure object (clearly flagged as "the shape Lesson 3 formalizes") so the parse seam reads end-to-end without pre-empting the next lesson. Flag this divergence in the prose so downstream agents don't "fix" it by importing `Result`.

Running example stays `createInvoice(formData: FormData)` from Lesson 1, schema derived from an `invoicesTable` (Chapter 037 / 042 vocabulary). Keep the entity consistent chapter-wide.

## Lesson sections

### Introduction (no header)

Open on the senior question, framed as a scene: `createInvoice` takes `FormData` and writes a row. The form had `required`, `pattern`, `minLength` — HTML5 constraint validation ran in the browser before submit. So is the action's input safe? No. The action is a public POST endpoint (Lesson 1's frame); the browser validation never ran for the request that matters. State the lesson's job: install the parse-on-entry discipline as the first line of every action body, and draw the line between what the schema validates and what the action body validates.

Keep it to ~5 sentences. Connect explicitly to Lesson 1 ("the seam is open; this lesson fills the first slot") and Chapter 042 ("you have the Zod vocabulary; now it gets a fixed home").

### Why client validation is never enough

The motivational core. Three concrete failure modes where browser validation is absent or stale, each a real production scenario, presented as a short tabbed comparison so the student sees the *same* malicious/broken payload reaching the action through three different doors.

- **The non-browser caller.** `curl -X POST` (or a script, or an attacker with the action ID from the client bundle — Lesson 1's opaque ID) sends `{ total: -9999, status: "god-mode" }`. No HTML form ran. The constraint attributes never existed for this request.
- **The stale client.** The schema gained a `required` field in this morning's deploy; a user with yesterday's bundle open in a tab submits the old shape. Client validation passed against the old rules; the server is on the new ones.
- **The JS-disabled / progressive-enhancement submit.** The form posts natively without the client-side JS validation layer ever executing (forward-ref to Chapter 044's progressive-enhancement lesson — name it once). The constraint API gives *some* coverage here, but `setCustomValidity` and any JS-driven checks are gone.

Land the distinction sharply: **client validation exists for UX (instant feedback, fewer round-trips); server validation exists for correctness.** They are not redundant — they serve different masters. The 2026 reflex: every action parses its input, no exceptions, even when the form does flawless client-side validation.

Component: use `TabbedContent` with three panels (one per failure mode), each panel a tiny illustration — the offending request on the left, "constraint validation: did not run" on the right. Keeps the three vectors visually parallel and compact. Wrap in `<Figure>`.

Pedagogical reasoning: beginners' #1 wrong instinct here is "I validated in the form, so the action input is trusted." Defeating that instinct is the whole lesson; it earns the most concrete, scenario-driven treatment up front.

### The parse is the first line

Teach the canonical entry shape against `createInvoice`. This is the smallest correct version — one schema, `Object.fromEntries`, `safeParse`, branch on `success`.

Build it with `AnnotatedCode` (single block, the focus needs to land on distinct parts in sequence). Steps:
1. The action signature — `FormData` in, `Promise<Result<{ id: string }>>` out (the `Result` is imported as a type only, from Lesson 1; don't re-explain it).
2. `Object.fromEntries(formData)` — the string-keyed plain object (Chapter 042.6 reflex; name it, don't re-derive). One sentence on the `getAll` caveat for multi-valued fields, link to 042.6.
3. `Schema.safeParse(...)` — `safeParse`, not `parse`. One line on why (Chapter 042.5's boundary default): the action returns the failure to the form, it does not throw into `error.tsx`. Defer the full throw-vs-`Result` decision to Lesson 3 explicitly.
4. The `if (!parsed.success)` early return — returns the validation failure carrying `z.treeifyError(parsed.error)`. **Flag the provisional shape here**: the exact failure object is Lesson 3's; for now read it as "a failure the form renders under the field."
5. The success path — `parsed.data` is now fully typed; every later seam reads from it. Highlight that everything after this point is inside the success branch.

Use `color` per step (blue default; orange for the `safeParse` call; green for the success-branch data). Keep the block short enough that `maxLines` default holds.

Reinforce the placement rule as its own beat right after: **parse before anything else.** No `cookies()`, no `db`, no `console.log` of the raw input before `safeParse` returns success. Three reasons, stated tersely:
- Logging un-parsed input leaks client-controlled values into logs (PII, password attempts in the wrong field, injection probes).
- Branching on un-validated fields means operating on `any`-shaped values — the type system can't help.
- Hitting the database before validation burns a query (and a connection) on garbage input.

`Term` candidate: **PII** (personally identifiable information).

### The schema comes from the table, not your keyboard

Where the schema in the parse line comes from. This is the source-of-truth payoff from Chapter 042.7 applied at the action seam. The student does NOT hand-write a parallel `z.object` for the action input.

Show the derivation with `CodeVariants` (two tabs: "Hand-written, the drift trap" vs. "Derived, the senior reflex") so the contrast is explicit:
- **Tab 1 (anti-pattern):** a hand-rolled `z.object({ total: z.coerce.number(), status: z.enum([...]), ... })` that duplicates the column list. Caption: when a column type changes in `db/schema.ts`, this silently drifts.
- **Tab 2 (default):** `createInsertSchema(invoicesTable, { /* per-column refinements */ }).omit({ id: true, organizationId: true, createdAt: true })`. Caption: the database is the source of truth; the action's input contract is derived; a column change updates the contract or breaks the build.

Teach three moves on the derived schema, each one sentence (all are Chapter 042.7 recall, applied):
- **`.omit` the server-set columns** — `id`, `organizationId` (from session), audit fields (from the action wrapper, Chapter 057). These are never user input; omitting them keeps them out of the parsed shape so the action can't be tricked into setting them. Tie to Lesson 1's "never trust a client-passed `userId`."
- **Refine on top** via the per-column override map — API-only rules the column type doesn't carry (a tighter max length, a positive-amount check). The override callback receives the generated column schema; chain onto it.
- **Coercion is already baked in** for the `FormData` boundary where `createInsertSchema` maps a numeric/timestamp column — but name the 042.6 reflex (`z.coerce`, the checkbox `preprocess`) once and link, since `FormData` arrives string-typed.

Senior anchor to state: the form's `name` attributes match the schema keys (code conventions: "Form `name` attributes match schema keys"); the schema is the one contract both sides read. Forward-ref the form side to Chapter 044 (named, not taught).

Pedagogical reasoning: the derive-don't-duplicate reflex is the durable senior decision here. Showing the drift trap first (Tab 1) makes the cost visceral before showing the fix.

### The strictObject reflex for action inputs

Why action input schemas reach for strict-by-key behavior. Short section, one decision.

`z.strictObject` so an unknown field surfaces as a validation error instead of silently vanishing. **Accuracy note for the writer:** `drizzle-zod`'s `createInsertSchema` generates a plain `z.object` (strips unknown keys silently) — it is NOT strict by default. To get strict behavior on a derived schema, apply it explicitly (e.g. a hand-written `z.strictObject` for non-table inputs, or layer strictness onto the derived schema). Do not claim the generated schema is strict. The reasoning: the client and server share a schema, so an unknown key is **contract drift** — a stale client, a tampered request, or a bug — worth surfacing and logging, not swallowing. Contrast with the default `z.object` (strips unknown keys silently, Chapter 042.1 recall) and `z.looseObject` (forwards them) so the three-way choice is clear in one breath.

The watch-out lives here, not in a separate watch-outs dump: strict mode rejects browser- or framework-added fields (`_method`, hidden framework inputs). The fix: name those fields explicitly in the schema, or accept `z.object`'s silent strip when you genuinely can't enumerate them. State the trade-off; let the student decide per form.

Forward-ref the error-monitoring hook (Chapter 092) once — an unknown-key rejection is a logger signal, not something the user can fix.

Exercise opportunity: a small `MultipleChoice` or `TrueFalse` beat — "A client sends an extra `isAdmin: true` field against your insert schema. What happens with `z.object`? With `z.strictObject`?" Reinforces the silent-strip danger. Keep it to one or two items; the deeper coding practice comes later.

### Zod proves the shape; the action body proves the business rules

The conceptual spine of the lesson and the part that most shapes how the student writes every future action. Two categories of rule, one in the schema, one in the body.

Make the split crisp with a `Buckets` exercise (classification drag-and-drop) — the ideal component for "which side does this rule live on?". Items to sort into **Schema** vs. **Action body**:
- Schema: `email` is a valid email; `total` is positive; `dueAt` is after `issuedAt` (cross-field refine); `status` is one of the enum values; `title` ≤ 200 chars.
- Action body: this email isn't on the suppression list; this org slug isn't already taken (unique check); the user's plan allows creating another invoice; the caller is rate-limited.

The discriminator, stated as the rule: **does the check need IO (a database row, an external service, request state)?** If yes, it can't run inside Zod and belongs in the action body after the parse. If no — it's provable from the input alone — it lives in the schema. This is Architectural Principle #3 in miniature (pure validation in the schema, side-effect-bearing checks at the named boundary); name the principle here since it's the first place it bites in the chapter, but keep it light — Lesson 4 introduces #3 in full.

Then show what a body-level rejection looks like. The cross-resource checks (uniqueness, plan gate, suppression) produce the **same failure channel** as the parse failure but with a different machine-readable `code` (`'email_taken'`, `'plan_exceeded'`) and a `userMessage` the form renders. Crucially: **flag that the exact failure shape and the `code` set are Lesson 3's** — here, just establish that there's one failure channel two kinds of rejection flow into. Use a short `Code` block (not AnnotatedCode — it's a sketch) of the action body sequence: `parse → (if !success return validation failure) → uniqueness check → (if taken return conflict failure) → ...`, with the failure objects written provisionally and a one-line note that Lesson 3 names them.

Sub-beat — **the narrow window**: a schema-*valid* value the action still rejects. A well-formed email that's on the suppression list; a numerically-valid amount over the plan limit. Zod said the shape is fine; the business rule says no. This is exactly why the two layers are separate — and why a passing parse is necessary but not sufficient. This nails the mental model: parse is the floor, not the ceiling.

Pedagogical reasoning: the single most common real-world mistake is cramming DB-dependent rules into the schema (a `.refine` that queries the database), which makes the schema un-parseable without a connection and un-testable. The `Buckets` drill plus the IO-discriminator rule inoculate against it directly. This is the lesson's highest-leverage section after the "why".

### The assembled entry seam

Bring it together: the action from signature through the first two seams (parse, then the one business-rule check), stopping where Lesson 3 (`Result`), Lesson 4 (`/lib` extraction), and Lesson 5 (mutate/revalidate) take over. Explicitly mark the seams not yet filled as commented placeholders (consistent with Lesson 1's non-working-skeleton convention — note this so downstream agents don't "complete" it).

Optionally a `Sequence` exercise: give the shuffled lines of a correct action entry (`Object.fromEntries`, `safeParse`, `if (!parsed.success) return ...`, the uniqueness check, the success-path continuation) and have the student order them — reinforcing parse-first and check-after-parse ordering. The fixed code-context variant of `Sequence` fits well. Choose either this or fold it into the chapter; one ordering drill is enough.

End with the one-line takeaway restated: **parse first, branch on `parsed.success`, prove business rules after — Zod proves the shape, the action body proves the rules.**

### Watch-outs woven in (not a section)

Per the instructions, watch-outs belong in the section teaching their concept, not bundled. Distribute these to their homes:
- `parse` instead of `safeParse` throws past the form into `error.tsx` → in **The parse is the first line** (step 3).
- Logging un-parsed input leaks client-controlled values → in **The parse is the first line** (placement-rule beat).
- Reading `formData.get('field')` field-by-field in the body re-introduces stringly-typed code the schema removes → in **The parse is the first line** (step 2, the `Object.fromEntries` beat).
- Refinements that need DB access stuffed into the schema break its purity / testability → in **Zod proves the shape…** (the IO-discriminator beat).
- `strictObject` rejects browser/framework-added fields → in **The strictObject reflex** (already placed there).

Do not create a trailing "Watch-outs" header.

### External resources (optional)

One or two `ExternalResource` cards max: Zod 4 `safeParse`/`treeifyError` docs and the `drizzle-zod` README section on `createInsertSchema` override maps. Only if they add genuine reference value beyond the lesson.

## Tooltip terms

Strategic, few. Candidates:
- **PII** — personally identifiable information (in the logging watch-out).
- **drizzle-zod** — one-line reminder it generates Zod schemas from the Drizzle table (Chapter 042.7), in case the student skipped it.
- **`safeParse`** — one-line reminder: returns `{ success, data } | { success, error }` instead of throwing (Chapter 042.5 recall, supports flow without interrupting).

Skip tooltips for terms the lesson defines in prose (strictObject, the five seams).

## Scope

**This lesson covers:** the parse-on-entry discipline (the first of the five seams); `safeParse` on `Object.fromEntries(formData)` as the literal first line; the `drizzle-zod`-derived-then-refined schema as the input source; `.omit` for server-set columns; the `strictObject` reflex for unknown-key rejection; the schema-vs-action-body split for shape rules versus cross-resource business rules; the IO-discriminator that decides which side a rule lives on; the validation-before-anything-else rule and its three reasons.

**Not covered (defer, do not teach):**
- The canonical `Result<T>` shape, the `code` enum, and the `ok`/`err` helpers — **Lesson 3**. This lesson uses a provisional inline failure object and explicitly defers the shape. Do not import or define `Result`'s body here.
- The throw-vs-`Result` decision tree, mapping DB errors (unique violation → `conflict`) to typed codes, the "never leak the raw error" reflex — **Lesson 3**. This lesson establishes only that uniqueness checks live in the body and produce a failure; the *shape and mapping* are Lesson 3.
- Extracting pure helpers / repository / policy into `/lib` (Architectural Principle #3 in full, Principle #5, the no-`safeAction`-wrapper rule) — **Lesson 4**. Name Principle #3 lightly at the schema-vs-body split; don't introduce the directory shape or the wrapper debate.
- `revalidatePath`, transactions, `redirect()` after a mutation, idempotency keys — **Lesson 5**. The assembled-seam example stops before the mutate/revalidate seams (commented placeholders).
- Authentication/authorization wrapping the action, `authedAction`, reading the session for `organizationId` — **Chapter 057**. This lesson only `.omit`s the session-set columns and names the slot.
- Form-side consumption: `<form action>`, `useActionState`, rendering `fieldErrors` under inputs, the constraint-validation client layer, progressive enhancement — **Chapter 044** (lessons 1–7). Name the contract (form `name` = schema key; the form reads the failure), forward-ref, do not wire.
- Rate limiting on the action — **Chapter 074** (named once as a body-level check example).
- Email suppression list — **Chapter 048** (named once as the business-rule example).
- Error monitoring for contract drift — **Chapter 092** (named once at the strict-key rejection).

**Prerequisites to redefine concisely (one line each, don't re-teach):** the five-seam shape and the attacker-controlled-args rule (Lesson 1); `safeParse` vs `parse`, `z.treeifyError`, `Object.fromEntries`/`getAll`, `z.coerce`, `z.strictObject` (Chapter 042); `createInsertSchema` + override map + `.omit` (Chapter 042.7); `invoicesTable` as the running entity (Chapter 037).

## Code conventions alignment

Verified against `Code conventions.md`:
- Five-seam shape `parse → authorize → mutate → revalidate → return` and "`Object.fromEntries(formData)` then `safeParse` … **first**, before any cookie read, DB call, or log" — exact match; this lesson teaches that line.
- `z.strictObject` "when extra keys are a bug" — matches the strictObject-reflex section.
- `treeifyError` is the course default (not `flattenError`) — use `z.treeifyError` for field errors.
- `createInsertSchema` + per-column override map + `.omit` as the canonical derivation; hand-writing a parallel schema is "a smell" — matches the derive-don't-duplicate section.
- **Import path (fact-checked June 2026):** current stable `drizzle-orm` (0.45.x) imports from `'drizzle-zod'`; Drizzle 1.0 beta+ moves them to `'drizzle-orm/zod'`. The course is on the stable line — write `import { createInsertSchema } from 'drizzle-zod'` and add a one-line aside that 1.0 relocates it to `drizzle-orm/zod`.
- Avoid `z.coerce.boolean()` for form data; `z.preprocess(v => v === 'on' …)` for checkboxes — reference when naming the coercion reflex.
- Form `name` attributes match schema keys — state as the cross-layer contract.

**Deliberate divergence (flag for downstream agents):** the failure-return object is written provisionally (not the canonical `Result`) because Lesson 3 owns that shape. This is intentional staging, not a convention miss.
