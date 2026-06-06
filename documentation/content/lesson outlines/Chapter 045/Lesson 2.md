# Lesson title

- Title: The five primitives: useForm, register, Controller, handleSubmit, formState
- Sidebar label: The five RHF primitives

# Lesson framing

This is the **mechanics lesson** where RHF's surface lands. Lesson 1 fired the trigger and showed the submit seam under-explained on purpose (native `<form action={createInvoice}>` → RHF `<form onSubmit={form.handleSubmit(onSubmit)}>`, action called as a plain function); this lesson pays that debt and gives the student the call shape every later lesson (3 resolver, 4 `useFieldArray`, 5 wizard) builds on. It runs long (45–55 min) — that's expected and accounted for in the chapter outline.

**The frame: three concerns, five primitives.** Do not present the five hooks as a flat list. The organizing mental model — stated up front and reinforced at every section — is that a form has exactly **three concerns**, and each primitive answers one:
1. **Get values in and track them** — `useForm` (the container) + `register` (uncontrolled/native path) + `Controller`/`useController` (controlled/UI-library path).
2. **Submit** — `handleSubmit` (intercept → validate → hand off).
3. **Read state back out** — `formState` (errors, submitting, dirty) + `watch`/`useWatch` (subscribe to live values).

This 3-concern spine is the spine of the whole lesson. The student should leave able to glance at any form requirement and say "that's a registration concern / a submit concern / a read concern, here's the primitive."

**Continuity discipline — honor verbatim (from Ch 044 + Ch 045 L1 continuity notes):**
- The running example is the **invoice create form**: `createInvoice` Server Action, `InvoiceSchema` / `InvoiceInput` type, fields `customer`/`email`/`total`. Reuse these exact names — L1's `CodeVariants` already shipped `createInvoice(values)`, `InvoiceInput`, `form.handleSubmit(onSubmit)`.
- **Trust boundary** (Term, defined L1): adopting RHF does NOT move it. Restate once, briefly — client validation is for the user, the action's `safeParse` is the gate. Do not re-derive it; L1 owns the full treatment. The `onSubmit` body calls the *unchanged* `createInvoice`.
- **Controlled component** (Term, defined L1): value owned by React state via `value`/`onChange`, not the DOM. Reuse the definition; the `Controller` section is where it finally pays off.
- **Server Action five-seam shape** (parse→authorize→mutate→revalidate→return `Result`) is unchanged. RHF replaces only the *client* form-state layer.
- The submit button: L1/L2 outline both say it reads `form.formState.isSubmitting`, **not** `useFormStatus().pending`. This is a real seam — Ch 044 L4 built `<SubmitButton>` on `useFormStatus`. Address it head-on (see the `handleSubmit` section): with RHF the submit no longer flows through the `action` prop, so `isSubmitting` from `formState` is the canonical pending read. The `<SubmitButton>`/`useFormStatus` pattern belongs to the native `action`-prop form; do not reuse it here.

**DELIBERATE DIVERGENCE FROM THE CHAPTER OUTLINE — shadcn layout layer (verified June 2026, see Fact-check).** The chapter outline and L1 reference shadcn's `<Form>`/`<FormField>`/`<FormItem>`/`<FormMessage>` wrapper set as the layout layer. As of 2026 **shadcn has moved away from that wrapper** to a form-library-agnostic **`Field` component family** (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldContent`) used **directly with RHF's `Controller`**. The old `<Form>` wrapper still works and is not removed, but it is no longer shadcn's recommended starting point. Per the course thesis (minimum viable 2026 stack, no deprecated patterns), **teach the `Field` + `Controller` pattern as canonical**, and name the legacy `<Form>` wrapper once (Ch 044 L6 already told students the wrapper set exists and is RHF-bound — close that loop by saying shadcn now leads with `Field`). This keeps the "shadcn primitives are the layout layer regardless of form library" thread from the chapter framing intact, just with the current primitive. Downstream agents: this is intentional, not an error — do not "correct" it back to `<FormField>`.

