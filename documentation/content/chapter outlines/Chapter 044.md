# Chapter 044 — Forms the platform way

## Chapter framing

Chapters 046 and chapter 043 built the two halves of the seam: a Zod schema that proves the shape of a payload, and a Server Action that parses, authorizes, mutates, revalidates, and returns a typed `Result`. Chapter 044 wires the browser to that seam. The 2026 default form in this stack is a native HTML `<form>` with `action={serverAction}`, uncontrolled inputs identified by `name`, the browser's Constraint Validation API for cheap pre-submit checks, `useActionState` owning the pending state and the latest `Result`, `useFormStatus` for nested submit indicators, and `useOptimistic` for the small set of mutations where an immediate UI update pays off. The chapter teaches each piece in the order the student would write them on a real form, and ends on progressive enhancement — the property that falls out of using the platform the right way.

The threads that must run through every lesson. The form is a Client Component but the inputs are uncontrolled — `defaultValue` not `value`, no `useState` per field, the form's state lives in the DOM. `FormData` is the wire format: every input's `name` attribute is the contract with the schema in chapter 042, every Server Action body starts with `Object.fromEntries(formData)`. The action prop on a native `<form>` is the senior default — React's `<Form>` (Next.js's component) is a layer on top with a known reduced-prefetching tradeoff named once and not adopted by default. `useActionState` is the hook that ties the form to the `Result` shape from lesson 3 of chapter 043; its third return is `isPending`, its second is the bound action; the field-error rendering reads the `Result.error.fieldErrors` tree. The browser's Constraint Validation API runs in the client for UX and never replaces server-side parsing — every rule the constraint API enforces is also enforced by the Zod schema. Progressive enhancement is the test that the form was built right: JavaScript disabled, the submit still works against the same Server Action. The chapter ships seven teaching lessons plus a quiz.

---

## Lesson 1 — Uncontrolled inputs, FormData contract

Teaches uncontrolled inputs with `defaultValue`, the `name` attribute as the schema contract, and how `FormData` round-trips between the form and the Server Action without per-field state.

Topics to cover:

- **The senior question.** A signup form has six inputs, a submit button, and a Server Action ready to write the row. The 2018 React reflex is `useState` per field, `value={state}` and `onChange={setState}` on every input, then a manual `event.preventDefault()` and a fetch call on submit. The 2026 default is the opposite: the form is a native `<form>`, every input is uncontrolled and carries a `name`, and submitting collects the values into a `FormData` object the Server Action consumes directly. The lesson installs the uncontrolled-by-default reflex and the `FormData` contract that makes the form / action / schema triangle work without per-field state.
- **Controlled vs. uncontrolled, where each earns its weight.** A controlled input pairs `value` with `onChange` and owns the rendered value in React state — every keystroke is a re-render, the parent component can read the value at any time. An uncontrolled input declares `defaultValue` once and lets the DOM own the live value — no re-renders per keystroke, the value is read at submit through `FormData`. The 2026 reflex for form fields: uncontrolled by default. Reach for controlled only when the parent component needs to *react* to the value while typing — debounced search inputs, dependent dropdowns where field B's options depend on field A's value, conditional rendering driven by an input. The threshold is "does some other part of the UI change as the user types?" — if no, uncontrolled wins.
- **Why uncontrolled fits the Server Action pattern.** The Server Action consumes `FormData`; the DOM produces `FormData` natively from a submit; uncontrolled inputs round-trip through `FormData` without any JS holding the value. The form is a Client Component (the directive lands in lesson 3 of chapter 044) but it carries almost no client state — the values live in the inputs, the pending state lives in `useActionState`, the error state lives in the `Result` from the action. The lighter the client state, the closer the form is to a server-rendered HTML form, and the closer to progressive-enhancement-by-default (lesson 7 of chapter 044).
- **The `name` attribute as the contract.** Every input that should reach the action has a `name`. `formData.get('email')` reads the input where `name="email"`; `Object.fromEntries(formData)` builds `{ email: '...', password: '...' }` keyed by name. The schema in chapter 042 declares the same keys. The 2026 reflex: the form's input names, the `FormData` keys, and the schema's object keys are one set of strings. Drift between them is the bug class this contract prevents.
- **`defaultValue` for the initial value, never `value` on uncontrolled inputs.** Edit forms render with an initial value: `<input name="email" defaultValue={user.email} />`. The DOM owns the value from there; the parent doesn't need to track changes. Using `value` without `onChange` flips the input into controlled mode and triggers React's "controlled to uncontrolled" warning. `defaultValue` on the first render, no `value` prop after.
- **The non-text input shapes.**
  - `<input type="checkbox" name="archived" />` — present as `"on"` in `FormData` when checked, absent when unchecked. The schema-side coercion (`z.preprocess(v => v === 'on', z.boolean())`) was lesson 6 of chapter 042.
  - `<input type="radio" name="role" value="admin" />` — only the selected radio's `value` lands in `FormData` under the shared `name`.
  - `<select name="status">` with `defaultValue="draft"` — the selected option's `value`.
  - `<textarea name="notes" defaultValue="...">` — text content as a string.
  - `<input type="file" name="avatar" />` — a `File` instance in `FormData`. Pair with `multipart/form-data` and validate with `z.instanceof(File)` (lesson 6 of chapter 042).
  - Multi-value: `<input type="checkbox" name="tags[]" value="urgent" />` repeated — `formData.getAll('tags[]')` returns the array.
