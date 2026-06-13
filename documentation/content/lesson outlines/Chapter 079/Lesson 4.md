# Chapter 079 — Lesson 4 outline

## Lesson title

Keep the chapter-outline title: **Submit, reset, and guard** — it names the three senior calls this lesson installs (the submit boundary, the success-only reset, the double-submit guard).
Sidebar short title: **Submit and guard**.

## Lesson type

`Implementation`.
The test-coder runs for this lesson: the action is callable directly (`createCustomer(input)`), so the happy path, the malformed-payload `validation` case, and the duplicate-email `conflict` case are headlessly testable. The remaining outcomes (double-submit guard, redirect, reset-after-success, forced-failure-keeps-draft, cross-session tenancy) are React/inspector by-hand.

## Lesson framing

The student walks away with the wizard's client↔server seam closed correctly: one Server Action that re-parses the composite draft and owns the write, a submit button whose `useTransition` pending state doubles as a double-submit guard, and the discipline that reset fires only on success while a failure leaves the draft intact for retry. The senior payoff is the seam itself — the store owns the in-memory draft, the action owns the write, and the submit button is the single named place they meet — plus the reflexes that travel with it: `useShallow` only for composite literal picks, programmatic direct-object action calls when the data already lives parsed in a client store, and transient errors in component state rather than the store.

## Codebase state

**Entry.** Lessons 2 and 3 are done. The four-slice store, the `useRef`-pinned `WizardStoreProvider` on the `/customers/new` layout, and the typed `useWizardStore<T>(selector)` hook are live (L2). Every field on steps 1–3 binds through an atomic selector to a slice setter, renders inline Zod errors from `selectStepErrors`, and the footer Next-gate enables only when `selectIsStepValid` passes, advancing store `currentStep` and URL together (L3). Three files still carry `TODO(L4)` stubs: `_lib/wizard/actions.ts` (`createCustomer` returns `ok({ id: '' })`), `step-4/page.tsx` (static review placeholder), `step-4/submit-button.tsx` (static button, no action). `wizard-types.ts`, `schemas.ts`, the broadcast hooks, the layout, and the chapter 062 customers list/detail are all provided and unchanged.

**Exit.** `createCustomer` is the full `authedInputAction('member', createCustomerInput, …)`: it consumes the per-user force-failure flag (→ `internal` after a 200ms delay), writes via `pushCustomer` then `logAudit` then `revalidatePath('/customers')`, maps a `{ code: '23505' }` duplicate-email throw to `conflict(…, null)`, rethrows anything else, and returns `ok({ id })`. `step-4/page.tsx` reads the three data slices through one `useShallow` pick and renders the read-only review with `<SubmitButton />` below. `step-4/submit-button.tsx` reads the same three slices through its own `useShallow` pick plus `reset`, runs the action inside `useTransition`, sets local error state on failure, and calls `reset()` before `router.push(/customers/${id})` on success. The wizard's full loop — fill, review, submit, redirect — is runnable; the chapter is complete.

## Lesson sections

