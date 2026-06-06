# Lesson 3 — useActionState, pending and result

- **Title:** `useActionState: pending state and the result`
- **Sidebar label:** `useActionState`

---

## Lesson framing

This is the central mechanics lesson of the chapter. Lesson 2 left the form *intentionally incomplete*: it wired `<form action={createInvoice}>`, but the form ignored the action's return value (no error rendering) and showed no in-flight UI. This lesson closes both gaps with one hook. By the end the student has the **canonical form-component shape** that every form in the course (Unit 6 onward, project ch.047) copies verbatim.

Pedagogical conclusions that govern the whole lesson:

- **Lead with the three failures the hook fixes, not the API.** The senior question is concrete: a 400ms action with no feedback gets double-clicked; a validation failure needs its messages rendered under the right fields; a re-submit needs stale errors cleared. `useActionState` is the single answer to all three. Open on the broken form from Lesson 2 and let each return value of the hook resolve one failure. This keeps the lesson decision-first, not API-tour-first.
- **The hook ties two prior contracts together; it does not invent anything.** The student already owns the `Result` shape (ch.043 L3) and uncontrolled inputs + the `name` contract (ch.044 L1-2). The whole lesson is *wiring*, framed exactly that way. Do not re-teach `Result`, `safeParse`, or `defaultValue` — name them once and point.
- **Mental model to install:** `useActionState` is a small state machine wrapped around the action. It owns three things — the *latest result*, a *bound action* to hand the form, and an *in-flight flag*. The action's signature gains a `prevState` first parameter as the price of admission. The form becomes a pure renderer of `state`; it never invents error copy.
- **Cognitive-load staging.** Build the form one return value at a time across three sections: (1) `state` → render the result, (2) `isPending` → drive the button + double-submit, (3) the assembled canonical shape. Introduce the `prevState` signature change *before* `state` rendering because the student must change the action signature to even call the hook — it's a prerequisite, not a footnote.
- **The single highest-value, easy-to-get-wrong detail:** field errors live in `Result.error.fieldErrors`, which ch.043 L3 ships as a **flat** `Record<string, string[]>` — a field name maps *directly* to its array of messages. So the form reads `state.error.fieldErrors?.email?.[0]` (optional-chain the map, optional-chain the field, take the first message). Get this exact and encapsulate it in a `<FieldError>` component so the JSX stays legible and the access path lives in one place. The trap here is over-reaching: there is **no** `.errors` step under each field — that nested shape comes from `treeifyError`, which ch.043 L3 deliberately rejected for this channel (see below). The field maps straight to `string[]`.
- **Continuity:** continue the worked entity `createInvoice` / invoices, file `app/invoices/new-invoice-form.tsx`, action imported from `./actions`. Reuse the named reflexes from L1-2 verbatim ("the function reference is the contract", "uncontrolled by default").
- **Code-sample strategy:** the canonical form shape is *the* deliverable, so it gets an `AnnotatedCode` walkthrough (one block, attention steered part by part). The signature change gets a `CodeVariants` before/after (raw action vs `useActionState`-wrapped). A `DiagramSequence` visualizes the submit → pending → result loop so the student sees *when* each return value changes. One `ReactCoding` exercise lets the student wire the hook against a mocked action; one `MultipleChoice` checks the `formAction`-vs-raw-action trap.

---

## Lesson sections

### Introduction (no header)

Open on the Lesson 2 form, stated as broken in three concrete ways. Keep warm and brief (per pedagogical guidelines §3).

- Recall the cliffhanger: the form posts to `createInvoice`, but "the form throws the action's answer away." Three symptoms:
  1. The action takes ~400ms; nothing on screen changes; the user clicks again; two invoices.
  2. The action returns `{ ok: false, error: { fieldErrors: ... } }`; the user never sees "Invalid email."
  3. The next submit succeeds; the old field errors should vanish.
- Name the fix in one sentence: `useActionState` is the one hook that owns the **latest result**, the **in-flight flag**, and the **action to hand the form** — solving all three.
- Preview the payoff: by the end, the canonical form shape every later form copies.
- One forward-pointer line: nested submit buttons that need pending state without prop-drilling are Lesson 4 (`useFormStatus`); the immediate-UI-update case is Lesson 5 (`useOptimistic`). This lesson is the form-owner's hook.

### The action signature has to change first

Reasoning: the student cannot call the hook without changing the action's first parameter, so teach this before any rendering. This is the "price of admission" framing.

