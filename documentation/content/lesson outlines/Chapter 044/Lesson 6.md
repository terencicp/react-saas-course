# Constraint Validation, the cheap layer

- **Title (h1):** Constraint Validation, the cheap layer
- **Sidebar label:** Constraint Validation

## Lesson framing

The chapter so far built the server side of the seam: the form submits, the action `safeParse`s with Zod (ch.042), and `useActionState` renders the returned `Result.error.fieldErrors` (L3). That works, but every error costs a server roundtrip. This lesson installs the *client-side, zero-JS* validation layer the platform already ships — the browser's Constraint Validation API — and draws the one line every junior gets wrong: where this layer ends and the Zod parse begins.

The senior mental model this lesson must land: **two mirrors and a wall.** The constraint attributes (`required`, `type`, `minlength`, `pattern`, …) and the Zod schema *mirror* each other for "shape" rules (presence, length, format, range) — same rule, two enforcement points, two reasons. The action body is a *wall* the client can never see past: uniqueness, plan limits, suppression lists — checks that need server state — live there alone. The constraint API is an optimization on top of a correct server, never a substitute for it. This is the single highest-stakes idea; everything else (which attribute, which pseudo-class) is mechanics.

Why this matters beyond mechanics: a junior who learns constraint attributes first often *stops there* and ships a form whose only defense is HTML attributes a curl request ignores. The lesson's job is to make the attributes attractive (they're cheap, native, accessible, and improve UX) while hammering that they're the cheap layer, not the boundary of correctness.

