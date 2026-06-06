# Lesson 1 — The four triggers that flip the choice

Title: The four triggers that flip the choice
Sidebar label: When to reach for RHF

## Lesson framing

Archetype: **decision**, not mechanics. The single job is to install a *threshold* — the student leaves knowing exactly when the Chapter 044 native form pattern stops paying off and React Hook Form becomes the senior reach, and (just as important) when it doesn't. No RHF API is taught here beyond naming the feature each trigger maps to; the five primitives, the resolver, `useFieldArray`, and the wizard are Lessons 2–5. Treat this lesson as the chapter's gate: a student who reads only this page should still know when *not* to use RHF.

Pedagogical spine:

- **Trigger before tool.** The course's reflex is the native pattern by default. This lesson names the four UX shapes that cross the threshold and the cost of crossing it, so the student doesn't reach for RHF on every form (the "I learned a new tool" trap). This is the #1 beginner mistake with RHF and the lesson's primary failure mode to inoculate against.
- **Anchor in what they just built.** Chapter 044 is fresh (it's the immediately preceding chapter). Lead every trigger with the *specific* native-pattern mechanism it breaks — `<form action>`, uncontrolled inputs + `FormData`, the Constraint Validation API firing on submit, `useActionState`. The student already owns these; the lesson is a delta on a known baseline, not new territory.
- **The trust boundary is the durable anchor.** The one mental model the student must end with: *RHF replaces the client form-state layer; the Server Action's parse-authorize-mutate seam is untouched.* The schema is the source of truth, the action is the gatekeeper, RHF is one renderer. This recurs on every lesson of the chapter and is the load-bearing senior insight — beginners wrongly assume a client validation library means the server can trust the client. Visualize it.
- **Minimize cognitive load.** Present the simple model first (native pattern = default, one trigger = reach), then layer the cost and the landscape. Do not preview RHF syntax — that would front-load mechanics the lesson is deliberately deferring and dilute the decision focus.
- **Real production stakes.** Frame each trigger with a concrete SaaS form (invoice line items, onboarding wizard, role combobox, password-strength meter) so the threshold is felt, not memorized. Frame the cost honestly — progressive enhancement degrades — so the decision reads as a senior tradeoff, not a free upgrade.

The lesson is short (25–35 min). Keep prose terse and decision-forward. The centerpiece is an interactive decision walk (`StateMachineWalker`) that *is* the threshold; the rest of the lesson sets it up and reinforces it. Code is minimal and illustrative only — one before/after at the submit seam to make "what changes" concrete, nothing more.

## Lesson sections

### Introduction (no header)

Open on the senior question, stated implicitly per the pedagogical guidelines. Recall in two sentences what Chapter 044 shipped: the 2026 default form — native `<form action={serverAction}>`, uncontrolled inputs identified by `name`, `useActionState` for the result, the Constraint Validation API for cheap pre-submit checks. State plainly: that pattern covers most CRUD a SaaS will ever ship, and the course's reflex is to reach for it first. Then the pivot: four specific UX shapes break it, and when one fires, the senior reach is React Hook Form — a battle-tested, conditional power tool, not a replacement for the default. Preview the practical takeaway: by the end the student can look at any form spec and decide, in one pass, native vs. RHF. Warm, brief, 1 short paragraph.

Keep it tight — the decision walk and the triggers carry the weight, the intro just frames the gate.

### The default holds until something breaks it

Re-establish the baseline before naming what breaks it (simple model first). One short paragraph: the native pattern's value is *low coordination cost* and *progressive enhancement* — the DOM owns the live value, the platform validates on submit, the action owns the mutation, and the whole thing works without JS. List the forms that are *forever* native: login, signup, create-invoice (single, fixed fields), edit-profile, comment-create — text inputs and checkboxes that submit once and either succeed or surface field errors. This is the senior default, and the chapter's own project (Chapter 047) is deliberately written with the native pattern to anchor it.

Pedagogical reason: the student must hold the default firmly in mind *before* learning the exceptions, or every form looks like an RHF candidate. Naming the "forever native" list out loud is the counterweight to the four triggers that follow.

Use a short `Aside` (note) reinforcing: the question is never "should I use a form library?" — it's "has a trigger fired?" If not, the platform pattern wins on cost and PE.

### The four triggers

The core teaching section. Each of the four triggers gets an h3. The rhythm is identical and deliberate per trigger: (1) a concrete SaaS scenario, (2) the *specific* native-pattern mechanism that breaks and *why*, (3) the RHF feature that addresses it — named only, forward-referenced to its lesson, never explained here. Keep each to a tight paragraph; the depth lives in Lessons 2–5.

Intro paragraph before the h3s: these are the only four shapes that flip the choice. They're a checklist, not a spectrum — one is enough to justify the reach. Memorizing them *is* the senior skill this lesson installs.

#### Validation timing past submit

Scenario: show "email is invalid" after the user *blurs* the field; show a live password-strength meter as they type. The native break: the Constraint Validation API fires on submit and the Server Action parses on receive — both run only *after* the user has typed the whole form. Per-field, per-keystroke, or per-blur feedback would force hand-written `onBlur` handlers, per-field client schemas, and ref reads bolted onto the uncontrolled pattern. RHF's `mode` setting (`'onBlur' | 'onChange' | 'onTouched'`) plus the resolver gives this for free — named, deferred to Lesson 2 (`mode`) and Lesson 3 (resolver).

#### Dynamic field arrays

Scenario: an invoice with a variable number of line items; a survey with add/remove questions; a permissions matrix with row controls. The native break: flat `FormData` forces array-index names (`lineItems[0].amount`), key-walking after `Object.fromEntries`, and a parallel `useState` array of IDs to drive add/remove/reorder — bookkeeping that grows with every interaction. RHF's `useFieldArray` owns the array's identity tracking and re-render coordination — named, deferred to Lesson 4.

#### Multi-step wizards across many components

Scenario: a five-step onboarding flow (company, billing, plan, payment, confirm), each step its own component, the user can go back and edit. The native break: the form's state would have to live in a parent `useState` or context and prop-drill into every step; the native pattern has no first-class home for state that spans the tree and persists across step changes. RHF's `FormProvider` + `useFormContext` carries one form instance across the tree without prop-drilling — named, deferred to Lesson 5.

#### Controlled UI library inputs

Scenario: shadcn's `Combobox`, `Select`, a date picker, a rich-text editor — the kind of input a real SaaS form is full of. The native break: these are *controlled* components built on Radix; they own their value through `value`/`onChange` props and expose no native `<input name=...>`, so they can't round-trip through `FormData`. RHF's `Controller` / `useController` bridges a controlled child into the form's state — named, deferred to Lesson 2. Define **controlled component** with a `Term` here (a component whose value is owned by React state via `value`/`onChange`, not the DOM) — the controlled/uncontrolled distinction is the crux of this trigger and the student met it in the React chapters but it's worth re-anchoring without breaking flow.

After the four h3s, restate the threshold as a single line the student can carry: **reach for RHF when (a) the form needs validation timing other than on-submit, or (b) the field shape is dynamic, or (c) the form spans steps with persistent state, or (d) controlled UI-library inputs must participate in form state. Otherwise, the native pattern.** Set this apart visually (its own short emphasized line or a one-line `Aside`) — it's the line the lesson exists to deliver.

### Walk the decision yourself

The interactive centerpiece. A `StateMachineWalker` with `kind="decision"` (default) that forces the student through the senior decision *order* — the walker's pedagogical value is the order the questions are asked in, not any single leaf. This embodies "trigger before tool" as a thing the student *does*, not just reads.

Decision-tree shape (root question first, one trigger per branch, leaves are verdicts):

- Root `<Question>`: "Does the form need per-field validation before submit (on blur / as-you-type)?" → Yes branch to a `<Leaf>` "Reach for RHF" (rationale: `mode` + resolver, Lesson 2/3); No branch to the next question.
- "Does the field set grow/shrink at runtime (add/remove rows)?" → Yes → `<Leaf>` "Reach for RHF — `useFieldArray`" (Lesson 4); No → next.
- "Does the form span multiple steps with state that persists across them?" → Yes → `<Leaf>` "Reach for RHF — `FormProvider`" (Lesson 5); No → next.
- "Does the form include controlled UI-library inputs (combobox, date picker) that must validate as part of the form?" → Yes → `<Leaf>` "Reach for RHF — `Controller`" (Lesson 2); No → terminal `<Leaf>` "Stay native — the Chapter 044 platform pattern" (rationale: lower coordination cost, progressive enhancement, the senior default).

Each `<Leaf>` verdict pill is short ("Reach for RHF", "Stay native"); the reason body names the RHF feature and forward-references the lesson, or (for the native leaf) names the two reasons it wins (cost, PE). This is a guided decision exercise, strictly preferable to prose for a decision archetype — the student commits to a path and sees the verdict, which is exactly the senior muscle being trained. Do **not** wrap in `<Figure>` (the walker is its own card).

Add one sentence after the walker: the four-question order isn't arbitrary — any *one* Yes ends the walk at RHF, so the walk also proves the threshold is a disjunction (OR), not a checklist that must all pass.

### What adopting RHF actually costs

The honest-tradeoff section — prevents the student from reading the four triggers as "RHF is just better." Walk the four concrete changes when a form moves to RHF, each one short:

1. **The form is already a Client Component.** `'use client'` was true in Chapter 044 too — this is *not* a new cost. Name it to dismiss it.
2. **Inputs become controlled (or RHF-managed).** RHF wires `value`/`onChange` (or `register`'s ref) per input; the DOM no longer solely owns the live value. (One sentence — mechanics are Lesson 2.)
3. **The submit changes hands.** The `action` prop is replaced: RHF intercepts the submit to run client validation first, *then* invokes the Server Action as a callback. This is the single most important shape-change and the one downstream lessons build on. Make it concrete with the one code comparison in the lesson (see below).
4. **Progressive enhancement degrades.** RHF needs the JS bundle to function — the no-JS submit no longer client-validates. The senior call: accept the PE loss *because the affected forms aren't the ones a no-JS user uses* (wizards, configurators, complex arrays are signed-in, JS-on surfaces). For public, legally-required, or marketing forms where PE is non-negotiable, RHF is the wrong reach — foreshadow Conform in the landscape section.

For change #3, use a **`CodeVariants`** with two tabs — "Native (Ch 044)" vs. "RHF" — showing *only the submit seam*, before/after:

- Native tab: `<form action={createInvoice}>` — the action prop wired directly. One-line caption: the platform owns the submit; the action runs on POST.
- RHF tab: `<form onSubmit={form.handleSubmit(onSubmit)}>` where `onSubmit` is a small `async (values) => { const result = await createInvoice(values); /* map errors */ }`. Caption: RHF intercepts, validates client-side, *then* calls the same action — the action is unchanged.

Keep both tabs to ~5 lines. The pedagogical goal is the *shape delta at the seam*, not teaching `handleSubmit` (that's Lesson 2). Mark in the outline that this code is deliberately under-explained — downstream agents should not expand it into a mechanics tutorial here. Both samples assume the form is already `'use client'` and the schema/action exist; do not show their definitions.

End the section by tying back to the trust boundary (next section).

### The seam to the server is untouched

The durable mental model — give it its own short section so it lands hard, because it's the senior insight that recurs every lesson and the one beginners get wrong.

Prose: adopting RHF does **not** move the trust boundary. The Server Action still parses `FormData` (or a typed payload) with `safeParse` on entry, still authorizes, still mutates in a transaction, still returns the canonical `Result`, still revalidates — exactly the five-seam shape from Chapter 043. RHF runs the *same* Zod schema client-side to drive the inline UX, but the client is never trusted: the resolver is a UX convenience, the action's `safeParse` is the gate. The senior anchor, stated flatly: **any architecture that validates only in RHF and skips the action's `safeParse` has the wrong trust boundary.** (The one-schema-both-sides wiring is Lesson 3 — name it, don't teach it.)

Visualize it. Pedagogical goal: make "RHF is a client layer in front of an unchanged server gate" spatial, with the *trust line* (the wire) as the visual centerpiece. Horizontal flow, client zone left, a labeled vertical "trust boundary — the wire" divider in the middle, server zone right:

- Client box: "RHF form — resolver runs Zod schema (UX validation)"
- Forward arrow crossing the trust line, labeled "FormData / typed payload"
- Server box: "Server Action — `safeParse` (the gate) → authorize → mutate → return Result"
- Return arrow from server back to client labeled "Result (field errors)" — the round-trip.
- The *same Zod schema* feeds both the client box and the server box — show as one shared schema node both zones reference (previews Lesson 3's one-schema discipline visually without teaching it).

Engine choice: the topology is cyclic (forward payload + return Result) *and* has a shared schema node fanning to both sides — per the `ArrowDiagram` doc, cyclic A↔B pairs and 3+ arrows in one gap make leader-line curves cross. **Prefer a Mermaid sequence diagram** (`Client/RHF` and `Server Action` as the two actors, forward `FormData` message, the `safeParse` gate as a note on the server lane, return `Result` message) — direction lives on the chart axis so routing isn't a problem, and the trust boundary reads as the gap between the two lanes. If the author wants the schema-feeds-both visual instead, fall back to `ArrowDiagram` with **color-matching** (one tint on the shared schema node and on both client/server references) rather than arrows for that correspondence, and draw only the forward/return flow as arrows. Either way wrap in `<Figure>` (Mermaid and `ArrowDiagram` both need the figure chrome) and keep it horizontal, well under the height cap.

Caption: the trust line is the wire — client-side validation is for the user, server-side validation is for the system. Define **trust boundary** with a `Term` (the line past which data from a less-trusted zone — the browser — must be re-validated before the system acts on it).

### The 2026 form-library landscape

Name the alternatives once so the senior decision is *visible* — the student should know RHF was chosen against alternatives, not in a vacuum. One tight paragraph each, no code. The pedagogical reason: a senior picks a tool knowing what it's *not*; naming Conform and TanStack Form on their distinguishing axis makes the RHF choice legible and prevents the student from later thinking RHF is the only option.

- **React Hook Form** — the course's reach for the conditional pattern. Battle-tested, performant (uncontrolled-by-default + subscription model so registered inputs don't re-render the form root per keystroke), the largest ecosystem of resolvers/adapters, and the documented integration with shadcn's `<Form>` primitives. The default once a trigger fires.
- **Conform** — optimizes for *progressive enhancement on top of Server Actions*: the same Zod schema validates client and server, and the action receives `FormData` directly. The right reach when PE is non-negotiable past simple CRUD — legally-required forms, public marketing forms with complex validation. Named once; out of scope for the chapter. (Ties back to the PE-cost section: this is the tool for the forms where RHF's PE loss is unacceptable.)
- **TanStack Form** — smallest bundle, strongest TypeScript inference, per-validator timing. The right reach for form-heavy products (config UIs, dashboards) where the type system pays off. Named once; out of scope.

Close with the reflex, one line: **native pattern by default, RHF when a trigger fires.** The other libraries earn their weight on specific axes (PE, bundle/types) that don't dominate most SaaS forms.

Use a small `CardGrid` of three `Card`s (one per library) OR a `TabbedContent` with three tabs if the prose reads better tabbed — author's call; the goal is three skim-able, side-by-side one-paragraph profiles, not buried prose. Lean `CardGrid` for at-a-glance comparison.

### Check your threshold

A short formative exercise closing the lesson, placed here (not at the end as an afterthought) so it reinforces the gate while it's fresh. Use **`Buckets`** with two buckets — "Stay native (Ch 044)" and "Reach for RHF" — and 6–8 form-spec chips the student sorts:

Native chips (no trigger fires): "Login form: email + password, submit once"; "Edit-profile: name, bio, avatar URL, save"; "Comment box: one textarea, post"; "Create-invoice with exactly one client + amount".

RHF chips (a trigger fires): "Onboarding: 5 steps, back-navigation, edit prior steps" (wizard); "Invoice with add/remove line items" (field array); "Signup with live password-strength meter" (validation timing); "Booking form with a date-picker and a searchable client combobox" (controlled UI inputs).

`instructions` prop: "Sort each form spec by whether a trigger fires. If none does, it stays native." Pedagogical goal: classification under the exact decision the lesson installed — the student must *apply* the threshold, not recall it. The chip wording deliberately echoes the four triggers so the mapping is learnable. Grading is built into `Buckets` (green/red on Check).

Optionally precede with one **`MultipleChoice`** to nail the trust-boundary point: a question like "A team validates a signup form with RHF + zodResolver and ships. The Server Action skips `safeParse` because 'the client already validated.' What's wrong?" — correct answer names the trust boundary (client validation is for UX, the server must still parse untrusted input); distractors are plausible-but-wrong (e.g., "nothing, the schema is shared", "RHF re-validates on the server"). This directly targets the lesson's most important misconception. Place it just before or after the Buckets drill.

### External resources (optional)

One or two `ExternalResource` cards: the React Hook Form homepage/docs (for the student who wants to skim ahead) and optionally the RHF "Get Started" page. Keep minimal — the chapter teaches RHF properly in the next lessons, so this is a courtesy pointer, not required reading. No YouTube video needed for a decision lesson — the content is judgment, not a procedure a video clarifies; a video would add length without teaching the threshold better.

## Scope

Prerequisites the student already has (redefine in one phrase max, do not re-teach):

- **The native form pattern** (Chapter 044): `<form action>`, uncontrolled inputs + `name` + `FormData`, `useActionState`, `useFormStatus`/`SubmitButton`, `useOptimistic`, the Constraint Validation API, progressive enhancement. This lesson *contrasts against* it — recall the relevant mechanism per trigger, never re-explain it.
- **The Server Action seam** (Chapter 043): the five-seam `parse → authorize → mutate → revalidate → return` shape and the canonical `Result<T>`. Referenced as the unchanged server side — name it, don't re-teach it.
- **Zod schemas** (Chapter 042): schemas as the validation contract, `z.input`/`z.output`, `safeParse`. Referenced as the shared source of truth — the *resolver wiring* is explicitly Lesson 3.
- **Controlled vs. uncontrolled components** and **shadcn `<Form>` primitives** (React chapters + Chapter 027): re-anchor "controlled" with a `Term` only; the shadcn `<Form>` consuming the RHF instance is Lesson 2.

This lesson does **not** cover (defer, do not teach):

- The five RHF primitives — `useForm`, `register`, `Controller`, `handleSubmit`, `formState` (Lesson 2). Name features only; show no API beyond the one submit-seam comparison.
- The `zodResolver` wiring, `z.input` vs `z.output` bridge, server-error mapping via `setError` (Lesson 3).
- `useFieldArray` operations and the array schema shape (Lesson 4).
- `FormProvider` / `useFormContext`, per-step `trigger`/`.pick()`, `shouldUnregister` (Lesson 5).
- Conform and TanStack Form in any depth (named once each, out of scope).
- shadcn `<Form>` / `<FormField>` API surface (Chapter 027 owns it; Lesson 2 shows it consuming RHF).

Hard rule for downstream agents: keep this lesson a *decision* lesson. Resist expanding any named RHF feature into mechanics — every expansion belongs to a later lesson and dilutes the gate this lesson exists to install.

## Code conventions notes

- The one code comparison must reflect the conventions' submit wiring: native uses `<form action={serverAction}>` with uncontrolled inputs; the RHF variant calls the Server Action *from inside* `onSubmit` after client validation. The action signature/body is not shown (it's unchanged and owned by Ch 043), but any reference to it must preserve the five-seam shape and `Result` return.
- Per Code conventions §"Forms and Server Actions": the action still parses on entry with `safeParse` regardless of RHF — the trust-boundary section and diagram must state this explicitly, as it's the convention's load-bearing rule.
- Deliberate divergence: the RHF submit-seam snippet is intentionally minimal and under-explained (no `useForm` setup, no resolver, no `formState`). This is staged simplicity for a decision lesson — flag it so the Lesson 2 agent knows the full shape lands there, not here.
- Use shadcn primitives as imported (no forks) in any incidental reference, per §"shadcn primitives".