- **`FormData` as the wire format.** The `FormData` object is a multimap of strings (and `File`s for multipart forms). It's the format the browser produces from a native form submit and the format the Server Action receives as its only argument. The course's reach for any form data crossing the wire: `formData.get(name)` for a single value, `formData.getAll(name)` for an explicit multi-value field, `Object.fromEntries(formData)` for the schema-parse handoff. Skip the `JSON.stringify` plus `fetch` reflex — `FormData` is faster, doesn't need a `Content-Type` header, and supports file uploads without extra plumbing.
- **The `name` discipline for nested data.** `FormData` is flat; nested-object payloads don't have a built-in serialization. Two options when the schema needs `{ address: { street, city } }`:
  - Dot-keys: `name="address.street"`, `name="address.city"`; on the server, walk the keys after `Object.fromEntries`. Senior trigger: rare, named once.
  - Hidden JSON field: a controlled state in the parent component serializes a complex object to a hidden `<input type="hidden" name="address" value={JSON.stringify(address)} />` on submit. Senior trigger: when the nested editing UI is itself stateful (a list-builder, a multi-step picker).
  The 2026 reflex: keep forms flat; reach for nested encoding only when the domain genuinely is. RHF (chapter 045) is the trigger when the form's field shape outgrows flat `FormData`.
- **Reading `FormData` server-side — the canonical pair.** The action's first line — established in lesson 2 of chapter 043 — is `const raw = Object.fromEntries(formData);` followed by `Schema.safeParse(raw)`. For multi-value fields, the action reads `formData.getAll(name)` explicitly before parsing. The schema's coercion (lesson 6 of chapter 042) handles the string-to-typed conversion; the form sends strings, the action receives typed values.
- **The "uncontrolled but I need a derived value" escape.** When some UI must reflect a value while typing (a character count, a password-strength meter), the reach is *not* to make the whole form controlled. Read the input via a ref on demand, or `useState` only the derived value with an `onChange` that updates the count — the input itself stays uncontrolled. The threshold for controlled inputs is reserved for the genuine "another part of the UI must re-render per keystroke" case.
- **Watch-outs.** `value` without `onChange` on an uncontrolled input warns in development and freezes the input in production — `defaultValue` is the right prop for the initial value; missing `name` attributes silently drop fields from `FormData` — every field that should reach the action has a `name`; checkbox semantics differ from text inputs — an unchecked checkbox is *absent* from `FormData`, not present with `false`; multi-value field names need `getAll` server-side — `get` returns only the last value; submitting a form with `onSubmit={...}` that doesn't call `preventDefault` still navigates by the form's `action` — for the React 19 pattern the `action` prop replaces both the URL and the handler; resetting an uncontrolled form after submit happens automatically with the action prop when the action succeeds (the lesson 3 of chapter 044 lesson names this), preventing it requires a small `useRef`-based workaround.

What this lesson does not cover:

- The `<form action={serverAction}>` wiring itself (lesson 2 of chapter 044).
- `useActionState` and the result shape (lesson 3 of chapter 044).
- The Zod schema for the form's inputs (chapter 042).
- Multi-step wizards and dynamic field arrays where uncontrolled outgrows its weight (chapter 045).

Estimated student time: 35 to 45 minutes. Concept archetype. The reflex installed here — uncontrolled by default, `name` is the contract — runs through every form the course writes.

---

## Lesson 2 — Wiring the action prop

Teaches the `<form action={serverAction}>` primitive, the submit lifecycle, the automatic reset on success, `formAction` per-button overrides, and when Next.js's `<Form>` earns its weight.

Topics to cover:

- **The senior question.** The form has uncontrolled inputs, the Server Action is ready to receive `FormData`. What's the minimum syntax that wires them together, what does React do behind the action prop, and why isn't this a `fetch` + `JSON.stringify` call from an `onSubmit` handler? The lesson teaches the `action` prop as the React 19 form primitive, the three invocation shapes the action exposes (already named in lesson 1 of chapter 043), and the surface differences from the legacy controlled-form pattern.
- **The `action` prop — the React 19 form primitive.** A Client Component renders a `<form action={createInvoice}>`; on submit, React intercepts the submission, builds a `FormData` from the form's named fields, calls the Server Action with that `FormData`, and handles the round-trip. No `preventDefault`, no `fetch`, no manual JSON construction. The action prop is the senior default for any form whose submit triggers a mutation.
- **The component-boundary requirement.** The form lives in a Client Component (`'use client'` at the top of the file). The action it calls is a Server Action (`'use server'` in the action's file). The two directives bridge through the imported reference: the client imports the action function, React rewrites the import to an opaque ID at build time, the submit becomes an HTTP POST under the hood. The student saw this in lesson 1 of chapter 043; here the wiring runs to completion.
- **The submit lifecycle, step by step.** The user clicks submit. React runs the browser's constraint validation (lesson 6 of chapter 044) — invalid fields prevent submit. The form is serialized to `FormData`. React invokes the action with that `FormData` (or with `(prevState, formData)` when wrapped in `useActionState` — lesson 3 of chapter 044). The action's POST fires; the function runs on the server. The `Result` returns; React reads it. If the form is uncontrolled and the action returns success without throwing, React resets the form. Re-render of any revalidated server-side data fires from `revalidatePath` (lesson 5 of chapter 043).
- **The automatic form reset on success.** When an uncontrolled `<form action={...}>` submits successfully, React resets the form's inputs to their `defaultValue`s. The senior anchor: this is the right default for "create a thing and return to a blank form" — the user types another invoice after creating the first. For edit forms where the user should see the typed values after a successful save, the reset is wrong: pair the form with `useActionState` (lesson 3 of chapter 044) and read state.data to keep the values, or use the experimental `requestFormReset` pattern. Named once; the project chapter writes the edit case.
- **The three invocation shapes — recap from lesson 1 of chapter 043.** This lesson is the wiring lesson for the first shape; the other two are named once for completeness.
  - As the `action` prop on a native `<form>` — the form pattern this lesson owns. The action receives a single `FormData` argument.
  - Wrapped in `useActionState(action, initial)` — the hook owns pending state and the latest `Result`. The action's first parameter becomes `prevState`. Owned by lesson 3 of chapter 044.
  - Imperative call from an event handler — `await action(formData)` outside a form. The senior reach for non-form mutations (delete buttons, toggles). Named here, paired with the `formAction` prop on a `<button>` for the "one form, two submit buttons" case.
- **The `formAction` prop on a button.** A single form with multiple submit-style actions (save draft, publish, delete) overrides the form's `action` per button: `<button formAction={publish}>Publish</button>`. The browser collects the form's data and dispatches to the button's `formAction`. The senior trigger: edit pages where the same fields drive distinct mutations. Pair each `formAction` with its own Server Action and its own `Result` consumer; the form's primary `action` is the default.
- **Why not `onSubmit` + `fetch`.** The legacy controlled-form pattern wires `onSubmit={async (e) => { e.preventDefault(); await fetch('/api/...', { method: 'POST', body: JSON.stringify({...}) }) }}`. The `action` prop is shorter, runs without JavaScript (progressive enhancement — lesson 7 of chapter 044), reuses the framework's CSRF and serialization, and integrates with `useActionState` and `useOptimistic` natively. The `onSubmit` reflex is correct only when the submit doesn't trigger a Server Action — a third-party SDK that takes a JSON body, an analytics ping. For mutations of the app's own data, the action prop is the senior default.
- **The Next.js `<Form>` component — when to reach for it, when not.** Next.js ships its own `<Form>` that extends `<form>` with prefetching of the destination route and client-side navigation on submit. It earns its weight on *search forms* where the action is a string URL (the form GETs to `/search?q=...` and the prefetch warms the loading UI). When the action is a Server Action, the destination isn't known until the action runs, so the prefetching feature doesn't apply — at that point `<Form>` and `<form>` are equivalent for our purposes. The 2026 reflex: native `<form>` for mutations, `<Form>` for search and filter forms where the action is a string URL. Named once; the URL-state lesson in chapter 060 picks up the search-form case.
- **The empty initial state — `null` versus the schema's defaults.** When `useActionState(action, null)` initializes with `null`, the first render reads `state == null` and skips field-error rendering. The senior alternative: initialize with `ok(undefined)` or `null` and branch on `state?.ok === false`. The project chapter picks one and sticks with it. Named here so the pattern is consistent across all the chapter's forms.
- **The CSRF posture.** Next.js's Server Action invocation includes framework-generated tokens and origin checks that mitigate cross-site request forgery — same-origin policy plus the action ID acting as a nonce. The senior anchor: don't roll a manual CSRF check on top; the framework owns the boundary. Full coverage in Chapter 081 (security baseline) — named once here.
- **Watch-outs.** The form must be in a Client Component for the action prop to resolve (`'use client'` at the top of the file) — Server Components can pass actions as props but the form itself renders client-side; the action prop disables the browser's default URL-encoded GET submit — without JavaScript, the form falls back to a POST to the action's URL (the framework handles this for progressive enhancement); the automatic form reset on success surprises edit forms — wire `useActionState` and read `state.data` to keep typed values; passing the action as `action={() => createInvoice(formData)}` (an arrow wrapping the call) breaks the `FormData` argument and the framework's progressive enhancement — pass the function reference directly; the legacy `formAction` HTML attribute is the same prop in React — JSX camelCases the attribute name, the behavior is the platform's.

What this lesson does not cover:

- `useActionState` and the pending/result handling (lesson 3 of chapter 044 — next lesson).
- Imperative action invocation from buttons outside forms (named once; full pattern in lesson 5 of chapter 044 for optimistic toggles).
- The Next.js `<Form>` component for search (Chapter 060).
- CSRF and the action security model (Chapter 081).

Estimated student time: 30 to 40 minutes. Setup/wiring archetype. The lesson where the form learns to talk to the action.

---

## Lesson 3 — useActionState, pending and result

Teaches the `useActionState` hook's three returns, the `(prevState, formData)` action signature, the canonical form-component shape, and field-error rendering from the `Result` tree.

Topics to cover:

- **The senior question.** The form submits to the Server Action; the user clicks submit, the server takes 400ms, the user clicks again because nothing happened, the action runs twice. The action returns a `Result` with field errors; the form needs to render them. The action returns a success and the next submit needs to show the previous validation issues are gone. What hook owns the pending state, the latest result, and the bound action that wraps these together? The lesson teaches `useActionState`, the canonical wiring for every form in the course, and the field-error rendering pattern that consumes the `Result` shape from lesson 3 of chapter 043.
- **The hook's signature.** `const [state, formAction, isPending] = useActionState(action, initialState, permalink?)`. The first return is the latest `Result` from the action (or `initialState` before any submit). The second is a bound version of the action — pass this to `<form action={formAction}>` instead of the raw action. The third is a boolean true while the action is in flight. The optional `permalink` argument is for progressive enhancement of the URL-fallback case; named once, default omit.
- **The action signature change.** When wrapped in `useActionState`, the action's first parameter becomes the previous state and `FormData` is the second: `async function createInvoice(prevState: Result<Invoice> | null, formData: FormData): Promise<Result<Invoice>>`. The `prevState` is the value `useActionState` last returned; the senior reach is to ignore it for simple forms (the new result replaces the old) and read it for forms where the action's output depends on the prior state (rare in CRUD, common in multi-step wizards from chapter 045).
- **The canonical form-component shape.**

  Pseudo-code shape (not load-bearing on exact syntax):
  - `const [state, formAction, isPending] = useActionState(createInvoice, null);`
  - `<form action={formAction}>` with named inputs.
  - `{state?.ok === false && <Banner>{state.error.userMessage}</Banner>}` for form-level errors.
  - `<FieldError name="email" errors={state?.ok === false ? state.error.fieldErrors : undefined} />` per field.
  - `<button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>`.

  Every form in Unit 6 onward follows this shape; the project chapter (chapter 047) extends it.
- **Reading the `Result` for field errors.** The action returns `{ ok: false, error: { fieldErrors: { email: ['Invalid email'] } } }` (from `z.treeifyError` — lesson 5 of chapter 042). The form reads `state?.error.fieldErrors?.email?.[0]` and renders it under the input. A `<FieldError>` component encapsulates the read so the JSX stays readable. The senior anchor: the error message text lives in the schema (lesson 5 of chapter 042); the form layer is the renderer, not the author.
- **The `isPending` boolean.** True from the moment React invokes the action until the result returns. The 2026 reach: drive submit-button text and `disabled`, optionally disable the form's inputs (`<fieldset disabled={isPending}>` is the cleanest blunt instrument), drive any in-form spinner. The double-click prevention falls out automatically — a disabled button doesn't fire its click handler. The hard idempotency-key case from lesson 5 of chapter 043 still applies for non-retryable mutations.
- **The initial state choice.** Two reflexes the chapter standardizes on:
  - `null` for "no result yet" — the form's error blocks check `state?.ok === false`. Senior default for create forms.
  - The current entity as `ok(entity)` — the form's edit case where `state.data` carries the latest server-confirmed value. Senior reach when the same form handles repeated saves.
  Both are valid; the chapter picks `null` for the first project form and names the other once.
- **Keeping the typed values on the form after an error.** The action returns `ok: false`; React would otherwise reset the form on success but does *not* reset on failure — the user's typed values persist in the uncontrolled inputs. The senior anchor: this is the right default for a validation failure. The user fixes the highlighted field and resubmits. For the success case where the user should see the typed values (a profile save that stays on the same page), pass the saved entity through `state.data` and use it as `defaultValue` for the next render — React reconciles by uncontrolled-input identity, the defaults take.
- **The two-argument wrapper for non-`FormData` shapes.** When the action takes a typed object instead of `FormData` (a delete-by-ID, a toggle), the wrapper is `useActionState(async (prev, payload) => action(payload), null)`. The form submission still produces `FormData`; for imperative non-form actions, the second argument is whatever the wrapper passes. The senior reach: keep actions taking `FormData` when the call site is a `<form>`; reach for typed-object actions for imperative invocations.
- **Server Component default values, Client Component form.** The page is a Server Component that fetches the entity to edit; the form is a Client Component that receives the entity as props and renders `defaultValue` from them. The boundary discipline from chapter 030: the form is `'use client'`, the data fetch is server-side, the props cross the boundary as serialized JSON. The 2026 reflex: the form component takes the entity as a prop, never re-fetches client-side.
- **Watch-outs.** Passing the raw action to `<form action={action}>` instead of the bound `formAction` from the hook — the hook never sees the submit, the state doesn't update; calling `useActionState` outside a Client Component fails the build — the hook is client-only; reading `state.error.fieldErrors` without the discriminator check (`state?.ok === false`) is a TypeScript error and a runtime bug — the discriminator is what unlocks the typed access; relying on `isPending` to remain `true` across navigation — `useActionState` resets when the component unmounts; the action's `prevState` parameter is the value returned by the *last* successful invocation, not the initial state — for forms where the action depends on history (multi-step wizards), this matters and chapter 045 names the trigger; mutating the returned `state` object surprises the next render — treat it as immutable.

What this lesson does not cover:

- The `Result` shape itself (lesson 3 of chapter 043).
- `useFormStatus` for nested pending state (lesson 4 of chapter 044).
- `useOptimistic` for immediate UI updates (lesson 5 of chapter 044).
- Multi-step wizards spanning multiple `useActionState` calls (chapter 045).

Estimated student time: 45 to 55 minutes. Mechanics archetype. The hook is the central form primitive of the chapter; the lesson runs long because the wiring is load-bearing.

---

## Lesson 4 — useFormStatus and the SubmitButton

Teaches the `useFormStatus` hook for descendant pending state, the difference from `useActionState.isPending`, and the reusable `<SubmitButton>` component pattern.

Topics to cover:

- **The senior question.** The submit button needs to know the form is submitting so it can disable itself and show a spinner. The form's parent component called `useActionState` and has `isPending`; passing it down through three levels of components is the prop-drilling smell. The submit button might also be inside a UI library component (shadcn's `Button`) the form doesn't own. How does a nested component read the parent form's submit state without props? The lesson teaches `useFormStatus`, the small-but-load-bearing hook for components that need the form's state without owning the action.
- **The hook's signature.** `const { pending, data, method, action } = useFormStatus()`. `pending` is true while the parent form is submitting. `data` is the `FormData` of the in-flight submission (read it to show what's being submitted). `method` is the submit method (`'get'` or `'post'`). `action` is the action that was invoked. The hook reads from the React context the form establishes; calling it outside a form returns `pending: false` and `null`s.
- **The component-boundary discipline.** `useFormStatus` must be called from a *descendant* of the `<form>`, not from the form's own render scope. The submit button is the canonical caller. The pattern is:

  Pseudo-code shape: a `SubmitButton` component declares `'use client'`, calls `useFormStatus()`, renders `<button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>`. The form imports it: `<form action={formAction}><Input.../><SubmitButton /></form>`.

  The button is now portable across forms — the same `SubmitButton` works in any form because the hook reads context, not props.
