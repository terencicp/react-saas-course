# Chapter 3.5 — The DOM and event substrate

## Chapter framing

Chapters 3.1 through 3.4 installed the layers that get a request to the page and back: the network leg, HTTP semantics, the URL and origin model, and the cookie surface. The bytes arrive, the browser parses them, and a tree of objects gets built — that tree is the DOM, and it is the substrate every later UI lesson lands on. JSX (Chapter 4.1) compiles to operations against it. React's reconciler (Chapter 4.7) decides which DOM mutations to apply. Synthetic events (Chapter 4.7.6) are a wrapper over the DOM event model. The senior who's writing modern React in 2026 rarely touches `document.querySelector` and almost never calls `addEventListener` outside of a `useEffect` integration — but the senior reads the Elements panel, debugs hydration mismatches by knowing the difference between an HTML attribute and a DOM property, knows when an event bubbles past a stopped handler in React's synthetic system, and recognizes the canonical performance bug shapes (scroll listeners that aren't passive, listeners attached to every list row instead of delegated).

The senior framing: **the DOM is a live tree of node objects the browser builds from HTML and that JavaScript reads and mutates; events are a model that lets a handler attached to any ancestor respond to interactions on any descendant.** Both abstractions hide a lot of mechanics that bite when the framework abstraction leaks. The chapter installs the model at recognition depth — the student leaves able to read a node tree, name the difference between an attribute and a property by the bug it produces, walk the three event phases by reflex, and recognize the four senior-named pitfalls on sight (the listener that doesn't release the handler reference, the scroll listener without `{ passive: true }`, the click handler attached per-row, the bubbling that stops mid-tree).

The chapter ships three teaching lessons plus the quiz. The TOC's three-bullet slicing holds — each lesson installs a distinct mental model and fits comfortably under an hour. Lesson 3.5.1 names the DOM as a tree of typed node objects and walks the access surface (`getElementById`, `querySelector`, the live-vs-static collection distinction, traversal). Lesson 3.5.2 installs the attribute-vs-property split that hydration mismatches and React prop names (`className`, `htmlFor`, `value`) all stem from. Lesson 3.5.3 installs the event model — capture, target, bubble, delegation, the `{ passive }` and `{ once }` options, `preventDefault` vs. `stopPropagation`, the `AbortController` cleanup pattern that supersedes `removeEventListener`. The quiz closes the chapter.

Threads that must run through every lesson:

- **The DOM is a tree of typed objects, not the HTML source.** The browser parses the HTML once and constructs a `Document` whose children are `Element`, `Text`, and `Comment` nodes — and from that moment on, the HTML source is irrelevant. Every later mutation (JavaScript, React, the user typing into an input) updates the DOM in place; the source text the server sent never changes. The senior consequence: "view source" and "Elements panel" show different things, and the difference is the bug class hydration mismatches live in. The lesson installs the distinction at the depth that makes hydration legible later.
- **The 2026 senior rarely writes against the DOM API directly.** In a React + Next.js codebase, the DOM is what React renders into. Direct DOM access (`querySelector`, `addEventListener` outside React, `el.classList`) belongs to a few narrow surfaces — `useRef` for focusing an input or measuring a node, a portal target, a `useEffect` integration with a non-React library, a one-off DevTools snippet. The chapter names the API surface but frames every primitive against its 2026 reach: the student writes JSX 99% of the time, and the DOM API is the escape hatch with named triggers.
- **Attributes vs. properties is one of the chapter's load-bearing distinctions.** HTML attributes are the strings the parser read from the source. DOM properties are the live values JavaScript reads from the element object. They often share a name and often diverge in subtle ways (`class` attribute, `className` property; `for` attribute, `htmlFor` property; `value` attribute as the *initial* value, `value` property as the *current* value). React's prop naming and the entire hydration model live on top of this split — the senior who can name which is which debugs hydration mismatches by reflex.
- **Events are a model, not a primitive.** Every DOM event has a capture phase (root to target), a target phase (the element the event fired on), and a bubble phase (target back to root). Most handlers run in the bubble phase. The model exists to make delegation possible — a single handler on a list parent can respond to clicks on any row, no matter how many rows are added or removed. React's synthetic event system rides on this model (Chapter 4.7.6 cashes in); the senior who knows the phases reads React event behavior by reflex.
- **`addEventListener` is the platform; the modern reach is `AbortController` for cleanup.** Manually calling `removeEventListener` is the 2010-era pattern. The 2026 senior reach is to pass `{ signal: controller.signal }` when attaching the listener and call `controller.abort()` to remove it (along with every other listener attached with the same signal). This integrates cleanly with `useEffect`'s cleanup function and is the pattern the course will return to.
- **`{ passive: true }` is the senior default for scroll, wheel, and touch listeners.** Without it, the browser can't start scrolling until the listener returns, because the listener *might* call `preventDefault` and cancel the scroll. The 2026 reality is that most scroll listeners just observe — they don't cancel — and the `passive` hint tells the browser to scroll immediately. The cost of forgetting is a janky scroll on touch devices; the senior sets `{ passive: true }` by reflex.
- **Performance pitfalls get named at their site.** Three canonical bugs the chapter installs: the listener attached per-row that should have been one delegated listener on the parent, the scroll/wheel handler without `{ passive: true }` that stalls the main thread, the listener that keeps a closure alive longer than the element. Each named in its own paragraph with the recognition signal and the senior fix.
- **React props point to attributes; React handlers point to events.** Every paragraph that names an HTML attribute or a DOM event names the React prop it surfaces as. `class` → `className`. `for` → `htmlFor`. `onclick` (DOM event name) → `onClick` (React prop). `addEventListener('click', ...)` → `onClick={...}`. The translation lets Unit 4 land cleanly — when JSX is introduced, the substrate is already named.
- **Senior anchors for later units are seeded here.** The DOM tree lands again at the React reconciler (Chapter 4.7.2) — keys and identity make sense because the underlying DOM nodes are objects React decides whether to keep or replace. The attribute/property split lands again at hydration mismatches (Chapter 5.2.8) — the warning the student sees is "an attribute does not match the property at hydration." The event model lands again at synthetic events (Chapter 4.7.6) and at portals (Chapter 4.6.5 — a portal renders into a different DOM subtree but events still bubble through the React tree). The `AbortController` listener cleanup pattern lands again at `AbortSignal` in Chapter 2.7.4 (in retrospect) and at the `useEffect` cleanup discipline in Chapter 4.9.2. Each forward reference is planted at the call site.

This chapter ships short code snippets and a heavy dose of exercises — `Buckets` for the attribute-vs-property split, `Matching` for events to their phase, `CodeReview` for the canonical pitfalls, `PredictOutput` for tricky cases (a `change` event on a checkbox in capture phase, a click on a button inside a stopped-propagation parent). Two figures carry load: a hand-authored SVG of a small DOM tree with node types color-coded, and an interactive widget that shows an event traveling through capture → target → bubble with clickable handlers at each level. The chapter is recognition-and-vocabulary work; the wiring lessons in Unit 4 cash in.

The chapter ordering follows the dependency. The DOM-as-tree lesson comes first because attributes-vs-properties and events both live on element objects. The attribute/property lesson comes second because event handling depends on knowing what a property is (a handler attached via `onclick` property vs. `addEventListener` is a property write). The event model comes third because it's the most mechanically detailed lesson and lands on the access surface the first lesson installed.

---

## Lesson 3.5.1 — The DOM as a tree of nodes

Topics to cover:

- The chapter-opening senior question: the browser parsed the HTML the server sent. The student opens DevTools, expands the Elements panel, and sees a tree that looks like the HTML — but with subtle differences (a `<div>` the user typed into shows its new content; an attribute the server set has been mutated; a node the framework portaled into `<body>` appears outside the React tree). What is that tree, where does it come from, and what's the relationship to the HTML source? The naive answer is "it's the HTML." The senior answer names the DOM as a live tree of typed node objects, independent of the source from the moment parsing finished. The lesson installs the model.
- **The DOM as a tree of node objects, not text.** When the browser receives HTML, the parser walks the bytes and builds a tree. Each tag becomes an `Element` node. Each piece of text between tags becomes a `Text` node. Comments become `Comment` nodes. The root is the `Document` object (one per page, exposed in JavaScript as `document`). The `<html>` element is the document's single element child; under it, `<head>` and `<body>` and so on, exactly mirroring the nesting in the source. After parsing, the HTML source is gone — the browser holds the tree in memory and every later operation reads and mutates the tree.
- **The node type hierarchy**, named at the depth a senior reads:
  - **`Node`** is the abstract base. Every node (element, text, comment, document, document fragment) inherits from `Node`. Methods on `Node` are universal: `parentNode`, `childNodes`, `firstChild`, `lastChild`, `nextSibling`, `previousSibling`, `appendChild`, `removeChild`, `nodeName`, `nodeType`.
  - **`Element`** extends `Node`. Every HTML tag (`<div>`, `<button>`, `<input>`) becomes an `Element` or one of its subclasses. `Element` adds attribute access (`getAttribute`, `setAttribute`), the children-only tree (`children` excludes text and comment nodes), and the query methods (`querySelector`, `querySelectorAll`).
  - **`HTMLElement`** extends `Element` and is the parent class of every HTML-tag-specific class (`HTMLButtonElement`, `HTMLInputElement`, `HTMLAnchorElement`, `HTMLDivElement`). It adds the surface every HTML element needs: `style`, `dataset`, `hidden`, `tabIndex`, `focus()`, `blur()`, `click()`.
  - **Tag-specific subclasses** like `HTMLInputElement` add the properties unique to that element (`value`, `checked`, `disabled`, `form`, `validity`, `setCustomValidity`). The senior reach: when TypeScript types a `useRef` (`useRef<HTMLInputElement | null>(null)`), the type is one of these subclasses; the IDE's autocomplete walks the chain.
  - **`Text`, `Comment`, `DocumentFragment`** — the non-element node types. `Text` nodes hold the text between tags; `Comment` nodes hold `<!-- -->` content; `DocumentFragment` is a parentless container for batching DOM operations off-tree before inserting (rarely written by hand in 2026 — React handles this).
  - The senior reach: the type hierarchy is what TypeScript's DOM types model. The student reading `Element | null` from a `querySelector` understands why narrowing to `HTMLInputElement` is needed before `.value` is readable.
- **The two trees: nodes and elements.** Two sibling tree views on the same data:
  - **`node.childNodes`** is a `NodeList` of all children including text and comment nodes. A `<div>foo</div>` has one child — a `Text` node containing `"foo"`. A `<div> </div>` has one child — a `Text` node containing a single space. Walking `childNodes` returns every gap.
  - **`element.children`** is an `HTMLCollection` of only the element children. Text and comments are excluded. A `<div>foo</div>` has zero `children`; a `<div><span>foo</span></div>` has one child (the `<span>`).
  - **The senior reach.** The student almost always wants `children`. Walking `childNodes` is the reach when whitespace and comments matter — extremely rare in 2026 application code. Most code paths run through `querySelectorAll`, `closest`, or React refs and never traverse manually.
- **`NodeList` vs. `HTMLCollection`** — the live-vs-static distinction:
  - **`HTMLCollection`** is *live*. `document.getElementsByTagName('div')` returns a `HTMLCollection` that updates as the DOM changes — a `<div>` added after the call appears in the collection on the next iteration. Reading `.length` is computed each time.
  - **`NodeList`** is usually *static*. `document.querySelectorAll('div')` returns a `NodeList` that's a snapshot — a `<div>` added after the call does *not* appear. Reading `.length` is the count at the moment of the call.
  - **The exception that bites.** `node.childNodes` returns a `NodeList` that *is* live (the `NodeList` returned by `getElementById('list').childNodes` reflects current children). The 2026 senior reach: don't depend on the distinction; iterate to an array (`Array.from(collection)` or `[...collection]`) when stable iteration is needed.
- **The access surface a senior reaches for**, named with the canonical use site:
  - **`document.getElementById(id)`** — the fastest selector for a known ID. Returns `Element | null`. The reach: when an external script needs to find a known node (a portal target, an analytics container the SaaS exposes by convention).
  - **`document.querySelector(selector)`** — the modern reach. Takes any CSS selector and returns the first match or `null`. Slower than `getElementById` (by a factor that doesn't matter outside hot paths) but the universal tool.
  - **`document.querySelectorAll(selector)`** — same syntax, returns a static `NodeList` of every match. Iterates with `for...of` or `forEach` (`NodeList` has `forEach`; `HTMLCollection` does not — the inconsistency is real).
  - **`element.closest(selector)`** — walks up the tree from the element to the nearest ancestor (including itself) that matches the selector. The canonical reach for event delegation: in a click handler on a list parent, `event.target.closest('[data-row]')` finds the row that was clicked even if the click landed on a nested span.
  - **`element.matches(selector)`** — boolean check whether the element matches a selector. Used inside delegation handlers to filter targets.
  - **The legacy reaches the student should recognize but skip.** `getElementsByClassName`, `getElementsByTagName`, `getElementsByName` — pre-`querySelector` APIs that return live `HTMLCollection`s. Named once for recognition; the senior reach in 2026 is `querySelector` and `querySelectorAll`.
- **The access surface in 2026 React + Next.js code.** Almost none of these methods get written in application code. The student writes:
  - **`useRef<HTMLInputElement>(null)`** to hold a reference to a node managed by JSX. The ref's `.current` is the `HTMLInputElement` (or `null` before mount). `inputRef.current?.focus()` runs imperative DOM commands. Chapter 4.8.6 owns the depth.
  - **Portals** (Chapter 4.6.5) render into a different part of the tree. The portal's target is named by ID and the framework resolves it (`document.getElementById('toast-root')`); the application doesn't usually write the lookup.
  - **The DevTools snippet or the one-off debugging line** — `$0` in the console (the currently-selected element), `document.querySelectorAll('button:not([type])')` to audit accessibility, `document.activeElement` to find what's focused.
  - The senior reach: the DOM access surface is the API to read and write, but day-to-day SaaS code rarely calls it. The chapter installs vocabulary; Unit 4 installs the JSX surface that does the calling.
- **Traversal: navigating the tree.** Named for completeness, dismissed for application code:
  - **Element-only traversal.** `parentElement`, `firstElementChild`, `lastElementChild`, `nextElementSibling`, `previousElementSibling`, `childElementCount`. The senior reach when manual traversal is needed (rare).
  - **Node traversal** (including text nodes). `parentNode`, `firstChild`, `lastChild`, `nextSibling`, `previousSibling`, `childNodes`. The reach when whitespace or comments matter (extremely rare).
  - **`closest`** for upward walk; nothing equivalent for downward walk that isn't a query.
- **Mutation: writing to the tree.** Named for completeness, dismissed for React code:
  - **`element.appendChild(node)`**, **`element.insertBefore(newNode, referenceNode)`**, **`element.removeChild(node)`**, **`parent.replaceChild(newNode, oldNode)`** — the legacy reach. Live, mutating, manual.
  - **`element.append(...nodes)`**, **`element.prepend(...nodes)`**, **`element.before(...nodes)`**, **`element.after(...nodes)`**, **`element.remove()`**, **`element.replaceWith(...nodes)`** — the modern API. Variadic, accepts both nodes and strings (strings become text nodes), more ergonomic.
  - **`element.innerHTML = '<div>...</div>'`** — parses and inserts. The senior watch-out: any string from user input here is an XSS vulnerability. React's escaping (Chapter 9.4.4) handles this for JSX; `dangerouslySetInnerHTML` opts out. Named here for recognition; full treatment at the security baseline.
  - **The senior reach in 2026.** React handles DOM mutation. Direct mutation is the imperative escape hatch — focusing an input, scrolling to an element, measuring layout. A direct `appendChild` in application code is usually a sign the component should own the structure in JSX instead.
- **`document.body`, `document.head`, `document.documentElement`** — the canonical entry points. `document.documentElement` is the `<html>` element. `document.head` is `<head>`. `document.body` is `<body>`. The senior reach: scripts that need to attach event listeners at the document level (`document.addEventListener('keydown', ...)` for a global keyboard shortcut), append a portal container, or read the root font size for responsive design.
- **`document.createElement(tagName)`** — the constructor for new elements. The element starts off-tree; it's only visible after being appended somewhere. The 2026 reach: when integrating a non-React library that needs DOM nodes (a chart library, a video player) and the integration is wrapped in a `useEffect` that creates the node, appends it, and removes it on cleanup. Application code that wants new visual elements writes JSX.
- **The Elements panel in DevTools**, named as the chapter's instrument. The Elements panel shows the live DOM tree as it exists right now — not the HTML source. Three observations the student should make on every open:
  - **Live updates.** Edit a field, the tree updates. Run JavaScript in the console, the tree updates. The Elements panel is a window onto the live tree, not a static rendering of the HTML.
  - **The differences from "View Source."** The "View Source" command shows the HTML the server sent. The Elements panel shows what the DOM looks like *now*. The difference between them is every modification any script has done — React's mount, the user's keystrokes, the framework's portal nodes. Hydration mismatches (Chapter 5.2.8) live exactly here: the source HTML and the DOM that React expected disagree.
  - **The `$0` shortcut.** Whatever element is currently selected in the Elements panel is bound to `$0` in the Console. The senior reach for ad-hoc DOM debugging: select the element, then run `$0.getBoundingClientRect()`, `$0.attributes`, `$0.dataset` in the Console.
- **`MutationObserver`**, named in one paragraph for recognition. The asynchronous API that fires a callback when the DOM is mutated — children added or removed, attributes changed, text content changed. The reach: tooling that needs to react to DOM changes outside its control (a third-party widget watching for its container being removed, a test runner waiting for a node to appear). Application code rarely writes against it — React owns the mutation pace. Named for the boundary.
- **The watch-outs a senior names**:
  - **A `querySelector` selector is a *CSS* selector, not a jQuery extended selector.** `:contains('text')`, `:visible`, `:has` (well, `:has` is now standard) — the legacy jQuery extensions are not part of standard CSS. The senior writes selectors that any browser understands.
  - **`querySelector` returns `Element | null`. TypeScript requires a narrowing step before tag-specific properties are accessible.** `const input = document.querySelector('input') as HTMLInputElement` (the assertion is the senior reach when the selector is known good); the safer pattern is `if (!(input instanceof HTMLInputElement)) throw new Error(...)`.
  - **`getElementById` and `querySelector` walk the tree.** They're not free. The 2026 reflex: cache the result if the same element is accessed repeatedly (the framework handles this for refs).
  - **The DOM is rendered single-threaded.** A long-running JavaScript loop blocks rendering and event handling — the page freezes. The senior watch-out: any operation over a large list (hundreds of thousands of items) belongs on a Web Worker or paginated; the DOM mutation itself isn't usually the bottleneck — script execution is. Chapter 20.3 owns the performance treatment.
  - **`element.dataset`** is the modern reach for reading `data-*` attributes. `<div data-row-id="123">` is read as `el.dataset.rowId` (the kebab-case-to-camelCase translation is automatic). Setting `el.dataset.rowId = '456'` writes the attribute. The senior reach for delegation patterns and for stable hooks into elements from outside React.
  - **Document fragments matter for offline batching.** When inserting many nodes at once, building them inside a `DocumentFragment` and appending the fragment is one reflow instead of many. React handles this; the manual reach is for non-React integration.

What this lesson does not cover:

- The attribute-vs-property distinction (3.5.2).
- The DOM event model and event handling (3.5.3).
- Hydration and hydration mismatches (Chapter 5.2.8).
- React refs, `useRef`, and the JSX surface to DOM nodes (Chapter 4.8.6).
- Portals and the cross-tree rendering pattern (Chapter 4.6.5).
- `MutationObserver`, `IntersectionObserver`, `ResizeObserver` at depth — out of scope.
- Web Workers and the off-main-thread model — out of scope.
- The Shadow DOM and Web Components — out of scope (not in the course's stack).
- The legacy DOM APIs (`getElementsByName`, `document.all`, `document.forms`) — named once and dismissed.
- The accessibility tree (the parallel tree screen readers consume) — Chapter 4.11 owns the accessibility baseline.

Pedagogical approach:

Concept archetype with a reference beat. The lesson teaches a mental model (the DOM as a typed object tree built from HTML at parse time, mutated thereafter) and a small reference surface (`querySelector`, `closest`, traversal, the live-vs-static collection split). The deliverable is recognition vocabulary — the student names node types, reads the Elements panel correctly, distinguishes `childNodes` from `children`, and writes `useRef<HTMLInputElement>(null)` knowing what the generic argument means.

Open with the senior question and an Elements-panel screenshot — a small DOM tree with an HTML source shown alongside, with one difference between them (an attribute the server set has been changed by client-side JavaScript). A `MultipleChoice` exercise pits four explanations of the difference (the HTML source was wrong — no; the Elements panel is showing the source — no; the DOM is independent of the source after parsing and reflects mutations — yes; the browser re-fetched and got different HTML — no). The discrimination installs the load-bearing point.

A `Figure` with a hand-authored SVG renders a small DOM tree from a four-line HTML snippet. Each node is color-coded by type — `Document` at the root, `Element` nodes (`<html>`, `<body>`, `<div>`, `<button>`) in one color, `Text` nodes (between elements) in a second color, with the JavaScript class names (`HTMLDivElement`, `HTMLButtonElement`) labeled on the elements. The student sees the type hierarchy as a single picture and the existence of text nodes between every visible element.

A `Buckets` exercise sorts ten DOM operations into "reads the tree" or "mutates the tree" — `querySelector`, `appendChild`, `closest`, `setAttribute`, `getBoundingClientRect`, `innerHTML = '...'`, `parentElement`, `dataset.rowId = '...'`, `getElementById`, `remove()`. The discrimination locks in the read/write split.

A second `Buckets` exercise sorts eight collection results into "live" or "static" — `getElementsByTagName('div')`, `querySelectorAll('div')`, `childNodes`, `children`, `getElementsByClassName('row')`, `querySelectorAll('.row')`, `document.forms`, `getElementById('foo').children`. The recognition is concrete.

A `Matching` exercise pairs five DOM types with their canonical subclass — `HTMLInputElement` (the `<input>` with `.value`, `.checked`), `HTMLButtonElement` (the `<button>` with `.type`), `HTMLAnchorElement` (the `<a>` with `.href`), `HTMLFormElement` (the `<form>` with `.elements`), `HTMLImageElement` (the `<img>` with `.src`, `.naturalWidth`). The TypeScript ref vocabulary is locked in.

An `AnnotatedCode` block walks a five-line snippet that runs in a `useEffect` cleanup to integrate a non-React widget — `const node = document.createElement('div'); container.append(node); thirdPartyLib.mount(node); return () => { thirdPartyLib.destroy(); node.remove(); };`. The annotations name each primitive (`createElement` returns an off-tree element, `.append` is the modern variadic API, `.remove` is the modern self-removal). The student sees the senior shape for the rare direct-DOM reach.

A `CodeReview` exercise on a 25-line snippet that mixes the legacy and modern surfaces with three issues: a `getElementsByClassName` whose result is iterated as if static (real `HTMLCollection` is live; if the loop mutates the DOM, iteration breaks), a `selector.innerHTML = userInput` (XSS vulnerability — named for recognition), a `querySelectorAll('.row').forEach(el => el.addEventListener('click', ...))` (per-row listeners that should be delegated — foreshadows 3.5.3). The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on two snippets — `document.body.childNodes.length` on a body with `<div>foo</div><div>bar</div>` and whitespace between them (returns 5 — three element nodes plus two whitespace text nodes), and `document.body.children.length` on the same body (returns 2 — only the elements). The whitespace-text-node observation is concrete.

A small interactive widget (a DOM tree inspector) shows a tiny HTML snippet and the DOM tree built from it. Toggling whitespace in the source shows the text nodes appearing and disappearing in the tree. Clicking a node reveals its `nodeType`, its TypeScript class, and the properties unique to that subclass. The model is tangible.

Close with a `TrueFalse` round of five statements: "The DOM is a string representation of the HTML source" (false — it's a tree of typed objects), "`querySelectorAll` returns a live collection" (false — static; `getElementsByTagName` returns live), "`childNodes` includes text and comment nodes" (true), "`element.append(node)` and `element.appendChild(node)` are interchangeable" (false — `append` is variadic and accepts strings, `appendChild` returns the appended node), "React applications never need direct DOM access" (false — refs, portals, and non-React integration are the named reaches). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Lesson 3.5.2, Chapter 4.7 (React's render model and reconciler), Chapter 4.8.6 (refs), and Chapter 5.2.8 (hydration).

---

## Lesson 3.5.2 — Attributes vs. properties: what HTML serializes vs. what JavaScript reads

Topics to cover:

- The senior question: the student writes `<input value="alice" />` in JSX. The user types "bob" into the field. The student inspects the element in DevTools and sees `value="alice"` on the element's attribute panel. They query `inputEl.value` in the Console and get `"bob"`. How can both be true at once? The naive answer is "they're the same thing." The senior answer names the attribute-vs-property split — the HTML attribute is the initial value the parser read; the DOM property is the live current value JavaScript reads and the user can mutate. The lesson installs the distinction at the depth that hydration mismatches, React prop names, and form handling all depend on.
- **The model in one paragraph.** When the browser parses HTML, each attribute on a tag becomes a string in the element's attribute map. At the same time, for *some* attributes, the browser also populates a property on the element object whose name matches (or is a renamed version of) the attribute. The attribute is the string the parser captured; the property is the live JavaScript value. For some attributes the two stay in sync; for others they diverge in well-defined ways. The senior reach: know which is which by the bug each produces.
- **The canonical examples**, walked one at a time:
  - **`class` attribute vs. `className` property.** The HTML attribute is `class="row selected"`. The DOM property is `el.className` (the string `"row selected"`) or, more usefully, `el.classList` (a `DOMTokenList` with `add`, `remove`, `toggle`, `contains`, `replace`). The rename to `className` happens because `class` is a reserved word in old JavaScript. React's JSX uses `className` because JSX compiles to property writes, not attribute writes. The student writes `<div className="row">` because that's the *property* name. The senior reach: `el.classList.add('selected')` for individual classes; `el.className = '...'` for replacing the whole list (rare).
  - **`for` attribute vs. `htmlFor` property.** The HTML attribute on a `<label>` is `for="user-email"`. The DOM property is `labelEl.htmlFor`. `for` is also a JavaScript reserved word. React's JSX uses `htmlFor` for the same reason. Chapter 4.1.5 owns the form-element treatment; this lesson installs the rename.
  - **`value` attribute vs. `value` property on `<input>`.** The defining example, named at full depth:
    - The HTML attribute `value="alice"` sets the initial value at parse time.
    - The DOM property `inputEl.value` is the *current* value — what the user has typed.
    - When the page loads, both are `"alice"`. When the user types "bob", the property is `"bob"` and the attribute is still `"alice"`.
    - Reading `inputEl.getAttribute('value')` returns `"alice"` (the attribute). Reading `inputEl.value` returns `"bob"` (the property).
    - Calling `inputEl.value = "carol"` updates the property only — the attribute stays `"alice"`. Calling `inputEl.setAttribute('value', 'carol')` updates the attribute — but the property *only updates if the user hasn't typed yet* (the browser distinguishes "default value" from "current value"). The senior watch-out: if the student tries to programmatically reset an input to its default value, setting the attribute doesn't work after a user keystroke; the right reach is to set `inputEl.value = inputEl.defaultValue` or call `inputEl.form.reset()`.
    - **The HTML attribute is the *default* value; the DOM property is the *current* value.** This is one paragraph the senior commits to memory. Hydration mismatches on form inputs (Chapter 5.2.8) live exactly here — the server-rendered HTML has `value="..."` from the database; client-side state has a different current value; React reconciles by writing to the property.
  - **`checked` attribute vs. `checked` property on checkboxes/radios.** The same split. `<input type="checkbox" checked />` parses with the attribute set; the property is `true` after parse. User clicks the checkbox; property flips to `false`; attribute is unchanged. The `defaultChecked` property holds the initial value. React's JSX prop is `defaultChecked` (for uncontrolled) or `checked` paired with `onChange` (for controlled). Chapter 7.3.1 owns the controlled-vs-uncontrolled treatment.
  - **`disabled`, `readonly`, `selected`, `hidden`** — all boolean attributes. The presence of the attribute (any value, or no value at all — `<button disabled>` and `<button disabled="">` and `<button disabled="disabled">` are all equivalent) means true. The absence means false. The DOM property is a boolean. The senior reach for setting them: write the property (`buttonEl.disabled = true`) — the browser keeps the attribute in sync for boolean attributes.
- **The patterns from those examples**, generalized:
  - **Some attributes have identical-name properties** (`id`, `title`, `href`, `src`, `alt`). The property and the attribute stay in sync — setting one updates the other.
  - **Some attributes have renamed properties** (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, `colspan` → `colSpan`). The rename is a JavaScript naming-convention thing (kebab-case attributes become camelCase properties, reserved words get a prefix).
  - **Some attributes are "default value" attributes** (`value` on `<input>`, `checked` on checkboxes, `selected` on `<option>`). The attribute is the *initial* value; the property is the *current* value. The two can diverge after user interaction or script mutation.
  - **Some attributes don't have properties at all** (`aria-*`, `data-*`, custom attributes). The senior reach: read them via `element.getAttribute(name)`; write them via `element.setAttribute(name, value)`. For `data-*`, the modern reach is `element.dataset.fooBar` (the kebab-case-to-camelCase translation; `<div data-row-id="123">` becomes `el.dataset.rowId`).
  - **Some properties don't have attributes at all** (`scrollTop`, `offsetWidth`, `clientHeight`, `value` on `<textarea>` after user input). These are computed by the browser and live only on the property.
- **`getAttribute` vs. property access — when to reach for which**:
  - **For most cases, read the property.** It's faster, type-narrowed (TypeScript knows `inputEl.value` is a string, but `inputEl.getAttribute('value')` returns `string | null`), and reflects the current state.
  - **For `data-*` attributes, read the property via `dataset`.** `el.dataset.rowId` is the modern reach; `el.getAttribute('data-row-id')` works but is verbose.
  - **For `aria-*` attributes, read via `getAttribute`** because the property exists (`el.ariaLabel`, `el.ariaDescribedBy`) but isn't supported everywhere historically. The 2026 reality: the IDL-attribute reflection is good, but the senior often still reads/writes ARIA via the attribute for portability.
  - **For checking whether the attribute is in the *source HTML* (for hydration debugging, server-rendered state inspection)** — `getAttribute` is the only reach. The property may have been mutated; the attribute reflects what was parsed.
- **JSX prop names — the React rename table.** The single most-loaded forward reference for this lesson. JSX is *property syntax*, not attribute syntax. React's prop naming follows the *property* names of the DOM, with one exception: event handlers (`onClick`, `onChange`, etc.) which are React conventions, not DOM properties (Chapter 4.7.6 owns the event surface). The translation table the student commits:
  - `class` → `className`
  - `for` → `htmlFor`
  - `tabindex` → `tabIndex`
  - `colspan` / `rowspan` → `colSpan` / `rowSpan`
  - `maxlength` / `minlength` → `maxLength` / `minLength`
  - `readonly` → `readOnly`
  - `aria-*` and `data-*` → kept as kebab-case (these are written as attributes in JSX because JavaScript doesn't have a camelCase property for arbitrary `data-` and `aria-` names — React handles them specially)
  - `style` → an object, not a string (`<div style={{ color: 'red' }}>` not `<div style="color: red">`)
  - The senior reach: when the IDE complains that JSX doesn't know a prop, the prop is usually the camelCase property name, not the kebab-case attribute name. Chapter 4.1 owns the full JSX-to-HTML treatment; this lesson installs the reason.
- **Boolean attributes and JSX.** In HTML, the presence of the attribute (any value) is true. In JSX, the prop takes a boolean — `<button disabled={true}>` or just `<button disabled>` (shorthand for `disabled={true}`). The compiled output writes the property (`buttonEl.disabled = true`), which the browser keeps in sync with the attribute. The senior watch-out: passing a string to a boolean prop (`<button disabled="false">`) sets the property to a truthy string, disabling the button — the "false" string is truthy. Always pass a boolean.
- **`innerHTML` vs. `textContent` vs. `innerText`**, named for the boundary:
  - **`innerHTML`** — gets and sets the *HTML* inside the element. Reading returns the serialized markup. Setting *parses* the string as HTML and replaces children. The XSS vector for any user-supplied string. React handles this safely; `dangerouslySetInnerHTML` is the explicit opt-out (Chapter 9.4.4).
  - **`textContent`** — gets and sets the *text* inside the element, ignoring tags. Reading returns concatenated text from all descendant text nodes. Setting replaces children with a single text node. Safe — no parsing.
  - **`innerText`** — similar to `textContent` but respects CSS (`display: none` elements are excluded, line breaks are normalized). Slower than `textContent` because it requires layout. The senior reach: `textContent` is the default for setting; `innerText` is the reach when reading "what the user sees."
  - **The senior reach in 2026 React code.** Almost nobody writes these directly. The children of a JSX element are written as JSX children; React handles the underlying property/attribute writes. The reach is for ref-based imperative work — pulling the text content of a measured element, integrating with a clipboard write.
- **Hydration mismatches: the load-bearing forward reference.** Chapter 5.2.8 owns this in depth; this lesson installs the substrate. The bug class:
  - The server renders an `<input value="alice" />`. The HTML reaches the browser.
  - React on the client re-runs the component and sees `defaultValue="alice"` (or similar). It reconciles.
  - If the server rendered something different from what the client expects (a date formatted in the server's timezone, a random ID generated on the server, a `Date.now()` interpolation), React emits a hydration mismatch warning.
  - The warning names the attribute that differs between the server's HTML and the client's expected property. Knowing the attribute-vs-property split is what makes the warning legible. The senior reach: read the warning's named attribute; trace it to the component code; replace the non-deterministic value with one that's stable on both sides (or wrap the render with `'use client'` and skip SSR).
- **The watch-outs a senior names**:
  - **`setAttribute('value', '...')` on a controlled `<input>` after user input does not update what the user sees.** The property is the source of truth after first interaction; the attribute is the default. The senior fix for "reset the input" — `inputEl.value = ''` or `inputEl.form.reset()`.
  - **`setAttribute('disabled', false)` does *not* enable a button.** Boolean attributes are based on presence — `disabled="false"` still has the attribute present, so the button is disabled. The senior reach: `buttonEl.disabled = false` (property), or `buttonEl.removeAttribute('disabled')`.
  - **`element.style` is an object (`CSSStyleDeclaration`), not a string.** `el.style.color = 'red'` is the property write. The HTML `style="color: red"` attribute parses into this object. Setting `el.style = 'color: red'` doesn't work in standard mode — it must be `el.setAttribute('style', '...')` or property-by-property assignment.
  - **`<input type="number">` has a `value` property that's a string, not a number.** `numericInput.value` returns `"42"`, not `42`. The `valueAsNumber` property returns the number. The senior watch-out: form serialization with `FormData` (Chapter 7.3.2) always returns strings; coerce explicitly with Zod (`z.coerce.number()`).
  - **`<select>` has `value` (the selected option's value) and `selectedIndex` (the option index). For multi-select, iterate `select.selectedOptions`.** The senior reach for form handling: read `select.value` for single-select; `Array.from(select.selectedOptions).map(o => o.value)` for multi-select.
  - **`<a href="...">` has a `href` property that's the *resolved* URL, not the string the attribute holds.** `<a href="/dashboard">` on `https://app.example.com/page` parses with `aEl.getAttribute('href')` returning `"/dashboard"` (relative), and `aEl.href` returning `"https://app.example.com/dashboard"` (absolute). The senior reach for reading link targets: the property is the absolute URL the browser navigates to; the attribute is the source string.
  - **`getAttributeNames()` and `attributes`** — the introspection reach. `el.getAttributeNames()` returns the attribute names as an array; `el.attributes` returns a `NamedNodeMap` of attribute nodes. Useful for ad-hoc debugging (the DevTools snippet) or for libraries that need to read every attribute.
  - **Custom attributes have no property by default.** `<div my-custom-attr="value">` has no `el.myCustomAttr` — the attribute lives only on the attribute map. The senior reach: use `data-*` for custom attributes (they get the `dataset` API); use `aria-*` only for actual ARIA semantics.

What this lesson does not cover:

- The DOM tree, node types, and traversal (3.5.1).
- Events and event handling (3.5.3).
- Hydration mechanics and the full hydration mismatch treatment (Chapter 5.2.8).
- Controlled vs. uncontrolled inputs in React, the `useActionState` pattern, native React 19 form handling (Chapter 7.3).
- Form validation through `setCustomValidity` and the Constraint Validation API (Chapter 7.3.7).
- The full JSX-to-HTML mapping (Chapter 4.1).
- ARIA attribute semantics and accessibility (Chapter 4.11).
- The CSSOM, `getComputedStyle`, and CSS-from-JS reads — out of scope here; layout cousins live near Unit 4.
- IDL attributes, the WHATWG DOM spec's "reflection" rules at depth — out of scope.

Pedagogical approach:

Concept archetype with a heavy diagnostic beat. The lesson teaches a mental model (attributes are the parsed initial state; properties are the live current state) and a small reference table (the JSX prop renames, the boolean-attribute pattern, the four canonical input cases). The deliverable is recognition — the student reads a hydration mismatch warning and knows what the attribute/property names mean, writes JSX with `className`/`htmlFor`/`tabIndex` by reflex, and reaches for `el.value` (property) or `el.getAttribute('value')` (attribute) by intent.

Open with the senior question and a Console screenshot — an input with `value="alice"` in the Elements panel and `inputEl.value === "bob"` in the Console after the user typed. A `TrueFalse` exercise on three statements pulls the discrimination: "The attribute and the property always agree" (false), "Setting the attribute always updates the property" (false — for `value` after user input, no), "JSX prop names match property names, not attribute names" (true, with the kebab-case exceptions for `aria-*` and `data-*`).

A `Figure` with a hand-authored SVG renders the `<input value="alice">` example side by side. On the left, the HTML source. On the right, the DOM element with two columns: "attribute (parser state)" showing `value: "alice"`, and "property (live state)" showing `value: "alice"` (initially). Below, an arrow labeled "user types 'bob'" with the right column changing to `value: "bob"` and the left staying. The split is visual.

A `TabbedContent` block organizes the four pattern categories into tabs:
- Tab 1: identical-name pairs (`id`, `title`, `href`, `src`).
- Tab 2: renamed properties (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`).
- Tab 3: default-vs-current pairs (`value`, `checked`, `selected`).
- Tab 4: attribute-only (`data-*`, `aria-*`, custom) and property-only (`scrollTop`, `offsetWidth`).

Each tab names the canonical use case and the JSX prop translation.

A `Matching` exercise pairs eight HTML attributes with their DOM property names — `class` (`className`), `for` (`htmlFor`), `tabindex` (`tabIndex`), `readonly` (`readOnly`), `maxlength` (`maxLength`), `colspan` (`colSpan`), `data-row-id` (`dataset.rowId`), `aria-label` (no camelCase property — accessed via `getAttribute('aria-label')` or the equivalent property). The translation table is locked in.

A `Buckets` exercise sorts ten property/attribute references into "this is the *attribute* you want" or "this is the *property* you want" — checking whether a button is currently disabled (property), reading the original value of an input (attribute), updating a class list (property — `classList.add`), serializing the current DOM state for a snapshot (attributes), reading the user's current text in an input (property), reading a `data-row-id` (property — `dataset`), debugging a hydration mismatch (attributes), checking a checkbox state (property), reading the resolved URL of an anchor (property), reading a custom attribute the application set (attribute via `getAttribute`). The discrimination is concrete.

A `PredictOutput` exercise on three snippets:
1. Set `<input value="alice">` in HTML, then in JavaScript `input.value = 'bob'`. Then `input.getAttribute('value')` returns `"alice"` (attribute unchanged); `input.value` returns `"bob"`.
2. `<button disabled="false">` — the button is *disabled* (the attribute is present, even with value `"false"`).
3. `<input type="number" value="42">`, then `input.value` returns `"42"` (string), `input.valueAsNumber` returns `42` (number).

The trap-and-fix shape locks in the failure modes.

An `AnnotatedCode` block walks a 15-line snippet of a "reset this input to its initial value" Server Action wired through a ref. Annotations highlight: the ref typed as `useRef<HTMLInputElement | null>(null)`, the imperative `inputRef.current?.form?.reset()` (the right reach), the wrong reach `inputRef.current?.setAttribute('value', '...')` shown as a comment with the explanation. The student sees the senior pattern.

A `CodeReview` exercise on a 30-line snippet that mixes JSX and direct DOM access with five issues:
- `<input class="row" />` in JSX (should be `className`).
- `<label for="email">` in JSX (should be `htmlFor`).
- `<button disabled="false">` (boolean prop must be `disabled={false}` or omit).
- `el.setAttribute('value', '...')` to reset a form (uses the wrong reach — should be property or `form.reset()`).
- `dangerouslySetInnerHTML={{ __html: userInput }}` (XSS — named here, full treatment in Chapter 9.4.4).

The student leaves a comment per issue with the senior fix.

Close with a `MultipleChoice` exercise on the load-bearing point: given the scenario "React's hydration warning says `Server: value='alice'; Client: value='bob'`," pick the right diagnosis (the server rendered the attribute as `alice` because that's what the database held at render time; the client's React component has a different current value; the fix is to make the initial render deterministic between server and client, or to wrap with `'use client'` and skip SSR for that subtree).

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.1 (JSX surface), Chapter 4.7 (refs and the render model), Chapter 5.2.8 (hydration mismatches), and Chapter 7.3 (forms).

---

## Lesson 3.5.3 — The DOM event model: bubble, capture, delegation, passive

Topics to cover:

- The senior question: the student writes a list page with 500 rows. Each row has a "delete" button. The naive reach is to attach a click handler to each button — 500 listeners, 500 closure references, 500 cleanup obligations if the list mutates. The senior reach is one handler on the list parent that reads `event.target.closest('[data-row]')` to find which row was clicked. Why? The DOM event model — events bubble from the target up through every ancestor, and a single ancestor listener catches them all. The lesson installs the model: capture, target, bubble; delegation as the canonical pattern; `passive`/`once`/`signal` as the modern options; `preventDefault` vs. `stopPropagation` as a decision; `AbortController` as the 2026 cleanup reach.
- **The three event phases**, named with a single canonical example. The user clicks a `<button>` inside a `<form>` inside the `<body>`:
  - **Phase 1: capture.** The event travels from `document` down to the target, firing capture-phase listeners on each ancestor in order (document → body → form → button). Capture listeners are rare in application code — they exist for cases where the parent wants to intercept events before the child sees them (a focus trap closing a modal, a global keyboard shortcut handler).
  - **Phase 2: target.** The event fires on the target element itself. Both capture-phase and bubble-phase listeners on the target run.
  - **Phase 3: bubble.** The event travels back up from the target to `document`, firing bubble-phase listeners on each ancestor in order (button → form → body → document). Bubble is where the vast majority of handlers live — `addEventListener(type, handler)` defaults to bubble phase.
  - **The three-phase model is symmetric.** The same set of ancestors is walked in both directions; the only difference is which listeners fire. The student commits the picture: the event starts at the root, dives down to the target, then climbs back out.
- **`addEventListener` — the canonical surface.** The signature is `target.addEventListener(type, listener, options)`. The `type` is the event name (`'click'`, `'submit'`, `'keydown'`). The `listener` is a function that receives an `Event` object. The `options` is either a boolean (legacy — `true` for capture, `false` for bubble) or an object (modern — with `capture`, `once`, `passive`, `signal`).
  - **`capture: true`** — attach to the capture phase. The default is `false` (bubble).
  - **`once: true`** — auto-remove after the first invocation. The senior reach when a listener should fire exactly once (a one-time tooltip, an animation-end handler).
  - **`passive: true`** — promise to the browser that the handler will not call `preventDefault`. Required for scroll, touch, and wheel listeners (see below). The senior default for any non-cancelable interaction.
  - **`signal: controller.signal`** — bind the listener's lifetime to an `AbortController`. When `controller.abort()` is called, the listener is removed automatically (along with every other listener attached with the same signal). The 2026 reach for cleanup.
- **`AbortController` for listener cleanup — the 2026 reach.** The legacy pattern was `el.removeEventListener(type, handler, options)` with the same arguments as `addEventListener`. The watch-outs: the handler must be the same function reference (an inline arrow rebinds and can't be removed), the options must match the original. The 2026 reach:
  ```ts
  const controller = new AbortController();
  el.addEventListener('click', handler, { signal: controller.signal });
  window.addEventListener('keydown', otherHandler, { signal: controller.signal });
  // ...later...
  controller.abort(); // removes both
  ```
  The pattern integrates cleanly with `useEffect` cleanup (Chapter 4.9.2 owns the depth):
  ```tsx
  useEffect(() => {
    const controller = new AbortController();
    el.addEventListener('click', handler, { signal: controller.signal });
    return () => controller.abort();
  }, []);
  ```
  The senior reach: one `AbortController` per effect; abort it on cleanup; every listener with that signal is freed in one call. Chapter 2.7.4 introduced `AbortController` for fetch cancellation; the cleanup story unifies here.
- **Event delegation — the load-bearing pattern.** The lesson's deliverable:
  - **The problem.** A list with 500 rows. Each row has a "delete" button. The naive reach attaches 500 click listeners. The cost: 500 closure references in memory; 500 cleanup obligations if the list mutates; 500 references that the GC can't collect while the listeners are attached.
  - **The pattern.** One handler on the list parent. When a click fires anywhere inside the parent, the event bubbles up; the parent's handler catches it; `event.target.closest('[data-row-id]')` finds the row that was clicked; `event.target.matches('[data-action="delete"]')` filters for the delete button specifically.
  - **The canonical shape**:
    ```ts
    listEl.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
      if (!button) return;
      const row = button.closest<HTMLElement>('[data-row-id]');
      if (!row) return;
      const action = button.dataset.action;
      const rowId = row.dataset.rowId;
      // dispatch by action and rowId
    });
    ```
  - **Why React doesn't usually need this.** React's synthetic event system (Chapter 4.7.6) attaches a single listener at the document root for each event type and dispatches to the right React component. Application code that writes `<button onClick={handleDelete}>` per row gets delegation-like behavior for free — the JSX prop doesn't actually attach a DOM listener per button. The lesson installs the model so when a non-React integration needs delegation (a third-party library, a custom DOM widget, an analytics hook), the student writes it correctly.
  - **The `data-*` attribute as the stable hook.** Delegation hangs on `dataset` — `data-row-id`, `data-action`, `data-tab`. Class names are too fragile (a CSS refactor renames them); IDs don't repeat. The senior reach for any DOM that's read by a delegation handler: name the data hook explicitly. Chapter 3.5.1 introduced `dataset`; this lesson cashes it in.
- **`event.target` vs. `event.currentTarget`** — the load-bearing distinction inside a delegation handler:
  - **`event.target`** is the element the event originated on. In the delegation example, `event.target` is the button (or even the icon inside the button — events fire on the deepest element the user clicked).
  - **`event.currentTarget`** is the element the listener is attached to. In the delegation example, `event.currentTarget` is the list parent.
  - **The senior watch-out.** Inside a delegated handler, `event.target` is what was clicked; `event.currentTarget` is the listener's owner. Never confuse them; the bug is hard to diagnose because each value is sometimes the right one for the question being asked.
- **`preventDefault` vs. `stopPropagation`** — the decision:
  - **`event.preventDefault()`** — cancels the browser's default behavior for the event. The classic uses: prevent a form submission from navigating, prevent a link click from navigating, prevent a checkbox from toggling. The event still propagates to other listeners; only the browser's default action is suppressed.
  - **`event.stopPropagation()`** — stops the event from continuing through the phases. Listeners further along the propagation path (parents on bubble, children on capture, or other listeners on the current target after this one) don't fire. The default action *still happens* unless `preventDefault` is also called.
  - **`event.stopImmediatePropagation()`** — stops propagation *and* prevents any other listener on the same element from firing for this event.
  - **The senior reach.** `preventDefault` is the common one — most handlers need to cancel a default action. `stopPropagation` is the rare reach and should be used sparingly: stopping propagation hides events from analytics, focus-trap libraries, and outside-click handlers in modal dialogs that listen on the document. The senior reflex: don't reach for `stopPropagation` unless you can name the specific listener it's hiding from. Chapter 4.6.5 (portals) and Chapter 4.11.4 (focus management) both cash this in.
- **Passive event listeners — the scroll/wheel/touch reach:**
  - **The model.** When a listener might call `preventDefault` on a scroll, wheel, or touch event, the browser has to wait for the listener to run before it can scroll. The latency shows up as a jank on touch devices. By marking the listener as `passive: true`, the developer promises not to call `preventDefault`, and the browser starts scrolling immediately while the listener runs in parallel.
  - **The default.** Modern browsers default `wheel`, `touchstart`, and `touchmove` listeners attached to `window`, `document`, or `body` to passive — calling `preventDefault` in those listeners is silently ignored, with a console warning. Listeners attached to specific elements (a div) default to non-passive.
  - **The senior reach.** Pass `{ passive: true }` explicitly for any scroll/wheel/touch listener that just observes. Pass `{ passive: false }` only when the listener genuinely needs to cancel the scroll (a pull-to-refresh implementation, a custom gesture).
  - **The recognition signal.** A console warning "Added non-passive event listener to a scroll-blocking event" is the senior reflex's call — set passive.
- **The event surface a senior reads**, named at the lesson's depth:
  - **Mouse events** — `click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseenter`/`mouseleave` (don't bubble), `mouseover`/`mouseout` (bubble).
  - **Keyboard events** — `keydown`, `keyup`, `keypress` (deprecated; use `keydown`). The senior reach: `event.key` for the character ('Enter', 'Escape', 'a'); `event.code` for the physical key (`KeyA`, `Enter`); `event.shiftKey`/`event.ctrlKey`/`event.metaKey` for modifiers.
  - **Form events** — `input` (fires on every change), `change` (fires on commit — blur for text, click for checkbox/radio, change for select), `submit` (on the form), `focus`/`blur` (don't bubble), `focusin`/`focusout` (bubble).
  - **Touch and pointer events** — `pointerdown`, `pointerup`, `pointermove`, `pointercancel`. The 2026 senior reach: pointer events unify mouse, touch, and pen; the legacy `touchstart`/`touchmove`/`touchend` are still common but pointer events are the better target.
  - **Drag and drop** — `dragstart`, `dragover`, `drop`, etc. Out of scope for this lesson; named once.
  - **Window/document events** — `load`, `DOMContentLoaded`, `beforeunload`, `popstate`, `hashchange`, `online`/`offline`, `visibilitychange`. Each has a canonical SaaS use case (e.g., `visibilitychange` for pausing background activity when the tab is hidden, `popstate` for handling browser back/forward in a manually-managed history).
- **`new Event` and `new CustomEvent`** — dispatching events from code:
  - **`new CustomEvent('my-event', { detail: { ... }, bubbles: true })`** creates an event with a custom name and payload. `element.dispatchEvent(event)` fires it on the element. The senior reach: cross-component or cross-framework communication where a shared event bus is overkill. Web Components rely on this; SaaS apps rarely write custom DOM events because React state is the better channel.
  - **`new Event('click')`** programmatically fires a built-in event. The senior reach for testing or for triggering form submission imperatively. The 2026 reach for programmatic clicks: `el.click()` is usually simpler.
- **Synthetic events vs. DOM events — the React forward reference.** Chapter 4.7.6 owns this in depth; the lesson installs the substrate:
  - React wraps DOM events in a `SyntheticEvent` object that normalizes cross-browser differences and adds a few conveniences. The interface is nearly identical to the native event, with the same `preventDefault`/`stopPropagation`/`currentTarget`/`target` surface.
  - **React 17+ attaches event listeners at the React root (the element that hosts the React tree), not the document.** A single delegated listener per event type handles the entire tree. JSX `onClick` is React's synthetic event, not a DOM `addEventListener('click', ...)`.
  - **`stopPropagation` on a React synthetic event stops *React's* propagation, not the underlying DOM propagation.** The DOM event keeps bubbling; only React-installed handlers further up stop firing. The senior watch-out: if a global DOM listener (an analytics hook installed via `addEventListener` directly on `document`) needs to see events, React's `stopPropagation` doesn't block it. Chapter 4.7.6 cashes in.
  - **Portals (Chapter 4.6.5)** are the interesting case: a portal renders into a different part of the DOM tree, but events bubble through the React component tree, not the DOM tree. A click on a modal rendered in a portal still bubbles up to the React parent that opened the modal — surprising, useful for "click outside" logic when written through React, surprising when reasoning about the DOM.
- **The watch-outs a senior names**:
  - **Listeners attached without a cleanup path leak memory.** A `useEffect` that attaches a `window` listener without cleanup leaves the listener attached after unmount; the closure references the component's state forever; the GC can't free anything. The senior reflex: every `addEventListener` outside React's JSX prop system has a matching `removeEventListener` or an `AbortController.abort()`.
  - **Per-row listeners cost.** Attaching one listener per row in a 500-row list is a measurable footprint. React's prop-based handlers in JSX *don't* attach per-element listeners (the synthetic event system delegates), so the cost is gone for React app code; it returns for any non-React integration.
  - **Inline arrow functions in `addEventListener` can't be removed.** `el.addEventListener('click', () => handle())` creates a new function on each call; `el.removeEventListener('click', () => handle())` doesn't match because it's a different function. The senior reach: hoist the function to a stable reference, or use `AbortController`.
  - **`event.preventDefault()` on a form submit is the senior reach when you want to handle the submit yourself.** The native React 19 form pattern (Chapter 7.3) uses Server Actions that handle this implicitly; manual `addEventListener('submit', ...)` integrations need explicit `preventDefault`.
  - **`focus` and `blur` events don't bubble.** Use `focusin` and `focusout` (which do bubble) if you need to listen at a parent level for focus changes within a subtree. Chapter 4.11.4 owns the focus management treatment.
  - **The `click` event doesn't fire on disabled buttons.** A `<button disabled>` swallows clicks at the DOM level — the event isn't dispatched. The senior watch-out for debugging: if a click handler isn't firing, check the button's `disabled` property first.
  - **The order of multiple listeners on the same element is insertion order.** `el.addEventListener('click', a); el.addEventListener('click', b);` runs `a` then `b` on every click. `stopImmediatePropagation` in `a` prevents `b` from firing.
  - **The `event` object is mutable but its mutations don't persist.** Setting `event.target = '...'` doesn't change the event; properties are read-only via the spec, though some browsers don't enforce. Treat the event as read-only.
  - **`pointerdown` is the 2026 default for "user pressed something" handlers** — it fires for mouse, touch, and pen uniformly. `click` is still the right reach for *activation* (focusable elements, screen reader interaction). The senior reach: `pointerdown` for drag start, custom gestures; `click` for "the user wants to activate this."
  - **`event.isTrusted`** is `true` for events the user actually generated, `false` for events dispatched programmatically by `dispatchEvent`. The senior reach: a paranoid handler can check `event.isTrusted` for actions that should only happen on real user interaction (a confirmation dialog, a payment action). Most code doesn't need this.

What this lesson does not cover:

- The DOM tree and node types (3.5.1).
- Attributes vs. properties (3.5.2).
- React's synthetic event system at depth (Chapter 4.7.6).
- Refs, `useRef`, and the JSX-to-DOM bridge (Chapter 4.8.6).
- `AbortController` for fetch cancellation, `AbortSignal.timeout`, `AbortSignal.any` (Chapter 2.7.4).
- `useEffect` cleanup discipline (Chapter 4.9.2).
- Focus management at depth — modals, route changes, post-submission (Chapter 4.11.4).
- Pointer event gesture libraries, drag-and-drop frameworks — out of scope.
- Web Components and custom event design — out of scope.
- The IntersectionObserver, ResizeObserver, MutationObserver event-shaped APIs — out of scope.
- `WebSocket`, `EventSource`, and other non-DOM event surfaces (Chapter 3.6).

Pedagogical approach:

Concept-plus-mechanics archetype with a strong pattern beat. The lesson teaches a model (three phases, propagation, delegation) and the API options the model exposes (`capture`, `once`, `passive`, `signal`). The deliverable is the delegation pattern as a senior reflex — when the student sees a list with per-row handlers, the corner of their mind hears "delegate" and "AbortController."

Open with the senior question and a `MultipleChoice` exercise — given a 500-row list with per-row delete buttons, pick the senior reach (500 listeners — wrong, memory cost; delegation on the parent — right; React's synthetic event handles this for free in JSX, write the `onClick` per row — right for React code; use `MutationObserver` to attach listeners as rows are added — wrong, over-engineered). The discrimination installs delegation as the canonical pattern.

A `Figure` with an interactive widget renders a small DOM tree (document → body → form → button) with the event traveling capture → target → bubble. The student clicks handlers at each level (with capture or bubble selected) and watches the event's path. A side panel shows which handlers fire in which order. The model is tangible.

A `TabbedContent` block organizes the `addEventListener` options into four tabs: `capture` (the rare phase reach), `once` (auto-remove after first invoke), `passive` (the scroll/wheel/touch promise), `signal` (the `AbortController` cleanup). Each tab has the canonical use case and a one-line watch-out.

A `Buckets` exercise sorts ten event-handler scenarios into "use delegation (one listener)" or "attach per element" — a list of 500 rows with delete buttons (delegation), a single modal close button (per element), a navbar with five links and analytics on each click (delegation on the nav), a form's submit handler (per element on the form), tooltips on every word in a paragraph (delegation on the paragraph), a custom dropdown's option clicks (delegation), a button group with per-button handlers (could go either way; per-element is fine for small static counts), a dynamically-added list that grows (delegation by default), a single search input's keystroke handler (per element), drag handlers on a sortable list (delegation). The discrimination locks in.

A `Matching` exercise pairs five event types with the phase they typically run in and whether they bubble — `click` (bubbles, target/bubble phase), `submit` (bubbles, target/bubble), `focus` (does *not* bubble), `focusin` (bubbles — the alternative to `focus`), `mouseenter` (does *not* bubble — the non-bubbling variant of `mouseover`). The bubbling-vs-not vocabulary is locked in.

An `AnnotatedCode` block walks the canonical delegation pattern in vanilla JavaScript — the list parent, the `click` handler, `event.target.closest('[data-action]')`, the `dataset` lookup, the dispatch. Annotations highlight the four parts: the listener attached once on the parent (not per row), the `closest` walk that handles clicks on nested children (icons inside buttons), the `data-*` attribute as the stable contract between markup and handler, the early return when the click isn't on an actionable target.

A second `AnnotatedCode` block walks the React JSX equivalent — `<ul>{rows.map(row => <li key={row.id}><button onClick={() => handleDelete(row.id)}>Delete</button></li>)}</ul>` — and annotates that React's synthetic event system installs *one* listener at the React root, dispatches per component. The student sees that the JSX form is delegation behind the scenes; the manual pattern is the escape hatch for non-React integrations.

A third `AnnotatedCode` block walks the `AbortController` cleanup pattern inside a `useEffect`. Annotations highlight: one controller per effect, listener attached with `{ signal: controller.signal }`, cleanup function calling `controller.abort()` which removes every listener bound to the signal. Chapter 4.9.2 owns the depth; this lesson installs the shape.

A `CodeReview` exercise on a 35-line snippet with five issues:
- A scroll listener without `{ passive: true }` causing main-thread jank (the console warning the student should recognize).
- A `useEffect` that attaches a `window.addEventListener('keydown', ...)` with no cleanup (memory leak on unmount).
- A delegation handler that checks `event.target.matches(...)` but doesn't use `closest` (misses clicks on nested children — the icon inside the button).
- A modal's outside-click handler that uses `event.stopPropagation()` inside its content (breaks the outside-click logic that listens on `document`).
- An `addEventListener('click', () => ...)` with a corresponding `removeEventListener('click', () => ...)` (different function references; the listener is never removed).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three event-flow scenarios:
1. Three nested elements (`document`, `body`, `button`) each with a `click` listener; the user clicks the button; predict the firing order (button → body → document on bubble).
2. The same setup, but the body's listener has `capture: true`; predict the order (body capture → button target → document bubble; document was added as bubble so it goes last).
3. The button is disabled; predict whether any listener fires (no — `click` doesn't fire on disabled buttons).

The mechanical predict-the-order locks in the model.

A `TrueFalse` round of five statements: "`event.stopPropagation()` cancels the browser's default action" (false — that's `preventDefault`), "`focus` events bubble" (false — use `focusin`), "An inline arrow function passed to `addEventListener` can be removed later by passing the same code to `removeEventListener`" (false — different function references), "`addEventListener` with `{ once: true }` removes the listener after it fires" (true), "React's `onClick` attaches a native DOM `click` listener to each element" (false — synthetic events delegate at the root). The vocabulary is locked in.

Close with a `SandboxCallout` offering an interactive playground where the student can build a delegation handler against a small list, watch the event's path through DevTools, and experiment with `passive`, `once`, and `AbortController`. Optional; gives the student a free-play moment after the structured exercises.

Estimated student time: 55 to 65 minutes. Load-bearing for Chapter 4.7.6 (synthetic events), Chapter 4.8.6 (refs), Chapter 4.9.2 (useEffect cleanup), Chapter 4.11.4 (focus management), and Chapter 4.6.5 (portals).

---

## Lesson 3.5.4 — Quiz

Top ten topics to quiz:

1. The DOM as a tree of typed objects built from the HTML at parse time; mutations after parse update the tree, the HTML source never changes; "View Source" vs. Elements panel.
2. The node type hierarchy — `Node` → `Element` → `HTMLElement` → tag-specific subclasses (`HTMLInputElement`, `HTMLButtonElement`); the TypeScript `useRef<HTMLInputElement>` generic walks this chain.
3. `childNodes` (live `NodeList`, includes text and comment nodes) vs. `children` (live-ish `HTMLCollection`, elements only); `querySelectorAll` returns a static `NodeList`; `getElementsByTagName` returns a live `HTMLCollection`.
4. The access surface — `getElementById`, `querySelector`/`querySelectorAll`, `closest` (upward), `matches` (boolean check); the 2026 reach in React code is refs and portal targets, not direct queries.
5. Attributes vs. properties — the attribute is the parsed initial state (string), the property is the live current state (typed); they diverge after user input on `value`/`checked`/`selected`; `getAttribute` reads the attribute, property access reads the property.
6. JSX prop renames follow the DOM property names, not the HTML attribute names — `className`, `htmlFor`, `tabIndex`, `colSpan`, `readOnly`, `maxLength`; `data-*` and `aria-*` stay kebab-case as JSX attributes.
7. Boolean attributes are based on presence — `<button disabled="false">` is still disabled; the senior reach is the property (`buttonEl.disabled = false`) or omit the attribute.
8. The three event phases — capture (root to target), target, bubble (target to root); `addEventListener` defaults to bubble; `{ capture: true }` switches to capture.
9. Event delegation — one listener on the parent, `event.target.closest('[data-row]')` to find the actionable ancestor, `dataset` as the stable hook; React's synthetic events delegate at the root for free in JSX.
10. The 2026 cleanup reach — `AbortController` with `{ signal: controller.signal }` on `addEventListener`, `controller.abort()` removes every listener bound to the signal; integrates cleanly with `useEffect` cleanup; `{ passive: true }` is the senior default for scroll/wheel/touch; `preventDefault` cancels the default action, `stopPropagation` stops the phase walk.

---

## Total chapter time

Roughly 165 to 195 minutes across the three teaching lessons plus the quiz. The chapter fits across two evenings — the DOM tree and attributes-vs-properties lessons in the first sitting (90-110 minutes), the event model and the quiz in the second sitting (75-85 minutes). The student finishes the chapter able to read the Elements panel without confusing it with the HTML source, name the node type hierarchy and write the matching TypeScript generic on a `useRef`, distinguish an attribute from a property by which one a hydration mismatch is naming, walk the three event phases by reflex, write a delegation handler against `data-*` hooks, attach listeners with `AbortController` for clean cleanup, set `{ passive: true }` on every scroll/wheel/touch listener by default, and recognize the load-bearing forward references that Chapter 4.1 (JSX), Chapter 4.7 (the render model and synthetic events), Chapter 4.8.6 (refs), Chapter 4.9.2 (useEffect cleanup), Chapter 4.11.4 (focus management), and Chapter 5.2.8 (hydration) all cash in. Chapter 3.6 opens on the other side with Fetch and live data — the request surface from inside the browser, riding on the substrate this chapter just installed.
