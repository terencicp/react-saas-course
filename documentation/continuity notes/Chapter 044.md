# Chapter 044 — Forms the platform way

## Lesson 1 — Uncontrolled inputs and the FormData contract

**Taught** — Uncontrolled inputs (`defaultValue`, DOM owns the value, no per-field state), the controlled-vs-uncontrolled threshold ("does another part of the UI change while typing?"), `name` as the one-string contract across input/`FormData`/schema, all input-shape→`FormData` footprints, reading with `get`/`getAll`/`Object.fromEntries`, the derived-state controlled escape, and flat-vs-nested encoding.

**Cut** — None of substance; lesson covered the full outline. Kept everything trigger-gated and minimal per scope.

**Debts**
- `<form action={...}>` wiring, submit lifecycle, automatic reset-on-success, `formAction` per-button, Next.js `<Form>` → Lesson 2 (signposted repeatedly: "next lesson the form learns to talk").
- `'use client'` directive on the form → named, deferred to Lesson 2.
- `useActionState` (pending + `Result` error rendering) → Lesson 3 (referenced as "two lessons from now").
- Progressive enhancement → Lesson 7 (the "lighter client state = more platform does for you" payoff anchor).
- React Hook Form for forms outgrowing flat `FormData` (dynamic arrays, multi-step wizards) → chapter 045.
- Constraint Validation (`required`/`pattern` etc.) → Lesson 6; inputs here carry `type="email"` as plain HTML only, no client validation taught.
- Relied on chapter 043 (`Object.fromEntries` + `safeParse` + `Result` seam) and chapter 042 (Zod schema, checkbox `z.preprocess(v => v === 'on' || v === true, z.boolean())`, `z.instanceof(File)`) as prerequisites — named once, not re-taught.