**Teaching-load management.** Five primitives + the layout layer is a lot. Stage it:
- Build the *minimal* working form first (useForm + register + handleSubmit + errors) so the student sees an end-to-end RHF form early, before `Controller`, `watch`, or the design-system layer.
- Then layer in the controlled path (`Controller`), the read-side depth (`formState` re-render rule, `watch`/`useWatch`), `defaultValues`/`reset`, and finally the shadcn `Field` layout.
- The resolver is a *forward reference only* — `zodResolver(InvoiceSchema)` appears in the skeleton as "wired next lesson," exactly as L1 set up. Do NOT teach resolver internals, `z.input`/`z.output`, or server-error mapping — those are L3.

**Pain points to target (where beginners get this wrong):**
- Forgetting `defaultValues` → input flips uncontrolled→controlled on first keystroke → React warning. Make this concrete.
- Reaching for `Controller` on a plain `<input>` `register` would cover → needless re-renders. The default is `register`; `Controller` is the bridge, not the norm.
- Reading `formState` in the form root → whole-form re-render churn; destructure only what's read; push `watch` into a child.
- Spreading `register` *before* a manual `onChange` → the consumer's handler shadows RHF's. Spread last.
- Calling `reset()` inside `onSubmit` before the `await` → resets before the action runs.

# Lesson sections

## Introduction (no header)

Warm, brief, ~1 short paragraph. Connect to L1: "Last lesson you decided *when* to reach for RHF and saw the submit change hands; you didn't see how RHF actually holds the form together." State the goal: by the end, the student can read RHF's whole surface as five primitives mapped to three concerns, and write the canonical form skeleton the rest of the chapter builds on. Motivate with the concrete payoff: the invoice form from Ch 044, re-expressed in RHF, working end to end. Name the forward debt L1 left: the resolver gets wired *next* lesson; here the focus is the primitives and the call shape. Keep the trust-boundary reminder to a single clause (the action is unchanged).

## A form has three concerns

The spine. Short section, no code yet — a framing device the student carries through the lesson. Lay out the three concerns (get values in + track / submit / read state out) and map the five primitives onto them in one compact visual. This is where cognitive load is bought down: instead of "here are five hooks," the student gets a 3-slot mental shelf.

**Diagram — `<Figure>` + plain HTML/CSS (or `ArrowDiagram`): the primitive map.** A compact horizontal three-column layout. Column headers = the three concerns. Under each, the primitive(s):
- "Get values in & track" → `useForm` (the container, spans all three — draw it as the base/root), `register` (native inputs), `Controller`/`useController` (UI-library inputs).
- "Submit" → `handleSubmit`.
- "Read state out" → `formState`, `watch`/`useWatch`.
Pedagogical goal: one glance fixes which primitive owns which job, so every later section slots into a known place. Keep it under ~400px tall, horizontal. Caption: name `useForm` as the root that produces all the others. Prefer HTML/CSS so it's a real styled artifact; `ArrowDiagram` only if connector lines genuinely help (note: `ArrowDiagram` figures must be `expandable={false}`).

Reinforce: "`useForm` is called once; everything else (`register`, `control`, `handleSubmit`, `formState`, `watch`) is a property of what it returns." This pre-empts the #1 structural confusion.

## useForm: the form's container

Teach `useForm` as the single call at the top of the form Client Component that creates the state container.

- The call: `const form = useForm<InvoiceInput>({ resolver: zodResolver(InvoiceSchema), defaultValues: {...}, mode: 'onBlur' })`. Walk it with **`AnnotatedCode`** (single block, multiple focus points): step 1 the generic (`InvoiceInput` — the field shape), step 2 `resolver` (forward-ref: "wired fully next lesson; for now know it points validation at the schema"), step 3 `defaultValues` (the field set RHF tracks + initial values), step 4 `mode` (validation timing — the L1 trigger, `'onBlur'` is the senior default), step 5 the returned `form` object and its members (`register`, `control`, `handleSubmit`, `formState`, `watch`, `setValue`, `reset`). Use `color` to tint each step; keep each step ≤6 lines of prose.
- **`defaultValues` is non-optional in practice.** It does double duty: sets initial values AND declares the field set RHF tracks. This is where the uncontrolled→controlled warning is pre-empted — say it here and again in its own watch-out. Senior anchor: empty defaults for create forms (`{ customer: '', email: '', total: 0 }`), prefilled defaults for edit forms.
- **`mode`** — `'onSubmit'` (default), `'onBlur'`, `'onChange'`, `'onTouched'`, `'all'`. The senior reach for forms past the native pattern is `'onBlur'` (validate when the user leaves a field — the canonical "blur to see your error" UX). Tie back to L1's trigger explicitly. Note `reValidateMode` exists but defer its detail to L3 (the chapter outline assigns the `mode` vs `reValidateMode` pair to L3) — name it in one clause only, don't teach it.
- `'use client'` is required — `useForm` is a hook. One sentence; the student knows hooks are client-only (and L1 noted the form was already a Client Component).

