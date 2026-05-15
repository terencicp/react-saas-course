## Concept 1 — The DOM is program state, the HTML source is a snapshot

**Why it's hard.** Students treat "View Source" and DevTools' Elements panel as two views on the same thing. They aren't: one is the byte stream the parser saw, the other is the live tree the parser produced and JavaScript has been mutating since. Every hydration mismatch, every "value isn't updating in the source" question, every form bug traces back to this single confusion.

**Ideal teaching artifact.** A side-by-side scrubber. Left pane: the raw HTML source the server sent. Right pane: a live DOM representation of the same page, rendered as a tree. A timeline strip across the bottom advances through three states — `t=0` parse complete, `t=1` user types into the input, `t=2` a click handler sets `element.hidden = true`. Left pane never changes. Right pane updates. The student sees the divergence happen and understands the source is frozen at parse time while the DOM is the program state. Concept archetype, with a "frozen vs. live" diptych as the underlying visual idea.

**Engagement.** A three-statement true/false round after the artifact: "View Source reflects the current `value` of an input" (false), "DevTools Elements panel can show nodes that aren't in the HTML source" (true), "Refreshing the page reloads the HTML source, not the DOM" (true).

**Components.**
- New: `<SourceVsDomScrubber />` — props for the static HTML string, a sequence of mutation steps (`{label, mutation}` objects describing what JS or the user does), and a target node id. Renders the source on the left as syntax-highlighted text, the DOM tree on the right as a nested list with the mutated node highlighted, with a slider/chevron timeline. The DOM render uses the existing `Figure` shell.
- Alternative if proposal is rejected: a `DiagramSequence` containing hand-authored SVG frames showing source-vs-tree at three timestamps.
- Recall: existing `TrueFalse`.

---

## Concept 2 — The node-type hierarchy and why TypeScript ref types pick a specific subclass

**Why it's hard.** Students write `useRef<HTMLElement>(null)` and then discover `.value` isn't on the type. The reason is the hierarchy: `Element` has attributes, `HTMLElement` adds style/dataset/tabIndex, the tag-specific subclasses add what the tag actually does. Without the hierarchy in mind, every TS error from a ref reads as TypeScript being pedantic.

**Ideal teaching artifact.** A clickable inheritance tree. Five nodes top to bottom: `Node`, `Element`, `HTMLElement`, then a row of leaf subclasses (`HTMLInputElement`, `HTMLAnchorElement`, `HTMLImageElement`, `HTMLButtonElement`). Clicking a node reveals — on a side panel — the members *that level adds* (not the full surface) and a one-liner showing the JSX/ref usage that would reach for it (`useRef<HTMLInputElement>(null)` with the `.value` access lit up green). Mechanics archetype with a "reveal incrementally" rhythm.

**Engagement.** A `Buckets` sort: drop a column of imperative reaches (`.value`, `.focus()`, `.dataset.userId`, `.href`, `.closest()`, `.nodeType`) into the lowest hierarchy level on which each first appears.

**Components.**
- Existing: `Buckets` for the sort.
- New: `<TypeHierarchyExplorer />` — props for an array of `{name, adds: string[], example?: string}` levels. Renders as an SVG tree with click-to-expand side panel. Single-use risk noted below in Build priority; could degrade to a hand-SVG `Figure` with all five panels statically shown and color-coded inheritance arrows.
- Recall: `Buckets`.

---

## Concept 3 — Live collections mutate under you; static ones don't

**Why it's hard.** `element.children.length` changes mid-loop when you remove items. `element.querySelectorAll(...).length` doesn't. Both look like arrays. Neither is. The bug is silent: half the elements get skipped, the student sees inconsistent behavior, the debugger reveals nothing useful because the live collection is already shorter.

**Ideal teaching artifact.** A wrong-by-default sandbox. The student is shown a `<ul>` with six `<li>`s and a loop that iterates `ul.children` and calls `.remove()` on each child. They click "Run." Three items get removed; three survive. The artifact then offers two repair buttons: "Use `[...ul.children]`" and "Use `ul.querySelectorAll('li')`" — both fix it, and a third decoy "Use `ul.childNodes`" still breaks. The student picks, runs, observes. This is the "wrong-by-default sandbox" archetype.

**Engagement.** The sandbox itself is the assessment — the student must pick the working fix. Follow-up `MultipleChoice` confirming: "Why does `[...ul.children]` fix it?" with the correct answer naming the snapshot at spread time.

**Components.**
- Existing: `HtmlCssCoding` configured with a starter that's intentionally broken, three preset edits the student can apply, and DOM tests that verify all six `<li>` are gone after run.
- Existing: `MultipleChoice` for the follow-up.
- No new component needed.

---

## Concept 4 — Attributes are parsed strings, properties are live typed values

