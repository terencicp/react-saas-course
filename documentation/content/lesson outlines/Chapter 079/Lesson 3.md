# Chapter 079 — Lesson 3 outline

## Lesson title

- Page title: **Wire the forms and the Next-gate** (chapter-outline title fits — atomic selectors + derived validity is exactly what ships).
- Sidebar: **Forms and the Next-gate**

## Lesson type

`Implementation`

The L3 student work is genuinely testable headlessly: build a vanilla store, set fields, assert `selectIsStepValid` / `selectStepErrors` against `getState()` — the same shape as the shipped `Lesson 2.ts` store test. The repo currently ships `Lesson 3.ts` as a `describe.todo` placeholder; the test-coder replaces it with real assertions over the selector logic (the `[tested]` slice). Re-render scoping, URL advance, and inline-error rendering stay by-hand (`[untested]`).

## Lesson framing

The student installs the **atomic-selector-as-default** discipline and the **derive-validity-in-selectors, never-on-the-slice** call: each field on steps 1–3 becomes its own client component subscribing to one field + one setter + one atomic error primitive, so a keystroke re-renders only that field; validity and field errors are computed by running the step's Zod schema over the current slice inside `selectors.ts`, and the footer's Next-gate consumes a *primitive* `.success` boolean so it re-renders only when validity flips. The senior payoff: a single-source-of-truth Zod contract drives the UX gate client-side while the same schema re-parses server-side in L4 — the gate is UX, not the security boundary.

## Codebase state

### Entry
- L2 shipped: four slice setters live (`setContactField`/`setBillingField`/`setPreferenceField`/`togglePreferenceChannel`), `goNext`/`goBack`, store-wide `reset`, the `useRef`-pinned `WizardStoreProvider` on the shared `/customers/new` layout, the typed `useWizardStore<T>(selector)` hook. The wizard navigates across the four route segments with one surviving store instance; the inspector snapshot mirrors the initial store.
- But every field still renders inert: the step pages are static markup (no `value`/`onChange`), `selectors.ts` stubs `selectIsStepValid` to `false` and `selectStepErrors` to `{}`, and `footer.tsx` renders a hardcoded-disabled Next with no store wiring. `wizard-types.ts` and `schemas.ts` are provided read-only.

### Exit
- `selectors.ts` complete: atomic `selectContactFirstName/LastName/Email/Phone`, a `steps` array pairing each schema with its slice, `selectIsStepValid` (`schema.safeParse(slice).success`, step 4 → `true`), `selectStepErrors` (`z.flattenError(...).fieldErrors`, `{}` on success).
- `step-1/2/3/page.tsx` decomposed into per-field client components, each binding one atomic selector + setter + atomic error read (`selectStepErrors(s).<field>?.[0]`) and calling `useBroadcastRender('<field>')`.
- `footer.tsx` reads `selectCurrentStep` + `selectIsStepValid` + `goNext`/`goBack`, disables Next on invalid, renders Next only while `currentStep < 4`, and Next's handler bundles `goNext()` + `router.push(...)`; footer calls `useBroadcastRender('footer')`.
- Step 4 still a stub (L4 owns it). Typing writes into slices, inline errors show, Next gates per validity, Back preserves draft.

## Lesson sections

Implementation contract order: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: each step's form writes into its slice with inline field errors, and Next enables only when the current step's data is valid. Then a one-paragraph description (or a small capture) of the working behavior: type into a field → value persists and only that field re-renders; bad input → inline error + Next stays disabled; whole step valid → Next enables and advances both URL and store; Back returns with prior data intact. No diagram needed — prose carries the flow.

### Your mission (header: "Your mission")
Prose paragraph then one requirements checklist (the only list). Brief carries **no implementation hints**; weave Features / Constraints / Out-of-scope into prose.

**Feature (user terms):** Each step's form binds to the draft store — typing persists per field, invalid input shows an inline error, and the footer's Next button stays disabled until the whole current step is valid, then advances to the next step.

