# Lesson 1 — The DOM as a live tree of typed nodes

Title: The DOM as a live tree of typed nodes
Sidebar label: The DOM as a live tree

---

## Lesson framing

This is the first lesson of Unit 2's last chapter and the first time the student studies the DOM as a *data structure* rather than a rendering-pipeline stage.
Chapter 010 L2 already taught "the parser turns HTML bytes into the DOM" as one box in the render pipeline; chapter 010 L3 already taught the DevTools Elements panel, `$0`, and the Console REPL.
So this lesson does not introduce "what the DOM is" cold — it *re-frames* a known box as a live, typed, in-memory tree that JavaScript mutates, and gives the student the vocabulary to read it.

The senior thesis (from chapter framing) governs every paragraph: in a React 19 + Next.js 16 codebase the student almost never calls `getElementById` or `querySelector` in their own code — JSX builds the tree, React owns it.
The DOM substrate matters because it *leaks through the abstraction*: hydration mismatches, ref types (`useRef<HTMLInputElement>`), portals, DevTools, and third-party-library glue all speak DOM.
Every primitive in this lesson must be framed as "here is the platform fact; here is the rare 2026 site where you still touch it; here is the React abstraction that usually hides it."
This is the *trigger-before-tool* filter: name when the React default fails to reach a use case the platform owns, then show the primitive.

The single mental model the student must leave with: **the HTML source is a byte snapshot the parser saw once; the DOM is live program state the parser built and JavaScript has mutated since.**
This one distinction is the spine of the whole chapter — it explains the attribute-vs-property split (L2), why DevTools and View-Source disagree, and the hydration story (Unit 4).
Install it first, concretely, then hang the structure (node hierarchy, access surface, collections) off it.