- State the rule: wrapped in `useActionState`, the action's first parameter becomes the **previous state**, and `FormData` shifts to the **second** parameter.
- Show the signature with `CodeTooltips` or plain `Code` (it's short): `async function createInvoice(prevState: Result<Invoice> | null, formData: FormData): Promise<Result<Invoice>>`. Tooltip-worthy: `prevState` (the value the hook last returned), `Result<Invoice>` (the ch.043 contract, one-line reminder).
- Use a `CodeVariants` (label "Before — Lesson 2" / "After — wrapped") showing the action header only, with `del=`/`ins=` on the parameter line. First sentence of each variant carries the framing: before = "takes `FormData` directly, the L2 shape"; after = "gains `prevState` first; `FormData` is now second."
- The `prevState` usage call: ignore it for simple CRUD (the new result simply replaces the old). Read it only when the action's output depends on prior state — rare in CRUD, the multi-step-wizard trigger that ch.045 owns. Name once; default is "you won't touch it."
- Watch-out inline: the action body still parses `formData` (second arg) exactly as ch.043 taught — `Object.fromEntries(formData)` then `safeParse`. Nothing about the body changes; only the parameter list.
- Tie back to ch.043 L1, which already *named* this signature ("the framework-bound first argument"); here it's wired.

### Wiring the hook: state, formAction, isPending

Reasoning: introduce all three returns at once as the hook's surface, then spend the next sections using each. This is the "simplified model first" beat — the student sees the whole shape before the detail.

- Present the call with `CodeTooltips` on a single line so each return is hoverable:
  `const [state, formAction, isPending] = useActionState(createInvoice, null);`
  Tooltips: `state` ("the latest `Result`, or the initial value before any submit"), `formAction` ("a *bound* version of the action — hand THIS to the form, not the raw `createInvoice`"), `isPending` ("`true` while the action is in flight").
- Name the import explicitly: `import { useActionState } from 'react';` — it is a React hook (contrast Lesson 4's `useFormStatus`, which lives in `react-dom`; name the contrast once so the student files it correctly).
- The `'use client'` requirement: the hook is client-only, so the form file carries `'use client'` at the top (already true from Lesson 2). One sentence; reinforce, don't re-teach the directive.
- The second argument is the **initial state**. For a create form the reflex is `null` ("no result yet"); the form's error checks read `state?.ok === false`, which is `false` when `state` is `null`. Name the alternative once — initialize with the current entity as `ok(entity)` for an edit form where `state.data` carries the server-confirmed value across repeated saves — and say the chapter standardizes on `null` for the first project form. Do not expand the edit case here (project ch.047 writes it).
- The optional third argument `permalink`: one sentence — a URL for the no-JS progressive-enhancement fallback; default omit; Lesson 7 owns PE. Do not dwell.
- **The load-bearing swap:** the form must use the *bound* `formAction`, not the raw `createInvoice`. Show the one-line change with `CodeVariants` (label "Broken" / "Correct"): `<form action={createInvoice}>` vs `<form action={formAction}>`, `del`/`ins`. First sentence of the broken variant: "the hook never sees the submit — `state` and `isPending` never update." This is the section's headline trap; it mirrors L2's "function reference is the contract" lesson and is the most common bug at this API.

  Pair this swap with a `MultipleChoice` immediately after (single-correct): "A form wired with `useActionState` shows no errors and the button never disables. Which line is wrong?" Options include `action={createInvoice}` (correct — should be `formAction`), a `null` initial state, the `prevState` param, importing from `react`. `McqWhy`: the raw action bypasses the hook's state machine; `formAction` is the bound dispatcher.

### Rendering the result: banner and field errors

Reasoning: this is where the `Result` contract pays off and where the easy-to-get-wrong field-error access path lives. Give it full depth and a reusable component.

- The discriminator check unlocks typed access. Before reading `error`, narrow with `state?.ok === false`. Explain *why*: `state` is a discriminated union (`{ ok: true; data } | { ok: false; error }`) plus possibly `null`; TypeScript only lets you read `error` after the `ok === false` narrow. Reading `state.error` without it is both a TS error and a runtime bug. Tie to ch.005 discriminated-unions reflex.
- **Form-level banner:** `{state?.ok === false && <Banner>{state.error.userMessage}</Banner>}`. Anchor the discipline from ch.043 L3: the *action* authors `userMessage`; the form renders it verbatim and never invents "Something went wrong." If the message is missing, the bug is in the action.
- **Field errors — the exact path.** Use an `AnnotatedCode` to walk a small `<FieldError>` component plus its call site, because the access path is the single most error-prone detail and benefits from stepped attention. The component:

  ```
  // field-error.tsx — 'use client' not needed (pure presentational)
  function FieldError({ messages, id }: { messages?: string[]; id: string }) {
    if (!messages?.length) return null;
    return <p id={id} role="alert" className="text-destructive text-sm">{messages[0]}</p>;
  }
  ```

  And the call site:
  ```
  <FieldError id="email-error" messages={state?.ok === false ? state.error.fieldErrors?.email : undefined} />
  ```

  `AnnotatedStep` plan (color-coded):
  1. `{1}` the component signature — takes a `messages` array and a stable `id`; presentational, no hook. Note the prop type is `string[]` because `fieldErrors[field]` already *is* a `string[]` — the component receives the field's message array straight from the map.
  2. `{2}` early-return on empty/absent — no error, render nothing.
  3. `{3}` render the *first* message; the array can hold several, one line is the convention.
  4. (call site) highlight `state.error.fieldErrors?.email` — **the path**: `fieldErrors` is the flat `Record<string, string[]>` the action put in the `Result` (built with `z.flattenError(...).fieldErrors` in ch.043). Each field maps *directly* to its `string[]`, so the messages are `fieldErrors?.<field>` — no `.errors` step. Color this step `orange` and spell out that the field is the array, not an object wrapping one — this is the access agents most often over-complicate. (At a single-message call site the `[0]` read is `fieldErrors?.email?.[0]`; here `<FieldError>` takes the whole array and picks `[0]` itself.)

- State the source-of-truth split plainly (ch.042 L5 + ch.043): the *message text* is authored in the Zod schema (validation) or the action body (business rules); `flattenError` projects it into the flat `Record<string, string[]>` the contract declares; the form is the **renderer**, not the author. One set of strings, three layers.
- Accessibility floor (from code conventions): the field's `<input>` carries `aria-invalid` when it has an error and `aria-describedby` pointing at the `<FieldError>`'s `id`; use `useId()` for the stable ID. Show this on one input so the project inherits the pattern; keep it to the one field to respect the line budget. Cross-reference ch.027 L5 as the a11y baseline owner; do not re-teach ARIA.
- Stale-error clearing falls out for free: the next submit replaces `state` with the new `Result`; if it succeeds, `state.ok === true` and every `ok === false` block stops rendering. Name this as the answer to symptom 3 from the intro — no manual reset needed.

Terms for `Term` tooltips in this section: `discriminated union` (re-explain in one line — the `ok` tag selects the branch), `fieldErrors` (the flat `Record<string, string[]>` projection of a parse failure that ch.043 built with `z.flattenError`; field name → its messages).

### Pending state: disabling the button and stopping double-submits

Reasoning: `isPending` is the smallest return but resolves the opening symptom (double-click). Keep it tight.

- `isPending` is `true` from the moment React invokes the action until the `Result` returns. Drive the submit button: `<button disabled={isPending}>{isPending ? 'Saving…' : 'Save invoice'}</button>`.
- **Double-submit prevention is automatic:** a disabled button doesn't fire its click, so the second click is swallowed while the first is in flight. State this as the answer to symptom 1.
- The blunt-instrument option for disabling the *whole* form during submit: wrap the controls in `<fieldset disabled={isPending}>`. Mention as the cleanest way to freeze every input at once; note it's optional and the button-disable is the minimum.
- The hard limit: `isPending` prevents the *double-click* race, but not a network retry or a refresh-resubmit. For mutations that must never run twice (charges money, sends email), the idempotency-key pattern from ch.043 L5 still applies. One sentence, point to it; do not build it.
- Reset-on-success interaction: recall from L2 that React auto-resets an uncontrolled form on success. Note that on **failure** React does *not* reset — the user's typed values persist in the uncontrolled inputs, which is exactly right for "fix the highlighted field and resubmit." This is a one-paragraph reinforcement of an L2 fact, framed as why the failure path keeps the data. The edit-form "keep values after success via `state.data` → `defaultValue`" case is named once and deferred to project ch.047 (L2 already promised this fix to L3 — discharge the promise as a labeled forward-pointer fragment, not a full build).

`DiagramSequence` for this section (the temporal model — place it right after introducing `isPending`, since it ties all three returns together over time). Pedagogical goal: show *when* each return value changes across one submit, so the student's mental model is a timeline, not three independent values. Steps (each a simple HTML panel showing a mock form row + a small state readout `state / isPending`):
1. **Idle** — `state = null`, `isPending = false`. Button reads "Save invoice", enabled.
2. **Submit clicked** — React serializes `FormData`, calls the bound action. `isPending → true`. Button disabled, "Saving…".
3. **Action runs on the server** — still `isPending = true`; the POST is in flight.
4. **Result returns (failure)** — `isPending → false`, `state = { ok: false, error }`. Field error renders; typed values persist.
5. **Resubmit succeeds** — `isPending` flips true then false; `state = { ok: true, data }`; errors clear; uncontrolled form resets.

Do not wrap `DiagramSequence` in `<Figure>` (it ships its own card).

### The canonical form shape

Reasoning: assemble everything into the single block the rest of the course copies. This is the lesson's deliverable; give it the most prominent `AnnotatedCode`.

- One `AnnotatedCode` of the complete `new-invoice-form.tsx` (kept near the ~18-line visible cap; use `maxLines` and let it scroll if needed). It must show, in order: `'use client'`, the import, the hook call with `null`, `<form action={formAction}>`, the banner, two named uncontrolled inputs each with `defaultValue` omitted-or-present + `aria-invalid`/`aria-describedby` + a `<FieldError>`, and the pending-driven submit button.
- `AnnotatedStep` plan (blue default, orange for the load-bearing parts):
  1. `"'use client'"` — the form is a Client Component; the hook is client-only.
  2. `"useActionState"` `{the hook line}` — destructure the three returns; `null` initial state.
  3. `"formAction"` (orange) — the bound action on the form; not the raw import.
  4. the banner line — form-level `userMessage`, gated on `ok === false`.
  5. one input + its `FieldError` (orange on the `fieldErrors?.<field>` path) — the `name` is the schema contract (L1 callback); the error reads the field's array straight from the flat map.
  6. the submit button — `disabled={isPending}`, label swaps.
- State explicitly: **every form in Unit 6 onward is this shape**; the project chapter extends it (more fields, the `SubmitButton` from L4, optimism from L5 where it earns its weight). This sentence is the reason the lesson exists.
- Place a `Sequence` exercise here (ordering drill) over the *submit lifecycle as the form sees it*, with the canonical form block fixed above the steps. Steps in correct source order: (1) user clicks submit, (2) React serializes named inputs to `FormData`, (3) `isPending` flips to `true`, (4) the bound action runs `(prevState, formData)` on the server, (5) the action returns a `Result`, (6) `state` updates and `isPending` flips to `false`, (7) the form re-renders — errors or reset. This reinforces the `DiagramSequence` as recall, not re-exposition.

### Practice: wire the hook yourself

Reasoning: the syntax is load-bearing and benefits from hands-on repetition; a guided `ReactCoding` exercise is preferable to a sandbox.

- One `ReactCoding` (tests mode, `hidePreview` since it's about wiring not visuals). Provide a starter with a **mocked** async action already written (returns a canned `Result` failure for a bad email, success otherwise — no real server, so it runs in the iframe) and a partially-wired form. The student must:
  1. call `useActionState(submitProfile, null)` and destructure all three returns,
  2. put `formAction` on `<form>`,
  3. disable the button with `isPending` and swap its label,
  4. render the email field error from `state.error.fieldErrors?.email?.[0]` (guarded by `ok === false`).
- `instructions`: one paragraph naming the four wiring tasks.
- `tests` (jest-flavoured, against rendered DOM): the form's button is disabled-and-relabeled while pending is hard to assert without timers, so grade the static wiring instead — assert the email error text appears after a simulated submit with a bad value, assert the button has `type="submit"`, assert no error node renders on initial mount (`state` is `null`). Write assertion *names* that communicate the failing requirement (the student can't see diagnostics).
- Provide a reference solution behind `<details>` (reveal-on-demand) only if the harness pattern supports it; otherwise rely on AI feedback.

### External resources (optional)

- An `ExternalResource` card to the React `useActionState` reference (react.dev). One card; the canonical API doc. Keep optional per pedagogical guidelines §3.

---

## Scope

**This lesson covers:** the `useActionState` signature and three returns (`state`, `formAction`, `isPending`); the `(prevState, formData)` action-signature change; choosing the initial state (`null` default); the bound-`formAction` requirement; rendering the `Result` (form-level `userMessage` banner + per-field errors via the flat `fieldErrors?.<field>?.[0]` read on the `Record<string, string[]>` channel, encapsulated in `<FieldError>`); the `aria-invalid`/`aria-describedby` floor on a field; `isPending`-driven button disabling and automatic double-submit prevention; the no-reset-on-failure behavior; and the assembled canonical form-component shape.

**Out of scope — do not teach (prerequisites, name once and point):**
- The `Result<T>` shape, `ok`/`err` helpers, error codes, throw-vs-Result — owned by **ch.043 L3**. Re-state the shape in one line only.
- `safeParse` / `Object.fromEntries(formData)` / `z.flattenError(...).fieldErrors` *inside the action body* — **ch.043 L2/L3** and **ch.042 L5**. The lesson shows the *form* reading the result, not the action producing it. (Why `flattenError` over `treeifyError` for this channel is ch.043 L3's argument; do not re-open it — just consume the flat shape it ships.)
- Uncontrolled inputs, `defaultValue`, the `name` contract — **ch.044 L1**. One-line reminder at the input.
- The `<form action={fn}>` primitive, the submit lifecycle, auto-reset-on-success, `formAction` per-button, Next `<Form>` — **ch.044 L2**. Build on it; the auto-reset is recalled, not re-taught.

**Out of scope — reserved for later lessons (forward-point, do not pre-teach):**
- `useFormStatus`, the descendant-only rule, the reusable `<SubmitButton>` — **ch.044 L4**. Name the `react-dom` contrast once.
- `useOptimistic` and implicit rollback — **ch.044 L5**.
- Constraint Validation API (`required`, `pattern`, `:user-invalid`) and shadcn form layout primitives — **ch.044 L6**. (The inputs in this lesson carry only what's needed for the hook story; no client validation taught here.)
- Progressive enhancement and the `permalink` deep-dive — **ch.044 L7**. Name `permalink` in one sentence only.
- Multi-step wizards that read `prevState` meaningfully and span multiple `useActionState` calls — **ch.045**.
- The edit-form "keep typed values after a successful save via `state.data`" full build — **project ch.047**. Discharge L2's promise as a labeled forward-pointer only.
- Idempotency keys for non-retryable mutations — **ch.043 L5** (named) / **ch.063** (built).

---

## Notes for downstream agents (fact-checked)

- **Verified API surface (react.dev, June 2026):** `useActionState` imports from `react` (NOT `react-dom`); returns `[state, formAction, isPending]` in that order; the wrapped action signature is `(previousState, formData)` (state first). Optional third arg is `permalink`.
- **Verified contract (grounded in the shipped ch.043 source, June 2026):** ch.043 L3 ships `Result.error.fieldErrors` as a **flat** `Record<string, string[]>` — a field name maps directly to its `string[]` — built with `z.flattenError(parsed.error).fieldErrors` (verified in `043 Server Actions/3 Result, or throw.mdx` and `4 Thin actions, pure -lib.mdx`; lessons 4 and 5 reuse the same call). 043 L3 explicitly *argues* for `flattenError` (flat) over `treeifyError` (nested) so the value matches the `Record<string, string[]>` field type. **Therefore the canonical form read is `state.error.fieldErrors?.<field>?.[0]`** — the ch.044 chapter-outline snippet (`fieldErrors?.email?.[0]`) is correct. **Do not** introduce a `.errors` step or any `treeifyError`/`.properties` shape into the form read; that nested form is the projection 043 deliberately did *not* use for this channel.
- **Code conventions applied:** `useActionState` at the form root; `useFormStatus` is L4's job, not re-read here; uncontrolled inputs only (`defaultValue`); `FieldError` is a noun-named presentational component in `field-error.tsx`; `aria-invalid` + `aria-describedby` + `useId()` on every field with a possible error; arrow-function components bound to `const` except where a `function` declaration aids hoisting; single quotes, 2-space indent, semicolons.
- **Deliberate simplifications (flag for reviewers):** the practice exercise uses a *mocked in-iframe action* (no real Server Action, since `ReactCoding` runs client-only) — this is a pedagogical staging, not a production pattern. The `<FieldError>` shows only `messages[0]`; rendering all messages is mentioned but not built.
