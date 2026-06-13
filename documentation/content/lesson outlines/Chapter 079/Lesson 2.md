# Chapter 079 — Lesson 2 outline

## Lesson title

Chapter-outline title "Build the store skeleton" fits — it names the deliverable (the store's data layer) without overclaiming the provided provider as student work. Keep it.

- **Full title:** Build the store skeleton
- **Sidebar title:** Store skeleton

## Lesson type

`Implementation`.

Rationale (overrides the chapter outline's "no automated test / confirm by hand" framing): the student's authored work — the four slice setter bodies and the store-wide `reset` — are pure vanilla-Zustand units. They are testable headlessly without React: `createWizardStore()` → call a setter / `goNext` / `goBack` / `reset` → assert `store.getState()`. The chapter outline shipped `lesson-verification/Lesson 2.ts` as `describe.todo('Lesson 2')`; flag for the test-coder that a real suite is feasible here and gives L2 an observable, runnable verification of the student's slices and reset. The provider/hook/per-request boundary outcomes stay `[untested]` (provided infrastructure, confirmed by hand against the inspector).

## Lesson framing

The student walks away having stood up the canonical Zustand-on-App-Router store skeleton: a `createStore`-from-vanilla factory composing four typed slices, with a store-wide `reset`. The senior payoff is the per-request boundary discipline — understanding *why* the store uses `createStore` (not `create`), why the provider pins it in `useRef` on the shared layout (not `useState`, not a step page), and why the typed hook throws outside its provider. The student authors the slices and reset; the provider and hook are provided to study as the reference for the next surface they stand up. The runnable midpoint: the store survives navigation across all four route segments and mirrors to the inspector, with fields still unwired by design (the form-writing payoff lands in Lesson 3).

## Codebase state

### Entry

The starter runs locally (Lesson 1 left it serving the chapter 062 customers surface plus the four wizard route-segment shells off the seeded in-memory store). The store's data layer is stubbed: `contact-slice.ts`, `billing-slice.ts`, `preferences-slice.ts`, `meta-slice.ts` carry no-op setter bodies (`setContactField: () => {}`, `goNext: () => {}`, etc.) under `// TODO(L2)`, and `store.ts`'s `composeSlices` has `reset: () => {}`. The slice *types* and `initialWizardData` (`wizard-types.ts`), the `composeSlices` spread + `createWizardStore` factory shell (`store.ts`), the `useRef`-pinned `WizardStoreProvider` (with its scaffold-only `STORE_MODULE_SCOPED` / `PROVIDER_ON_STEP_PAGE` debug branches), and the typed `useWizardStore<T>(selector)` hook are all provided complete. The layout already mounts the provider. Because every setter is a no-op, the inspector snapshot mirrors the initial empty store but never changes, and Next stays disabled.

### Exit

The four slice factories have real setter bodies and `store.ts` has a working `reset`. The store's data layer is complete: a created store handle responds correctly to `setContactField` / `setBillingField` / `setPreferenceField` / `togglePreferenceChannel` / `goNext` / `goBack` / `reset` (asserted by the new Lesson 2 suite). The provided provider still owns the visible nav-survival and inspector-mirroring behavior, so the wizard navigates across all four segments with the one store instance alive. Fields remain unwired — no form calls the new setters yet (Lesson 3). Forward-referenced files (`selectors.ts`, the step pages, `footer.tsx`, `actions.ts`, the submit button) stay stubbed.

## Lesson sections

Implementation type → contract section list: *Goal + Finished result* (intro, no header) / *Your mission* / *Coding time* / *Moment of truth*.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: stand up the wizard's draft store so its slices accept writes and reset cleanly. Then one short paragraph (or a small inspector screenshot, optional — prose is sufficient) describing the finished state: the provided provider keeps one store instance alive as the wizard navigates step-1 → step-4 and back, the inspector store-snapshot mirrors the initial empty store, and the new Lesson 2 test suite passes green against the authored slices and reset. Name honestly that fields are still inert — the form-writing payoff is Lesson 3.

### Your mission

Header: "Your mission". Open with prose framing this as the heaviest mechanics lesson in the chapter — the store every later lesson reads from. Weave the two load-bearing senior calls as prose (they shape the solution but are *provided*, so frame them as "study the provided provider/hook to understand why"):

- `createStore` from `zustand/vanilla`, not `create` from `zustand` — `create` puts a module-scoped store in the server bundle's memory and leaks across requests the first time two users hit the layout in the same Node process (the load-bearing reason carried from chapter 078 lesson 2). The provided factory already uses `createStore`; the mission is to understand the choice.
- The provider belongs on the shared `/customers/new` layout, pinned in `useRef` with lazy init (not `useState(() => …)`, which strict-mode double-invoke can double-create; not a step page, which re-mounts and wipes the draft on every navigation). Provided and already mounted — study it.
- The typed hook's throw-on-missing-provider guard is the runtime contract catching a component reaching outside the provider subtree. Provided — study it.

Then state what the student actually authors, still in prose, no hints on implementation shape beyond the requirements: the four slice setter bodies and the store-wide `reset`.

Constraints to weave in (non-functional, shape the solution): every `StateCreator` is parameterized on the full `WizardStore` (so `set`/`get` see the whole store including `reset` from inside any slice); middleware generics are empty tuples (`[]`) because this chapter uses no `persist`/`devtools`/`subscribeWithSelector`; `completedSteps` stays a `number[]`, never a `Set`, so the inspector snapshot serializes over `postMessage`; validity is *never* stored on a slice (derived in `selectors.ts`, Lesson 3) — slices hold data + setters only.

Out of scope (one line): all form wiring, the Next-gate, and submit — fields stay unwired at lesson end by design.

**Functional requirements** (numbered list, each tagged; the `[tested]` items are the headless vanilla-store assertions for the test-coder, the `[untested]` items are provider-infrastructure outcomes confirmed by hand against the inspector). Phrase each as an observable outcome, never a file/export:

1. `[tested]` Setting a contact field on the store updates only that field and leaves the other contact fields untouched. (Covers `setContactField` merge.)
2. `[tested]` Setting a billing field updates only that field, including the `paymentTerms` enum value. (Covers `setBillingField`.)
3. `[tested]` Setting a preference field (currency or language) updates only that field and leaves `channels` untouched. (Covers `setPreferenceField`.)
4. `[tested]` Toggling a preference channel adds it when absent and removes it when present, leaving other channels in place. (Covers `togglePreferenceChannel` array membership.)
5. `[tested]` Advancing the step moves `currentStep` forward by one and records the step just left in `completedSteps` without duplicating an already-recorded step. (Covers `goNext` increment + de-duped append.)
6. `[tested]` Going back moves `currentStep` back by one but never below 1. (Covers `goBack` `Math.max(1, …)` clamp.)
7. `[tested]` After filling several fields and advancing steps, calling reset returns every slice's data and `currentStep`/`completedSteps` to their initial values while leaving the setters and actions callable. (Covers replace-mode `reset` producing a complete store.)
8. `[untested]` Navigating to `/customers/new/step-1` loads the step with the progress indicator reading the current step and the first pip highlighted — the provided progress component resolves the hook against the mounted store.
9. `[untested]` The inspector store-snapshot panel mirrors the initial store (empty slices, `currentStep: 1`, `completedSteps` empty) and stays in sync while the iframe is mounted.
10. `[untested]` Navigating forward and back across step-1 → step-4 keeps the one store instance alive — the snapshot does not reset on navigation.
11. `[untested]` A component reading the store from outside the provider subtree throws a clear `useWizardStore must be used within a WizardStoreProvider` error rather than failing silently.
12. `[untested]` The store is per-request: a second session opening the wizard sees its own empty store, not the first session's draft (provider on the shared layout + vanilla `createStore`).

Use the `Checklist` / `ChecklistItem` component with `tested`/`untested` chips for this list (the only list in the section).

### Coding time

Header: "Coding time". One line directing the student to implement against the brief and the Lesson 2 tests, framed as material to read after attempting. Wrap the full solution in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo (slices first under `_lib/wizard/`, then `store.ts`, then the provided provider/hook/layout as study material):

- **`contact-slice.ts` / `billing-slice.ts`** — identical shape: data object + a per-field setter that merges one key onto the slice object: `setContactField: (key, value) => set((s) => ({ contact: { ...s.contact, [key]: value } }))`. No `validate…` on the slice.
- **`preferences-slice.ts`** — `setPreferenceField` mirrors the merge (note its `K` excludes `'channels'` per the provided type); `togglePreferenceChannel` adds the channel when absent, filters it out when present, in one `set`.
- **`meta-slice.ts`** — `goNext` increments `currentStep` and appends the *current* step to `completedSteps` de-duped, in one `set`; `goBack` clamps with `Math.max(1, currentStep - 1)`. No `markStepComplete`, no `validate…`.
- **`store.ts`** — `reset: () => a[0]({ ...composeSlices(...a), ...initialWizardData }, true)` inside `composeSlices` (the `composeSlices` spread + `createWizardStore` factory are provided; only `reset` is authored). `a` is the `StateCreator` args tuple — `a[0]` is `set`, called in replace mode (second arg `true`).

Decision rationale, one or two sentences each: `createStore` over `create` (named import is where the per-request leak is prevented); `useRef` over `useState` for pinning (strict-mode double-invoke; `useRef` lazy-init is React's documented pattern for refs holding initialized values); replace-mode `reset` over a partial `set` (overlay fresh action identities with blank `initialWizardData` to produce a *complete* store, not a partial merge); empty middleware generics (no `persist`/`devtools` here); `completedSteps` as `number[]` not `Set` (serializes over `postMessage`).

Coverage of every `[untested]` requirement: the throw-on-missing-provider contract (req 11), the provider's single placement on the shared layout (reqs 8/10/12), and why the provided progress indicator already consumes the store through two atomic selectors `currentStep` + `completedSteps` (req 8).

Callout on the `composeSlices = (...a) => ({ ...createContactSlice(...a), … })` spread — it looks unusual at a glance but is the standard `StateCreator` composition; the `(...a)` forwarding is how each factory receives the same `set`/`get`/`store` triple.

For the App Router Server/Client boundary and `'use client'`, link to the owning regular lesson rather than re-explaining.

**Code components:**
- Slice files: `Code` blocks (simple, self-contained) — group the four slices with `Tabs` or present sequentially.
- `store.ts` `reset` line: `AnnotatedCode` is warranted — direct focus to (a) `a[0]` as `set`, (b) the `composeSlices(...a)` re-spread for fresh action identities, (c) the `, true` replace flag, (d) the `...initialWizardData` overlay. This is the single most opaque line in the lesson.
- The provided `wizard-store-provider.tsx`: `AnnotatedCode` to walk the per-request boundary — the `useRef` lazy-init guard, `createWizardStore()` per mount, the `useBroadcastSnapshot` wiring — while explicitly flagging the `STORE_MODULE_SCOPED` / `PROVIDER_ON_STEP_PAGE` branches as scaffold-only (not part of the architecture the student authors). Frame as study material.
- `createStore` vs `create`: `CodeVariants` (incorrect `create` / correct `createStore`) crisply shows the per-request-leak contrast in two short tabs.
- The provided `use-wizard-store.ts` hook: `Code` block, callout on the `if (store === null) throw` guard.

No diagram is needed — the per-request boundary is carried by the provider `AnnotatedCode` plus the `create`-vs-`createStore` `CodeVariants`; prose and the inspector demo cover the rest.

### Moment of truth

Header: "Moment of truth". The automated test command and expected pass output, then the by-hand inspector checks for the `[untested]` provider-infrastructure outcomes.

- Test command: `pnpm test:lesson 2` (script `node scripts/test-lesson.mjs`). Expected: the Lesson 2 suite passes green — every slice-setter, `goNext`/`goBack`, and `reset` assertion (reqs 1–7) reports pass. Note for the test-coder: replace the `describe.todo('Lesson 2')` placeholder with the real headless vanilla-store suite (no React render needed; `createWizardStore()` + `store.getState()` assertions).
- By-hand checklist (`Checklist`, the `[untested]` reqs 8–12) against the inspector and browser:
  - `/customers/new/step-1` shows the progress indicator with the first pip highlighted; fields render but are unwired; footer Next disabled.
  - Inspector store-snapshot shows the initial state and stays in sync as the iframe re-renders.
  - Navigating step-1 → 2 → 3 → 4 and back leaves the snapshot intact — the store survives every navigation.
  - Reading `layout.tsx` confirms `<WizardStoreProvider>` wraps `<WizardProgress />`, `{children}`, and `<WizardFooter />` one level above the step children.
  - Flipping the `PROVIDER_ON_STEP_PAGE` debug branch and navigating step-1 → 2 → 1 clears the store on each navigation (the canonical bug); flip it back.
  - Flipping `STORE_MODULE_SCOPED` and repeating a two-session test leaks session A's draft into session B; flip it back.

## Scope

- Form field bindings, atomic selectors, `selectors.ts`, inline Zod errors, and the Next-gate — Lesson 3 (Wire the forms and the Next-gate).
- The composite-payload Server Action, `useShallow` review, submit button, and firing `reset()` on submit-success — Lesson 4 (Submit, reset, and guard). `reset` is *defined* here, *fired* there.
- The architecture's rationale for `createStore`/slices/`useShallow` at teaching depth — chapter 078 lesson 2 (recapped, not re-taught).
- `persist`/`devtools`/`subscribeWithSelector` middleware — named in chapter 078 lesson 2, deliberately unused here (refresh-loses is the explicit product call).