**Why it's hard.** This is the chapter's central misconception and the source of half the hydration errors a student will hit in Unit 5. `<input value="">` and `inputElement.value === "what the user typed"` look like a contradiction. They're tracking different things. Until the model lands, controlled-vs-uncontrolled inputs, `defaultValue` vs. `value`, and every `className`/`htmlFor` rename feel like React inventions instead of platform semantics.

**Ideal teaching artifact.** A two-pane simulator built around a single `<input>`. Left: a `<input>` the student can type into. Right: a live readout split into two rows — top row "Attribute side" showing `getAttribute('value')` and `outerHTML`; bottom row "Property side" showing `.value`, `.defaultValue`. A row of buttons across the top forces specific actions: "user types `hello`", "JS calls `input.value = 'world'`", "JS calls `input.setAttribute('value', 'world')`", "reset." After each action the two readouts update. The student watches the attribute side stay frozen while the property side moves, then sees the attribute side change only when `setAttribute` is called. Concept archetype, with the four canonical patterns introduced in surrounding prose using this simulator as the anchor for the default-vs-current pair first; identical, renamed, and attribute-only cases follow as variations.

A second beat is warranted: a static crosswalk table mapping HTML attribute name → DOM property name → JSX prop name across the renamed cases (`class`/`className`, `for`/`htmlFor`, `tabindex`/`tabIndex`, `readonly`/`readOnly`, `maxlength`/`maxLength`). The recognition payoff — JSX prop names are property names, not React inventions — is the punchline this table delivers.

**Engagement.** A `Tokens` exercise on a chunk of JSX: click every prop name that came from the DOM property side (not the attribute side). Decoys include `data-user-id` (attribute-only) and `aria-label` (attribute-only). Correct picks include `className`, `htmlFor`, `tabIndex`, `defaultValue`.

**Components.**
- New: `<AttributeVsPropertyPlayground />` — props for the initial HTML, a list of preset actions to drive (`{label, kind: 'type' | 'setProperty' | 'setAttribute', value}`), and which attribute/property keys to display in the readouts. Reused twice in this chapter (Concept 4 and Concept 5 below).
- Existing: `Tokens` for the recall sort.
- Existing: a Markdown table inside `Figure` for the renamed-property crosswalk.

**Project link.** None — Unit 3 has no chapter-end project. The concept lands in Unit 4's first JSX lesson (4.1.1) and again in Chapter 7 (forms).

---

## Concept 5 — Boolean attributes use presence semantics, not value semantics

**Why it's hard.** `<button disabled="false">` disables the button. `setAttribute('disabled', false)` disables the button. The string `"false"` is a present value, and presence is what counts. Students who learned attributes as "name-value pairs" wire this wrong every time and trust DevTools' attribute display to tell them whether something is disabled. The property side returns a typed boolean; the attribute side returns `null` or a string.

**Ideal teaching artifact.** A misconception-first ambush. The lesson opens with a small JSX snippet — `<button disabled={isLoading ? 'false' : 'true'}>Save</button>` — and a `PredictOutput`-style prompt: "When `isLoading` is `false`, is the button enabled or disabled?" The student predicts. The reveal: disabled, because `'false'` is a present value. The same `AttributeVsPropertyPlayground` from Concept 4 is then reused, this time bound to a `<button>` with `disabled` toggles, showing `.disabled` (typed boolean) versus `getAttribute('disabled')` (string-or-null) under four actions: set property `true`, set property `false`, `setAttribute('disabled', '')`, `removeAttribute('disabled')`.

**Engagement.** The `PredictOutput` at the open is the lock-in. A follow-up two-statement `TrueFalse` confirms: "`setAttribute('disabled', 'false')` disables the element" (true), "`element.disabled = false` enables the element" (true).

**Components.**
- Existing: `PredictOutput` for the ambush.
- Reused: `<AttributeVsPropertyPlayground />` from Concept 4.
- Existing: `TrueFalse` for follow-up.

---

## Concept 6 — Events walk the tree twice; `target` and `currentTarget` track different elements

**Why it's hard.** Students conflate the element they clicked with the element the handler is bound to. In a delegation handler that distinction is the whole game. Add the capture/bubble phases and the student needs three things stable in their head simultaneously: which leg the event is on, which element the user touched, which element holds this handler.

**Ideal teaching artifact.** A tree-walk visualizer. A nested DOM tree is shown (`window` → `document` → `<body>` → `<form>` → `<button>`), with click handlers registered on three of the elements — say `<body>` (capture), `<form>` (bubble), and `<button>` (target). The student clicks the button. An animated pulse travels down the tree (capture leg, hitting `<body>`'s handler), reaches `<button>` (target phase), then travels back up (bubble leg, hitting `<form>`'s handler). At each fired handler, a log entry appears showing `event.target` (always the button) and `event.currentTarget` (the element on this handler). A toggle lets the student switch the `<body>` handler between capture and bubble registration to see the order change. Mechanics archetype with the animation carrying the temporal model.

