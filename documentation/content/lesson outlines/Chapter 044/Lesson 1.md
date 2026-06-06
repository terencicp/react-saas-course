# Lesson 1 — Uncontrolled inputs, FormData contract

- **Title (h1):** Uncontrolled inputs and the FormData contract
- **Sidebar label:** Uncontrolled inputs & FormData

---

## Lesson framing

Concept archetype, ~35–45 min. This is the **first lesson of the forms chapter** and it installs two reflexes that run through every form the course writes afterward:

1. **Uncontrolled by default.** Form fields declare `defaultValue` once and let the DOM own the live value. No `useState` per field, no `value`/`onChange` pair, no re-render per keystroke.
2. **`name` is the contract.** Every input's `name` attribute is one string shared three ways: the input's `name`, the `FormData` key, and the Zod schema's object key. Drift between them is the bug class this contract prevents.

Pedagogical spine — **the unlearning move.** The student arriving here likely carries (or has seen in tutorials/AI output) the 2018 controlled-form reflex: a `useState` per field, `value={state}` + `onChange={e => setState(e.target.value)}` on every input, then `onSubmit` with `preventDefault()` and a `fetch`. The senior 2026 default is almost the inverse, and the lesson's job is to make uncontrolled feel like the *lighter, obvious* choice — not a quirky exception. Lead with the cost of the controlled reflex (six fields = six state hooks = six setters = a re-render storm for zero benefit when nothing reacts to the typing), then show the uncontrolled form as the relief. Frame controlled as the *conditional* the student reaches for past a named threshold ("does another part of the UI change as the user types?"), not the baseline. This matches the course's "defaults before conditionals, trigger before tool" filter.

Cognitive-load staging. The chapter's full form (action prop + `useActionState` + field errors + constraint validation) is *not* assembled here — those land in lessons 2, 3, 6. This lesson deliberately stops at the **data layer of the form**: the inputs, their `name`s, and how values become a `FormData` object. Code samples must therefore avoid showing `<form action={...}>` wired to a real Server Action or any `useActionState` call — showing it would either duplicate lesson 2/3 or force half-explained hooks on the reader. Use a **plain reader-facing `FormData` read** (e.g. `Object.fromEntries(formData)` logged, or a deliberately minimal action stub whose body is *only* the parse handoff) to demonstrate the round-trip, and explicitly signpost "wiring the action is the next lesson." The student should leave able to: write a flat form of uncontrolled inputs with correct `name`s and `defaultValue`s for every input shape, predict exactly what `FormData` an arbitrary form produces (including the checkbox/radio/multi-value quirks), and read that `FormData` server-side with `get` / `getAll` / `Object.fromEntries`.

The senior anchor throughout: **the lighter the client state, the closer the form is to a plain server-rendered HTML form — which is what makes progressive enhancement fall out for free in lesson 7.** Name this connection but don't teach PE here.

Mental model to leave the student with: *a form is a string-keyed bag of values that the browser already knows how to build and submit; React's job is to add UX on top, not to re-own the values.*

---

## Lesson sections

### Six fields, six useStates? (introduction)

Open with the concrete scene from the chapter framing: a signup form — email, password, name, company, role, "agree to terms" — a submit button, and (gesture forward) a Server Action already written to receive the data and write the row (built in chapter 043, not re-shown). Pose the senior question implicitly: what's the *least* client state this form needs?

Show the 2018 reflex first, briefly, as the thing we're moving away from. A `CodeVariants` block, **"Controlled" vs "Uncontrolled"** tabs, same signup fields both ways (trim to 2–3 representative fields to stay under the 18-line cap):

- **Controlled tab** — `useState` per field, `value` + `onChange` on each input, `del`-mark the `useState` lines and the `value=/onChange=` pairs to flag them as the weight being removed. Prose (one paragraph): every keystroke re-renders, the component owns every character, and none of it is needed unless something *reacts* to the typing.
- **Uncontrolled tab** — same fields, `defaultValue` only, no per-field state, `ins`-mark the `defaultValue`s. Prose: the DOM owns the values; React holds nothing; the values are read once at submit. This is the 2026 default.

