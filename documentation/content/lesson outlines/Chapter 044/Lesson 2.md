# Lesson title

- **Title:** Wiring the action prop
- **Sidebar label:** Wiring the action prop

# Lesson framing

This is the **wiring lesson** of the chapter. Lesson 1 left the student with a form whose inputs are uncontrolled, each carrying a `name`, ready to round-trip through `FormData`. Chapter 043 left them with a Server Action that takes `FormData`, parses it, mutates, revalidates, and returns a `Result`. This lesson connects the two: `<form action={serverAction}>`. The whole lesson is the answer to one mechanical question — *what is the minimum syntax that makes the browser send the form to the action, and what does React do behind that prop?*

Pedagogical center of gravity. The single most important takeaway is the **mental model of what the `action` prop does on submit**: React intercepts the native submit, serializes the named fields into `FormData`, calls the function, and manages the round-trip — no `preventDefault`, no `fetch`, no `JSON.stringify`. Everything else in the lesson (auto-reset, `formAction`, the `<Form>` decision) hangs off that one model. The lesson must make this lifecycle *visible*, not just assert it. This is where a step-through diagram earns its place.

Decisions-before-syntax framing (per the guidelines). The student arrives with a strong prior reflex from the 2018–2023 era: forms submit via an `onSubmit` handler that calls `preventDefault()` then `fetch()`. That reflex is the thing to dislodge. Lead with the contrast — show the legacy shape, then show that the `action` prop deletes most of it — and name *why* the platform path wins (shorter, runs without JS, reuses framework CSRF/serialization, composes with the next three lessons' hooks). The `onSubmit`+`fetch` pattern isn't "wrong" — it's correct for the narrow case where the submit doesn't hit one of the app's own Server Actions (a third-party SDK, an analytics ping). Name that boundary so the student knows when each reflex fires.

Keep the scope honest. This lesson owns the **bare `action` prop** wiring and its immediate consequences (the submit lifecycle, auto-reset, `formAction` per-button overrides, the `<Form>` decision). It deliberately stops short of `useActionState` — the form here submits and resets, but does **not** yet render pending state or field errors. That is the *cliffhanger* into Lesson 3. Be explicit with the student that this form is intentionally incomplete: it works, but it can't tell the user it's saving or show what went wrong yet. This honesty prevents the student from thinking the bare `action` prop is the finished pattern.

Mental model the student should leave with: "A `<form action={fn}>` is a native form whose submit React turns into a function call with a `FormData` argument. The function reference is the contract — pass it directly, never wrap it in an arrow. For the app's own mutations this is the default; reach for `onSubmit`/`fetch` only when the target isn't a Server Action, and reach for Next's `<Form>` only when the action is a string URL (search/filter)."

Worked entity continuity. Lesson 1 chose **signup / `createAccount` / `createAccountSchema`**. The chapter framing and chapter 043 lean on **invoices / `createInvoice`**. This lesson is the natural pivot point to the entity the rest of the chapter and the project (chapter 047) will use: **`createInvoice`**, matching chapter 043's seam exactly so the wiring connects to a real action the student already saw defined. Use `createInvoice` as the primary worked example; this aligns the form lesson to the action it consumes. (Flag for downstream: if Lesson 3+ continue with signup instead, realign — but invoice is the stronger choice given chapter 043 and the chapter 047 project.)

Cognitive-load staging. Introduce the simplest possible whole form first (a `<form action={createInvoice}>` with two named inputs and a submit button — the entire interactive surface in ~8 lines), make it work end to end, *then* layer the lifecycle detail, *then* the reset consequence, *then* the per-button and `<Form>` edge cases. Each concept lands on a form that already runs.

# Lesson sections

## Introduction (no header)

Open on the concrete state the student is in: "Last lesson your form's inputs round-trip through `FormData`. Chapter 043's action is waiting for exactly that `FormData`. One prop connects them." State the goal — wire the form to the action and understand what React does behind the prop — and set the cliffhanger honestly: by the end the form *submits and clears*, but doesn't yet show "Saving…" or inline errors (that's the next lesson). Keep it to ~4 sentences, warm and terse. Name the senior question implicitly: *what's the minimum wiring, and why isn't it `fetch`?*

## The action prop is the whole wiring

