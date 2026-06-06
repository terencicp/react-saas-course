# Lesson outline — useFieldArray: dynamic lists of fields

- **Title (h1):** useFieldArray: dynamic lists of fields
- **Sidebar label:** useFieldArray

## Lesson framing

This is the fourth lesson of the React Hook Form chapter and the first of its two "production pattern" lessons (the wizard, L5, is the second). It installs the single highest-value RHF feature past the resolver: managing a variable-length set of repeated field rows. The dynamic-field-array trigger is one of the four from L1; this lesson is where that trigger gets its tool.

Brainstorm conclusions that apply lesson-wide:

- **Motivate by pain, not by API.** The student already knows the Ch 044 native pattern and (from L2/L3) the RHF primitives + resolver. The hook only earns its keep if the student first feels the bookkeeping it removes. Open by making them picture doing an invoice's line items the native way — indexed `name="lineItems[0].amount"` strings, a parallel `useState` array of row IDs for the add/remove UI, manual re-numbering after a delete, and a *second* parallel pile of work to render each row's error against the schema's array path. `useFieldArray` collapses all of that into one hook call. This is the "decisions before syntax" filter: the threshold (variable row count owned by one form) comes before the call shape.
- **One running example, extended from L2/L3.** Continuity locks this: the chapter's example is the `createInvoice` action with `InvoiceSchema` / `InvoiceInput` / `Invoice`, fields `customer` / `email` / `total`. This lesson *adds a `lineItems` array* to that same schema and the same `app/invoices/new-invoice-form.tsx` form file L2 created and L3 extended. Do not invent a fresh entity. The `total` field becomes derived-from-lines later in the lesson (the `useWatch` sum), which is a natural, motivated reason to add the array.
- **Honor the L2 layout divergence.** L2 deliberately diverged from the chapter outline: the canonical shadcn layer is the **`Field` family** (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`) used **directly with RHF's `Controller`** — NOT the legacy `<FormField>` / `<FormMessage>` wrapper the chapter outline still shows. Every code sample in this lesson MUST render rows with `Field` + `Controller` (or `register` for plain inputs) and per-row errors with `<FieldError errors={[fieldState.error]} />`. Where the chapter-outline L4 examples use `<FormField>` / `<FormMessage>`, translate them. Flag this as a deliberate divergence inline so downstream agents don't "correct" it back.
- **Reuse L3 artifacts verbatim.** The schema lives in the feature-owned `app/invoices/_lib/invoice-schema.ts` and is imported by both the action and the form (the "one schema, two importers" mental model). The `applyServerErrors(form, result)` helper is already defined in L3 — reuse it, do not redefine it. `useForm<InvoiceInput, unknown, Invoice>` (three generics) is the canonical typed shape from L3 — keep it. The `Result` shape is the full Ch043 contract: `{ ok: false, error: { code, userMessage, fieldErrors? } }` with `fieldErrors: Record<string, string[]>`.
- **Mental model to leave the student with:** `useFieldArray` owns *identity and ordering* for one array field; it does NOT own the row values (those live in the same `form` instance, read with `getValues`/`useWatch`, written with `register`/`Controller`). The `fields` array you map over is a *render-time snapshot keyed by `field.id`*, not the live value. RHF's `field.id` is a render key only; the entity's domain `id` is a separate schema field that decides insert-vs-update on the server.
- **The two non-obvious pain points to spend the most ink on** (where beginners get burned): (1) `key={field.id}` vs `key={index}` — index keys silently break focus, dirty state, and animations on remove/reorder; this is the canonical bug and deserves a dedicated visual. (2) per-row error access — the path `errors.lineItems?.[index]?.field?.message`, and that the *array-level* `.min(1)` error lands at a different path (`errors.lineItems?.root` / `errors.lineItems?.message`), not on any row. Both are the "only non-obvious parts" the chapter outline flags.
- **Stakes / production framing:** an invoice form that loses focus on every "remove line" click, or that silently drops a row the user deleted, or that fails to reconcile real DB IDs after save, is a real shipped-bug class. Frame the hook as the thing that makes the add/remove/reorder UX correct *and* makes the server-side insert/update/delete diff tractable.
- **Cognitive-load staging:** build complexity in layers. (1) the hook signature + the simplest append/remove render; (2) the keying correctness point (visual); (3) the schema shape + per-row + array-level errors; (4) live values via `useWatch` (the derived total); (5) reorder via `move` (+ optional dnd, named once); (6) the server-side diff (insert/update/delete) and `replace` reconciliation. Each layer is independently runnable.
- **Active practice:** one `ReactCoding` exercise where the student wires `append`/`remove` + `key={field.id}` correctly is the highest-value check (the keying bug is invisible in prose, visible when you click remove). A `Sequence` drill on the server-side save order, and a `Dropdowns` fill-in on the per-row error path, consolidate the two trickiest recall points. No StackBlitz/sandbox — guided beats open here.

## Lesson sections

### Introduction (no header)

State the goal in two or three warm sentences: when a form owns a *variable-length* set of repeated rows — invoice line items, survey questions, a permissions matrix — `useFieldArray` is the RHF hook that manages the list. Connect back: this is the dynamic-field-array trigger from L1 finally getting its tool, and it sits on top of the `useForm` + resolver setup from L2/L3. Preview the concrete artifact: by the end, the running invoice form has an add/remove line-items section whose total is derived from the rows, validates per-row and "at least one line," and saves through the same `createInvoice` action via an insert/update/delete diff. Keep it brief; the motivation deepens in the next section.

### What the native pattern costs for a variable-length list

The "feel the pain first" section — short, concrete, no new API yet. Picture doing line items the Ch 044 native way and enumerate the four piles of bookkeeping the native pattern forces:

1. Indexed `name` strings (`lineItems[0].amount`, `lineItems[1].amount`, …) generated from a count.
2. A parallel `useState` array of row keys just to drive the add/remove UI and React keys.
3. Manual re-indexing/renumbering when a middle row is removed.
4. A second parallel effort to render each row's validation error against the schema's array path.

Land the thesis line: that's four bookkeeping jobs for one conceptual thing — "a list of rows." `useFieldArray` is the canonical reach because it owns all four. Keep the trust-boundary thread alive in one sentence: the hook is a *client* convenience; the action still `safeParse`s the array on entry — adopting `useFieldArray` does not move the trust boundary (recurring chapter invariant).

Tie to the running example: the invoice from L2/L3 had scalar fields only; a real invoice has N lines. We are extending that exact form.

Component: prose + one small `Code` block showing the native indexed-`name` sketch (3-4 lines, deliberately a little ugly) so the contrast is visible, not just asserted. Mark it as the "before" — not the pattern we'll write.

### The hook: fields, append, remove, move, and the rest

Teach the signature and the imperative API. This is the mechanics core.

- The call: `const { fields, append, prepend, insert, remove, swap, move, update, replace } = useFieldArray({ control: form.control, name: 'lineItems' });`. It reads from the same `form` the page already created (L2) via `control` — it does NOT create a new form. Name must be the array field's path in the schema.
- `fields` is the array RHF tracks; each entry carries a stable RHF-assigned `id` plus the row's default values. Stress: `fields` is a *render-time snapshot*, not the live values (forward-reference the `useWatch` section for live reads — pay it there).
- The operations as an imperative API the student calls from event handlers: `append(fullDefaultRow)`, `remove(index)`, `move(from, to)`, `insert`, `prepend`, `swap`, `update`, `replace`. RHF handles re-indexing and field-state migration internally — that's the bookkeeping pile #3 gone.
- The critical `append` rule: pass the **full default shape**, every field the schema requires (`append({ description: '', amount: 0 })`), never `append({})`. An empty object leaves required inputs rendering as uncontrolled and trips the uncontrolled→controlled warning — this is the same `defaultValues` discipline from L2 applied per-row. Name it here; it recurs in watch-outs.

Component: `AnnotatedCode` on the destructuring + the `useFieldArray` call, 3-4 steps — (1) the destructure naming the operations the lesson uses, color blue; (2) `control: form.control` + `name` tying it to the existing form, color green; (3) `fields` is a keyed snapshot not live values, color orange; (4) `append` takes a full default row, color violet. Keep each step ≤6 lines per the component constraint.

Optional `CodeTooltips` on the operation names in a one-line summary block (`append`/`prepend`/`insert`/`remove`/`swap`/`move`/`replace`) — short inline "what each does" without a prose detour. Only if it doesn't duplicate the AnnotatedCode; prefer one or the other.

### Rendering rows, and why the key must be field.id

The rendering pattern plus the canonical keying bug — the highest-value correctness point in the lesson, so it gets a dedicated visual.

- The canonical render shape (translated to the `Field` + `Controller` layer from L2):
  - Map `fields` to a row element keyed `key={field.id}`.
  - Each row renders its inputs via `Controller` (for any UI-library input) or `register` (plain text/number) at the path `lineItems.${index}.description` / `lineItems.${index}.amount`, wrapped in `Field` / `FieldLabel` / `FieldError`.
  - A "Remove" `<Button>` per row calling `remove(index)`.
  - An "Add line" `<Button>` below the list calling `append({ description: '', amount: 0 })`.
- The keying point, taught as a bug-then-fix: `key={index}` *looks* fine until you remove a non-last row. React's index-keyed reconciliation then re-associates DOM nodes to the wrong rows — the focused input jumps, half-typed text lands on the wrong line, dirty/touched flags migrate, enter/exit animations fire on the wrong node. `key={field.id}` ties the key to row *identity*, which is exactly what `field.id` exists for. Connect to the code-conventions rule the student has met before: "Lists need a stable key tied to data identity. Never the array index for reorderable lists." This is that rule with teeth.

Components:
- `CodeVariants` for the bug/fix: tab "key={index} — breaks on remove" (`del`-marked key line) vs "key={field.id} — correct" (`ins`-marked). One-paragraph prose each per the component's six-line limit, the failure named in the first sentence.
- A `RenderTracking` or `DiagramSequence` to *show* the breakage visually. Prefer **`DiagramSequence`**: a 3-4 frame scrub showing three rows A/B/C, the user removes row B, and under `key={index}` the focus ring + entered text visibly slide from row C onto the now-shifted row, while under `key={field.id}` they stay put. This is a focus/identity bug, not a render-count bug, so `DiagramSequence` (arbitrary content per frame) fits better than `RenderTracking` (render-count badges). If a side-by-side is cleaner, wrap two mini-diagrams in `TabbedContent` (index vs id). Pedagogical goal: make an invisible-in-prose bug viscerally obvious so the keying rule sticks.

### The Zod array schema and reading per-row errors

The schema shape that pairs with the hook, and the error-access paths — the second non-obvious teaching point, per the chapter outline. Reuse the L3 schema file.

- Extend `InvoiceSchema` in `app/invoices/_lib/invoice-schema.ts` with a `lineItems` array:
  - `lineItems: z.array(z.object({ id: z.uuid().optional(), description: z.string().min(1, '...'), amount: z.coerce.number<number>().positive('...') })).min(1, 'Add at least one line')`.
  - Use Zod 4 conventions from code standards: top-level `z.uuid()` (not `z.string().uuid()`), and `z.coerce.number<number>()` (the L3 generic-pinned coercion so `defaultValues: { amount: 0 }` and the registered number input type-check; bare `z.coerce.number()` input is `unknown`).
  - The `id` is `.optional()` and is the domain ID — present means "existing row," absent means "new row." This is the hinge for the server diff later; plant it here.
- Error access — two distinct paths, both named explicitly because both are footguns:
  - **Per-row field error:** `form.formState.errors.lineItems?.[index]?.description?.message`. The `<FieldError errors={[fieldState.error]} />` inside each row's `Controller` renders it automatically because `fieldState` is scoped to that row's registered path — the student rarely reads the raw path, but must recognize its shape.
  - **Array-level error** (the `.min(1)` "add at least one line"): this does NOT attach to any row, and it is NOT at `errors.lineItems.message`. It lands at **`errors.lineItems?.root?.message`** — the `root` slot is specifically where array-level (whole-array) validation errors live. Render it once, above or below the list, as the list's own error row. Beginners look for it on row 0 (or at `errors.lineItems.message`) and miss it — call this out directly with the exact `root` path.
- Keep the trust-boundary line: these are the resolver's client-side reads of the *same* schema the action parses; the rules live once in the schema file (one-schema-two-importers from L3).

Components:
- `CodeVariants` or `Code` for the schema extension, with `ins=` marking the new `lineItems` block against the L3 schema.
- `Dropdowns` consolidation: a small fenced block with `___` blanks for the two error paths — student picks `[index]`, `.root`, `.message`, `?.` pieces from selects. Tests the exact recall that prose washes over. (Per component doc, fenced-block + `answers` mode.)
- `Term` on the array-error term if a short tooltip helps (e.g., "root error").

### The live total: useWatch over the array

Why `fields` isn't the live value, and the correct way to derive UI from the current array contents — motivated by making the invoice's `total` the sum of line amounts.

- Restate the snapshot point and resolve it: `fields` is the array at render time; to read the *current* values use `form.getValues('lineItems')` (imperative, one-shot, no re-render) or `useWatch({ control: form.control, name: 'lineItems' })` (subscribes, re-renders on change). For a live-updating total you want the subscription.
- The canonical move from L2: put `useWatch` **in a small leaf component** (e.g. `<InvoiceTotal control={form.control} />`) that renders just the total, so the whole form root doesn't re-render on every amount keystroke. Reuse L2's verbatim mental model: "scope the subscription, don't memoize the tree" (React Compiler is on; this is a subscription-scope lever, not a `useMemo`). This is the same `useWatch`-in-a-leaf pattern L2 established — call back to it explicitly.
- Compute the sum from the watched array; render it read-only. Note the watched value is the **input** type (strings for number inputs pre-coercion in some configs) — coerce/guard when summing, or rely on the schema's coercion on submit; keep the display defensive (`Number(row.amount) || 0`). Tie to L3's `z.input` vs `z.output` "track this, transform, receive that."

Component: `AnnotatedCode` on the `<InvoiceTotal>` leaf — steps highlighting (1) `useWatch` scoped to this child, (2) the sum reduce with the defensive coercion, (3) the read-only render. Optionally a tiny `RenderTracking` reusing L2's framing to show only the leaf re-renders on a row edit, not the whole form — but only if it doesn't bloat the lesson; L2 already taught this, so a one-line callback may suffice.

### Reordering rows with move

Short section: when row order is meaningful (line order on the printed invoice, task priority), `move(from, to)` reorders and RHF re-indexes the field state for you — no manual array splice, no key churn (because keys are `field.id`, the reorder animates correctly, tying back to the keying section).

- The simplest reorder UI: up/down buttons per row calling `move(index, index - 1)` / `move(index, index + 1)` (guard the bounds). This needs no extra dependency and is the honest default for "occasionally reorder a handful of rows."
- Drag-to-reorder, named once (per chapter outline "named once, optional"): for true drag-and-drop pair `move(from, to)` with a drag-and-drop library — the 2026 reach is `@dnd-kit` (its modern `@dnd-kit/react` entry; `pragmatic-drag-and-drop` is the bundle-leaner alternative). The shape: the DnD lib fires an `onDragEnd` with source/target indices, the handler calls `move(from, to)`, RHF re-renders the new order. Do not write the full dnd integration — name the seam (`onDragEnd → move`) in two or three sentences and move on. An `ExternalResource`/`LinkCard` to the RHF `useFieldArray` docs' drag example is the right depth.

Component: a `Code` block for the up/down `move` buttons (the thing we actually ship). The dnd mention stays prose + one external link card.

### Saving the array: the insert/update/delete diff

The server side — how the action turns "the form's current list" into the right database writes. This is where the `id?` schema field pays off and where the senior framing (the form owns the row set; the action reconciles) lands.

- The call shape, from L3: because RHF is the only caller of this path and it already holds the typed object, the form's `onSubmit(values)` calls `await createInvoice(values)` with the typed payload; the action's first line is still `InvoiceSchema.safeParse(input)`. (Caveat the continuity reality in one line: the Ch 047 *project* keeps `FormData` because it's deliberately native-pattern; this lesson's RHF form is the documented typed-object caller. Reference L3's decision, don't relitigate it.)
- The diff the action computes, taught as a three-way split on `id`:
  - Rows with **no `id`** → INSERT (new lines the user appended).
  - Rows **with an `id`** → UPDATE (existing lines edited in place).
  - DB rows **whose `id` is absent from the submitted list** → DELETE (lines the user removed locally with `remove(index)`).
  The form's submitted list is the new source of truth; the action loads the current line IDs, computes the set difference, and applies all three.
- Wrap the multi-row writes in `db.transaction(async (tx) => …)` — more than one row changes, so the transaction is mandatory (code-standards rule; the full transaction mechanics were taught in Ch 039, so reference, don't re-teach). External calls stay outside the transaction (named once, no detail).
- After success, reconcile the form to server truth: the action returns the canonical line list *with real DB IDs*; the form calls `replace(result.data.lineItems)` to swap the whole array at once (cheaper than `form.reset()` when only the array changed, and it stamps the new rows with their persisted `id`s so a subsequent save diffs correctly). This closes the loop: append created an `id`-less row → server inserted it and returned an `id` → `replace` writes that `id` back into the form.
- Server-pushed per-row errors: if the action returns `fieldErrors` keyed by an array path (e.g. a business rule the client can't check), reuse L3's `applyServerErrors(form, result)` — it `setError`s each path and the existing `<FieldError>` rows render them. Note that array-path keys in `fieldErrors` must match RHF's dotted path shape (`lineItems.0.amount`); name this as the one wiring subtlety.

Components:
- `AnnotatedCode` on the action body's diff: steps for (1) `safeParse` first, (2) load current IDs, (3) the three-way split (INSERT/UPDATE/DELETE), (4) `revalidateTag`/return `Result` after the write. Keep DB calls schematic; this is about the *shape* of the diff, not Drizzle depth.
- `Sequence` drill: order the save lifecycle — parse → load current IDs → diff into insert/update/delete → write in a transaction → revalidate → return Result → form calls `replace` with returned IDs. Reinforces the reconciliation loop, which is the section's hardest idea.

### When the array is the wrong shape

The ceiling — keep the student from over-stretching the pattern (chapter outline: "name the ceiling"). Two or three sentences:

- RHF's per-field re-render isolation means a 50-row array stays smooth — the edited row re-renders, the rest don't (callback to L2's isolation model). But past a few hundred rows a single client form is the wrong shape: it ships every row to the client, holds it all in memory, and submits it as one payload. The senior reach there is a paginated list or a bulk-edit table with row-level saves — a Unit-16-level UI pattern, not a `useFieldArray`. Name the threshold so the student recognizes the cliff; don't teach the alternative here.

Component: a single `Aside` (note) is enough; no diagram.

### Practice (distributed, not a trailing section)

Per pedagogy, exercises live where the concept is taught, not bundled at the end. The plan places them inline as noted above; this entry just records the full set and the one custom-graded build:

- **`ReactCoding` (in "Rendering rows…" section), tests-graded — the keying + append/remove wiring.** Highest-value check. Starter: an `App` exporting a minimal line-items list with `useFieldArray` already set up but the row `key` set to `index` and the "Add" button calling `append({})`. Instructions: fix the row key to `field.id` and pass the full default row to `append`. To keep it self-contained in the iframe (no RHF resolver/shadcn deps required), the starter imports `react-hook-form` only and uses plain `<input>`s — drop the `Field`/Zod layer for the exercise sandbox (note this simplification inline so it's not mistaken for the lesson's canonical shape). Tests (DOM-based, per `ReactCoding` assertion surface): after clicking "Add" twice then typing into row 0 and removing row 1, row 0's value is preserved (proves identity keying) and two rows render with non-empty default inputs (proves full-default append). Write assertions whose *names* communicate the failure, since diagnostic text is hidden from the student. If RHF won't reliably boot in the esbuild-wasm iframe, fall back to `Dropdowns` choosing `field.id` vs `index` and `{ description: '', amount: 0 }` vs `{}`.
- **`Dropdowns` (in "The Zod array schema…" section)** — the two error-access paths.
- **`Sequence` (in "Saving the array…" section)** — the save/reconcile lifecycle order.

### External resources (optional closing LinkCards)

`ExternalResource` cards: RHF `useFieldArray` API doc (the canonical reference + its drag example), and optionally the RHF "field array" advanced guide. Keep to one or two; the lesson is self-contained.

## Terms for Tooltip treatment

Be strategic — only terms that support this lesson's goals and that the student may not hold precisely:

- **`field.id`** — RHF-assigned render key, stable across reorders, distinct from the domain ID; not persisted. (The lesson's central distinction; worth a tooltip at first use even though it's also taught in prose.)
- **root error** (array-level error) — the error attached to the array itself (`errors.lineItems.root`), not to any element, produced by array-level rules like `.min(1)`.
- **reconcile / diff** — computing INSERT/UPDATE/DELETE by comparing the submitted list against the current DB rows; the action's job after parse.

Do NOT re-tooltip terms L1-L3 already defined (trust boundary, controlled component, resolver, `z.input`/`z.output`, proxy/progressive enhancement) — reference them as known.

## Scope

**Prerequisites to redefine only in one line each (taught earlier, do not re-teach):**

- `useForm` / `register` / `Controller` / `handleSubmit` / `formState` / `useWatch` — L2. This lesson *uses* them; it teaches only the field-array delta.
- `zodResolver`, the one-schema-two-importers discipline, `z.input`/`z.output`, `useForm<InvoiceInput, unknown, Invoice>`, `applyServerErrors`, `setError` vs `setValue` — L3. Reuse, don't re-explain.
- The shadcn `Field` family + `Controller` layout layer — L2 (the deliberate divergence). Use as canonical; don't re-teach the family.
- The five-seam Server Action shape (parse→authorize→mutate→revalidate→return), `Result`, `safeParse`-first — Ch 043. Reference only.
- `db.transaction` mechanics, threading `tx`, external-calls-outside — Ch 039. Reference only; this lesson shows the diff *shape*, not transaction internals.
- The trust-boundary invariant and the four triggers — L1. One-line callbacks only.

**Explicitly out of scope (belongs elsewhere):**

- `FormProvider` / `useFormContext` and multi-step wizards — **L5** (the chapter's final lesson). If a wizard needs an array inside a step, that's L5's composition; don't preview it.
- Full drag-and-drop implementation — named once with the `onDragEnd → move` seam and one external link; no dnd-kit tutorial.
- The async `.refine()` → route-handler live-uniqueness path — Ch 046 owns it; not even named here unless a one-liner is natural (prefer omitting).
- Cross-row aggregate validation beyond the simple case — if shown at all, a single top-level `.refine()` on the array with explicit `path` (resolvers can drop field-array errors reported via `superRefine` depending on order — prefer `.refine` with `path`); keep it to one named example (the positive-total rule is already covered by per-row `.positive()`, so only show a cross-row refine if it adds real value, else omit).
- Drizzle query depth, tenant scoping (`tenantDb`), `revalidateTag` tag-helper specifics — referenced as known/forthcoming, not taught.
- Paginated list / bulk-edit table as the large-N alternative — named as the ceiling, not taught (Unit 16 territory).
- The `<FormField>` / `<FormMessage>` legacy shadcn wrapper — superseded by L2's `Field` family; do not use.

## Notes for downstream agents

- **Deliberate divergences to preserve (do not "fix"):** (1) `Field` + `Controller` layout, never legacy `<FormField>`/`<FormMessage>` (inherited from L2). (2) The `ReactCoding` exercise deliberately drops the Zod/shadcn layer for iframe self-containment — that simpler shape is exercise-only, not the canonical lesson shape. (3) Generics on displayed helper signatures may be simplified for legibility (L3 precedent) — not a strict-typing violation.
- **Canonical artifacts to extend, not recreate:** `app/invoices/_lib/invoice-schema.ts` (add `lineItems`), `app/invoices/new-invoice-form.tsx` (add the array section + `<InvoiceTotal>` leaf), `createInvoice` action (add the diff), `applyServerErrors` (reuse as-is).
- **Verified against current docs (June 2026):** `useFieldArray` returns `{ fields, append, prepend, insert, remove, swap, move, update, replace }`; `field.id` is the required React key (never index); `append` needs the full default object; per-row error path is `errors.<name>?.[index]?.<field>?.message`; array-level `.min` error lands at `errors.<name>?.root?.message` (the `root` slot specifically — NOT `errors.<name>.message`). Field-array errors reported via `superRefine` can be position-sensitive (resolvers issues #605/#672) — prefer top-level `.refine` with explicit `path`.