**Terminology / mental models**
- "**uncontrolled by default**" and "**`name` is the contract**" — the two named reflexes; reuse verbatim downstream.
- "**One name, three places**" — the anchor diagram metaphor (input `name` = `FormData` key = schema key, color-matched blue/orange/violet).
- Threshold question stated mechanically: "Does some other part of the UI have to change while the user is typing?"
- Anchor line: "**the lighter the client state, the more the platform does for you.**"
- Worked entity: **signup / `createAccount` / `createAccountSchema`** (chose signup over invoice; downstream lessons may continue with this or align to chapter 043's `createInvoice`).

**Patterns and best practices**
- `defaultValue` on uncontrolled inputs, never `value` without `onChange` (the anti-pattern the lesson teaches against — must not appear in project code except the one legitimate case: hidden JSON field controlled by parent state).
- Canonical action entry: `const raw = Object.fromEntries(formData)` then `Schema.safeParse(raw)`; for multi-value fields, spread-then-override: `{ ...raw, tags: formData.getAll('tags') }`.
- Every input paired with a `<label>` (a11y floor); labels omitted in some samples only for the 18-line cap.
- Derived-state escape (e.g. char counter): `useState` on the derived value only, `onChange` updates a sibling readout, field keeps `defaultValue` and stays uncontrolled (no `value` prop).
- Forms stay flat; nested only when domain is — dot-keys (shallow/static) or hidden JSON field (stateful sub-editor).
- Production comment style points at responsibility, not mechanics.

**Misc.**
- `FormData` facts established for reuse: checkbox is present-as-`"on"` / absent-when-unchecked (never `false`); `get` returns last value / `null` if absent; `getAll` returns array; file inputs need `multipart/form-data`; `name="tags[]"` brackets are literal (no platform meaning).
- `FormData`-as-wire-format named once (no `Content-Type`, carries files, senior reach over `JSON.stringify`+`fetch`); full "why not onSubmit+fetch" argument deferred to Lesson 2.
- `course-progress: 0.00005` in frontmatter (looks like a placeholder — flag if a real value is expected).

## Lesson 2 — Wiring the action prop

**Taught** — `<form action={createInvoice}>` as the React 19 form primitive (function reference → React serializes named fields to `FormData` and calls the action, no `onSubmit`/`preventDefault`/`fetch`); the 7-beat submit lifecycle split by owner (browser: click + constraint-validate; React-client: serialize + call-POST + reset; server: the ch.043 action collapsed); the `'use client'` requirement on the form (action stays `'use server'`, import rewritten to an opaque action ID at build time); the four reasons the action prop beats `onSubmit`+`fetch`; automatic reset-to-`defaultValue` on success (right for create, wrong for edit) and that it fires only on success; `formAction` per-button overrides; the native `<form>` vs Next `<Form>` decision (prefetch only when action is a string URL).

**Cut** (vs chapter outline)
- `useActionState` initial-state choice (`null` vs `ok()`) — dropped here; belongs to Lesson 3.
- CSRF posture section — compressed to one "framework owns origin checks/tokens" sentence (full story → ch.081).
- The three-invocation-shapes recap table — not restated; only the action-prop shape is taught, others named inline as forward pointers.

**Debts**
- `useActionState` (pending state + reading the returned `Result` for banner + field errors) → Lesson 3; the form is left *intentionally incomplete* (ignores the `Result`, no pending UI).
- Edit-form fix: feed `state.data` back as `defaultValue` so post-commit reset lands on saved values → Lesson 3 wires it (shown only as a labeled forward-pointer fragment).
- `requestFormReset` from `react-dom` — named once as the manual escape hatch, not demonstrated.
- `action.bind(null, id)` for passing extra args alongside `FormData` — named as the correct alternative to the arrow wrapper; real use deferred to where the project needs it.
- Constraint validation (the lifecycle's beat 2) → Lesson 6.
- Progressive enhancement (no-JS POST fallback) → Lesson 7 (the action prop's PE payoff anchored here).
- Next `<Form>` for search/filter + prefetch → chapter 060.
- Server Action security model (action-ID rotation, encryption) → chapter 081.
- Relied on ch.043 (`Result`, five seams, `Object.fromEntries`+`safeParse`, `revalidatePath`) and Lesson 1 (uncontrolled inputs, `name` contract) as prerequisites.

**Terminology / mental models**
- "**The function reference is the contract**" — pass `action={createInvoice}`, never `action={() => createInvoice(formData)}`; the arrow breaks both the `FormData` argument and the no-JS fallback (silently — passes with JS). Single highest-frequency bug at this API.
- "**Who owns the endpoint**" — the deciding question for action-prop vs `onSubmit`+`fetch` (own Server Action → action prop; third-party/foreign endpoint → fetch). Not "which is newer."
- Form-vs-Form rule: **native `<form>` for mutations** (action is a function), **Next `<Form>` for search/filter** (action is a string URL).
- "**opaque action ID**" — the build-time identifier the import is rewritten to; submit becomes a POST carrying it.
- Lifecycle ownership split: React owns intercept/serialize/call/reset; the action owns parse/mutate/return; the network is the seam between.

**Patterns and best practices**
- Mutation forms use native `<form action={fn}>` with uncontrolled inputs — the chapter/project default; `<Form>` from `next/form` is reserved for string-URL search/filter.
- `formAction={publish}` on a `<button>` overrides the form's primary `action={saveDraft}`; each button's action is its own Server Action with its own `Result` consumer.
- Edit forms must counter the auto-reset (Lesson 3's `state.data` → `defaultValue` pattern); never let a save-and-stay form blank itself.
- Server Action naming: verb+noun, no `Action` suffix (`createInvoice`, `publish`, `saveDraft`).

**Misc.**
- **Worked entity pivoted to `createInvoice` / invoices** (Lesson 1 used signup/`createAccount`). This is deliberate per the outline — matches ch.043's seam and the ch.047 project. Downstream lessons should continue with `createInvoice`.
- Auto-reset timing fact for reuse: React resets *after* the commit of the render following the action, which is why `state.data`-fed `defaultValue` works for the edit case.
- File path used for the form: `app/invoices/new-invoice-form.tsx`; action imported from `./actions`. Edit-form sample at `app/invoices/edit-invoice-form.tsx`.
- **Canonical worked-form field names** (downstream lessons reusing this form must match): `name="customer"` (text) and `name="total"` (number) — `total` matches the `createInvoice` schema key (corrected from `amount` in Phase C). Edit-form sample adds `defaultValue={invoice.customer}` / `defaultValue={invoice.total}`.

## Lesson 3 — useActionState: pending state and the result

**Taught** — `useActionState(action, null)` and its three returns (`[state, formAction, isPending]`); the action-signature change to `(prevState, formData)` (prevState first, FormData second, body unchanged); the bound-`formAction`-on-the-form requirement; rendering the `Result` (form-level `userMessage` banner + per-field errors via a `<FieldError>` component) gated on the `state?.ok === false` discriminator; `isPending`-driven button disable/label-swap as the automatic double-submit guard; no-reset-on-failure (typed values persist); and the assembled canonical form-component shape every later form copies.

**Cut** (vs chapter outline)
- Two-argument wrapper for non-`FormData` shapes (`useActionState(async (prev, payload) => action(payload), null)`) for imperative/typed-object actions — dropped entirely; revisit if a later lesson/project needs an imperative non-form action.
- Server-Component-fetches-entity / form-takes-entity-as-prop boundary discipline — not taught here (deferred with the edit-form case to project ch.047).
- `prevState`-depends-on-history multi-step case — named once and pointed to ch.045, not built.

**Debts**
- `useFormStatus` (descendant pending state, reusable `<SubmitButton>`) → Lesson 4. **Import-source contrast drilled here: `useActionState` is from `react`; `useFormStatus` will be from `react-dom`.**
- `useOptimistic` (immediate UI update before the server answers) → Lesson 5.
- `aria-invalid`/`aria-describedby` full rationale → ch.027 L5 (a11y baseline owner); used here, not re-taught.
- `permalink` third arg (no-JS fallback URL) → Lesson 7 (progressive enhancement). Named in one sentence.
- Edit-form "keep typed values after a *successful* save via `state.data` → `defaultValue`" full build → project ch.047 (discharged here only as a labeled forward-pointer; closes the debt L2 promised L3).
- Idempotency keys for non-retryable mutations (the real defense `isPending` is *not*) → ch.043 L5 (named) / ch.063 (built).
- Multi-step wizards reading `prevState` meaningfully → ch.045.
- Relied on ch.043 L3 (`Result`, `flattenError`-built flat `fieldErrors`, `userMessage` authored by action) and ch.044 L1-2 (uncontrolled inputs, `name` contract, `'use client'`, auto-reset-on-success) as prerequisites.

**Terminology / mental models**
- **`useActionState` = small state machine wrapped around the action**, owning latest result + bound action + in-flight flag; the form becomes a *pure renderer* of `state` and never authors error copy.
- **"price of admission"** — the action signature must gain `prevState` first param before the hook can wrap it.
- **The bound `formAction` is the whole point** — `<form action={formAction}>`, never the raw `createInvoice`; the raw one still runs (invoice saves) but the hook never sees the submit, so `state`/`isPending` stay frozen. Sharpens L2's "the function reference is the contract"; this is the chapter's #1 trap at this API.
- **"the field *is* the array, not an object wrapping one"** — the canonical field-error read (see below).

**Patterns and best practices**
- **Canonical field-error read (downstream lessons 4-7 must reuse this exact shape):** `Result.error.fieldErrors` is a flat `Record<string, string[]>` (built by the action with `z.flattenError(parsed.error).fieldErrors`), read as `state.error.fieldErrors?.<field>?.[0]` — **no `.errors` step, no nesting under the field.** A nested `treeifyError`/`.properties` shape is the projection ch.043 deliberately rejected for this channel; do not reintroduce it. (NOTE: chapter-outline L3 line 101 wrongly cites `z.treeifyError` — the lesson and ch.043 source use the flat `flattenError`; follow the lesson, not the outline.)
- **`<FieldError id messages>` component** (`field-error.tsx`, presentational, no `'use client'`): `messages?: string[]`, early-returns `null` on empty/absent, renders `messages[0]` in `<p role="alert" className="text-destructive text-sm">`. Reused by every later form; call site passes the field's whole array, component picks `[0]`.
- Form-level banner: `{state?.ok === false && <p role="alert">{state.error.userMessage}</p>}` — renders the action-authored `userMessage` verbatim; the form invents no copy and no "Something went wrong." fallback (a missing message = action bug).
- Every field with a possible error: `aria-invalid={Boolean(<fieldErrors>)}` + `aria-describedby={id}` with `id` from `useId()` (stable across server render/hydration).
- Submit button: `<button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save invoice'}</button>`; `<fieldset disabled={isPending}>` is the optional blunt instrument to freeze all inputs.
- Stale-error clearing needs **no code** — the next `Result` replaces `state`; success flips `state.ok` to `true` and every `ok === false` block stops rendering.
- Initial state: chapter standard is `null` for create forms; `ok(entity)` for edit forms is named once, owned by ch.047.

**Misc.**
- The **canonical form skeleton** (the lesson's deliverable, the shape all of Unit 6 onward copies): `'use client'` → `useActionState(action, null)` + `useId()` for error IDs → `<form action={formAction}>` → discriminator-gated banner → named uncontrolled inputs each with `aria-invalid`/`aria-describedby`/`<FieldError>` → `isPending` submit button. Imports `useActionState, useId` from `react`; `createInvoice` from `./actions`; `FieldError` from `./field-error`. Components are `const`-bound arrow functions. **Shipped form fields: `name="email"` (`type="email"`, with the `aria`/`FieldError` cluster) and `name="total"` (`type="number" step="0.01"`)** — `total` matches L2's canonical schema-key field name; the worked field-error path is keyed on `email`.
- `isPending` is a **UX guard for the single-user double-click only** — does nothing for network retry, refresh-resubmit, or multi-tab; idempotency keys remain the correctness defense.
- Submit lifecycle (for reuse): click → React serializes named inputs to `FormData` → `isPending`→true, button disables → bound action runs `(prevState, formData)` on server → action returns `Result` → `state` updates, `isPending`→false → re-render (errors, or reset on success).
- Practice exercise uses a **mocked in-iframe action** (ReactCoding runs client-only) — a pedagogical staging, not a production pattern.

## Lesson 4 — useFormStatus and the SubmitButton

**Taught** — `useFormStatus()` (no args, returns `{ pending, data, method, action }`) as the way a *descendant* reads the form's submit state without prop-drilling; the `<form>`-as-implicit-React-context mental model (form broadcasts in-flight state to its subtree; the hook is the receiver, finds the nearest enclosing `<form>`); the descendant-only rule (called in the form's own render scope `pending` is `false` forever — silent failure); `pending` vs `useActionState().isPending` (same fact, two seats — owner reads `isPending`, descendants read `pending`); the reusable `<SubmitButton>` component (the lesson's load-bearing deliverable); the trigger threshold (reach for the hook only when the button crosses a boundary the form doesn't own or sits >1 forwarding hop away); per-form context scoping (two forms on a page don't collide); and the JS-only-enhancement framing.

**Cut** (vs chapter outline) — Nothing of substance; covered the full Lesson 4 scope. `data`/`method`/`action` named-once (with one concrete `data` use), as outlined.

**Debts**
- `useOptimistic` (immediate UI change before the server answers) → Lesson 5 (named, not taught).
- Full progressive-enhancement thread (no-JS submit lifecycle, five disciplines, manual JS-disabled test) → Lesson 7; this lesson names only the one PE fact (no-JS → `pending: false`, form still submits).
- Constraint Validation + shadcn `Form` layout primitives → Lesson 6.
- Bounded-action-runtime discipline (timeout/idempotency so a long action doesn't spin forever) → ch.043 (named); long work pushed to background jobs → later chapter (named once).
- The project (ch.047) ships `<SubmitButton>` and reuses it across every form; its delete confirmation uses `useFormStatus().data` to render "Deleting INV-104…".
- Relied on Lesson 3 (`useActionState`, `isPending`, canonical form skeleton — extended here only by extracting the inline button), shadcn `<Button>` (ch.027), and the import-source contrast drilled in L3.

**Terminology / mental models**
- **"the form broadcasts its in-flight state on a context; `useFormStatus` is the receiver"** — the channel/tune-in metaphor; reuse verbatim.
- **"descendant"** is the operative word — `Term`-defined; the form publishes the channel *for the subtree below it*, so the form's own component is outside it.
- **"same fact, two seats / two vantage points"** — `isPending` for the owner, `pending` for descendants; not interchangeable.
- **"write it once, reuse it forever"** — the payoff framing for `<SubmitButton>`.
- **"the hook fails quiet"** — both pitfalls (form-own-scope, outside-any-form) return `pending: false` with no error/warning.

**Patterns and best practices**
- **`<SubmitButton>` canonical shape (lives at `components/submit-button.tsx` — NOT `components/ui/`, which is reserved for shadcn primitives; downstream forms must reuse this exact component):** `'use client'`; `const`-bound named export; props `{ children: ReactNode }`; `const { pending } = useFormStatus()`; returns shadcn `<Button type="submit" disabled={pending}>` with `{pending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}{children}`. Imports `Loader2` from `lucide-react`, `useFormStatus` from `react-dom`, `Button` from `@/components/ui/button` (the shadcn primitive it wraps).
- **Every visible animation gets a `motion-reduce:animate-none` variant** — named as a reflex; the spinner is the canonical case.
- **Wrap, don't fork** — `<SubmitButton>` composes behavior on top of shadcn `<Button>` used as-imported; never edit a design-system primitive to add a one-form concern.
- `pending && <…/>` short-circuit is safe because `pending` is a real boolean (no `0`-leak).
- Decision rule: plain `disabled={isPending}` prop is correct when the button is a direct child with no foreign boundary between; the shared `<SubmitButton>` is the default anyway because every form reuses it (per-form cost zero after the first).
- Extracting the button does **not** delete `isPending` from the owner — it may still drive `<fieldset disabled>` or a form-level spinner; the two hooks coexist (different seats on the same lifecycle).

**Misc.**
- `useFormStatus` imports from **`react-dom`** (not `react`) — caution Aside; it reads from the rendered DOM `<form>`. Reinforces L3's import contrast.
- Practice exercise uses a **mocked in-iframe async action** (ReactCoding, client-only) matching L3's staging carve-out; grades on rendered-DOM behavior (button reflects pending after submit), not source structure.
- `pending` stays `true` for the action's full duration — fine if bounded; an unbounded action turns the honest spinner into a lie.

## Lesson 5 — Instant UI with useOptimistic

**Taught** — The trigger-before-tool decision (default is **no optimism**; reach for `useOptimistic` only when **high success rate + visible to user + small UI change** all hold); the strawman manual-rollback (`useState` snapshot/apply/revert) the hook deletes; the hook signature `useOptimistic(actualState, reducer)` returning `[optimisticState, addOptimistic]` (read the optimistic value in JSX, never `actualState`); the imperative toggle shape with `startTransition`; the list-add shape pairing `useOptimistic` with `useActionState`; client-UUID reconcile by key (no flicker) vs temp id (flicker); implicit rollback as "render the unchanged truth" on both success and failure; and the forms-automatic / imperative-manual transition rule.

**Cut** (vs chapter outline) — Nothing of substance; covered the full Lesson 5 scope. The pending-state fallback recap is compressed (the reader owns L3/L4 already).

**Debts**
- Constraint Validation API + shadcn `Form` layout primitives → Lesson 6 (named: optimistic form's inputs stay plain, no client validation taught here).
- Progressive enhancement full thread → Lesson 7; this lesson names only the one fact (optimism is a JS-only enhancement; the action still runs without JS, post-`revalidatePath` render shows the result).
- TanStack Query cached optimistic mutations (`onMutate`/`onError`/`onSettled`, cross-view cache rollback) → **ch.081** (the chapter outline's ch.081 reference; Units.md places TanStack optimistic at ch.076-079 — flag the slug, but the lesson cites "later in the course"/ch.081). Named as the conditional trigger past the native hook; the UUID-by-key reconcile is framed as its foundation.
- Soft delete / undo for destructive ops → ch.061 (named once).
- Real Server Action bodies for `toggleStar`/`addComment` (transaction, persistence) → ch.043 / project ch.047; actions here are imported/mocked.
- Relied on L3 (`useActionState` → `[state, formAction, isPending]`, `state?.ok === false` discriminator, `userMessage` banner), L4 (`<SubmitButton>`/`useFormStatus`), ch.043 (`Result`, `revalidatePath` — **use `revalidatePath`, not `revalidateTag`/`updateTag`**), and ch.030 (Server-Component-owns-data boundary) as prerequisites.

**Terminology / mental models**
- **"the server owns the truth; the client borrows the future for one render"** — the lesson's anchor line; reuse verbatim.
- **Decision formula:** "high success rate + visible to the user + small UI change = optimistic. Miss any one → pending state, not optimism."
- **"Forms: automatic. Imperative handlers: manual."** — the transition rule: `<form action>`/`<button formAction>` opens the transition for you; an imperative `onClick` requires `startTransition` yourself. This is the chapter's #1 trap at this API (analogue to L2's "function reference is the contract" and L3's "bound formAction is the whole point").
- **`transition`** — `Term`-defined (a React update React can interrupt/coordinate; optimistic state lives only inside one).
- **"rollback is just rendering the unchanged truth"** — not a special operation; on failure `actualState` never moved, so the overlay falling away = the original list.
- "The form layer writes the banner, never the removal" — the `useActionState`/`useOptimistic` division of labor.

**Patterns and best practices**
- **Imperative toggle shape:** `startTransition(async () => { addOptimistic(next); await action(); })` — fire the optimistic update first, then await; UI reads the optimistic value (`aria-pressed`, color, icon fill all key off it).
- **List-add shape (cross-lesson contract — Phase B reviewer must confirm against L3/L4):**
  - `useActionState(addComment, null)` (from L3, unchanged) + `useOptimistic(comments, (current, c) => [...current, c])`.
  - `addComment` action signature: `(prevState, formData) => Promise<Result<…>>` (the L3-wrapped shape); imported from `./actions`.
  - `Comment` shape: at least `{ id: string; body: string; pending?: boolean }`.
  - `CommentThread` props: `{ invoiceId: string; comments: Comment[] }` — `comments` arrives from a Server Component.
  - `<SubmitButton>` (L4) reused inside the form; `state?.ok === false` banner read unchanged from L3.
- **Client-UUID reconcile is the project default:** `const id = crypto.randomUUID(); addOptimisticComment({ id, body, pending: true }); formData.set('id', id);` — action persists that exact id so optimistic row and server row share a key (no flicker). Temp id (`temp-${Date.now()}`) is the prototype shortcut (flickers on swap). Same UUID-by-key discipline reused for TanStack optimistic mutations later.
- Reducer is **pure** (`[...current, newComment]`, no mutation); lists keyed by **data identity** (`comment.id`), never index — the reconcile depends on it.
- Pending affordance: `pending: true` field on the optimistic object → `className={comment.pending ? 'opacity-50' : ''}`; `pending && <…/>` short-circuit safe (real boolean).
- **Leave server-generated fields (`createdAt`, computed totals) blank on the optimistic frame** — don't fake them; the real value lands with the revalidated render.

**Misc.**
- `useOptimistic`, `startTransition` import from **`react`** (continues the L3/L4 import-source thread).
- `addOptimistic` outside a transition **warns** (console message quoted verbatim in a caution Aside) and renders for one frame then reverts (flash-and-snap-back) — not silent, unlike L2/L3 traps.
- Worked entities: **`toggleStar`** (imperative toggle, `invoice.starred` boolean) and **`addComment`/`comments`** (list add) — both on the invoices domain; project ch.047 continues the create-comment optimistic flow per the chapter outline.
- Practice exercise uses a **mocked in-iframe async `toggleStar`** (ReactCoding, client-only) matching the L3/L4 staging carve-out; graded on immediate-frame `aria-pressed` change (the crux assertion is the synchronous-on-click flip).

## Lesson 6 — Constraint Validation, the cheap layer

**Taught** — The Constraint Validation API as the cheap, pre-submit, zero-JS UX layer (`required`, `type`, `min`/`max`/`step`, `pattern` full-match, `minLength`/`maxLength`) grounded on the invoice form; the **two mirrors and a wall** decision model (shape rules — presence/length/format/range — are mirrored in both the constraint attributes *and* the Zod schema; business rules needing server state live only in the action body); how native validation gates the React 19 submit (invalid ⇒ action never fires, no `FormData`, no `isPending`, no `Result`); `:user-invalid` (not `:invalid`) as the correct error-styling pseudo via Tailwind variants; suppressing the native bubble; `setCustomValidity`/`ValidityState` for cross-field rules; `autoComplete`/`inputMode` as non-optional zero-cost wins; and the shadcn-form-primitives split (see Misc — the load-bearing finding).

**Cut** (vs chapter outline) — Nothing of substance. The chapter-outline claim that shadcn's *layout* primitives "compose cleanly with native `<form action>` without RHF" was **corrected, not cut** (see Misc).

**Debts**
- React Hook Form + `zodResolver`, `setError`-mapping server errors into fields, `useFieldArray`, multi-step wizards, and shadcn's RHF-coupled `<Form>`/`<FormField>`/`<FormLabel>`/`<FormControl>`/`<FormMessage>` root → **ch.045** (the sharpest boundary; trigger = form's *field shape* outgrows flat `FormData`).
- Async/server-hitting client validation (debounced `onBlur` uniqueness check) → ch.045 / a deliberate fetch; named once, not built.
- The one PE fact named here (constraint API fires without JS — the only validation layer surviving a no-JS submit) → full PE thread Lesson 7.
- Business-rule checks (uniqueness within org, customer-belongs-to-org, plan invoice limit) live in the action `mutate` stage → ch.043 seam (named as the "wall," not built).
- Schema-side mirrors (`z.email()`, `.min/.max`, `.regex()`, `.refine()` for cross-field) → ch.042 (referenced as the server mirror, not re-taught).
- The production CRUD forms that ship these techniques → project ch.047.
- Relied on L1-L3 (uncontrolled inputs + `name` contract, `<form action={formAction}>`, `useActionState` + `<FieldError>` + `state?.ok === false` + canonical skeleton), `<SubmitButton>` (L4), `aria-invalid`/`aria-describedby`/`useId` (ch.027 L5), and ch.042/043 as prerequisites.

**Terminology / mental models**
- **"two mirrors and a wall"** — the lesson's load-bearing metaphor; zones 1↔2 (browser attributes ↔ Zod schema) are mirrors of the same shape rule, zone 3 (action body) is a wall the client can't see past. Reuse verbatim.
- **"constraint validation is the cheap layer; the server is the boundary of correctness"** — the chapter through-line anchor.
- **"two layers, two submitters"** — attributes stop the human-left-a-field-blank case pre-network; the schema catches the stale tab / disabled-JS / scripted/`curl` submit. Justifies the deliberate duplication.
- The mirrors are kept in sync by **manual, reviewed discipline** (no tool auto-generates attributes from the schema) — same as the `name`-contract discipline.

**Patterns and best practices**
- **`:user-invalid`, never `:invalid`**, for error styling — `:invalid` paints required fields red on first paint (the #1 bug at this API). Tailwind: `user-invalid:border-destructive aria-invalid:border-destructive` (the two origins — pre-submit DOM state and post-submit server error — get one consistent look). Use the semantic `destructive` token, not a primitive.
- **JSX casing:** `maxLength`/`minLength`/`inputMode`/`autoComplete` are camelCase (DOM props); `min`/`max`/`step`/`pattern`/`type`/`required`/`name` keep HTML casing.
- **`step="0.01"` is a UX nudge, not a guarantee** — strict two-decimal precision is *schema only* (a scripted request sends three decimals past the browser). Good discriminator for the mirror/schema-only/action-body sort.
- **`type="number"` treats the empty string as valid** → always pair with `required`. **`pattern` is full-match** (no "contains") → partial/starts-with rules belong in JS or the schema.
- **Default field cluster stays hand-rolled** (`<label htmlFor>` + shadcn `<Input>` + course `<FieldError>` + manual `aria-invalid`/`aria-describedby`/`useId`) — do NOT adopt shadcn's `<FormMessage>`/`<FormLabel>`/`<FormControl>` in native-`<form action>` code (they throw — see Misc).
- **`noValidate` disables *all* constraint checks, not just the bubble** — never the way to hide the tooltip; reach only when the design system fully owns inline rendering and the roundtrip cost is accepted (rare). To suppress just the bubble: `onInvalid={(e) => e.preventDefault()}`, keeping the check.
- **`setCustomValidity` cross-field check is still a mirror** — the same rule (e.g. due-date-after-issue-date) belongs in the schema as a `.refine()`; client check is UX, schema is correctness. `setCustomValidity('')` clears. Stays client-only and synchronous — never a place to call the server.
- **`autoComplete` non-optional** on any field the user has typed before; the security trio `new-password`/`current-password`/`one-time-code` matters for the later auth forms (Unit 8). **`inputMode`** pairs with (never replaces) `type` on numeric/contact fields (`decimal` for the invoice amount).
- `type="date"` values are `YYYY-MM-DD` strings → plain string `<` compares chronologically.

**Misc.**
- **Field-name drift to flag:** the attribute catalogue (`AnnotatedCode`) and the Buckets exercise use `name="amount"` for the money field, NOT L2/L3's canonical `name="total"`. The shadcn `CodeVariants` field cluster correctly keys on `name="email"` (matches L3's worked field-error path). The two-decimal-precision mirror is cited as a Zod **`.multipleOf(0.01)`** refinement (the buckets post-note; outline said `.refine()` generically). ch.047 should standardize on `total` per L2/L3 if reusing these inputs.
- **LOAD-BEARING shadcn finding for downstream (esp. ch.047 project):** only `<FormItem>` is RHF-free (it's just a `grid gap-2` spacing wrapper). `<FormLabel>`, `<FormControl>`, `<FormDescription>`, and `<FormMessage>` **all call `useFormField()` and throw outside a `<FormField>`** (itself a wrapper over RHF's `Controller`). They are RHF components wearing layout clothes — NOT engine-agnostic. The chapter's default form therefore stays the hand-rolled cluster; the only safe shadcn adoption RHF-free is wrapping that cluster in `<FormItem>` for the design system's field spacing. The full shadcn form stack earns its weight only with RHF (ch.045). **This is a deliberate divergence from the chapter-outline (L6 line 231) claim that the layout primitives "compose cleanly with native `<form action>` without RHF"** — the outline overstates what shadcn offers RHF-free. ch.047 must NOT render `<FormMessage>`/`<FormLabel>`/`<FormControl>` in its Server-Action forms.
- Code samples deliberately show the input cluster *without* the surrounding `<form>`/`useActionState` boilerplate (taught L1-L3) to keep focus — staging, not a new pattern.
- The `ReactCoding` styling exercise is client-only (no action), honest for a CSS-timing demo; it uses primitive `red-500` because the Play CDN doesn't load `globals.css` (so the `destructive` token is absent in-sandbox) — production snippets keep `destructive`. Tailwind v4 ships `invalid:`/`user-invalid:` variants natively.

## Lesson 7 — Progressive enhancement for free

**Taught** — The chapter closer/synthesis: PE is the *default* of the action-prop + uncontrolled-inputs + Server-Action pattern, not something you add. PE defined function-vs-experience (submit *works* with JS off or pre-hydration; the *experience* degrades). The **one Server Action, two front doors** model (JS-enhanced door = React intercepts → background POST → inline `Result` re-render; native door = browser's built-in form POST to the build-registered action URL → 303 redirect navigation; both converge on the same mode-agnostic action body). The survives/degrades ledger. The one real decision (no-JS error path: degraded default vs encode-and-redisplay). The five disciplines that preserve PE. The manual JS-disabled test. `permalink` named once. File-upload `enctype` named once.

**Cut** (vs chapter outline) — Optional `MultipleChoice` "which form breaks PE?" dropped (outline flagged it optional; `Buckets` already carries the active check; keeping the closer short). No substantive scope cut.

**Debts**
- Server-rendered error *pages* (`error.tsx` boundary) → ch.080; the encode-and-redisplay path here uses `searchParams` on the form's own route, deliberately distinct from a global error page.
- File uploads + `enctype="multipart/form-data"` full story → ch.068 (named once).
- The project's full CRUD surface ships the **degraded default only** and ends with the manual JS-disabled test as its verify step → project ch.047.
- Idempotency keys as the real double-submit defense (pre-hydration the button is enabled before `isPending` can fire) → ch.043 L5 (named, not built).
- Next `<Form>` for search/prefetch → ch.060 (not revisited).
- Relied on all of L1-L6 and ch.043 (the five-seam action, `redirect()`/`revalidatePath()`, `Result`) as prerequisites — this lesson re-sees them through the no-JS lens, re-teaches nothing.

**Terminology / mental models**
- **"You don't add progressive enhancement; you avoid removing it."** — the chapter's PE anchor posture; reuse verbatim. The five disciplines = the "removal list."
- **"one Server Action, two front doors"** — the spine; both doors lead to the same room (the action body). JS-enhanced door / native-browser door.
- **Rule that decides the ledger:** "everything the *platform* provides survives; everything *React-the-runtime* provides does not."
- **function vs experience** — the split the whole lesson turns on; PE = function survives, experience degrades.
- `Term`-defined: **progressive enhancement** (vs graceful degradation), **opaque action ID** (re-gloss from L2), **hydration**, **pre-hydration** (the SSR-HTML-arrives-to-interactive gap; *every* user passes through it on first load, so PE protects everyone on slow loads, not just the JS-disabled minority — the lesson's emphasized nuance).

**Patterns and best practices**
- **Survives no-JS (platform):** `<form action={…}>` native POST, Constraint Validation API (the *only* validation layer that survives no-JS), `redirect()` (303), `revalidatePath()`, the post-redirect Server Component re-render.
- **Degrades no-JS (React runtime):** `useActionState` inline `Result` render, `useFormStatus` (`pending` stays `false` forever), `useOptimistic`, auto form-reset, inline `Result`-driven field errors. (Action still *produces* the `Result`; there's just nothing to render it.)
- **Success path is already PE-safe**: the action's `redirect()` on success carries the no-JS experience for free — a ch.043-correct action needs no extra work for the success path. Only the failure path is an open question.
- **No-JS error decision: accept the degraded default** for a typical 2026 SaaS (small no-JS cohort, constraint API catches cheap cases in both modes, server still rejects bad rows). Flip to **encode-and-redisplay** (redirect back with `?error=` param, Server Component reads `searchParams`, renders server-side) only for regulatory / public-unauthenticated-high-traffic / known-no-JS-audience forms. The encode-and-redisplay sample is **deliberately illustrative** (raw `?error=`, not a hardened param schema) — not the project's error contract; ch.047 ships degraded only.
- **The five disciplines (each a re-seen L1-L6 reflex):** (1) `action` prop, not `onSubmit`+`fetch`; (2) keep inputs uncontrolled (`defaultValue`); (3) don't put load-bearing UI behind a React-only hook (pair mutations with `redirect()`+`revalidatePath()`); (4) don't gate the submit button behind JS-only state — default it enabled, rely on action idempotency for the pre-hydration double-submit; (5) keep HTML semantic (`<button type="submit">`, `<label for>`, `<form action>` — a `<div onClick>` submit has no native door).
- **Verify reflex:** one manual JS-disabled pass per important form at feature-launch (DevTools → `Cmd/Ctrl+Shift+P` → "Disable JavaScript" → reload → submit). "Pass" = *function* works, NOT experience-match. Automated PE testing in CI is not worth it at this stage.

**Misc.**
- **Precision to hold:** the native door exists *only* because the chapter passes a **Server Action**. A *client* action passed to a form is **queued until hydration** — no native door. Don't overgeneralize "any `action` prop works without JS."
- **`permalink` corrected semantics (React docs, June 2026):** `useActionState(action, initial, permalink?)`'s third arg is a URL string; for a Server Function submitted before the bundle loads, the browser **navigates to** it (does NOT POST to it — both the chapter outline line 269 and L3's earlier note are imprecise; follow the lesson). Destination must render the same form component. Reflex: omit it; Next's default routing handles common layouts.
- File-upload edge: native door needs `enctype="multipart/form-data"` to send a file vs filename string; framework sets it when `action` is wired, explicit `enctype` is the safe no-JS move.
- Worked entity continues: invoices / `createInvoice`, form `app/invoices/new-invoice-form.tsx`, action from `./actions`.
- **Error-path action samples (`CodeVariants`) use the L3-wrapped two-arg signature** `createInvoice(prevState: Result<Invoice> | null, formData: FormData): Promise<Result<Invoice>>` — both tabs (degraded + encode-and-redisplay) carry `prevState` first, matching the `useActionState` shape from L3, not a bare `(formData)` action. Degraded tab keeps the canonical body (`safeParse(Object.fromEntries(formData))` → `err('validation', …, z.flattenError(parsed.error).fieldErrors)` on failure; `revalidatePath('/invoices')` + `redirect('/invoices/${invoice.id}')` on success). Encode-and-redisplay tab swaps the failure branch to `redirect('/invoices/new?error=validation')` and pairs a `NewInvoicePage({ searchParams })` reading `error` (illustrative raw param, not a hardened schema).
