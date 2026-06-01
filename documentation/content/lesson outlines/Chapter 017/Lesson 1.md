# Lesson 1 — JSX is property syntax for HTML

- **Title:** JSX is property syntax for HTML
- **Sidebar label:** JSX as property syntax

---

## Lesson framing

This is the first lesson of Unit 3 and the JSX surface every later UI lesson rides on.
The student arrives knowing TS+JS as one language, the DOM as a tree of typed nodes, the event model, and — critically — the attribute-vs-property model and the `class`→`className` / `for`→`htmlFor` rename table from Chapter 014 Lesson 2.
That prior lesson did the conceptual heavy lifting: it taught *why* the DOM property names diverge from the HTML attribute names (reserved words, camelCase identifiers).
This lesson's job is therefore **not** to re-derive that model — it is to (1) name JSX as a compile-to-`jsx()` authoring surface, (2) show that JSX prop names are exactly those DOM property names speaking through React (a payoff, not a new rule), and (3) install the handful of places JSX diverges from raw HTML, **each framed as a specific bug class a senior recognizes on sight**.

The spine of the lesson is the senior frame: *you write JSX, the browser receives HTML, and every difference between the two is a bug waiting for a junior who treats JSX as "HTML in a JS file."*
Lead with the concrete `<button className onClick>` → `<button class>` transformation, name the mechanism in one paragraph, then walk the differences. Keep the transform mechanics shallow — Next.js/Turbopack runs the automatic runtime; the student never configures it. The goal is recognition and reflex, not compiler theory.

Mental model the student should leave with: **JSX is JavaScript expression syntax that produces element descriptors; props are DOM properties; children and prop values are JavaScript expressions in `{}`; the divergences from HTML (`className`, self-closing voids, keys, the `&&` 0-trap) are the recognizable edges.**
At the end the student can read and write JSX with the right prop names, interpolate expressions, render a list with correct keys, use fragments and self-close void elements, and spot the four canonical bug classes (`class`/`className`, index keys, the `0` trap, calling a handler instead of passing it) by reflex.

Cognitive-load management: this is a dense topic (the chapter outline brainstorms ~12 sub-topics).
Sequence from the model outward — transform first, then the static surface (names, expressions, fragments, voids), then the two dynamic patterns that carry the most bug weight (lists+keys, conditional rendering+the 0-trap), then a short "edges and escape hatches" section that sweeps the remaining small items.
Fold every watch-out into the section teaching the concept it qualifies; do not collect them into a trailing "gotchas" section.
This lesson is JSX-shaped only — components, the render model, Tailwind, and the deep security treatment are explicitly downstream (see Scope). Use bare elements with minimal/no styling so the focus stays on JSX semantics, not CSS.

Senior-mindset threads to keep audible throughout: semantics is a decision the browser/a11y-tree/reconciler read; the prop names aren't React inventions; keys are about identity not iteration; native constraints and escaping are platform features React rides on.

---

## Lesson sections

### Introduction (no header)

Warm, brief, one short scene. The student writes `<button className="btn" onClick={handleSave}>Save</button>` and the browser DevTools show `<button class="btn">Save</button>` with a click handler bound somewhere up at the React root.
Name the gap: JSX *looks* like HTML but isn't — it's JavaScript with an element syntax, and the small set of places it differs from HTML is exactly the set of bugs juniors ship.
State the goal: by the end, read and write JSX fluently and recognize each difference as a deliberate decision. Connect explicitly to Chapter 014 Lesson 2 ("you already learned why `class` becomes `className` — now you'll see where that surfaces every day").
No section header — flows straight into the first h2.

### JSX compiles to element descriptors

**Goal:** install the one-paragraph mental model of what JSX *is* and what happens to it, so every later section has a substrate to refer back to.

