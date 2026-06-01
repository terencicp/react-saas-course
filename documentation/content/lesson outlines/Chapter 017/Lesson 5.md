# Forms as a contract with the server

- Title: Forms as a contract with the server
- Sidebar label: Forms and the FormData contract

## Lesson framing

This is the form-*element* lesson, not the form-*behavior* lesson. The whole React 19 form machinery (Server Actions, `useActionState`, controlled/uncontrolled at depth, Zod authoring, the Constraint Validation API in full) is owned by chapters 042–045. This lesson installs the HTML surface those chapters wire: which elements, which attributes, and — the load-bearing idea — **why the markup is a contract the server reads**.

The senior question (state implicitly in the intro, do not add a "senior question" header): a student builds a sign-up form. The tutorial reflex is a controlled `<input value onChange>` with a `useState` per field and a hand-written submit handler that assembles an object. The senior reflex is a plain `<form>` of labeled inputs carrying `name` attributes, a `<button type="submit">`, and a server that reads `FormData` and validates it with Zod. The lesson's job is to make the student *feel* the contract: the set of `name` attributes on the form and the keys of the server's Zod schema are the same list, designed together. Everything else (types, labels, autofill, constraints) hangs off that spine.

This reframe is the highest-value thing in the chapter for students from other fields, because the controlled-input-everywhere habit is the single most common over-engineering they import from old tutorials. Lead with the contract, show that the platform already serializes a form for free, and position per-field React state as the *conditional* (chapters 044–045), not the default.

Three threads connect to what the student already knows:
- **L4 just taught `<button type="submit">` and the in-`<form>` submit default.** This lesson cashes that in — the button is the trigger that fires the contract. Do not re-teach `type`; reference it in one line and move on.
- **`FormData` was named in chapter 015 L1** as a `fetch` body primitive with a Zod parse on the success path. Here it is cashed in at the element level: the browser *builds* `FormData` from the named inputs. Treat `FormData` as recognized, not new.
- **The "behavior/look are separate knobs" spine (L3/L4)** extends naturally: *the `name` carries the contract, the `type` carries the UX, the class carries the look.* Keep this audible.

Keep examples deliberately under-styled — Tailwind is chapter 018, not yet taught. The continuity note for this chapter is explicit that downstream agents must not "upgrade" examples to Tailwind or shadcn. The one exception the chapter has tolerated is naming Preflight (the base reset that strips `<fieldset>`/`<button>` default chrome) without showing utilities.

Canonical artifact: a sign-up form for the running **Acme** invoicing SaaS (app name "Acme", established in L2/L3). Email, password, an organization-name text field, a plan `<select>`, a "remember me" checkbox, a terms-acceptance checkbox, and a submit button is a rich enough surface to exercise every element family without inventing a contrived form. Reuse this one form across sections so the student watches one contract grow, rather than meeting six disconnected snippets.

Mental model the student should leave with: *A form is the typed boundary between the user and the server. The `<form>` collects, the `name` attributes key, the browser serializes to `FormData`, the server validates with Zod. Native constraints are a courtesy to the user, never a guarantee to the server.* And the practical skill: given a data shape, the student can hand-write the matching form with the right element per field, a `name` on every input, a `<label>` on every input, the right `autoComplete`, and cheap native constraints — and can explain why the submit button works without a single line of JavaScript.

## Lesson sections

### Introduction (no header)

Open on the sign-up form and the two reflexes (controlled-state-everywhere vs. plain named `<form>`). Make the cost concrete: the controlled version is ~30 lines of state plumbing per form before a single field is validated; the platform version is markup the browser already knows how to submit. State the lesson goal — install the form-element surface as a contract with the server — and preview the running Acme sign-up form the student will be able to author by the end. Warm, brief, four to six sentences. Plant the spine sentence: *the form's `name` attributes and the server's schema keys are one list, written together.*

### A form is a contract, not a pile of inputs

The conceptual core; everything downstream is an instance of it. Teach the round-trip as a small mental model before any element detail:

1. The user fills labeled fields.
2. On submit, the browser reads every control's `name` and current value and packs them into a `FormData` object.
3. That `FormData` crosses to the server (a Server Action or a POST body — chapters 043–044 own the wiring; name it, don't build it).
4. The server hands `FormData` to a Zod schema that validates it and produces a typed object.

The punchline: steps 2 and 4 share one vocabulary — the `name` strings. Get them to agree and the form round-trips with almost no glue code. This is why a senior writes the form and the schema *together*.

**Diagram — the form contract round-trip.** A horizontal sequence is the right shape (laptop viewports are short; cap height). Use `DiagramSequence` so the student scrubs the four steps above; each step highlights what changes. Step 1: a labeled form with `name="email"`, `name="password"` visible on the inputs. Step 2: those `name`s become `FormData` entries (`email → "..."`, `password → "..."`). Step 3: the `FormData` envelope moves server-ward. Step 4: a Zod object schema whose keys are *the same strings* lights up, emitting a typed object. Pedagogical goal: the student sees the `name` strings as the through-line connecting markup to validated data — the contract made literal. Wrap in `<Figure>` with a caption naming it "the form contract." Keep the Zod and Server Action sides intentionally schematic (a single `z.object({ email: …, password: … })` glance, not authored) so the diagram doesn't drift into chapter-042/044 territory.

Name the senior framing here: native HTML forms are *progressive enhancement* by default — the round-trip works before any JavaScript loads or if a bundle fails. Per the "trigger before tool" filter, this is the default the later React form hooks build *on top of*, never replace. One paragraph; depth is chapter 044 L7.

Terms for `Term` tooltips in this section: **`FormData`** (re-explain in one line as recognized-from-ch15: a browser object holding the form's name/value pairs), **Zod** (a TypeScript-first schema validation library; full treatment chapter 042), **Server Action** (a function that runs on the server, called from a form's `action`; chapter 043). These let the lesson reference the boundary without a digression.

### The `<form>` element and the submit path

The container that makes the contract real. Teach the element and its three relevant attributes, each as a decision:

- **`action`** — where the contract is sent. In plain HTML it is a URL string; in 2026 React it is a *function* (the Server Action), and React handles the wiring. Default is the current URL. State that `<form action={serverAction}>` is the senior default and is built in chapter 044 L2 — name it, do not implement it.
- **`method`** — `get` (default; values go in the query string — search/filter forms) vs. `post` (values in the request body — every state-mutating form). The decision rule: *anything that changes server state is `post`.*
- **`encType`** — default `application/x-www-form-urlencoded`; switch to `multipart/form-data` the moment a `<input type="file">` is present. `text/plain` is a non-use. Frame `encType` as "you only touch this for file uploads."

The submit path without JavaScript: a `<button type="submit">` (or `Enter` in a text field) triggers the browser's native submit, which serializes and sends. Cash in L4's `type` reflex in one sentence — every button in a form declares its `type` so a Cancel button can't hijack the submit.

Watch-out woven in here (not a separate section): **`<form>` inside `<form>` is illegal HTML** — the browser silently drops the inner form; refactor to sibling forms or one form. Deliver as an `Aside` (caution) right where `<form>` is introduced.

Code: a `Code` block (simple, no annotation needed yet) showing the bare Acme sign-up `<form>` shell with `action`/`method` and a submit button, inputs still unlabeled and unnamed — deliberately incomplete, because the next two sections add the contract and the labels. Tell the writer to keep this block the seed that grows.

### The `name` attribute is the contract

The single most important attribute in the lesson; give it its own header so it lands as *the* idea, not a bullet in a catalog. Teach:

- `name` is the **key** under which a control's value appears in `FormData`. No `name`, no entry — the value is silently dropped from the submission. This silent-drop is the canonical bug; make it vivid (a field the user dutifully fills that never reaches the server).
- The naming convention is a real decision in a Server-Actions-plus-Zod codebase. The project standard (code conventions: "form `name` attributes match schema keys", and schema keys derive from the Drizzle table where TS reads camelCase) makes **camelCase** the senior reach — `name="organizationName"` aligns with the TypeScript/Zod key. State this as the course's house rule and the reason (one vocabulary across form, schema, and table). Kebab-case `name`s are legal HTML but force a rename at the boundary; avoid.

**Exercise — the contract drill (`ReactCoding`, tests-graded, `hidePreview`).** This is the assimilation moment for the lesson's core idea. Give the student a small Acme form where two inputs are missing `name` attributes and one has a `name` that doesn't match the provided Zod schema's key. Instructions: "Add the `name` attributes so every field reaches the server under the key the schema expects." Tests assert each input's `name` matches the expected key. `hidePreview` because the point is the markup contract, not the visual. This makes the silent-drop bug *felt*, not just read. (Pre-built component; no custom build needed.)

### Labels are a second contract — with the user, autofill, and assistive tech

Reframe `<label>` not as decoration but as a second contract the markup signs: with the screen-reader user (announcement on focus), the motor-impaired user (the label expands the click/tap target), and the password manager / browser autofill (label text helps identify the field). Teach:

- **Two association patterns.** Explicit: `<label htmlFor="email">Email</label>` + `<input id="email" name="email">` — the `htmlFor`/`id` pair links them regardless of DOM nesting. Implicit: a `<label>` that wraps both its text and the `<input>`. Senior reach is **explicit `htmlFor`** — it survives refactors and integrates with form libraries (chapter 045). Recall from L1 that `htmlFor` is the JSX spelling of HTML's `for` (reserved word) — one-line reminder, not a re-teach.
- **`htmlFor` takes the input's `id`, not its `name`.** Beginners conflate them. Make the distinction explicit and small: `id` is for the DOM/label link (and must be unique on the page); `name` is for the `FormData` key (unique within the form, shared by radio groups). They often hold the same string, which hides the distinction until a radio group breaks it.
- **Placeholder is not a label** — name it as the dated anti-pattern: screen readers may ignore it, the hint vanishes the moment the user types, and its contrast is typically too low. A placeholder *supplements* a label; it never replaces one.

**Code — the labeled, named field (`AnnotatedCode`).** One `<label>`+`<input>` pair from the Acme form, walked in steps so attention lands on each contract attribute in turn: step 1 the `<label htmlFor>`, step 2 the matching `<input id>` (color the `htmlFor`/`id` pair the same to show the link), step 3 the `name` (different color — "this one keys `FormData`, not the label"), step 4 the `type`. `AnnotatedCode` is right here because a single small block carries four distinct, easily-confused attributes and the student needs them isolated one at a time. Use `color` to separate the `htmlFor`/`id` link (e.g. blue) from `name` (e.g. green).

Watch-out woven in: **every input needs both a `name` and a `<label>`** — the two non-negotiables. Deliver as a short `Aside` (tip) summarizing the two contracts before moving to the input catalog.

### Typed inputs: the `type` attribute is a UX contract

The `<input type>` catalog, framed as: `type` picks the on-screen keyboard, the autofill suggestions, the native picker, and the cheap validation — but **never** changes that the value arrives at the server as a string. This is the "type carries the UX" half of the spine.

Present the SaaS-relevant types as a **reference table** (a `Code`-adjacent markdown table, not prose — this is lookup material the student returns to), one row per type: `text`, `email`, `password`, `number` (note: returns a *string* in `FormData`; `min`/`max`/`step`, and `maxLength` does *not* apply — use `min`/`max`), `tel`, `url`, `date` (ISO `yyyy-mm-dd`; Temporal is chapter 083, name only), `time`, `datetime-local`, `checkbox`, `radio`, `file` (uncontrolled — React can't set its `value`; read via a ref; `Blob`/`File` is chapter 016 L3, name only), `hidden` (carries record IDs through submit — e.g. the invoice `id` on an edit form), and a one-line note that `type="submit"` exists but `<button type="submit">` is preferred (richer content; cash in L4).

Keep the prose around the table thin — the table does the work. Pull out only the two facts that bite:
- **Every input value is a string in `FormData`.** `type="number"` still yields `"42"`. The server coerces (Zod's `z.coerce.number()` — name it, chapter 042 L6 owns it). This kills the beginner assumption that `type="number"` hands JavaScript a number.
- **`type` is UX, not a server guarantee** — `type="email"` nudges the keyboard and runs a loose browser check, but a malicious or scripted client sends anything. This is the bridge to the constraints section.

**Exercise — match the field to its type (`Matching`).** Left column: real Acme form fields ("Work email", "Phone number", "Billing date", "Account password", "Company website"). Right column: the input `type` each should use (`email`, `tel`, `date`, `password`, `url`). Quick recall drill that makes the "pick `type` by the data's meaning" habit stick. Pre-built; cheap; high retention for a catalog.

### Beyond `<input>`: textareas, selects, and grouped controls

The other control elements and — the through-line — *what each contributes to `FormData`*, because that is where the contract gets subtle. Teach each tied back to the key/value model:

- **`<textarea>`** — multi-line text; `name`, `rows`. Uncontrolled initial value is `defaultValue` (not children-as-value the way HTML does it — React reads `defaultValue`). One line; controlled is chapter 044 L1.
- **`<select>` + `<option>`** — `name` on the `<select>`; each `<option value>` is what `FormData` receives; `<option>` with no explicit `value` submits its text content. `multiple` turns one key into several entries (read with `FormData.getAll`). Use the Acme plan picker (`<option value="free">`, `value="pro">`, `value="scale">`).
- **`<input type="checkbox">`** — the trap that bites everyone: a checkbox contributes its `value` **only when checked**, and **nothing when unchecked** (not `"false"`, not the key — the key is simply absent). Default `value` is the string `"on"`; the senior reach is an explicit `value`. Tie to the server: this is why a checkbox needs `z.preprocess`/coercion server-side, not a naive boolean read — name the asymmetry, defer the Zod fix to chapter 042 L6.
- **`<input type="radio">` groups** — N radios sharing one `name`; only the checked one's `value` is submitted, once, under the shared `name`. The shared-`name` rule is the whole mechanic — make it explicit.
- **`<fieldset>` + `<legend>`** — group related controls (the radio group, a billing-address block); `<legend>` (first child) names the group and is announced before each control inside it. Default border is stripped by Preflight (name only). This is the right grouping element — not a `<div>` — when controls form one logical question.

**Diagram — controls to `FormData` entries.** A `TabbedContent` with one tab per tricky control (checkbox checked vs. unchecked, radio group, multi-select), each tab a tiny before/after: the rendered control state on the left, the resulting `FormData` entries on the right (or *absence* of an entry, for the unchecked checkbox). Pedagogical goal: make the "what actually ends up in the contract" rules visible for exactly the controls where the answer is non-obvious. HTML+CSS inside `<Figure>` is enough — these are small key/value lists, not graphs. Keep it compact (short laptop viewports).

**Exercise — what's in the `FormData`? (`PredictOutput` or `MultipleChoice`).** Show a small form snippet with a checked checkbox, an unchecked checkbox, and a radio group, then ask which entries the submitted `FormData` contains. The unchecked-checkbox absence is the answer most students miss; withholding the answer on the first wrong attempt (`PredictOutput`) makes the lesson stick. If `PredictOutput`'s "what does this print" framing doesn't fit cleanly, fall back to a `MultipleChoice` with the absent-key option as the correct pick.

### `autoComplete`: the autofill contract

Short, high-value section — autofill is invisible until it's wrong, and it's a UX/conversion lever seniors actually tune. Teach:

- `autoComplete` is the attribute the browser and password managers read to offer the right saved value and to store new ones. It is the contract with the *autofill engine*, just as `name` is the contract with the server.
- The canonical SaaS values, as a tight inline list (not a giant table — the student looks the full set up when needed): `email`, `username`, `current-password` (sign-in), `new-password` (sign-up / change-password — this pairing is what tells a password manager to *offer to generate* vs. *fill the saved* password), `given-name`, `family-name`, `name`, `organization`, `street-address`, `postal-code`, `country`, `tel`. Mention the credit-card family (`cc-number`, `cc-name`, `cc-exp`) in one line for recognition.
- **`autoComplete="off"` on a password field is a UX regression** — it fights the password manager users rely on; use the semantic value (`current-password` / `new-password`) instead. Name `off` as legitimate only for genuinely one-off, never-reused values (a 2FA code field is the usual real example).

Code: extend the Acme sign-up form's email/password fields with the right `autoComplete` values (a small `Code` block or a `CodeVariants` "without / with autofill" pair if the writer wants to show the password-manager behavior difference — A/B framing fits the "this is invisible until you add it" point).

Term tooltip: **autofill** is self-explanatory; skip. No tooltips needed in this section.

### Native constraints are UX, not security

The senior boundary that the whole lesson has been building toward: native validation attributes make the form *pleasant*, the server-side Zod schema makes it *safe*, and conflating the two is the classic junior security hole. Lead with the principle, then the attributes.

The attributes, as cheap UX (brief — depth is chapter 044 L6):
- **`required`** — blocks native submit with a localized browser message.
- **`type`-based** — `email`/`url`/`number` enforce loose shape.
- **`min`/`max`** — numeric and date ranges.
- **`minLength`/`maxLength`** — string bounds (recall: `maxLength` is ignored on `type="number"`; use `min`/`max`).
- **`pattern`** — a regex match; name it as rare in 2026 SaaS because Zod expresses the same rule far more legibly server-side, and the client check is only a courtesy anyway. Recognition, not a pattern to reach for.

The load-bearing sentence, stated plainly and repeated: **client-side constraints can always be bypassed** (devtools, a scripted POST, a disabled-JS browser, a direct API call), so they are never a security boundary — they exist to catch honest mistakes early and save a round-trip. Every constraint is mirrored by a server-side Zod rule, and the Zod rule is the one that actually defends the system. This is the "defaults before conditionals, never trust the client" senior reflex.

**Diagram — two checkpoints, one trusted.** A small two-lane figure (`ArrowDiagram` inside `<Figure>`, or plain HTML+CSS): the happy path passes the browser constraint check *and* the server Zod check; a second lane shows a scripted client skipping straight past the browser to the server, where Zod still rejects it. Pedagogical goal: make "the server is the only checkpoint that can't be skipped" spatial and memorable. Keep it to two lanes and four boxes — resist turning it into a full request diagram (that's chapter 044).

**Exercise — UX or security? (`Buckets`, two columns).** Buckets: "Improves UX (can be skipped)" and "Enforces the rule (server-side)". Items: `required` attribute, `type="email"`, `pattern` regex, the Zod schema's `z.email()`, `minLength`, a server `safeParse`. The student sorts client-side affordances from the server-side guarantee. This drills the single most important judgment in the lesson — that native constraints and Zod live on opposite sides of the trust boundary. Pre-built; ideal fit for a two-category judgment.

Watch-out woven in: **`disabled` vs. `readOnly`.** A `disabled` input is non-interactive *and not submitted* (drops from the contract — surprising); a `readOnly` input is non-interactive but *is* submitted. "Show but don't allow edit, and still send it" is `readOnly`. Deliver as a short `Aside` (caution) here, since both touch the submit contract this section is about.

### Section close / recap (no header, or a light "Putting the contract together")

End with the complete Acme sign-up `<form>` as one final `AnnotatedCode` or `Code` block — every field labeled, named (camelCase), typed, autocompleted, and lightly constrained, with the submit button — so the student sees the whole contract assembled. Then one tight paragraph restating the spine: the `name`s are the keys, the browser serializes to `FormData`, the server validates with Zod, native constraints are courtesy not security. Point forward in one sentence each to what comes next: wiring the `action` and reading `FormData` server-side (chapter 044), authoring the Zod schema (chapter 042), and the React form hooks for richer UX (chapters 044–045). Optionally a couple of `ExternalResource` cards (MDN `<form>` / `<input>`, the WHATWG autofill field list) for the student who wants the exhaustive attribute reference this lesson deliberately doesn't enumerate.

### Optional consolidating exercise

If a single end-of-lesson check is wanted beyond the per-section drills, a `ReactCoding` (tests-graded, `hidePreview`) that asks the student to complete the Acme sign-up form from a partial starter — add the missing `name`s, wire one `<label htmlFor>`, set two `type`s, add `autoComplete` to the password, and mark the email `required` — exercises the whole surface in one pass. Tests assert each requirement independently so partial credit reads cleanly in feedback. Prefer this guided exercise over any open sandbox.

## Scope

**This lesson covers** (HTML form-element surface only): the `<form>` element (`action`/`method`/`encType`); the submit path without JS as a one-paragraph progressive-enhancement frame; `<input>` and its SaaS-relevant `type` values as a reference catalog; the `name` attribute as the `FormData` key and the camelCase house rule; `<label>` association (explicit `htmlFor` vs. implicit) and the `id`-vs-`name` distinction; placeholder-is-not-a-label; `<textarea>`, `<select>`/`<option>`, `<fieldset>`/`<legend>`, checkbox, and radio groups, each tied to what it contributes to `FormData`; `autoComplete` values; native constraints (`required`, `type`, `min`/`max`, `minLength`/`maxLength`, `pattern`) as UX paired with server-side Zod; `disabled` vs. `readOnly` and the submit contract; and recognition-level mentions that `FormData` is built by the browser and validated by a Zod schema on the server.

**Explicitly out of scope — name and defer, do not teach:**
- The `<form action={serverAction}>` wiring, the submit lifecycle, automatic reset, `formAction` per-button overrides, and Next.js's `<Form>` — chapter 044 L1–L2.
- `useActionState`, `useFormStatus`, `useOptimistic`, the canonical form-component shape, the `<SubmitButton>` pattern — chapter 044 L3–L5.
- Controlled vs. uncontrolled inputs at depth (`value` + `onChange`, `defaultValue` as the Server-Actions default) — chapter 044 L1. This lesson uses uncontrolled markup and names the distinction in one line only; it does **not** teach React state for forms.
- The Constraint Validation API at depth — `ValidityState`, `setCustomValidity`, `:user-invalid`, `inputmode`, custom messages — chapter 044 L6.
- Authoring the Zod schema, `z.coerce`, `z.preprocess`, the checkbox `"on"` shape, `Object.fromEntries(formData)`, `treeifyError`, field-error rendering — chapter 042 (esp. L6) and chapter 043 L2. This lesson references `z.coerce.number()` and the checkbox-coercion need by *name* to motivate the contract, and authors no schema.
- React Hook Form and the four triggers that flip past the native pattern; Conform/TanStack Form — chapter 045.
- File-upload mechanics, `Blob`/`File`/`URL.createObjectURL`, the presigned-PUT flow — chapter 016 L3 (introduced there) and later upload lessons; here `type="file"` and `multipart/form-data` are named as recognition only.
- The shadcn `<Form>` primitives and `aria-describedby`/`aria-invalid` error wiring on fields — chapter 027 L1 and chapter 044 L6 / chapter 047. Do **not** pull error-message ARIA into this lesson; it belongs with validation feedback, which this lesson doesn't render.
- The full ARIA treatment and live regions — chapter 017 L6 (basics) and chapter 027 L3. Form-field error announcement is downstream.
- Multi-step wizards — chapter 045 L5 and chapter 079.
- Tailwind/shadcn styling of form controls — chapter 018 onward. Examples stay under-styled.

**Prerequisites to redefine in one line each (do not re-teach):** `<button type="submit">` and the in-`<form>` submit default (L4); `FormData` as a browser name/value container (chapter 015 L1); `htmlFor`/`className` as the JSX spellings of reserved-word HTML attributes and kebab-case `aria-*`/`data-*` pass-through (L1); the `.map`+`key` list pattern if a field list is rendered (L1); `<label>`/`<fieldset>` as semantic elements reachable before `<div>` (L3); the "behavior/look are separate knobs" spine (L3/L4) extended to "the `name` is the contract."