- **The `pending` from `useFormStatus` versus the `isPending` from `useActionState`.** They report the same fact (the form is submitting) but from different positions. `useActionState` returns `isPending` to the form's *owning* component; `useFormStatus` returns `pending` to *descendant* components inside the form. The senior reach: the form's own render scope uses `isPending` from `useActionState`; nested components inside the form use `useFormStatus`. They are not interchangeable — `useFormStatus` called in the form's own component returns `pending: false` always, because the hook reads from the context the form establishes for its descendants.
- **The shadcn `<Button>` and the submit button pattern.** The course uses shadcn primitives (Chapter 027); the form's submit is a shadcn `<Button type="submit">`. A small `<SubmitButton>` wrapper combines shadcn's `Button` with `useFormStatus`:

  Pseudo-code: `'use client'; export function SubmitButton({ children }: { children: ReactNode }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null}{children}</Button>; }`

  The project chapter ships this component and reuses it across all forms.
- **The `data` field — surfacing what's being submitted.** `data` is the `FormData` mid-flight. A delete confirmation can read `data.get('id')` to show "Deleting invoice INV-104..." inside the disabled state. Niche but useful when the form's UX explicitly references the submitted values. Named once; the project chapter's delete confirmation uses it.
- **The progressive-enhancement aspect.** With JavaScript disabled, `useFormStatus` returns `pending: false` always — the form still submits, but no nested pending state renders. The senior anchor: the in-flight UX is a JS-only enhancement; the form's *correctness* doesn't depend on it. Named once; lesson 7 of chapter 044 owns the full PE thread.
- **Multiple forms on a page.** Each `<form>` establishes its own context; `useFormStatus` inside form A sees only form A's pending. The senior reach for pages with two forms (the create-and-edit dual): one `SubmitButton` instance per form, no name collisions, no shared state.
- **The "is this nested deep enough to need the hook?" decision.** When the submit button is a direct child of the form and the form's parent has the action state, passing `isPending` as a prop is fine — one prop, one level. Reach for `useFormStatus` when the submit button is inside a layout component, a UI library wrapper, a shared form-control component, or any case where prop-drilling crosses a component the form doesn't own. The 2026 reflex: the dedicated `SubmitButton` component is worth writing once even for simple forms because every form in the codebase reuses it; one-off submit buttons with inline prop-drilling are fine for a single throwaway form.
- **Watch-outs.** `useFormStatus` in the form's own render scope returns `pending: false` always — the hook is for descendants; calling the hook outside any form returns the empty default — no error is thrown, but the value is always `false`, which can mask a bug where the component isn't where it should be; the hook is React 19's API and lives in `react-dom`, not `react` (import `useFormStatus` from `react-dom`); a Server Action that takes a long time will keep `pending: true` for the full duration — make sure the action's progress is bounded (timeout, idempotency), the user's expectation is "submitting" not "may never return"; `useFormStatus` and `useActionState` don't interfere — both can fire for the same form, the hooks read different parts of the same submit lifecycle.

