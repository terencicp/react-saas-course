# Chapter 045 — React Hook Form

## Lesson 1 — The four triggers that flip the choice

**Taught** — A decision/gate lesson installing *when* to abandon the Ch 044 native form pattern for RHF: the four triggers (validation timing past submit, dynamic field arrays, multi-step wizards spanning components, controlled UI-library inputs), the cost of adopting RHF, the trust-boundary invariant, and the 2026 form-library landscape — no RHF API taught beyond naming the feature per trigger.

**Debts** (forward-references later lessons must honor):
- L2 owns: the submit-seam mechanics (`useForm`, `handleSubmit`, `onSubmit` calling the action as a plain function), `mode`, `Controller`/`useController`, inputs-become-controlled mechanics, shadcn `<Form>` consuming the RHF instance.
- L3 owns: the resolver and the "one schema feeds both client and server" wiring (named as "the resolver lesson").
- L4 owns: `useFieldArray`.
- L5 owns: `FormProvider`/`useFormContext` (the chapter's final lesson).
- Stated in lesson: `mode` wired in L2, resolver in L3.

**Terminology / mental models** established here that later lessons must reuse verbatim:
- **The four triggers** as a *disjunction (OR), not a checklist* — any one fires the reach; otherwise native is the default ("reflex: native by default, RHF when a trigger fires").
- **Trust boundary** (Term-defined) — adopting RHF does NOT move it; client validation is for the user, server `safeParse` is for the system; "any architecture that validates only in RHF and skips the action's `safeParse` has the wrong trust boundary." Server Action's five-seam shape (parse→authorize→mutate→revalidate→return `Result`) is unchanged. Recurs every lesson.
- **The submit changes hands** — native `<form action={createInvoice}>` → RHF `<form onSubmit={form.handleSubmit(onSubmit)}>`, action called as a plain function from inside `onSubmit` and is *unchanged*. The submit-seam snippet is deliberately minimal/under-explained (staged for L2).
- **Controlled component** (Term-defined) — value owned by React state via `value`/`onChange`, not the DOM.
- **Progressive enhancement** (PE) degrades under RHF — accepted because triggered forms live behind login on JS-on surfaces; **Conform** named as the reach when PE is non-negotiable (public/legal/marketing forms); **TanStack Form** named for bundle size + TS inference. Both out of scope.

**Misc.**
- Establishes Ch 047 project is deliberately native-pattern to anchor the default — later RHF lessons should not assume the project uses RHF.
- Components used: `StateMachineWalker` (decision-walk centerpiece), `CodeVariants` (submit seam), a Mermaid `sequenceDiagram` for the trust boundary, `MultipleChoice` + `Buckets` for the formative check.

## Lesson 2 — The five primitives: useForm, register, Controller, handleSubmit, formState

**Taught** — RHF's core surface organized as **three concerns → five primitives**: `useForm` (container, called once, produces all the rest), `register` (uncontrolled/native path, DOM owns the value), `Controller`/`useController` (controlled bridge for UI-library inputs), `handleSubmit` (intercept→validate→hand typed values to `onSubmit`), `formState` (read side: `errors`/`isSubmitting`/`isDirty`); plus `watch`/`useWatch`, `defaultValues`/`reset`, and the shadcn `Field` layout layer. The resolver appears only as `zodResolver(InvoiceSchema)` marked "wired next lesson."

**Cut** — Nothing of consequence dropped from the outline; the optional `register`-inside-`Field` variant and the optional `TabbedContent` two-paths diagram were not shipped (recognition-only material, no later dependency).

**Debts** (forward-references later lessons must honor):
- L3 owns: full resolver wiring, `z.input` vs `z.output` typing, `mode` vs `reValidateMode`, and mapping `result.error.fieldErrors` back via `setError`/`applyServerErrors`. In L2 these are literal code comments (`// wired next lesson`, `// map result.error.fieldErrors back into the form — next lesson`).
- L4 owns: `useFieldArray`. L5 owns: `FormProvider`/`useFormContext`, wizards.
- The canonical skeleton file `app/invoices/new-invoice-form.tsx` is the artifact L3/L4/L5 all extend.

**Terminology / mental models** later lessons must reuse verbatim:
- **Three concerns, five primitives** — (1) get values in & track, (2) submit, (3) read state out. The spine; reuse this framing.
- **`register` is the default; `Controller` is the bridge** — native input → `register` (DOM owns value, no per-keystroke re-render); value-owning component (`value`/`onChange`, no native `<input name>`) → `Controller`/`useController`. Overreaching `Controller` onto plain inputs = needless re-renders.
- **`Controller` render prop hands `{ field, fieldState }`** — `field` = `{ value, onChange, onBlur, name, ref }` spread onto the control; `fieldState` (Term-defined) = `{ invalid, error, isDirty, isTouched }` for that one field.
- **`field.name`** sources both `FieldLabel htmlFor` and input `id` (a11y floor).
- **`formState` is a proxy** (Term) — reading a property subscribes you to it; destructure only what's used; keep `watch`/`formState` reads OUT of the form root, push into leaves.
- **`useWatch({ control, name })` in a leaf child** is the re-render-scope lever, NOT `useMemo` (React Compiler is on) — "scope the subscription, don't memoize the tree."
- **Pending read changed**: RHF form uses `form.formState.isSubmitting`, NOT Ch 044's `useFormStatus().pending`/`<SubmitButton>` (which belong to the native `action`-prop form). Different owner of the submit.

**Patterns and best practices** (for the Ch 047 project if/when it uses RHF):
- `useForm<InvoiceInput>({ resolver, defaultValues, mode: 'onBlur' })` — `'onBlur'` is the canonical default; `defaultValues` non-optional in practice (every field, even `''`/`0`) to avoid uncontrolled→controlled warning.
- Spread `register` **last** (after any manual `onChange`) so RHF's handler wins.
- Call `reset(values)` **after** the `await`, on the success branch — never before.
- Edit-form prefill: Server Component fetches the entity and passes it as a prop; `defaultValues` reads from the prop (no client fetch).
- shadcn layout: `Controller` + `Field`/`FieldLabel`/`FieldError`/`Input` from `@/components/ui/*`; `data-invalid`/`aria-invalid` from `fieldState.invalid`; `<FieldError errors={[fieldState.error]} />` takes an **array**.

**Misc.**
- **DELIBERATE OUTLINE DIVERGENCE — shadcn layout layer.** The chapter outline and L1 reference shadcn's legacy `<Form>`/`<FormField>`/`<FormItem>`/`<FormMessage>` wrapper. L2 teaches shadcn's **current `Field` family** (`Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldGroup`/`FieldSet`/`FieldLegend`) used **directly with RHF's `Controller`** as canonical — the legacy `<Form>` wrapper is named once as "still works, no longer the recommended start." **Later lessons (L3/L4/L5) and the project MUST use `Field` + `Controller`, NOT `<FormField>`/`<FormMessage>`.** `FieldGroup`/`FieldSet`/`FieldLegend` are the `<FormItem>`/grouping successors. (L4's per-row error rendering and L5's wizard fields must follow this, replacing the outline's `<FormField>` examples.)
- Running example unchanged from L1: `createInvoice` action, `InvoiceSchema`/`InvoiceInput` type, fields `customer`/`email`/`total` (`InvoiceSchema`/`InvoiceInput` kept over strict camelCase convention for continuity).
- Components used: `Figure` (primitive map), `AnnotatedCode` (useForm anatomy, Field anatomy), `CodeTooltips` (`mode` options), `CodeVariants` (spread-order bug, reset-ordering bug), `DiagramSequence` (handleSubmit flow), `RenderTracking` (register vs watch re-render — highest-value visual), `Dropdowns` (register/handleSubmit wiring — the outline's `ReactCoding` fallback was shipped, not a live RHF-in-iframe exercise), `Matching` + `MultipleChoice` (consolidation).

## Lesson 3 — zodResolver: one schema, both sides of the wire

**Taught** — Wires `@hookform/resolvers/zod` so the form and the action validate against one shared `InvoiceSchema`: the resolver model (RHF's single validation source), three-line wiring (install/import/pass), the one-schema-two-importers discipline, the `z.input` vs `z.output` type bridge with the three-generic `useForm`, the typed-object vs `FormData` call-shape decision, mapping `result.error.fieldErrors` back via `setError`/`applyServerErrors`, `mode` vs `reValidateMode`, and async `.refine` named-only.

**Cut** — `.partial()` for edit-vs-create schemas (chapter-outline watch-out) not covered; deferred implicitly to wherever edit forms land. The TSPlaygroundCallout and the `register`-only schema-rules anti-pattern stayed at named/recognition level.

**Debts** (forward-references later lessons must honor):
- L4 owns `useFieldArray`; L5 owns `FormProvider`/`useFormContext`/wizards.
- Ch046 (route handlers) owns the async-`.refine` → route-handler live-uniqueness path; named here as "the door exists," not opened.
- `applyServerErrors(form, result)` helper is now defined (the L2 forward-reference is paid); L4/L5 reuse it as-is.

**Terminology / mental models** later lessons must reuse verbatim:
- **resolver** (Term) — the `(values) => { values, errors }` function RHF calls to validate; `zodResolver(schema)` is the Zod adapter from `@hookform/resolvers/zod` (separate package). "The resolver is the form's only validation source" — no `register` rules, no hand-written `setError` for shape rules.
- **One schema, two importers** — the schema lives in one shared module (`app/invoices/_lib/invoice-schema.ts`); the action and the form both `import { InvoiceSchema }` from it, character-for-character. A PR adding form-component validation not in the schema is rejected.
- **The type bridge** — `z.input`/`z.output` (Terms): RHF *tracks* the input type (`defaultValues`, `register`, `field.value`), `onSubmit` *receives* the output type. Mental model: *track this, transform, receive that.* `useForm<InvoiceInput, unknown, Invoice>` — three generics (track / context / transformed). `useForm<z.infer<...>>` is the "looks fine until a transform" footgun (z.infer = output, mistypes what register tracks).
- **`z.coerce.number<number>()`** — Zod 4 generic pins the coercion's input type to `number` (bare `z.coerce.number()` input is `unknown`), so `defaultValues: { total: 0 }` and the registered number field type-check cleanly; output stays `number`.
- **`setError` vs `setValue`** — server-pushed errors use `form.setError(name, { message })` (writes to `formState.errors`, same place the resolver writes, rendered by the existing `<FieldError>` row). NOT `setValue(..., { shouldValidate: true })` — that re-runs the resolver and clobbers the server message. `setError` on an unregistered name is a silent no-op (safe by construction since all keys derive from the one schema).
- **`mode` vs `reValidateMode`** — `mode` = when a field is *first* validated (course default `'onBlur'`); `reValidateMode` = when it re-validates *after* erroring (default `'onChange'`). Canonical pairing = validate-on-blur, fix-as-you-type.

**Patterns and best practices** (for the Ch 047 project if/when RHF is used):
- Schema in a feature-owned `_lib/invoice-schema.ts`, exporting `InvoiceSchema` + `InvoiceInput` (`z.input`) + `Invoice` (`z.output`); both action and form import it.
- `useForm<InvoiceInput, unknown, Invoice>` is the canonical typed shape once a resolver lands — explicit input/output, never `z.infer`. (Upgrades L2's single-generic `useForm<InvoiceInput>`.)
- Action signature stays `safeParse`-first regardless of call shape; typed object (`createInvoice(input: Invoice)`) is the default when RHF is the only caller; keep `FormData` (`safeParse(Object.fromEntries(formData))`) only when a non-RHF caller hits the same endpoint.
- `applyServerErrors(form, result)` loops `result.error.fieldErrors`, reads `messages[0]`, `setError`s each — one helper, every form.
- Success branch: `if (result.ok) { form.reset(values); return; }` (the L2 reset move).

**Misc.**
- **The Ch 047 project keeps `FormData`** (deliberately native-pattern, per L1) — so an RHF form calling that same `createInvoice` is the documented multi-caller / `FormData`-keeping case, not hypothetical. Later lessons calling the project's action should expect the `FormData` signature.
- **`Result` shape used:** `{ ok: false, error: { code, userMessage, fieldErrors? } }` with `fieldErrors` a flat `Record<string, string[]>` — the full Ch043 contract, not the chapter-outline's `code`-less shorthand.
- **Versioning note for downstream:** documented `@hookform/resolvers` type-inference churn with Zod 4 transforms (resolvers issues #743 / discussions #10861, #13205) — the explicit three-generic form is the stable workaround; build agent may need `as FieldPath<>` casts. Generics on `UseFormReturn`/`applyServerErrors` in displayed code are deliberately simplified for legibility — do not flag as strict-typing violations.
- Components used: `Aside` (caution: resolver only runs schema rules; note: closes-the-loop), `Steps` (install/import/pass), `Term` (resolver, input, output), `CodeVariants` (one-schema-three-files, typed-vs-FormData call), `AnnotatedCode` (type-bridge generics, applyServerErrors), `CodeTooltips` (mode vs reValidateMode), `TSPlaygroundCallout` (optional input-vs-output), `VideoCallout` (Jan Marshal, the BEST way to handle form validation in Next.js), `MultipleChoice` (trust-boundary delete-safeParse), `Dropdowns` (input/output blanks).

## Lesson 4 — useFieldArray: dynamic lists of fields

**Taught** — Adds a variable-length `lineItems` array to the running invoice form via `useFieldArray({ control, name })`: the operations (`append`/`prepend`/`insert`/`remove`/`swap`/`move`/`replace`), the `key={field.id}` vs `key={index}` correctness bug, the Zod `z.array(z.object(...)).min(1)` schema shape with its two error paths, a derived live total via scoped `useWatch` in an `<InvoiceTotal>` leaf, reordering with `move` (+ `@dnd-kit` named once), and the action-side INSERT/UPDATE/DELETE diff keyed on the domain `id` inside one `db.transaction`, with `replace` reconciling the form to server-returned IDs.

**Cut** — Cross-row aggregate `.refine` validation (chapter-outline named a positive-total array refine) omitted — per-row `.positive()` plus the derived `<InvoiceTotal>` cover the need; if a later lesson needs array-level `.refine`, note resolvers can drop `superRefine`-reported field-array errors (prefer top-level `.refine` with explicit `path`). `update`/`prepend`/`insert`/`swap` listed in `CodeTooltips` but only `append`/`remove`/`move`/`replace` taught with code.

**Debts** (forward-references later lessons must honor):
- L5 owns `FormProvider`/`useFormContext`/wizards; if a wizard step holds an array that's L5's composition, not previewed here.
- Ch046 (route handlers) owns async live-uniqueness; not named here. Unit-16 list/bulk-edit table is named as the large-N ceiling past `useFieldArray` (a few hundred rows), not taught.
- Reuses verbatim: `app/invoices/_lib/invoice-schema.ts` (now extended with `lineItems`), `app/invoices/new-invoice-form.tsx`, `applyServerErrors(form, result)` (works for array paths too), `useForm<InvoiceInput, unknown, Invoice>`, the `Result` contract.

**Terminology / mental models** later lessons must reuse verbatim:
- **`useFieldArray` owns identity and ordering, NOT values** — values live in the same `form` instance (read via `useWatch`/`getValues`, written via `register`/`Controller`); the hook reads/writes the existing form via `control`, does not create a new form.
- **`fields` is a render-time snapshot, not the live value** — map it to render rows; to read current values use `getValues('lineItems')` (one-shot, no subscribe) or `useWatch({ control, name })` (subscribes). The snapshot's amounts are frozen at last render.
- **`field.id` (Term) vs domain `id`** — `field.id` is RHF's render key, stable across reorder/removal, never persisted; the row's `id: z.uuid().optional()` is the *domain* PK that decides INSERT (absent) vs UPDATE (present). The two `id`s are the lesson's central distinction. Two `field`s in the row map: outer (array row, carries `id`) vs inner (`Controller`'s render-prop bundle).
- **`key={field.id}`, never `key={index}`** — index keys silently break focus/dirty-state/animations on remove-of-non-last-row; the React stable-key-by-identity rule "with teeth" since the array is built for reorder.
- **root error (Term)** — array-level rules (`.min(1, 'Add at least one line')`) land at `errors.lineItems.root.message`, NOT `errors.lineItems.message` and NOT on any row; rendered once below the list. Per-row errors land at `errors.lineItems[index].field.message` but are read via the row `Controller`'s scoped `fieldState`, no path arithmetic.
- **reconcile / diff (Term)** — action computes INSERT/UPDATE/DELETE by comparing the submitted list against current DB rows; deletion is *inferred from absence* (the submitted list is the complete new source of truth, never sends explicit deletes).
- **The reconcile loop** — `append` (no id) → action INSERTs and returns the row with its persisted id → `replace(result.data.lineItems)` writes ids back into the form → next save correctly UPDATEs instead of double-inserting. `replace` is the targeted alternative to `form.reset()` when only the array changed.
- **`append` takes the full default row** — `append({ description: '', amount: 0 })`, never `append({})` (per-row `defaultValues` discipline; empty object → uncontrolled→controlled warning per row).

**Patterns and best practices** (for the Ch 047 project if/when RHF is used):
- Rows render with `Field` + `Controller` + per-row `<FieldError errors={[fieldState.error]} />` (L2 divergence inherited — never `<FormField>`/`<FormMessage>`).
- Derived/computed values (e.g. total) are read-only `<output>` in a scoped `useWatch` leaf, not a user field; guard mid-edit input with `Number(x) || 0` (watched value is the `z.input` shape — string mid-edit).
- Reorder default = up/down `move` buttons with `disabled` bounds guards; drag-to-reorder seam = `@dnd-kit` `onDragEnd → move(from, to)`.
- Server-pushed per-row errors via `applyServerErrors` must be keyed in RHF dotted-path shape `lineItems.0.amount`.
- Multi-row writes wrapped in one `db.transaction`; `revalidateTag` after the write, before return.

**Misc.**
- Zod 4 conventions confirmed: top-level `z.uuid()`, `z.coerce.number<number>()` (generic-pinned input type, matches L3).
- Verified June 2026: `useFieldArray` returns `{ fields, append, prepend, insert, remove, swap, move, update, replace }`; array-level `.min` error at `errors.<name>.root.message` (the `root` slot specifically).
- The keying/append exercise shipped as the planned `Dropdowns` **fallback** (not `ReactCoding`): plain-`<input>` snippet with two blanks (`field.id` vs `index/field.description`; full default row vs `{}`/`undefined`), dropping the Zod resolver + shadcn `Field` layer for legibility — exercise-only, not canonical.
- The focus/identity key-bug visual shipped as a **custom `KeyBugScrub` component** (`src/components/lessons/045/4/KeyBugScrub.astro`), not `DiagramSequence` as the outline planned.
- The typed-object `createInvoice(values)` call shape is reaffirmed (RHF-only caller); the Ch 047 project's `FormData` decision is not relitigated here.
- Components used: `Code` (native-indexed sketch, render-rows, root-error, move-buttons, replace-reconcile, schema-extension ins), `AnnotatedCode` (useFieldArray call, `<InvoiceTotal>` leaf, save-diff action body), `CodeTooltips` (operation names), `CodeVariants` (key index-vs-id bug/fix), `KeyBugScrub` (custom focus/identity key-bug scrub — highest-value visual), `Dropdowns` (keying + append wiring, and the two error paths — two instances), `Sequence` (save lifecycle order), `VideoCallout` (Codevolution dynamic-fields), `Aside` (caution: full default row; note: large-N ceiling), `Term` (`field.id`, root error, reconcile), `ExternalResource` (RHF useFieldArray docs, dnd-kit, RHF useWatch, Zod schemas).

## Lesson 5 — Multi-step wizards with FormProvider

**Taught** — The chapter's culminating composition lesson: builds a 3-step invoice wizard (customer → line items → review) under one `useForm` at the root, with only two new APIs (`FormProvider`/`useFormContext` + `trigger`). Covers the form-owns-data / wizard-owns-navigation split, the context bridge via shadcn `<Form {...form}>`, per-step `trigger(fieldsForStep(step))` validation with the field list *derived* from Zod `.pick().shape`, the base-vs-refined schema split, conditional-render vs render-all/hide strategies and the `shouldUnregister` footgun, single terminal `handleSubmit` submit, server-error-to-step navigation, cross-step `.refine`, scoped leaf `useWatch`, and the PE-casualty / draft-save-ceiling senior calls.

**Cut** — Chapter outline's 5-step onboarding flow (company/billing/plan/payment/confirmation) deliberately reframed to the 3-step invoice flow for domain continuity (already flagged in the L5 outline). The `<Steps current=… total=…>` progress-UI indicator and the per-step-validity red-badge (outline "wizard's progress UI") were *not built* — the wizard reads `step` from state but no visual indicator is taught (Ch 027 owns the component).

**Debts** (forward-references later lessons must honor):
- **Ch 046 (route handlers)** owns async `.refine` live-uniqueness (the door, not opened — same as L3).
- **Ch 060** owns URL-state list views (filters/sorting); L5 only names `?step=2` as a refresh-safe navigation aid, never the source of value truth.
- **Ch 061** owns draft-save / per-step server persistence across sessions (the >8–10-step / resumable ceiling) — explicitly the architecture that reintroduces the per-step writes L5 forbids.
- Reuses verbatim: `app/invoices/_lib/invoice-schema.ts`, `app/invoices/new-invoice-form.tsx` (reshaped into the wizard root), `useForm<InvoiceInput, unknown, Invoice>`, `applyServerErrors(form, result)`, the `Result` contract `{ ok, error: { code, userMessage, fieldErrors? } }`.

**Terminology / mental models** later lessons must reuse verbatim:
- **The spine sentence** — "The form owns the (field) data. The wizard owns the navigation. They are separate." The current step is ordinary `useState(1)` in the root, never a form field. Every wizard bug traces to blurring this.
- **One `useForm` per wizard, at the root** — calling `useForm` inside a step spins up an isolated form (values vanish on navigate); steps read the *same* instance via `useFormContext<InvoiceInput, unknown, Invoice>()`. The single most common wizard mistake.
- **`FormProvider`/`useFormContext` (Terms)** — provider publishes the instance to descendants; the hook is the consumer side. shadcn `<Form {...form}>` *is* a `FormProvider` (+ styling context); use it since the project imports it. This is the one place the shadcn `<Form>` *root* earns its weight — the per-field layer stays `Field` + `Controller`, never legacy `<FormField>` (L2 divergence held).
- **Two validation scopes, two APIs** — `trigger(fieldNames)` validates a *subset* (per-step "Next" gate, async → must `await`, returns `Promise<boolean>`); `handleSubmit` validates the *whole* schema (final submit, the only server call). `formState.isValid` and `handleSubmit` are both wrong for gating one step (whole-form). Forgetting `await trigger` → branching on a truthy promise → gate always passes (symptom: "Next advances with errors on screen").
- **Per-step field lists are a *projection* of the schema, never a parallel copy** — derive via `Object.keys(stepSchemas[step].shape)`; a `.pick()` projection can't drift from the source the way a re-typed list can.
- **base-vs-refined schema split** — `.pick`/`.shape` are object-only methods; a top-level `.refine` wraps the object and no longer exposes them. So `baseInvoiceSchema` (plain object) feeds the per-step picks, and `InvoiceSchema = baseInvoiceSchema.refine(...)` feeds the resolver. One source, two derivations.
- **Cross-step rules are schema concerns, not wizard concerns** — a rule no single field can check (e.g. total > 0) is a top-level `.refine` with `path: ['field']`; fires only on the final `handleSubmit`, never hand-coded in the wizard flow.
- **`shouldUnregister` (Term)** — `useForm` option; default `false` keeps an unmounted field's value in form state. The silent footgun: `shouldUnregister: true` + conditional rendering = values wiped on "Back". Keep the default for wizards.
- **`useWatch` in the leaf** — the L2 re-render lever held verbatim: a step reads another step's value via `useWatch({ control: form.control, name })` to gate a conditional field; "scope the subscription, don't memoize the tree" (React Compiler is on).
- **Navigation is the wizard's job** — RHF puts a server error in `formState`; *taking the user to the errored step* is the wizard's job, via `stepOfFirstError` reusing the same step→fields map the picks define.

**Patterns and best practices** (for the Ch 047 project if/when RHF is used):
- Two render strategies: conditional (`{step === 1 && <Step/>}`) scales for long wizards, relies on default `shouldUnregister: false`; render-all/hide-with-CSS is moot-safe, fine for 3–5 steps.
- Wizard submits **once** at the end; "Back"/"Next" are pure client-side `setStep` changes, no per-step server write. Success branch usually **redirects** (`router.push`) rather than `reset` (single forms more often reset).
- `goNext = async () => { if (await form.trigger(fieldsForStep(step))) setStep(step + 1); }`.
- `.pick({ lineItems: true })` picks the whole array sub-schema, so step 2's `trigger('lineItems')` enforces the array-level `.min(1)` root rule — correctly blocks an empty invoice.
- Trust boundary unchanged: per-step `trigger` is for the user; the action's whole-payload `safeParse` is for the system. The wizard changes only the client state layer.

**Misc.**
- **PE is fully a casualty** (accepted) — wizards need JS for navigation/`trigger`/deferred submit; justified for in-app signed-in surfaces. Public marketing-funnel wizard → wrong shape; reach for a single-page progressive-disclosure form (PE-preserving, named not built), or Conform when PE is non-negotiable (L1 reference).
- No live-coding exercise (a bootable RHF wizard exceeds the self-contained-iframe budget L2/L4 respected); consolidation is recognition-only (`Sequence` lifecycle + `MultipleChoice` on the validation-scope distinction).
- Components used: `Term` (FormProvider, useFormContext, shouldUnregister), `AnnotatedCode` (wizard-root 5-step walkthrough), `CodeTooltips` (`trigger`/`await`), `CodeVariants` (shouldUnregister footgun), custom `ValidationScopeNextVsSubmit.astro` (validation-scope Next-vs-submit scrub — highest-value visual, replaces planned raw `DiagramSequence`), custom `WizardContextVsPropDrilling.astro` (context-vs-prop-drilling contrast — replaces planned `ArrowDiagram`/`TabbedContent`), `Sequence` + `MultipleChoice` (consolidation), `:::note`/`:::caution` (spine reminders + submit-per-step trap). Two custom components live at `src/components/lessons/045/5/`. The resourcer's video shipped as an `ExternalResource` card (Cosden Solutions multi-step form) inside the External-resources `CardGrid`, not a `VideoCallout`.