Content:
- JSX in one paragraph: JavaScript with an XML-like element syntax. It is not a string, not HTML — it is an expression that evaluates to a JavaScript object describing an element.
- The automatic runtime (run by Turbopack in Next.js, no configuration by the student) rewrites `<div className="row">Hello</div>` into `jsx('div', { className: 'row', children: 'Hello' })`. That call returns a plain object (an element descriptor / "React element"). React later renders the descriptor tree into real DOM nodes.
- The three-stage chain the student must hold: **JSX you write → `jsx(...)` call (the transform) → element descriptor object → DOM the browser shows.** Two of those stages are invisible; the bugs live in the translation.
- Keep transform internals shallow: name that it exists, name that Next.js owns it, then move on. The classic-vs-automatic runtime distinction is explicitly out of scope (Scope).

**Diagram — DiagramSequence (core mental model).** Four steps, each lighting one stage of the chain, with the *same* tiny example carried across all four:
1. **You write JSX** — show `<button className="btn" onClick={handleSave}>Save</button>` as authored source.
2. **Transform** — show it rewritten to `jsx('button', { className: 'btn', onClick: handleSave, children: 'Save' })`. Caption: Turbopack does this; you never see it.
3. **Element descriptor** — show the resulting object `{ type: 'button', props: { className, onClick, children } }`. Caption: a plain JS object, not DOM yet.
4. **DOM** — show the rendered `<button class="btn">Save</button>` with a note that the handler is attached at the React root, and `className` became `class`. Caption: the browser only ever sees this.
Pedagogical goal: make the "you write X, browser gets Y" gap *visual and concrete* — it is the frame the whole lesson hangs on. DiagramSequence is right because it is a temporal pipeline the student scrubs; per the diagrams guide, sequence-over-time is its sweet spot. Author the panels as simple HTML/CSS boxes (the example fits in a few lines each), not a heavy graph. The carried example is intentionally keyless so the `props` object in step 3 is accurate (see the keys-section accuracy note before adding `key` to any descriptor diagram).

**Term tooltips:** *element descriptor* (a.k.a. React element — "a plain object describing what to render, not the DOM node itself"), *automatic runtime* ("the modern JSX transform that auto-imports `jsx`; Next.js configures it for you"). Tooltip *Turbopack* only if not yet defined in a prior lesson — likely a one-liner ("Next.js's Rust bundler") is enough.

### Element names: lowercase is a tag, uppercase is a component

**Goal:** install the capitalization rule as a *structural* signal the transform reads, since it changes the first argument to `jsx`.

Content:
- Lowercase names (`<div>`, `<button>`, `<input>`) compile to `jsx('div', …)` — a string tag → an HTML element.
- Uppercase names (`<Button>`, `<SignInForm>`) compile to `jsx(Button, …)` — a reference to a component function/value.
- The rule is mechanical, not stylistic: a lowercase `<button>` is always an intrinsic HTML element; `<signInForm>` would be read as the (nonexistent) HTML tag `signinform`, not your component. This is the single most surprising gotcha for newcomers, so name it explicitly.
- Forward-reference: components themselves (writing them, props, composition) are Chapter 022 — here we only need the naming rule so the rest of the lesson's examples read correctly.

Use a tiny inline `Code` block contrasting the two compiled forms. No diagram needed — one line of prose plus the contrast carries it.

### Props are the DOM property names you already know

**Goal:** cash in the Chapter 014 Lesson 2 rename table on the JSX surface, framing it as recognition ("these aren't React inventions") rather than new memorization. This is where the lesson title is earned.

Content:
- The connective tissue first: in Chapter 014 L2 the student learned the DOM exposes properties whose names differ from the HTML attributes — `className` (not `class`, a reserved word), `htmlFor` (not `for`), `tabIndex`, `readOnly`, `maxLength`. **JSX prop names are those property names.** That single sentence is the lesson's thesis; state it plainly.
- The everyday subset, grouped:
  - **Renamed for reserved words / camelCase:** `className`, `htmlFor`, `tabIndex`, `readOnly`, `maxLength`, `colSpan`, `rowSpan`. CamelCase matches the DOM property, not the HTML attribute.
  - **Pass-through, stay kebab-case:** `data-*` and `aria-*` are written exactly as in HTML and arrive in the DOM as-is. Note the *why*: they have no camelCase DOM-property mirror (the student saw `data-*`↔`dataset` in Ch 014 L2; reading them back via `dataset.fooBar` is Chapter 014/Lesson 6 of this chapter, not here).
  - **Event props:** `onClick`, `onChange`, `onSubmit`, `onKeyDown`, `onFocus`, `onBlur` — camelCase, and the value is a *function reference*, not a string. Contrast with HTML's `onclick="doThing()"` string attribute. (Synthetic-event depth is Chapter 023 L6 — Scope.)