What this lesson does not cover:

- `useActionState` itself (lesson 3 of chapter 044).
- `useOptimistic` for the immediate UI update beyond the pending state (lesson 5 of chapter 044).
- Long-running mutations that should run as background jobs (Chapter 16).
- Inline form validation that fires before submit (lesson 6 of chapter 044).

Estimated student time: 20 to 30 minutes. Mechanics archetype. Short lesson; the hook's surface is small but the pattern (the `SubmitButton` component) ships everywhere.

---

## Lesson 5 — useOptimistic with implicit rollback

Teaches the threshold for optimism, the `useOptimistic` hook's reducer shape, React's implicit rollback on failure, the pairing with `useActionState`, and the client-generated UUID pattern.

Topics to cover:

- **The senior question.** The user clicks "Like" on a comment, or "Add to cart," or toggles a "starred" flag. The action takes 200ms to roundtrip and the UI sits still in that window — the click feels broken even though the data is in flight. The naive fix is to optimistically update local state and reconcile after, with manual rollback logic when the action fails. React 19 ships a hook for exactly this pattern: `useOptimistic`. The lesson teaches when optimism earns its weight (and when it doesn't), the hook's shape, the rollback semantics, and the pairing with `useActionState` for the failure case.
- **The threshold for optimistic UI.** The 2026 reflex is *not* to optimistically update every mutation. The trigger is a mutation whose success is overwhelmingly likely *and* whose immediate feedback matters for perceived performance: toggle flags, list reorders, like/unlike, "mark as read," cart quantity adjustments. Mutations that often fail (validation-heavy submits, payments, anything with cross-resource business rules) should *not* be optimistic — the rollback creates more confusion than the immediate update saved. Mutations whose result the user doesn't watch (a background save, a delete with a long undo window) don't need optimism. Decision rule: high success rate + visible-to-user + small UI change = optimistic. The default is no optimism.
- **The hook's signature.** `const [optimisticState, addOptimistic] = useOptimistic(actualState, reducer)`. `actualState` is the server-confirmed state (typically a prop from a Server Component or a value from `useActionState`). `reducer` is `(current, optimisticValue) => nextState` — a pure function that computes the optimistic state. `addOptimistic(value)` triggers an optimistic update inside a transition (the action call or a `startTransition` wrapper).
- **The canonical pattern — optimistic add.**

  Pseudo-code shape:
  - `const [optimisticComments, addOptimisticComment] = useOptimistic(comments, (current, newComment) => [...current, newComment]);`
  - Inside the form's submit handler (wrapped in `startTransition` or the action call): `addOptimisticComment({ id: 'temp', body, pending: true });`
  - The action fires; the server returns the real entity with the real ID.
  - React reconciles `actualState` to the server response and the optimistic state falls away.

  The list re-renders with the real comment in place of the temp one; if the action fails, the optimistic add disappears and the original list returns.
- **The rollback semantics — implicit, not manual.** React owns the rollback. When the surrounding transition (the action call) completes — success or failure — the optimistic state is discarded and the UI re-renders against `actualState`. On success, `actualState` already includes the new value (the Server Action's `revalidatePath` triggered a fresh fetch); on failure, `actualState` is unchanged and the optimistic add vanishes. The senior anchor: the form layer doesn't write rollback logic, doesn't track a temp/real ID mapping, doesn't manually remove failed updates. Read the `Result.ok === false` branch from `useActionState` and surface the error message; the rollback is automatic.
- **The pairing with `useActionState` — both hooks fire on the same action.** A list page with an "add comment" form:
  - `useActionState(addComment, null)` owns the form's pending and result state, renders field errors.
  - `useOptimistic(comments, reducer)` owns the optimistic list state during the submit.
  - The form's submit handler (or the action prop's call) triggers both — the action's submit is wrapped in a transition, the optimistic update fires inside that transition.
  Both hooks share the same lifecycle; React coordinates them.
- **The `id: 'temp'` problem and the senior reach.** The optimistic entity doesn't yet have a real database ID. The 2026 reach:
  - Generate a client-side UUID (`crypto.randomUUID()`) and pass it to the action as the entity's ID. The Server Action accepts the client-provided ID (UUIDv7 reconciles cleanly with the Chapter 037 PK convention). The optimistic entity and the server-returned entity have the same ID — React reconciles by key.
  - Or use a temp string ID (`temp-${Date.now()}`) for the optimistic state and accept that on revalidation, the list re-renders with the real ID. React reconciles by key, the temp item unmounts, the real item mounts. Brief visual flicker; cheap to write.
  The first option is the senior default for the project chapter; the second is the quick reach for prototypes.
- **The fallback for cases optimism doesn't fit — pending state.** When the immediate UI update is wrong for the mutation (validation might fail, the operation is expensive), the alternative is the in-flight state: a spinner on the submit button, a "Saving..." label, a disabled fieldset. The hooks `useActionState` and `useFormStatus` already cover this; `useOptimistic` is for the specific case of "the UI should change *now*."
- **Non-form optimistic updates — the imperative shape.** A like-button toggle outside a form: the click handler calls `startTransition(() => { addOptimistic(!liked); await action(); })`. Same hook, no `<form>` involved. The senior trigger: any non-form mutation where the immediate visual change matters (a `<button onClick>` that flips state). Pair with `await` and `startTransition` so the optimistic update lands inside the transition.
- **The data flow with Server Components.** The list of comments is rendered server-side by a Server Component reading from the database; the comments cross the boundary as a prop to a Client Component that owns the optimistic state. The Client Component's optimistic state initializes from the server-rendered list, applies optimistic updates per submit, and reconciles when the server-rendered list refreshes (after the action's `revalidatePath`). The 2026 boundary discipline: the server owns the truth, the client owns the optimism.
- **Watch-outs.** Using `useOptimistic` for high-failure-rate mutations creates more confusion than it solves — the rollback feels like a bug to the user; not calling `addOptimistic` inside a transition (the action prop's submit or `startTransition`) makes the optimistic state stick — the hook only updates state during a transition; the optimistic value is *added* to the actual state via the reducer — the reducer is pure, no side effects; the temp ID convention determines whether the post-revalidation render flickers — UUIDv7 generated client-side avoids the flicker, temp IDs allow it; an optimistic update that depends on data the client doesn't have (a server-generated timestamp, a computed total) renders incomplete on the optimistic frame — leave those fields blank or compute a placeholder, the real values land after revalidation.

What this lesson does not cover:

- The `useActionState` mechanics (lesson 3 of chapter 044).
- The `Result` failure shape (lesson 3 of chapter 043).
- TanStack Query's optimistic-updates surface (Chapter 081 — the conditional trigger past the native pattern).
- The full undo/redo pattern for destructive operations (out of scope; soft-delete in Chapter 061 covers the destructive case).

Estimated student time: 35 to 45 minutes. Decision archetype around the trigger, mechanics around the hook. The project chapter (chapter 047) uses it once for the create-comment optimistic flow.

---

## Lesson 6 — Constraint Validation, the cheap layer

Teaches the platform's Constraint Validation API (`required`, `pattern`, `type`, `inputmode`, `autocomplete`, `ValidityState`, `setCustomValidity`, `:user-invalid`), the line that separates it from the Zod schema, and the shadcn form layout primitives.

Topics to cover:

- **The senior question.** The Server Action parses every input with Zod and returns field errors. But waiting for the 200ms roundtrip to learn the email field is empty is the wrong UX — the browser knows "this is empty and required" without any server. What's the platform's built-in client-side validation surface, what does it cover, how does it interact with the React 19 submit lifecycle, and where's the line between this and the Zod parse on the server? The lesson teaches the Constraint Validation API as the cheap pre-submit UX layer that never replaces the server-side schema.
- **The constraint attributes.** HTML inputs accept attributes that the browser validates on submit before any JS runs:
  - `required` — non-empty value required.
  - `minlength` / `maxlength` — string length bounds.
  - `min` / `max` / `step` — numeric and date bounds.
  - `pattern` — regex match for `<input type="text">`.
  - `type="email"` / `type="url"` / `type="number"` / `type="tel"` / `type="date"` — type-bound format checks.
  - `inputmode="numeric"` / `"decimal"` / `"email"` / `"tel"` — the soft keyboard hint on mobile (not validation, but the same surface).
  - `autocomplete="email"` / `"name"` / `"new-password"` / `"one-time-code"` — autofill hints.
  On submit, the browser checks each constraint; if any input is invalid, the form's submission is blocked, the browser shows the invalid input's native bubble, focus moves to the first invalid field. React 19's action prop respects this — the action doesn't fire if the form fails constraint validation.
- **The senior call — which checks belong here, which on the server.** Three rules:
  - Anything the browser can check cheaply (presence, length, format, range) belongs in the constraint API for UX.
  - Every check that belongs on the client also belongs on the server, in the Zod schema. Stale clients, JS-disabled submits, scripted requests — the server is the boundary of correctness.
  - Cross-resource and database-dependent checks (uniqueness, plan limits, suppression lists) don't belong on the client — they require server state. They live exclusively in the action body, after the parse.
  The 2026 reflex: the constraint API and the Zod schema mirror each other for the "shape" rules; the action body owns the "business" rules.
- **`ValidityState` and `setCustomValidity` — programmatic checks.** When a rule can't be expressed in HTML attributes (a password-strength rule, a cross-field "passwords match"), JS can call `input.setCustomValidity('message')` to mark the input invalid; clearing the error is `input.setCustomValidity('')`. `input.validity` exposes the `ValidityState` (`valueMissing`, `typeMismatch`, `tooShort`, `customError`, etc.) for inspection. The senior reach: the React event handlers (`onInput`, `onBlur`) can read the input via ref and call `setCustomValidity` for the cross-field cases the attributes don't cover. The chapter names this once; the typical Unit 6 form sticks to attributes.
- **Styling the invalid state.** The CSS pseudo-classes `:invalid`, `:valid`, `:user-invalid` (post-interaction), and `:placeholder-shown` style the input based on the browser's validation state. The 2026 reflex: `:user-invalid` is the right pseudo for "show the error styling only after the user interacts" — `:invalid` styles fields red the moment the page renders, which is wrong UX. Pair with Tailwind: `invalid:border-destructive user-invalid:border-destructive`. Named once; the project chapter uses it on the shadcn `Input` primitive.
- **Suppressing the native error bubble.** The default browser-rendered tooltip ("Please fill in this field") is acceptable for prototypes but not for design-system-aligned production UIs. Two patterns:
  - `noValidate` on the `<form>` — disables the browser's check entirely; the action prop still runs, and the Zod parse on the server catches the issue and returns field errors. The form's UX falls back to server-side errors for everything. Senior trigger: rare, when the design system fully owns inline-error rendering and the latency cost of the server roundtrip is acceptable.
  - Keep constraint validation but suppress the bubble with `onInvalid={(e) => e.preventDefault()}` and read the `:invalid` pseudo (or `e.target.validity`) to render a custom inline message. The senior reach for production forms: keep the cheap pre-submit check, replace the rendering with the design system's inline error.
  Default: keep constraint validation on, render custom inline errors via `:user-invalid` styling and the field-error component reading the action's `Result`. The native bubble is suppressed by the custom UI taking over.
- **The autocomplete attribute as a discipline.** Every input that holds a known data type carries the right `autocomplete`: `email`, `given-name`, `family-name`, `street-address`, `postal-code`, `country`, `new-password`, `current-password`, `one-time-code`, `tel`, `bday`. Browsers and password managers use these to autofill and to surface relevant credentials. The 2026 reflex: the autocomplete attribute is non-optional on every form that takes data the user has typed before. Pair with `inputmode` for the mobile keyboard. Both are accessibility wins and zero-cost.
- **The shadcn `Form` primitive — what it adds, what it doesn't.** Chapter 027 introduced the shadcn UI primitives; for forms, shadcn ships `<Form>` (a thin wrapper over React Hook Form) plus `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormDescription>`, `<FormMessage>` — primitives for the form's *layout* (label, control, error message in a vertical stack with consistent spacing) regardless of the form-handling library. The senior call for this chapter: the layout primitives compose cleanly with native `<form action={...}>` and `useActionState` — you don't need the RHF wrapper to use the layout. The project chapter (chapter 047) uses the shadcn layout primitives without RHF; Chapter 045 adds RHF on top when the trigger fires.
- **Watch-outs.** Relying on the constraint API as the only validation layer fails the JS-disabled and stale-client cases — the Zod parse on the server is non-negotiable; `:invalid` styles fields the moment the page renders (before the user types anything) — use `:user-invalid` for the post-interaction case; `noValidate` on the form disables every constraint check, including the cheap ones — reach for it deliberately when the design system has its own renderer for all errors, not as a default; `pattern` requires the input's value to fully match — for partial-match cases, the rule belongs in JS or in the Zod schema; `type="number"` accepts the empty string as valid (the field is non-empty only when typed) — `required` is still needed; the autocomplete attribute is often left blank in scaffolds — every production form fills it in for every field that has a known autocomplete token.

What this lesson does not cover:

- The Zod schema itself (Chapter 042).
- Async validation that hits the server (RHF + Zod resolver in chapter 045; for the rare case in the native pattern, an `onBlur` debounced fetch).
- Custom validation messages localized for i18n (Chapter 084).
- ARIA error-message wiring for screen readers (lesson 5 of chapter 027 owns the accessibility baseline; the field-error component the project chapter writes uses `aria-describedby` and `aria-invalid`).

Estimated student time: 30 to 40 minutes. Mechanics archetype. The lesson that closes the client-side validation surface so the student knows where the constraint API ends and the schema begins.

---

## Lesson 7 — Progressive enhancement for free

Teaches what works without JS (action prop, constraint API, redirect, revalidate) and what doesn't, the five disciplines that preserve PE, and the manual JS-disabled test at feature-launch.

Topics to cover:

- **The senior question.** A user on a flaky mobile connection submits the form before the JS bundle has finished loading. The action prop's React-mediated submit isn't ready yet — what happens? The senior answer is that the form still works: the browser submits to the action's URL with the form's `FormData` as a standard POST, the framework routes the request to the same Server Action, the action runs, and the user lands on the result page. The lesson teaches progressive enhancement as the property that falls out of building forms the platform's way, the small set of disciplines that keep it working, and the testing reflex that catches regressions.
- **The PE definition for this chapter.** A form is progressively enhanced when it submits successfully with JavaScript disabled or before the JS bundle has loaded. The form's *function* (creating the row, returning the result) works in both modes; the *experience* is degraded without JS (no optimistic updates, no inline pending state, no client-side validation messages beyond the constraint API's native bubble, no `Result`-driven inline field errors — the failure path is a full page reload with a server-rendered error state). The senior reach: the Server Action is the same in both modes; the form's React enhancements layer on top.
- **What works without JS.** The platform provides:
  - The `<form action={serverAction}>` submit — the framework rewrites the action's reference to a POST URL at build time; the browser POSTs there.
  - The Constraint Validation API — the browser's built-in checks (`required`, `pattern`, etc.) fire before submit.
  - The `redirect()` from inside the action — the framework returns a 303, the browser navigates.
  - The `revalidatePath()` — the next request reads the fresh data.
  - The Server Component re-render after the redirect — the user sees the updated list.
