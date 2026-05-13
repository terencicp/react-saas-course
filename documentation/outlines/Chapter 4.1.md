# Chapter 4.1 — JSX and HTML semantics through JSX

## Chapter framing

Unit 4 opens here. The student has finished Units 1, 2, and 3 — they have a pinned toolchain, they read TypeScript fluently, they know what the DOM is and how attributes diverge from properties, they have a Network panel reflex, and the substrate every later UI lesson lands on is named. Unit 4 turns the substrate into a UI layer. This chapter is the bridge: JSX is the form the student will write for every React component for the rest of the course, and HTML is what JSX compiles into. Teaching them separately would invent a problem the 2026 senior doesn't have. The 2026 senior writes JSX, the browser receives HTML, and the two are not different topics — they're one surface viewed from two sides.

The senior framing for the chapter: **the student will write JSX for the next eighteen units; every prop they write, every element they choose, every attribute they spell is a decision the browser, the accessibility tree, the search engine crawler, and React's reconciler all read.** The chapter names the JSX surface (interpolation, conditional rendering, lists with keys, fragments, void elements) and the HTML element surface a SaaS engineer reaches for daily (document structure, landmarks, headings, buttons, links, forms, data and ARIA attributes, tables) and refuses to teach them as separate vocabularies. Every paragraph that names an HTML element names how it's written in JSX; every paragraph that names a JSX prop names the underlying HTML attribute or DOM property it surfaces as. Chapter 3.5.2 set this up — the attribute-vs-property split, the JSX rename table (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`). This chapter cashes it in across the element surface a SaaS UI actually ships.

Threads that must run through every lesson:

- **JSX is the form the student writes; HTML is what the browser, the crawler, and the screen reader read.** Every code sample in the chapter is JSX. The lesson names the HTML the JSX compiles into only when the difference is load-bearing (the `className`/`htmlFor` renames, the boolean-attribute spelling, the children-as-content model, the `dangerouslySetInnerHTML` opt-out). No lesson teaches "raw HTML" as a separate exercise — the student authors JSX from the first snippet and reads the HTML through DevTools when the question demands it.
- **Semantics over visuals.** A `<button>` is not "a `<div>` styled to look clickable." The chapter names the senior reflex that turns up at every code review: reach for the semantic element first (`<button>`, `<a>`, `<nav>`, `<main>`, `<label>`, `<ul>`, `<table>`), reach for the generic `<div>` or `<span>` only when no semantic element fits. The 2026 reason isn't "old-school correctness"; it's that semantic HTML is what makes the page usable by keyboard, by screen reader, by Google's crawler, by autofill, by `Cmd+F`, and by every browser extension a user has installed. Tailwind v4 styles whatever element wraps the content (Chapter 4.2 cashes this in); the element choice is independent of the styling.
- **Accessibility is structural, not retrofitted.** Every element gets named with the accessibility consequence inline. A `<button>` is keyboard-activatable for free; a `<div role="button">` requires `tabIndex`, `onKeyDown` for `Enter`/`Space`, and `aria-pressed` if it's a toggle. A `<label htmlFor>` wires up the form-element association the screen reader announces and the click-target the user gets. The chapter does not punt accessibility to Chapter 4.11; it installs the per-element discipline at the call site, and Chapter 4.11 picks up the cross-cutting baseline (focus management, ARIA, reduced motion, contrast) on top.
- **The minimum viable element vocabulary.** The chapter teaches the elements a 2026 SaaS UI ships — document structure, landmarks, headings, paragraphs, lists, buttons, links, forms, tables, the `data-*` and `aria-*` attribute families — and refuses to survey the long tail (`<dl>`, `<details>`, `<dialog>`, `<output>`, `<address>`, `<cite>`, `<figcaption>`). Each long-tail element gets at most a one-line mention where it earns a name. The deliverable is recognition of the surface a senior reaches for daily, not the full HTML element catalog.
- **JSX is property syntax under the hood.** Chapter 3.5.2 installed the model — JSX props compile to property writes, not attribute writes — and named the rename table. This chapter operates the model. `className` is the prop because `class` is a reserved word and the underlying DOM property is `className`. `htmlFor` is the prop because `for` is reserved and the property is `htmlFor`. Boolean attributes pass booleans, not strings. `style` is an object, not a string. The student writes through the JSX surface; the rename table lives in muscle memory by lesson three.
- **Lists need keys; the wrong key is its own bug class.** Reconciliation (Chapter 4.7.2) cashes in the key story in depth; this chapter installs the discipline. Keys are stable, unique identifiers tied to the data — usually the row's database `id`. The array index is the canonical wrong key and the canonical bug shape: filter the list, toggle a checkbox, watch the checkbox stay on the wrong row. The student writes `key={row.id}` by reflex from the first list snippet.
- **Forms are a contract; the native React 19 / Next.js 16 pattern is the default.** Chapter 7.3 owns the full Server Actions + `useActionState` + `FormData` treatment; this chapter installs the elements (`<form>`, `<input>`, `<label>`, `<button type>`, `<fieldset>`, `<legend>`, `<select>`, `<textarea>`) and the `name` attribute as the contract between markup and the `FormData` the server reads. The student writes forms that work without JavaScript because the elements are right; Chapter 7.3 wires the action and the validation.
- **Senior anchors for later units are seeded here.** Lists with keys land again at the reconciler (Chapter 4.7.2) and the resetting-state-with-key pattern (Chapter 4.7.5). The root layout in Lesson 4.1.2 lands again at Server Components (Chapter 5.2.1), the metadata API (Chapter 5.6.9), and `next-themes` (Chapter 4.2.6). The form element surface lands again at the native form pattern (Chapter 7.3.3), `FormData` (Chapter 7.3.2), the Constraint Validation API (Chapter 7.3.7), and the shadcn `<Form>` primitives (Chapter 4.11.1, Chapter 7.6.2). The `<a target rel>` discipline lands again at security headers (Chapter 17.2.1). The `aria-*` surface lands again at the accessibility baseline (Chapter 4.11.3). Tables land lightly here because they almost never earn their weight; when they do (an audit log view, a billing breakdown), the lesson names the call.
- **The reading instrument is the Elements panel plus the accessibility tree.** Chapter 3.5.1 introduced the Elements panel as a window onto the live DOM tree. This chapter adds the second pane: the accessibility tree (Chrome DevTools → Elements → Accessibility) shows what a screen reader sees, which is often subtly different from the DOM. The lesson names the second pane once and points to it as the recognition tool for "is this `<button>` actually announced as a button?"

The chapter ships six teaching lessons plus the quiz. The TOC's seven-bullet slicing condenses cleanly. The JSX-as-HTML lesson (4.1.1) installs the JSX surface and the JSX-vs-HTML diffs that every later lesson rides on. The root-layout lesson (4.1.2) installs the document structure that Server Components and the metadata API will both touch. The semantic-landmarks-and-headings lesson (4.1.3) installs the page-structure vocabulary screen readers and crawlers depend on. The interactive-elements lesson (4.1.4) installs buttons, links, and lists — three element families that share the "interactive or enumerable" theme and the senior reflexes (`<button type="submit">` defaults, `<a target rel>` security, `<ul>`/`<ol>` semantics for grouping). The forms lesson (4.1.5) installs the form element surface as a contract that Chapter 7.3 will wire. The data-and-aria lesson (4.1.6) installs the two non-rendered attribute families and folds the table treatment into its second half — tables are short enough that a separate lesson would be padding, and the data-attribute and table threads share the "structural markup the screen reader reads" frame. The quiz closes the chapter.

Reordering note: the TOC's order (JSX → root layout → semantic elements → buttons/links → forms → data/aria → table) is mostly the dependency order. The one move is folding the table content into the data-and-aria lesson because (a) tables are a short topic in 2026 SaaS code, (b) the `<thead>`/`<tbody>` structure shares the "structural markup for assistive tech" frame with `aria-*`, and (c) the canonical SaaS table — an audit log view — uses `data-*` attributes for row hooks. The teaching beats stay independent within the lesson; the slicing just avoids a 25-minute standalone lesson.

This chapter ships short JSX snippets, a heavy dose of exercises (`Buckets` for the semantic-element decision, `Matching` for JSX props to HTML attributes, `CodeReview` for the canonical wrong-element bugs, `MultipleChoice` for the senior reflexes, `PredictOutput` for the boolean-attribute traps), and a handful of `ReactCoding` blocks where the student writes the JSX form. Diagrams carry weight at three sites: a `Figure` rendering the document structure as a tree with landmarks color-coded (Lesson 4.1.2 and 4.1.3), an `ArrowDiagram` mapping JSX prop names to their HTML attribute and DOM property counterparts (Lesson 4.1.1), and a small interactive widget for the `<button>` vs. `<a>` vs. `<div role="button">` decision tree (Lesson 4.1.4). The chapter ends with the student writing the root layout, a navigation surface, and a sign-in form in JSX with the right elements, the right props, the right ARIA where needed, and the right keys on every list — and recognizing each of those choices as a decision, not a default.

The chapter ordering follows the dependency: JSX surface first (every later lesson writes JSX), document structure second (the page shell every later element sits inside), landmarks and headings third (the structural map every interactive element lives within), interactive elements fourth (buttons, links, lists — the surface the user clicks and reads), forms fifth (the elements that take user input), data attributes plus ARIA plus tables sixth (the non-rendered markup that scripts, assistive tech, and structured content depend on). The quiz closes the chapter.

---

## Lesson 4.1.1 — JSX as HTML through React's lens

Topics to cover:

- The chapter-opening senior question: the student writes `<button className="btn" onClick={handleSubmit}>Save</button>` in a `.tsx` file. The browser receives `<button class="btn">Save</button>` and a click handler attached at the React root. What just happened, what's the same as the HTML the student already knows, what's different, and why? The naive answer is "JSX is HTML in JavaScript." The senior answer names JSX as property-syntax sugar over `React.createElement` (which Chapter 4.6 will cash in lightly) that compiles through the JSX transform into element descriptors React renders into the DOM. The differences from HTML — `className`, `htmlFor`, camelCase event props, JavaScript expressions in `{}`, the explicit list-key rule, the void-element self-closing requirement, fragments — each name a specific bug class the senior recognizes. The lesson installs the model and the surface.
- **JSX in one paragraph.** JSX is JavaScript with an XML-like element syntax. The compiler (the React JSX transform, run by Turbopack in the course's Next.js stack) turns `<div className="row">Hello</div>` into `jsx('div', { className: 'row', children: 'Hello' })` (the 2026 "automatic runtime" — `_jsx`/`_jsxs` instead of the legacy `React.createElement`). The function returns an element descriptor object; React's renderer turns the tree of descriptors into DOM operations. The student does not write `jsx(...)` calls — the transform handles it. The student writes JSX.
- **The element name is a tag or a component.** Lowercase element names (`<div>`, `<button>`, `<span>`) are HTML tags — the compiler passes the string `'div'` to the JSX runtime, React renders the corresponding DOM element. Uppercase element names (`<Button>`, `<SignInForm>`) are React components — the compiler passes the component function itself, React calls the function with the props and renders its return value. The capitalization rule is structural, not stylistic; lowercase `<button>` and capitalized `<Button>` are different things to React. Chapter 4.6 owns components in depth; this lesson installs the lowercase-vs-uppercase distinction so the student isn't confused when the chapter mixes both.
- **Props are property syntax.** Chapter 3.5.2 installed the model — JSX compiles to property writes, not attribute writes — and named the rename table. This lesson operates it on the JSX surface:
  - **`className`** (not `class`). The DOM property is `className`; `class` is a JavaScript reserved word. The HTML the browser receives is `<div class="row">`; the React reconciler writes through the DOM property.
  - **`htmlFor`** (not `for`). Same reason — `for` is reserved.
  - **`tabIndex`**, **`readOnly`**, **`maxLength`**, **`colSpan`**, **`rowSpan`** — kebab-case-in-HTML, camelCase-in-JSX. The rule: the prop name matches the DOM property name, not the HTML attribute name.
  - **`data-*` and `aria-*`** — stay kebab-case in JSX. React passes them through to the DOM as-is. The student writes `<div data-row-id={row.id} aria-label="Delete">`.
  - **Event props** — `onClick`, `onChange`, `onSubmit`, `onKeyDown`, `onFocus`, `onBlur`. CamelCase. The value is a function, not a string. The underlying DOM event name is lowercase (`click`, `change`, `submit`); React's synthetic event system (Chapter 4.7.6) handles the dispatch. Chapter 3.5.3 installed the DOM event model; this lesson installs the JSX prop spelling.
- **JavaScript in `{}`.** Curly braces inside JSX are an expression slot — JavaScript evaluates, the result becomes the prop value or the child. The senior call: any expression that returns a string, number, JSX element, array of JSX elements, or `null` is valid; objects (except as prop values) are not. The student writes:
  - **Interpolation as a prop value:** `<a href={profileUrl}>` (the variable is the value).
  - **Interpolation as a child:** `<h1>Welcome, {user.name}</h1>` (the variable becomes a text node).
  - **Conditional rendering:** `{isAdmin && <AdminPanel />}` (the `&&` short-circuit; if `isAdmin` is `false`, JSX renders nothing).
  - **Ternaries for two-branch rendering:** `{user ? <Dashboard /> : <SignInPrompt />}` (the JSX expression on each side).
  - **Nested expressions:** `<span>{formatCurrency(amount)}</span>` (call the function, render the result).
- **The `&&` short-circuit and the `0` trap** — the canonical senior watch-out:
  - **The bug.** `{items.length && <List items={items} />}` — when `items.length` is `0`, the expression evaluates to `0`, and React renders the literal `0` as a text node. The student sees a stray `0` on the page.
  - **The senior fix.** Coerce to boolean: `{items.length > 0 && <List items={items} />}` or `{Boolean(items.length) && <List items={items} />}` or use a ternary: `{items.length ? <List items={items} /> : null}`. The 2026 reflex: never rely on truthy-coercion of numeric values in JSX; always make the boundary explicit.
- **Rendering lists with `.map` and the key rule:**
  - **The pattern.** `{rows.map(row => <Row key={row.id} {...row} />)}` — JavaScript's `.map` produces an array of JSX elements; React renders each.
  - **The key prop.** Every element in a list-rendered array needs a `key` prop. The key is React's stable identifier for the element across renders — it's how the reconciler (Chapter 4.7.2) decides whether a DOM node is the same logical row or a new one.
  - **The key rule.** Keys must be stable (the same logical row gets the same key across renders), unique within the array (no two siblings share a key), and tied to the data — usually the row's database `id` (the senior default) or another natural unique identifier. The key does not need to be globally unique, just unique among siblings.
  - **The array-index trap — the canonical wrong key.** `{rows.map((row, i) => <Row key={i} ... />)}` — the index `i` looks unique because each row has a different position. The bug fires when the list is filtered, sorted, or reordered: the row at position 0 used to be Alice, now it's Bob, but React's reconciler keeps the same DOM node (because the key is the same) and reuses Alice's input state on Bob's row. The recognition signal: "the checkbox stays on the wrong row after I filter" or "the input I was typing in now belongs to a different list item." The senior reflex: keys are tied to the *data*, never to the *position*.
  - **When the data has no natural ID.** Two reaches. One, generate one once at fetch time and persist it (the senior default — the database has the ID). Two, if the data is genuinely transient and has no ID, use `crypto.randomUUID()` once at creation time and stash it in state (Chapter 3.7.1 cross-reference). The reflex is never `Math.random()` and never the index.
  - **Forward reference.** Chapter 4.7.2 owns reconciliation in depth; Chapter 4.7.5 owns the resetting-state-with-`key` pattern (the same key mechanism, used deliberately to force a remount). This lesson installs the list-rendering discipline.
- **Fragments — the `<>...</>` shorthand.** JSX requires a single root element per expression. A component that wants to return multiple sibling elements without a wrapping `<div>` uses a fragment. Two forms:
  - **The short form:** `<>...</>` — anonymous, no props. The senior default.
  - **The explicit form:** `<React.Fragment>...</React.Fragment>` — used only when a `key` prop is needed on the fragment (which is the case when fragments are rendered in a `.map` and each fragment groups multiple siblings). `<React.Fragment key={row.id}>` is the senior reach.
  - **The senior reflex.** Don't wrap in a `<div>` purely to satisfy JSX's "one root" rule — fragments are the right answer. A `<div>` that exists only for the wrap pollutes the DOM tree, breaks CSS that assumes a specific parent-child structure (grid layout, flex children), and confuses the accessibility tree.
- **Void elements and self-closing in JSX:**
  - **Void elements** — HTML elements that have no closing tag in HTML because they can't contain children: `<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`, `<link>`, `<source>`, `<col>`, `<area>`, `<base>`, `<embed>`, `<param>`, `<track>`, `<wbr>`. In JSX every one of these must be self-closed: `<img src={url} alt={description} />`. Forgetting the slash is a JSX parse error (the compiler reports the unclosed tag).
  - **Non-void elements** can be self-closed in JSX when they have no children: `<div />` is valid JSX that renders an empty `<div></div>` in the DOM. The senior reach: self-close when there are no children; use the open-close form when children exist.
- **`dangerouslySetInnerHTML` — the explicit escape hatch.** Chapter 3.5.2 introduced `innerHTML` as the XSS-vulnerable DOM property. JSX's children are escaped by default — `<p>{userContent}</p>` renders `userContent` as a text node, so an injection `<script>alert(1)</script>` becomes literal text on the page, not executed script. To opt out, the prop is `dangerouslySetInnerHTML={{ __html: trustedHtml }}` — the long ugly name is the entire point. The 2026 senior reach is to avoid this prop entirely. The canonical legitimate sites: rendering Markdown that's been sanitized through a Markdown library (`react-markdown` is the standard reach, which handles the sanitization internally), embedding rich text from a CMS that's already sanitized server-side. The user-input case always sanitizes first (with `dompurify` or equivalent) — Chapter 9.4.4 owns the security treatment.
- **Comments in JSX.** `{/* this is a JSX comment */}` — JavaScript comment inside the expression slot. The student writes them inside JSX trees. Outside JSX (in the surrounding TypeScript) the usual `//` and `/* */` comments work.
- **The JSX type system.** TypeScript types JSX through the `JSX.IntrinsicElements` interface (built-in elements like `<div>`) and the component's prop type (for `<Button>`). The student gets autocomplete on `<div className="…">` (the IDE shows the valid props for `<div>`); misspelling `classname` is a type error. The TypeScript view: every JSX tag is a function call; the props object is type-checked against the function's expected shape. The student writes JSX and the type system enforces the right props at compile time — no runtime "unknown prop" warnings in 2026 strict mode.
- **`children` as a prop.** What appears between a component's opening and closing tags is the component's `children` prop. The student writes `<Card>Hello</Card>` and the `<Card>` component receives `children: 'Hello'` (or `children: <SomeElement />` if the content is JSX). Chapter 4.6.1 owns the children-as-API pattern in depth; this lesson installs the model so the JSX form is legible.
- **The `style` prop is an object, not a string.** `<div style={{ color: 'red', fontSize: 16 }}>` — the value is a JavaScript object with camelCase CSS property names. The HTML attribute `style="color: red; font-size: 16px"` is what reaches the DOM. The student rarely writes the `style` prop in the course's stack — Tailwind utilities (Chapter 4.2) are the senior default for styling. The reach is for dynamic values that don't fit a utility (a calculated `transform` driven by mouse position, a CSS custom property set per-instance).
- **The watch-outs a senior names:**
  - **The `&&` short-circuit's `0` trap.** Coerce to boolean explicitly when the left-hand side is numeric.
  - **The array-index key trap.** `key={i}` is the canonical wrong key; keys are tied to data, never to position.
  - **Forgetting the self-close on void elements.** `<img>` without `/>` is a JSX parse error. The IDE catches it; the senior writes `<img />` by reflex.
  - **`className` not `class`, `htmlFor` not `for`.** The two most-common JSX-vs-HTML typos. The IDE catches them; the senior writes the JSX form by muscle memory.
  - **Numbers and strings render differently in `{}` vs. as attribute values.** `<div data-count={5}>` produces `data-count="5"` (HTML attributes are strings); `<div>{5}</div>` produces a text node with `"5"`. The student rarely needs to think about this; the JSX runtime stringifies for them.
  - **`null`, `undefined`, `false`, and `true` render nothing.** `{user && <Welcome />}` when `user` is `null` renders nothing — perfect. `{user.name}` when `user` is `undefined` *throws* — `Cannot read property 'name' of undefined`. The senior reach: guard the access (`{user?.name}`) or the render (`{user && <h1>Welcome, {user.name}</h1>}`).
  - **Returning multiple roots without a fragment is a syntax error.** A component can't return two sibling JSX elements without a wrapping fragment or element. The fix is `<>...</>`.
  - **`onClick={handleClick()}` calls the function immediately, every render.** The senior reach: `onClick={handleClick}` (pass the function reference) or `onClick={() => handleClick(args)}` (arrow wrapper when args are needed). The trailing `()` is the canonical newbie typo; the IDE often catches it through TypeScript inference.
  - **The whitespace rule.** JSX collapses whitespace between elements to a single space (or nothing). `<p>Hello {name}</p>` produces `Hello Alice`; `<p>Hello{name}</p>` produces `HelloAlice`. The senior watch-out for spacing-sensitive output: use explicit `{' '}` strings or wrap in containers with appropriate styling.
  - **JSX expressions don't accept statements.** `{if (admin) <Panel />}` is a syntax error — `if` is a statement, not an expression. The senior reach: ternaries, `&&`, or extract the conditional into a variable above the JSX return.

What this lesson does not cover:

- The HTML document structure at the Next.js root layout (4.1.2).
- Semantic landmarks and heading hierarchy (4.1.3).
- The button/link/list element families (4.1.4).
- Forms (4.1.5).
- `data-*` and `aria-*` at depth (4.1.6).
- React components, props, and composition at depth (Chapter 4.6).
- The render model and reconciliation (Chapter 4.7).
- Synthetic events at depth (Chapter 4.7.6).
- `children` as an API (Chapter 4.6.1).
- The Tailwind class composition surface and `cn()` (Chapter 4.2.3).
- The full XSS treatment and `dangerouslySetInnerHTML` security depth (Chapter 9.4.4).
- The JSX transform mechanics, classic vs. automatic runtime configuration — out of scope; Next.js handles it.

Pedagogical approach:

Mechanics-plus-concept archetype. The lesson teaches the JSX surface (the form) and the model under it (property syntax compiling through the JSX transform to element descriptors React renders). The deliverable is fluency — the student writes JSX with `className`/`htmlFor`/event props/curly-brace expressions/list keys/fragments/self-closing void elements by reflex, and recognizes each of the canonical traps (the `0` short-circuit, the array-index key, the `onClick={fn()}` typo).

Open with the senior question — "you wrote `<button className='btn' onClick={handleSubmit}>Save</button>`; what reaches the browser, what's different from raw HTML, and why?" — and a `MultipleChoice` exercise pitting four explanations (JSX is interpreted at runtime by the browser — wrong, the compiler transforms it; JSX is a string template — wrong, it's an expression; JSX compiles to a function call producing element descriptors React renders — right; JSX is React-specific syntax with no compile step — wrong, Turbopack runs the transform). The discrimination installs the JSX-as-compiled-syntax model.

A `Figure` with a hand-authored SVG renders the compile pipeline: JSX source on the left (`<div className="row">Hello</div>`), an arrow labeled "JSX transform" pointing right to the compiled output (`jsx('div', { className: 'row', children: 'Hello' })`), and an arrow pointing to the DOM (`<div class="row">Hello</div>`). The student sees the three forms — what they write, what's compiled, what the browser sees — in one picture.

An `ArrowDiagram` inside a `Figure` maps eight JSX props to their HTML attribute and DOM property counterparts: `className` → HTML `class` / property `className`; `htmlFor` → HTML `for` / property `htmlFor`; `tabIndex` → HTML `tabindex` / property `tabIndex`; `readOnly` → HTML `readonly` / property `readOnly`; `colSpan` → HTML `colspan` / property `colSpan`; `onClick` → DOM event `click` (no HTML attribute counterpart in modern code); `data-row-id` → HTML `data-row-id` / property `dataset.rowId`; `aria-label` → HTML `aria-label` / property accessed via `getAttribute('aria-label')`. The translation table is visual.

A `Buckets` exercise sorts ten JSX expressions into "renders something visible" vs. "renders nothing" — `{false}` (nothing), `{null}` (nothing), `{undefined}` (nothing), `{0}` (the number `0` as a text node — the trap), `{'0'}` (the string `'0'` as a text node), `{''}` (nothing — empty string renders nothing), `{[]}` (nothing — empty array), `{[1, 2, 3]}` (renders `123`), `{<div />}` (renders an empty div), `{user && <Welcome />}` when `user` is `null` (nothing). The recognition of the `0` trap is concrete and the `false`/`null`/`undefined` reflexes are locked in.

A `Matching` exercise pairs eight JSX props with their canonical use site — `key` (list rendering, stable per-row identifier), `className` (Tailwind utility classes), `htmlFor` (label-to-input association), `onClick` (button click handler), `onChange` (input change handler), `style` (dynamic CSS where Tailwind doesn't fit), `dangerouslySetInnerHTML` (sanitized Markdown render), `children` (component content passed between tags). The senior vocabulary is locked in.

An `AnnotatedCode` block walks a 12-line component that exercises every JSX feature in one piece: a `'use client'` directive at top, a typed component prop, a list-with-keys, a `&&` conditional with proper boolean coercion, a fragment grouping two siblings, a void element (`<img />`), an `onClick` handler, a `className` and an `htmlFor`. Annotations call out: `key={row.id}` (data-tied), `items.length > 0 &&` (explicit boolean), the fragment around the two siblings (no `<div>` wrap), the self-closed void element, the `className` and `htmlFor` (rename table in operation).

A `CodeReview` exercise on a 30-line component with six issues:
- `<div class="row">` (should be `className`).
- `<label for="email">` (should be `htmlFor`).
- `{items.length && <List ... />}` (the `0` trap — needs `items.length > 0 &&`).
- `<img src={url}>` (missing self-close — JSX parse error).
- `<button onClick={handleClick()}>` (calls the function on every render — should be `onClick={handleClick}` or `onClick={() => handleClick(arg)}`).
- `<ul>{rows.map((row, i) => <li key={i}>...</li>)}</ul>` (array index as key — the canonical wrong key, swap to `key={row.id}`).

The student leaves a comment per issue with the senior fix.

A `ReactCoding` block has the student build a small "list of users" component from scratch. Requirements: takes a `users` prop typed as `Array<{ id: string; name: string; isAdmin: boolean }>`, renders each user as an `<li>` with the name, badge "Admin" next to admin users only (via `&&`), and an empty state when the array is empty. The grader checks: keyed by `user.id` (not index), the conditional uses proper boolean coercion or a ternary, the empty state renders explicitly (not via an empty `<ul>`).

A `PredictOutput` exercise on three JSX snippets:
1. `<p>{0 && 'no items'}</p>` — predicts `<p>0</p>` (the `0` trap).
2. `<p>{[1, 2, 3]}</p>` — predicts `<p>123</p>` (arrays render concatenated; React would warn about missing keys in dev but render).
3. `<button onClick={handleClick()}>` rendered ten times — predicts `handleClick` was called ten times on render (not on click); fix is `onClick={handleClick}`.

The recognition of the canonical traps is concrete.

Close with a `TrueFalse` round of five statements: "JSX is interpreted at runtime by the browser" (false — compiled by the JSX transform), "`<div />` and `<div></div>` are equivalent in JSX" (true — both render an empty div), "Keys must be globally unique across the entire app" (false — unique among siblings is enough), "JSX expressions in `{}` can contain `if` statements" (false — expressions only; use ternaries or `&&`), "The `style` prop accepts a CSS string like in HTML" (false — object with camelCase keys). The vocabulary is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for every later JSX-writing lesson in Unit 4, Chapter 4.7 (the render model and reconciliation, where keys cash in), and Chapter 4.6 (components and composition).

---

## Lesson 4.1.2 — The Next.js root layout: html, head, body, meta

Topics to cover:

- The senior question: the student writes a component that returns `<h1>Welcome</h1>` and the browser renders a full page — `<html>`, `<head>` with `<title>` and `<meta charset>`, `<body>`, the React tree mounted inside, the bundle scripts at the bottom. Who wrote the `<html>`? Who wrote the `<head>`? In a 2026 Next.js App Router project, the answer is `app/layout.tsx` — the root layout — and the metadata API. The lesson installs the document-structure model the student will read and modify for every project (the root layout, the `<html lang>`, the `<meta charset>` and `<meta viewport>` defaults, the metadata API for `<title>` and `<meta>` tags, the `<body>` as the container the React tree lives in) and names the senior watch-outs (hydration mismatches from server-vs-client rendering, third-party `<script>` injection, the `'use client'` boundary that doesn't belong here).
- **The HTML document structure in one paragraph.** Every HTML page has the same outer shape:
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Page Title</title>
      <!-- other head metadata -->
    </head>
    <body>
      <!-- the visible content -->
    </body>
  </html>
  ```
  Each element earns its place:
  - **`<!DOCTYPE html>`** — the standards-mode declaration. Without it, the browser falls into quirks mode (a 1990s compatibility mode with broken CSS rules). The student never writes this directly in 2026 — Next.js emits it.
  - **`<html lang="en">`** — the root element, with the `lang` attribute naming the document's language. Screen readers use `lang` to pick the right voice; search engines use it for locale targeting. The 2026 senior reach: always set `lang`; for internationalized apps (Chapter 18.2), set it dynamically per locale.
  - **`<head>`** — metadata not rendered as page content. Holds `<meta>`, `<title>`, `<link>` (stylesheets, icons, preconnects), `<script>` (rare in modern apps — Next.js bundles its own).
  - **`<body>`** — the visible page content. The React tree mounts inside here.
- **The Next.js App Router root layout.** The course's stack is Next.js 16 with the App Router. The file `app/layout.tsx` defines the root layout — the outermost shell every page renders inside. The shape:
  ```tsx
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  ```
  The senior anchors:
  - **The root layout is a Server Component by default** (Chapter 5.2.1 owns Server Components in depth; this lesson names the boundary). Server Components don't have `'use client'` at the top, can't use `useState` or `useEffect`, and render on the server to HTML.
  - **The root layout owns the `<html>` and `<body>` tags** — and only the root layout. Nested layouts (Chapter 5.1.4) return JSX that goes inside `<body>`, never `<html>` or `<head>` themselves.
  - **The `children` prop** is where Next.js injects the page (or a nested layout, which in turn renders the page). The student doesn't import `children` — Next.js provides it via the framework convention.
  - **The `lang` attribute** belongs here. For internationalized apps, the layout reads the locale from the URL or session and renders `<html lang={locale}>` dynamically.
- **Metadata: the `<head>` content, declaratively.** In raw HTML, the developer hand-writes `<title>` and every `<meta>` tag inside `<head>`. In Next.js the senior reach is the metadata API — the developer exports a `metadata` object (or a `generateMetadata` async function for dynamic per-route metadata) and Next.js renders the `<head>` content from it. The shape in the root layout:
  ```tsx
  import type { Metadata } from 'next';
  export const metadata: Metadata = {
    title: 'Invoicely',
    description: 'Invoice management for small teams',
    icons: { icon: '/favicon.ico' },
  };
  ```
  The metadata API generates `<title>`, `<meta name="description">`, `<link rel="icon">`, Open Graph tags, Twitter tags, and more. Chapter 5.6.9 owns the full metadata surface; this lesson installs the model: the developer exports an object, Next.js renders the `<head>`.
- **The `<meta charset>` and `<meta viewport>` defaults.** Next.js renders both automatically:
  - **`<meta charset="utf-8" />`** — the character encoding the document uses. UTF-8 is the universal 2026 default; the browser falls back to legacy encodings if missing, which sometimes garbles non-ASCII content. The student does not need to add this manually — Next.js emits it.
  - **`<meta name="viewport" content="width=device-width, initial-scale=1" />`** — the mobile-rendering hint. Without it, mobile browsers render the page at the desktop width and scale down, breaking responsive design. The 2026 reality: Next.js renders this by default. Chapter 4.5.6 (responsive design) cashes in.
  - The `generateViewport` API (Chapter 5.6.10) is the senior reach when the viewport configuration needs to vary per route — rare; the default suffices for most SaaS.
- **The `<body>` and the React tree.** The root layout's `<body>` is the container. Inside, three patterns:
  - **The `children` slot** is where Next.js injects the rendered page tree.
  - **Global providers** that wrap `{children}` — the theme provider (`next-themes` from Chapter 4.2.6), the query client (TanStack Query from Chapter 16.1 conditional), the i18n provider (`next-intl` from Chapter 18.2). These wrap `{children}` once at the root and pass context to every descendant.
  - **Persistent UI** — a navbar, a toaster portal target (`<div id="toast-root" />`), a global error boundary. The 2026 senior reach: keep the root layout lean; push feature-specific UI into nested layouts (Chapter 5.1.4) where it scopes naturally.
- **The `font` and `style` integrations:**
  - **`next/font`** — the 2026 reach for loading fonts. Imported at the root layout, applied to `<body>` via a `className`:
    ```tsx
    import { Inter } from 'next/font/google';
    const inter = Inter({ subsets: ['latin'] });
    export default function RootLayout({ children }: { ... }) {
      return (
        <html lang="en" className={inter.className}>
          <body>{children}</body>
        </html>
      );
    }
    ```
    The font is self-hosted by Next.js (no external request to Google), subsetted, preloaded, and inlined as a CSS variable. Chapter 5.6.7 owns the depth; this lesson installs the call-site shape.
  - **Global styles** — the root layout imports `globals.css` (the Tailwind v4 entry point). Chapter 4.2 owns the Tailwind treatment; the root layout is where the import lives.
- **The `'use client'` boundary doesn't belong on the root layout.** The root layout is a Server Component, and it should stay one. If the root layout becomes a Client Component (via `'use client'`), the entire app tree becomes a client subgraph — every Server Component below it is dragged along, defeating the rendering model. The senior reach for client-side concerns (theme provider, query client, locale provider): wrap them in a small `<Providers>` Client Component imported from a separate file, and render it as a child of the root layout's `<body>`. The root layout itself stays server.
- **What does NOT belong in the root layout:**
  - **Per-page metadata.** The root layout's metadata is the default; pages override per-route via their own `metadata` export.
  - **Per-page UI.** A navbar that should appear on every page goes in the root layout; a navbar specific to the dashboard goes in a nested layout.
  - **Heavy data fetching.** The root layout runs on every navigation; expensive queries here slow every page. The senior reach: keep data fetching close to the page that needs it.
  - **`<head>` content directly.** Don't write `<head>` JSX in the root layout — use the metadata API. The metadata API handles deduplication, ordering, and per-route overrides cleanly; direct `<head>` JSX bypasses all of that.
  - **Client-only logic.** Theme toggles, query providers, anything that uses hooks — push into a `<Providers>` Client Component child.
- **Hydration and the root layout.** Chapter 5.2.8 owns hydration in depth; the lesson installs the seam. The root layout renders on the server to HTML; the browser parses and paints; React hydrates by walking the same tree client-side and attaching event handlers. The senior watch-out for hydration mismatches: any per-request randomness or time-dependent content rendered in the root layout (a `Date.now()`, a `crypto.randomUUID()`, a server-side-only API call) produces a mismatch warning. The fix is to scope the dynamic content to a Client Component or use the `suppressHydrationWarning` prop on the specific element (rare; the `next-themes` integration in Chapter 4.2.6 uses it deliberately on `<html>` because the theme class is set by an inline script before React hydrates).
- **The `lang` attribute and i18n.** For monolingual SaaS, `<html lang="en">` is hardcoded in the root layout. For internationalized apps (Chapter 18.2), the locale is read from the URL or the user's profile, and the root layout (or an intermediate locale-layout) renders `<html lang={locale}>` dynamically. The student knows the seam exists; Chapter 18.2 wires the depth.
- **The watch-outs a senior names:**
  - **Don't put `'use client'` on the root layout.** It poisons the entire tree as a client subgraph.
  - **Don't write `<head>` JSX directly.** Use the metadata API. The exception is the `<link rel="preconnect">` and `<link rel="dns-prefetch">` performance hints that Next.js doesn't fully cover — the senior occasionally adds these via the `<head>` slot in Pages Router; in App Router, they go in the metadata `other` field or via the page's `<head>` via a hardcoded element only when the metadata API doesn't support them.
  - **Don't forget the `lang` attribute.** Missing `lang` is an accessibility regression; screen readers default to the user's system language, which may not match the page.
  - **Don't render dynamic per-request content in the root layout without the SSR-safety pattern.** A `Date.now()` interpolation in the root layout fires a hydration mismatch on every load. The senior reach: push the dynamic content into a Client Component (which renders only on the client) or wrap with `'use client'` at the Client Component level.
  - **Don't import server-only modules into the root layout if they shouldn't be in every page's request path.** The root layout runs on every navigation; importing a heavy server-only library makes the cost a per-navigation cost.
  - **The metadata API is the source of truth for the `<head>`.** Manually writing `<head>` tags duplicates what the metadata API would generate and risks ordering/deduplication issues. The senior default: every `<head>` concern goes through `metadata` or `generateMetadata`.
  - **The `<title>` is the metadata API's `title` field.** Setting `<title>` directly in the JSX (which would render inside `<body>` and be illegal HTML the browser silently moves to `<head>`) is the canonical newbie reach — the metadata API is the senior path.
  - **The `<html>` and `<body>` tags are only in the root layout.** Nested layouts (Chapter 5.1.4) return JSX without them — they slot inside the root layout's `<body>`.
  - **`React.ReactNode` is the type for `children`.** TypeScript types `children` as `React.ReactNode` — the union of strings, numbers, JSX elements, arrays, `null`, `false`. The senior reach: type the layout's `children` explicitly with `{ children: React.ReactNode }`.

What this lesson does not cover:

- Semantic landmarks and heading hierarchy inside `<body>` (4.1.3).
- Per-page metadata, `generateMetadata`, OG/Twitter tags, dynamic OG images (Chapter 5.6.9).
- SEO file conventions — `robots.ts`, `sitemap.ts`, favicons (Chapter 5.6.10).
- `next/font` at depth (Chapter 5.6.7).
- The full Server / Client Component boundary treatment (Chapter 5.2).
- Hydration at depth and the full hydration-mismatch surface (Chapter 5.2.8).
- Nested layouts and the layout/page render boundary (Chapter 5.1.4).
- `next-themes` integration (Chapter 4.2.6).
- The `next-intl` integration (Chapter 18.2.5).

Pedagogical approach:

Mechanics-plus-pattern archetype with a strong setup beat. The lesson teaches the document structure (model) and the Next.js root layout file convention (the form the student writes). The deliverable is the layout-file reflex — when the student needs to set the `lang`, add a theme provider, change the favicon, set a default page title, or wrap the tree in a global provider, they reach for `app/layout.tsx` and the `metadata` export.

Open with the senior question — "your component returns `<h1>Welcome</h1>` and the browser renders a full page; who wrote the `<html>` and the `<head>` and the `<meta>` tags?" — and a `MultipleChoice` exercise pitting four options (the browser fills in defaults — wrong, the browser only renders what the document declares; Next.js inserts boilerplate based on hidden defaults — partially right but not the answer the lesson wants; the developer writes `app/layout.tsx` which Next.js renders as the page shell — right; React Server Components emit it implicitly — wrong, the layout file is where it lives). The discrimination installs the layout-file model.

A `Figure` with a hand-authored SVG renders the document structure as a tree: `<html>` at the top with `lang="en"` annotation, `<head>` child with `<meta charset>`, `<meta viewport>`, `<title>`, `<meta name="description">`, `<link rel="icon">`, and `<body>` child with the React tree mounting point. Each node has a callout: which ones Next.js renders automatically, which ones the metadata API renders from the developer's export, and which one (`<body>`) contains the `children` slot. The structure is one picture.

An `AnnotatedCode` block walks the minimal root layout file — eight lines of `app/layout.tsx` with the `RootLayout` component, the `metadata` export, the `<html lang="en">`, the `<body>{children}</body>`. Annotations call out: the Server Component default (no `'use client'`), the typed `children: React.ReactNode`, the `lang` attribute, the `metadata` object, the `Inter` font import and the `className` on `<html>`. The student sees the senior shape as one piece.

A `FileTree` widget shows the `app/` directory with `layout.tsx`, `page.tsx`, `globals.css`, and a nested `dashboard/layout.tsx` / `dashboard/page.tsx` to foreshadow Chapter 5.1.4. Annotations point to which files own which parts of the document.

A `Buckets` exercise sorts ten concerns into "lives in the root layout" vs. "lives in a page" vs. "lives in `generateMetadata`" vs. "lives nowhere — Next.js handles it" — the `<html lang>` (root layout), the `<title>` for the dashboard page (per-page metadata via `generateMetadata`), `<meta charset>` (Next.js handles), the global font (`next/font` in the root layout), the navbar (root layout for global, nested layout for scoped), `<meta viewport>` (Next.js handles), a per-page OG image (generateMetadata), the theme provider (a `<Providers>` Client Component inside the root layout's `<body>`), `<!DOCTYPE html>` (Next.js handles), per-page favicon (rare — usually root layout). The discrimination locks in.

A `ReactCoding` block has the student write a complete `app/layout.tsx` for a hypothetical SaaS: `<html lang="en">`, `next/font` Inter applied to `<body>`, a `metadata` export with `title` and `description`, a `<Providers>` Client Component wrapping `{children}` (the student imports `<Providers>` from `./providers.tsx`, doesn't implement it). The grader checks: no `'use client'` at the top, the typed `children`, the `lang` attribute, the metadata shape.

A `CodeReview` exercise on a 25-line root layout with five issues:
- `'use client'` at the top of `layout.tsx` (poisons the tree — should be removed; client concerns go in a `<Providers>` child).
- `<html>` without `lang` (a11y regression — should be `<html lang="en">`).
- A `<title>` JSX element inside `<body>` (illegal HTML; should use the metadata API).
- A `Date.now()` interpolation in `<body>` outside any `'use client'` boundary (hydration mismatch — should be a Client Component or removed).
- Manually-written `<meta charset>` and `<meta viewport>` (redundant — Next.js emits both).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on two scenarios:
1. A root layout that adds `'use client'` at the top — predict the consequence (every Server Component in the app becomes a Client Component descendant; bundle size balloons; data fetching that relied on server-only modules breaks).
2. A root layout that interpolates `{new Date().toISOString()}` in the `<body>` — predict the hydration warning (server-rendered timestamp differs from client-rendered timestamp; the warning names the mismatch).

The recognition of the boundary failures is concrete.

Close with a `TrueFalse` round of five statements: "The root layout owns the `<html>` and `<body>` tags" (true), "`<meta charset>` must be hand-written in the root layout" (false — Next.js emits it), "The root layout should be a Client Component to support theme toggling" (false — wrap a Providers Client Component inside the root layout's `<body>` instead), "The metadata API replaces hand-written `<head>` JSX" (true), "`<html lang="en">` is optional in 2026 since browsers default to English" (false — required for accessibility and i18n). The vocabulary is locked in.

Estimated student time: 35 to 45 minutes. Load-bearing for Chapter 4.2.6 (`next-themes` integration at the root layout), Chapter 5.1.4 (nested layouts), Chapter 5.6.7 (`next/font`), Chapter 5.6.9 (metadata API), and Chapter 18.2 (i18n at the layout level).

---

## Lesson 4.1.3 — Semantic landmarks and the heading hierarchy

Topics to cover:

- The senior question: the student writes a dashboard with a top nav, a sidebar, a main content area, and a footer. The naive reach is four `<div>`s with class names. The senior reach is `<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>` — the semantic landmark elements. The difference matters: screen readers expose landmarks as a navigable map (the user presses `D` to jump between landmarks in JAWS, or uses the rotor in VoiceOver), search engine crawlers use them to identify the page's main content, browsers' reader-mode features parse them to extract the article body, and the page becomes legible without CSS. The lesson installs the six landmark elements and the heading hierarchy (h1 through h6) as one structural surface — the page's outline that assistive technology and crawlers read.
- **The six landmark elements**, walked one at a time:
  - **`<header>`** — introductory content for the page or a section. The page-level header contains the site logo, primary navigation, and account menu. A section-level header (inside an `<article>` or `<section>`) contains the section's title and metadata. The senior reach: one page-level `<header>` per page; nested `<header>`s allowed inside `<article>`/`<section>` for their introductory content.
  - **`<nav>`** — primary navigation. The page-level `<nav>` holds the main site nav (the top bar, the sidebar). The senior reach: one `<nav>` for the primary navigation; secondary navs (a sidebar of section links, a footer's sitemap) can also be `<nav>` with an `aria-label` to distinguish them ("Primary navigation," "Footer navigation"). Don't put every list of links inside `<nav>` — `<nav>` is for *navigation*; a list of related blog posts at the end of an article is just a `<ul>`.
  - **`<main>`** — the unique main content of the page. Exactly one `<main>` per page (the spec allows multiple but most accessibility tools assume one). The `<main>` should not contain the header, the nav, the sidebar, or the footer — only the page-specific content. Screen readers offer a "skip to main content" shortcut that lands on the `<main>` element; missing the landmark breaks that affordance.
  - **`<aside>`** — content tangentially related to the surrounding content. The canonical SaaS sites: a sidebar of related links next to an article, a tip callout next to documentation, a contextual help panel. The senior watch-out: `<aside>` is not "the sidebar of the app" — that's `<nav>` if it holds navigation. `<aside>` is for *tangentially related* content, not for layout convenience.
  - **`<article>`** — a self-contained piece of content that could stand alone (a blog post, a comment, a forum reply, a product card). The test: could you cut this content out and paste it elsewhere (an email, a feed reader, a CMS) and still have it make sense? If yes, `<article>`. If no, `<section>`.
  - **`<section>`** — a generic grouping of related content that doesn't fit one of the more specific landmarks. The senior reach: `<section>` with an `aria-labelledby` pointing at a heading inside it, giving the section an accessible name. The watch-out: don't wrap everything in `<section>` for visual grouping — that's what `<div>` is for. `<section>` is for content that's *thematically related*, with a heading.
  - **`<footer>`** — closing content for the page or a section. The page-level footer holds the copyright, contact links, and secondary nav. A section-level footer (inside an `<article>`) holds the author, the publish date, the tags. The senior reach: one page-level `<footer>` per page.
- **The page outline.** Together the landmark elements form the page's *outline* — the structural map a screen reader user navigates through. The canonical SaaS app shell:
  ```tsx
  <body>
    <header>
      <a href="/">Site name</a>
      <nav aria-label="Primary">...</nav>
    </header>
    <main>
      <h1>Page title</h1>
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading">Overview</h2>
        ...
      </section>
      <section aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        ...
      </section>
    </main>
    <footer>
      <nav aria-label="Footer">...</nav>
      <p>&copy; 2026 Acme Inc.</p>
    </footer>
  </body>
  ```
  The student reads this and sees five landmark regions (`header`, `nav` inside header, `main`, two `section`s, `footer`, `nav` inside footer) — a screen reader user navigates the page by jumping between them.
- **The heading hierarchy (`<h1>` through `<h6>`):**
  - **`<h1>`** — the page's primary heading. Exactly one per page (the modern reach; older specs allowed multiple in `<section>`s, but most accessibility tools expect one). The `<h1>` text is the most prominent statement of "what this page is about."
  - **`<h2>` through `<h6>`** — subsection headings, in strictly decreasing significance. A `<section>` typically opens with an `<h2>` (or whatever level is appropriate given the surrounding context); subsections within it use `<h3>`; and so on. Skipping levels (an `<h1>` followed directly by an `<h4>`) is an accessibility violation — screen readers expose headings as a navigable outline, and skipped levels break the hierarchy.
  - **The senior reach.** The heading level is determined by the *content's outline position*, not by its visual size. A subsection's heading is `<h2>` because it's a subsection, not because it should be 24px. Visual styling (size, weight, color) is independent — Tailwind utilities on the `<h2>` element set the visual treatment.
  - **The bug.** A team that styles a `<div className="text-2xl font-bold">` because they want the size without realizing they need the semantic level produces a page with no `<h1>`, no `<h2>`, no navigable outline. Screen reader users have no way to scan the page structure. The fix is always: use the right heading element; style with utilities.
  - **The recognition tool.** The "Headings" panel in screen-reader testing tools (NVDA's heading list, the Chrome Accessibility extension's outline view) shows the heading structure as the user sees it. A page with a clean heading hierarchy looks like an outline; a page with mis-used heading levels looks like noise.
- **The `<p>` element.** The paragraph. The default block-level text container. The senior reach: text content goes in `<p>` (not `<div>`, not raw text in `<main>`). The styling is independent — `<p className="text-sm text-gray-600">` is the senior shape. Multiple paragraphs of body text use multiple `<p>` elements; line breaks within a paragraph use `<br />` only for hard line breaks where they're semantically meaningful (an address, a poem); for visual spacing, use CSS.
- **The `<ul>`, `<ol>`, `<li>` list elements:**
  - **`<ul>`** — unordered list. The items have no inherent sequence; the order is incidental.
  - **`<ol>`** — ordered list. The items have an inherent sequence (steps in a procedure, ranked results, numbered references). The `start` attribute sets the starting number; the `reversed` attribute counts down.
  - **`<li>`** — list item. Always the direct child of `<ul>` or `<ol>` (never floating alone).
  - **The senior reach.** Any sequence of related items is a list — a nav's links (inside `<nav>`, wrapped in `<ul>`), a list of features on a landing page, a sequence of comments on an invoice. The visual treatment (bullets, numbers, or none) is independent — Tailwind's `list-none` removes the markers when the visual design doesn't want them; the semantic list is still announced to screen readers.
  - **The watch-out.** A nav-as-flex-of-`<a>`s without the `<ul>`/`<li>` wrap reads to a screen reader as a series of links, not a list of N navigation items. The senior reach: `<nav><ul><li><a>Home</a></li>...</ul></nav>` is the canonical shape; the `list-none` utility on the `<ul>` strips the bullets visually.
- **The `<div>` and `<span>` fallbacks:**
  - **`<div>`** — the generic block-level container. Use when no semantic element fits and the content needs a layout grouping. The senior reflex: reach for a semantic element first; reach for `<div>` when none applies.
  - **`<span>`** — the generic inline container. Use for inline styling or scripting hooks (`<span className="text-blue-600">link-like text</span>`).
  - **The watch-out.** Excessive `<div>` nesting ("div soup") is a code smell. If the team's components produce ten nested `<div>`s for a layout, the structural elements have been replaced with generic containers and the page becomes opaque to assistive tech. The senior reach: every level of nesting is a decision; the right element communicates intent.
- **The `<br />` and `<hr />` elements:**
  - **`<br />`** — hard line break. Reserved for content where the line break is semantically meaningful (addresses, poems, certain code formatting). Not for visual spacing — that's CSS.
  - **`<hr />`** — thematic break between content (a horizontal rule in the rendered output). The semantic meaning is "a topic shift"; visually it renders as a horizontal line. The senior reach: rare in modern SaaS UI; the visual divider is usually a Tailwind border utility on the next section.
- **The accessibility tree.** Chapter 4.11 owns the accessibility baseline in depth; this lesson installs the recognition signal. Every browser exposes a parallel tree to the DOM — the accessibility tree — that screen readers consume. The tree is similar to the DOM but with computed roles, names, and states. The Chrome DevTools "Accessibility" panel (Elements panel → Accessibility tab) shows the tree for the selected element. The senior reach: when verifying that a `<button>` is announced correctly or that a `<section>` has the right accessible name, open the Accessibility panel and read what's there. The DOM might say `<button>Save</button>`; the accessibility tree confirms `button "Save"` with the expected role and name.
- **`aria-labelledby` and `aria-label` for landmark naming:**
  - **`aria-labelledby="id"`** — the landmark's accessible name comes from the referenced element's text content. The canonical site: `<section aria-labelledby="overview-heading"><h2 id="overview-heading">Overview</h2>...</section>` — the section is announced as "Overview" by the screen reader.
  - **`aria-label="text"`** — the landmark's accessible name is the literal text. The canonical site: `<nav aria-label="Primary">` and `<nav aria-label="Footer">` distinguish the two `<nav>` regions for screen reader users.
  - **The senior reach.** Use `aria-labelledby` when a visible heading exists (don't duplicate the text). Use `aria-label` when there's no visible heading or when the visible label is ambiguous. Multiple landmarks of the same type (two `<nav>` regions, multiple `<section>`s) should each have a distinguishing name.
- **The watch-outs a senior names:**
  - **Don't replace semantic elements with `<div>`s for styling convenience.** Tailwind utilities apply to any element; the element choice is independent of the visual design.
  - **Exactly one `<h1>` per page.** The page-level heading. Multiple `<h1>`s break the outline; missing `<h1>` breaks the page-name announcement.
  - **Don't skip heading levels.** `<h1>` → `<h3>` directly is an accessibility violation. The fix is to insert the `<h2>` or downgrade the `<h3>` to an `<h2>` if the content is at the next level.
  - **`<main>` once per page, no nesting of landmarks of the same type at the same level.** A page with two `<main>`s confuses assistive tech.
  - **`<section>` needs a heading to be useful.** A `<section>` with no `<h2>` (or appropriate-level heading) inside is a section in name only — screen readers can't announce what the section is about. Add a heading or downgrade to `<div>`.
  - **Multiple `<nav>` regions need `aria-label` to distinguish them.** The screen reader reads "navigation, navigation, navigation"; the label disambiguates.
  - **`<article>` is for self-contained content.** A dashboard card is not an `<article>` (it's not independently meaningful outside the dashboard); a blog post is.
  - **Landmarks don't replace headings.** A `<section>` without an `<h2>` is still a landmark, but the screen reader can't announce its contents semantically. The two systems (landmarks for regions, headings for hierarchy) cooperate.
  - **The "Skip to main content" link is a senior-level accessibility affordance.** A keyboard-only user pressing `Tab` from the address bar should hit a "Skip to main content" link before they have to tab through the header and nav. The link points to `#main` (or whatever ID the `<main>` has) and is visually hidden until focused. Chapter 4.11.4 owns the focus management; this lesson plants the seed.

What this lesson does not cover:

- The full accessibility baseline (Chapter 4.11) — keyboard navigation, focus management, contrast, reduced motion.
- ARIA roles, states, properties (4.1.6 covers the basics; Chapter 4.11.3 the depth).
- Button and link elements (4.1.4).
- Form elements (4.1.5).
- Tables (4.1.6 covers tables alongside data attributes).
- The Open Graph / Twitter metadata for sharing (Chapter 5.6.9).
- The `<dialog>` element for modals — out of scope here; modals via Radix in Chapter 4.6.5.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson teaches a structural model (the page outline through landmark elements and the heading hierarchy) and a small element vocabulary (the six landmarks, the six heading levels, the list elements, the paragraph). The deliverable is the semantic-element reflex — when the student writes a header, nav, content area, or footer, they reach for the landmark element first; when they write a heading, they pick the level by outline position, not by visual size.

Open with the senior question — "you're building a dashboard with a top nav, a main area, and a footer; what elements does the JSX use?" — and a `MultipleChoice` exercise pitting four shells (`<div>`s with class names — wrong, opaque to assistive tech; `<header><main><footer>` — right; React components with no semantic elements at the leaves — wrong, the components must still emit landmarks; `<section>` for every region — wrong, `<section>` is for thematically related content with a heading). The discrimination installs the landmark reach.

A `Figure` with a hand-authored SVG renders the canonical page outline: `<body>` at the top, with `<header>` (containing `<nav aria-label="Primary">`), `<main>` (containing one `<h1>` and two `<section>`s each with an `<h2>`), and `<footer>` (containing `<nav aria-label="Footer">` and a `<p>` with copyright). Each landmark is color-coded; the heading hierarchy is shown as an indented outline beside the tree. The structure is one picture.

A second `Figure` shows the same page in two views: the rendered visual layout on the left, the "page outline" as a screen reader would announce it on the right (a flat list of landmarks and headings). The student sees the parallel — the visual layout and the structural outline are two readings of the same JSX.

A `TabbedContent` block organizes the six landmark elements into tabs. Each tab has the element's semantic meaning, the canonical SaaS site, an example JSX snippet, and the senior watch-out (e.g., `<main>` tab: "one per page, no nesting, no header/nav/footer inside").

A `Buckets` exercise sorts twelve content scenarios into the right element — the site logo and primary nav (`<header>` with a `<nav>` inside), the page's main content (`<main>`), a sidebar of related articles (`<aside>`), a blog post that could stand alone (`<article>`), the page's copyright and footer nav (`<footer>`), a section of dashboard metrics with a heading (`<section>` with `<h2>`), the page's primary heading (`<h1>`), a subsection heading (`<h2>`), a sub-subsection heading (`<h3>`), a list of features on a marketing page (`<ul>` with `<li>`s), a step-by-step setup procedure (`<ol>` with `<li>`s), a single paragraph of body copy (`<p>`). The element vocabulary is locked in.

A second `Buckets` exercise sorts eight uses of headings into "right level" vs. "wrong level" — `<h1>` for the page title (right), `<h1>` for a section inside the page (wrong — should be `<h2>` or deeper), `<h2>` for a subsection within a section (right), skipping from `<h1>` to `<h3>` because `<h2>` looks too big (wrong — fix with CSS, not by skipping levels), using `<div className="text-2xl font-bold">` instead of `<h2>` (wrong — semantic level matters), `<h6>` for a deeply nested subsection (right if the outline depth warrants it), `<h2>` used twice for two parallel sections (right — siblings at the same level), `<h3>` used directly after the page's `<h1>` (wrong — skip).

An `AnnotatedCode` block walks a 25-line dashboard layout JSX with the full landmark and heading structure — `<header>`, `<nav aria-label="Primary">`, `<main>` with `<h1>`, two `<section>`s each `aria-labelledby`'d to their `<h2>`, `<footer>` with `<nav aria-label="Footer">`. Annotations call out each landmark, the heading hierarchy, the `aria-label`s distinguishing the two navs, the `aria-labelledby` on the sections.

A `ReactCoding` block has the student build a basic page layout from scratch: a header with a logo and a primary nav (one `<ul>` of three links), a main area with an `<h1>` and two `<section>`s each with an `<h2>` and a paragraph, a footer with a copyright and a secondary nav. The grader checks: landmark elements present, exactly one `<h1>`, two `<h2>`s inside the sections, both `<nav>` regions have `aria-label`s, the nav lists are wrapped in `<ul>`/`<li>`.

A `CodeReview` exercise on a 30-line page layout with six issues:
- Two `<h1>`s on the page (should be one — fix the second to `<h2>`).
- Heading levels skipped (`<h1>` then `<h3>` — should be `<h2>`).
- Nav rendered as a flex of `<a>`s without the `<ul>`/`<li>` wrap (semantic regression — should wrap in `<nav><ul><li>...`).
- `<aside>` used for the app's main sidebar nav (wrong — should be `<nav>` with `aria-label="Sidebar"`).
- `<main>` containing the page's `<header>` (wrong — `<header>` belongs as a sibling of `<main>`, not a descendant).
- A `<section>` with no heading inside (semantic regression — add the `<h2>` or downgrade to `<div>`).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise: given a page with five landmark regions (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) and a screen reader's "list all landmarks" command, predict the readout. The student writes the expected output (e.g., "banner, navigation 'Primary', main, complementary, contentinfo"). The recognition of role names is concrete.

Close with a `TrueFalse` round of five statements: "A page should have exactly one `<h1>`" (true — the modern convention), "Skipping from `<h1>` to `<h3>` is fine if the design wants smaller text" (false — break the hierarchy; fix with CSS), "`<section>` without a heading inside still functions as a useful landmark" (false — needs a heading to be meaningfully labeled), "The visual size of a heading should determine which level it uses" (false — the outline position determines the level; CSS controls the size), "Multiple `<nav>` regions on a page need `aria-label`s to be distinguishable" (true). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.11.2 (accessibility baseline), Chapter 4.11.3 (ARIA roles), Chapter 4.11.4 (focus management and the "skip to main" link), and the marketing-page project (Chapter 4.12).

---

## Lesson 4.1.4 — Buttons, links, and lists

Topics to cover:

- The senior question: the student needs three things on a page — a "Save" action that submits a form, a navigation hop to `/dashboard`, and a list of features. The naive reaches are `<div onClick>`, `<button>` for nav, and a stack of `<div>`s for the list. The senior reaches are `<button>`, `<a href>`, and `<ul>` / `<ol>`. Each choice is a decision the keyboard, the screen reader, the browser's autofill, the right-click "Open in new tab," `Cmd+F`, and the accessibility tree all read. The lesson installs the three element families and the senior reflexes (`<button type>` defaults, `<a target rel>` security, `<ul>` vs. `<ol>` vs. a flex of items).
- **Buttons in one paragraph.** A `<button>` is a control that performs an *action* — submits a form, opens a dialog, deletes a row, toggles state. A button does *not* navigate to a URL (that's a link). The browser handles keyboard activation for free: `Tab` focuses the button, `Enter` or `Space` activates it, focus rings render automatically. Screen readers announce "button, {label}." The CSS reset (Chapter 4.3.3, Tailwind Preflight) strips the default browser styling; Tailwind utilities or the shadcn `<Button>` component (Chapter 4.11.1) paint the visual treatment.
- **`<button type>` and the form-submit default — the load-bearing senior reflex:**
  - **The default.** A `<button>` inside a `<form>` defaults to `type="submit"`. Press the button, the form submits. This is the bug class that ships in junior code: a "Cancel" button inside a sign-up form, no `type` attribute, the user clicks it, the form submits with whatever it had.
  - **The three types.** `type="submit"` (the default — submits the surrounding form), `type="button"` (an inert button that does nothing on its own; runs whatever `onClick` handler is attached), `type="reset"` (resets the form's fields to their defaults — rare in modern SaaS UI, usually a UX anti-pattern).
  - **The senior reflex.** Every `<button>` declares its `type` explicitly. The course writes `<button type="button">` for any button that's not the form's primary submit and `<button type="submit">` for the submit. Never `<button>` with no `type` — the default is too easy to forget about.
  - **The recognition signal.** A "Cancel" or "Close" button inside a form that triggers an unintended submit is the canonical bug; checking `<button type>` is the first reach.
- **`<button>` vs. `<a>` vs. `<div role="button">` — the decision:**
  - **`<button>`** when the activation runs an *action* on the same page (a form submit, a modal open, a row delete, a sort toggle).
  - **`<a href>`** when the activation *navigates* to a URL (a page link, an external link, a download). The link is also activated by `Cmd+click` (open in new tab), right-click (copy address), `Tab+Enter`, and screen readers announce it as a link.
  - **`<div role="button">`** — the explicit anti-pattern. Forces the student to reimplement keyboard activation (`onKeyDown` for `Enter` and `Space`), focus management (`tabIndex={0}`), the focus ring (CSS), the ARIA state (`aria-pressed` for toggles), and the cursor styling. The senior reach: never. The exception is when a wrapped library demands it; even then, `<button>` styled to not look like a button is the right move.
- **`<a href>` — the link element:**
  - **`href`** — the destination URL. Required for the link to be activatable. An `<a>` without `href` is an inert element (no focus by `Tab`, no activation by `Enter`, no `:hover` styling unless explicitly added — modern browsers don't even render it as link-styled).
  - **`<a target="_blank">`** — opens the link in a new tab. The senior watch-out: every `target="_blank"` link needs `rel="noopener noreferrer"` for security and privacy. Without `rel="noopener"`, the new tab gets a `window.opener` reference back to the source page, which can be abused (tabnabbing — the new tab can redirect the source tab to a phishing site). Without `rel="noreferrer"`, the destination receives the `Referer` header pointing at your URL. The 2026 reality: modern browsers default to `noopener` for `target="_blank"` automatically, but the explicit `rel` is still senior practice — the auditor doesn't have to trust the browser default.
  - **`<a download>`** — when the link points to a file (a CSV, a PDF, an image), the `download` attribute hints that the browser should download rather than navigate. Optional value renames the file: `<a href="/export.csv" download="invoices-2026.csv">Download</a>`.
  - **`<a rel>`** — the link-relationship attribute. Common values: `noopener noreferrer` for `target="_blank"`, `nofollow` to tell search engines not to follow (for user-generated links), `external` for external links (mostly stylistic). The senior reach: `noopener noreferrer` is the universal default for `target="_blank"`; everything else is conditional.
- **Next.js `<Link>` and the navigation model.** Chapter 5.1.9 owns the depth; this lesson installs the seam:
  - **The Next.js `<Link>` component** wraps `<a>` and adds client-side navigation. The student writes `<Link href="/dashboard">Dashboard</Link>` — Next.js renders it as `<a href="/dashboard">` in the HTML (for SEO, for `Cmd+click`, for `JS-off` fallback) and intercepts the click to do a soft navigation (no full page reload) when JavaScript is available.
  - **The senior reach.** Internal links (to pages within the app) use `<Link>`. External links (to other sites) use plain `<a target="_blank" rel="noopener noreferrer">`. The `<Link>` import is `import Link from 'next/link'`.
- **Tailwind buttons and links: styling, not semantics.** The 2026 reach for visual treatment is Tailwind utilities (Chapter 4.2) or the shadcn `<Button>` (Chapter 4.11.1) — both compose into the same `<button>` or `<a>` element. The senior reflex: pick the right semantic element first, paint with utilities second. A button that looks like a link is still a `<button>` (it triggers an action, not a navigation). A link that looks like a button is still an `<a>` (it navigates).
- **Lists in one paragraph.** A list is a sequence of related items. The three elements:
  - **`<ul>`** — unordered list. The items have no inherent sequence.
  - **`<ol>`** — ordered list. The items have an inherent sequence (steps, ranks, numbered references).
  - **`<li>`** — list item. Always a direct child of `<ul>` or `<ol>`.
  - The senior reach: any sequence of related items is a list. Navs, feature grids, comment threads, audit-log entries, recently-viewed items — all are lists. The visual treatment (bullets, numbers, none) is independent of the semantic structure.
- **Lists and the JSX surface:**
  - **`.map` over data and key per `<li>`:** `{items.map(item => <li key={item.id}>...</li>)}`. The list-rendering pattern from Lesson 4.1.1.
  - **Nesting lists** for hierarchical content: `<ul>` containing `<li>` containing nested `<ul>`. The senior reach: a tree-shaped UI (a file browser, a comment thread with replies) uses nested lists with the outer `<ul>` wrapping each top-level item.
  - **`<ol>` attributes.** `start` (the starting number), `reversed` (count down), `type` (`1`, `a`, `A`, `i`, `I` — usually leave to CSS). Rare; the defaults work for most SaaS UIs.
- **The `list-none` reset and the link-list pattern:**
  - **Tailwind's Preflight strips default list styling** (Chapter 4.3.3 cashes this in). A `<ul>` rendered by a Tailwind page has no bullets and no margin by default.
  - **The link-list pattern.** The canonical nav shape:
    ```tsx
    <nav aria-label="Primary">
      <ul className="flex gap-4">
        <li><Link href="/dashboard">Dashboard</Link></li>
        <li><Link href="/invoices">Invoices</Link></li>
        <li><Link href="/settings">Settings</Link></li>
      </ul>
    </nav>
    ```
    The `<ul>` provides the semantic list (screen readers announce "list, 3 items"); Tailwind's `flex` lays them out horizontally; no bullets render because of Preflight. The structure is preserved while the visual is custom.
- **Lists vs. a flex of divs — the decision.** When N items are visually arranged but logically *not* a list (a single hero card next to a CTA, a header with logo and a button, an arbitrary pair of unrelated widgets), `<div>` siblings are fine. When N items are *related and parallel* (nav links, feature cards, comment threads, audit entries), use `<ul>` / `<ol>`. The senior reflex: "could a screen reader user usefully know 'list of N items' here?" If yes, list.
- **Anchor-link best practice — `<a href="#section-id">`:**
  - **The pattern.** Linking to a section within the page. The `href` is `#` plus the target element's `id`. Native browser behavior: clicking the link scrolls the target into view and updates the URL hash.
  - **The senior reach.** A table of contents linking to sections within a long article. Skip-to-main-content links pointing at `<main id="main">`. Each `<a href="#...">` jumps to the matching `id`.
  - **The watch-out.** The target element must have a unique `id`. The browser doesn't smooth-scroll by default — for smooth scrolling, the senior reach is the CSS `scroll-behavior: smooth` rule (Tailwind utility `scroll-smooth` on the `<html>` or scroll container).
- **The `<button>` as a JSX form member:**
  - **The form's submit button.** Inside a `<form>`, the primary submit is `<button type="submit">Save</button>`. Pressing `Enter` while focused on any text input within the form also submits (browser default). The Chapter 7.3 native form pattern wires the Server Action to the submit.
  - **Other buttons inside the form.** A "Cancel" or "Reset" or "Toggle preview" button inside the form must be `type="button"` to avoid the surprise submit. The senior reflex: `type="button"` is always explicit; no naked `<button>`s in form territory.
- **Disabled state on buttons:**
  - **`disabled` as a boolean prop.** `<button type="submit" disabled={isSubmitting}>Save</button>`. The DOM property is set; the browser's default behavior makes the button non-activatable (clicks and `Enter`/`Space` do nothing).
  - **The visual treatment.** The browser dims the button by default; Tailwind utilities (or the shadcn `<Button>` component) provide a more refined disabled state with consistent styling.
  - **The accessibility consequence.** A `disabled` button is not announced as activatable; some screen readers skip it in tab order. The senior watch-out: never put critical actions behind a disabled button without surfacing why it's disabled (a tooltip, an inline message, an `aria-describedby` reference).
- **`aria-label` and icon-only buttons:**
  - **The pattern.** A button with only an icon (a trash can, a copy icon, an X for close) has no visible text content. Screen readers announce nothing useful — "button" with no name. The senior reach: `aria-label` provides the accessible name.
    ```tsx
    <button type="button" onClick={handleDelete} aria-label="Delete invoice">
      <TrashIcon />
    </button>
    ```
  - **The 2026 reach.** Icon-only buttons are common in toolbars and table rows. Every one needs `aria-label`. Chapter 4.11.3 owns the ARIA depth; this lesson installs the reflex.
- **The watch-outs a senior names:**
  - **Every `<button>` declares its `type`.** The default `type="submit"` inside a form is the canonical surprise-submit bug.
  - **`<a target="_blank">` always pairs with `rel="noopener noreferrer"`.** Browser defaults are improving, but the explicit `rel` is senior practice.
  - **Internal links use `<Link>` from `next/link`, external links use plain `<a>`.**
  - **Icon-only buttons need `aria-label`.** Otherwise screen readers announce them as "button" with no name.
  - **A disabled button is not a substitute for explaining why an action is unavailable.** Surface the reason (tooltip, inline help) when the disabled state matters.
  - **A link styled as a button is still a link** (it navigates); a button styled as a link is still a button (it acts). The semantic element matches the behavior, not the look.
  - **`<a>` without `href` is inert.** No focus, no activation. If the intent is "looks like a link but does an action," it's a button styled as a link, not a link without `href`.
  - **`<button onClick={() => router.push('/dashboard')}>` is wrong** — that's a navigation in button clothing. Use `<Link href="/dashboard">` (styled as a button if needed).
  - **A `<div role="button">` requires manual keyboard activation handlers, `tabIndex`, focus ring CSS, and `aria-pressed` if it's a toggle.** The senior reach is `<button>` styled differently.
  - **Lists inside `<nav>`** are the canonical shape for navigation; bare anchors without the list wrap lose the "list of N items" announcement.
  - **`<button>` types are case-sensitive in HTML but not in JSX.** JSX is JavaScript and accepts the string however written, but the senior reach is lowercase (`type="button"` not `type="Button"`).
  - **The `formAction`, `formMethod`, `formEncType`, `formNoValidate`, `formTarget` attributes on `<button>`** override the parent form's attributes for that specific submit button. Rare in modern SaaS code; named for recognition.

What this lesson does not cover:

- Forms in depth — `<form>` element, `<input>` types, `<label>`, the form contract (4.1.5).
- The Constraint Validation API and `setCustomValidity` (Chapter 7.3.7).
- The shadcn `<Button>` component and CVA variants (Chapter 4.11.1, Chapter 4.6.3).
- Focus management at depth (Chapter 4.11.4).
- The full ARIA treatment (Chapter 4.11.3).
- Tailwind utilities for buttons and links (Chapter 4.2).
- Next.js `<Link>` at depth — prefetching, the navigation model, scroll restoration (Chapter 5.1.9).
- The `<dialog>` element — out of scope; Radix/shadcn handle modals.

Pedagogical approach:

Mechanics-plus-decision archetype. The lesson teaches three element families (`<button>`, `<a>`, `<ul>`/`<ol>`/`<li>`) and the decisions that separate them (action vs. navigation, list vs. arbitrary group, semantic vs. styled). The deliverable is the element-choice reflex — when the student needs a clickable thing or a sequence, the corner of their mind walks the decision tree and lands on the right element.

Open with the senior question — "you need a Save action, a link to the dashboard, and a list of features; what elements?" — and a `MultipleChoice` exercise pitting four shells (everything `<div onClick>` — wrong, opaque to keyboard and screen reader; `<button>`, `<button>`, and a flex of divs — wrong, the link is a navigation and the features are a list; `<button type="submit">`, `<Link href>`, `<ul>` — right; `<a onclick>`, `<button>`, `<div>` siblings — wrong, mixed). The discrimination installs the trio.

A `Figure` with an interactive widget renders a decision tree: "does activation perform an action or navigate to a URL?" → action: `<button>`, navigate: `<a>`. From `<button>`: "is the button inside a form?" → submit: `type="submit"`, other: `type="button"`. From `<a>`: "internal or external?" → internal: `<Link>`, external: `<a target="_blank" rel="noopener noreferrer">`. The student clicks through the branches and watches the right element light up at the leaf. The model is one decision walk.

A `TabbedContent` block organizes the four canonical patterns into tabs: form-submit button (`<button type="submit">`), inert action button (`<button type="button">`), internal navigation link (`<Link href>` from `next/link`), external link (`<a target="_blank" rel="noopener noreferrer">`). Each tab has the JSX form, the keyboard behavior, the screen-reader announcement.

A `Buckets` exercise sorts twelve scenarios into the right element — Save action that submits a form (`<button type="submit">`), Cancel inside a sign-up form (`<button type="button">`), nav link to `/dashboard` (`<Link>`), external link to the docs site (`<a target="_blank" rel="noopener noreferrer">`), download link for an exported CSV (`<a href download>`), an icon-only delete button (`<button type="button" aria-label>`), a "click to expand" disclosure (`<button type="button">`), a "click for help" tooltip trigger (`<button type="button">`), an inline mailto link (`<a href="mailto:">`), a feature grid of three cards (`<ul>` with three `<li>`s), a hero image next to a CTA (just two `<div>`s — not a list), a numbered setup procedure (`<ol>` with `<li>`s). The discrimination locks in.

An `AnnotatedCode` block walks a 20-line component with the canonical patterns — a form with a submit button, a Cancel button explicitly typed, a `<Link>` for internal nav, an external link with `rel`, an icon-only button with `aria-label`, a list of features. Annotations call out every type/rel/aria-label.

A `ReactCoding` block has the student build a simple "invoice row" component: an invoice title with a link to the invoice page (`<Link>`), an icon-only delete button (`<button type="button" aria-label="Delete invoice"><TrashIcon /></button>`), and an action menu with a "View" link and a "Mark as paid" button. The grader checks: `<Link>` for the internal nav, `aria-label` on the icon button, `type="button"` on the non-submit, proper element semantics.

A `CodeReview` exercise on a 30-line component with six issues:
- `<a onClick={() => router.push('/dashboard')}>Dashboard</a>` (a JavaScript-driven nav in link clothing — should be `<Link href="/dashboard">`).
- `<button onClick={handleSubmit}>Save</button>` inside a `<form>` (no `type` — defaults to submit; if `handleSubmit` is also the form's action, fine, but ambiguous; senior writes `type="submit"`).
- `<button>Cancel</button>` inside a `<form>` (defaults to submit — accidental form submit on click; should be `type="button"`).
- `<a href="https://external.com" target="_blank">External</a>` (missing `rel="noopener noreferrer"`).
- `<button><TrashIcon /></button>` (icon-only, no `aria-label` — screen reader announces "button" with no name).
- A nav rendered as a flex of `<Link>`s with no `<ul>` / `<li>` wrap (semantic regression — should be `<nav><ul><li><Link>...`).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `<button onClick={handleCancel}>Cancel</button>` inside a `<form action={saveAction}>` — predict what happens on click (the form submits; `handleCancel` may run first, but the form's `action` also fires).
2. `<a target="_blank">External</a>` clicked by a user (link opens in a new tab; without `rel="noopener"`, the new tab can access `window.opener` and redirect the source page in older browsers).
3. `<button aria-label="Close"><XIcon /></button>` announced by a screen reader (the user hears "button, Close" instead of just "button").

The recognition of the behaviors is concrete.

Close with a `TrueFalse` round of five statements: "Every `<button>` should declare its `type` explicitly" (true), "`<a target='_blank'>` is safe to use without `rel='noopener noreferrer'` in 2026" (false — explicit is still senior), "A `<div role='button'>` is equivalent to a `<button>` element" (false — requires manual keyboard, focus, and state handling), "Internal navigation in Next.js uses plain `<a href>` for the same behavior as `<Link>`" (false — `<Link>` adds prefetching and soft navigation), "Icon-only buttons need `aria-label` to be accessible" (true). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.11 (a11y baseline), Chapter 5.1.9 (`<Link>` and navigation), Chapter 7.3 (forms wiring `<button type="submit">`), and Chapter 17.2.1 (security headers and link relationships).

---

## Lesson 4.1.5 — Forms: the element contract

Topics to cover:

- The senior question: the student needs a sign-up form — email, password, a confirmation checkbox, a submit button. The naive reach is `<input>` everywhere with `useState`-driven controlled components and a custom click-the-submit handler. The senior reach is a `<form>` with `<label>` + `<input>`s carrying `name` attributes, a `<button type="submit">`, and a server-side Zod validation step that reads from `FormData` — no client-state mirroring, no manual handler wiring. The lesson installs the HTML form element surface as a *contract*: the element tree the user fills in, the `name` attributes that key the `FormData` the server reads, the constraints (`required`, `type`, `pattern`, `minLength`) that the browser enforces before submit. Chapter 7.3 wires the Server Action; this lesson installs the elements and the contract.
- **The `<form>` element in one paragraph.** The container for a group of input controls submitted together. Three load-bearing attributes:
  - **`action`** — the URL or function the form submits to. In Chapter 7.3 the value is a Server Action function reference; in plain HTML it's a URL string. Default: the current URL.
  - **`method`** — `"get"` (the default — fields go in the URL as query string) or `"post"` (fields go in the request body). Default: `"get"`. For any form that mutates state, `method="post"`.
  - **`encType`** — the body encoding. Default `"application/x-www-form-urlencoded"`; `"multipart/form-data"` for forms with file uploads; `"text/plain"` rarely. The senior reach: `multipart/form-data` when an `<input type="file">` is in the form; otherwise the default works.
  - The 2026 reality in Next.js: `<form action={serverAction}>` is the senior default (Chapter 7.3.3). The action is a function, not a URL, and React handles the wiring.
- **The `<input>` element — the typed-input surface:**
  - **`<input type>`** — the type attribute determines the input's behavior, the on-screen keyboard on mobile, and the autofill suggestions the browser offers. The 2026 reach for the SaaS-relevant types:
    - **`text`** — single-line text input. The default. Used for names, addresses, free-form text.
    - **`email`** — email address. Browser validates the basic shape (`@` present, no spaces), surfaces an email-optimized keyboard on mobile.
    - **`password`** — masks the input. Surfaces a strong-password suggestion (browser-and-OS-managed). Pairs with the password manager.
    - **`number`** — numeric input. Surfaces a numeric keyboard on mobile; the `min`, `max`, `step` attributes constrain valid values. The senior watch-out: `<input type="number">` returns a *string* in `FormData` (the lesson cashes this in below).
    - **`tel`** — phone number. Surfaces a phone-pad keyboard on mobile; no built-in format validation.
    - **`url`** — URL. Surfaces a URL-optimized keyboard.
    - **`date`** — date. Surfaces a date picker. The value is an ISO `yyyy-mm-dd` string. Chapter 18.1 owns Temporal; this lesson installs the input type.
    - **`time`** — time of day. Surfaces a time picker. The value is `hh:mm` or `hh:mm:ss`.
    - **`datetime-local`** — date and time. Surfaces a combined picker. The value is `yyyy-mm-ddThh:mm`.
    - **`checkbox`** — single boolean. The `checked` attribute is the initial state; the DOM property is the live state.
    - **`radio`** — one of N choices in a group. Multiple `<input type="radio" name="x">` with the same `name` form a group; only one can be checked. The `value` attribute is what `FormData` receives.
    - **`file`** — a file picker. Reviewed in Chapter 3.7.3 (Blob/File primitives).
    - **`hidden`** — the value is not displayed but is included in form submission. The senior reach for carrying a record ID through the form submit (`<input type="hidden" name="invoiceId" value={invoice.id} />`).
    - **`submit`** — a submit button rendered as an `<input>` rather than a `<button>`. The 2026 reach: prefer `<button type="submit">` (more flexible content — can hold icons and text); `<input type="submit">` is the legacy form.
- **The `name` attribute as the contract:**
  - **The load-bearing point.** The `name` attribute on every input is the *key* under which the value appears in `FormData` (the data structure the server receives). `<input name="email" />` submits with `formData.get('email')`; without `name`, the value is dropped from the submission entirely.
  - **The senior reflex.** Every form input has a `name`. Missing `name` is the canonical bug shape — the user fills in the form, submits, the server sees an empty value, the student spends 20 minutes debugging.
  - **The naming convention.** `kebab-case` is HTML-conventional but JSON-unfriendly; `snake_case` matches Postgres column names cleanly; `camelCase` matches TypeScript. The 2026 senior reach for a Server Actions + Zod codebase is `camelCase` to align with TypeScript (Zod parses, the result is a TS object), but the team picks one and sticks.
- **The `<label>` element and the form-element association:**
  - **The canonical shape.** Every form input gets a `<label>` that names what the input is for. Two patterns:
    ```tsx
    {/* Explicit association via htmlFor */}
    <label htmlFor="email">Email</label>
    <input id="email" name="email" type="email" />

    {/* Implicit association by wrapping */}
    <label>
      Email
      <input name="email" type="email" />
    </label>
    ```
  - **Why labels matter.** Three reasons:
    1. **Screen readers announce the label** when the input is focused. Without a label, the input is announced as "edit, email" with no context.
    2. **Click target.** Clicking the label focuses (or for checkboxes, toggles) the associated input. The label expands the click target — important on mobile and for users with motor difficulties.
    3. **Form autofill** uses the label to identify the field. The browser learns "Email" and offers the saved email on the next sign-up form.
  - **The senior reach.** Explicit `htmlFor` is the 2026 default — it works regardless of DOM nesting and integrates cleanly with form libraries. The implicit wrap is fine for simple cases; the explicit form scales.
  - **Placeholder is not a label.** `<input placeholder="Email" />` shows "Email" inside the input until the user types. The placeholder disappears on focus. Using placeholder *as the label* is a 2010-era anti-pattern: screen readers don't announce it, the user loses the context once they start typing, and contrast is usually too low for accessibility. The senior reach: real `<label>`, optional descriptive placeholder.
- **`<fieldset>` and `<legend>` for grouping:**
  - **`<fieldset>`** — groups related form controls (a billing-address section in a checkout, a "preferences" group, an opt-in checkbox cluster). Renders with a default border (Tailwind's Preflight strips it; restyle as needed).
  - **`<legend>`** — the visible name for the fieldset. The first child of `<fieldset>`. Screen readers announce the legend before each input in the fieldset, providing group context.
  - **The senior reach.** Use `<fieldset>` for groups of related inputs that share a category. The canonical site: a `<fieldset>` of `<input type="radio">` buttons (the legend names the question, the radios are the answers). Without `<fieldset>`, the radios have no group context.
- **The form input subset a senior reaches for daily:**
  - **`<textarea>`** — multi-line text. The `name`, `rows`, `cols`, `maxLength` attributes. The `value` is the text content; in JSX, the value is set via the `defaultValue` prop (uncontrolled) or `value` paired with `onChange` (controlled, Chapter 7.3.1).
  - **`<select>`** with `<option>` children — dropdown menus. The `name` is on the `<select>`; each `<option>` has a `value` attribute (what gets submitted) and the option's text content (what the user sees). The `selected` attribute on an option sets the default. `<select multiple>` allows multi-select.
  - **`<input type="checkbox">`** — single boolean. The `checked` attribute is the initial state; the `value` (if set) is what gets submitted when checked (default is `"on"`). The senior reach: explicit `value` for boolean checkboxes (`<input type="checkbox" name="agree" value="true" />`).
  - **`<input type="radio">` groups** — multiple radios with the same `name`. Only one in the group can be checked. The `value` is what gets submitted.
- **Native constraints — the Constraint Validation API (light):**
  - **`required`** — the field must have a value before submit. The browser blocks submission and surfaces a native message (per locale) on the offending field.
  - **`type`-based validation** — `type="email"` enforces basic email format, `type="url"` enforces URL format, `type="number"` enforces numeric.
  - **`min` / `max`** — numeric and date ranges.
  - **`minLength` / `maxLength`** — string length bounds. The 2026 watch-out: `maxLength` on `<input type="number">` does not work — use `min`/`max` instead.
  - **`pattern`** — a regex the value must match. Rarely the right reach in 2026 SaaS (Zod's checks are more legible); named for completeness.
  - **The senior call.** Chapter 7.3.7 owns the depth. The native constraints are good for UX (the user gets an inline error before submit) but never the security boundary — server-side Zod validation is non-negotiable. Both layers; never just one.
- **The `<form>` submit flow without JavaScript** — the progressive-enhancement frame:
  - **The HTML default.** With JavaScript disabled, a `<form action="/api/submit" method="post">` still submits — the browser POSTs `application/x-www-form-urlencoded` (or multipart for files) to the action URL. The Server Action equivalent in Next.js works similarly: React renders an `<input type="hidden">` with the action reference, and the form posts to a Next.js endpoint that invokes the action.
  - **The senior reach.** Forms that work without JavaScript are the 2026 baseline. The Server Action pattern (Chapter 7.3.3) preserves this by default — the action is the form's `action` prop, and the JavaScript-disabled fallback works.
- **The `FormData` API** — Chapter 3.6.1 introduced; Chapter 7.3.2 cashes in. This lesson installs the shape so the student writes the elements with `FormData` in mind:
  - **The browser builds a `FormData`** from the form's inputs on submit. Every `<input>`, `<select>`, `<textarea>` with a `name` contributes a key-value pair (or multiple values, for multi-select).
  - **Values are strings.** `<input type="number" name="age">` produces a string in `FormData` (`"42"`, not `42`). The Zod parse coerces (`z.coerce.number()`).
  - **Checkboxes contribute their `value` when checked, nothing when unchecked.** `FormData.get('agree')` returns `"true"` (or whatever the `value` was) when checked, `null` when unchecked.
  - **Radio groups contribute the checked radio's `value` once.** The shared `name` is the key.
  - **Multi-select contributes multiple entries under the same name.** `FormData.getAll('tags')` returns an array.
  - The senior reach: the form's elements (and their `name` attributes) define the `FormData` shape; the Server Action's Zod schema validates it. The two are tightly coupled and the student designs them together.
- **The `autoComplete` attribute** — the autofill contract:
  - **The model.** The browser (and password managers like 1Password) reads `autoComplete` to know what the field is for. Setting `autoComplete="email"` tells the browser "this is an email field — offer the saved email."
  - **The canonical values for SaaS forms.** `email`, `username`, `current-password`, `new-password` (signals to the browser to suggest a strong password), `given-name`, `family-name`, `name`, `street-address`, `postal-code`, `country`, `tel`, `organization`, `cc-number`, `cc-name`, `cc-exp` (credit card fields). The full list is in the HTML spec.
  - **The senior reach.** Every input that maps to a known autocomplete category has the right `autoComplete`. The win is real — users get one-tap fill from their password manager, browsers offer 2FA codes, and the form's UX is dramatically better. The bug: `autoComplete="off"` on a password field disables the password manager (and is widely ignored by modern browsers for security reasons). The 2026 reach: use the right value; don't disable.
- **Disabled and readonly inputs:**
  - **`disabled`** — the input is non-interactive and is *not* submitted with the form. Use when the field is contextually unavailable (a `Save` button before a required field is filled).
  - **`readOnly`** — the input is non-interactive but *is* submitted. Use when the value is fixed but should travel with the form (a record ID, a computed value).
  - **The senior call.** Most "show but don't allow edit" cases are `readOnly`. `disabled` is the reach when the field should not exist in the submission at all.
- **The watch-outs a senior names:**
  - **Every input needs a `name` attribute** — without it, the value is dropped from `FormData`. The canonical missing-`name` bug is silent: form submits, server sees nothing, debugging takes an hour.
  - **Every input needs a `<label>`** — explicit `htmlFor` is the senior default. Placeholder is not a label.
  - **`<button>` inside a `<form>` defaults to `type="submit"`.** Already named in 4.1.4; cashed in here.
  - **Native constraints are UX, not security.** Always pair with server-side Zod (Chapter 7.3.7).
  - **`<input type="number">` produces strings.** Zod coerces; manual parsing is the wrong reach.
  - **`autoComplete="off"` is a UX regression** in modern browsers. Use the right semantic value.
  - **`<form>` inside `<form>`** — illegal HTML. The browser drops the inner form silently. Refactor.
  - **Form submission on Enter** — pressing `Enter` while focused on any text input within a form submits it. For forms where this is wrong (a search-as-you-type that shouldn't submit), the input handles its own keydown.
  - **`onSubmit` handlers need `event.preventDefault()`** when the developer wants to handle the submit in JavaScript instead of the browser's default action. With Server Actions (Chapter 7.3.3), the `action` prop handles this automatically; with custom handlers, the manual `preventDefault` is the senior reach.
  - **The `<input>` `defaultValue` vs. `value` distinction** — Chapter 3.5.2 installed it; this lesson surfaces it. `defaultValue` is the initial value (sets the attribute); `value` is the current value (sets the property — controlled component). The 2026 reach for Server Actions: uncontrolled inputs with `defaultValue` are the senior default; controlled (`value` + `onChange`) is the conditional when React Hook Form earns its weight (Chapter 7.4).
  - **File inputs are uncontrolled.** `<input type="file">` cannot have its `value` set by React (security reason). The senior reach: read the file via `inputRef.current?.files?.[0]` in an event handler.
  - **The submit can be triggered by `Enter` even with no submit button visible.** A form with one text input and no submit button still submits on Enter, posting an empty action. The senior reach: include a submit button (visually hidden if needed) or capture and prevent on the input.

What this lesson does not cover:

- The native React 19 form pattern with Server Actions (Chapter 7.3.3).
- `useActionState`, `useFormStatus`, `useOptimistic` (Chapter 7.3.4 through 7.3.6).
- Controlled vs. uncontrolled inputs at depth (Chapter 7.3.1).
- The Constraint Validation API at depth — `setCustomValidity`, `ValidityState`, `:invalid` (Chapter 7.3.7).
- Zod schema authoring (Chapter 7.1).
- React Hook Form as the conditional past the native pattern (Chapter 7.4).
- File uploads — `<input type="file">` mechanics, `Blob`/`File` primitives (Chapter 3.7.3).
- The shadcn `<Form>` primitives (Chapter 4.11.1, Chapter 7.6.2).
- Multi-step wizards (Chapter 16.4 conditional project).

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson teaches a small element vocabulary (`<form>`, `<input>`, `<label>`, `<button>`, `<textarea>`, `<select>`, `<fieldset>`, `<legend>`) and a load-bearing contract (the `name` attribute as the key into `FormData`). The deliverable is form-element fluency — the student writes a sign-up form with the right elements, the right `name` attributes, the right labels, the right `autoComplete` values, the right `type="submit"` on the submit button, and the right `type="button"` on the cancel.

Open with the senior question — "you're building a sign-up form with email, password, a confirm checkbox, and a submit; what elements and attributes does the JSX include?" — and a `MultipleChoice` exercise pitting four shells (controlled `<input>`s with `useState` per field — wrong for 2026 native pattern; `<form>` with named `<input>`s and a submit button — right; `<div>`-based fields with `onClick` handlers — wrong; `<input>`s without `name` — wrong, the contract breaks). The discrimination installs the form-as-contract model.

A `Figure` with a hand-authored SVG renders the form-as-contract picture: on the left, the JSX (a `<form>` with three labeled inputs and a submit); in the middle, a `FormData` arrow pointing at the inputs' `name` attributes; on the right, the server's view (a Zod schema parsing the `FormData`). The student sees the elements, the `name` keys, and the validation shape as one connected picture.

A `TabbedContent` block organizes the input types into tabs by category: text-like (`text`, `email`, `password`, `url`, `tel`, `search`), numeric (`number`, `range`), date-time (`date`, `time`, `datetime-local`, `month`, `week`), choice (`checkbox`, `radio`, `select`), file (`file`, foreshadowing Chapter 3.7.3), hidden. Each tab has the JSX form, the on-screen keyboard impact, the `FormData` output type, and the canonical SaaS site.

A `Matching` exercise pairs eight form scenarios with the right `autoComplete` value — sign-up email field (`"email"`), sign-up password field (`"new-password"`), sign-in password field (`"current-password"`), first name field (`"given-name"`), last name field (`"family-name"`), 2FA code field (`"one-time-code"`), credit card number (`"cc-number"`), postal code (`"postal-code"`). The autofill vocabulary is locked in.

An `AnnotatedCode` block walks a 25-line sign-up form JSX — `<form action={signUpAction}>`, three `<label htmlFor>` + `<input id name type autoComplete required>` triplets (email, password, confirm), a `<fieldset>` with a `<legend>` for the terms-and-conditions checkboxes, a `<button type="submit">`. Annotations call out every contract piece: the `name` keys, the `htmlFor`/`id` association, the `autoComplete` values, the `required` markers, the `<button type="submit">`.

A `ReactCoding` block has the student build an invoice-create form: customer name (`<input type="text" name="customerName" required>`), amount (`<input type="number" name="amountCents" min={0} step={1} required>`), due date (`<input type="date" name="dueDate" required>`), notes (`<textarea name="notes" maxLength={500}>`), submit (`<button type="submit">`). The grader checks: every input has a `name`, every input has a `<label>` with `htmlFor`, the submit is `type="submit"`, the form's `action` is set.

A `Buckets` exercise sorts twelve form-element decisions into "right element" vs. "wrong element" — `<label>` with `htmlFor` (right), placeholder used as the label (wrong), `<input type="checkbox">` for a boolean opt-in (right), `<input type="text">` for a numeric field (wrong — should be `type="number"` or `inputMode="numeric"`), `<button type="submit">` for the form's primary submit (right), `<button>` (no `type`) for a "Cancel" inside the form (wrong — defaults to submit), `<fieldset>` with `<legend>` for a group of radios (right), `<div>` wrapping a group of related inputs (wrong — `<fieldset>`), `<input type="email" autoComplete="email">` (right), `<input type="email" autoComplete="off">` (wrong UX), `<input>` without `name` (wrong — drops from `FormData`), `<input name="email" id="email">` paired with `<label htmlFor="email">` (right). The discrimination locks in.

A `CodeReview` exercise on a 35-line form with seven issues:
- An `<input>` without `name` (drops from `FormData`).
- A `placeholder` used as the only label (no real `<label>` — accessibility regression).
- `<button>Cancel</button>` inside a form (defaults to submit — should be `type="button"`).
- An `<input type="number">` field without `inputMode="numeric"` (mobile keyboard regression — though `type="number"` usually handles this, the lesson surfaces the watch-out).
- `<input type="password" autoComplete="off">` (disables password managers — should be `current-password` or `new-password`).
- A group of `<input type="radio">` without a `<fieldset>` and `<legend>` (no group context for screen readers).
- A nested `<form>` inside another `<form>` (illegal HTML; the browser drops the inner).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `<input type="number" name="age" value="42">` submitted — predict the `FormData.get('age')` return (`"42"` — string).
2. `<input type="checkbox" name="agree">` *not checked* — predict the `FormData.get('agree')` return (`null` — not included when unchecked).
3. `<input name="email">` and a button without `type` — user fills the email, presses Enter — predict what happens (the form submits; the button defaults to `type="submit"` regardless of whether the user clicked it).

The recognition of the form-submission edge cases is concrete.

Close with a `TrueFalse` round of five statements: "Every form input needs a `name` attribute to be submitted" (true), "Placeholder text is a valid replacement for `<label>`" (false), "`<input type="number">` returns a number in `FormData`" (false — returns a string), "A `<button>` inside a `<form>` defaults to `type="submit"`" (true), "`autoComplete="off"` is the senior reach for password fields to prevent password managers" (false — disables a real UX feature; use the semantic value). The vocabulary is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for Chapter 7.3 (native React 19 form pattern — Server Actions, `useActionState`, `FormData`), Chapter 7.1 (Zod schema authoring against the form contract), Chapter 7.3.7 (Constraint Validation API), and Chapter 4.11.1 (shadcn `<Form>` primitives).

---

## Lesson 4.1.6 — Data attributes, ARIA basics, and tables

Topics to cover:

- The senior question: the student has a delegated click handler on a list parent that needs to know which row was clicked (`data-row-id`). They have an icon-only button that screen readers need to announce as "Delete" (`aria-label`). They have a sort-state toggle whose pressed state assistive tech needs to read (`aria-pressed`). And they have an audit-log view that's genuinely tabular data — invoice number, customer, status, amount, date — that benefits from `<table>` semantics over a flex-of-divs. Three element-level attribute families (`data-*`, `aria-*`, and the table-cell-header attributes) and one element family (`<table>` and friends) — none individually deserve a full lesson, but each is the senior reflex in its corner. The lesson installs all three at the depth they earn in 2026 SaaS code.
- **`data-*` attributes — the model:**
  - **The pattern.** Any attribute starting with `data-` is a custom attribute the browser stores but doesn't render or interpret. The application's JavaScript reads them (typically via `element.dataset.fooBar` — Chapter 3.5.1 introduced the API). The canonical SaaS site: delegation hooks. A list parent's click handler reads `event.target.closest('[data-action]')` to find which button was clicked; the button's `dataset.action` names the action, the row's `dataset.rowId` names the row.
  - **The kebab-case-to-camelCase translation.** `<div data-row-id="123">` is read as `el.dataset.rowId`. The DOM API does the translation; the developer writes both forms (kebab in HTML, camelCase in JavaScript).
  - **The 2026 reach.** Delegation patterns (Chapter 3.5.3) read `data-*` to identify the actionable element. Test selectors (Playwright in Chapter 19.5) read `data-testid` to find elements. Analytics events read `data-event-name` to fire on click. Tailwind's structural variants (Chapter 4.2.4) read state from `data-[state=...]` (e.g., `data-[state=open]:bg-blue-100` for a Radix-managed component). Each is a different consumer of the same primitive.
  - **The senior reflexes.**
    - Use `data-*` for *structural hooks* — keys that JavaScript or CSS reads to find elements or branch behavior. Don't put display content in `data-*` (that goes in element children).
    - Don't use `data-*` for what `aria-*` is for. `data-state="active"` is a structural hook; `aria-current="page"` is the accessibility-tree signal. The two serve different consumers.
    - Don't invent attributes without the `data-` prefix. `<div my-custom="x">` is technically allowed in HTML5 but produces validation warnings and isn't accessible via `dataset`. The senior reach: always `data-` prefix.
  - **The JSX form.** Kebab-case in the JSX (`<div data-row-id={row.id}>`), camelCase in the reader (`el.dataset.rowId`). The student writes both forms by reflex.
- **`aria-*` attributes — the basics.** Chapter 4.11.3 owns the full ARIA treatment; this lesson installs the daily-reach surface:
  - **The first rule of ARIA** — no ARIA is better than bad ARIA. A semantic element with its built-in semantics (`<button>`, `<a>`, `<nav>`, `<input>`) is *always* better than a generic element with ARIA bolted on. ARIA exists to fill the gaps the native semantics don't cover, not to replace them. The senior reach: reach for the semantic element first; reach for ARIA when no semantic element fits or when the element's state needs to be communicated.
  - **`aria-label`** — provides an accessible name for an element that has no visible text. The canonical sites: icon-only buttons (Lesson 4.1.4), `<nav>` regions with multiple instances (Lesson 4.1.3), inputs that have no associated label (rare — always prefer `<label>` when possible).
  - **`aria-labelledby="id"`** — provides an accessible name by reference to another element's text content. The canonical site: a `<section aria-labelledby="overview-heading">` whose `<h2 id="overview-heading">` provides the name. Avoids text duplication.
  - **`aria-describedby="id"`** — provides extended description by reference. The canonical site: a form field with an error message — `<input aria-describedby="email-error">` paired with `<p id="email-error" role="alert">Invalid email</p>`. The screen reader announces the error along with the field.
  - **`aria-current="page"`** — marks the current item in a set, typically a nav link pointing at the current page. The accessibility-tree signal that "this is where you are." The senior reach in nav bars.
  - **`aria-expanded="true|false"`** — for a control that toggles a disclosure (a collapsible panel, an accordion trigger, a dropdown menu trigger). Pairs with `aria-controls="id"` (pointing at the expandable region).
  - **`aria-pressed="true|false"`** — for a toggle button (a bold/italic in a rich-text editor, a "favorite" toggle). Distinguishes a toggle from a regular button to assistive tech.
  - **`aria-hidden="true"`** — hides an element from the accessibility tree without affecting visual display. The senior reach for purely decorative icons that screen readers should skip (when an icon's meaning is also conveyed by adjacent text). Don't `aria-hidden` interactive elements — that creates an unreachable focus trap.
  - **`role="..."`** — overrides the element's default role. Rarely the right reach in 2026 (use the semantic element instead). The legitimate uses: `role="alert"` on a live region for urgent messages, `role="status"` for non-urgent status updates, `role="dialog"` on a modal container (though `<dialog>` is the more modern choice). Chapter 4.11.3 owns the depth.
- **Live regions for dynamic content** — named once for the chapter; Chapter 4.11.3 cashes in:
  - **`aria-live="polite"`** — the screen reader announces changes when the user is idle. The canonical site: a toast notification, a "saved" confirmation.
  - **`aria-live="assertive"`** — the screen reader interrupts to announce. Used sparingly — only for critical alerts (a session-about-to-expire warning, a payment failure).
  - **`role="alert"`** — shorthand for `aria-live="assertive"` with implied semantics. The senior reach for inline form errors.
- **Tables — the senior decision.** When is a `<table>` the right reach?
  - **`<table>` is for tabular data.** Rows and columns of related information where the cell at row R, column C is meaningfully indexed by (R, C). The canonical SaaS sites: an audit log (timestamp, actor, action, resource), an invoice line-items list (description, quantity, unit price, total), a billing breakdown (line, subtotal, tax, total), a metrics dashboard (period, requests, errors, latency).
  - **Not a `<table>`:** layout grids (use CSS grid), card lists (use `<ul>` with grid layout), forms (use `<form>` with `<fieldset>` grouping). The 1990s-era use of `<table>` for layout is gone — Tailwind's grid utilities do the job correctly.
  - **The decision test.** Could you reasonably swap rows and columns and have the data still make sense as a transposition? If yes, it's tabular. If the rows are heterogeneous "things" with a shared structure of attributes, it's tabular. If the items are visually-laid-out cards in a grid, it's a list with grid layout.
- **The `<table>` element family:**
  - **`<table>`** — the container.
  - **`<thead>`** — the header row group. Holds the column-header row(s). Stays visible on scroll if the parent has `overflow-y: auto` and `<thead>` has `position: sticky` (Tailwind utilities).
  - **`<tbody>`** — the body row group. Holds the data rows. Multiple `<tbody>`s allowed (rare — used for grouped tables).
  - **`<tfoot>`** — the footer row group. Holds summary rows (totals, averages). Rare in SaaS dashboards; common in invoices.
  - **`<tr>`** — table row. A direct child of `<thead>`, `<tbody>`, or `<tfoot>`.
  - **`<th>`** — header cell. Always inside `<thead>` (for column headers) or as the first child of a `<tbody>` row (for row headers). The `scope` attribute names whether the header applies to a column (`scope="col"`) or a row (`scope="row"`).
  - **`<td>`** — data cell. Inside `<tbody>` or `<tfoot>` rows.
- **The canonical SaaS table shape:**
  ```tsx
  <table>
    <thead>
      <tr>
        <th scope="col">Invoice</th>
        <th scope="col">Customer</th>
        <th scope="col">Status</th>
        <th scope="col" className="text-right">Amount</th>
        <th scope="col">Issued</th>
      </tr>
    </thead>
    <tbody>
      {invoices.map(invoice => (
        <tr key={invoice.id} data-row-id={invoice.id}>
          <th scope="row">{invoice.number}</th>
          <td>{invoice.customerName}</td>
          <td><StatusBadge status={invoice.status} /></td>
          <td className="text-right">{formatCurrency(invoice.amountCents)}</td>
          <td>{formatDate(invoice.issuedAt)}</td>
        </tr>
      ))}
    </tbody>
  </table>
  ```
  Annotations the lesson names: `scope="col"` on column headers, `scope="row"` on the first cell of each data row (it's the row's identifier — the invoice number), `data-row-id` for delegation, `key={invoice.id}` for React reconciliation, `className="text-right"` for numeric-column alignment.
- **`<caption>`** — the table's title. Renders above the table (or below, with `caption-side: bottom`). The screen reader announces it before the column headers. The senior reach: every standalone table has a `<caption>` (visible or visually hidden but available to screen readers).
- **`colspan` and `rowspan`** — span a cell across multiple columns or rows. Rare in 2026 SaaS code; the canonical use is a "Total" row in `<tfoot>` that spans most columns. In JSX: `colSpan` and `rowSpan` (camelCase, per the rename table).
- **`<colgroup>` and `<col>`** — for styling or spanning across entire columns. Rarely written by hand; named for recognition.
- **Tables and accessibility:**
  - **The `<th scope>` attribute** is load-bearing. Without `scope`, screen readers can't reliably announce which header applies to a cell. The senior reach: `scope="col"` on every column header, `scope="row"` on the first cell of each data row (when the first cell identifies the row).
  - **Tables announce row and column counts** to screen reader users navigating the table. The user can hear "table, 8 columns, 50 rows" and decide whether to scan.
  - **The `<caption>`** provides the table's name. Without it, the table is announced without context.
  - **Empty cells in data tables** are fine, but the senior reach for "no data" is an explicit em-dash (`—`) or `aria-label="No value"` so the user knows the cell is intentionally empty.
- **When to drop the `<table>`:**
  - **A "card list" or "grid of items"** — use `<ul>` with grid layout, not `<table>`.
  - **A two-column layout of a form (label on left, input on right)** — use CSS grid on a `<form>`, not `<table>`.
  - **A side-by-side comparison of two products** — could be `<table>` (each row is a feature comparison) or could be a CSS grid; the decision is whether rows-and-columns is the natural model. Often `<table>` is right here.
- **Responsive tables:**
  - **Horizontal overflow.** A wide table inside a narrow viewport overflows. The senior reach: wrap the `<table>` in a `<div className="overflow-x-auto">` so the table scrolls horizontally within the container.
  - **Card-per-row at small breakpoints.** For complex tables, the 2026 SaaS reach is to switch to a card layout below `md`: the same data, each row rendered as a card with label-value pairs. Tailwind responsive variants (Chapter 4.5.6) handle the switch.
  - **The watch-out.** Don't `display: block` on `<tr>` and `<td>` to fake a stacked layout — that breaks the accessibility-tree structure (screen readers stop announcing the row/column relationships). The card-per-row reach uses a fully different rendering at small breakpoints, not a CSS override of the table semantics.
- **The watch-outs a senior names:**
  - **Use `data-*` for structural hooks**, `aria-*` for assistive-tech signals — they're not interchangeable.
  - **No ARIA is better than bad ARIA.** Reach for the semantic element first; ARIA fills gaps.
  - **`aria-label` on a `<button>` with visible text duplicates the announcement.** The button's text is already its accessible name; adding `aria-label` *overrides* it (sometimes mismatching the visible text). Only `aria-label` icon-only buttons.
  - **`aria-hidden` on focusable elements creates an unreachable trap.** Only on decorative elements (icons next to text labels, ornamental SVGs).
  - **`role="button"` on a `<div>` is the wrong reach** — use `<button>`. The same goes for `role="link"`, `role="checkbox"`, `role="textbox"` — every one has a native HTML element that's better.
  - **`<table>` for layout is a 1990s reflex.** Use CSS grid (Chapter 4.4.4).
  - **`<th scope>` is non-negotiable in data tables.** Without it, the accessibility-tree relationships break.
  - **`data-row-id` is the senior reach for delegation hooks.** The HTML `id` attribute is for the actual unique identifier (anchor links, label associations); `data-row-id` is the script-readable handle.
  - **`data-testid`** is fine for Playwright tests but the senior reach in 2026 is to use accessible queries (`getByRole`, `getByLabelText`) first; `data-testid` is the fallback. Chapter 19.4 owns the testing depth.
  - **The kebab-case-vs-camelCase trap in JSX `data-*`.** Write `data-row-id` in JSX (kebab); read `el.dataset.rowId` (camelCase) in JS. The translation is automatic.
  - **Tables in mobile viewports.** Wrap in `overflow-x-auto` or switch to a card layout at small breakpoints; never break the table semantics with `display: block` overrides.

What this lesson does not cover:

- The full ARIA treatment (Chapter 4.11.3) — every role, every state, the WAI-ARIA Authoring Practices.
- Focus management at depth (Chapter 4.11.4) — focus trap, focus restoration on route change.
- Live regions at depth — when to use `polite` vs. `assertive`, screen reader behavior across browsers.
- The full table accessibility specification — `headers` attribute (manual header references), `<col>` and `<colgroup>` styling at depth.
- TanStack Table or the data-grid component family — out of scope.
- Sorting, filtering, virtualized tables — out of scope for this lesson.
- The `<dialog>` element — out of scope; Radix-managed dialogs in Chapter 4.6.5.

Pedagogical approach:

Mechanics-plus-pattern archetype with two distinct topic threads in one lesson. The lesson teaches three attribute families (`data-*`, `aria-*`, the table-cell-header attributes) and one element family (`<table>` and friends). The deliverable is the daily-reach surface — when the student needs a delegation hook, an accessibility label, a pressed-state signal, or a tabular-data view, they reach for the right primitive without hesitation.

Open with the senior question — "you need a delegation hook on a row, an accessible label on an icon button, and a tabular view of audit-log entries; what attributes and elements?" — and a `MultipleChoice` exercise pitting four shells (everything `data-*` — wrong, mixes the consumer roles; `aria-rowid` and `aria-rowindex` for delegation — wrong, those are for assistive tech; `data-row-id` for delegation + `aria-label` for icon naming + `<table>` for tabular data — right; ad-hoc class names for delegation — wrong, fragile). The discrimination installs the three-primitive split.

A `Figure` with a hand-authored SVG renders a single DOM element with three attribute families annotated: `id="invoice-123"` (HTML unique identifier — labels, anchor links), `data-row-id="123"` (script-readable hook — delegation, tests, analytics), `aria-label="Delete invoice 123"` (assistive-tech signal). Three callouts name each consumer: HTML/CSS, JavaScript/CSS state, assistive tech. The split is one picture.

A `TabbedContent` block organizes the daily-reach ARIA surface into tabs. Tab 1: `aria-label` and `aria-labelledby` (naming). Tab 2: `aria-describedby` (extended description). Tab 3: `aria-current`, `aria-expanded`, `aria-pressed` (state). Tab 4: `aria-hidden`, `role="alert"` (visibility and live regions). Each tab has the canonical JSX and the use site.

A `Buckets` exercise sorts twelve attribute scenarios into "use `data-*`" vs. "use `aria-*`" vs. "use `id`" vs. "use the element's native semantics" — delegation row hook (`data-*`), screen-reader-only icon label (`aria-label`), input-to-label association (`htmlFor`/`id`), highlighting the current nav link (`aria-current`), test selector (`data-testid` if accessible queries don't fit), live error message reference (`aria-describedby`), CSS state variant trigger (`data-state`), button that toggles a panel (`aria-expanded` plus `aria-controls`), invisible visual hint to a screen reader (`aria-label`), decorative icon (`aria-hidden`), purely-cosmetic data tag for delegation (`data-*`), grouping radios in a fieldset (the `<fieldset>` + `<legend>` is the right reach — no ARIA). The discrimination locks in.

An `AnnotatedCode` block walks a 15-line delegation-shaped JSX — a `<ul>` of `<li>`s each with `data-row-id`, action `<button>`s with `data-action` and `aria-label`, and a `<p role="status">` for the result message. Annotations call out each `data-*` (script hook), each `aria-label` (a11y signal), the `role="status"` (live region), the lack of unnecessary ARIA on elements with native semantics.

A `Figure` with a hand-authored SVG renders a canonical SaaS table — invoice list with five columns. Each `<th>` is annotated with `scope="col"`; the first `<td>` of each row is shown as a `<th scope="row">`; the `<caption>` above names the table; the wrapping `<div className="overflow-x-auto">` is shown around it.

A second `TabbedContent` block contrasts three table approaches: (1) a proper `<table>` with `<thead>`/`<tbody>`/`<th scope>`, (2) a div-grid imitation of a table (anti-pattern — no accessibility-tree structure), (3) a card-per-row alternative for non-tabular data (the right reach when the data isn't truly tabular). Each tab has a JSX example, the screen-reader announcement, and the senior decision.

A `ReactCoding` block has the student build an audit-log table — caption, header row with five columns and `scope="col"`, body rows with `<th scope="row">` for the timestamp column and `<td>` for the rest, `data-row-id` on each row, wrapped in `overflow-x-auto`. The grader checks: the semantic table elements, the scopes, the caption, the wrapping container.

A `CodeReview` exercise on a 35-line snippet with six issues:
- A `<div role="button">` with a click handler (should be `<button>`).
- An icon-only `<button>` with no `aria-label` (silent button — should have a label).
- `aria-label="Delete"` on a button whose visible text is also "Delete" (duplicate — drop the aria-label, the visible text is already the accessible name).
- A "table" rendered as a CSS grid of `<div>`s (no semantic structure — switch to `<table>` since the data is tabular).
- A `<table>` with no `<th scope>` attributes (accessibility-tree relationships broken).
- A delegation hook using a class name (`className="row"` read via `event.target.matches('.row')`) instead of `data-row-id` (fragile to CSS refactors — switch to `data-*`).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `<button aria-label="Save changes">Save</button>` — predict the screen-reader announcement (announces "Save changes" — the `aria-label` *overrides* the visible text, which may not match what the user expects).
2. `<table>` with column headers but no `scope` attributes — predict the announcement when navigating a cell (the headers may not be associated — most modern screen readers heuristically guess, but the senior never relies on heuristics).
3. `<div aria-hidden="true">` containing a `<button>` (the button is in the accessibility tree's hidden subtree — a keyboard user can tab to it but the screen reader announces nothing; the user is trapped on a focused, unannounced control).

The recognition of the failure modes is concrete.

Close with a `TrueFalse` round of five statements: "Every `<button>` should have an `aria-label`" (false — only icon-only buttons need it), "`data-*` and `aria-*` serve the same purpose" (false — different consumers, different rules), "A `<table>` with rows of `<div>`s and grid layout is equivalent for accessibility" (false — the table semantics are what assistive tech reads), "Every `<th>` in a data table needs a `scope` attribute" (true — for screen-reader navigation), "Setting `aria-hidden="true"` on a focusable element is fine if the user doesn't tab to it" (false — users can tab to it and become trapped). The vocabulary is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for Chapter 3.5.3 (delegation patterns using `data-*`), Chapter 4.2.4 (Tailwind structural variants reading `data-[state=...]`), Chapter 4.11.3 (full ARIA treatment), Chapter 19.4 (component testing with accessible queries vs. `data-testid`), and any later list/table SaaS surface.

---

## Lesson 4.1.7 — Quiz

Top ten topics to quiz:

1. JSX is property syntax — compiles to `jsx(...)` calls producing element descriptors that React renders into the DOM. The prop names follow the DOM property names, not the HTML attribute names: `className`, `htmlFor`, `tabIndex`, `readOnly`, `colSpan`. `data-*` and `aria-*` stay kebab-case in JSX.
2. List rendering needs keys; keys must be stable, unique among siblings, tied to the data. The array index is the canonical wrong key — the bug fires when the list is filtered, sorted, or reordered. The senior default is `key={row.id}`.
3. The `&&` short-circuit's `0` trap — `{items.length && <List />}` renders `0` when the array is empty. The senior reach is explicit boolean coercion (`{items.length > 0 && ...}` or a ternary).
4. Void elements (`<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`) must self-close in JSX (`<img />`). Fragments (`<>...</>`) group siblings without an extra wrapping element.
5. The Next.js root layout (`app/layout.tsx`) is a Server Component that owns the `<html>` and `<body>` tags; the `metadata` export (or `generateMetadata` for dynamic) generates the `<head>` content. Don't put `'use client'` on the root layout — wrap client concerns in a `<Providers>` child.
6. The six landmark elements — `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`, `<footer>` — form the page outline assistive tech navigates. Multiple `<nav>` regions need `aria-label`s to distinguish them. Headings (`<h1>` through `<h6>`) follow a strict hierarchy — exactly one `<h1>` per page, no skipped levels; the level is determined by outline position, not visual size.
7. `<button>` is for actions, `<a href>` is for navigation. `<button>` inside a `<form>` defaults to `type="submit"` — every button declares its `type` explicitly. `<a target="_blank">` always pairs with `rel="noopener noreferrer"`. Internal Next.js navigation uses `<Link>`; external links use plain `<a>`. Icon-only buttons need `aria-label`.
8. Form elements form a contract — `name` attributes are the keys into `FormData`, `<label htmlFor>` associates labels to inputs (placeholder is not a label), `<fieldset>` + `<legend>` group related inputs, `<button type="submit">` is the senior reflex. Native constraints (`required`, `type`, `pattern`, `minLength`) are UX, not security — always pair with server-side Zod (Chapter 7.3.7).
9. `data-*` for script hooks (delegation, tests, CSS state) vs. `aria-*` for assistive-tech signals (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-current`, `aria-expanded`, `aria-pressed`, `aria-hidden`, `role="alert"`). The first rule of ARIA — no ARIA is better than bad ARIA. Reach for the semantic element first.
10. `<table>` for tabular data only — rows and columns of related information indexed by (R, C). The semantic structure: `<table>`, `<caption>`, `<thead>` with column-header `<th scope="col">`, `<tbody>` with `<tr>` rows where the row identifier is `<th scope="row">` and other cells are `<td>`. Wrap in `overflow-x-auto` for responsive layouts; don't `display: block` the table elements (breaks the accessibility tree).

---

## Total chapter time

Roughly 275 to 335 minutes across the six teaching lessons plus the quiz. The chapter fits across three to four evenings — JSX-as-HTML in the first sitting (50-60 minutes); the root layout in a second short sitting (35-45 minutes); landmarks and headings in a third sitting (45-55 minutes); buttons-links-lists and forms across two sittings (95-115 minutes total); data-and-ARIA-and-tables in a final sitting (50-60 minutes plus the quiz). The student finishes the chapter able to write JSX with `className`/`htmlFor`/event props/curly-brace expressions/list keys/fragments/void elements by reflex, configure the Next.js root layout with the right `<html lang>` and `metadata` export, structure a page with the six landmark elements and a clean heading hierarchy, pick `<button>` vs. `<a>` vs. `<Link>` by intent, write forms whose elements are a contract with the server-side Zod schema, place `data-*` and `aria-*` attributes at the right call sites with the right consumers in mind, and reach for `<table>` only when the data is actually tabular. Chapter 4.2 opens on the other side with Tailwind — the styling surface that paints the semantic elements this chapter just installed.