**Tooltip (`CodeTooltips` or `Term`) candidates in this section:** `resolver` (one-line: "function RHF calls to validate; `zodResolver` turns a Zod schema into one — full story next lesson"), `mode` ("when validation first runs for a field").

## register: the uncontrolled path

The high-performance default for native inputs.

- The shape: `<input {...form.register('email')} />` spreads `name`, `ref`, `onChange`, `onBlur`. Explain the mechanics with a short `Code` block, then prose: the **DOM owns the live value**; RHF reads it via the `ref` on submit and on the configured validation moment. This is the direct analogue of the Ch 044 uncontrolled pattern — call that out explicitly ("same uncontrolled inputs you already wrote, now with RHF reading them"). This is the connection-to-prior-knowledge move.
- Why it's the default: no per-keystroke re-render of the form, because the value lives in the DOM, not React state. Tie to the L1 framing that RHF "keeps inputs uncontrolled by default."
- The senior reach: `register` for every native input — text, email, password, number, textarea, checkbox, radio, select. `Controller` only when a UI-library component can't take a `register` spread (next section).
- **The spread-last rule.** If you add your own `onChange`, spread `register` *last* (or call the field's combined handler), or your handler shadows RHF's and RHF stops seeing the input. Show the wrong/right with **`CodeVariants`** (two tabs, `del`/`ins` marks): tab "Shadows RHF (broken)" — manual `onChange` after the spread; tab "Spread last (correct)". One paragraph each. This is a real footgun; the visual A/B is worth it.

### Build the minimal form

Pull the pieces together into the **first end-to-end working RHF form**, before `Controller`/`watch`/shadcn. This is the "see it run early" beat that de-risks the cognitive load.

- One `Code` block (or short `AnnotatedCode`): `'use client'` form with `useForm`, two `register`ed inputs, `handleSubmit(onSubmit)` on the `<form>`, inline errors from `formState.errors`, a submit button reading `formState.isSubmitting`. The `onSubmit` calls `createInvoice(values)` (the unchanged action). Keep `handleSubmit`/`formState` lightly labeled here — the dedicated sections follow — but the student should see a complete, runnable shape now.
- **Exercise — `ReactCoding` (tests mode), `dependencies={{ 'react-hook-form': '^7' }}`** (or `SandpackCallout` if RHF must be installed; `ReactCoding` pulls from esm.sh import map — confirm RHF resolves; if uncertain, the agent should use `SandpackCallout` with `dependencies` since the shadcn doc example pins `react-hook-form`). Task: given a starter with `useForm` already called and `defaultValues` set, the student wires `register('customer')` and `register('total')` onto two inputs and puts `handleSubmit(onSubmit)` on the form. Tests assert: inputs carry a `name`, typing then submitting calls the provided `onSubmit` spy with the typed values, and an empty required field surfaces. Grading criteria: registration present, submit intercepted. If a clean RHF-in-iframe exercise is not reliable, downgrade to a **`Dropdowns`** fenced-code fill-in (blanks: `register`, `handleSubmit`, `formState.errors`) — guided over sandbox per the pedagogy. Prefer the live exercise; specify the `Dropdowns` fallback so the build agent has a sure path.

## Controller and useController: the controlled path

The bridge for UI-library inputs — the L1 "controlled UI library inputs" trigger, now mechanized. This is where the **controlled component** Term pays off.

- The problem restated in one line: shadcn's `Combobox`, Radix `Select`, a date picker, a rich-text editor own their value through `value`/`onChange` and render no native `<input name>`, so `register` (which needs a ref'd native input) can't reach them.
- `Controller` — the render-prop bridge. Show with `Code`:
  ```tsx
  <Controller
    name="role"
    control={form.control}
    render={({ field, fieldState }) => (
      <Select value={field.value} onValueChange={field.onChange} onBlur={field.onBlur}>
        {/* options */}
      </Select>
    )}
  />
  ```
  Explain `field` (the `{ value, onChange, onBlur, name, ref }` bundle RHF hands you — wire these into the controlled component's props) and `fieldState` (`{ invalid, error, isDirty, isTouched }` for *this* field — used by the layout layer next). `control` comes from `useForm`.
- `useController` — the hook form of the same thing. Returns the same `field`/`fieldState`. Senior call: **`Controller` (render prop) for a one-off integration in the form's JSX; `useController` inside a reusable field component that owns its own UI** (e.g. a project-wide `<DatePickerField>` that calls `useController` internally so callers just pass `name`/`control`). Both are the identical bridge; the choice is render-prop vs hook ergonomics.
- **The default-vs-bridge watch-out:** reaching for `Controller` on a plain `<input>` that `register` would cover adds re-renders for no reason. State the rule sharply: **`register` is the default; `Controller` is the controlled-component bridge.** A `Matching` micro-exercise or a one-line `Aside` reinforces "native input → register, library input → Controller."

**Diagram (optional, only if it earns space) — `TabbedContent` two-panel "two paths in":** Panel "register" — DOM holds value, RHF reads via ref. Panel "Controller" — React state (the library component) holds value, RHF subscribes via `field.onChange`. Goal: cement that the two primitives differ in *who owns the value*, which is exactly the controlled/uncontrolled distinction. Keep it lightweight; skip if the prose + the `field` walkthrough already land it.

## handleSubmit: intercept, validate, hand off

The submit concern. This pays the L1 debt in full.

- The shape: `<form onSubmit={form.handleSubmit(onSubmit, onInvalid?)}>`. `handleSubmit` returns a real DOM submit handler. On submit it: (1) runs client validation against the resolver, (2) if valid, calls `onSubmit(values)` with the **typed values**, (3) if invalid, calls `onInvalid(errors)` (optional) and populates `formState.errors` instead. Walk this 3-step flow — a **`DiagramSequence`** is ideal here (the student scrubs: click submit → RHF validates → branch valid/invalid → `onSubmit(values)` runs → action called). Pedagogical goal: replace any lingering `action`-prop or `fetch`+`preventDefault` mental model with RHF's intercept-then-handoff flow. 4–5 steps, each with a one-paragraph caption.
- **The action is called from inside `onSubmit`, unchanged.** Reuse L1's exact shape: `const onSubmit = async (values: InvoiceInput) => { const result = await createInvoice(values); /* map errors — next lesson */ }`. Restate the trust boundary in one clause: RHF validated for the user; `createInvoice` still `safeParse`s on entry. Do NOT teach the server-error mapping (`setError`) — that's L3; leave the comment as the forward pointer L1 already planted.
- **The submit-button seam — address it directly.** With the native `action`-prop form (Ch 044 L4) the `<SubmitButton>` read pending via `useFormStatus()`. With RHF the submit no longer goes through `action`, so the canonical pending read is **`form.formState.isSubmitting`**. Show the button reading `disabled={form.formState.isSubmitting}` (and label swap "Saving…"). One short `Code` block + one paragraph naming why the read changed (different owner of the submit). This is the precise place the continuity note flagged; resolve it cleanly so the student doesn't try to drop the Ch 044 `<SubmitButton>` into an RHF form and wonder why it's a different hook.

## formState: reading the form back out

The read concern, with the re-render rule that is the heart of RHF's performance story.

- The members: `errors`, `isDirty`, `isValid`, `isSubmitting`, `isSubmitSuccessful`, `touchedFields`, `dirtyFields`. Senior reach in the typical form: `errors` (inline per-field errors), `isSubmitting` (submit button disabled/label), `isDirty` ("unsaved changes" guard on navigate-away). The rest are situational — name them, don't drill.
- **The re-render rule — the watch-out that is actually a feature.** `formState` is a proxy: reading a property *subscribes* the component to changes of that property, and reading it re-renders when it changes. So **destructure only what the component needs** (`const { errors, isSubmitting } = form.formState`). Reading the whole object, or reading fields you don't use, costs renders. This is non-obvious and worth a visual.

**Diagram — `RenderTracking` (provides its own card; do NOT wrap in `<Figure>`):** This is the single highest-value visual in the lesson. RHF's whole value prop is per-field re-render isolation. Build a small tree: `InvoiceForm` (root) with `CustomerField`, `EmailField`, `TotalField`. Use an `<Implementation>` toggle to contrast:
- Implementation "register (uncontrolled)": trigger "type in Customer" → renders only `CustomerField` (or even nothing at the React level, since the DOM owns it) — the form root and siblings stay cold. Three triggers, each lighting only its own field.
- Implementation "value in form root state (naive)" or "watch() in the root": trigger "type in Customer" → renders `InvoiceForm` + all three fields — the whole form churns.
Pedagogical goal: the misconception ("a form re-renders on every keystroke") dies in *which boxes light up*, exactly the case `RenderTracking` is built for (the doc names Unit 4 / forms as its design target). Title it "Why a registered input doesn't re-render the form." Keep to the 3–4 box tree.

- After the diagram, land the practical rule: keep `watch` and `formState` reads out of the form root; push them into the small child that needs the value. Bridge into the next section.

## watch and useWatch: subscribing to live values

The controlled *read* side — when you genuinely need the live value during typing.

- `watch('fieldName')` returns the live value and re-renders the calling component on every change of that field. `useWatch({ control, name })` is the same, scoped — call it **in a small child component** so only that child re-renders, not the form root. The pattern: a character counter, a conditional render ("show VAT field when country === 'EU'"), a derived total.
- The senior rule, stated as the takeaway of the `RenderTracking` diagram: **`watch` in the root re-renders the whole form on every keystroke; `useWatch` in a leaf isolates it.** Show the leaf pattern with `Code`:
  ```tsx
  const CharCount = ({ control }: { control: Control<InvoiceInput> }) => {
    const note = useWatch({ control, name: 'note' });
    return <span>{note?.length ?? 0} / 280</span>;
  };
  ```
- Note React Compiler context (course convention): the course runs `reactCompiler: true` and skips manual memo. `useWatch` isolation is the *architectural* lever for re-render scope, not `useMemo` — frame the choice as "scope the subscription," not "memoize." One sentence; don't over-explain.

**Tooltip candidate:** `useWatch` ("subscribes one component to a field's live value, re-rendering only that component").

## defaultValues and reset: the form's identity

Tie `defaultValues` (introduced under `useForm`) to its partner `reset`, framed as the form's identity/lifecycle.

- `defaultValues` declares the field set RHF tracks. Two uses: (a) empty defaults for create forms so every field is known, (b) prefilled defaults for edit forms — the row's current values. **The 2026 server-prefill flow:** the Server Component fetches the entity and passes it as a prop to the Client Component form; the form's `defaultValues` reads from the prop. State this as the anchor (no client fetch for prefill). Short `Code` showing `defaultValues: { customer: invoice.customer, total: invoice.total }` sourced from a prop.
- `form.reset(newValues?)` re-sets values *and* clears dirty/touched. The canonical move: after a successful save, `reset(savedValues)` so the form stays open showing the saved values with a clean dirty state (mirrors the Ch 044 "edit form stays put" concern — call back to it: there the native form used `useActionState` data as `defaultValue`; here `reset` is RHF's equivalent).
- **The batching watch-out:** calling `reset()` inside `onSubmit` *before* the `await createInvoice(...)` resolves resets the form before the action runs. Call `reset` *after* the `await` (or in the success branch). Short before/after via `CodeVariants` or an `Aside`. This is the L2 watch-out the chapter outline names.

## The shadcn layout layer: Field + Controller

Where the design system's field layout finally consumes RHF. **Teach the current `Field` family + `Controller` pattern (the divergence noted in the framing).**

- Frame it: every form in the course uses shadcn for the label/control/description/error row. Ch 044 L6 told the student shadcn's older `<Form>`/`<FormField>` set exists and is RHF-bound. Close that loop in two sentences: **shadcn now leads with the form-library-agnostic `Field` family** (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`), used **directly with RHF's `Controller`** — so the same layout primitives work whether the form is RHF, TanStack Form, or a native action. The legacy `<Form>` wrapper still works but isn't the recommended start. Keep the legacy mention to one clause; do not teach both.
- The canonical field, via **`AnnotatedCode`** (single block, stepped) using the verified shadcn shape:
  ```tsx
  <Controller
    name="email"
    control={form.control}
    render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor={field.name}>Send invoice to</FieldLabel>
        <Input {...field} id={field.name} type="email" aria-invalid={fieldState.invalid} />
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )}
  />
  ```
  Steps: (1) `Controller` wires the field into RHF (`name` + `control`); (2) `field` spreads onto `<Input>` — `value`/`onChange`/`onBlur`/`ref`; (3) `fieldState.invalid`/`fieldState.error` drive `data-invalid`, `aria-invalid`, and `<FieldError errors={[...]}>`; (4) `FieldLabel htmlFor={field.name}` + `aria-invalid` keep the a11y wiring (the WCAG floor from Ch 027/044). Note `FieldError` takes an `errors` *array*.
- For native inputs the layout layer pairs with `register` too — but `Controller` is the shadcn-documented path because it surfaces `fieldState` cleanly to the layout; show the `register` variant in one line only if it doesn't bloat the section (a `text`/`number` field via `register` inside a `Field`, reading the error from `formState.errors`). Keep the focus on the documented `Controller`+`Field` shape to avoid two competing patterns.
- `FieldGroup`/`FieldSet`/`FieldLegend` named in one sentence as the grouping/spacing wrappers (the `<FormItem>` successor) — recognition only.

**Tooltip candidate:** `fieldState` ("per-field RHF state — `invalid`, `error`, `isDirty`, `isTouched` for this one field").

## The canonical form skeleton

The payoff section: assemble everything into the one skeleton L3/L4/L5 build on. This is the artifact the student should be able to reproduce.

- One `Code` block (`title` it, e.g. `app/invoices/new-invoice-form.tsx`), `'use client'`, showing the full shape:
  ```tsx
  const form = useForm<InvoiceInput>({
    resolver: zodResolver(InvoiceSchema), // wired next lesson
    defaultValues: { customer: '', email: '', total: 0 },
    mode: 'onBlur',
  });

  const onSubmit = async (values: InvoiceInput) => {
    const result = await createInvoice(values);
    // map result.error.fieldErrors back into the form — next lesson
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Controller + Field per input */}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Create invoice'}
      </Button>
    </form>
  );
  ```
- Annotate (prose, not a stepped component — it's a summary) the five primitives in their places: `useForm` (container), `Controller`/`register` (registration), `handleSubmit` (submit), `formState` (read), and the forward-refs (`resolver` → L3, error mapping → L3). Restate the 3-concern spine one final time over this skeleton.
- Explicitly flag what's deferred so the skeleton reads as honestly incomplete (mirrors Ch 044 L2's "honestly incomplete" close): the resolver wiring, the `z.input`/`z.output` typing, and the server-error round-trip are all next lesson; field arrays (L4) and wizards (L5) extend this same skeleton.

## Check your understanding (consolidation)

A short closing check tying the 3-concern spine to the primitives. Two exercises max (the lesson is long; don't overload the tail).

- **`Matching`** — match each primitive to its concern/job: `useForm` → "create the form container", `register` → "wire a native input (DOM owns the value)", `Controller` → "bridge a controlled UI-library input", `handleSubmit` → "intercept submit, validate, hand off typed values", `formState` → "read errors / submitting / dirty", `useWatch` → "subscribe a child to a live value". 6 pairs (the comfortable bound).
- **`MultipleChoice`** (single-correct) — the `register`-vs-`Controller` decision: a question giving a field spec (e.g. "a shadcn `Combobox` for selecting a customer") and asking which primitive wires it, with distractors that catch the "use Controller for everything" and "use register for everything" misconceptions. `McqWhy` explains: native input → `register` (default, no extra renders); component that owns its value via `value`/`onChange` → `Controller`.
- Optionally a `PredictOutput`-style or `Dropdowns` micro-check on the `reset()`-before-`await` ordering bug if room allows — but cap at two graded widgets in this section; the build agent may fold the ordering bug into the `defaultValues`/`reset` section instead.

## External resources (optional, LinkCards)

`ExternalResource` cards — keep to 2–3:
- RHF `useForm` API reference (react-hook-form.com/docs/useform).
- RHF `Controller` / `useController` reference.
- shadcn React Hook Form guide (ui.shadcn.com/docs/forms/react-hook-form) — the current `Field` + `Controller` pattern.
A `VideoCallout` is optional and lower priority — the resolver/wizard videos fit later lessons better; only add one if a tight "RHF basics: useForm/register/handleSubmit" video is found. Do not force it.

# Scope

**Prerequisites to redefine only briefly (one clause each, do not re-teach):**
- Native `<form action={serverAction}>`, uncontrolled inputs, `FormData`, the auto-reset on success — Ch 044, known. Referenced as the "before."
- The Server Action five-seam shape and `Result` contract — Ch 043, known. The action is unchanged; do not re-explain its body.
- Controlled vs uncontrolled component, trust boundary, the four triggers, the submit-changes-hands seam — Ch 045 L1, known and defined. Reuse verbatim; restate in one clause, don't re-derive.
- `'use client'`, hooks-are-client-only, React Compiler auto-memo — Units 4/earlier, known.
- shadcn copy-into-repo model, `cn()`, Radix a11y dividend, `asChild` — Ch 027, known.

**This lesson does NOT cover (reserved for later, name as forward-ref at most):**
- **The Zod resolver setup itself** — `zodResolver` internals, install, how it maps schema errors to `formState.errors`, `z.input` vs `z.output` for transform schemas, `mode` vs `reValidateMode` pairing, the `FormData`-vs-typed-object action call split, and **mapping server-returned `fieldErrors` back via `setError`** (`applyServerErrors`). All L3. In L2 the resolver appears only as `zodResolver(InvoiceSchema)` with a "wired next lesson" comment; server-error mapping appears only as a `// next lesson` comment in `onSubmit`. **This boundary is load-bearing — do not bleed L3 content into L2.**
- **`useFieldArray`** and dynamic row sets (`append`/`remove`/`move`/`replace`, `field.id`, `z.array` shape) — L4.
- **`FormProvider`/`useFormContext`**, multi-step wizards, `trigger(fieldNames)`, `.pick()` per-step validation, `shouldUnregister` — L5. (`FormProvider` may be named in one clause when explaining that the shadcn layout shares context, but its wizard use is L5.)
- The full shadcn component CLI/registry/theming surface — Ch 027 owns it. Here only the `Field` family + `Controller` usage.
- Progressive-enhancement loss under RHF — established L1; not re-argued here (it's a decision-lesson point, not a mechanics point).
- The async-validation `.refine()` route-handler path, drag-and-drop reordering, draft-save persistence — later lessons / out of chapter scope.

# Code conventions notes (for build agents)

- Arrow-function components bound to `const`; named exports (`export const NewInvoiceForm = ...`). The form file is `'use client'`; `kebab-case` filename (`new-invoice-form.tsx`).
- `onSubmit` is `const onSubmit = async (values: InvoiceInput) => {...}` — arrow, typed param. The action `createInvoice` is the unchanged Server Action (its own `'use server'` file).
- React 19: refs are a regular prop; no `forwardRef`. No `useMemo`/`useCallback`/`React.memo` (React Compiler on) — re-render scope comes from `useWatch` placement, not manual memo. Say this where the re-render model is taught.
- Schema/type naming per conventions: the canonical schema is `invoiceSchema` (camelCase) per the Zod-schema naming rule, but L1 shipped `InvoiceSchema`/`InvoiceInput` in user-facing prose. **Continuity wins for the running example** — keep `InvoiceSchema`/`InvoiceInput` to match L1's already-published `CodeVariants`; flag to the agent that this is a deliberate continuity choice over the strict camelCase schema convention. (Do not introduce a second name.)
- Tailwind/shadcn: `Field`/`FieldLabel`/`FieldError`/`Input`/`Button` imported from `@/components/ui/*`. `aria-invalid`/`htmlFor` wired (WCAG floor). `className` last in any `cn()` call.
- Staged-shape divergences to NOTE in-lesson so they read as intentional: (1) the resolver is shown but unexplained (full wiring deferred to L3); (2) `onSubmit`'s error-mapping is a comment, not code (deferred to L3). Both are deliberate per the chapter's lesson split.