- **What doesn't work without JS.**
  - `useActionState`'s in-page render of the result — no JS, no React, no re-render. The failure path needs a redirect to a server-rendered error state.
  - `useFormStatus` and `useOptimistic` — both are React hooks that need the bundle.
  - The automatic form reset after success — React owns this; without JS, the user sees the form re-rendered with the typed values.
  - Inline field errors driven by the `Result` — the form's component reads `state` to render these; without React, the result has nowhere to render.
- **The PE-friendly action shape.** An action written for PE has two output modes:
  - The React mode: return the `Result` for the form's `useActionState` to consume.
  - The PE mode: on success, `redirect()` to the next page (the framework's default for non-React submits); on failure, return the `Result` and the framework still serves the form's route, but the page renders without React's hooks reading the result.

  The 2026 reflex: the action's `redirect()` on success is the natural PE move — the browser navigates to the new resource's page, the user sees the result. For inline error states without JS, the senior reach is to encode the error in a URL search param on a redirect back to the form, and have the Server Component render the error from `searchParams`. This is more work than the action returning `Result` to `useActionState`, and the senior call is to accept that the no-JS error UX is degraded — the form still works, the error rendering just falls back to the server-side path.
- **The `permalink` argument of `useActionState`.** The third argument to `useActionState` is a URL string that the no-JS fallback POSTs to. The 2026 reach: name the route's own URL as the permalink so the no-JS submit lands back on the same page. Named once; usually the framework's default handling makes this unnecessary.
- **The disciplines that keep PE working.** Five rules:
  - Use the `action` prop, not `onSubmit` + `fetch`. The latter requires JS for the submit itself.
  - Use uncontrolled inputs. Controlled inputs need JS for the value to be maintained; uncontrolled inputs round-trip through the platform's submit.
  - Don't put critical UI inside `useOptimistic` or hooks that need React. The optimistic state is a JS-only enhancement.
  - Don't gate the submit button behind a JS-only condition (a `disabled={someJsState}` that's wrong without JS). The button is enabled by default; the server is the boundary of correctness.
  - Keep the form's HTML semantic. The `<button type="submit">`, the `<label for="email">`, the `<form action>` — all native, all work.
