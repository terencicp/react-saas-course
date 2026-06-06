sources:
  45.1: The four triggers that flip the choice
  45.2: 'The five primitives: useForm, register, Controller, handleSubmit, formState'
  45.3: 'zodResolver: one schema, both sides of the wire'
  45.4: 'useFieldArray: dynamic lists of fields'
  45.5: Multi-step wizards with FormProvider

questions:
  - source: 45.1
    question: |
      A teammate proposes moving every form in the app to React Hook Form "so they all work the same way," starting with the login form (email, password, one submit). Which forms actually justify the reach — select all that apply.
    choices:
      - text: |
          A signup form with a live password-strength meter that fills as the user types.
        correct: true
      - text: |
          An invoice editor where the user adds and removes line-item rows.
        correct: true
      - text: |
          The login form — email and password, submitted once.
        correct: false
      - text: |
          An edit-profile form: name, bio, and an avatar URL, saved in one submit.
        correct: false
    why: |
      The threshold is a disjunction of four specific triggers, not a vibe about complexity. Per-field validation timing past submit (the strength meter) and a dynamic field set (add/remove line items) each fire one. Login and edit-profile fire none — fixed fields, one submit, errors on the way back — so they stay native, where the lower coordination cost and progressive enhancement are free wins. "Make them all consistent" is exactly the I-learned-a-new-tool trap the lesson names.

  - source: 45.2
    question: |
      You add a live `0/280` character counter beside a registered `note` field. You read the value with `const note = form.watch('note')` at the top of the form component. It works, but typing anywhere in the form now feels laggy. What's the fix?
    choices:
      - text: |
          Move the read into a small child component that calls `useWatch({ control, name: 'note' })`, so only that child re-renders per keystroke instead of the whole form root.
        correct: true
      - text: |
          Wrap the form body in `useMemo` so React skips re-rendering the untouched fields while `note` changes.
        correct: false
      - text: |
          Switch the `note` input from `register` to `Controller` so RHF stops re-rendering the form on its changes.
        correct: false
    why: |
      Calling `watch` in the form root subscribes the root to that field, so every keystroke re-renders the entire form — the registered inputs included, which is why it lags. Re-render scope in RHF is a subscription-placement problem, not a memoization one: push a `useWatch` into the leaf that needs the value and only that leaf re-renders. `useMemo` is the wrong lever (and the course runs the React Compiler anyway), and `Controller` would make the field controlled — adding re-renders, not removing them.

  - source: 45.3
    question: |
      Your `InvoiceSchema` has `total: z.coerce.number<number>().positive()`. A teammate types the form as `useForm<z.infer<typeof InvoiceSchema>>()`, ships it, and it type-checks fine. Why is the senior reviewer still asking for `useForm<InvoiceInput, unknown, Invoice>` instead?
    choices:
      - text: |
          `z.infer` is the *output* type, so it mistypes what `register` and `defaultValues` track (the *input* side) — it compiles today only because the gap is invisible until a transform's input and output diverge, and `coerce` already makes them diverge.
        correct: true
      - text: |
          The single-generic form disables the resolver, so validation silently never runs until the three-parameter form is used.
        correct: false
      - text: |
          `z.infer` is slower at runtime because it re-derives the type on every render; the explicit generics are memoized.
        correct: false
    why: |
      A coerced or transformed schema has a different input type than output type. RHF *tracks* the input (what `defaultValues` and `register` hold) and *hands `onSubmit`* the output. `z.infer` resolves to the output, so the single-generic form types the tracked side wrong — it just happens not to error here, and would silently mislead the moment anyone leans on it. The three-parameter `<input, context, output>` form is correct from the first line, before any transform exists to expose the shortcut. Generics are types only — they don't switch the resolver on or off or cost anything at runtime.

  - source: 45.4
    question: |
      A line-items form renders rows with `key={index}`. Add works, and removing the *last* row works — but when the user deletes a middle row while editing a row below it, their half-typed text and cursor jump to the wrong line. What's going on?
    choices:
      - text: |
          The key is the row's *position*, not its identity, so removing a middle row shifts the survivors up and React reuses the old DOM node for a different row. Key by `field.id` — RHF's stable per-row render key — and the survivors keep their nodes.
        correct: true
      - text: |
          `remove(index)` mutates the array in place; you need `replace` with a fresh copy so React sees a new reference and re-renders cleanly.
        correct: false
      - text: |
          The rows are missing the line's domain `id` from the database, so React falls back to matching by position; add `id` to each row's `defaultValues`.
        correct: false
    why: |
      `useFieldArray` exists for the reorderable case, so the index-as-key bug bites on every operation that isn't append-to-end: the key tracks where a row sits, not which row it is, so a removed middle row makes React keep the old node and stuff the next row's data into it. `field.id` is RHF's stable render identity for exactly this. Note `field.id` is *not* the line's domain `id` — that one decides insert-versus-update on the server and is never the React key — and `remove` already re-indexes correctly, so `replace` is no fix.

  - source: 45.4
    question: |
      In your line-items form, a bad amount on row 2 renders fine through that row's `Controller`, but the schema's `.min(1, 'Add at least one line')` rule never shows when the user empties the list. You're reading `form.formState.errors.lineItems?.message`. Where does that array-level error actually live?
    choices:
      - text: |
          `form.formState.errors.lineItems?.root` — array-level rules report on the field's `root` slot, not on `.message` and not on any row.
        correct: true
      - text: |
          `form.formState.errors.lineItems?.[0]?.message` — the array error attaches to the first row, so reading index 0 surfaces it.
        correct: false
      - text: |
          `form.formState.errors.root?.lineItems` — whole-array errors hang off the form's top-level `root`, keyed by field name.
        correct: false
    why: |
      A field array produces errors at two paths. Per-row errors land at `errors.lineItems[index].field` — but you rarely read that raw, because each row's `Controller` hands you its own `fieldState.error`. The array-as-a-whole rule (`.min(1)`) attaches to neither a row nor `.message`; RHF parks it at `errors.lineItems.root`. Reading `.message` or index 0 is exactly why the "add at least one line" message silently never appears.

  - source: 45.5
    question: |
      In a three-step invoice wizard, clicking **Next** on step 1 should validate *only* step 1's fields (customer, email) and advance if they pass. Which call does that correctly?
    choices:
      - text: |
          `await form.trigger(fieldsForStep(1))`, advancing if it returns `true` — `trigger` runs the resolver against just the named fields.
        correct: true
      - text: |
          `form.handleSubmit(goNext)` — it validates, then advances on success.
        correct: false
      - text: |
          Advance only when `form.formState.isValid` is `true`.
        correct: false
    why: |
      `handleSubmit` always validates the *whole* schema, so it fails on steps 2 and 3's empty fields and never lets you off step 1 — it's the tool for the final submit. `isValid` is the same whole-form scope: `false` until every step passes. Only `trigger(fieldNames)` runs the resolver against a subset; it's async, so you `await` it (skip the await and you branch on a truthy promise and the gate always passes). Two scopes, two APIs: `trigger` for Next, `handleSubmit` for the end.

  - source: 45.5
    question: |
      A wizard uses conditional rendering (`{step === 1 && <CustomerStep />}`) and sets `shouldUnregister: true` on `useForm` "to keep form state tidy." A user fills step 1, advances, then clicks **Back** — step 1's fields are blank. What happened?
    choices:
      - text: |
          Advancing unmounted `CustomerStep`, and `shouldUnregister: true` drops an unmounting field's value from form state — so Back remounts empty. The default (`false`) keeps the values; remove the line.
        correct: true
      - text: |
          `Back` calls `setStep(step - 1)`, which re-runs `useForm` and resets every field to its `defaultValues`. Guard the reset behind a `useRef`.
        correct: false
      - text: |
          Each step needs its own `useForm` so its values persist independently; the shared root form can't hold a hidden step's data.
        correct: false
    why: |
      With conditional rendering, a step's inputs unmount when you leave it, and `shouldUnregister` decides whether their values survive. The default is `false` — unmounted fields keep their values, so Back repopulates — which is exactly what a wizard wants; `true` drops them and ships the data-loss bug. Note the per-step `useForm` idea is the opposite of right: one `useForm` at the root, shared via `FormProvider`, is what keeps every step's data alive in the first place.