Cognitive-load staging: open with one concrete observable contradiction (DevTools shows a `value` the page source doesn't), resolve it with the live-tree model, then build the tree's structure bottom-up (what's a node → the type hierarchy → how you reach nodes → tree-walking → collection liveness).
Close by zooming back out to where all of this leaks in real React code, so the student files every primitive under "rare reach, recognize it" not "daily tool."

The lesson is **substrate-only**: no JSX, no hooks, no React syntax in code samples (those land in Unit 3 / Chapter 022).
React is named throughout as the abstraction *on top*, with forward cross-references, but never demonstrated in code.
Vanilla JS samples follow the universal conventions: single quotes, 2-space indent, `const` + arrow functions, semantic names, `document.getElementById(...)` etc. at the call site.

Target reach by end of lesson, the student can: read the Elements panel as a live tree and explain why it disagrees with View-Source; place an unknown element type in the `Node → Element → HTMLElement → HTMLXxxElement` hierarchy and pick the right TypeScript type for a future ref; choose between `getElementById` / `querySelector` / `closest` / `matches`; and predict the iterate-while-mutating bug from live-vs-static collection semantics and apply the spread-to-snapshot fix.

---

## Lesson sections

### Introduction (no heading)

Warm, brief, three short paragraphs. No h2.
Open with the senior question as a concrete scenario, not abstractly: you sign in, the form's `<input>` autofills your email, you open DevTools, the Elements panel shows `value="ada@example.com"` — but "View Source" (or the network response) shows `<input value="">` or no `value` at all. Which is lying? Neither.
Land the one-line model immediately: View-Source is the byte string the parser read once; the Elements panel renders the live DOM tree the parser *built from* those bytes and that JavaScript (the autofill, your typing, every React render) has been mutating ever since.

Connect to prior knowledge: chapter 010 L2 drew the parser turning HTML bytes into the DOM as one box in the pipeline; this lesson opens that box and treats the DOM as a live data structure you can read and reason about.
Preview the practical payoff: by the end you'll read the Elements panel as a tree of typed objects, know which of four lookup methods to reach for, and predict a classic collection-iteration bug — all of which makes hydration errors and ref types legible later.
Set the senior frame plainly: in the React code you'll write, you rarely call these APIs yourself — but they leak through refs, portals, hydration, and DevTools, and a senior reads the leak in DOM terms.

### The DOM is live program state, not the HTML you sent

Goal: cement the snapshot-vs-live-state model as the chapter's spine before any structure is taught.

Content:
- State the model in one line (callout-worthy): an *attribute* in the source is a byte the parser captured once; the DOM is the in-memory tree the parser produced and that every mutation since updates. The source is a photograph; the DOM is the running program's state.
- Enumerate what mutates the same in-memory tree, to make "live" concrete: the parser's initial build, browser features (autofill, `<details>` toggling), direct JavaScript (`element.textContent = ...`), and — forward-referenced — every React render. They all write to one tree.
- Make explicit that "View Source" fetches the original bytes again from the server (a fresh snapshot of what was sent), while DevTools serializes the current live tree — which is *why* they diverge and why that divergence is normal, not a bug.

Pedagogy / components:
- A **diagram** is the strongest vehicle here; this is the load-bearing model. Use a **plain HTML+CSS** side-by-side (wrapped in `<Figure>`) — two panels: left "HTML bytes (what the server sent / View-Source)" showing `<input value="">`; right "Live DOM tree (what DevTools shows)" showing an `input` node with a `value` property reading `"ada@example.com"`, plus a small arrow/label "parser builds once" between them and a second label "JS + browser mutate" curving back onto the right panel. Goal: one glance encodes snapshot→build→mutate. Keep it horizontal and short (laptop viewport). Follow the prose-margin gotcha (`margin: 0` on every inner element) and escape `<` as `&lt;` in any text content.
- Caution `Aside`: this divergence is the root cause of the hydration-mismatch errors they'll meet in Unit 4 — name it once as a forward hook, don't teach hydration here.

### Every node is a typed object: the Node hierarchy

Goal: give the student the class hierarchy so they can place any element and pick the correct TypeScript type for a future ref — the recognition payoff named in the chapter outline.

Content (build the chain bottom-up, simplest first to manage load):
- `Node` — the abstract base every tree member inherits from (elements, text, comments, the document itself). It carries tree-structure members (`parentNode`, `childNodes`, `nodeType`).
- `Element` — any node with a tag and attributes (`getAttribute`, `classList`, `querySelector`). Covers HTML *and* SVG elements.
- `HTMLElement` — the HTML-flavored element, adding `style`, `dataset`, `hidden`, `tabIndex`. This is the level most generic DOM code types against.
- Tag-specific subclasses — `HTMLInputElement` (`.value`, `.checked`), `HTMLAnchorElement` (`.href`), `HTMLImageElement` (`.src`, `.naturalWidth`), `HTMLButtonElement`, `HTMLFormElement`. Each adds the members specific to that tag.
- The recognition lesson: when you read `Element` in a type signature you know `.value` is *not* available; you need `HTMLInputElement`. Cross-reference forward (light, one line): in React 19 you'll write `useRef<HTMLInputElement>(null)` precisely to name the level you need — Chapter 022 owns that; here you're learning what the type *means*.
- Non-element node types, named for *recognition only* (debugger traces, not daily use): `Text` (the run of characters between tags — yes, whitespace counts), `Comment`, `Document` (the root, `document`), `DocumentFragment` (an off-tree container — name it as the substrate behind React Portals, forward ref to Chapter 022 L5), `DocumentType`. The reach is `node.nodeType === Node.TEXT_NODE` showing up in a trace.

Pedagogy / components:
- A **diagram** carries the hierarchy best. Use a **plain HTML+CSS** nested-box or inheritance ladder (in `<Figure>`): vertical inheritance arrows `Node → Element → HTMLElement → HTMLInputElement`, with each box listing the 2-3 members it *adds* (not a full API dump). A short side branch off `Node` showing `Text`, `Comment`, `Document`, `DocumentFragment` greyed/muted to signal "recognize, don't memorize." Pedagogical goal: make "what you gain at each level" spatial so the type-narrowing intuition sticks. Keep height capped; this can get tall — prefer a left-to-right inheritance chain with the non-element branch stacked compactly.
- A short `Code` (ts) block showing the leaf where the type matters, e.g. a function `focusEmail(el: HTMLInputElement)` reading `el.value` vs the same with `el: Element` failing — keep it tiny, this is about the *type*, not DOM manipulation. Consider `CodeTooltips` on `HTMLInputElement` / `Element` for one-line definitions instead of a separate block if it stays inline.
- **Exercise — `Buckets`** (two-column): sort a pool of members/types into the level that introduces them. Buckets: "Node (any tree member)", "Element (has a tag)", "HTMLElement (HTML element)", "HTMLInputElement (specific tag)". Items: `parentNode`, `nodeType` → Node; `getAttribute`, `classList` → Element; `dataset`, `style`, `tabIndex` → HTMLElement; `.value`, `.checked` → HTMLInputElement. Goal: cement the "what's added where" model. Grading is exact bucket match. This is the right drill because the hierarchy is a classification, and the misconception ("everything's just an element") is exactly what a classification drill corrects.
- `Term` candidates in this section: "abstract base class" (if the student's OOP is shaky — short def), "subclass". Keep to non-obvious ones only.

### Reaching a node: the four-method access surface

Goal: name the lookup methods and, more importantly, install the senior framing that these live inside effects, ref callbacks, and library glue — never in render code.

Content:
- `document.getElementById(id)` — fastest, exact-match, `id`-attribute only, case-sensitive, returns the element or `null`. The reach when you control the `id`.
- `element.querySelector(selector)` / `querySelectorAll(selector)` — any CSS selector, searches the entire *descendant subtree* of the element it's called on (or `document`). `querySelector` returns the first match or `null`; `querySelectorAll` returns a (static — flagged here, detailed in the collections section) `NodeList`. The universal reach when `id` isn't enough.
- `element.closest(selector)` — walks *up* the ancestor chain (including the element itself) to the nearest match. Name it as the delegation companion used in L3; here it's "find the meaningful ancestor."
- `element.matches(selector)` — boolean, does this element match the selector. Also delegation-adjacent.
- Senior framing (the section's spine): in a React codebase these appear inside `useEffect` blocks, ref callbacks, and third-party-library glue — never in the JSX you render. You declare *what* the UI is in JSX; you reach for these only when stepping outside React to the raw platform.

Pedagogy / components:
- One `AnnotatedCode` (lang `js`, `maxLines` ~12) walking a single small vanilla snippet that uses all four methods against a tiny markup comment header, e.g. given a `<nav>` with links: `getElementById('main-nav')`, then `querySelectorAll('a')`, then inside a click target `closest('li')`, then `matches('.active')`. Steps highlight each call with one-paragraph prose naming *why that method over the others*. AnnotatedCode is right here because one block touches four distinct APIs and the student's attention needs steering to each in turn. Use `color` per step (blue default).
- A small **decision aid** rather than a full diagram: a compact table or a `Card`-free inline list "want exact id → getElementById; want a CSS match in the subtree → querySelector(All); want the nearest matching ancestor → closest; want a yes/no on one element → matches." Keep it as prose + a tight table; a `StateMachineWalker` is overkill for four flat choices.
- Watch-out `Aside` (caution): `getElementById` checks only `id` and is case-sensitive; `querySelector('.foo')` searches the whole descendant subtree, not just direct children (a common surprise). Place it right after `querySelector`.
- `Term` candidates: "CSS selector" (brief, the student knows CSS exists from chapter 010's render pipeline but selectors as a query language may be new) — short def only.

### Tree-walking: element-flavored vs node-flavored navigation

Goal: give the navigation primitives and the one fact that matters — the element-flavored versions skip text and comment nodes.

Content:
- The element-flavored family (the one to reach for): `parentElement`, `children`, `firstElementChild` / `lastElementChild`, `nextElementSibling` / `previousElementSibling`. These skip `Text` and `Comment` nodes, so you walk element-to-element predictably.
- The node-flavored family (recognition only): `parentNode`, `childNodes`, `firstChild` / `lastChild`, `nextSibling` / `previousSibling`. These include text nodes — which means whitespace between tags shows up as `Text` nodes and your "first child" is often a newline, not the element you expected.
- The takeaway: default to the `*Element*` members; reach for the node-flavored ones only when you genuinely need text/comment nodes. This is the surface used in delegation handlers (L3) to climb from a clicked target.

Pedagogy / components:
- A `PredictOutput` exercise is the sharp tool here, because the text-node gotcha is a classic "predict what prints" surprise. Tiny program over markup with whitespace/newlines between children: log `element.firstChild.nodeName` (prints `#text`) vs `element.firstElementChild.nodeName` (prints e.g. `LI`). `PredictWhy`: whitespace between tags is a `Text` node, so `firstChild` is `#text`; `firstElementChild` skips it. This drills the single most useful fact in the section and rewards reading the model, not memorizing API names.
- Optionally fold this into the prior diagram instead of a new one — a tiny inline marked-up snippet showing where the text nodes sit is enough; no separate large figure needed.

### Live vs. static collections: the iterate-while-mutating trap

Goal: the second load-bearing model of the lesson — collection liveness — and the 2026 snapshot reflex. This is high-value because it produces a real, silent bug.

Content:
- `element.children` → `HTMLCollection`, **live**: it reflects the tree as it changes *right now*; add or remove a child and the collection's contents and `length` change underneath you.
- `element.childNodes` → `NodeList`, also **live** (and includes text nodes).
- `element.querySelectorAll(...)` → `NodeList`, but **static**: a snapshot frozen at call time; later DOM changes don't affect it.
- The bug pattern, taught as a concrete failure: looping a live collection with an index while removing matched items *skips elements*, because indices shift as the collection shrinks under the loop. Show it, then explain the index drift.
- The 2026 reflex: snapshot first with spread `[...element.children]` or `Array.from(element.children)` before mutating, which also unlocks array methods (`map`, `filter`, `forEach`). Note `querySelectorAll`'s result is already static, but spreading it to a real array is still the move when you want array methods (a `NodeList` only has `forEach`, not `map`/`filter`).

Pedagogy / components:
- `CodeVariants` (two tabs, broken → fixed) is the ideal component: Tab 1 "Buggy: live collection + index loop" with prose explaining the skip; Tab 2 "Fixed: snapshot with spread" with prose. Before/after is exactly what CodeVariants is for, and seeing the minimal diff (`[...]`) lands the fix.
- Reinforce with a `PredictOutput` *or* a `DiagramSequence` — pick one to avoid bloat. Recommendation: a short **`DiagramSequence`** (plain HTML+CSS panels inside the steps) scrubbing the buggy loop tick by tick: step 0 collection `[A,B,C]` index 0 points at A (remove A), step 1 collection is now `[B,C]` index 1 points at C — **B was skipped**, final step highlights the skipped B. Pedagogical goal: make the index-drift mechanism *visible* in time, which prose alone can't do. (Do not wrap `DiagramSequence` in `<Figure>` — it brings its own card.)
- Keep one of the two interactive elements; if both a CodeVariants and a DiagramSequence feel heavy, drop the PredictOutput idea here (it already lives in the tree-walking section).
- `Term`: "live collection" / "static collection" are defined inline in prose headers, no `Term` needed since they're the section subject.

### Where the DOM leaks into React code

Goal: zoom back out and file every primitive under "rare, recognizable reach" — the senior framing that justifies the whole lesson. Breadth, not depth.

Content — five leak sites, each one or two sentences, each with its forward cross-reference, none taught at depth:
- **Refs to imperative DOM** — focus an input, scroll to an element, measure layout, hand a node to a third-party library. The node a ref points at is one of the typed objects from this lesson. (Chapter 022 owns `useRef`; this lesson framed the node it points at.)
- **Portals** — React renders into a different part of the tree via a `DocumentFragment`-style detached mount; the substrate is the off-tree container named earlier. (Chapter 022 L5.)
- **Hydration** — React compares the server-sent HTML against the live DOM tree it would build on the client; the snapshot-vs-live distinction from section 1 is exactly what a mismatch reports. (Unit 4 owns SSR/hydration.)
- **DevTools** — every inspection reads the live tree, never the source. (Already used in chapter 010 L3; reinforced next section.)
- **Third-party libraries** — a tooltip/chart/maps library is handed a DOM element to mount inside; you reach for the access surface to get it that element.
- The unifying senior pattern (state it explicitly): you reach for DOM primitives when the React abstraction can't reach a use case the platform owns — focus, measurement, scroll, library integration. Otherwise you describe the UI in JSX and let React own the tree.

Pedagogy / components:
- A `CardGrid` of five `Card`s (one per leak site, with a `lucide:*` icon each) is a clean, scannable fit for "five parallel sites, breadth not depth." Each card: the site, the one-line why, the forward cross-reference. This is a recognition map, so a grid beats prose.
- No exercise here — this is a framing/summary section; the assessment of these connections belongs to the chapter quiz (L4).

### Reading the live tree in DevTools

Goal: a focused, practical reinforcement (not first teaching — chapter 010 L3 introduced the panels) that turns the lesson's model into a debugging reflex.

Content:
- The Elements panel *is* the live DOM tree, serialized — re-state, now that the student has the model, that this is why it can disagree with View-Source.
- The Inspect reflex (already known): right-click → Inspect jumps to the node.
- `$0` in the Console is the last-inspected element — and now the student can call the lesson's APIs on it live: `$0.children`, `$0.closest('form')`, `$0.value`, `$0.nodeType`. This is the cheap way to *feel* the live tree.
- Right-click a node → "Store as global variable" (`temp0`) for repeated probing across console commands.
- Cross-reference back to chapter 010 L3 for the four-panel workflow; keep this tight.

Pedagogy / components:
- A `Screenshot` of the Elements panel with `$0` used in the Console below would be ideal *if a screenshot asset exists or can be produced*; if not, describe the workflow in a `Steps` list (Inspect → read the tree → switch to Console → probe with `$0.…`). Flag to the downstream agent: prefer `Steps` over a fabricated screenshot — do not invent UI that can't be verified.
- A caution `Aside` belongs here, tying off the chapter's spine: the Elements panel and View-Source disagree by design (hydration, JS mutation, autofill) — when debugging, trust the live tree the panel shows, and remember the source is only what the server sent.
- `innerHTML` / `textContent` watch-out: name `innerHTML` once as the string-to-subtree rebuild that is an **XSS surface** (owned by Unit 4's `dangerouslySetInnerHTML`), and `textContent` as the safe text-only read/write. Recognition only — this lesson does not teach DOM mutation. Place as a short caution `Aside`, not a section.

### External resources (optional)

A short `ExternalResource` / `LinkCard` set, only if they earn their place:
- MDN "Introduction to the DOM" and/or the `Node`/`Element` interface pages — canonical reference for the hierarchy.
- Optionally a `VideoCallout` only if a current, high-quality short explainer on the live-tree-vs-source model is found during the resourcer pass; do not embed a generic "DOM tutorial" that re-teaches at bootcamp depth. Leave to the resourcer agent; do not hardcode a video the writer can't verify.

---

## Scope

In scope: the DOM as a live typed tree; the snapshot-vs-live-state model; the `Node → Element → HTMLElement → HTMLXxxElement` hierarchy plus non-element node types for recognition; the four-method access surface (`getElementById`, `querySelector`/`All`, `closest`, `matches`); element- vs node-flavored tree-walking; live vs. static collections and the snapshot reflex; the five React leak sites (named, not taught); DevTools as a live-tree reader (reinforced).

Explicitly out of scope (redefine prerequisites in one line only):
- **Attributes vs. properties** — the whole `value`/`getAttribute('value')` split is L2 of this chapter. This lesson may *observe* that a `value` property and a `value` attribute can disagree (it's the opening hook) but must **not** explain the four canonical patterns, boolean attributes, or renamed properties. Hand that off to L2 explicitly.
- **The event model, delegation, `closest` in handlers, `addEventListener`, `AbortController` listener cleanup** — L3 of this chapter. `closest`/`matches` are named here as lookup methods only; their delegation role is a forward reference.
- **React `useRef` / `useRef<HTMLInputElement>` and ref callbacks** — Chapter 022. Named as the consumer of the typed-node hierarchy; no React code.
- **React Portals** — Chapter 022 L5. Named as a `DocumentFragment` use case only.
- **Hydration at depth / SSR** — Unit 4. Named as a leak site and the payoff of the snapshot-vs-live model; not explained.
- **DOM mutation APIs** — `innerHTML`/`outerHTML`/`appendChild`/`insertAdjacentHTML`/`replaceChildren` at depth are out of scope; the student writes JSX, not imperative tree-building. `innerHTML`/`textContent` named once only for the XSS watch-out.
- **`dangerouslySetInnerHTML` / DOMPurify** — Unit 4 security; named once, not taught.
- **Shadow DOM, custom elements, XPath, `TreeWalker`, `NodeIterator`** — cut as niche/historical for 2026 SaaS work.
- **CSS selector syntax at depth** — assume the student knows CSS exists (chapter 010 render pipeline); `Term`-define "CSS selector" briefly, don't teach selectors.

Prerequisites the student already has (do not re-teach; lean on them): the render pipeline and "parser builds the DOM" (chapter 010 L2); DevTools Elements/Console/`$0` (chapter 010 L3); TypeScript classes/generics/`instanceof` narrowing (Unit 1); `AbortController` (Unit 1, relevant in L3 not here).

---

## Notes for downstream agents

- Keep all code samples vanilla JS/TS — **zero JSX or hooks**. This is deliberate (chapter is substrate-only); do not "modernize" examples into React.
- The snapshot-vs-live model (section 1) and collection liveness (section 5) are the two load-bearing ideas — give them the diagram budget. The hierarchy diagram is third priority.
- Forward cross-references should be one line each and point to the named chapter/lesson; do not pre-teach the destination.
- Verify against current MDN that the static/live split is stated correctly: `querySelectorAll` → static `NodeList`; `children` → live `HTMLCollection`; `childNodes` → live `NodeList`. (Confirmed standard, but the fact-check pass should re-confirm wording.)
