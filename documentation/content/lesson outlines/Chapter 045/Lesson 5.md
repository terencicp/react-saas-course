# Lesson title

- Title: Multi-step wizards with FormProvider
- Sidebar label: Multi-step wizards

# Lesson framing

The chapter's culminating lesson. The four prior lessons each installed one piece in isolation — the trigger threshold (L1), the five primitives (L2), the resolver/one-schema discipline (L3), `useFieldArray` (L4). The wizard is where they combine: it is the fourth trigger from L1 ("multi-step form whose state spans many components"), and it consumes the resolver (per-step validation reuses the schema), the primitives (`useFormContext` hands every step the same `useForm` instance), and optionally a field array inside a step. The pedagogical job is **composition**, not new surface: there are really only two new APIs (`FormProvider`/`useFormContext` and `trigger`), everything else is recombination. Keep that framing explicit so the student feels the chapter close, not a sixth unrelated tool.

**The one mental model to land:** *the form owns field state, the wizard owns navigation state, and they are separate.* Every wizard bug a beginner hits traces to conflating these — calling `useForm` per step (a new form per step, values vanish on navigation), putting `step` into the form, expecting `formState.isValid` to gate a step (it's whole-form), losing values on "back" (`shouldUnregister`). Lead every section back to this split.

**Where beginners struggle, and the structure that defuses it:**
- *They reach for one giant component* with a `switch(step)`. The lesson instead shows the canonical decomposition first — root holds `useForm` + step state, each step is a sibling component reading context — so the "spans many components" trigger is felt as the natural shape, not a complication.
- *They try to submit per step* (one action call per "Next"). Name early and firmly: the wizard submits **once** at the end; "Next" is pure client validation via `trigger`, no server round-trip. Draft-save (per-step persistence) is a different, longer-form pattern, named once and deferred to Ch 061.
- *Per-step validation is the genuinely non-obvious mechanic.* `handleSubmit` validates the whole schema — wrong for "Next". `formState.isValid` is whole-form — wrong for gating one step. The answer is `trigger(fieldNames)`, and the senior move is to derive that field list from `FullSchema.pick({...})` so the per-step rules never drift from the whole. This deserves the most careful, staged treatment in the lesson, ideally with a DiagramSequence contrasting "Next" (trigger subset) vs final submit (handleSubmit whole).
- *`shouldUnregister` is a silent footgun.* With conditional rendering, the wrong setting silently wipes a prior step's values on "back". Teach it as a direct consequence of the two render strategies, with a concrete "go back, your data is gone" failure framing.

**Continuity that must hold (from Continuity notes):** reuse the running invoice domain and its artifacts verbatim — `app/invoices/_lib/invoice-schema.ts` (`InvoiceSchema`/`InvoiceInput`/`Invoice`), `useForm<InvoiceInput, unknown, Invoice>`, `applyServerErrors(form, result)`, the `Result` shape `{ ok, error: { code, userMessage, fieldErrors? } }`. Use the **`Field` family + `Controller`** layout layer (`FieldGroup`/`FieldSet`/`FieldLegend`), **never** legacy `<FormField>`/`<FormMessage>` (L2's deliberate divergence — honor it). The trust boundary recurs: per-step `trigger` is for the user, the action's `safeParse` on the whole payload is for the system; the wizard does not move it. The submit-changes-hands model from L1/L2 holds — `onFinalSubmit` calls the action as a plain function.

**Domain decision (deliberate):** the chapter outline's wizard example is a 5-step onboarding flow (company / billing / plan / payment / confirmation). But the chapter's running domain is the invoice. To keep continuity and avoid introducing a fresh schema late in the chapter, **frame the wizard as a multi-step invoice creation flow** — Step 1 customer details, Step 2 line items (reusing L4's `useFieldArray` array verbatim — this is the composition payoff), Step 3 review & submit. Three steps, not five: fewer steps keeps the example legible while still demonstrating every wizard mechanic (context, per-step validate, back-nav, single submit, cross-step `.refine`, leaf `useWatch`). Note this divergence so downstream agents don't expect the onboarding fields.

**Cognitive-load sequencing:** build the wizard incrementally. First the skeleton (root + step state + `FormProvider`, steps render but "Next" doesn't validate). Then add `trigger` per step. Then the render-strategy / `shouldUnregister` decision. Then the final submit + server-error-to-step mapping. Then the cross-cutting refinements (cross-step `.refine`, leaf `useWatch`). Close with the PE casualty and the "too long for one form" ceiling. Each section adds exactly one capability to a running artifact the student can hold in their head.

**Media plan:** one architecture diagram (the context-vs-prop-drilling contrast — the *why* of `FormProvider`), one DiagramSequence (the per-step-validate vs final-submit validation-scope contrast — the highest-value visual, it makes the non-obvious mechanic concrete), one small annotated walkthrough of the root component (the composition spine), and one consolidation exercise (Sequence or MultipleChoice on the validation-scope distinction). No live-coding exercise: a bootable RHF-wizard-in-iframe needs the resolver + multiple components + step state, which exceeds the self-contained-iframe budget the L2/L4 exercises respected; recognition exercises serve better here. A short VideoCallout is optional, not required.

# Lesson sections

## The shape of a form that spans steps

**Goal:** install the wizard as the fourth L1 trigger made concrete, and land the form-owns-data / wizard-owns-navigation split before any API appears.

Open with the senior question (implicit, per pedagogy): the invoice form has grown — customer details, a variable line-item array, a review step. Cramming all of it onto one screen is poor UX past a few fields; the product wants it staged. Each step is its own component, the user can go back and edit, but it's still **one** invoice submitted **once**. Sketch what the native Ch 044 pattern would force: a parent `useState` per field (or a hand-rolled context), manual error plumbing across components, and the temptation to POST per step. State plainly this is the fourth trigger from L1 — "state spans many components" — and RHF answers it directly.

Then state the lesson's spine in one line and return to it throughout: **the form owns field state; the wizard owns navigation state (the current step); keep them separate.** The current step is ordinary `useState` in the root, never part of the form values.

Name the three-step running example concretely (Step 1 customer + email; Step 2 line items via L4's `useFieldArray`; Step 3 review & submit) so the student knows the artifact being built. Emphasize Step 2 is L4's array verbatim — this lesson composes, it doesn't reteach.

**Diagram — context vs prop-drilling (the *why* of FormProvider).** Use `ArrowDiagram` inside a `Figure`, or a `TabbedContent` with two `ArrowDiagram` panels. Panel A "without context": a root box holding `form`, with arrows threading `register`/`control`/`errors` down through every step box as props (visually noisy, crossing lines) — the prop-drilling pain. Panel B "with FormProvider": the root wraps steps in a provider (drawn as an enclosing tinted region), each step box reaches the same `form` instance directly (short arrows to a shared context node, no threading). Pedagogical goal: the student should *see* that `FormProvider` removes the prop-drilling, which is the entire justification for the API introduced next. Keep it horizontal, low height.

No code yet — this section is the problem framing and the mental-model plant. Keep it brief and warm per the intro guidance.

## One form, shared by every step: FormProvider and useFormContext

**Goal:** teach the two-API context bridge and the canonical decomposition (root + steps), establishing the skeleton the rest of the lesson extends.

Teach `FormProvider` + `useFormContext` as a pair:
- The root calls `useForm<InvoiceInput, unknown, Invoice>(...)` **once** (reuse L3's canonical typed generic and `zodResolver(InvoiceSchema)` + `mode: 'onBlur'` verbatim) and wraps the steps. Two equivalent ways to provide context: bare `<FormProvider {...form}>`, or — the senior reach in this design system — shadcn's `<Form {...form}>`, which **is** a `FormProvider` wrapper. State this equivalence explicitly so the student isn't confused seeing both: shadcn `<Form>` = `FormProvider` + styling context. (This is the one place the legacy shadcn `<Form>` *root* still earns its weight — but the per-field layout stays `Field` + `Controller`, never `<FormField>`. Reaffirm the L2 divergence here so a build agent doesn't backslide to `<FormField>`.)
- Each step component calls `const form = useFormContext<InvoiceInput, unknown, Invoice>()` to read the **same** instance — `register`, `control`, `formState`, `trigger`, `getValues` all available without a single prop passed down.

The senior anchor (repeat it): **one `useForm` per wizard, at the root; every step shares it via context.** Calling `useForm` inside a step creates a brand-new isolated form — its own state, its own defaults — so values entered in other steps are invisible and vanish on navigation. This is the single most common wizard mistake; name it here as the watch-out tied to this API.

**AnnotatedCode — the wizard root, step by step.** This is the composition spine; walk it in 4–5 highlighted steps over one `app/invoices/new-invoice-form.tsx` block (the file L2–L4 built, now reshaped into a wizard root). Steps to highlight: (1) the single `useForm` call with the resolver + typed generic — "called once, here and nowhere else"; (2) `const [step, setStep] = useState(1)` — "navigation state, deliberately *not* in the form"; (3) `<Form {...form}>` wrapping — "this is FormProvider; every step now reaches `form`"; (4) the step switch `{step === 1 && <CustomerStep />}{step === 2 && <LineItemsStep />}{step === 3 && <ReviewStep />}` — "siblings, no props threaded"; (5) the form element `<form onSubmit={form.handleSubmit(onFinalSubmit)}>` wrapping the steps + nav buttons — "one form element, one submit, at the end." Keep step bodies stubbed (`function CustomerStep() { const form = useFormContext<...>(); ... }`) — full step bodies come in the next sections; here the focus is the root's structure.

Show one step component skeleton with `useFormContext` reading the instance and rendering a `Field` + `Controller` pair (Step 1's `customer` field), to make the "no prop-drilling" claim concrete. Use a plain `Code` block — it's a small, single-focus snippet.

Terms for `Term` tooltips: **FormProvider** (RHF context provider that publishes the `useForm` instance to descendants), **useFormContext** (the hook a descendant calls to read that instance — the consumer side of `FormProvider`). Define both inline so prose isn't interrupted.

## Validating one step at a time with trigger and schema pick

**Goal:** teach the genuinely non-obvious mechanic — per-step validation — and the senior move of deriving the step's field list from `FullSchema.pick({...})`. This is the lesson's hardest concept; give it the most careful staging.

Frame the problem precisely: the "Next" button must validate **only the current step's fields**, then advance if they pass. Two reflexes a student brings, both wrong, named explicitly:
- `form.handleSubmit(...)` — validates the **whole** schema, so "Next" on step 1 fails on step 2's still-empty fields. Wrong tool: `handleSubmit` is for the final submit.
- `form.formState.isValid` — a **whole-form** boolean, true only when every field across every step passes. Wrong granularity for gating one step.

Then the answer: `await form.trigger(['customer', 'email'])` runs the resolver against the **named fields only** and returns a `boolean`. The "Next" handler is `if (await form.trigger(stepFields)) setStep(step + 1)`. Emphasize `trigger` is async (returns a promise) — `await` it — a common omission that makes the gate always pass.

The senior move — keep the field list honest: hand-listing field names per step drifts the moment the schema gains a field. Derive the step's field set from the schema: `const StepOneSchema = InvoiceSchema.pick({ customer: true, email: true })`, and the step knows its fields from `Object.keys(StepOneSchema.shape)` (or the step simply owns a typed `const stepOneFields = ['customer', 'email'] as const satisfies` the picked keys — show whichever reads cleaner, but the principle is the schema is the source). Tie back to the chapter's spine: **one schema, the per-step rules are a *projection* of it, never a parallel copy.** A `.pick()` projection can't drift the way a re-typed list can.

Be precise about `.pick()` on nested shapes: `InvoiceSchema.pick({ lineItems: true })` picks the whole `lineItems` array sub-schema for the array step — `trigger('lineItems')` then validates every row plus the array-level `.min(1)` root rule (the `errors.lineItems.root.message` slot from L4). Note this so the array step's "Next" correctly blocks an empty invoice.

**DiagramSequence — validation scope: "Next" vs final submit.** The highest-value visual in the lesson; it makes the abstract scope distinction concrete. Three+ steps scrubbing one diagram of the 3-step wizard with all fields drawn as small cells grouped by step:
- Step A — on step 1, click "Next": only step 1's field cells light/validate (green check or red error), steps 2–3 untouched. Caption: "`trigger(['customer','email'])` — the resolver runs against these fields only."
- Step B — advanced to step 2, click "Next": only step 2's cells validate. Caption: "Each step gates on its own fields."
- Step C — on step 3, click "Submit": **every** cell across all steps validates at once (including any cross-step rule). Caption: "`handleSubmit` runs the resolver against the whole schema — the final gate."
- Optional Step D — show a cross-step rule firing here (lead into the `.refine` section). 
Pedagogical goal: the student leaves seeing two different validation scopes driven by two different APIs, which is exactly the misconception (`isValid`/`handleSubmit` for "Next") this lesson must correct.

`CodeTooltips` candidate: on the "Next" handler, tooltip `trigger` (returns `Promise<boolean>`; runs the resolver against the named field paths; with no argument validates all) and `.pick` (Zod: narrow a schema to a subset of keys, preserving each field's rules and messages).

## Keeping a step's values when the user goes back

**Goal:** teach the two render strategies and the `shouldUnregister` consequence, framed by the concrete "go back, data gone" failure.

Open with the failure the student must never ship: the user fills step 1, advances to step 2, clicks "Back" — and step 1's fields are empty. Diagnose it as a consequence of *how steps are rendered* plus *what RHF does with unmounted fields.*

Two rendering strategies, with the senior call for each:
- **Conditional rendering** (`{step === 1 && <CustomerStep />}`): the off-step components **unmount**. Whether their values survive depends on `shouldUnregister`. RHF's default is `shouldUnregister: false` — unmounted fields keep their values in the form's state, so "Back" restores them. Setting `shouldUnregister: true` clears a field's value on unmount — wrong for wizards. Senior reach: **keep the default (`false`)** for wizards; the user expects persistence. State the default explicitly so the student knows the correct behavior is free *unless they break it*.
- **Render-all, hide-one** (render every step, hide non-current with CSS, e.g. `hidden` attribute / `display:none`): nothing unmounts, so `shouldUnregister` is moot and values trivially persist. Heavier DOM for tall wizards but zero unmount concerns. Senior reach: fine for short wizards (3–5 steps, this lesson's case); conditional rendering scales better for long ones.

Make the "Back" button explicit and trivial: `setStep(step - 1)` — no validation, no reset, no persistence call. RHF kept the values; going back just changes the visible step. Reinforce the spine: **navigation changes `step`; field values live untouched in the form.** There is no per-step server write — "Back" and "Next" are pure client-side step changes.

`CodeVariants` — the `shouldUnregister` footgun. Two tabs over the `useForm` config + a conditional-render step:
- Tab "Loses data (`shouldUnregister: true`)": with conditional rendering, going back shows empty fields. Explain *why* — the field unregistered on unmount.
- Tab "Keeps data (default)": same render code, default config, values restored on back.
The variant makes the silent footgun visible — the only difference is one option, the UX difference is total.

`Term`: **shouldUnregister** (RHF `useForm` option; whether a field's value is dropped when its input unmounts — `false` by default, keep it for wizards).

Watch-out to state here: with conditional rendering and the default `false`, validation *errors* for not-yet-visited steps don't appear until those fields are touched or the final submit runs — which is exactly why "Next" uses `trigger` on the visible step's fields, and the final `handleSubmit` is the whole-form backstop. This closes the loop with the prior section.

## Submitting once: the final step, the action, and routing server errors back to the step that owns them

**Goal:** teach the single terminal submit, reaffirm the unchanged Server Action seam, and teach the wizard-specific piece — mapping a server `fieldError` back to the step that owns the offending field and navigating the user there.

The last step's "Submit" button runs `form.handleSubmit(onFinalSubmit)` (the form element's `onSubmit`, set up in the root section). This validates the **whole** schema one last time — the final gate that catches anything the per-step `trigger`s didn't (notably cross-step rules, next section). `onFinalSubmit(values: Invoice)` receives the **output** type (L3's track-this/receive-that bridge) and calls the Server Action as a plain function — `await createInvoice(values)` (or `FormData`-built if the action keeps that signature). Reaffirm the unchanged seam from L1/L3: the action still `safeParse`s the whole payload first (the trust boundary — `trigger` was for the user, this parse is for the system), authorizes, mutates in a `db.transaction` (Ch 039 L4), revalidates, returns `Result`. The wizard changed the *client* state layer; the server mutation seam is identical.

The wizard-specific mechanic — **server errors must surface on the right step.** The action returns `{ ok: false, error: { fieldErrors: { email: ['Already taken'] } } }` for rules the client can't know (uniqueness, plan limits). Reuse L3's `applyServerErrors(form, result)` **verbatim** (do not redefine — it loops `fieldErrors`, `setError`s each) — the errors land in `formState.errors`, rendered by the same `<FieldError>` rows. But: the offending field may live on a step the user isn't currently viewing. The senior move: after `applyServerErrors`, **navigate the user to the step that owns the first errored field** so they see the message. Show a small helper concept — map each errored field path to its step index (the same step→fields map the `.pick()` projections already define) and `setStep` to the lowest one. Pedagogical point: the UX layer (the wizard) is responsible for *taking the user to the error*; RHF only puts the error in state.

`AnnotatedCode` or a tight `Code` block for `onFinalSubmit`: (1) `const result = await createInvoice(values)`; (2) success branch — `if (result.ok) { /* redirect or reset */ return }` (reuse L2's reset-after-await discipline if the form stays open; a wizard more often redirects on success — note both, redirect is the common wizard ending); (3) failure branch — `applyServerErrors(form, result)` then `setStep(stepOfFirstError(result.error.fieldErrors))`. Highlight the `setStep`-to-error line — it's the new, wizard-specific move.

Reinforce the no-per-step-submit rule one more time here as the contrast: the *only* server call in the whole wizard is this final one.

## Rules that span steps, and fields that depend on other steps

**Goal:** handle the two cross-cutting concerns that wizards specifically surface — cross-step validation rules and cross-step conditional fields — reusing tools the chapter already taught (schema `.refine`, leaf `useWatch`).

Two sub-topics, both short (the tools are known from L3/L4; this is application):

**Cross-step rules live on the schema as a `.refine`.** A rule spanning steps — e.g. "the line-item total must be positive" (spanning the array step) or a hypothetical "billing country must match customer country" — cannot be a per-field rule. It's a top-level `.refine()` on `InvoiceSchema` with `path: ['fieldName']` to attach the error to the right field/step. The resolver fires it on the **final** `handleSubmit` (whole-schema validation), so the wizard's flow doesn't reimplement it — the rule exists once, in the schema, and the final gate enforces it. The senior anchor: cross-step rules are *schema* concerns, not *wizard* concerns; the wizard never hand-codes them. (Tie to the DiagramSequence's final-submit step where a cross-step rule fired.) Keep this to a few lines + one `.refine` snippet appended to the schema.

**Cross-step conditional fields use a scoped `useWatch` in the step leaf.** A step that conditionally shows a field based on another step's value — e.g. show a "PO number" field only when the customer is a business, or show tax fields when `customer` matches a flagged value — reads the dependency with `const customer = useWatch({ control: form.control, name: 'customer' })` **inside the step component**, then conditionally renders. Reaffirm L2/L4's re-render lever verbatim: `useWatch` scopes the subscription to the calling leaf — only that step re-renders on change, not the wizard root. The senior anchor (repeat the L2 framing): *scope the subscription, don't memoize the tree* (React Compiler is on). One small `Code` snippet of a step leaf using `useWatch` to gate a `Field`.

This section is deliberately "you already have the tools" — its pedagogical value is showing the student that wizards don't need *new* validation/derivation machinery, only the composition. That reinforces the whole-chapter "composition not new surface" framing.

## What the wizard costs, and when it's the wrong shape

**Goal:** the senior decision close — name the progressive-enhancement casualty honestly and the upper bound past which a single client wizard stops being the right pattern.

**Progressive enhancement is fully a casualty here — and that's an accepted trade.** Unlike a single RHF form (where PE was already degraded in L1), a wizard *cannot* work without JS at all: the step navigation, the per-step `trigger`, the deferred single submit all require the bundle. State the senior reasoning, not just the fact: the affected segment is small for *in-app* wizards (signed-in users on JS-on surfaces — onboarding, invoice creation, configurators), and the staged UX wins dominate. The explicit senior carve-out: for a **public marketing-funnel** wizard (where no-JS reach and SEO matter), the right pattern is **not** a multi-step JS-required wizard but a single-page progressive-disclosure form (sections revealed inline, one native submit). Name this alternative once; it's the PE-preserving reach, out of scope to build here. Reconnect to L1's Conform mention — Conform is the library reach when PE on complex forms is non-negotiable.

**The upper bound — when a wizard outgrows one client form.** Past ~8–10 steps, or when steps carry 20+ fields each, or when the user reasonably expects to **leave and resume later**, the wizard becomes a **draft-save** problem: per-step persistence to a draft row, the wizard hydrates from the draft on mount, each "Next" writes the draft. State plainly this is a *different* architecture (it reintroduces per-step server writes — the exact thing this lesson said the wizard avoids) and is out of scope — deferred to Ch 061 (soft-delete/draft territory). The pedagogical job is to install the ceiling so the student doesn't stretch the single-client-form wizard past where it holds. Also note the URL boundary: tracking the step in the URL (`?step=2`) is a navigation aid, but the form's RHF state — not the URL — is the source of value truth (URL-state *list views* are a different concern entirely, Ch 060).

End the lesson by closing the chapter explicitly: the wizard combined the resolver (L3), the primitives (L2), and the field array (L4) under one `useForm` shared by `FormProvider` — the cumulative payoff. Restate the spine one final time: form owns data, wizard owns navigation, one schema validates both the per-step gate and the final server parse.

**Consolidation exercise.** A `Sequence` ordering drill is the strongest fit for the wizard lifecycle: drag into order the steps of "user completes the wizard" — e.g. (1) root mounts, `useForm` called once; (2) user fills step 1, clicks Next; (3) `trigger(step1Fields)` passes, `setStep(2)`; (4) user fills step 2 (line items), Next; (5) `trigger('lineItems')` passes, `setStep(3)`; (6) user clicks Submit, `handleSubmit` validates whole schema; (7) `onFinalSubmit` calls the action; (8) on `fieldError`, `applyServerErrors` + `setStep` to the errored step. This drills the exact temporal model and the validation-scope distinction in one artifact. 

Alternatively/additionally a `MultipleChoice` on the validation-scope misconception: "To validate only the current step's fields before advancing, you call ___" with distractors `handleSubmit`, `formState.isValid`, and the correct `trigger(fieldNames)` — directly tests the lesson's hardest point. Prefer the `Sequence` as the primary check; the `MultipleChoice` is a cheap optional reinforcement.

Optional `VideoCallout`: if the resourcer finds a focused, current (≤6-month) RHF-wizard walkthrough it can anchor this section; not required, and skip rather than embed a stale or padded one.

# Scope

**Prerequisites to restate concisely (taught earlier, do not reteach):**
- The four triggers and the native-vs-RHF reflex (L1) — name the wizard as trigger #4; one sentence, don't relitigate.
- The five primitives, `useForm`/`register`/`Controller`/`handleSubmit`/`formState`, `mode: 'onBlur'`, `useWatch` as the re-render lever, the `Field`+`Controller` layout layer (L2) — reuse verbatim, redefine nothing beyond a clause.
- The resolver, one-schema-two-importers, the `z.input`/`z.output` type bridge and `useForm<InvoiceInput, unknown, Invoice>`, `applyServerErrors` (L3) — reuse the artifacts as-is.
- `useFieldArray`, `field.id` vs domain id, the array `.min(1)` root error, the reconcile/`replace` loop (L4) — Step 2 *uses* this array verbatim; do not reteach the hook, only compose it into a step.
- The Server Action seam, `safeParse`-first, `db.transaction`, `Result` (Ch 043 / Ch 039 L4) — reaffirm unchanged; don't reteach.

**This lesson does NOT cover:**
- The shadcn `Steps`/progress-indicator *visual* — the design-system pass owns the component (Ch 027); the wizard reads `step` from state and may show a progress indicator, but its styling is not taught here.
- The legacy shadcn `<Form>`/`<FormField>`/`<FormMessage>` per-field API — superseded by `Field`+`Controller` (L2 divergence); the `<Form>` *root* appears only as the `FormProvider`-equivalent context wrapper.
- Draft-save / per-step persistence across sessions — named once as the ceiling, deferred to Ch 061.
- The PE-friendly single-page progressive-disclosure alternative — named once, not built.
- Conform / TanStack Form in depth — named once each (L1 owns the landscape).
- Async `.refine` live-uniqueness via a route handler — the door (Ch 046); not opened here.
- URL-as-step-state (`?step=2`) beyond naming it a navigation aid — URL-state list views are Ch 060.
- Large-N field arrays / bulk-edit tables — Unit 16 ceiling (named in L4), not revisited.
- The action's transaction internals — Ch 039 L4.