- **The test for PE.** The 2026 senior posture: every important form gets one manual test pass with JS disabled (DevTools settings → "Disable JavaScript") to confirm the submit still works. The project chapter (chapter 047) ends with this as a verify step. CI for PE is heavyweight and not typically worth it for SaaS at this stage; the manual test once at feature-launch time is the right discipline.
- **Why this lesson is in the course.** The instinct from the JS-heavy 2018–2023 era is to treat PE as a niche concern. The 2026 reality is that the form pattern the chapter taught — `action` prop, uncontrolled inputs, Server Action — produces PE-by-default with no extra work. The senior anchor: don't *try* to make the form PE-compatible; *don't break* the PE that the platform gives you. The five disciplines above are the "don't break it" list.
- **The edge case — file uploads.** A `<form action={...}>` with a `<input type="file">` needs `enctype="multipart/form-data"`. Without it, the file shows up as a string filename in `FormData` server-side. The framework handles the encoding when the action prop is set, but the explicit `enctype` is good practice for the no-JS case. Named once; the file-upload story is Chapter 068.
- **Watch-outs.** A form with `onSubmit={handler}` instead of `action={serverAction}` breaks PE — the submit relies on JS to fire the handler; relying on `useOptimistic` for the visible-after-success state means the no-JS user sees the unchanged list — pair with a `redirect()` after the mutation; a submit button gated by `useFormStatus().pending === true && !someClientState` may render as enabled on first render before hydration and produce a double-submit — accept that the button is enabled until hydrated and rely on the action's idempotency (lesson 5 of chapter 043); the `permalink` argument is rarely needed in Next.js — the framework's default already routes the no-JS submit correctly for most form layouts; assuming the no-JS user experience matches the JS one leads to gaps that production sees (a small subset of users) — accept the degraded experience as part of the feature and verify the critical path.