- **The function-reference-vs-call point lands here** (it is a prop-value fact, and the recap will point back to it): `onClick={handleClick}` passes the function for React to call on click; `onClick={handleClick()}` *calls it immediately on every render* and passes the return value — almost always a bug (a render-time side effect, or `onClick={undefined}`). When you need arguments, wrap in an arrow: `onClick={() => remove(row.id)}`. Make sure this lands exactly once, here.
- The two most-common typos as the named bug class: `class` instead of `className`, `for` instead of `htmlFor`. TypeScript catches `classname`/`class` on intrinsic elements at author time (see the type-system section); name that as the safety net.
- The numbers-vs-strings nuance: `<div data-count={5}>` produces the attribute string `data-count="5"` (attributes are always strings), while `<div>{5}</div>` produces a text node containing `5`. Small but it removes a real point of confusion about why `{5}` "works" in two different ways.

**Component — AnnotatedCode.** One small JSX block (a labeled input + a button) annotated in 4–5 steps, each highlighting one prop and stating its HTML attribute counterpart: `htmlFor`↔`for`, `className`↔`class`, `tabIndex`↔`tabindex`, `data-*` unchanged, `onClick` (function not string). AnnotatedCode is the right fit because the instruction is to direct attention to *multiple specific parts of one file* in sequence. Use the `color` prop (blue default; green for the pass-through `data-*`/`aria-*` to visually separate the "unchanged" group from the "renamed" group).

**Exercise — Tokens.** A JSX snippet seeded with the renamed props plus a couple of decoys (`class`, `for` written wrong, or a plain HTML-attribute name). Prompt: "Click every prop whose name differs from its HTML attribute." Targets: `className`, `htmlFor`, `onClick`; decoys: `id`, `type`, `data-row-id` (identical-name / pass-through cases). Pedagogical goal: force the student to *discriminate* renamed from unchanged, which is exactly the daily recognition skill. Cheap, high-signal, fits this concept better than a coding task.

**Term tooltips:** none new strictly needed; the section is mostly callback. Optionally *intrinsic element* ("a built-in HTML tag React knows about, like `div` or `button`").

### JavaScript lives in curly braces

**Goal:** install the `{}` expression slot as *the* gateway between markup and data, and the expression-not-statement rule.

Content:
- `{}` opens an expression slot. Anything that evaluates to a value goes in. Two positions: as a **prop value** (`href={profileUrl}`, `disabled={isLoading}`) and as a **child** (`{user.name}`, `{formatCurrency(amount)}`).
- The hard boundary: **expressions, not statements.** `if`, `for`, `switch`, variable declarations cannot go in `{}`. The senior moves: compute above the `return` and reference the result, or use an expression form (ternary, `&&`) inline. Name this because it's the single most common "why won't this compile" wall for newcomers from other languages.
- What renders and what doesn't — the render table the student must internalize:
  - Strings and numbers render as text.
  - `null`, `undefined`, `false`, `true` render **nothing** (no error, no output). This is *why* `&&` works for conditional rendering — the falsy branch is simply absent.
  - Arrays render each element in turn (the substrate for `.map`, next section).
- The safety watch-out, inline: accessing a property on `undefined` throws (`user.name` when `user` is undefined). Guard with `?.` or `&&`. Tie it to the "renders nothing" rule — `{user?.name}` renders nothing when `user` is absent rather than crashing.