Render the **Implementation** section list: *Goal + Finished result* (intro, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: completing all four steps and clicking "Create customer" creates the customer and lands on its detail page. Then a one-paragraph description of the feature working: one Server-Action POST writes the customer plus a `customer.created` audit row and redirects to `/customers/[newId]` with the wizard reset behind it; a forced failure shows an inline error and leaves every field populated for retry; a double-click fires the action only once. Optionally a `Screenshot` of the step-4 review screen as the hero shot (reuse the Project Overview hero if one exists rather than authoring a new capture). No code here.

### Your mission

Weave the brief as coherent prose, no subsection headers, no implementation hints. Cover, in the project's terms:

- The architectural seam (the senior payoff): the store owns the draft in memory, the action owns the write, the submit button is the only place they meet. The action never imports the store; the store never imports the action.
- The submit boundary re-parses the composite draft server-side — the client Next-gate is UX-only, the action's re-parse is the correctness boundary.
- Tenancy lives server-side (`authedInputAction`'s session resolution + `ctx.orgId` carried into the write); the store knows nothing about `orgId`. Defense in depth.
- Constraints that shape the solution: transient submit errors belong in component state, not the store (the store holds the draft the user owns); the action is the direct-object wrapper, callable with a plain object — no `FormData` round-trip because the data already lives parsed in the store.
- The trap this lesson exists to prevent: wiping the draft on a failed submit. Reset fires on success only; the failure branch never resets.
- Tools: one or two new ones — `useTransition` (pending state + double-submit guard) and `useShallow` (composite literal picks). Reuse prior: `authedInputAction`, the canonical Result, `logAudit`, `pushCustomer`.
- Out of scope (one line): persisting the new id into the store (server state the redirect transitions to) and idempotency keys (`processed_events` is for external retries, Unit 11).

Then the requirements checklist — the only list in the section. Use `Checklist`/`ChecklistItem` with `tested`/`untested` chips. Phrase each as a verifiable outcome, never a file/export/import. Tag exactly as below (the test-coder asserts only `[tested]` items; `[untested]` are covered in the reference solution and the by-hand checklist):

1. `[tested]` Completing all four steps with valid data and submitting creates the customer and returns `{ ok: true, data: { id } }`, and writes exactly one `customer.created` audit row in the active org.
2. `[tested]` A programmatic submit with a malformed composite payload returns `{ ok: false, error: { code: 'validation' } }` and writes no audit row.
3. `[tested]` Submitting a customer whose email duplicates a seeded one (`dupe@acme.test`) returns `{ ok: false, error: { code: 'conflict' } }` and leaves the audit log unchanged.
4. `[untested]` On success the router lands on `/customers/[newId]` and the customer detail page renders.
5. `[untested]` After a successful submit, navigating back to step 1 shows the wizard reset to its initial state (empty slices, `currentStep: 1`, `completedSteps` empty).
6. `[untested]` With force-failure armed, submitting shows an inline error under the button and leaves every field populated for retry.
7. `[untested]` A double-click (or "Force double-submit") fires the action only once — one POST, one audit row.
8. `[untested]` The review step and the submit button each read the three data slices through a `useShallow` pick, and `useShallow` appears in those two files only.

Note for the writer / test-coder: requirements 1–3 are headless because `createCustomer` is directly callable; the test must seed/arm via the same store helpers the action uses (`pushCustomer` for the duplicate, `consumeForceFailure` untouched). Do **not** assert a transactional rollback for the conflict case — the audit log stays clean because `pushCustomer` throws *before* `logAudit` runs, an ordering guarantee, not a `tx`. Use the canonical Ch062 result codes (`validation`/`conflict`/`internal`); do not use stale literals like `invalid-input` or `forced_failure`.

### Coding time

One line directing the student to implement against the brief and the tests. Solution hidden in `<details>` (the writer wraps it). Present the reference implementation organized as it appears in the repo, three files in submit order:

1. **`_lib/wizard/actions.ts`** — `createCustomer = authedInputAction('member', createCustomerInput, async (input, ctx) => …)`. Use `AnnotatedCode` to direct focus across the parts: the `consumeForceFailure(ctx.userId)` early-return with the 200ms delay → `err('internal', …)`; the `pushCustomer(...)` call mapping the four-slice payload onto the `Customer` row (`firstName`/`lastName` as their own columns — no `name` concatenation; `...input.billing` spread; preferences mapped to `defaultCurrency`/`language`/`notificationChannels`); the `try/catch` with `isUniqueViolation(error)` (`code === '23505'`) → `conflict(…, null)` and `throw error` for anything else; then `logAudit(...)`, `revalidatePath('/customers')`, `ok({ id: row.id })`. Rationale (one or two sentences each): the direct-object wrapper means the button calls it straight, no `FormData`; the re-parse at the boundary is correctness not UX; the throw-before-audit ordering is what keeps the audit log clean on a conflict (callout: this stands in for a Postgres transaction — name the real-DB version as the production move, do not claim atomic rollback here).
2. **`step-4/page.tsx`** — the single `useShallow` pick of `{ contact, billing, preferences }` and the three read-only review subsections with `<SubmitButton />` below. `Code` block; the `useShallow` line is the only non-obvious part — a one-sentence note that this read genuinely produces a fresh literal each render, which is exactly when `useShallow` belongs.
3. **`step-4/submit-button.tsx`** — `useTransition`, local `error` state, its own `useShallow` payload pick, `reset` selector, `onSubmit` running `createCustomer` inside `startTransition`, the `if (!result.ok) { setError(...); return }` failure branch (no reset), the `reset()`-then-`router.push` success branch, and the `disabled={isPending}` / "Creating…" button. Use `AnnotatedCode` to spotlight the four senior calls: `isPending` driving both label and double-submit guard; `useShallow` on the payload pick; reset-before-push ordering; error-in-local-state-not-store on failure.

Decision rationale and untested-requirement coverage to include:
- `useShallow` on both composite picks (req 8): the senior reflex — a selector returning a fresh literal object/array wants `useShallow`; a primitive or existing reference is fine on default `Object.is`; reaching for `useShallow` on an atomic selector is over-reach.
- `useTransition`'s `isPending` over plain `useState<boolean>` (reqs 6, 7): keeps the transition's concurrency behavior and gives the double-submit guard for free.
- Reset-before-push ordering (reqs 4, 5): the wizard layout unmounts on navigation so a fresh provider mounts regardless, but reset-first is the discipline that generalizes to surfaces where the layout stays mounted across reset (a cart in a header).
- Failure leaves the draft (req 6): transient error in component `useState`, never the store.
- Alternative-rejected note: `<form action={createCustomer}>` + `useActionState` is native and progressive-enhancement-friendly, but re-encoding already-parsed in-memory slices back through `FormData` is ceremony with no upside — the programmatic direct-object call wins when data lives in a client store.
- Forward pointer named once, not implemented: production calls the wizard `reset()` from inside the org-switch / sign-out flow as a tenancy-boundary discipline (the org-switch action lives in chapter 056; the hook is one line).

For Server Actions, the canonical Result type, and `useTransition`, link to the owning regular lessons (chapters 043/044) rather than re-explaining. External resources, if any, are appended by the resourcer after the `<details>`, no header.

### Moment of truth

The test command and expected pass output:

```
pnpm test:lesson 4
```

Expect the Lesson 4 suite to pass (the three headless assertions: happy-path `ok` + one audit row, malformed payload → `validation` + no audit row, duplicate email → `conflict` + audit log unchanged). Show a green pass summary.

Then a by-hand `Checklist` (untested requirements 4–8, plus the cross-cutting Done-when outcomes this lesson owns), driven against the inspector and browser:
- Submitting four valid steps fires one POST returning `{ ok: true, data: { id } }`; the audit-log tail gains one `customer.created` row; the router lands on `/customers/[newId]` and the real detail page renders.
- After submit, navigating back to step 1 shows empty fields and an initial snapshot; temporarily removing `reset()` from the success branch leaves the previous customer's data (confirms reset closed the loop); revert.
- With "Arm force-failure" on, submitting shows the inline error and leaves the draft intact; temporarily adding `reset()` to the failure branch wipes the draft (confirms the failure branch must not reset); revert.
- "Force double-submit" produces one POST and one audit row.
- A session in org X creates the customer in org X's list, not org Y's — tenancy holds at the action.
- Grepping `useShallow` returns two hits (`step-4/page.tsx`, `step-4/submit-button.tsx`); grepping store/hook/provider imports shows only Client Components, with `actions.ts` importing schemas only.

## Scope

This lesson does not cover:
- The four-slice store, provider, or typed hook — built in Lesson 2.
- Field bindings, inline Zod errors, and the Next-gate — built in Lesson 3.
- The error message user/operator split (action-failure rendering as an audited finding) — Chapter 080.
- The wizard's tenancy as a security-audit finding — Chapter 082.
- A "customer created" notification through the dispatcher (it routes after the audit-log write, not from the submit button) — Chapter 071 / Unit 13.
- Real-Postgres transactional wrapping of the write + audit — named here as the production move, implemented against a live database in Unit 18 testing / production migrations work.
- Component tests for the pending/error/validity transitions against a mocked action — Chapter 089.