The lesson is a mechanics archetype with a strong decision spine. Cognitive-load plan:
1. Open on the concrete pain (200ms roundtrip to learn a field is empty) and the senior question.
2. Teach the attributes as a catalogue grounded in the running invoice form — these are familiar HTML, framed at the call site, not as preamble.
3. Pin the constraint/Zod line with a diagram (the load-bearing concept).
4. Cover the React-19 submit-lifecycle interaction (the action doesn't fire on invalid) — connects to L2's lifecycle.
5. Styling the invalid state (`:user-invalid`, not `:invalid`) — the #1 UX bug at this API.
6. Suppressing the native bubble and owning inline errors with the design system — the production posture.
7. `setCustomValidity`/`ValidityState` for the cross-field case attributes can't express — named once, kept minimal.
8. `autocomplete`/`inputmode` as a non-optional discipline — zero-cost wins.
9. The shadcn form *layout* primitives (`FormItem`/`FormLabel`/`FormControl`/`FormMessage`) used **without** RHF — close the chapter's "what does shadcn add to a native form" question.

Worked entity stays **`createInvoice` / invoices** (continues L2-L5). Reuse the established names verbatim: the canonical form skeleton from L3, `<FieldError id messages>` (`field-error.tsx`), `<SubmitButton>` (`submit-button.tsx`), the `state?.ok === false` discriminator, `state.error.fieldErrors?.<field>?.[0]` read. The form file is `app/invoices/new-invoice-form.tsx`.

Keep the running anchor line from the chapter: client validation is the cheap layer; **the server is the boundary of correctness.** Use it as the through-line.

## Lesson sections

### Introduction (no header)

Open with the concrete scene that motivates the whole lesson: the invoice form from L3 is wired, submits, and renders server-returned field errors via `useActionState`. The user submits with an empty amount field, waits ~200ms for the POST to round-trip, and *then* sees "Required." The browser already knew that field was empty before any network call. State the senior question implicitly: what's the platform's built-in pre-submit check, how does it interact with the React 19 submit we wired in L2, and — the real lesson — where's the line between this and the Zod parse on the server?

Preview the payoff in one breath: by the end you'll add cheap native checks that fire before the network, style them so they only appear after the user interacts, replace the ugly native bubble with the design system's inline error, and know exactly which rules belong here vs. the schema vs. the action body. Keep it to ~4 sentences, warm and terse. Name the anchor: **constraint validation is the cheap layer; the server is the boundary of correctness.**

No diagram here — the motivating contrast is prose. Reserve the first visual for the two-mirrors-and-a-wall section.

### The attributes the browser already validates

Goal: teach the constraint attributes as a practical catalogue, grounded in the invoice form, so they read as "HTML you already know, used deliberately." Decisions-before-syntax framing: each attribute is a rule the browser enforces *for free, before the network*.

List and explain, each tied to a concrete invoice field so it's never abstract:
- `required` — non-empty (the amount, the customer).
- `minlength` / `maxlength` — string-length bounds (an invoice note capped at 500).
- `min` / `max` / `step` — numeric and date bounds (amount `min="0"` `step="0.01"`; due date `min` = today).
- `pattern` — regex full-match for `type="text"` (an invoice reference like `INV-\d{4}`).
- `type="email" | "url" | "number" | "tel" | "date"` — type-bound format checks.

Then the two attributes on the same surface that are *not* validation but ride along (flag this distinction explicitly so students don't think they reject input): `inputmode` (mobile soft-keyboard hint) and `autocomplete` (autofill/password-manager hint). Note here that these two get their own discipline section later; mention once and move on.

Teaching vehicle: **AnnotatedCode** over the invoice form's input cluster (~12-15 lines, under the 18-line cap). Write the form once; step through it highlighting one attribute group per step (color blue as default). Steps:
1. `{n}` on the amount input — `required`, `min`, `step` together; the browser blocks submit and reports without any JS.
2. the note `<textarea>` — `maxlength`.
3. the reference input — `pattern` with the `INV-\d{4}` regex; call out that `pattern` requires a **full** match.
4. `type="email"`/`type="date"` on the relevant fields — type-bound checks.

Keep prose per step to ~3-4 lines (component cap is 6). Each step's prose says *what the browser does on submit*, not *what the attribute is named* — keep it behavioral.

One `Aside type="caution"` after the walkthrough, because two attribute gotchas bite immediately and belong with the concept that introduces them:
- `type="number"` treats the **empty string as valid** — an untouched number field passes its type check; `required` is still needed to force a value.
- `pattern` is **full-match** — `INV-\d{4}` rejects `INV-12` *and* `xINV-1234`; for partial/contains rules the check belongs in JS or the schema.

`Term` candidate: **Constraint Validation API** (define on first use: the browser's native, pre-submit form-validation surface — attributes plus a JS `ValidityState` API).

### Two mirrors and a wall: where each check lives

Goal: the load-bearing concept of the lesson. Make the constraint/Zod/action-body boundary concrete and memorable. This is the section that prevents the "HTML attributes are my validation" failure.

Teach the three-rule decision:
1. Anything the browser can check cheaply (presence, length, format, range) goes in the constraint API **for UX**.
2. Every rule that's on the client is **also** on the server, in the Zod schema — because stale clients, JS-disabled submits, and scripted/`curl` requests never run the attributes. The client mirror is an optimization; the schema is correctness.
3. Cross-resource / DB-dependent checks (invoice number uniqueness within the org, customer-exists, plan invoice-count limit) **can't** live on the client — they need server state. They live only in the action body, after the parse (the five-seam shape's `mutate` stage from ch.043).

Frame the metaphor explicitly: constraint attributes and the Zod schema are **two mirrors** of the same shape rule (e.g. `required` ↔ a non-optional schema field; `type="email"` ↔ `z.email()`; `maxlength={500}` ↔ `.max(500)`). The action body is a **wall** — the client can't see the data needed to check it.

Diagram (this section earns the lesson's primary visual): **HTML+CSS three-zone figure** wrapped in `<Figure>`. Horizontal layout (laptop-short viewport): three labeled zones left-to-right —
- Zone 1 "Browser (constraint attributes)" — chips: `required`, `type="email"`, `min`, `maxlength`, `pattern`. Sub-label: "before the network · free · skippable."
- Zone 2 "Server schema (Zod)" — chips mirroring zone 1: non-optional, `z.email()`, `.min/.max`, `.regex()`. Sub-label: "the boundary of correctness."
- Zone 3 "Action body" — chips: uniqueness, plan limit, customer exists. Sub-label: "needs server state · client can't see it."

Visually pair zones 1↔2 with a "mirror" connector (a double-headed arrow or a literal "= mirrors" label between matching chip rows) and set zone 3 apart with a wall/divider glyph before it. Caption: "Shape rules are mirrored on both sides; business rules live only behind the wall." Pedagogical goal: one glance encodes the whole decision — what's duplicated (on purpose) vs. what's server-only. Follow the html-css.md guidance: inline styles, `margin: 0` on every nested element, saturated mid-tone fills with white text for the zone headers, `flex-wrap: wrap` with split `column-gap`/`row-gap` for chip rows. Keep height well under 800px.

Follow the diagram with a short reinforcement: the duplication between zone 1 and zone 2 is **not** a smell — it's two layers serving two purposes (UX speed vs. correctness). The course's Zod convention already says the schema is the single source for the *shape*; the constraint attributes are the schema's shape rules *projected forward to the browser* for instant feedback. (Do not teach a tool that auto-generates attributes from the schema — none is in the stack; state that keeping them in sync is a manual, reviewed discipline, the same way the `name` contract is.)

Exercise (best fit for a decision concept): **Buckets**, `twoCol`, three buckets — "Constraint attribute (client + schema)", "Schema only", "Action body only". Items drawn from the invoice domain so it tests the actual line, e.g.:
- "Amount must be present" → constraint+schema
- "Amount must be a positive number" → constraint+schema
- "Email is a valid email" → constraint+schema
- "Note is at most 500 chars" → constraint+schema
- "Invoice number is unique within the org" → action body only
- "Customer belongs to this org" → action body only
- "Org is under its monthly invoice limit" → action body only
- "Two-decimal currency precision" → schema only (HTML `step` is a UX nudge, not a guarantee — good discriminator item; explain in the post-check note that `step` doesn't strictly enforce precision)

`instructions`: "Sort each invoice rule into where it must be enforced." This drill is the assessment that the wall/mirror model stuck.

### How constraint validation meets the React 19 submit

Goal: connect the attributes to the submit lifecycle the student wired in L2, so the two models compose rather than compete. Short section.

Teach: the `<form action={formAction}>` submit from L2 respects native validation. On submit React first lets the browser run constraint validation; if any field is invalid, **the action never fires** — the browser blocks submission, shows the first invalid field's native bubble, and moves focus to it. So the cheap layer sits *in front of* the whole L2/L3 pipeline at no extra wiring cost: invalid-shape submits never reach the network, never spend `isPending`, never produce a `Result`.

Reuse the L3 submit-lifecycle beats (from continuity notes) and insert constraint validation as the gate before serialization: click → **browser constraint-validate (invalid ⇒ stop, report, focus)** → serialize named inputs to `FormData` → `isPending` → action runs → `Result` → re-render. Present as a tight ordered list (`Steps` or plain prose); no need for a heavy diagram — this is a recap with one inserted beat the student already saw named in L2's lifecycle.

`Aside type="note"`: this is why the server still returns field errors *and* you keep attributes — they cover different submitters. The attributes stop the common case (a human who left a field blank) before the network; the schema catches everything that bypasses the browser. Tie back to the anchor line.

### Styling the invalid state without lying to the user

Goal: the #1 UX bug at this API — fields that flash red on first paint. Teach `:user-invalid` as the correct default. This is mechanics with a sharp watch-out, so the watch-out lives here, in the section that teaches the concept.

Teach the pseudo-classes: `:invalid` / `:valid` (validity *now*, from first render), `:user-invalid` (validity *after the user has interacted with the field or tried to submit*), `:placeholder-shown` (useful for float-label patterns, name once). The senior call: `:invalid` paints every empty-required field red the instant the page loads — wrong, hostile UX. `:user-invalid` is the correct default: error styling appears only after the user has engaged the field or attempted submit.

Tailwind v4 mapping (the course styles through Tailwind, per conventions): `user-invalid:border-destructive` (and the `aria-invalid:` variant for the server-error case the field-error component already drives). Show a tiny `Code` block of the input's className using the semantic `destructive` token (conventions: semantic tokens, not primitives).

Visual: a **TabbedContent** or a compact `ReactCoding` with `live` + `target` would both work; pick **`ReactCoding`** (`live`, `target`, `tailwind` on) so the student *feels* the difference by typing. Two-input target: one styled with `invalid:` (reds immediately) vs. one styled with `user-invalid:` (stays neutral until touched). Instruction: "Type in each field, then clear it — notice which one was red before you touched it." This is the rare case where target-match exploration beats a tests-graded drill, because the lesson point is a *timing* feel, not a correct DOM shape. Keep starter minimal (two `<input required>`s, one with each class) so the student edits classes and watches behavior. Note for the builder: ReactCoding runs client-only, so this is pure client styling — no action involved, which is honest here (it's a CSS lesson, not a submit lesson).

`Aside type="caution"` consolidating the watch-out *in situ*: `:invalid` (or Tailwind `invalid:`) on a required field styles it red on first paint before the user has done anything — always reach for `:user-invalid` for post-interaction error styling.

### Replacing the native bubble with the design system

Goal: the production posture — keep the cheap pre-submit check, but render errors with the design system instead of the browser's gray tooltip. Decision section: two patterns, one default.

Frame the problem: the native bubble ("Please fill out this field") is fine for a prototype but clashes with a designed SaaS UI, can't be styled, and is positionally awkward. Two ways to take control:

Use **CodeVariants** (two variants, this is exactly the A/B the component is for):
- Variant "Drop native validation" — `noValidate` on the `<form>`. Disables *all* constraint checks; the action prop still runs; the Zod parse on the server catches everything and `useActionState` renders the field errors (the L3 path). The honest tradeoff stated in the first sentence: every shape error now costs a server roundtrip — the very latency this lesson opened against. Senior trigger: the design system fully owns inline-error rendering and you've accepted the roundtrip cost (rare).
- Variant "Keep the check, suppress the bubble" — keep the attributes; suppress the native tooltip with `onInvalid={(e) => e.preventDefault()}` and render a custom inline message keyed off the `:user-invalid` styling (and/or reading `e.currentTarget.validity`). Senior reach for production: cheap pre-submit check *plus* design-system inline errors.

State the chapter default clearly: **keep constraint validation on; let the design-system inline error (driven by `:user-invalid` styling plus the existing `<FieldError>` reading the action's `Result`) take over the rendering, which suppresses the native bubble in practice.** The `<FieldError>` component from L3 is already the renderer for server-returned errors; the constraint API's job is to stop the submit early, and the styling makes the "this field is invalid" state visible without the bubble. Connect the two error sources explicitly: pre-submit shape errors → `:user-invalid` styling (and optional inline text); post-submit server errors (including business-rule failures) → `<FieldError>` from the `Result`. One field, two possible error origins, one consistent visual.

`Aside type="caution"`: `noValidate` disables the cheap checks *too*, not just the bubble — reach for it deliberately, never as the default way to hide the tooltip. The default keeps the checks and lets the custom UI override the bubble.

### When attributes aren't enough: setCustomValidity

Goal: the escape hatch for rules HTML attributes can't express (cross-field, computed). Keep it minimal and trigger-gated — the continuity notes say the typical Unit 6 form sticks to attributes; this is "named once."

Teach: when a rule spans fields (e.g. an invoice's due date must be after its issue date) or needs computed logic, attributes can't express it. JS can mark a field invalid programmatically: `input.setCustomValidity('Due date must be after issue date')` flags it (and it then participates in `:user-invalid` styling and blocks submit); `input.setCustomValidity('')` clears it. `input.validity` exposes the `ValidityState` flags (`valueMissing`, `typeMismatch`, `tooShort`, `rangeOverflow`, `patternMismatch`, `customError`, …) for inspecting *why* a field is invalid.

The React-idiomatic call site: an `onInput`/`onBlur` handler reads the input via a ref and calls `setCustomValidity`. Keep this a small `Code` block, not AnnotatedCode — it's one named technique, not a complex walkthrough. Reiterate the boundary: even a `setCustomValidity` cross-field check is **still** mirrored in the schema (a Zod `.refine()` on the object) — the client check is UX, the schema check is correctness. This keeps the wall/mirror model intact for the one case that feels like "real" client logic.

`Term` candidate: **ValidityState** (define: the read-only object on every form control exposing which constraints currently fail).

Explicitly scope-out async/server-hitting validation (uniqueness on blur) — that's a ch.045 concern (RHF + zodResolver) or a deliberate debounced `onBlur` fetch; name once, don't build.

### Autocomplete and inputmode: the zero-cost wins

Goal: install the discipline that these two attributes are non-optional on real forms. Short, high-value section. Conventions/a11y angle: these are accessibility and UX wins at zero cost, and scaffolds routinely omit them.

Teach `autocomplete`: every input holding a known data type carries the right token so browsers and password managers autofill and surface relevant credentials. Give the practical token list as a quick reference (a small `Card`/inline list or just prose): `email`, `name` / `given-name` / `family-name`, `street-address`, `postal-code`, `country`, `tel`, `bday`, and the security-relevant `new-password` / `current-password` / `one-time-code`. Call out the security pair specifically: `new-password` triggers the password manager's suggest-strong-password flow on signup; `current-password` and `one-time-code` get the right autofill on sign-in/2FA. (These three matter for the auth forms the course builds later — name the forward link lightly to Unit 9 auth without teaching it.)

Teach `inputmode`: the soft-keyboard hint on mobile — `numeric` / `decimal` (the invoice amount), `email`, `tel`. Pair `inputmode` with `type` rather than replacing it (`type` carries validation + semantics; `inputmode` only changes the keyboard).

State the reflex plainly: `autocomplete` is non-optional on any field the user has typed before; `inputmode` is the cheap mobile UX pairing. Both are zero-cost accessibility/UX wins that scaffolds leave blank — fill them in.

`Aside type="tip"`: a one-liner that filling `autocomplete` is the difference between a form a password manager helps with and one it fights.

No exercise here — it's a discipline, covered by the quiz. Optionally fold the `autocomplete` token reference into a `Buckets`-free quick list; keep it light.

### What shadcn adds to a native form

Goal: close the chapter's standing question — "we use shadcn (ch.027); what does it give a `<form action>`?" — and make the senior call that you use its **layout** primitives without its RHF wrapper. This section also sets up ch.045 (where RHF earns its weight) without teaching RHF.

Teach precisely what the shadcn form primitives are and split them by purpose:
- **Layout primitives** (engine-agnostic): `<FormItem>` (vertical label/control/message stack with consistent spacing), `<FormLabel>`, `<FormControl>`, `<FormDescription>`, `<FormMessage>`. These are just styled, accessible wrappers — they wire the label-to-control association and the `aria-describedby`/`aria-invalid` plumbing the a11y baseline (ch.027 L5) demands, with the design system's spacing.
- **The RHF-coupled root**: shadcn's `<Form>` / `<FormField>` are a thin wrapper over React Hook Form's context. These you **don't** adopt in this chapter — they need the RHF instance that ch.045 introduces.

The senior call (state it as the chapter's position): the **layout** primitives compose cleanly with native `<form action={formAction}>` + `useActionState` — you get the design system's field spacing, label wiring, and message slot **without** taking on RHF. You keep uncontrolled inputs, `name` as the contract, and the L3 state model; shadcn just makes the markup consistent and accessible.

Teaching vehicle: **CodeVariants**, before/after of one invoice field —
- Variant "Hand-rolled" — the L3 field cluster: `<label>` + `<input>` + `<FieldError>` with manual `aria-invalid`/`aria-describedby`/`useId`. Note: this is correct and shippable (it's what L3 built).
- Variant "shadcn layout" — the same field inside `<FormItem><FormLabel/><FormControl><Input .../></FormControl><FormMessage>…</FormMessage></FormItem>`, still a native `<form action={formAction}>`, still uncontrolled, still reading `state.error.fieldErrors` for the message. First sentence states the win: same behavior, design-system spacing + accessible wiring for free, no RHF.

Important accuracy note for the builder (verify against current shadcn): shadcn's `<FormMessage>` and the field's a11y wiring are, in the canonical shadcn implementation, **driven by `<FormField>`/`useFormField`, which depend on RHF context**. So a fully-faithful "shadcn layout without RHF" uses the *visual* primitives (`FormItem`/`FormLabel`/`FormControl` styling and structure) but the **error message still comes from the course's `<FieldError>` reading the `Result`**, not from shadcn's RHF-bound `<FormMessage>`. Make the variant honest: borrow the layout/spacing/structure, keep the L3 `<FieldError>` as the message renderer. Do not show `<FormMessage>` pulling an error out of thin air. If research shows current shadcn ships an RHF-free message path, adjust — but default to the honest "layout primitives + our FieldError" composition. (Flagging because the chapter outline's phrasing "layout primitives compose cleanly" can be read as more than shadcn actually offers RHF-free.)

Close the section by pointing forward in one sentence: when the form's *field shape* outgrows flat `FormData` — dynamic line-item arrays, multi-step wizards, controlled third-party inputs — that's the trigger to adopt RHF and shadcn's `<Form>`/`<FormField>` root (ch.045). Until then, native + layout primitives is the senior default.

### External resources (optional)

One or two `ExternalResource` cards: MDN's Constraint Validation API guide and the MDN `:user-invalid` page. Optional: the shadcn Form docs page (so the student can see the RHF-coupled API and confirm the split this section drew). No YouTube video — this topic is reference/mechanics that reads better than it watches; skip `VideoCallout` unless a builder finds a genuinely current (<6mo) walkthrough, which is unlikely to beat the prose.

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- The five-seam Server Action + `Result` shape (ch.043) — referenced as where business-rule checks live (`mutate` stage) and what `useActionState` renders.
- The Zod schema as the shape's single source (ch.042) — the "mirror" on the server side; reference `z.email()`, `.min/.max`, `.regex()`, `.refine()` as the schema-side counterparts without teaching Zod.
- L1-L3 of this chapter: uncontrolled inputs + `name` contract (L1), `<form action={formAction}>` + submit lifecycle (L2), `useActionState` + `<FieldError>` + `state?.ok === false` + the canonical form skeleton (L3). Reuse verbatim; the field-error renderer already exists.
- `aria-invalid`/`aria-describedby`/`useId` (ch.027 L5 a11y baseline) — used, not re-justified.

**This lesson does NOT cover:**
- The Zod schema authoring itself (ch.042) — only its role as the server mirror.
- `useFormStatus` / `<SubmitButton>` (L4) and `useOptimistic` (L5) — done; reuse `<SubmitButton>` in code if a full form is shown, don't re-teach.
- **React Hook Form, `zodResolver`, `setError`-mapping server errors back into fields, `useFieldArray`, multi-step wizards, and shadcn's RHF-coupled `<Form>`/`<FormField>` root (ch.045).** This is the sharpest boundary — teach the *layout* primitives and explicitly defer the RHF root.
- **Async / server-hitting client validation** (debounced `onBlur` uniqueness check; RHF async resolvers) — named once as out of scope, owned by ch.045 / a deliberate fetch.
- Full **progressive enhancement** treatment (no-JS submit lifecycle, the five disciplines, the manual JS-disabled test) — L7. This lesson names exactly one PE fact: the constraint API fires without JS (it's native browser behavior), so it's the one validation layer that survives a no-JS submit. One sentence, pointer to L7.
- Localized/i18n validation messages (Unit 8+/next-intl) — out of scope.
- ARIA error-message *rationale* (ch.027 L5) — wire it, don't re-explain it.
- The production CRUD forms themselves (ch.047 project) — this lesson teaches the technique on the running invoice form; the project ships it.

## Code conventions notes

Relevant conventions to honor (skimmed §Schemas, §Forms and Server Actions, §Styling, §Accessibility, §Components/JSX):
- **Tailwind semantic tokens** — `border-destructive`, not a primitive red. State-driven styling via the `user-invalid:` / `aria-invalid:` variants reading DOM state, not React state (matches the "variants over inline conditionals" rule).
- **Field-error read** is the flat shape established by ch.043/L3: `state.error.fieldErrors?.<field>?.[0]` (flat `Record<string, string[]>` from `z.flattenError`). Do **not** reintroduce a `treeifyError`/`.properties` nested read — the continuity notes flag this as a recurring drift; the constraint-API lesson must not regress it.
- **Schema-side mirrors** use top-level Zod builders (`z.email()`, not `z.string().email()`) per §Schemas, and `.refine()` for the cross-field case — when referencing them, use the current v4 form.
- **shadcn primitives used as imported** (§shadcn) — the layout-primitives section composes, never forks; `<Input>` is shadcn's, the field cluster wraps it.
- **Accessibility** — every field keeps `aria-invalid`/`aria-describedby` with `useId()`; `:user-invalid` styling is additive, not a replacement for the ARIA wiring.
- **Arrow-function `const` components**, named exports, kebab-case files (`new-invoice-form.tsx`).
- **`motion-reduce:`** isn't relevant here (no animation introduced) — note for the builder so they don't add one gratuitously.

Deliberate pedagogical divergence to flag downstream: code samples may show the input cluster *without* the full surrounding `<form>`/`useActionState` boilerplate (already taught in L1-L3) to keep the focus on attributes and styling — this is staging for focus, not a new pattern. The `ReactCoding` styling exercise is client-only with no action (honest for a CSS-timing demo).