The payoff-first section: show the complete minimal working form before any theory, so the student sees how little code this takes.

- Lead with a single `Code` block (tsx): a Client Component (`'use client'` at top) importing `createInvoice` from the actions file and rendering `<form action={createInvoice}>` with two uncontrolled inputs (`name="customer"`, `name="amount"`, both `defaultValue`-free for a create form) and a `<button type="submit">`. Roughly 10 lines. This is the entire wiring.
- Prose: name what just happened — assigning the action **function reference** to the `action` prop is the entire connection. On submit, React builds `FormData` from the named inputs and calls `createInvoice(formData)`. No `onSubmit`, no `preventDefault`, no `fetch`, no `Content-Type`. Tie back to Lesson 1: the inputs are uncontrolled, so their values live in the DOM and arrive in that `FormData` for free.
- The `'use client'` requirement, paid off here (it was named-and-deferred in Lesson 1). State the rule plainly: the form must live in a Client Component for the `action` prop to wire up React's submit interception. The *action itself* stays a Server Action (`'use server'` in its own file, from chapter 043). The bridge is the import — the client imports the function reference; React rewrites that import to an opaque action ID at build time; the submit becomes an HTTP POST under the hood. The student saw the `"use server"` seam in chapter 043 lesson 1; here it runs to completion from the client side. Keep this to a short paragraph — the deep security/encryption story is chapter 081.
- Reinforce the contract from Lesson 1 in one line: the input `name`s, the `FormData` keys, and the schema keys are one set of strings — this is why the action can `Object.fromEntries(formData)` and parse without the form knowing anything about the schema.

Components: one `Code` block for the minimal form. Keep it a plain block, not annotated — the point is how *small* and unremarkable it looks.

## What React does on submit

The conceptual heart of the lesson — make the submit lifecycle visible. This is where the student's `fetch` mental model gets replaced with the platform's.