Use a single `Code` block listing the valid slot uses side by side (interpolation as value, interpolation as child, a function call), then prose for the render table. The render table itself is a strong candidate for a compact two-column HTML/CSS figure (`value` → `what renders`), wrapped in `<Figure>` — a simple visual aid, not a system graph, but it makes the "false/null/undefined render nothing" rule scannable. Keep it tiny.

**Term tooltips:** *expression* vs *statement* only if a quick refresher serves flow ("an expression evaluates to a value; a statement performs an action") — the student knows JS, so keep it a one-liner or omit.

### Rendering lists with map and the key rule

**Goal:** the canonical list pattern plus the single most consequential rule in the lesson — keys tied to data identity — and its canonical bug.

Content:
- The pattern: `{rows.map(row => <Row key={row.id} {...row} />)}` — an array of descriptors rendered in place (builds directly on "arrays render each element" from the previous section).
- The key rule, stated as three constraints: keys must be **stable** (same item → same key across renders), **unique among siblings**, and **tied to the data** — usually `key={row.id}`.
- Why keys exist, in one sentence at this depth: React uses the key to match a previous element to a current one across re-renders; without identity it falls back to sibling position. Do **not** teach reconciliation here — name it as a one-line forward reference (Chapter 023 L2 owns it). The student needs the *rule and the bug*, not the algorithm.
- **Accuracy note for the writer (verified June 2026):** `key` is *not* a normal prop. In the automatic runtime the transform hoists it out — the call shape is `jsx(type, props, key)` — so the component never receives `key` in its props. If any code or diagram depicts the descriptor object, do **not** draw `key` inside `props`; either keep that example keyless (the compile-section pipeline example is, deliberately) or show `key` as the separate third argument. Frame `key` to the student as "a React-reserved instruction to the reconciler," not "a prop you can read." (`ref` is similarly special-cased in React 19, but that belongs to Chapter 022 — don't introduce it here.)
- The array-index trap — the canonical wrong key. `key={index}` looks fine until the list is **filtered, sorted, reordered, or has items inserted/removed at the front**: the item at position 0 changes but React, seeing "key 0" again, reuses the same DOM node and any state attached to it (a focused input, a checkbox, a half-typed value lands on the wrong row). Frame it as a real production bug, not a style nit.
- When data has no natural ID: generate a stable ID at fetch/creation time and persist it (senior default), or `crypto.randomUUID()` at creation (callback to Chapter 016 L1). Never `Math.random()` (new value every render → key churn) and never the index.

**Component — CodeVariants (the index-key bug, before/after).** Two tabs over the same list:
- **Tab "Index as key" (the bug):** `key={i}` on a list that gets a row deleted from the top; prose names the symptom (input state sticks to the wrong row after delete).
- **Tab "Stable id (fix)":** `key={row.id}`; prose names why it's correct.
Use `del=`/`ins=` markers on the key line across the two panes. CodeVariants is the right pick because this is a textbook before/after comparison of the same code. Keep prose to the one-paragraph cap.

**Exercise — ReactCoding (tests mode, `hidePreview`).** Starter: a component mapping over a small array using `key={i}` (or no key). Instructions: "Give each list item a stable key tied to the data." Tests assert each rendered `<li>` exists and renders the expected text/structure; the load-bearing change is replacing the index with `item.id`. Note for the building agent: keys are **not** reflected in the DOM, so a test can't read the key directly — assert on rendered content + structure and lean on the AI-feedback rubric to check the key source. If that feels too soft, drop the coding task and keep the CodeVariants demo alone, or use a `PredictOutput`-style reorder demo instead.

**Term tooltips:** *reconciliation* ("React's process for matching old and new elements when re-rendering; the deep treatment is later") — one-liner, since it's named as a forward reference.

### Conditional rendering and the `0` trap

**Goal:** the two conditional-render idioms and the lesson's most famous footgun.

Content:
- Two idioms:
  - **`&&` for one-branch (render or nothing):** `{isAdmin && <AdminPanel />}` — renders the right side when the left is truthy, nothing otherwise (ties back to "false/null render nothing").
  - **Ternary for two-branch:** `{user ? <Dashboard /> : <SignInPrompt />}`.
- The `0` trap, taught in slow motion because it is non-obvious: `{items.length && <List />}` renders the literal **`0`** as a visible text node when `items` is empty — because `0` is falsy so `&&` returns `0`, and `0` (unlike `false`) *renders* (it's a number, see the render table). This is the payoff of the earlier "numbers render, `false` doesn't" distinction — call that connection out explicitly.
- The senior fix: coerce the left side to a real boolean — `{items.length > 0 && <List />}` or `{Boolean(items.length) && <List />}`, or use a ternary. State this matches the code convention (`condition && <Node />` only when `condition` is a proper boolean).

**Exercise — PredictOutput.** Program: render a component where `{items.length && <List/>}` with `items = []`; a tiny harness `console.log`s the rendered text content (or frame it as "what appears on the page"). Expected output: `0`. `<PredictWhy>`: `0` is falsy, so `&&` evaluates to `0`; numbers render as text while `false`/`null` render nothing — coerce with `length > 0`. Pedagogical goal: the surprise *is* the lesson; PredictOutput's withhold-on-first-wrong mechanic makes the student commit to a prediction, which cements it far better than reading the warning. This is the single best-placed exercise in the lesson.

### Fragments group siblings without a wrapper

**Goal:** the one-root rule and why `<div>`-wrapping to satisfy it is a real cost.

Content:
- The constraint: a JSX expression must have a single root. Returning two adjacent elements is a syntax error.
- `<>...</>` (fragment shorthand) groups siblings without emitting any DOM node — the cleanest fix.
- Why not just wrap in `<div>`: a wrapper purely to satisfy the one-root rule pollutes the DOM tree and can break layout (flex/grid parent-child relationships) and accessibility structure (an extra node between `<ul>` and `<li>`, or `<tr>` and `<td>`, is invalid/announced wrong). Frame the `<div>` reflex as the junior tell; the fragment as the senior default.
- Keyed fragments: when a fragment is the item returned from a `.map`, the shorthand can't take a key — use `<React.Fragment key={...}>`. Name it briefly; it's a recognition item.

**Component — CodeVariants.** "Wrapper div (pollutes DOM)" vs "Fragment (clean)" over the same two-sibling return, with a one-line note on the rendered DOM difference. Reuse the before/after pattern established earlier for consistency.

### Void elements must self-close

**Goal:** the JSX rule that void elements self-close, framed as a parse-error bug class.

Content:
- HTML void elements have no children and no closing tag. In JSX they **must** self-close: `<img />`, `<input />`, `<br />`, `<hr />`. The full void set the student will meet in this course: `<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`, `<link>`, `<source>`, `<col>`, `<area>`, `<base>`, `<embed>`, `<track>`, `<wbr>` (list for recognition; the daily four are `img`/`input`/`br`/`hr`).
- The bug: `<img src="...">` without the slash is a JSX parse error (it tries to find a closing tag). Name it — it's a frequent first-week stumble.
- Non-void elements *may* self-close when childless (`<div />`), but writing `<MyComponent />` is the common case.

Single short `Code` block showing right/wrong (`<input />` vs `<input>`). No heavy component needed — the rule is small. Could be folded as inline reference if space is tight, but a tiny standalone block reads cleanly.

### The edges: comments, the type system, children, escaping, and `style`

**Goal:** sweep the remaining small-but-real items into one coherent "edges" section rather than scattering thin subsections. Each is a short paragraph or a 2–3 line block. Group them because none warrants its own h2 and they share the theme "things about the JSX surface a senior knows but a junior trips on."

Subsections (h3) or tight paragraphs:

- **Comments in JSX.** `{/* ... */}` inside JSX trees (it's an expression-slot comment); the usual `//` and `/* */` everywhere else in the file. Name the trap: a bare `//` inside JSX renders as text. One tiny block.

- **TypeScript types the JSX surface.** Built-in elements are typed via `JSX.IntrinsicElements` (autocomplete on `<button>`'s props; `classname` or `onclick` is a compile-time error). Components are typed by their prop type. The payoff to name: the rename-typo bug class from earlier is *caught at author time* — this is the safety net that makes JSX forgiving. Consider a **CodeTooltips** block here: a small JSX snippet where hovering `className` / `onClick` shows the inferred prop type (e.g. `string | undefined`, `MouseEventHandler<HTMLButtonElement>`), making "props are typed" tangible. CodeTooltips is the right component for surfacing inferred type meta-information inline. Keep tooltips to 2–3 tokens.

- **`children` arrives as a prop.** Content between a component's tags arrives as the `children` prop — `<Card>hello</Card>` → `Card` receives `children: 'hello'`. Name it as a one-paragraph forward reference only; the children-as-API pattern is Chapter 022 L1 (Scope). The student needs to recognize `children` when they see it in this chapter's later examples (e.g. the root layout).

- **JSX escapes by default; `dangerouslySetInnerHTML` is the opt-out.** Text children are HTML-escaped automatically — `{userInput}` containing `<script>` renders as literal text, not markup. That's React's built-in XSS protection. The deliberate escape hatch is `dangerouslySetInnerHTML={{ __html: ... }}`, whose only legitimate uses are *already-sanitized* HTML (sanitized Markdown via `react-markdown`, CMS rich text run through `dompurify`). Name the danger and the legitimate pattern; the full XSS treatment is Chapter 054 L4 (Scope). Frame the verbose, ugly API name as intentional — React makes the unsafe path look unsafe.

- **The `style` prop is an object, not a string.** `style={{ marginTop: 8 }}` — an object with camelCase CSS property names (numeric values get `px` where appropriate). Contrast HTML's `style="margin-top: 8px"` string. Critically: **this is rare in this course** — Tailwind utilities (Chapter 018) are the styling default; `style` is reserved for genuinely dynamic values that can't be a utility (e.g. a computed transform from JS). Name it so the student recognizes it but doesn't reach for it.

Use **TabbedContent** to group the type-system tooltip demo and the escaping example only if they read better tabbed; otherwise keep as sequential short blocks. Default to sequential — these are reference items, and tabs would hide content the student should skim linearly.

**Term tooltips:** *XSS* ("cross-site scripting — injecting malicious markup/JS through unescaped user content"), *`JSX.IntrinsicElements`* ("the TypeScript type registry of built-in HTML elements and their props").

### Recap: the four bug classes

**Goal:** consolidate the lesson into the recognition checklist the senior frame promised. Short, scannable, no new concepts.

Content: a compact restatement of the four highest-value reflexes, each one line tying back to its section:
1. `className` not `class`, `htmlFor` not `for` (TypeScript catches it).
2. Keys tied to data identity, never the array index.
3. The `&&` `0`-trap — coerce numeric left-hand sides to boolean.
4. `onClick={handleClick}` (pass the reference) not `onClick={handleClick()}` (calls on every render). This point is *introduced* in the "Props are the DOM property names" section (it's a prop-value fact); here it is only recalled. The writer must ensure it lands once, in the props section, and the recap points back to it — do not teach it fresh here.

Optionally close with a single **MultipleChoice** or **TrueFalse** round (3–4 statements) spanning the four bug classes as a light self-check, if the recap feels too passive. Keep it optional and short — the heavier exercises already did the assessment work earlier.

Use the Starlight `Aside` (`tip`) sparingly if a single reflex deserves emphasis, but prefer prose — the recap is itself the emphasis.

### External resources (optional)

One or two `ExternalResource` cards max. Canonical references, verified live on `react.dev` (June 2026): [JavaScript in JSX with Curly Braces](https://react.dev/learn/javascript-in-jsx-with-curly-braces) and [Rendering Lists](https://react.dev/learn/rendering-lists); [Conditional Rendering](https://react.dev/learn/conditional-rendering) is an alternative for the `&&`/ternary section. Do not over-link — pick the one or two that best match the lesson's heaviest sections.

---

## Scope

**This lesson installs:** what JSX is and what it compiles to (shallow), the tag-vs-component capitalization rule, JSX prop names as DOM property names (`className`, `htmlFor`, `tabIndex`, `readOnly`, `maxLength`, `colSpan`, `rowSpan`, `data-*`/`aria-*` pass-through, camelCase event props), the function-reference-vs-call point, the `{}` expression slot and expression-not-statement rule, the render table (strings/numbers render; `null`/`undefined`/`false`/`true` render nothing; arrays map), list rendering with `.map` and the data-tied key rule plus the index-key bug, `&&`/ternary conditional rendering and the `0`-trap, fragments and the one-root rule, void-element self-closing, JSX comments, that TypeScript types the JSX surface, `children` as a prop (recognition only), default escaping plus `dangerouslySetInnerHTML` (recognition + legitimate pattern), and the `style`-object prop (recognition only).

**Prerequisites to redefine concisely (do not re-teach):**
- The attribute-vs-property model and the rename table — **owned by Chapter 014 Lesson 2.** Recall it in one or two sentences as the foundation; the student already knows *why* the names differ. This lesson only re-applies it on the JSX side.
- `data-*`↔`dataset`, `crypto.randomUUID()` — Chapter 014 L2 / Chapter 016 L1. One-line callbacks only.
- The DOM event model — Chapter 014 L3. Event *props* are in scope; the synthetic-event system is not.

**This lesson does NOT cover (reserve for later):**
- The HTML document shell / Next.js root layout — Chapter 017 Lesson 2.
- Semantic landmarks and the heading hierarchy — Chapter 017 Lesson 3.
- Buttons / links / `<Link>` / lists as element families with their semantics — Chapter 017 Lesson 4. (This lesson uses `<li>`/`<button>` mechanically in examples but does not teach when to choose them.)
- Forms, `<label htmlFor>` as a contract, `name`/`FormData` — Chapter 017 Lesson 5. (Examples may show a label+input to demonstrate `htmlFor`, but the form contract is not taught.)
- `data-*` and `aria-*` at depth, the `<table>` decision — Chapter 017 Lesson 6.
- React components, props, composition, the children-as-API pattern, `ref` as a prop — Chapter 022.
- The render model, what triggers a render, reconciliation, resetting state with `key` — Chapter 023 (named only as forward references).
- Synthetic events at depth — Chapter 023 Lesson 6.
- Tailwind, the `cn()` helper, class composition — Chapter 018 (keep examples nearly unstyled).
- The full XSS / `dangerouslySetInnerHTML` security treatment — Chapter 054 Lesson 4.
- The JSX transform mechanics, classic-vs-automatic runtime configuration — out of scope entirely; Next.js owns it. Mention only that a transform exists.
- The JSX whitespace-collapsing rule and explicit `{' '}` — **cut.** Niche and rarely load-bearing in a Tailwind-spaced codebase; including it would add cognitive load for little payoff. (Noted as a deliberate cut from the chapter outline's watch-out list.)

---

## Notes for the writer

- Keep code samples deliberately under-styled — no Tailwind classes beyond what a single example needs for legibility — because Chapter 018 hasn't happened. If a button or input needs to look like anything, a className is fine but don't teach it.
- The lesson is long; respect the cognitive-load sequencing (model → static surface → dynamic patterns → edges → recap). Do not front-load the edges section.
- Every difference-from-HTML is framed as a *bug a senior recognizes*, not a syntax rule to memorize. Keep that voice.
- Exercises are placed inline at their concept, never bundled at the end: Tokens (prop names), PredictOutput (the `0`-trap — highest value), ReactCoding or CodeVariants (the key bug). Don't over-add; three well-placed interactions beat six.
- `key` is special-cased by the transform (`jsx(type, props, key)`) — never depict it as living inside the `props` object in any descriptor diagram or example. See the keys-section accuracy note.
