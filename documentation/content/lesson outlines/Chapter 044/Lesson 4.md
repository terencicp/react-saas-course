# useFormStatus and the SubmitButton

- **Title:** `useFormStatus and the SubmitButton`
- **Sidebar label:** `useFormStatus`

---

## Lesson framing

Short mechanics lesson (target 20–30 min). The hook's API surface is tiny; the pedagogical weight is on *why it exists* (the prop-drilling problem `isPending` can't solve cleanly) and the one artifact the student walks away with: a portable `<SubmitButton>` that every form in the course reuses.

**The student arrives knowing** (lesson 3, just finished): `useActionState` returns `[state, formAction, isPending]` to the *form's own component*; they wired an `isPending`-driven submit button inline in that same component. Lesson 3 already planted the seed — it named `useFormStatus` as "the next lesson's hook for a button buried three components deep," and drilled the import contrast (`useActionState` from `react`, `useFormStatus` from `react-dom`). This lesson pays off that promissory note. Open by reactivating it, do not re-teach `useActionState`.

**The senior question that frames the whole lesson:** the submit button isn't always a direct child of the form component. It's a shadcn `<Button>`, or it lives inside a shared form-footer layout, or a reusable form-controls component. The form owner has `isPending` — but handing it down means threading a prop through every component between the form and the button, including components the form doesn't own (a UI-library wrapper can't accept a random `isPending` prop). That's the prop-drilling smell. `useFormStatus` lets a descendant read the form's submit state straight from context, no props.

**Mental model the student should end with:** the `<form>` element broadcasts its in-flight state on an implicit React context; `useFormStatus` is the receiver, and it only works for components *rendered inside* that form (descendants), never the form's own render scope. Pair that with: `isPending` (from `useActionState`) is for the form owner; `pending` (from `useFormStatus`) is for everything nested inside. Same fact, two vantage points, not interchangeable.

**The single load-bearing deliverable:** a `<SubmitButton>` component — `'use client'`, calls `useFormStatus`, wraps shadcn `<Button>`, swaps a spinner + disables while pending. Because it reads context not props, the *same component* drops into any form with zero wiring. This is the artifact the project chapter (047) ships and reuses across every form. Make the "write once, reuse everywhere" payoff explicit — it's the reason the hook is worth a lesson.

**Two pitfalls do the heavy teaching here** (both are silent — no error, just wrong behavior, which is what makes them worth dwelling on): (1) calling `useFormStatus` in the form's *own* component returns `pending: false` forever, because the context is established *for descendants*; (2) calling it outside any form returns the empty default silently — it doesn't throw, so a misplaced button looks wired but never lights up. Frame both as "the hook fails quiet," because that's the senior watch-out.