- Use a **`DiagramSequence`** to step through the lifecycle one beat at a time. Pedagogical goal: convert an invisible, instantaneous browser+React+server handshake into discrete, inspectable steps so the student internalizes *where* their code runs and *what React owns vs. what they own*. Steps (each a simple horizontal strip / labeled node lighting up; keep visuals light per the height constraint):
  1. **User clicks submit.** The native `<button type="submit">` fires the form's submit. (Anchor: this is a real platform event, not a React synthetic-only thing.)
  2. **Browser runs constraint validation.** Any `required`/`type`/`pattern` checks fire first; an invalid field blocks submit and the action never runs. Forward-reference Lesson 6 lightly ("the cheap client checks — Lesson 6"). Caption notes: this is why `action` and HTML validation compose for free.
  3. **React serializes the named fields into `FormData`.** Uncontrolled inputs → `FormData` multimap (callback to Lesson 1's input-shape footprints).
  4. **React calls the action with that `FormData`.** Under the hood this is an HTTP POST carrying the `FormData` body and the action's opaque ID — *not* a JSON `fetch` the student wrote.
  5. **The action runs on the server** — chapter 043's five seams: parse → authorize → mutate → revalidate → return `Result`. (Show as one collapsed node labeled "Server Action (ch.043)" to avoid re-teaching.)
  6. **The `Result` returns; revalidated data re-renders.** `revalidatePath`/`revalidateTag` from the action (chapter 043 lesson 5) triggers affected Server Components to refetch. Note: in *this* lesson the form ignores the returned `Result` — reading it is Lesson 3. Caption flags this gap.
  7. **On success, React resets the uncontrolled form** to its `defaultValue`s. (Hands off to the next section.)
- Prose around the diagram: emphasize the two ownership boundaries — *React owns* the intercept/serialize/call/reset; *the student's action owns* parse/mutate/return. The student writes neither the POST nor the `FormData` construction.
- **Sequence exercise** (the `Sequence` ordering drill) right after the diagram to check the lifecycle order is internalized. Provide the 6–7 lifecycle beats shuffled; source order is correct order. This is a cheap, high-value recall check for a lesson whose core is an ordered process. Optionally pin the minimal form code block above the steps for context.

Tooltip (`Term`) candidates in this section: **constraint validation** (one-line: "the browser's built-in pre-submit checks — `required`, `type`, etc.; full treatment Lesson 6"), **opaque action ID** ("the stable build-time identifier React swaps the imported function for, so the submit becomes a POST"). Keep tooltips to these two; the student knows `FormData`, `Result`, `revalidatePath` from prior chapters.

## Why not onSubmit and fetch

The decision section that dislodges the legacy reflex. This is the "trigger before tool" / "decisions before syntax" beat.

- Use **`CodeVariants`** with two tabs, before/after framing:
  - Tab **"onSubmit + fetch (legacy)"**: the 2018–2023 shape — `onSubmit={async (e) => { e.preventDefault(); const body = JSON.stringify({...}); await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); }}`, plus the per-field `useState`/`value`/`onChange` this pattern usually drags in. First sentence of prose: "Every line here is plumbing React 19 deletes." Use `del=` marks generously.
  - Tab **"action prop (2026)"**: `<form action={createInvoice}>` with uncontrolled inputs. First sentence: "Shorter, and it does strictly more." Use `ins=`.
- Prose below the variants — name the four concrete wins, each tied to something the student knows or will learn:
  1. **Shorter** — no handler, no `preventDefault`, no manual body construction.
  2. **Runs without JavaScript** — the form falls back to a plain POST to the action's URL if the bundle hasn't loaded; the `fetch` path needs JS to even fire. (Forward-ref Lesson 7 as the PE payoff.)
  3. **Reuses the framework's CSRF and serialization** — Next generates origin checks and tokens around action invocations; you don't roll your own. (Name once; chapter 081 owns it.)
  4. **Composes with `useActionState`/`useFormStatus`/`useOptimistic`** — the next three lessons plug into the `action` prop natively; an `onSubmit`+`fetch` form can't.
- The boundary, stated as the senior call: `onSubmit`+`fetch` is the *correct* reflex only when the submit target **isn't** one of the app's own Server Actions — a third-party SDK that wants a JSON body, an analytics beacon, a non-Next endpoint. For mutations of the app's own data, the `action` prop is the default. Frame as "the question is *who owns the endpoint*," not "which is newer."

## The automatic reset on success, and when it's wrong

Teaches the most surprising consequence of the `action` prop, and the senior judgment around it. Fact-checked against React 19 docs.

- State the behavior precisely: when an **uncontrolled** `<form action={fn}>` submits and the action resolves **successfully** (no throw), React **resets the form's inputs to their `defaultValue`s**. The reset runs *after* the commit of the render following the action — so `defaultValue` can reflect server-returned data. (This timing detail matters for the edit case below; mention it but don't belabor.)
- The senior anchor — *this is the right default for the most common form*: "create a thing, then create another." After creating invoice INV-104 the user wants a blank form for INV-105. The reset is a feature, not a bug, for create forms. Frame it this way first so the student sees the default as deliberate.
- Where it's wrong: **edit forms.** A profile/settings form that saves and stays on the page should keep the user's typed values visible after save — the auto-reset would blow them away (or snap them back to the original `defaultValue`). Two senior reaches, named:
  - **Pair with `useActionState` and feed `state.data` back as `defaultValue`** — the saved entity returns in the `Result`, becomes the next render's `defaultValue`, and the post-commit reset lands on the *saved* values, not the originals. This is the canonical fix and the reason the reset runs after commit. Hand off: "Lesson 3 wires this; the project's edit form uses it."
  - **`requestFormReset` from `react-dom`** — the explicit opt-out/manual-control API (affects uncontrolled inputs only). Name it once as the escape hatch for the rare case where you want to control reset timing yourself; default is to let React reset.
- Watch-out woven in (not a separate tips section): the reset fires **only on success** — a failed action (returned `ok: false`, or a throw) does **not** reset, so the user's typed values survive a validation failure and they can fix the flagged field and resubmit. This is the correct behavior and pairs with Lesson 3's field-error rendering; name it here so the student isn't surprised when the failing form keeps its values.

Components: prose-led. Optionally a tiny `CodeVariants` (create vs. edit) if it clarifies — but the create/edit distinction may be better as plain prose with two short `Code` snippets to keep the lesson from front-loading `useActionState` it hasn't taught. Lean prose-first; show the edit `defaultValue={state.data?.customer}` shape only as a forward-pointer, clearly labeled "next lesson."

## One form, two buttons: formAction

Teaches per-button action overrides — a small but real production pattern.

