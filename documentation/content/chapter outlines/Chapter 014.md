# Chapter 014 — The DOM and event substrate

## Chapter framing

Chapters 014–017 walked the request side of the browser platform — how a URL becomes pixels, the HTTP contract, origins and CORS, and the cookie trust model. Chapter 014 turns to the page side: the live tree the parser produced and the event substrate that drives every interaction. The senior framing is that in a React + Next.js 16 codebase the student almost never calls `querySelector` or `addEventListener` directly — JSX builds the tree, React owns the listeners, refs hand out the rare imperative escape hatch. But the substrate underneath those abstractions still leaks through, and the four places it leaks are exactly what this chapter installs: hydration mismatches that only make sense if you know attribute-versus-property semantics, ref callbacks that have to clean up listeners on unmount, event delegation patterns React's synthetic system already implements (so the student recognizes them), and `passive` plus `AbortController` as the 2026 listener-options surface every framework now reaches for under the hood.

Threads that run through every lesson. The DOM is a live tree of typed Node objects, not the HTML string the server sent — that distinction owns the attribute-versus-property split and the hydration story. React abstracts this surface but doesn't replace it: every `ref`, every event handler, every hydration mismatch is the abstraction leaking, and a senior reads the leak in DOM terms. The 2026 listener cleanup reflex is one `AbortController` per setup site, its signal threaded into every `addEventListener` call, `abort()` called from the cleanup branch — this pattern composes cleanly with React 19's ref callback cleanup return value and replaces the named-handler-plus-`removeEventListener` ceremony. `passive: true` is the default reflex for scroll, wheel, and touch listeners, with the trigger for opting out named (the rare `preventDefault` case). The chapter is deliberately substrate-only: no React syntax, no JSX, no hooks — those land in Unit 3. The student finishes able to read DevTools' Elements panel as a live tree, predict why a `value` attribute and a `value` property disagree, write a delegated click handler with `closest()` and `data-*`, and clean up listeners with a signal.

---

## Lesson 1 — The DOM as a live tree of typed nodes

Teaches the DOM as a tree of typed node objects built once at parse time and mutated thereafter, walks the `Node` / `Element` / `HTMLElement` / tag-specific subclass hierarchy, names the access surface (`getElementById`, `querySelector`, `closest`, `matches`) and the live-vs-static collection distinction (`childNodes`, `children`, `NodeList`, `HTMLCollection`), and frames every primitive against its rare 2026 reach behind refs, portals, and DevTools.

Topics to cover:

