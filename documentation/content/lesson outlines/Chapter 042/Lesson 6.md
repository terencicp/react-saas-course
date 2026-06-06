# Crossing the FormData boundary

- **Title (h1):** Crossing the FormData boundary
- **Sidebar label:** The FormData boundary

---

## Lesson framing

This is the bridge lesson. The student now owns the full Zod 4 vocabulary (builders L1, formats L2, checks/transforms L3, derivation L4, parse/error contract L5). This lesson plugs that vocabulary into the one boundary every form-driven Server Action crosses: a browser `<form>` serializes everything to strings, and the action's typed domain wants numbers, booleans, dates, arrays, and files. The lesson teaches the minimum syntax that bridges the gap and — more importantly — the four footguns that make a naive bridge ship silent data corruption.

Pedagogical spine: **the wire is strings; the schema is the bridge, and the bridge is where the type changes.** Every value off a form is `string | File`. The student already learned in L3 that a transform changes the inferred output type; coercion is a packaged transform that runs a JS constructor (`Number`, `new Date`, `BigInt`) before validating. So `z.coerce` is not a new concept — it's L3's transform with a name. Frame it that way to keep cognitive load low and to make the input-vs-output type split (L4's `z.input`/`z.output`) land concretely: the form contract is `z.input`, the action body holds `z.output`.

The senior payload of this lesson is **the four traps**, not the happy path. The happy path (`z.coerce.number()`, `z.coerce.date()`) is three lines. The reason this lesson exists is that JS coercion semantics are wrong for HTML forms in exactly four predictable ways:
1. **Booleans** — `z.coerce.boolean()` runs `Boolean()`, so `"false"` → `true`; and in Zod 4.4 it now *throws* on the `undefined` an unchecked checkbox produces. Wrong twice. The checkbox shape is `z.preprocess(v => v === 'on' || v === true, z.boolean())`.
2. **Empty strings → numbers** — `Number('')` is `0`, not `NaN`. An optional numeric field submitted blank becomes a silent zero. Fix: map empty to `undefined` before coercing.
3. **Repeated keys** — `Object.fromEntries(formData)` keeps only the last value of a multi-valued field. Arrays need `formData.getAll(name)`.
4. **Invalid dates pass** — `z.coerce.date()` runs `new Date('garbage')`, which yields an `Invalid Date` object that *passes* the "is it a Date?" check. Fix: a `.refine(d => !isNaN(d.getTime()))` or prefer `z.iso.datetime()` which fails cleanly on a bad string.

These are not edge cases; they are the default behavior of the obvious code. Teaching the student to feel the trap before reaching for the tool is the whole senior move here. Each trap gets a "naive code → what actually happens → the fix" beat, ideally proved live so the surprise is felt, not asserted.

Treatment decisions:
- **Code-first, live where the surprise matters.** This is a hands-on syntax-and-gotcha lesson, not a conceptual one. The four traps each want a live runtime proof (`ZodCoding` fixtures or a `ZodPlaygroundCallout`) so the student *sees* `''` parse to `0` and `'garbage'` pass. Asserting it in prose is weaker than watching the fixture flip green when it should be red.
- **One running schema.** Reuse the chapter's `invoiceSchema` lineage. This lesson's spine artifact is `invoiceFormSchema` — the form-input variant with coerced fields, parsed via `Object.fromEntries`. It is the shape every Unit 6 Server Action reuses; name it once, make it canonical.
- **No Server Action machinery.** Server Actions are Chapter 043. This lesson shows the `Object.fromEntries(formData)` → `safeParse` move in isolation (the snippet stops at the parse). Forward-point the action wiring; do not teach `'use server'`, `useActionState`, or the `Result` shape.
- **`z.coerce` is L3's transform, named.** Tie back explicitly so coercion isn't a mysterious new primitive.
- **Continuity:** snippets continue using `safeParse` (L5 default) on `Object.fromEntries` output; reuse `invoiceSchema` fields and the four statuses; ZodPlaygroundCallout/ZodCoding pinned `version="4.4.3"`.

Mental model the student should leave with: *I cannot trust any value off a form to be the type its name implies. I parse the whole `formData` object through one schema as the first line of the action, the schema coerces and validates in one pass, and I reach for `z.preprocess` the moment JS coercion's defaults disagree with HTML's wire format — which for checkboxes, optional numbers, and dates, they do.*

---

## Lesson sections

### Introduction (no header)

Open with the concrete senior question, stated as code the student can already half-read: a `<form>` posts to an action, and `formData.get('quantity')` returns the string `"3"`, `formData.get('archived')` returns `"on"` or nothing, `formData.get('issuedAt')` returns an ISO string. The action's domain code wants `number`, `boolean`, `Date`. Name the gap: the form vocabulary the student has (L1–L5 schemas) describes the *typed* domain, but the wire only carries strings. This lesson is the bridge. Preview the deliverable: by the end, the student writes `invoiceFormSchema` and the one-line `safeParse(Object.fromEntries(formData))` move that every form-handling action reuses, and knows the four places the obvious bridge silently corrupts data.

Keep it to ~5 lines. Warm, terse, no celebration.

### Everything off a form is a string

**Goal:** establish the hard constraint the rest of the lesson works around — the FormData contract.

Content:
- `formData.get(name)` returns `FormDataEntryValue`, i.e. `string | File`. There is no number, boolean, date, or array on the wire. The browser serializes form controls to strings; the server parses back. This is not a Zod fact — it's the HTML form + multipart spec.
- Show the raw shape with a tiny `Code` block: a `<form>` with a number input, a checkbox, a date input, and what `formData.get()` returns for each (all strings, checkbox is `'on'` or `null`). Use `CodeTooltips` on the three `.get()` calls to surface the inferred `FormDataEntryValue` / `string | File` return type so the student *sees* the type the platform hands them — this is the type-level anchor for the whole lesson.
- Multi-valued fields: `formData.getAll(name)` returns `string[]`. Files come through as `File` (the only non-string shape). Name both here; they get their own sections later.

Use a small **HTML+CSS or SVG figure** (wrapped in `<Figure>`) showing the boundary as a literal line: left side a browser `<form>` with typed-looking controls (a number spinner, a checkbox, a date picker), an arrow labeled "HTTP / multipart — everything serialized to text" crossing a vertical divider, right side the server with the `formData` entries shown as quoted strings (`"3"`, `"on"`, `"2026-01-15"`). Pedagogical goal: make "the wire is strings" a picture the student can recall, and visually locate where the schema (taught next) sits — straddling the divider. This is the lesson's keystone visual; keep it simple, one divider, ~5 fields.

Terminology: `Term` on **FormData** (browser API: a key/value collection mirroring a submitted form, values are strings or files) and **multipart/form-data** (the encoding a form uses when it carries a file; named once).

### `Object.fromEntries(formData)` — the first move

**Goal:** the canonical first line of any form-consuming action, and its one sharp edge.

Content:
- `const raw = Object.fromEntries(formData)` turns the FormData iterable into a plain object: `{ quantity: '3', archived: 'on', email: '...' }`. This is the object `safeParse` consumes. Show it as a `Code` block paired with the resulting object literal as a comment so the string-valued shape is explicit.
- The sharp edge, stated immediately (this is **Trap 3**, surfaced early because it's a property of `fromEntries` itself): `Object.fromEntries` collapses repeated keys to the **last** value. A `<select multiple>` or repeated checkbox named `tags` loses every value but the last. The fix: pull multi-valued fields explicitly with `formData.getAll('tags')` and assemble the object by hand for those keys. Show the two-line pattern: spread `fromEntries` for the scalar fields, override the array keys with `getAll`.
- Senior note: name multi-valued inputs with a convention (e.g. `tags`) and remember `getAll` is required — the schema's `z.array(z.string())` will receive a single string, not an array, if you forget, and fail confusingly.

Components: a single `Code` block for the base move; a small `CodeVariants` (label "Naive — last value wins" / "Correct — getAll for arrays") to make Trap 3 a felt A/B rather than a footnote. Use `del`/`ins` framing inside the variants.

### `z.coerce` — a transform that runs a constructor

**Goal:** teach the happy-path bridge and ground it in L3 so it's not a new primitive.

Content:
- Reframe coercion as L3's transform with a name: `z.coerce.number()` is `z.number()` preceded by a built-in transform that calls `Number(input)` before the number validation runs. Same for `z.coerce.date()` (`new Date(input)`), `z.coerce.bigint()` (`BigInt(input)`), `z.coerce.string()` (`String(input)`). The input is accepted as `unknown`, the constructor runs, then the inner schema validates the result.
- This is the moment the input/output type split (L4's `z.input`/`z.output`) becomes concrete: `z.coerce.number()` has input `unknown` and output `number`. The form sends a string, the action holds a number. Tie back to L4 explicitly — a coerce schema is exactly the "transform splits the type" case L4 motivated with `z.coerce.date()`. Reinforce with a `^?`-style note: the form contract is `z.input<typeof invoiceFormSchema>`, the parsed value is `z.output`.
- The dominant form-data schema shape — the lesson's spine artifact. Present `invoiceFormSchema` with `AnnotatedCode` so each field's role is walked one at a time:
  ```ts
  const invoiceFormSchema = z.object({
    customerId: z.uuid(),
    total: z.coerce.number().positive().multipleOf(0.01),
    issuedAt: z.coerce.date(),
    notes: z.string().optional(),
  });
  type InvoiceFormInput = z.input<typeof invoiceFormSchema>;
  ```
  AnnotatedCode steps: (1) the object is the contract between form `name` attributes and the action's typed input; (2) `z.uuid()` — a string that stays a string, no coercion needed (off-wire IDs are already text); (3) `total` — `z.coerce.number()` runs `Number`, then `.positive().multipleOf(0.01)` validate the *coerced* number; (4) `issuedAt` — `z.coerce.date()` runs `new Date`, output is `Date`; (5) the `z.input` alias is the form-side type, distinct from `z.infer`/output. Use `color` to tint the coerced fields.
- The reuse line: at the top of every form-consuming action sits `const parsed = invoiceFormSchema.safeParse(Object.fromEntries(formData));`. Name it once; state that every Unit 6 action follows this exact shape. Stop at the parse — the `if (!parsed.success)` branch and the action body are Chapter 043.

Components: `AnnotatedCode` for `invoiceFormSchema`; `CodeTooltips` optional on the `z.coerce.*` calls to show the `unknown → T` input/output asymmetry. A `ZodPlaygroundCallout` (pinned `4.4.3`) prefilled with `invoiceFormSchema` and three sample values — a valid string-shaped invoice, one with `total: "12.5"`, one with `total: "abc"` — so the student watches coercion succeed and fail live. `ZodPlaygroundCallout` schema must end with `return schema`.

### The boolean trap: why `z.coerce.boolean()` is wrong for checkboxes

**Goal:** the headline trap. Two distinct bugs, one wrong tool, one correct pattern.

Content:
- The HTML checkbox wire shape, stated precisely: a checked checkbox sends `name=on`; an **unchecked checkbox sends nothing at all** — the key is absent from FormData, so the value is `undefined`, not `'off'` or `'false'`. This asymmetry is the root of both bugs.
- **Bug 1 — truthiness.** `z.coerce.boolean()` runs `Boolean(input)`. Every non-empty string is truthy, so `Boolean('false')` is `true`. A field carrying the literal string `"false"` coerces to `true`. For checkboxes this never bites (they send `'on'`), but for any boolean *select* or hidden field carrying `"true"`/`"false"` it silently inverts.
- **Bug 2 — the v4.4 throw on undefined.** As of Zod 4.4, `z.coerce.boolean()` *errors* when it receives `undefined` (it used to return `false`). An unchecked checkbox produces exactly that `undefined`. So `z.coerce.boolean()` doesn't just mis-coerce the unchecked case — in the pinned version it rejects the parse outright. State this as a version-dated fact; it's a recent change the student's older-doc instincts won't know.
- **The correct checkbox pattern** (matches code conventions verbatim): `z.preprocess(v => v === 'on' || v === true, z.boolean())`. The preprocess maps `'on'` → `true` and *anything else including the absent `undefined`* → `false`, then the inner `z.boolean()` validates a real boolean. Walk why each piece is there. (The `|| v === true` arm covers programmatic callers/JSON that send a real boolean.)
- **`z.stringbool()` — the adjacent tool, and why it's not the checkbox answer.** Zod 4 ships `z.stringbool()` for strings carrying textual booleans: it accepts `"true"/"false"`, `"yes"/"no"`, `"on"/"off"`, `"1"/"0"` (case-insensitive, customizable via `{ truthy, falsy }`). It is the right reach for a `<select>` or text field whose *value* is the word "true". But it expects a *present string* — it does not model the absent-when-unchecked checkbox, so for checkboxes the `z.preprocess` form is still the move. Name `z.stringbool()` once, draw the line: **`z.stringbool()` for a string that spells a boolean; `z.preprocess` for the checkbox that's present-or-absent.**

Components:
- A **`StateMachineWalker`** (`kind="decision"`, no `<Figure>` wrapper) — "Which boolean shape is this form field?" Branches: *Is the control a checkbox (present-when-checked, absent otherwise)?* → Leaf `z.preprocess(v => v === 'on' || v === true, z.boolean())`. *Is it a select/field whose value is the word "true"/"yes"/"on"?* → Leaf `z.stringbool()`. *Is it a real boolean from a JSON/programmatic caller?* → Leaf `z.boolean()`. Pedagogical goal: force the student through the *question that picks the tool* — the failure mode is reaching for `z.coerce.boolean()` reflexively; the walker makes the discriminating question (present-or-absent vs spells-a-word) the first thing they ask. Each leaf's reason body names why the rejected alternatives fail.
- A **`ZodCoding`** exercise proving Bugs 1 and 2 and the fix. `schemaName="archivedSchema"`. Starter has the student's field as `z.coerce.boolean()`. Fixtures: `{ name: 'checked', input: { archived: 'on' }, expect: 'pass' }` (passes but for the wrong reason — coerces to true), `{ name: 'unchecked (absent)', input: {}, expect: 'pass' }` (fails with the starter because `undefined` throws in 4.4 — the student watches it go red), `{ name: 'literal "false" string', input: { archived: 'false' }, expect: ... }`. Instruction: rewrite `archived` with the preprocess pattern so the absent case parses to `false` and stays a boolean. The student feels the v4.4 throw, then fixes it. Wire `errorContains` on the failing fixture if the message is stable. Note for the builder: confirm the absent-key fixture (`input: {}`) drives the field to `undefined` through the iframe's `safeParse` — if the harness can't express an absent key, fall back to a `ZodPlaygroundCallout` with `values` including `{}`.

### The empty-string trap: optional numbers that become zero

**Goal:** Trap 2 — the silent-zero corruption on optional numerics.

Content:
- The footgun: `Number('')` is `0`, not `NaN`. An empty text/number input submits the empty string `''` (present but blank). `z.coerce.number()` on `''` produces `0` and passes any `.nonnegative()`/`.min(0)` check. A user who left an optional "discount" field blank just got a zero discount instead of "no value." The bug is invisible — the parse succeeds.
- When it's *not* a problem: a **required** number field with a sensible `.positive()` or `.min(1)` — there, blank should be an error anyway, and `0` failing `.positive()` surfaces it. State the boundary: `z.coerce.number()` is fine for required-positive fields; the trap is specifically optional numerics.
- The fix (matches code conventions): map empty to `undefined` *before* coercing. Two equivalent shapes, show both, recommend the first:
  - `z.preprocess(v => v === '' ? undefined : v, z.coerce.number().optional())` — preprocess strips the empty string, then optional-number handles the rest.
  - The L3 union/literal form for the explicit case: `z.union([z.literal('').transform(() => undefined), z.coerce.number()])`. Heavier; name it as the alternative when the empty-to-undefined intent should read at the value level.
- Senior framing: the schema is where "blank means absent" gets decided. Encoding it once in the schema means every consumer of the parsed value sees `number | undefined` and can't accidentally treat a blank as a zero.

Components: a `CodeVariants` — "Naive (`z.coerce.number().optional()`)" vs "Correct (`z.preprocess` empty→undefined)" — with prose in each pane naming the silent zero. A short `ZodCoding` or `ZodPlaygroundCallout` proving `{ discount: '' }` parses to `0` under the naive schema and to `undefined` under the fixed one; the fixture table makes the corruption visible.

### The date trap: invalid dates that pass

**Goal:** Trap 4 plus the `z.coerce.date()`-vs-`z.iso.datetime()` decision (L2 forward-pointed this here).

Content:
- The footgun: `z.coerce.date()` runs `new Date(input)`. `new Date('garbage')` returns an `Invalid Date` — still a `Date` *instance*, so it **passes** the "is this a Date?" check. `safeParse` succeeds and the action holds an `Invalid Date` that poisons every downstream `.getTime()`/format/DB-write. Prove this live (it's the most counterintuitive trap — a successful parse of garbage).
- Two clean fixes, chosen by where the value is next used (this is the L2-promised decision):
  - **`z.iso.datetime()`** — validates the *string format* (ISO 8601, with `Z`) and **fails cleanly** on a malformed string. Infers as `string`. The action receives a string; if the next stop is a `timestamptz` column, Drizzle converts on write — no JS `Date` needed. Reach for this when the date stays text until the database.
  - **`z.coerce.date()` guarded** — when downstream JS does date math/formatting, you want a real `Date`. Add `.refine(d => !isNaN(d.getTime()), { error: 'Invalid date' })` to reject the Invalid Date the coerce step let through. Or the L3 transform form `z.iso.datetime().transform(s => new Date(s))` — validate the string strictly, *then* construct the Date — which fails on bad input before the Date exists. Prefer this transform shape: it's the L3 canonical date exemplar and it can't produce an Invalid Date.
- State the rule crisply: **pick by where the date is next used.** Text-until-DB → `z.iso.datetime()`. JS date work → `z.iso.datetime().transform(s => new Date(s))` (strict) or guarded `z.coerce.date()`. Bare `z.coerce.date()` without a guard is the trap.

Components: a `TabbedContent` or `CodeVariants` with two tabs — "Stays a string → `z.iso.datetime()`" and "Needs a Date in JS → `z.iso.datetime().transform(...)`" — each with the schema and a one-line note on the downstream consumer. A `ZodCoding` fixture set proving the trap: `{ name: 'valid ISO', input: { issuedAt: '2026-01-15T00:00:00Z' }, expect: 'pass' }`, `{ name: 'garbage passes coerce.date (the bug)', input: { issuedAt: 'not-a-date' }, expect: 'fail' }` — with the starter using bare `z.coerce.date()` so the garbage fixture wrongly passes (row stays green when it should be red), and the task being to switch to the guarded/strict form so it correctly fails. This inverts the usual exercise (the student fixes a *false pass*, not a false fail) — call that out in the instruction; it's the sharpest way to feel why the trap is dangerous.

Terminology: `Term` on **Invalid Date** (a `Date` object whose internal time value is `NaN`; `new Date('garbage')` yields one — it is still `instanceof Date`).

### Validating uploaded files

**Goal:** the `File` seam — the only non-string value off a form. Scope tightly; the upload pipeline is Chapter 068.

Content:
- A file input on a `multipart/form-data` form makes `formData.get('avatar')` return a `File` instance. The validator at this seam is `z.instanceof(File)`.
- Constrain with refinements: `.refine(f => f.size <= MAX_BYTES, { error: 'File too large' })` and `.refine(f => ALLOWED_TYPES.includes(f.type), { error: 'Unsupported type' })`. Show a small `Code` block: a `z.instanceof(File)` with size and MIME-type refines, plus a `MAX_BYTES`/`ALLOWED_TYPES` const. Optional-file fields: `.optional()` (an empty file input yields a zero-byte `File` in some browsers — name the `f.size > 0` guard once for "actually uploaded").
- Scope fence, stated inline: this lesson validates the file's *shape* at the boundary. The full upload story — presigned URLs, R2, streaming — is Chapter 068. Here the file is just another field the schema checks before the action proceeds.
- Runtime note: `File` is a Web API global. Next.js 16 Server Actions and route handlers run on a runtime that provides it; the validation works server-side. Name this once so the student isn't surprised `File` exists outside the browser.

Components: one `Code` block. No exercise — the pattern is short and Chapter 068 owns the depth. `Term` on **MIME type** (the `type` string like `image/png` a `File` carries; named once).

### Putting the bridge together

**Goal:** consolidate into the one schema the student carries forward, and reinforce the four-trap reflex.

Content:
- Show the assembled `invoiceFormSchema` extended with the patterns from this lesson — coerced number, coerced/guarded date, the preprocess boolean for `archived`, an optional `notes`, and (if used) a `getAll`-fed `tags` array — as the canonical form-input schema. Use `AnnotatedCode` or a final `Code` block; this is the artifact the student reuses in Chapter 043/044.
- Restate the reflex as a short checklist the student can run against any form schema: *number off a form → `z.coerce.number()`, but optional numbers map empty→undefined first; boolean checkbox → `z.preprocess('on')`, never `z.coerce.boolean()`; date → `z.iso.datetime()` or strict transform, never bare `z.coerce.date()`; arrays → `getAll`, not `fromEntries`; file → `z.instanceof(File)` + size/type refines.* Present as prose or a `Checklist`/`Card`, not a new section.
- Forward-point once: the `safeParse` result's success/failure branches, the `Result` shape, and rendering field errors back to the form via `useActionState` are Chapter 043 (the action) and Chapter 044 (the form). This lesson built the schema; the next chapter wires it into the action.
- Optional: a small **`MultipleChoice`** or **`Buckets`** check — give the student five field descriptions (a required price, an optional quantity, an "archived" checkbox, a due date used for JS countdown math, a CSV upload) and have them pick/sort the correct Zod shape for each. Reinforces tool-selection, which is the lesson's real skill. `Buckets` (sort fields into "z.coerce.number / z.preprocess / z.iso.datetime+transform / z.instanceof(File)") fits well.

---

## Scope

**This lesson covers:** the FormData string-only contract; `Object.fromEntries(formData)` and `getAll` for arrays; `z.coerce` (number, date, bigint, string) as a named transform; the input/output type split made concrete; `z.preprocess` for the HTML checkbox shape; `z.stringbool()` named as the adjacent textual-boolean tool; the four traps (boolean truthiness + v4.4 undefined-throw, empty-string→zero, repeated-keys, invalid-date-passes) each with naive→fix; the `z.coerce.date()` vs `z.iso.datetime()` decision; `z.instanceof(File)` shape validation.

**Out of scope — already taught, redefine only in one line if needed:**
- Zod builders, formats, `.optional()`/`.nullish()` (L1, L2) — reuse, don't re-teach.
- `.transform`, `.refine`, `.overwrite`, `.pipe` and the checks model (L3) — `z.coerce` is framed as a named transform; reference L3, don't re-explain transforms from scratch.
- `z.input`/`z.output`/`z.infer`, `.pick`/`.omit`/`.partial` (L4) — the input/output split is *applied* here, taught there.
- `parse`/`safeParse`, `ZodError`, `z.treeifyError`, the unified `error` option (L5) — snippets use `safeParse` and `{ error }` as established; do not re-teach the error contract or the result shape.

**Out of scope — reserved for later, forward-point only:**
- Server Actions themselves: `'use server'`, the five-seam action body, the canonical `Result<T>`/`ok`/`err` shape (Chapter 043). Snippets stop at the `safeParse` call; do not write an action.
- `useActionState`, `<form action={...}>` wiring, rendering field errors / the `path` back to the form (Chapter 044). Mention as the destination, don't build it.
- File upload pipeline — presigned URLs, R2, streaming, progress (Chapter 068). This lesson does shape-validation only.
- `searchParams`/URL-boundary parsing and cursor encoding (Chapter 033, Chapter 038) — different boundary; out of scope, do not conflate with FormData.
- Timezone-correct date handling and the in-memory `Date` discipline (Chapter 083) — pick the coerce-vs-iso shape by usage site; do not open the timezone story.
- `drizzle-zod` generating the base schema these form rules refine on top of (L7) — name "the source is often generated" once if natural; L7 owns it.
- `zod-form-data` / `zfd.*` third-party helpers — deliberately **not** taught; the course hand-rolls the `Object.fromEntries` + `z.coerce`/`z.preprocess` patterns (minimum-viable stack). If the student meets `zfd` elsewhere, it's outside this course's chosen surface — do not introduce it.

---

## Notes for downstream agents

- **Pin Zod `4.4.3`** in every `ZodPlaygroundCallout` (`version="4.4.3"`) and assume that version in prose. The `z.coerce.boolean()`-throws-on-`undefined` behavior is **version-specific to ≥4.4** — state it as dated, since older docs/training data say it returns `false`.
- **`z.coerce` is L3's transform with a name** — lead every coerce explanation from there; do not present it as a novel primitive.
- **The lesson's value is the four traps, not the happy path.** Budget most words and every live widget on the naive→surprise→fix beats. The happy-path schema is three lines.
- **Two inverted exercises are intentional**: the boolean `ZodCoding` (a fixture goes red because of the v4.4 throw) and the date `ZodCoding` (a garbage fixture wrongly passes). Both ask the student to fix a *wrong* runtime behavior rather than complete a blank — call this out in each instruction; it's the pedagogical point.
- **Stop at `safeParse`.** Every snippet ends at `const parsed = schema.safeParse(Object.fromEntries(formData))`. No action body, no `'use server'`, no `Result` — those are Chapter 043.
- **Verbatim conventions to honor** (from Code conventions §Schemas with Zod 4): checkbox is `z.preprocess(v => v === 'on' || v === true, z.boolean())`; empty-string handling is explicit (`z.literal('').transform(() => undefined)` or the preprocess form); `z.coerce.boolean()` is banned for form data. Match these exactly.