What this lesson does not cover:

- The framework's exact PE wiring for action invocations (named here, lives in the Next.js docs).
- Server-rendered error pages for the redirect-on-failure pattern (Chapter 080 owns error pages).
- The Next.js `<Form>` component for search forms with full client-side prefetching (Chapter 060).
- Accessibility considerations beyond PE (lesson 5 of chapter 027).

Estimated student time: 25 to 35 minutes. Concept archetype. Short closer; the lesson is mostly about understanding why the prior six lessons already give you PE.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

- Uncontrolled inputs and the `name` attribute as the contract — `defaultValue` not `value`, the `FormData` round-trip, when controlled inputs earn their weight (per-keystroke UI changes).
- The `FormData` shape — string-only values, the `"on"` checkbox quirk, `getAll` for multi-value fields, `Object.fromEntries(formData)` as the schema-parse handoff.
- The `action` prop on `<form>` — the React 19 form primitive, the framework's POST-to-action under the hood, the automatic form reset on success, the `formAction` prop on a button for per-button overrides.
- The Next.js `<Form>` component — the prefetching wins for string-action search forms, the limitation that Server Action targets aren't prefetched, the senior call to use native `<form>` for mutations.
- `useActionState` — the three returns (state, formAction, isPending), the action signature change (`prevState, formData`), the canonical form-component shape with field-error rendering reading the `Result`'s `fieldErrors` tree.
- `useFormStatus` — the descendant-only rule, the difference from `useActionState.isPending`, the `<SubmitButton>` pattern that reuses across forms.
- `useOptimistic` — the threshold for optimism (high success rate + visible-to-user + small UI change), the implicit rollback, the pairing with `useActionState` for the failure case, the client-generated UUID pattern.
- The Constraint Validation API — `required`, `pattern`, `type`, `inputmode`, `autocomplete`, the `:user-invalid` pseudo-class, the cheap pre-submit checks and the line that separates them from the Zod schema on the server.
- The shadcn form layout primitives — `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, `<FormMessage>` — used without React Hook Form when the native pattern fits, picked up by chapter 045 when RHF earns its weight.
- Progressive enhancement — the no-JS submit lifecycle, what works without JS (action prop, constraint API, redirect, revalidate) and what doesn't (`useActionState` rendering, `useFormStatus`, `useOptimistic`), the five disciplines that keep it working, the manual JS-disabled test at feature-launch.