Keep the uncontrolled tab's form element neutral here (a bare `<form>` or `<form action={createAccount}>` with a one-line note "the action wiring is lesson 2") so the focus stays on the inputs, not the submit path. Close the intro by naming the two reflexes the lesson installs (uncontrolled by default; `name` is the contract) and the practical end state (predict and produce any form's `FormData`).

Reasoning: leading with the A/B comparison makes the *deletion* of state the memorable beat. The student feels the controlled version as heavier, which is the whole point.

### Controlled vs uncontrolled: where each earns its weight

The conceptual core of "uncontrolled by default." Define both precisely:

- **Controlled:** `value` is bound to React state, `onChange` writes every keystroke back. React is the source of truth for the rendered value; the parent can read it at any moment. Cost: a render per keystroke, a state hook per field.
- **Uncontrolled:** `defaultValue` seeds the input once; the DOM is the source of truth thereafter. The value is read on demand (at submit, via `FormData`, or via a ref). Cost: the parent can't *react* to the value as it changes without extra wiring.

State the threshold as a single decision question the student can apply mechanically: **"Does some other part of the UI need to change while the user is typing?"** If no → uncontrolled. If yes → controlled (or a controlled *derived value* only — covered later). Give the canonical "yes" cases so the threshold is concrete: debounced search-as-you-type, dependent dropdowns (field B's options depend on field A), live conditional rendering driven by an input, a "must match" cross-field check that re-renders both fields. Everything else — the ordinary create/edit form — is "no," hence uncontrolled.

Exercise — **`Buckets`**, two columns, classification drill: sort field scenarios into **"Uncontrolled fits"** vs **"Needs controlled."** Items drawn from real form situations: "Email field on a signup form" (uncontrolled), "Search box that filters a list as you type" (controlled), "A country select that changes which state/province options show" (controlled), "A notes textarea on an edit form" (uncontrolled), "A password field" (uncontrolled), "A 'confirm password' that shows a mismatch warning live" (controlled). This drills the *decision*, which is the senior skill here, not the syntax. Grading is the bucket match; the component handles it.

Reasoning: the chapter framing flags this as the load-bearing judgment. A classification exercise is the right tool — it forces the student to apply the threshold across varied cases rather than recognize one example.

Tooltip terms in this section: `defaultValue` (Term — "React prop that sets an uncontrolled input's initial value once; the DOM owns it afterward"), and `re-render` if not already a comfortable term by this unit (brief, "React recomputing a component's output").

### Why uncontrolled fits the Server Action seam

Connect uncontrolled inputs to the mutation seam the student already built in chapter 043. The argument chain, told as prose (short), reinforced by one small diagram:

- The Server Action consumes a `FormData` (chapter 043, lesson 2 — its first line is `Object.fromEntries(formData)`).
- The browser *natively* produces a `FormData` from a form submit — no JS required to build it.
- Uncontrolled inputs round-trip through that `FormData` with **zero** JS holding the value.
- Therefore the form is a Client Component (the `'use client'` directive lands in lesson 2; mention, don't dwell) that carries almost no client state — values live in the DOM, pending state will live in `useActionState` (lesson 3), error state in the returned `Result` (chapter 043).

Diagram — **`Figure` + `ArrowDiagram`**, the round-trip. This is the lesson's anchor visual; pedagogical goal is to make the "one set of strings" idea spatial. Three stacked regions left→right or a compact three-column flow:

1. **Form** panel — three uncontrolled inputs rendered as real HTML-ish `<div class="code-line">` boxes: `<input name="email" defaultValue=… />`, `<input name="role" … />`, `<input name="company" … />`.
2. **FormData** panel — the produced multimap: `email → "..."`, `role → "..."`, `company → "..."`.
3. **Schema / action** panel — the Zod object keys: `{ email, role, company }`.

Draw color-matched highlights (not crossing arrows) on the three `name` tokens across all three panels — `email` blue, `role` orange, `company` violet — so the eye reads "same string, three places." Use one labeled arrow only for the *flow* direction (Form → FormData → schema) along the top, so direction is shown once without three curves fighting in the gap. Per the ArrowDiagram doc, set `expandable={false}` on the wrapping `Figure` (leader-line positioning). Caption: "One name, three places: the input's `name`, the `FormData` key, and the schema's key are a single string."

Reasoning: the framing calls the form/action/schema relationship a "triangle" of one string set; a color-matched diagram expresses that identity at near-zero visual cost and is the single most important takeaway to make visual.

### name is the contract

Promote the diagram's idea to an explicit rule and make it the section's spine. Teach:

- Every input that should reach the action carries a `name`. **A field with no `name` is silently dropped from `FormData`** — no error, it just isn't there. Flag this as a top watch-out inline (it belongs here, not in a separate watch-outs dump).
- `formData.get('email')` returns the value of the input whose `name="email"`.
- `Object.fromEntries(formData)` builds `{ email, password, ... }` keyed by `name` — the exact handoff the chapter-043 action does before `safeParse`.
- The schema (chapter 042) declares the *same* keys. The 2026 reflex: input `name`s, `FormData` keys, and schema keys are **one set of strings**; keep them literally identical.

Use a small `Code` block (TS) for the read side — a deliberately minimal stub showing only the parse handoff, e.g. `const raw = Object.fromEntries(formData); const parsed = createAccountSchema.safeParse(raw);` — with a one-line note that the full action body (authorize, mutate, revalidate, return) is chapter 043's and the wiring is next lesson. Do **not** expand this into a full action; keep the spotlight on the key alignment.

`CodeTooltips` candidates on the read-side block: `Object.fromEntries` ("Turns the FormData's name→value entries into a plain object keyed by name"), `safeParse` ("Zod parse that returns `{ success, data | error }` instead of throwing — chapter 042").

Reasoning: this is the lesson's titular concept. Stating it as a hard rule ("one set of strings") plus showing the read handoff cements why the `name` matters beyond "it's an HTML attribute."

### defaultValue, never value, on uncontrolled inputs

Short, sharp section on the single most common mistake. Teach:

- Edit forms need an initial value: `<input name="email" defaultValue={user.email} />`. The DOM owns it from there; the parent doesn't track changes.
- Putting `value` on an input *without* `onChange` flips it into controlled mode with a frozen value and triggers React's dev warning (and a read-only field in production). `defaultValue` is the correct prop for "seed it once."
- The mental rule: `defaultValue` on the first render, no `value` prop after, for any uncontrolled field.

Exercise — **`MultipleChoice`** (or a tiny `PredictOutput`): show `<input value={user.email} />` with no `onChange` and ask what happens (correct: the field is read-only / React warns; decoys: "it works fine," "it updates as the DOM changes"). One question, fast, catches the reflex error.

Tooltip: the React "controlled to uncontrolled" warning could be a `Term` so the student recognizes it when it appears in their console.

Reasoning: this is the error every beginner hits exactly once. A targeted prediction question is the cheapest way to inoculate against it.

### Every input shape and the FormData it produces

The reference core: how each input type appears in `FormData`. The student must be able to predict this exactly, because the schema's coercion (chapter 042) is written against these shapes. Present as a walkthrough of one example form covering all the shapes, then a prediction exercise.

Use **`AnnotatedCode`** for a single ~14-line form fragment that includes one of each input shape, stepping through what each contributes to `FormData`. Author the form once; each `AnnotatedStep` highlights one input and explains its `FormData` footprint. Steps (color-coded, blue default):

1. **Text input** — `<input name="email" type="email" defaultValue="..." />` → present as a string under `email`.
2. **Textarea** — `<textarea name="notes" defaultValue="..." />` → its text content as a string under `notes`. Note `defaultValue`, not children, for the initial value in React.
3. **Select** — `<select name="status" defaultValue="draft">…</select>` → the selected option's `value` under `status`. `defaultValue` goes on the `<select>`, not on an `<option selected>`.
4. **Checkbox** (color="orange", the quirk) — `<input type="checkbox" name="archived" />` → the string `"on"` when checked, **absent entirely** when unchecked. Not `false`, not `"off"` — *gone*. This is why the schema uses `z.preprocess(v => v === 'on', z.boolean())` (chapter 042, named once). Add an optional `value="yes"` note: the present-value is whatever `value` is set to, defaulting to `"on"`.
5. **Radio group** — two `<input type="radio" name="role" value="admin" />` / `value="member"` sharing one `name` → only the *selected* radio's `value` lands under `role`. Seed the default with `defaultChecked` on one.
6. **File input** (color="violet") — `<input type="file" name="avatar" />` → a `File` instance (not a string) under `avatar`. Needs `multipart/form-data` (the action prop sets this; explicit `encType` named once for the no-JS case). Validated with `z.instanceof(File)` (chapter 042).
7. **Multi-value** (color="green") — repeated `<input type="checkbox" name="tags" value="urgent" />` etc. → `formData.getAll('tags')` returns the array; `get('tags')` returns only the **last** value. Note: the `name="tags[]"` bracket convention is just a string to `FormData` — the brackets carry no meaning to the platform; reach for `getAll` regardless.

After the walkthrough, an exercise — **`Dropdowns`** in fenced-code mode, the prediction drill. Show a small filled-in form (a checkbox checked, a radio selected, an unchecked checkbox) and a commented "// FormData contains:" block with `___` blanks the student fills from option lists, e.g. for the unchecked checkbox the options are `["on", "off", "(absent)", "false"]` and the answer is `(absent)`. This is the single most valuable check in the lesson — it verifies the student internalized the non-obvious shapes (the checkbox absence, radio single-value, file-as-File). 4–6 blanks.

Reasoning: `AnnotatedCode` keeps one canonical form on screen while directing attention shape-by-shape, which is exactly the "focus the student on parts of one block" use case. The `Dropdowns` prediction drill targets the quirks that the framing flags as watch-outs (checkbox `"on"`/absent, `getAll` vs `get`) — better caught by prediction than by prose.

Tooltip terms: `multipart/form-data` (Term — "the form encoding required for file uploads; sends fields as separate parts instead of one URL-encoded string"), `File` (Term — "the browser's binary-file object; appears in FormData for file inputs").

### Reading FormData: get, getAll, fromEntries

Tighten the read side into its own short reference now that the student knows what's in the bag. Three reaches, stated as the course's defaults:

- `formData.get(name)` — a single value. Returns the **last** value if the name repeats, and `null` if absent.
- `formData.getAll(name)` — the explicit multi-value read; always an array. The reach for any field that repeats (multi-checkbox, multi-select).
- `Object.fromEntries(formData)` — the schema-parse handoff; **collapses repeated names to the last value** (verified against current platform behavior). The canonical multi-value pattern is spread-then-override: `{ ...Object.fromEntries(formData), tags: formData.getAll('tags') }` — build the flat object, then replace each multi-value key with its `getAll` array before parsing.

State the canonical action-entry pair (recap from chapter 043, don't re-teach): `const raw = Object.fromEntries(formData)` then `Schema.safeParse(raw)`; for multi-value fields read `getAll` explicitly first. The schema's coercion turns the strings into typed values — **the form sends strings (and Files); the action receives typed values after parse.** Reinforce: this is why `name`s must match keys.

Also name the **`FormData`-as-wire-format** point here, briefly: `FormData` is the format the browser produces from a submit and the format the action receives; it needs no `Content-Type` header, supports files natively, and is the senior reach over the `JSON.stringify` + `fetch` reflex for the app's own mutations. (The full "why not `onSubmit` + fetch" argument is lesson 2 — name once, link forward.)

Use a small `Code` block (TS) showing the `get` vs `getAll` distinction on the same form data; a one-liner comparison, not a full function.

Reasoning: separating "what's in FormData" (prior section) from "how you read it" keeps each section single-purpose and gives the student a clean reference for the two read methods and the one quirk (`get` returns the last, not all).

### When a value must drive the UI: the controlled escape, kept small

Close the conceptual arc by handling the "but I need a derived value while typing" case *without* abandoning uncontrolled. This is where beginners over-correct — they hear "controlled when the UI reacts" and make the whole form controlled for a character counter. Teach the senior reaches, smallest first:

- **Character count / password-strength meter:** the *input stays uncontrolled*. Either read it via a `ref` on demand, or `useState` only the **derived** value (the count) with an `onChange` that updates the count — the input keeps its `defaultValue` and is still read via `FormData` at submit. One small `Code` block: an uncontrolled `<textarea name="bio" defaultValue=… onChange={e => setCount(e.target.value.length)} />` plus a `{count}/280` readout. Emphasize: `onChange` here updates a *sibling readout*, it does **not** make the field controlled (no `value` prop).
- **The threshold restated:** reach for a *fully controlled input* (with `value`) only when the input's own rendered value must be programmatically driven — a masked/formatted input that rewrites what the user typed, a controlled-by-parent wizard field. Per-keystroke reaction to a *sibling* doesn't require it.
- Foreshadow: forms whose field shape genuinely outgrows flat `FormData` (dynamic field arrays, multi-step wizards) are React Hook Form's job — chapter 045, named once, not taught.

Reasoning: this is the highest-leverage misconception to pre-empt. Showing that a counter needs `onChange` but *not* `value` draws the precise line the framing asks for, and prevents the "I made everything controlled for one counter" anti-pattern.

Tooltip: `ref` (Term — "React's escape hatch for reading a DOM node directly without involving render state") if the student needs the reminder.

### Nested data: keep forms flat (brief)

Short, near-the-end section — the framing marks nested encoding as rare/named-once, so treat it lightly but don't skip it (the student *will* hit a `{ address: { street, city } }` shape eventually). Teach:

- `FormData` is **flat** — a string→value multimap with no built-in nesting.
- Two reaches when the schema genuinely needs nesting, both flagged as the *conditional*, not the default:
  - **Dot-keys:** `name="address.street"`, `name="address.city"`; on the server, rebuild the nested object after `Object.fromEntries` (a small `/lib` helper, or the schema unflattens). Senior trigger: the nesting is shallow and static.
  - **Hidden JSON field:** when the nested editing UI is itself *stateful* (a list-builder, a multi-step picker), keep that sub-state controlled in the parent and serialize it to `<input type="hidden" name="address" value={JSON.stringify(address)} />` on submit. Senior trigger: stateful sub-editor.
- The reflex: **keep forms flat; reach for nested encoding only when the domain genuinely is nested.** When the field shape outgrows flat `FormData`, that's the RHF trigger (chapter 045).

Use a tiny `CodeVariants` (two tabs: "Dot-keys" / "Hidden JSON") with 3–4 lines each, prose naming the trigger for each. Keep under the cap; this is a reference, not a deep dive.

Reasoning: the framing explicitly wants this kept minimal and trigger-gated. A two-tab variant gives the student the shape of each option without inflating a niche topic into a major section.

### What the form already does for free (closer)

One short paragraph tying the lesson to the chapter's through-line, *without* teaching the later topics. The form the student can now write — uncontrolled inputs, correct `name`s, read via `FormData` — already carries almost no client state, which is precisely what makes it behave like a plain HTML form. That property buys: the automatic reset-on-success and the action wiring (lesson 2), the pending/result/error rendering via `useActionState` (lesson 3), and progressive enhancement for free (lesson 7). State the senior anchor one last time: **the lighter the client state, the more the platform does for you.** End by previewing lesson 2: wiring the `action` prop so the form actually talks to the Server Action.

Optional `ExternalResource` LinkCards (1–2 max): the React docs page on `<input>` / uncontrolled components, and the MDN `FormData` reference. Only if they add value beyond the lesson.

Reasoning: a closer that *names* the payoff without teaching it keeps the lesson scoped while motivating the next six. Reinforcing the "lighter state = more platform help" anchor is the durable takeaway.

---

## Scope

**This lesson teaches:** uncontrolled inputs with `defaultValue`; the controlled-vs-uncontrolled decision and its threshold; the `name`-as-contract rule (input `name` = `FormData` key = schema key); how every input shape (text, textarea, select, checkbox, radio, file, multi-value) appears in `FormData`; reading `FormData` with `get` / `getAll` / `Object.fromEntries`; the small controlled-escape for derived values; flat-vs-nested encoding at a glance.

**Explicitly out of scope (belongs to other lessons — redefine prerequisites in one line, do not re-teach):**

- **`<form action={serverAction}>` wiring, the submit lifecycle, automatic reset on success, `formAction` per-button overrides, Next.js `<Form>`** — lesson 2. Code here may show a `<form>` element but must *not* teach how the action prop is wired or what React does on submit. Signpost forward.
- **`useActionState`, the `(prevState, formData)` signature, `isPending`, field-error rendering from the `Result` tree** — lesson 3. Do not introduce the hook. The error/pending state is named as "lives in `useActionState`/the `Result`," not shown.
- **`useFormStatus` / `<SubmitButton>`** — lesson 4. Not mentioned beyond, at most, nothing.
- **`useOptimistic`** — lesson 5. Out.
- **Constraint Validation API (`required`, `pattern`, `type`, `:user-invalid`, `autocomplete`, `inputmode`), shadcn form layout primitives** — lesson 6. Inputs shown here can carry `type="email"` etc. as *plain HTML*, but the lesson does not teach client-side validation. Do not add `required`/`pattern` as a taught concept.
- **Progressive enhancement** (the no-JS submit, the five disciplines, the JS-disabled test) — lesson 7. Named once as the payoff in the closer; not taught.
- **The Zod schema itself** — chapter 042. *Prerequisite, redefine in one line where referenced:* "a Zod schema proves the shape of the payload; its object keys match the form's `name`s." The checkbox `"on"` preprocess and `z.instanceof(File)` are *named once* as "this is why the schema does X," not taught.
- **The Server Action body** (authorize, mutate, revalidate, return `Result`) — chapter 043. *Prerequisite, redefine in one line:* "a Server Action receives `FormData`, parses it on entry with `safeParse`, and returns a `Result`." Code samples stop at the `Object.fromEntries` + `safeParse` handoff.
- **Multi-step wizards, dynamic field arrays, React Hook Form** — chapter 045. Named once as the trigger past flat `FormData`.

**Prerequisites the student brings:** Server Actions and the `Object.fromEntries(formData)` + `safeParse` + `Result` seam (chapter 043); Zod schemas and `FormData`-boundary coercion (chapter 042); the Server/Client Component boundary and serializable props (chapter 030, referenced for "the form is a Client Component, data fetch is server-side"); discriminated unions / `Result` (earlier units).

---

## Code conventions notes (deltas for downstream agents)

- **Quotes:** single quotes in TS/TSX; double quotes only inside JSX attributes (`name="email"`, `type="email"`). Match `biome.json` (single quotes, 2-space indent).
- **Naming:** schema variables `createAccountSchema` (the `<verbEntity>Schema` form); the worked entity is an "account"/signup or reuse "invoice" if it keeps continuity with chapter 043's `createInvoice` — prefer the **signup form** as the running example since the framing's opening scene is a signup, but a downstream agent may align to `createInvoice` if it reads cleaner against chapter 043. Either way, keep one entity for the whole lesson.
- **`Result` / action shape:** if any read-side stub references the action's return, use the canonical `Result<T>` from `lib/result.ts` and the `ok`/`err` helpers (chapter 043) — do not invent a `{ success, error }` variant.
- **Deliberate divergence (note for reviewers):** code samples intentionally show **partial** forms and **partial** action bodies (the `Object.fromEntries` + `safeParse` line only). This is pedagogical staging, not a violation — the full `<form action>` wiring and full five-seam action body are owned by lesson 2 and chapter 043 respectively. Don't "complete" these samples.
- **JSX/accessibility:** keep inputs paired with `<label>` (the course's a11y floor); a `htmlFor`/`id` pair is fine to show but is *not* the lesson's subject — don't let label-wiring crowd out the `name`/`defaultValue` point. Full a11y error wiring (`aria-describedby`, `aria-invalid`) is chapter 027 / the project chapter — out of scope here.
- **No `value` without `onChange`** anywhere in sample code (that's the anti-pattern the lesson teaches against). Uncontrolled samples use `defaultValue`; the one controlled-escape sample uses `onChange` updating a *sibling* readout with no `value` on the field.