**Cognitive-load shape:** the hook is small enough to teach the full return object at once, but lead with `pending` alone (the 95% field) and treat `data`/`method`/`action` as a short "the rest of the object" beat — `data` gets one concrete use (surfacing what's submitting), `method`/`action` are named-once. Don't front-load the full destructure.

**Worked entity stays `createInvoice` / invoices** to match lessons 2–3 and the ch.047 project. The form skeleton from lesson 3 (the `useActionState` + `<FieldError>` shape) is the canvas; this lesson's only change to it is *extracting the inline submit button into `<SubmitButton>`*. Show that refactor as a before/after so the student sees exactly what moved and why.

**Diagram strategy:** one visual is worth it — the form-as-context-provider with the descendant button reading it, contrasted against the form-owner reading `isPending` directly. This is the core mental model; a box diagram earns its place. Keep everything else prose + code. One small live exercise to make the descendant-only rule stick by having the student feel the failure mode.

---

## Lesson sections

### Introduction (no header)

Reactivate lesson 3's cliffhanger. One short paragraph: "Last lesson the submit button sat right inside the form component, so reading `isPending` was free. Real forms aren't that tidy — the button is a design-system `<Button>`, or it lives in a shared footer, and `isPending` is stuck up in the form owner." State the goal: read the form's submit state from a nested component without prop-drilling, and bottle it into a `<SubmitButton>` you write once and reuse in every form. Name the est. length is short and the hook is small — the value is the pattern.

Preview the deliverable concretely so the student knows the destination: a `<SubmitButton>` that any `<form>` can drop in with no props.

### The prop-drilling problem isPending can't fix

Establish the pain before the tool (defaults-before-conditionals, trigger-before-tool). Take lesson 3's form and complicate it the way production does: the submit button is now a shadcn `<Button>` inside a `<FormFooter>` layout component. To keep the spinner working with only `isPending`, you'd thread `isPending` from the form → `<FormFooter>` → `<Button>`. Show the prop-drilling version in code (`<FormFooter isPending={isPending} />` then `<Button disabled={isPending}>` inside it) and name the two things wrong with it: (1) every intermediate component grows a prop it only forwards; (2) you can't add an `isPending` prop to a component you don't own (the UI-library wrapper, a shared layout). 

Land the trigger sentence: when the submit button crosses a component boundary the form doesn't own — or more than one level of forwarding — that's the signal to stop drilling and let the button read the form's state itself.

Use **CodeVariants** here: tab "Prop-drilling" (the smell) vs tab "useFormStatus" (the fix, forward-referencing the next section). The A/B framing is exactly what CodeVariants is for. Mark the threaded `isPending` prop in the first pane (`"isPending"` token highlight, red `data-mark-color`); mark its absence + the `useFormStatus()` call in the second (green). Keep prose to the one-paragraph cap per pane.

### How a form shares its submit state

Teach the mental model: the `<form>` element sets up an implicit React context carrying its current submit state; any component rendered *inside* that form can subscribe to it. This is the "how it works" beat that makes the descendant-only rule feel inevitable rather than arbitrary.

**Diagram (the lesson's one figure).** Goal: cement "form provides, descendants consume; the owner reads a different channel." Use **`<ArrowDiagram>` inside `<Figure>`** (`expandable={false}` per the ArrowDiagram constraint). Layout: a `<form>` box as the context source. Inside it, nested boxes: an `<Input>` and a `<SubmitButton>`; an arrow from the form's context down to `<SubmitButton>` labeled `pending` (via `useFormStatus`). Off to the side, the *form owner* component box (the one calling `useActionState`) with a separate arrow labeled `isPending` — visually distinct color — to show it reads the same fact from a different position, *not* through the context the descendants use. Caption: the form broadcasts in-flight state to its descendants; `useFormStatus` is how a nested button tunes in, while the owner already holds `isPending` directly. Keep it horizontal and compact (vertical-space constraint). Two arrow colors: one for the descendant/`pending` path, one for the owner/`isPending` path.

Drive home: "descendant" is the operative word — the hook reads context the form publishes for the subtree *below* it, so the form's own component is outside that subtree.

### The hook's return, pending first

Teach the API. Lead with `pending` as the field that does the work, then the rest of the object as a quick sweep.

Signature: `const { pending, data, method, action } = useFormStatus();`
- `pending` — `true` while the parent form is mid-submit. This is the 95% field; everything below is occasional.
- `data` — the in-flight `FormData`. One concrete use: a delete/confirm UX that reads `data.get('id')` to render "Deleting INV-104…" inside the disabled state. Named with that single use; the project's delete confirmation reaches for it.
- `method` — `'get'` or `'post'`. Named once.
- `action` — the action reference that was invoked. Named once.

**The import is the watch-out, repeated from lesson 3 on purpose:** `import { useFormStatus } from 'react-dom'` — *not* `react`. Lesson 3 set this contrast up deliberately; reinforce it here at the call site (teach the primitive at the call site, not as preamble). A one-line callout is enough; the student was primed.

Use a small **`Code`** block for the signature/destructure. Consider **CodeTooltips** on the destructured names to give each field a one-line inferred meaning inline (`pending`, `data`, `method`, `action`) without a four-row table interrupting flow — this is exactly the "short inline definitions" CodeTooltips case.

### Writing the SubmitButton once

The deliverable. Build the component and show the refactor that puts it into the lesson-3 form.

The component (`submit-button.tsx`), production shape per code conventions:
- `'use client'` at top (the hook is client-only).
- Typed props: `{ children: ReactNode }` (per conventions: `children: ReactNode`, not `JSX.Element`). `const`-bound arrow function, named export, matching the lesson-3 component style.
- `const { pending } = useFormStatus();`
- Returns shadcn `<Button type="submit" disabled={pending}>` with a spinner when pending: `{pending && <Loader2 className="size-4 animate-spin" />}{children}`. Use `Boolean`-clean conditional (`pending &&` is fine — `pending` is a real boolean, satisfies the convention). Note `Loader2` from `lucide-react`; per Tailwind conventions add `motion-reduce:` handling consideration for the spin (name it — every visible animation gets `motion-reduce:`; a brief note is enough, the spinner is the canonical case).
- shadcn `<Button>` is used *as imported* (conventions: don't fork primitives; wrap and compose at app level — `<SubmitButton>` wrapping `<Button>` is exactly the sanctioned wrap pattern). Name this: this is *why* we wrap rather than edit the primitive.

Then the **refactor into the form** as the payoff. Use **CodeVariants** (before/after of the form's button region): tab "Inline (lesson 3)" showing `<button disabled={isPending}>{isPending ? 'Saving…' : 'Save invoice'}</button>` living in the form component, vs tab "Extracted" showing `<SubmitButton>Save invoice</SubmitButton>` and the form no longer needing `isPending` for the button at all. `del=`/`ins=` markers make the move legible. Land the reuse point in the after-pane prose: the same `<SubmitButton>` now drops into *any* form, no props — that's the whole return on the hook.

Worth an explicit senior note: the form owner may still want `isPending` for *other* things (disabling a whole `<fieldset>`, a form-level spinner) — extracting the button doesn't delete `isPending`, it just stops the button from depending on it. Keeps the two-hooks-coexist idea honest (they read different parts of the same lifecycle, no interference).

### pending versus isPending, side by side

Make the non-interchangeability explicit and memorable — this is the conceptual crux and a likely quiz target. Both report the same fact (form is submitting); they differ by *who's asking*:
- `useActionState().isPending` → the form's **owning** component (the one that called the hook and holds the action state).
- `useFormStatus().pending` → a **descendant** rendered inside the `<form>`.

The trap, stated plainly: call `useFormStatus` in the form's own render scope and `pending` is `false` *forever* — the form publishes the context for its children, and the form component itself isn't its own child. This is the silent failure #1.

Consider a tiny **`Buckets`** or **`Matching`** exercise to drill the decision, OR fold it into the live exercise below. A two-column **Matching** ("a button inside a shared `<FormFooter>`" → `useFormStatus`; "the form component disabling its own `<fieldset>`" → `useActionState.isPending`; etc.) is a low-cost way to check the "which hook, which position" judgment. Pick one mechanism; don't over-stack exercises in a 25-min lesson.

### Feel the descendant-only rule (exercise)

One **`ReactCoding`** exercise — the lesson's hands-on beat, designed so the student *experiences* the silent failure, then fixes it. Mechanics:
- Starter: a working `App` with a `<form action={...}>` (action can be a mocked client-side async fn — note this is in-iframe staging, not production, matching lesson 3's mocked-action precedent) and a submit button that calls `useFormStatus()` **from the wrong place** (inside the `App`/form component itself), so the button never shows pending — the bug looks like correct code.
- Task: extract the button into a child `SubmitButton` component that calls `useFormStatus()`, so `pending` finally flips.
- Grading (`tests`): assert a child component exists that toggles the button's `disabled`/label on submit; simplest robust check is that after triggering submit, the button reflects the pending state (text/`disabled`). Because `ReactCoding` runs against rendered DOM, assert on the button's attributes/text post-submit. Keep `tailwind` on (spinner/utility classes), `hidePreview={false}` so they watch it work.
- `instructions`: "This button calls `useFormStatus()` but never shows the spinner. Move the hook into a child component rendered inside the form so it can read the form's submit state."

This converts the abstract descendant rule into muscle memory — the highest-value 5 minutes in the lesson.

### When a plain prop is still the right call

Senior balance so the student doesn't cargo-cult the hook onto everything. The honest decision rule: if the submit button is a *direct child* of the form component and nothing the form doesn't own sits between them, passing `disabled={isPending}` straight to it is fine — one prop, zero levels. `useFormStatus` earns its weight when the button crosses a boundary (a UI-library wrapper, a shared layout, a reusable form-control) or when prop-drilling would touch a component you don't own.

But land the project's actual posture: write the `<SubmitButton>` once anyway, because *every* form in the codebase reuses it — the per-form cost is zero after the first, and consistency beats the one-prop shortcut at scale. One-off inline buttons are fine for a throwaway form; the shared component is the default for a real app. This reconciles "don't over-engineer" with "we still ship the component" — name both so it doesn't read as contradictory.

Brief **multiple forms on a page** note here (it's a natural consequence, not its own section): each `<form>` publishes its own context, so a `<SubmitButton>` inside form A only ever sees form A's pending. The create-and-edit dual on one page just works — one `<SubmitButton>` per form, no shared state, no collisions. One or two sentences; it falls out of "context is per-form."

### The in-flight UX is a JS-only enhancement

Short progressive-enhancement beat — name it, don't own it (lesson 7 owns the full PE thread). With JS disabled, `useFormStatus` returns `pending: false` always: the spinner never renders, *but the form still submits and the action still runs*. The senior anchor: the pending UX is an enhancement layered on top; the form's correctness never depended on it. One paragraph, forward-pointer to lesson 7. Reinforces the chapter's spine ("build the platform way and PE falls out").

Also fold in the bounded-duration watch-out here since it's a `pending`-specific gotcha: a Server Action that runs long keeps `pending: true` for its whole duration — the user reads "submitting," not "frozen," so the action's runtime must be bounded (timeout / idempotency from ch.043). Name it; don't expand (background jobs are a later chapter).

### External resources (optional)

One or two **`ExternalResource`** cards: the React `useFormStatus` reference and (optionally) the Next.js forms guide. Keep minimal.

---

## Terms for Tooltip / Term

Use the **`Term`** component sparingly (prose-only; `CodeTooltips` for in-code):
- **descendant** — define inline the first time it's load-bearing: a component rendered *inside* another in the tree, at any depth below it. The whole hook hinges on this word; a one-line `Term` keeps flow.
- **prop-drilling** — passing a value down through intermediate components that don't use it themselves, just to reach a deep child. The pain the hook removes; worth a `Term` at first mention.
- **progressive enhancement** — `Term` at the PE beat: the form's core function works without JavaScript; JS-dependent UX (spinners, optimistic updates) layers on top. (It's been seeded earlier in the chapter — a refresher tooltip, not a first definition.)

Do not `Term`-define `context` heavily — it's been encountered; a light touch only if the form-context model needs it.

---

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- `useActionState` and its three returns, the `(prevState, formData)` signature, the canonical form skeleton with `<FieldError>` — all lesson 3. This lesson *extends* that skeleton by extracting the button; assume the form exists.
- Uncontrolled inputs, `name` contract, `'use client'` on the form, `<form action={fn}>` — lessons 1–2.
- shadcn `<Button>` primitive — Chapter 027. Used as imported; don't re-teach shadcn.
- The `Result` shape / five-seam action — ch.043. The action is a given here; this lesson touches the button, not the action body.

**This lesson does NOT cover (hand off explicitly):**
- `useActionState` mechanics, field-error rendering, the `Result` tree — **lesson 3** (done). Only reference.
- `useOptimistic` / immediate-UI-before-the-server-answers — **lesson 5** (next). The student may wonder "what if I want the screen to change instantly" — point forward, don't teach.
- Constraint Validation API (`required`, `pattern`, `:user-invalid`) and the shadcn `Form` layout primitives — **lesson 6**. Don't pull validation UI in.
- The full progressive-enhancement thread (no-JS submit lifecycle, the five disciplines, the manual JS-disabled test) — **lesson 7**. This lesson names the one PE fact about `useFormStatus` and stops.
- Long-running mutations as background jobs — **later chapter** (named once via the bounded-duration watch-out).
- Idempotency keys as the real double-submit defense — **ch.043 L5** (named); `disabled` while pending is only the single-user double-click guard, same framing lesson 3 used. Don't re-litigate.

**Deliberate divergences from code conventions (flag for downstream agents):**
- The exercise uses a **mocked in-iframe action** (ReactCoding is client-only) — pedagogical staging, not a production action shape. Same carve-out lesson 3 took.
- Form/button code samples may omit some surrounding fields/labels for the line-cap — the canonical a11y floor (label per input, `aria-*` on error fields) is established in lesson 3 and assumed, not repeated in every fragment.