**Engagement.** A `Sequence` exercise: given the same tree and three registered handlers, drag the four log lines (capture-phase body, target-phase button, bubble-phase form, bubble-phase window if added) into firing order. Then a `MultipleChoice`: "Inside the `<form>`'s click handler, `event.target` is…" with the correct answer being `<button>`.

**Components.**
- New: `<EventPhaseVisualizer />` — props for a tree of `{tag, id?, handlerPhase?: 'capture' | 'bubble' | 'target'}` nodes, a target element id, and an optional speed control. Animates the capture-then-bubble walk and logs `target`/`currentTarget` per fire. Used once in this chapter but has a credible forward-link to Chapter 4.7.6 (Synthetic events) where the same visualization can show React's root-level delegation in contrast — see Build priority.
- Existing: `Sequence` and `MultipleChoice` for recall.

---

## Concept 7 — Delegation: one listener on an ancestor, `closest()` plus `data-*` routes the action

**Why it's hard.** Students intuit "one listener per button." It's the wrong default for any list, any dynamically-rendered children, any case where the count grows. The senior pattern is one listener on a stable ancestor, `event.target.closest('[data-action]')` to find the actionable element, the `data-*` attribute as the routing discriminator. This is also exactly what React's synthetic event system does — one listener at the root, dispatched by the fiber tree — and naming that parallel is what makes `onClick` legible later.

**Ideal teaching artifact.** A guided puzzle. The student is given a `<ul>` containing six list items, each with a different `data-action` (`edit`, `delete`, `archive`, etc.) and an "Add item" button that injects new rows. They are shown a broken version with one listener per `<li>` and asked: "Click Add three times, then click the new items' Edit buttons. What happens?" (Nothing — the listeners were attached at load time.) They then refactor — guided by inline TODOs — into a single delegated listener on the `<ul>`, using `closest('[data-action]')` and `dataset.action` to route. Tests verify both the original buttons and the newly-added ones fire correctly. Pattern archetype, with "code named for what it prevents" — the prevention being the dead-listener-on-dynamic-children class.

**Engagement.** The puzzle itself is the assessment. Follow-up: a short prose paragraph reframes React's synthetic event system as "delegation at the document root, routed by the fiber tree" — and a one-question `MultipleChoice` confirms the parallel: "When you write `<button onClick={handle}>` in JSX, where does the actual DOM listener live?" with the correct answer naming the React root.

**Components.**
- Existing: `HtmlCssCoding` with starter code, inline TODOs, and DOM tests that verify dynamically-added items respond.
- Existing: `MultipleChoice` for the React-parallel recall.

---

## Concept 8 — One `AbortController` per setup site is the 2026 listener-cleanup reflex; `passive: true` is the scroll/wheel/touch default

**Why it's hard.** The historical pattern — name your handler, call `addEventListener(type, named)`, match it with `removeEventListener(type, named)` — fails the moment you register more than one listener, the moment you use an inline arrow, the moment you forget exactly one removal. `AbortController` collapses the whole cleanup surface to one switch per scope. Separately, `passive: true` on scroll/wheel/touch unblocks the browser's scroll thread; the student needs the reflex and the one trigger that flips it (a genuine `preventDefault` need).

**Ideal teaching artifact.** Two beats. First, a code diptych comparing the two cleanup styles side by side: left, three named handlers and three matching `removeEventListener` calls in cleanup; right, one controller, three `addEventListener` calls with `{ signal }`, one `controller.abort()` in cleanup. Same behavior, half the references. The student reads both and watches the line count and the leak surface collapse. Second beat: a small interactive scroll-handler demo where the student toggles `{ passive: true }` on and off, scrolls, and sees a frame-time readout — passive scrolls stay smooth, non-passive scrolls show jank when the handler does any work. Pattern archetype for the controller, Mechanics archetype for the passive demo.

**Engagement.** A `Buckets` sort: drop ten listener-registration scenarios (`window keydown`, `document click for delegation`, `wheel on a chart`, `touchmove on a swipeable card`, `submit on a form`, `MediaQueryList.change`, `WebSocket.message`, `scroll on body`, `click on a button`, `resize on window`) into two columns — `{ passive: true }` default vs. omit `passive`. Decoys include `submit` (no scroll/wheel/touch, so passive is moot).