- The trigger: an edit page where the *same fields* drive *distinct mutations* — "Save draft" vs. "Publish," or a row with "Save" and "Delete." The form has one primary `action`; individual buttons override it.
- `Code` block: a single `<form action={saveDraft}>` containing `<button type="submit">Save draft</button>` and `<button type="submit" formAction={publish}>Publish</button>`. The browser collects the form's `FormData` and dispatches to whichever button was clicked — its `formAction` wins over the form's `action`.
- Prose: each `formAction` pairs with its own Server Action (and, in the full pattern, its own `Result` consumer — forward-ref Lesson 3). The form's primary `action` is the default for the default submit button / Enter key.
- Tie to the platform: `formAction` is the native HTML `formaction` attribute — React just camelCases it. The behavior is the browser's; React's contribution is letting the value be a function. Reinforces the chapter thesis (the platform does the work).
- Watch-out inline: don't pass `formAction={() => publish(data)}` — same rule as the `action` prop (next section's watch-out family); pass the function reference.

Keep this section short — it's one pattern with one code block.

## When Next's Form earns its weight

The decision section separating the React `action` prop from Next.js's `<Form>` component. Fact-checked: confirmed that `<Form>` cannot prefetch when the action is a Server Action because the destination is unknown until the action runs.

- Frame as a "trigger before tool" decision. Next ships its own `<Form>` (from `next/form`) that *extends* `<form>` with: prefetching of the destination route's loading UI, client-side navigation on submit, and progressive enhancement.
- The hinge: **`<Form>`'s headline feature only applies when `action` is a string URL.** A search/filter form GETs to `/search?q=...`; `<Form>` can prefetch that route's `loading.js`/`layout.js` as the form scrolls into view, warming the navigation. When `action` is a **Server Action**, the destination isn't known until the action *runs* — so the prefetch can't happen, and for our purposes `<Form>` and `<form>` are equivalent.
- The 2026 reflex, stated cleanly: **native `<form>` for mutations** (action is a function), **`<Form>` for search and filter** (action is a string URL). Mutations are this chapter's whole subject, so the chapter's default is the native `<form>`.
- Use a small **decision aid**. Two options, pick one:
  - A compact `StateMachineWalker` (`kind="decision"`, 1 question → 2 leaves): "Is the form's action a string URL or a function?" → string-URL leaf = `next/form` `<Form>` (prefetch + nav payoff); function leaf = native `<form>` (this chapter's default; `<Form>` adds nothing). This makes the *single deciding question* explicit and memorable.
  - Or, lighter, a two-row comparison table in prose. Prefer the `StateMachineWalker` since the whole point is one decision the student should be able to run themselves.
- Hand-off: the search-form case (URL state, `<Form>`, prefetch) is owned by the URL-state lesson in **chapter 060** — name once, don't teach it here.

Tooltip (`Term`): **prefetch** ("Next warms a route's shared UI before navigation so the transition feels instant") if the student needs it — judgment call; they may know it from Unit 4.

## The function reference is the contract

A focused section on the one mistake that silently breaks everything, elevated to its own beat because it's the single highest-frequency bug with this API and it breaks *both* the `FormData` argument and progressive enhancement.

- The rule: pass the action **function reference** directly — `action={createInvoice}` — never an arrow that calls it — `action={() => createInvoice(formData)}`.
- Why it breaks: wrapping in an arrow means React no longer recognizes the prop as a form action. It can't supply the `FormData` argument (where does `formData` in the arrow even come from?), and it loses the build-time rewrite that makes the no-JS POST fallback work — so progressive enhancement silently dies. The form may *appear* to work with JS enabled, which is what makes this bug expensive.
- Use **`CodeVariants`** (two tabs) or a tight `Code` pair with `del=`/`ins=`: the broken arrow form vs. the correct reference form. First-sentence framing on the broken tab: "Looks fine, works with JS, breaks without it and drops the argument."
- Connect forward: when you *need* to pass extra arguments alongside `FormData` (e.g., a fixed ID), the senior tool is `action.bind(null, id)` — name it once as the correct alternative to the arrow wrapper, so the student has the right reflex when the arrow temptation appears. Full use lands where the project needs it.

This section doubles as the home for the lesson's most important watch-out, per the guideline that watch-outs live in the section teaching the concept they qualify.

## Where this leaves the form (closing)

Short honest closer that sets up Lesson 3 — not a generic summary.

- State plainly what the form can and can't do now: it **submits** to the action, **resets on success**, and **falls back to a plain POST without JS**. It **cannot** yet tell the user it's saving (no pending state) or show what went wrong (the returned `Result` is ignored). 
- Name the bridge: `useActionState` is the hook that captures the action's pending state and its returned `Result` so the form can render "Saving…" and field errors — that's Lesson 3.
- One or two `ExternalResource` cards: React docs on `<form>` actions / `requestFormReset`, and the Next.js `<Form>` component reference. (LinkCards optional per guidelines; include the React forms doc at minimum.)

# Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- Uncontrolled inputs + `name`-is-the-contract + `FormData` round-trip — Lesson 1 (this chapter). Assume fluent.
- The Server Action five-seam shape, `"use server"`, the `Result` type, `Object.fromEntries(formData)`+`safeParse`, `revalidatePath` — chapter 043. Assume defined; reference, don't rebuild. The server action body is shown only as a collapsed/opaque step.
- `'use client'` and the server/client boundary — Unit 4 (chapters 030–032) + named in Lesson 1. State the rule, don't derive it.

**This lesson does NOT cover (defer explicitly so downstream agents and the student see the seams):**
- `useActionState` — the pending state and `Result`/field-error rendering. **Lesson 3** (next). This lesson's form intentionally ignores the returned `Result`; name the gap, don't fill it.
- `useFormStatus` and the reusable `<SubmitButton>` — **Lesson 4**.
- `useOptimistic` — **Lesson 5**.
- The Constraint Validation API in depth (`required`/`pattern`/`:user-invalid`/`setCustomValidity`) — **Lesson 6**. This lesson only *names* that constraint validation runs before the action in the submit lifecycle.
- The full progressive-enhancement thread (the five disciplines, the JS-disabled test, the `permalink` arg) — **Lesson 7**. This lesson only *names* the no-JS POST fallback as a reason to prefer the `action` prop and to pass the function reference.
- Imperative action calls from event handlers outside a form (`await action(...)` on a delete button/toggle) — named once as the third invocation shape (recap from chapter 043 lesson 1), full pattern deferred to **Lesson 5** for optimistic toggles. Do not build it here.
- The Next.js `<Form>` for search/filter with full prefetching — named as the decision boundary only; owned by **chapter 060**.
- CSRF / the Server Action security model (encryption, action-ID rotation) — named once as a "the framework owns this" reassurance; full coverage **chapter 081**.
- React Hook Form and shadcn's `<Form>` wrapper — **chapter 045**; not in this chapter's native pattern.
- Multi-step wizards / dynamic field arrays — **chapter 045**.

**Recap-only invocation shapes (name once, per chapter 043 lesson 1, do not expand):** the `action`-prop shape is this lesson; `useActionState`-wrapped is Lesson 3; imperative-call is Lesson 5. List all three for completeness so the student has the map, then teach only the first.

# Code conventions notes

- Worked entity: **`createInvoice`** / invoices, matching chapter 043 and the chapter 047 project. (Diverges from Lesson 1's signup; deliberate — flagged in framing.)
- Forms wire through `<form action={serverAction}>`; **uncontrolled inputs only** (`defaultValue`, never `value` without `onChange`) — Code conventions §Forms and Server Actions. Honored throughout.
- `'use client'` at the top of the form file; the action stays in its own `'use server'` file — §Components / §Forms.
- Server Action naming: verb+noun, no `Action` suffix (`createInvoice`, `publish`, `saveDraft`) — §Server Actions.
- **Deliberate divergence for staging:** the form in this lesson does **not** use `useActionState` (Code conventions' canonical form root). This is pedagogically intentional — the bare `action` prop is taught in isolation before the hook is introduced in Lesson 3. Downstream agents: the "incomplete" form here is by design; the canonical `useActionState`-rooted form is Lesson 3's deliverable. Do not "fix" this lesson's examples to add the hook.
- Pass the function **reference**; for extra args use `action.bind(null, …)`, never an arrow wrapper — reinforces the §Forms wiring rule.
- Code blocks kept ≤18 lines (component `maxLines` default); the minimal form and each variant fit comfortably.