**Constraints (woven, non-hint):**
- Typing in one field must re-render only that field's input — not its siblings, not the progress header (the per-field decomposition is the means; the constraint is the surgical re-render, observable on the inspector's render-counter panel).
- Validity and field errors are *derived*, never stored on a slice — the per-step Zod schema is the single source of truth.
- The Next-gate is UX only; the action re-parses server-side in L4, so a bypass still fails at the boundary.
- Inline errors render as short `text-destructive` text under the field (Unit 3 UX baseline) — no toast.
- Advancing must move store `currentStep` and the URL together in one handler (no effect watching `currentStep` to fire the push — AP #6, explicit over magic).

**Out of scope:** the step-4 review and any submit (L4).

**Requirements checklist** (each tagged for the test-coder):

1. `[tested]` Running a step's schema over a fully-valid slice reports the step valid; an empty or partially-filled slice reports it invalid. (selector logic: build store, set fields, assert `selectIsStepValid` per `currentStep`)
2. `[tested]` An invalid field surfaces its message through the step's field-error map, and a valid slice yields no errors. (assert `selectStepErrors(state).<field>` shape — e.g. invalid `email`, empty `firstName` — and `{}` when the slice parses)
3. `[tested]` On the review step (step 4) the gate reports valid — there is no step-4 schema entry, so the gate does not block the review. (`selectIsStepValid` returns `true` when `currentStep === 4`)
4. `[untested]` Typing in a step-1/2/3 field persists its value in the slice; leaving and returning to the step shows the typed value. (store-write + nav round-trip, by-hand)
5. `[untested]` An invalid value renders an inline error under its field (e.g. "Invalid email"); a valid value clears it. (DOM render, by-hand)
6. `[untested]` Next is disabled while any field on the current step is invalid or empty, and enables only when the whole current slice parses. (footer UX, by-hand)
7. `[untested]` Clicking Next advances the URL to the next segment and the store's `currentStep`, and the progress indicator highlights the new pip; Back returns with prior data intact. (router + store, by-hand)
8. `[untested]` Typing ten characters into one field increments only that field's render counter by ten, leaves siblings flat, and re-renders the footer at most once (when validity flips). (inspector render-counter, by-hand)

Note for the writer: render the checklist with `Checklist`/`ChecklistItem` carrying `tested`/`untested` chips per the component API.

### Coding time (header: "Coding time")
One line directing the student to implement against the brief and the test. Then the full reference solution in a `<details>` (writer wraps it). Organize as it appears in the repo:

- **`selectors.ts`** — `Code` block. Atomic contact selectors; the `steps` array `[{schema: contactSchema, slice: s => s.contact}, ...]` (three entries, no step-4 entry); `selectIsStepValid` indexing `steps[currentStep - 1]` and returning `step ? step.schema.safeParse(step.slice(state)).success : true`; `selectStepErrors` returning `z.flattenError(result.error).fieldErrors` on failure, `{}` otherwise. Rationale callouts: validity/errors derived here not on the slice (keeps slices data-only, single source of truth = the schema); the `?? true` / `step ? ... : true` fallback is why step 4 doesn't block the gate; whole-slice validation indexed by `currentStep` over per-field "touched" tracking keeps the model simple.
- **`step-1/page.tsx`** — `AnnotatedCode` (focus the student on the three subscriptions per field: atomic value selector, the setter, the atomic error primitive `selectStepErrors(s).firstName?.[0]`, plus `useBroadcastRender('firstName')`). Four per-field components composed by a parent that subscribes to nothing keystroke-changing. **Critical callout:** subscribe to the atomic error primitive `selectStepErrors(s).<field>?.[0]`, never the whole error object — a whole-object selector returns a fresh object each render and trips React's `getSnapshot`/`useSyncExternalStore` infinite-loop guard, hard-crashing the page. Pair with the standard atomic-vs-whole-slice rationale (a whole-slice read returns a fresh object, fails `Object.is`, re-renders every keystroke).
- **`step-2/page.tsx`** — `Code` (same pattern, abbreviated). Eight billing field components via `setBillingField`; `paymentTerms` a 3-option select, `country` a 2-letter input. Note `line2` is the only field with no `.min(1)` so it never errors.
- **`step-3/page.tsx`** — `Code`. `defaultCurrency`/`language` selects via `setPreferenceField`; the three `channels` checkboxes bound to `togglePreferenceChannel`.
- **`footer.tsx`** — `Code`. Reads `selectCurrentStep`, `selectIsStepValid`, `goNext`, `goBack`; `onNext` bundles `goNext()` + `router.push(\`/customers/new/step-${currentStep + 1}\` as Route)`; Next `disabled={!isValid}`, rendered only while `currentStep < 4`; `useBroadcastRender('footer')`. Rationale: the gate derives a *primitive* `.success`, so although `safeParse` runs a fresh result every store change, `Object.is(true, true)` short-circuits the re-render — the footer flips only when validity changes. Bundling store action + router push in one handler is canonical; splitting via a `useEffect` watching `currentStep` is the rejected effects-as-orchestrators pattern.

Coverage of `[untested]` requirements in prose: error-text placement/styling (Unit 3 baseline), `goNext` appending to `completedSteps` inline (de-duped) drives the progress pips, the Next-hidden-on-step-4 branch, and the surgical-re-render claim made literal by per-field decomposition.

Links (don't re-explain): Zod schemas + Result → chapter 042/043 regular lessons; the `'use client'` / Server-Client boundary → its owning Unit 4 lesson. Note on not pre-optimizing: `safeParse` on every store change is cheap at this schema size; debounce/memoize is a future move for very large schemas.

### Moment of truth (header: "Moment of truth")
- Test command: `pnpm test:lesson 3`.
- Expected pass output: the selector suite green — `selectIsStepValid` and `selectStepErrors` over the constructed store (per-step valid/invalid, error-map shape, step-4 returns valid). Show the passing summary line.
- Then a by-hand checklist (the `[untested]` items 4–8) the student ticks against the inspector and browser: slice-write + leave/return persistence; inline error appears/clears + Next gates; Next pushes URL + advances `currentStep` + highlights new pip; Back preserves draft; render-counter shows only the typed field incrementing (siblings flat, footer at most once); and the diagnostic flip — temporarily change one field's selector to a whole-slice read `useWizardStore((s) => s.contact)` and watch all four contact fields re-render per keystroke, then revert.

## Scope

- Store skeleton, slices, provider, typed hook — **L2** (entry dependency, not re-taught here).
- The composite Server Action, `useShallow` review, submit button with `useTransition` double-submit guard, success-reset, redirect — **L4**.
- Server-side re-parse / tenancy at the action boundary — **L4** (this lesson only frames the client gate as UX, not the security boundary).
- The `createStore`-vs-`create` per-request-leak reasoning and the provider-placement bug — **L2**.
- Step-4 review reads three slices via `useShallow` — **L4** (`useShallow` does not appear in this lesson; atomic/primitive selectors only).