**Components.**
- Existing: `CodeVariants` for the cleanup-style diptych — two tabs, "Named handlers" and "AbortController," each with its own explanation.
- New: `<PassiveListenerDemo />` — a small scroll surface with a toggleable wheel/scroll listener that does throttle-able work, plus a frame-time/jank readout. Single-use in this chapter; forward-link is weak (Chapter 4.7.6 might re-reference but probably won't re-demo). Demoted to alternative: a hand-SVG `Figure` showing the browser scroll thread waiting on a non-passive handler versus skipping it on passive, paired with a short `Code` block of the listener.
- Existing: `Buckets` for the sort.

---

## Component proposals

- **`SourceVsDomScrubber`** — props: `{ source: string; steps: Array<{label, mutation}>; targetId?: string }`. Shows HTML source frozen on the left, a live DOM tree on the right, scrubber across the bottom advancing through the steps.
  - Uses in this chapter: Concept 1.
  - Forward-links: Chapter 5.2.5 (hydration mismatch failure modes) could reuse this with server-vs-client DOMs.
  - Leanest v1: drop the slider, ship as a `DiagramSequence` of three pre-rendered frames (parse, type, JS-mutation) using `Figure` with hand-SVG trees. Carries the same teaching at a fraction of the build.

- **`TypeHierarchyExplorer`** — props: `{ levels: Array<{name, adds: string[], example?: string}> }`. SVG inheritance tree with click-to-expand side panel.
  - Uses in this chapter: Concept 2.
  - Forward-links: None — single-use. Demoted in Concept 2's primary recommendation to a hand-SVG `Figure` with all panels statically visible.
  - Leanest v1: static SVG inside `Figure`, no interactivity. If the click-to-reveal is dropped, the component shouldn't be built.

- **`AttributeVsPropertyPlayground`** — props: `{ initialHtml: string; actions: Array<{label, kind, value}>; readouts: { attributes: string[]; properties: string[] } }`. Two-pane live readout of attribute side vs. property side as actions are driven.
  - Uses in this chapter: Concepts 4 and 5.
  - Forward-links: Chapter 4.1.1 (JSX prop names) could reuse it to anchor the rename table; Chapter 5.2.5 (hydration) could reuse it to show why a server-rendered attribute and a client property disagree; Chapter 7 (forms) for controlled-vs-uncontrolled.
  - Leanest v1: hard-code the three or four canonical actions instead of accepting a prop array; ship with the `<input>` + `<button>` cases only. Still carries both concepts.

- **`EventPhaseVisualizer`** — props: `{ tree: NodeSpec[]; targetId: string; handlers: Array<{nodeId, phase}> }`. Animates capture-target-bubble walk with per-handler `target`/`currentTarget` log.
  - Uses in this chapter: Concept 6.
  - Forward-links: Chapter 4.7.6 (Synthetic events) for the "React delegates at the root" reframe — same tree, listener at root only.
  - Leanest v1: skip animation, render the walk as a numbered sequence of pulses controlled by a "Step" button. Still teaches the order and the `target`/`currentTarget` distinction.

- **`PassiveListenerDemo`** — props: `{ work: () => void; toggleable: boolean }`. Small scrollable surface with a toggle for `{ passive }` and a frame-time readout showing jank.
  - Uses in this chapter: Concept 8.
  - Forward-links: None — single-use. Demoted in Concept 8's primary recommendation to a hand-SVG `Figure`.
  - Leanest v1: skip; ship the SVG-plus-`Code` alternative.

---

## Build priority

Two proposals carry real reuse weight. `AttributeVsPropertyPlayground` lands in two concepts within this chapter and has credible forward-links to 4.1.1, 5.2.5, and Chapter 7 — it is the highest-priority build. `EventPhaseVisualizer` is used once here but compounds in Chapter 4.7.6 where the same visualization reframes React's root-level delegation; build it next.

`SourceVsDomScrubber` is the third candidate — single use here but the hydration story in 5.2.5 is one of the unit's hardest concepts, and a server-vs-client variant of this scrubber would be the right teaching artifact there. If 5.2.5's pedagogy doc confirms that direction, build it; if not, ship the `DiagramSequence` fallback for Concept 1.

The remaining two proposals — `TypeHierarchyExplorer` and `PassiveListenerDemo` — are single-use without forward-links and have already been demoted to hand-SVG `Figure` alternatives in their per-concept Components bullets. Skip building.

---

## Open pedagogical questions

- Concept 7's puzzle assumes `HtmlCssCoding` can verify behavior on dynamically-added DOM nodes through its DOM-test surface. If the test runner can't drive a click on a node that didn't exist at test-setup time, the puzzle has to be downgraded to a "fix the broken code" exercise without dynamic-addition assertions.
- Concept 8's passive-listener demo depends on jank being legible at the frame-time scale a student would observe on a modern dev machine. If the work loop has to be cranked hard enough to look fake, the SVG alternative is the better teaching artifact and the demo should not be built.