- **The senior question the lesson opens with.** Why does inspecting a hydrated `<input>` in DevTools show a `value` that disagrees with the page source? Because the source is the byte string the parser saw; the inspector reads the live DOM tree the parser produced and JavaScript has been mutating since. The lesson installs that distinction up front, then walks the structure of the tree.
- **The DOM in one line.** A tree of typed `Node` objects the parser built from the HTML byte stream. The tree is live: every JavaScript mutation, every React render, every form input updates the same in-memory tree. The HTML source is a snapshot; the DOM is the program state.
- **The node-type hierarchy.** `Node` (abstract base — every tree member) → `Element` (anything with attributes) → `HTMLElement` (the HTML-flavored element, with `style`, `dataset`, `hidden`, `tabIndex`) → tag-specific subclasses (`HTMLInputElement`, `HTMLAnchorElement`, `HTMLImageElement`, `HTMLButtonElement`). Named so the student reads a `Element` type in TypeScript and knows what's missing versus `HTMLInputElement`. Cross-reference forward to React 19 `useRef<HTMLInputElement>(null)`.
- **Non-element node types named for recognition.** `Text` (the run of characters between tags), `Comment`, `DocumentFragment` (an off-tree container — the substrate behind React Portals, named here as a forward reference to lesson 5 of chapter 022), `Document` and `DocumentType`. The 2026 reach is rare; the student needs to recognize `node.nodeType === Node.TEXT_NODE` in a debugger trace.
- **The access surface — five methods that cover the rare reach.** `document.getElementById(id)` (the fastest, exact-match lookup). `element.querySelector(selector)` / `querySelectorAll(selector)` (CSS-selector match — the universal reach when `id` isn't enough). `element.closest(selector)` (walk up the ancestor chain — the delegation companion, used in lesson 3 of chapter 014). `element.matches(selector)` (does this element match a selector — also delegation-related). The senior recognition: in a React codebase these appear inside `useEffect` blocks, ref callbacks, and external-library glue, never in render code.
- **Live vs. static collections.** `element.children` is an `HTMLCollection` and is live — adding a child mutates the collection while you iterate. `element.childNodes` is a `NodeList` and is live. `element.querySelectorAll(...)` returns a `NodeList` that is *static* — the snapshot at call time. The bug pattern: iterating a live collection while removing items skips elements. The 2026 reflex: `[...element.children]` or `Array.from(...)` to snapshot before mutating.
- **Tree-walking primitives.** `parentElement`, `children`, `firstElementChild` / `lastElementChild`, `nextElementSibling` / `previousElementSibling`. The element-flavored versions skip text and comment nodes — the surface the student reaches for in delegation handlers. The `parentNode` / `childNodes` family includes text nodes; recognition only.
- **Where this leaks in a React 19 codebase.** Five places, named not at depth: refs to imperative DOM elements (focus, scroll, measure, integration with third-party libraries); portals (a `DocumentFragment` mounted into a different parent); hydration (React compares the server-rendered HTML against the DOM tree it would build client-side); DevTools (every inspection); external libraries (a tooltip library handed a DOM element to mount inside). The pattern: a senior reaches for DOM primitives when the React abstraction can't reach a use case the platform owns.
- **DevTools — reading the live tree.** The Elements panel *is* the DOM tree, not the HTML source. The "Inspect" reflex; `$0` in the Console as the last-inspected element; right-click → "Store as global variable" for repeated probing. Cross-reference to lesson 3 of chapter 006.
- **Watch-outs:** the HTML source view and the Elements panel often disagree (hydration, JavaScript mutations); `getElementById` is case-sensitive and only checks `id` attributes; `querySelector(".foo")` searches the entire descendant subtree, not just children; live collections mutate during iteration (snapshot first); `innerHTML` rebuilds a subtree from a string and is an XSS surface (named here, owned by Unit 4 on Next.js where `dangerouslySetInnerHTML` lands); `textContent` is the safe text-only reach.

What this lesson does not cover:

- The attribute-versus-property split (lesson 2 of chapter 014).
- The event model and delegation (lesson 3 of chapter 014).
- React refs and `useRef` — Chapter 022 owns the React side; this lesson frames the DOM nodes refs *point at*.
- React Portals — lesson 5 of chapter 022; named here as a `DocumentFragment` use case.
- Hydration at depth — Unit 4 owns the SSR/hydration story; named here as a leak site.
- `innerHTML` / `outerHTML` / DOM mutation methods (`appendChild`, `insertAdjacentHTML`, `replaceChildren`) at depth — out of scope; the student writes JSX, not imperative tree-building.
- The Shadow DOM and custom elements — niche for 2026 SaaS work; cut.
- XPath, `TreeWalker`, `NodeIterator` — historical, cut.

---

## Lesson 2 — Attributes vs. properties: parsed state vs. live state

Teaches the split between HTML attributes (the strings the parser captured at load time) and DOM properties (the live values JavaScript reads and mutates), walks the four canonical patterns (identical-name pairs, renamed properties like `class`/`className` and `for`/`htmlFor`, default-vs-current pairs on `value`/`checked`/`selected`, and attribute-only or property-only cases), maps every example to its JSX prop name, and installs the recognition vocabulary that makes hydration mismatches and boolean-attribute traps legible.

Topics to cover:

- **The senior question.** The user types into an `<input>`; the page source still shows `<input value="">`; `inputElement.value` returns the typed string; `inputElement.getAttribute('value')` returns `""`. Which is the truth? Both — they're tracking different things. The lesson installs the model that explains every form bug, every `defaultValue`-vs-`value` React decision, every hydration mismatch.
- **The model in one line.** An *attribute* is a string the HTML parser captured at the moment it built the node. A *property* is a typed live value on the node object that the runtime reads and writes. They sometimes synchronize, often diverge, occasionally have different types, and frequently have different names.
- **Four canonical patterns.** The recognition vocabulary the lesson installs:
  - *Identical-name pairs, live sync.* `id`, `tabindex`/`tabIndex`, `hidden`, `lang`. Reading and writing either side stays in sync. Use the property in code.
  - *Renamed properties.* `class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, `readonly` → `readOnly`, `maxlength` → `maxLength`. The DOM property uses camelCase because the JavaScript identifier can't be a reserved word. JSX prop names follow the property side — `<label htmlFor="...">`, `<input className="...">`. The recognition payoff: JSX prop names aren't React inventions; they're the existing DOM property names.
  - *Default-vs-current pairs.* `value`/`defaultValue`, `checked`/`defaultChecked`, `selected`/`defaultSelected`. The attribute is the initial value the parser saw; the property is the current live value. After user input or programmatic `.value = ...`, they diverge. React's `defaultValue` prop writes the attribute (initial), `value` writes the property (controlled). The lesson lands the model so Unit 3's controlled-vs-uncontrolled lesson reads as a consequence of platform semantics, not a React invention.
  - *Attribute-only or property-only cases.* `data-*` attributes mirror to the `dataset` property (with kebab-case → camelCase rename). `style` as a string attribute, `style` as a typed `CSSStyleDeclaration` object on the property side. `aria-*` lives as attributes (no property mirror). `textContent`, `innerHTML`, `nodeName`, `tagName` are property-only — no attribute exists.
- **Boolean attributes — presence semantics.** `disabled`, `checked`, `readonly`, `required`, `hidden`, `multiple`, `selected`. The attribute is present (any value, including empty string, including the literal string `"false"`) or absent. `disabled="false"` *disables* the element. The property side is a typed boolean. The 2026 reflex: in JSX you pass a boolean (`disabled={isLoading}`) and React handles the presence-or-absence translation; in raw DOM you call `element.disabled = true` (property) or `element.removeAttribute('disabled')` (attribute).
- **Enumerated attributes — the canonicalization step.** `<input type="numbr">` has `getAttribute('type')` return `"numbr"` (what was parsed) and `.type` return `"text"` (the canonicalized fallback the spec defines). The student needs to recognize that the property is the engineered value, not the raw string.
- **Where this leaks in a React codebase.**
  - JSX prop naming — `className`, `htmlFor`, `tabIndex` — is the property side speaking through React, not a React rename.
  - `defaultValue` vs. `value` controls whether the input is uncontrolled or controlled. Owned by Unit 6 (forms), foreshadowed here.
  - Hydration mismatch errors: React renders server HTML (attributes) then hydrates against the live DOM (properties). Boolean-attribute and `value`/`checked` mismatches are the canonical bug class. Cross-reference forward to Unit 4.
  - Server-rendered HTML that includes `value="initial"` on a controlled input warns in the console — React expects the controlled side to own the value. Recognition only.
- **The `dataset` property and `data-*` attributes.** `<div data-user-id="42">` is read as `element.dataset.userId`. The rename: kebab-case → camelCase, `data-` prefix stripped. The 2026 reach: state hooks for Tailwind variants (`data-[state=open]`), event-delegation discriminators (in lesson 3 of chapter 014), test selectors. The student writes `data-*` in JSX and reads it as `dataset.*` in delegation handlers.
- **DevTools — the Properties pane.** The Elements panel's right-side tabs include a "Properties" subpanel listing the full property surface of the selected node. The "Attributes" view shows the parsed strings. The senior debugging move when an attribute looks right but the page misbehaves (or vice versa): check both sides.
- **Watch-outs:** `getAttribute` returns `null` for missing attributes, `""` for present-but-empty; the property side returns the typed empty value. `setAttribute('disabled', false)` *still disables* (the string `"false"` is a present value). `class` is the attribute, `className` is the property, JSX uses `className`. `style` as an attribute string overwrites everything; as a property object you mutate one declaration. `aria-*` and `data-*` have no property mirrors beyond `dataset` for `data-*` — `aria-label` is always `getAttribute('aria-label')`. Boolean coercion of attribute strings is a footgun (`Boolean(getAttribute('disabled'))` is `true` even when value is `"false"`).

What this lesson does not cover:

- Tree structure, node hierarchy, query methods (lesson 1 of chapter 014).
- The event model (lesson 3 of chapter 014).
- React's controlled-vs-uncontrolled component pattern — Unit 6 owns forms.
- The full hydration story — Unit 4 owns SSR. This lesson installs why mismatches happen.
- `style` and `CSSStyleDeclaration` at depth — Chapter 019 owns CSS and tokens.
- The `dataset` API beyond recognition — used in lesson 3 of chapter 014 for delegation.
- ARIA semantics — lesson 6 of chapter 017 owns the `aria-*` surface.
- Reflection rules per element — recognition vocabulary only; the spec table is not chapter material.

---

## Lesson 3 — The event model: capture, bubble, delegate

Teaches the three-phase DOM event model (capture, target, bubble), installs event delegation as the canonical pattern with `event.target.closest` and `data-*` hooks, distinguishes `event.target` from `event.currentTarget` and `preventDefault` from `stopPropagation`, names the `addEventListener` option surface (`capture`, `once`, `passive`, `signal`), and locks in the 2026 cleanup reach with `AbortController` and the `{ passive: true }` default for scroll, wheel, and touch listeners.

Topics to cover:

- **The senior question.** A click on a button fires a handler bound to the button, but also a handler bound to the surrounding `<form>`, also one on `document`. Why? Because every event walks the tree, twice: down to the target (capture), then back up (bubble). Listeners can register on either leg. Delegation — one listener on a common ancestor handling clicks for many descendants — is the senior pattern this enables and the substrate React's synthetic event system implements.
- **The three phases.** Capture (from `window` down to the target's parent), target (on the element itself, in registration order), bubble (back up to `window`). `addEventListener(type, handler)` registers on the bubble phase by default; `addEventListener(type, handler, { capture: true })` registers on the capture phase. Most production code uses bubble; capture is the niche reach (intercepting before a child handles, or listening for non-bubbling events like `focus`/`blur` at a parent — though `focusin`/`focusout` are the bubble-friendly alternatives and the senior reach).
- **`event.target` vs. `event.currentTarget`.** `target` is the element the user actually interacted with (deepest hit). `currentTarget` is the element the *handler is bound to*. In a delegation handler bound on `<ul>`, `currentTarget === ul` always; `target` is whichever `<li>` (or descendant of one) was clicked. The 2026 reflex: `target` for "what was clicked," `currentTarget` for "what the handler is on."
- **Event delegation — the canonical pattern.** One listener on a stable ancestor. Inside the handler, `event.target.closest('[data-action]')` walks up to the nearest matching element. A `data-*` attribute discriminates the action; the handler routes on it. The pattern that scales to dynamically-added children, hundreds of items, and is exactly how React's synthetic event system works under the hood (one listener on the root, dispatched by the React fiber tree). Recognition payoff: the student knows what React is doing the moment they read `onClick` on a JSX element.
- **`event.preventDefault()` vs. `event.stopPropagation()`.** Different jobs. `preventDefault` cancels the browser's default action (form submission, link navigation, checkbox toggle) but lets the event keep propagating. `stopPropagation` halts the trip up (or down) the tree but doesn't cancel the default. `stopImmediatePropagation` also blocks other listeners on the *same* element. The watch-out: `stopPropagation` breaks delegation; the senior almost never reaches for it. `preventDefault` is the common one.
- **The `addEventListener` options object.** Four flags worth naming.
  - `capture: true` — register on capture phase. Niche.
  - `once: true` — auto-remove after first invocation. Useful for "first interaction" telemetry, one-shot setup.
  - `passive: true` — promise not to call `preventDefault`. Lets the browser scroll without waiting for the handler. *The default for scroll/wheel/touch listeners on `Window`, `Document`, and `Document.body` is already passive in modern browsers (Chrome, Safari, Firefox)*, but the explicit reach is the senior form on every other element. Default reflex on `touchstart`, `touchmove`, `wheel`, `mousewheel`, `scroll` listeners.
  - `signal: AbortSignal` — the 2026 cleanup reach. Pass a signal from an `AbortController`; calling `controller.abort()` removes the listener (and every other listener that shares the signal). Replaces the named-handler + `removeEventListener` ceremony.
- **The `AbortController` cleanup pattern.** The senior 2026 form for any non-React listener:
  - One controller per setup site.
  - The same signal threaded into every `addEventListener` call in that scope.
  - One `controller.abort()` call in the cleanup branch (effect teardown, ref callback return, unload handler).
  - One signal can clean up many listeners across many targets — fewer references to hold, fewer leak surfaces.
  - This pattern composes directly with React 19 ref callback cleanup (cross-reference forward to Chapter 022) and with `useEffect` teardown. The mental model is "one shutdown switch per scope" instead of "match each `add` with an exact `remove`."
- **The `useEffect`/ref-callback parallel — forward reference.** Named once, lightly: in React 19, a ref callback can return a cleanup function, and a `useEffect` callback returns one too. The shape is identical: in setup, create a controller, register listeners with its signal; in cleanup, `controller.abort()`. The chapter doesn't teach React here; it primes the pattern so when the React lesson lands the student recognizes the substrate.
- **Synthetic events — what React owns and what it doesn't.** Recognition vocabulary. React intercepts every native event at the root, normalizes it across browsers, dispatches through its component tree, exposes it as `event` on `onClick={...}`. Most native semantics carry through (`preventDefault`, `stopPropagation`, `target`, `currentTarget`), but a few don't (some native events don't synthesize, `e.persist()` is gone in React 17+, passive option is React-managed for scroll/touch). The student leaves knowing that React owns the listener and they don't reach for `addEventListener` for component-tree events — they use `onClick`.
- **Where the student still writes `addEventListener` in a 2026 codebase.** Three sites: window/document listeners (`keydown` for global shortcuts, `resize`, `scroll` on `window`); third-party DOM integrations (Stripe Elements, Mapbox, charting library callbacks); browser APIs that aren't event-driven through JSX (`MediaQueryList.change`, `BroadcastChannel.message`, `WebSocket.message`). Each lives inside a `useEffect` or ref callback with the `AbortController` cleanup.
- **Watch-outs:** `stopPropagation` breaks delegation — don't reach for it. A passive listener that calls `preventDefault` is a console warning and the call is ignored. `focus` and `blur` don't bubble; `focusin` and `focusout` do — use the bubbling pair for delegation. `click` fires for keyboard activation (Enter/Space on a button), `mousedown`/`mouseup` don't — keyboard-accessible code branches on `click`. Anonymous-function handlers can't be removed by `removeEventListener` (the reference doesn't match) — `AbortController` sidesteps the problem entirely. `once: true` removes the listener after one invocation but the controller can still abort early — they compose. `event.target` can be a descendant text node — use `.closest()` to climb to the element you actually care about. `preventDefault` on a form's submit handler suppresses navigation but doesn't stop validation or browser autofill. Touch events fire alongside mouse events on mobile — listen for `pointer*` (unified) when possible, or pick one family and stay consistent.

What this lesson does not cover:

- React's `onClick` / `onChange` / `onSubmit` props at depth — Chapter 022 owns React events.
- React Synthetic Events versus native events at depth — recognition only.
- `useEffect` cleanup and ref callback cleanup — Chapter 022.
- Pointer events vs. mouse vs. touch event families at depth — out of scope; the chapter names `pointer*` as the unifying primitive.
- The `KeyboardEvent` keycode/key surface at depth — Chapter 022 or chapter 027 will handle keyboard shortcuts when it earns its weight.
- Custom events and `CustomEvent` for component messaging — out of scope; the course communicates via props and context, not DOM events.
- `IntersectionObserver`, `ResizeObserver`, `MutationObserver` — covered as they earn their weight in later chapters (lazy-loading, layout, virtualization); not part of the event-substrate chapter.
- The full event-type taxonomy — recognition only on the families the chapter names.

---

## Lesson 4 — Quizz

Top 10 topics to quiz:

- The DOM as a live tree vs. the HTML source — what the parser produces, what JavaScript mutates, why DevTools and "View Source" can disagree.
- The node-type hierarchy — `Node` → `Element` → `HTMLElement` → tag-specific subclasses (`HTMLInputElement`, etc.), and why TypeScript ref types pick a specific one.
- Live vs. static collections — `children` and `childNodes` are live, `querySelectorAll` returns a static `NodeList`, the iterate-while-mutating bug pattern and the `[...]` snapshot fix.
- The attribute-vs-property model — attribute = parsed string at load time, property = live typed value; the four canonical patterns (identical, renamed, default-vs-current, attribute-only or property-only).
- Boolean attributes — presence semantics, `disabled="false"` still disables, why the property side returns a typed boolean.
- The renamed-property table — `class`/`className`, `for`/`htmlFor`, `tabindex`/`tabIndex`, `readonly`/`readOnly` — and why JSX prop names follow the property side.
- The three event phases (capture, target, bubble) and the `event.target` vs. `event.currentTarget` distinction.
- `preventDefault` vs. `stopPropagation` — different jobs, when to reach for each, why `stopPropagation` breaks delegation.
- Event delegation with `closest` and `data-*` — the canonical pattern, what React's synthetic event system does under the hood.
- The `addEventListener` options surface (`capture`, `once`, `passive`, `signal`) and the `AbortController` cleanup pattern that replaces `removeEventListener`, with `passive: true` as the default reflex for scroll, wheel, and touch.
