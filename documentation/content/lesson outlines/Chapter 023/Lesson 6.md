# Synthetic events

Title (h1): Synthetic events
Sidebar label: Synthetic events

---

## Lesson framing

This is the chapter's only DOM-facing lesson and the last of the six teaching lessons. It is a **cash-in lesson**: Chapter 014 L3 already taught the native event model at full depth (three phases, `event.target` vs `event.currentTarget`, `preventDefault` vs `stopPropagation`, delegation with `closest()` + `data-*`, the `AbortController` cleanup reflex) and *named* React synthetic events as recognition-only. This lesson is where the student finally writes `onClick`, `onChange`, `onSubmit` on JSX and learns precisely how React's layer maps onto — and three ways diverges from — the native substrate they already know. The spine: **`onClick` is not a new model; it's the native model you learned, wrapped, typed, and delegated at the React root.**

Target student: experienced dev, new to React, strong on the DOM substrate (Ch 014), fresh off five render-model lessons. They do *not* need "what is an event listener." They need the delta — what React adds, what to type, and the handful of behaviors that bite in production because the names look identical to native (`onChange` semantics, root delegation and what it does to `stopPropagation`'s reach, the typing gap between `target` and `currentTarget`).

Pedagogical decisions that apply lesson-wide:

- **Lead with the map, not the API list.** The opening reframes the whole lesson as a translation table from a model the student owns to React's. Do not re-teach bubbling/capture/`preventDefault`/`stopPropagation` mechanics — assert them as known (one-line `Term` refreshers max) and spend the budget on what's new. This is the single most important framing call; a generic "React events 101" would fail the "decisions before syntax" and "no bootcamp scaffolding" filters.
- **The three production-biting divergences are the load-bearing content**, each deserving real estate because the names mislead: (1) root delegation since React 17 (not `document`) and what it does to `stopPropagation`'s reach; (2) `onChange` fires every keystroke, unlike native `change`; (3) `e.currentTarget` is typed against the element, `e.target` is not — reach for `currentTarget` by default. Everything else (naming convention, capture variant, pointer events, keyboard `e.key`) is supporting reach.
- **TypeScript is a first-class subject here, not an afterthought.** The course is TS+JS as one language; event handler typing is a daily friction point for React newcomers. Teach the generic-over-element event types (`MouseEvent<HTMLButtonElement>`, `ChangeEvent<HTMLInputElement>`, etc.) and the inline-infers / extracted-annotates rule. Use `CodeTooltips` to surface inferred types inline rather than prose digressions.
- **Minimize cognitive load via the simplified-then-complicated ladder.** Start with the simplest possible handler (`onClick` on a button), establish the wrapper mental model, *then* add typing, *then* the divergences, *then* the specialized event families. Never front-load the full event-prop taxonomy.
- **Keep React-specific reach pointed forward, not deep.** Forms (`onSubmit` + `preventDefault`, controlled inputs) are *named and demonstrated minimally* but explicitly deferred to Unit 6, which owns the `action={fn}` pattern that retires most manual `preventDefault`. Esc-to-close keyboard handling is named but deferred to Ch 027 L4. Hold these boundaries hard — this lesson teaches the *event surface*, not forms or a11y patterns.
- **Code-first, diagram-light.** This is a hands-on syntax-and-typing lesson; one focused diagram earns its place (the root-delegation flow, because it's counterintuitive and the source of the `stopPropagation`-reach surprise). Two live `ReactCoding` exercises let the student feel the typing and the `onChange`-per-keystroke behavior. No video prioritized — the interactive editors serve better than a talking head for this material.
- **Compiler thread, lightly.** The inline-handler-vs-extracted-handler decision is a readability call, not a performance one — the React Compiler (Ch 026, established as on-by-default in this chapter) memoizes inline arrow handlers in pure components. State this once where it naturally arises; do not re-litigate memoization.

The mental model the student should leave with: *React owns one listener per event type at the app root; my `onClick`/`onChange`/`onSubmit` props register handlers in React's tree, which dispatches a typed `SyntheticEvent` that behaves like the native event I already know — same `preventDefault`/`stopPropagation`/bubbling — with three differences I can name and three event families (`change`, keyboard, pointer) I reach for by reflex.*

End-state capabilities: wire a typed click/change/submit handler; choose `currentTarget` over `target` and explain why; explain how root delegation changes the reach of `stopPropagation`; know `onChange` fires per keystroke; reach for `e.key` and pointer events correctly; know which event reach belongs to this lesson vs Unit 6 / Ch 027.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, framed as recognition + tension. Chapter 014 taught `addEventListener`, capture/bubble, `e.stopPropagation()`, delegation with `closest()`. Now JSX gives you `onClick`, `onChange`, `onSubmit` — *they look like the same surface*. Are they? Lead the student to the answer: they're React's **synthetic event** layer — the native model, wrapped, typed, and delegated at the React root rather than per-element. Preview the payoff: by the end they can wire any typed handler, and they'll know the three places React's layer diverges from native in ways that bite. Keep it to ~2 short paragraphs. Plant the spine sentence: *`onClick` is the native model you already know, wrapped and typed.* Reference back to Ch 014 explicitly so the student feels the continuity (this is the "connect to what they know" move).

Do **not** put a topic list here. Warm, terse, adult.

### The synthetic event wrapper

Goal: install the wrapper mental model and the "you already know its API" payoff, at the simplest possible call site.

- Start with the minimal handler: a `<button onClick={handleClick}>`. Show that `handleClick` receives an argument — the event — and that it carries the *same shape the student already knows*: `type`, `target`, `currentTarget`, `preventDefault()`, `stopPropagation()`. Name it: this is a `SyntheticEvent`, React's cross-browser wrapper around the native `Event`.
- Land the key reassurance early to kill anxiety: **the surface is the one you learned in Ch 014.** `preventDefault`/`stopPropagation` mean exactly what they meant natively (one-sentence refresher each, `Term`-wrapped, not a re-teach). Bubbling through the React tree works like DOM bubbling. The student is not learning a new event model.
- Name the escape hatch: `e.nativeEvent` is the raw browser `Event` underneath, for the rare case a native-only API is needed (e.g. `e.nativeEvent.stopImmediatePropagation()`, since `stopImmediatePropagation` lives on the native event). One sentence — recognition reach.
- Why the wrapper exists at all (senior "why this"): historically it normalized browser quirks; by 2026 those quirks have largely evaporated but the abstraction stayed because it's also how React **integrates events with its render scheduling** (the dispatch happens through React's tree, batched with the render system — tie back lightly to L4's batching: setters fired inside an event handler batch into one render). Keep this to 2-3 sentences; the point is "the wrapper isn't legacy cruft, it's the integration seam," not a history lesson.
- Retire the pooling myth in one breath: pre-React 17 the event object was pooled and nulled after the handler returned, so reading `e.target` in an async callback gave `null` (and tutorials told you to call `e.persist()`). **React 17 removed pooling** — synthetic events are normal objects now, hold a reference freely, `e.persist()` is a no-op. Name it once because the student *will* hit stale tutorials and old StackOverflow answers claiming otherwise. Put this in a `:::note` so it reads as "ignore the old advice," not as a rule to memorize.

Code: a single small `Code` block for the minimal `onClick`. Use `CodeTooltips` on the event object's members (`currentTarget`, `nativeEvent`, `preventDefault`) for inline definitions so the prose stays about the model. No `AnnotatedCode` needed yet — the block is tiny.

`Term` candidates here: **SyntheticEvent** (React's cross-browser wrapper around a native Event), **delegation** (one listener on a shared ancestor handling many descendants — refresher from Ch 014), **bubbling** (event travels target→ancestors — refresher).

### Typed handlers, parameterized by element

Goal: this is the daily-friction subject for React newcomers; give it full adult depth. The student must leave able to type any handler and to know when annotation is even needed.

- The rule, stated up front: React's event types are **generic over the element the handler is attached to**. Import from `react`, parameterize with the element type: `MouseEvent<HTMLButtonElement>`, `ChangeEvent<HTMLInputElement>`, `KeyboardEvent<HTMLInputElement>`, `FormEvent<HTMLFormElement>`. Show the four daily ones; note the full surface lives in React's types and the student searches the rest.
- The senior cut that saves the most annotation noise: **inline handlers infer their parameter type from the prop position** — `<button onClick={(e) => ...}>` needs no annotation, TS knows `e` is `MouseEvent<HTMLButtonElement>`. You only annotate when the handler is **extracted** to a named `const` outside the JSX, because then there's no prop position to infer from. State this as the reflex: write inline → no types; extract → annotate the parameter. This directly aligns with the course's "inference-led at the boundaries, annotate at the seams" TS stance.
- Show both shapes side by side so the inference difference is concrete.

Components:
- `CodeVariants` with two tabs — **Inline (inferred)** and **Extracted (annotated)** — modeling the same button handler both ways. Tab 1: inline arrow, prose notes "TS infers `e` from the `onClick` prop — zero annotation." Tab 2: `const handleClick = (e: MouseEvent<HTMLButtonElement>) => ...` with the `import type { MouseEvent } from 'react'` line, prose notes "extracted handlers lose the prop position, so annotate." This A/B is the clearest vehicle for the inference rule.
- `CodeTooltips` on the type names in the extracted variant (`MouseEvent`, `ChangeEvent`, etc.) giving the one-line "React's event type, generic over the element it's bound to."
- Optional small `Dropdowns` (fenced mode) check: a code block with `___` blanks where the student picks the correct event type for a given handler (`onChange` on an `<input>` → `ChangeEvent<HTMLInputElement>`; `onSubmit` on a `<form>` → `FormEvent<HTMLFormElement>`; `onClick` on a `<button>` → `MouseEvent<HTMLButtonElement>`). Low-cost recall drill that reinforces the generic-over-element pattern. Keep options plausible (swap the element param, swap the event family) so it's not pattern-matching.

Watch-out woven into prose (not a separate section): importing `MouseEvent` etc. from `react` shadows the global DOM `MouseEvent` — that's intended; you want React's typed version. One sentence.

`Term` candidate: none new beyond the tooltips.

### currentTarget over target

Goal: the first production-biting divergence, and the one with the cleanest senior reflex. Frame as a typing problem with a one-word fix.

- Refresh the Ch 014 distinction in one line (`Term`-wrapped): `currentTarget` = the element the handler is attached to; `target` = the deepest element the event originated on. Same as native — assert, don't re-derive.
- The React-specific bite: **`e.currentTarget` is typed against the element** (because the handler's prop position pins it), so `e.currentTarget.value` on an input handler is fully typed, no cast. **`e.target` is typed as the generic `EventTarget`**, which has no `.value`/`.checked`/`.name` — reading `e.target.value` is a TS error without a cast or narrowing. The reflex: **reach for `currentTarget` by default** for reading `.value`, `.checked`, `.name`, `dataset`. This is the senior default and it sidesteps the whole casting problem.
- Be honest about the nuance so the student isn't surprised later: `currentTarget` and `target` are the *same element* for a handler directly on the input (the common case), so `currentTarget` is correct and free. They diverge under delegation (handler on a parent, click on a child) — and that's exactly the case where you'd narrow `target` deliberately. But for controlled-input-style reads, `currentTarget` is the typed, correct reach. Don't over-explain; the rule is "default to `currentTarget`."

Components:
- `CodeVariants` with two tabs — **`e.target.value` (red)** and **`e.currentTarget.value` (green)** — using `data-mark-color` red/green per pane. Tab 1 shows the TS error (`Property 'value' does not exist on type 'EventTarget'`), prose explains why `target` isn't typed. Tab 2 shows the clean typed read, prose lands the reflex. The before/after framing is exactly what `CodeVariants` is for.
- `CodeTooltips` could surface the inferred type of `e.currentTarget` (e.g. `HTMLInputElement`) vs `e.target` (`EventTarget`) inline — strong use of tooltips to show the type-level difference without prose.

`Term` candidates: **currentTarget**, **target** (both one-line refreshers).

### Delegation at the React root

Goal: the second divergence, and the most counterintuitive — worth the lesson's one diagram. The student already understands delegation (Ch 014); the new fact is *where* React delegates and what that does to `stopPropagation`'s reach.

- The fact: since **React 17**, React does **not** attach handlers to each DOM node, and it does **not** attach at `document` (the pre-17 behavior). It attaches **one listener per event type at the root container** — the DOM node React mounts into. Frame the root concretely without dragging in SSR: React renders its tree into a specific DOM root (set up via `createRoot`; in a Next.js app the framework wires this for you — recognition only, don't teach `createRoot` setup). Your `onClick` props don't become native listeners on each button; they're entries in React's tree, dispatched from that single root listener.
- Why the student should care (two concrete consequences, this is the senior payoff):
  1. **Multiple React apps / widgets on one page don't fight** over `document`-level handlers — each root owns its own listener, so two independently-mounted React trees no longer stomp on each other. (One sentence; the multi-root case is rare for a Next.js SaaS but explains the design.)
  2. **`stopPropagation` now reaches farther than it used to** — this is the load-bearing consequence and the place stale tutorials are wrong. Because React's listener lives at the **root container** rather than at `document`, a React handler that calls `e.stopPropagation()` **does** stop a native listener attached to `document` (or any ancestor *above* the root) from firing — the native event never bubbles past the root, so that outer listener never sees it. Pre-React-17 this was the opposite: React listened at `document`, the native `document` listener had already received the event, and `stopPropagation` in a React handler couldn't hold it back. **Author MUST teach the React 17+ behavior; do not reproduce the React-16 "your document listener still fires" claim from older articles.** The durable rule for the student: a React handler's `stopPropagation()` contains the event *within the root container*, so global native `document` listeners (Ch 014's window/document keyboard-shortcut reach) and third-party DOM libs listening above the root can be silently suppressed by a React child — that's the surprise to watch for. Native listeners attached *below* the root and React handlers still interleave by ordinary DOM bubbling order. Keep this to one tight paragraph; the single fact to anchor is "root, not document, so `stopPropagation` reaches the outer native listeners it once couldn't."
- The diagram (the one diagram that earns its place): a `Figure` wrapping an `ArrowDiagram` **or** hand-coded HTML showing a click on a nested button flowing **up to the React root's single listener**, then React **dispatching** the synthetic event back **through its component tree** to the matched `onClick` handlers. Pedagogical goal: make "the listener is at the root, not on the button" visible, since it contradicts the student's mental image of `onClick` as a per-element listener — and makes the `stopPropagation`-stops-at-the-root consequence obvious. Keep it horizontal and short (vertical-space constraint). Two lanes: left = real DOM tree with one listener badge at the root container and a (suppressible) native listener badge up on `document` above it; right = React component tree with the handlers. An arrow from the clicked node up to the root listener, then a "dispatch" arrow into the React tree; mark the segment from root up to `document` as "blocked by `stopPropagation`." If `ArrowDiagram` geometry gets fiddly across the two lanes, hand-coded HTML inside `Figure` is the fallback (this is an annotated-illustration shape — HTML+CSS is sanctioned per the diagrams index). Caption states the payoff: "One listener at the root container, dispatched through React's tree — so `stopPropagation` stops the event before it reaches `document`."
- Optional `PredictOutput` or `MultipleChoice` reinforcing the corrected rule: a snippet with a `document` `addEventListener('click', …)` plus a React child whose `onClick` calls `e.stopPropagation()` — "does the document listener fire?" Correct answer: no (React 17+). This directly inoculates against the stale model. Author's call whether to include; the `Buckets` synthesis at lesson end may cover it instead — don't double up.

`Term` candidates: **root container** (the DOM node React renders its tree into).

### onChange fires on every keystroke

Goal: the third divergence, the one that confuses students who read MDN's native `change` event. Short, sharp, with a live demo so they *feel* it.

- The fact: React's `onChange` on a text input fires on **every keystroke**, not on blur. This contradicts the native `change` event, which fires only when the input loses focus after a value change. React's `onChange` is effectively wired to the native `input` event; React treats `onInput` and `onChange` as aliases. Name this explicitly because the mismatch is a documented source of confusion — a student reading "the `change` event fires on blur" on MDN will mis-predict React's behavior.
- The reflex this enables: `onChange={(e) => setValue(e.currentTarget.value)}` updating state on each keystroke is the canonical pattern (full controlled-input treatment is Unit 6 — name the deferral). The student should leave knowing *that* `onChange` is per-keystroke, which is exactly what makes live-updating UI work.
- Keep controlled-vs-uncontrolled out of scope — one sentence pointing to Unit 6. This lesson is about the *event*, not the input pattern.

Components:
- `ReactCoding` (exploration mode — no `tests`, no `target`, `live` on) with a tiny `<input onChange={...}>` that echoes the value into a `<p>` below, so the student types and watches it update on every keystroke. Pedagogical goal: make "every keystroke" visceral in two seconds. Keep the starter minimal (a `useState` + input + echo). This is exploration, not graded — the feeling is the lesson. Flag for the downstream agent: this uses `useState` ahead of its full Ch 024 treatment — that's already sanctioned across this chapter (L3's primer), keep it to the basic `const [v, setV] = useState('')` shape, and label the input properly per the a11y note.

`Term` candidate: none new.

### Forms and preventDefault, briefly

Goal: the student needs `onSubmit` + `preventDefault` to not be mystified, but Unit 6 owns forms. Teach the *event mechanics* only; defer the pattern.

- The mechanic: `<form onSubmit={(e) => { e.preventDefault(); ... }}>`. Without `preventDefault()`, the browser does its default full-page navigation/submit (the same default-action cancellation the student learned natively in Ch 014 — assert it). With it, you handle the submit in JS.
- The forward pointer (senior "this is changing"): in 2026, the `<form action={fn}>` Server-Action pattern (Unit 6) replaces *most* manual `onSubmit`/`preventDefault` handlers — the action prop owns the submit lifecycle and you rarely write `preventDefault` yourself. Name this so the student doesn't over-invest in the manual pattern, then explicitly defer the form surface to Unit 6. One short paragraph. Do **not** demonstrate `useActionState`, controlled inputs, or validation here.
- `FormEvent<HTMLFormElement>` as the handler type when extracted (ties back to the typing section).

Code: one small `Code` block showing the `onSubmit` + `preventDefault` shape. No exercise — this is a named mechanic with a deferral, not a skill to drill here.

`Term` candidate: **preventDefault** (one-line refresher: cancels the browser's default action for the event).

### Keyboard events and the e.key reflex

Goal: a focused, high-value event family the rest of the course assumes. Short.

- The reflex: read **`e.key`** — string values like `'Enter'`, `'Escape'`, `'ArrowUp'`, `' '` (space). `e.keyCode`, `e.charCode`, and `e.which` are **deprecated** — don't reach for them. State the deprecation as fact. (`e.code` exists for physical-key identity regardless of layout — name in one clause if useful, but `e.key` is the daily reach.)
- The canonical use: `onKeyDown={(e) => { if (e.key === 'Escape') ... }}` for dismissing things. Name that Esc-to-close modals/menus is the daily reach — but the *focus management and accessibility* of dismissible overlays is Ch 027 L4's job; here we only teach reading the key. Hold that boundary.
- Modifier keys: `e.ctrlKey`, `e.shiftKey`, `e.metaKey`, `e.altKey` — booleans for chord shortcuts (e.g. ⌘K). One sentence.
- `onKeyDown` vs `onKeyUp` vs `onKeyPress`: reach for `onKeyDown` (fires before the value changes, works for all keys including modifiers/arrows); `onKeyPress` is **deprecated** (printable keys only, not in DOM Level 3). One line.

Code: a small `Code` block with the `e.key === 'Escape'` shape. No diagram, no exercise — recall-level reach.

`Term` candidate: none new; `e.key` is self-explanatory in context.

### Pointer events, the unified input primitive

Goal: name the 2026 default for any code that handles both mouse and touch, so the student doesn't reach for the legacy `onMouseDown` + `onTouchStart` pair. Recognition + reflex, kept tight.

- The fact: `onPointerDown`, `onPointerMove`, `onPointerUp` cover **mouse, touch, and pen** through one API. `e.pointerType` is `'mouse' | 'touch' | 'pen'` when you need to branch. This is the senior 2026 reach for drag, custom gestures, anything that must work across input types — the older mouse+touch pairing is legacy and double-handles.
- One genuinely useful senior reflex worth naming concretely: **pointer capture** — `e.currentTarget.setPointerCapture(e.pointerId)` in a drag handler keeps events flowing to the element even when the pointer leaves it. This is *the* reason drag handlers use pointer events; one sentence + a one-line code snippet, recognition reach.
- Explicitly scope out: drag-and-drop libraries (`@dnd-kit`) and gesture libs are out of scope — recognition only. One sentence. The point of this section is "reach for `onPointer*`, not `onMouse*`+`onTouch*`," not building a drag system.

Code: one small `Code` block with `onPointerDown` + `pointerType` branch and the `setPointerCapture` line. No exercise.

`Term` candidate: **pointer capture** (routes further pointer events to one element even after the pointer leaves it).

### Capture phase and the value typing trap (closing reaches)

Goal: sweep up two real but minor reaches so the student recognizes them, without giving either its own heavyweight section. Keep this as one section with two tight beats, or fold each beat into a `:::note` near the most related earlier section if it reads better — author's call, but they must appear.

- **Capture-phase variant**: the default `onClick` (and friends) is **bubble** phase. The capture-phase form appends `Capture`: `onClickCapture`, `onMouseDownCapture`, `onKeyDownCapture`. Same capture/bubble semantics the student learned in Ch 014 — assert. The daily reach is bubble; capture is the niche intercept-before-children case. Two sentences.
- **The `value` typing trap**: `e.currentTarget.value` is **always a string**, even on `<input type="number">` (the DOM stores raw text) and `<input type="date">` (ISO string). The conversion to a number/date happens in your handler — don't assume the event hands you a typed number. Name it so the student doesn't blindly `parseInt` or expect a `Date`. Tie forward: Unit 6 / Zod's `z.coerce.number()` is where this coercion gets handled properly at the form boundary — one-line pointer.
- One more woven watch-out (one line): `onScroll` does **not** bubble in React (matching the DOM) — attach it to the scrolling element directly, not a parent.

Components:
- A small `Buckets` exercise closes the lesson as a synthesis check: two buckets, **"Same as native"** vs **"React-specific behavior"**, sorting paraphrased statements such as *"cancels the default browser action"* (native), *"halts bubbling up the tree"* (native), *"capture and bubble phases both exist"* (native), *"a single listener lives at the app root"* (React), *"fires on every keystroke, not on blur"* (React), *"`currentTarget` is typed but `target` is not"* (React/TS), *"a child's `stopPropagation` can block a `document` listener"* (React 17+). Pedagogical goal: force the student to consolidate exactly the lesson's central claim — what's carried over vs what's new. This is the single best end-of-lesson check because it tests the *map*, which is the lesson's thesis. Strong recommendation to include it. Keep statements paraphrased, not lifted verbatim from prose (per exercise authoring guidance on avoiding pattern-matching).

### External resources (optional, closing)

A short `CardGrid` of `ExternalResource` cards: React docs "Responding to Events" and the common-events / `SyntheticEvent` reference, and MDN's `PointerEvent` page for the pointer family. Optional, 2-3 cards max. Resourcer may adjust.

---

## Scope

**This lesson teaches** the React synthetic-event layer over the native DOM events from Ch 014: the `SyntheticEvent` wrapper and its `nativeEvent` hatch; typed handlers generic over the element and the inline-infers/extracted-annotates rule; `currentTarget` over `target` as the typed reflex; root delegation since React 17 and how it extends `stopPropagation`'s reach; `onChange`-per-keystroke; `onSubmit` + `preventDefault` mechanics (mechanic only); `e.key` keyboard reading; pointer events as the unified primitive; the capture-phase variant and the string-`value` trap as recognition reaches.

**Prerequisites (assert in one line each, do not re-teach):**
- Native event model — three phases, `target` vs `currentTarget`, `preventDefault` vs `stopPropagation`, delegation with `closest()` + `data-*`, the `AbortController` cleanup reflex (Ch 014 L3). React events *map onto* this; the lesson's job is the delta.
- `addEventListener` and where a 2026 codebase still uses it directly — window/document shortcuts, third-party DOM libs (Ch 014 L3). Used here only to explain how root delegation changes `stopPropagation`'s reach.
- Render-as-function, `UI = f(state)`, the basic `useState` shape (`const [v, setV] = useState(init)`), automatic batching (this chapter L1/L3/L4). Used for the controlled-input demo and the wrapper/scheduling tie-in; do not re-teach state.
- React Compiler is on by default in this stack (this chapter L1) — used once for the inline-handler readability note; do not re-teach the compiler.

**Out of scope — defer explicitly:**
- DOM event capture/bubble *mechanics* at depth — Ch 014 owns them; this lesson assumes them.
- Forms: controlled vs uncontrolled inputs, `<form action={fn}>` Server Actions, `useActionState`, `useFormStatus`, `useOptimistic`, validation — **Unit 6 (Ch 042–044)**. This lesson shows `onSubmit`/`preventDefault` mechanics and the `onChange` event only, and names the `action={fn}` pattern as the thing that retires manual `preventDefault`.
- Keyboard accessibility patterns — Esc-to-close focus management, focus traps, tab order — **Ch 027 L4**. This lesson teaches only *reading* `e.key`.
- Drag-and-drop and gesture libraries (`@dnd-kit`, native HTML5 drag) — recognition only; pointer events named as the platform primitive that covers most cases.
- `createRoot` / app bootstrap and SSR hydration of event listeners — Next.js wires the root; recognition only, no setup taught (Unit 4 owns SSR).
- `useEvent` / `useEffectEvent` (reading latest props/state from inside an effect) — Ch 025 / Ch 026 territory; not an event-handler topic, do not introduce.
- Custom events / `CustomEvent` and pub-sub — out of scope; the course communicates via props and context.
- `AbortController` listener cleanup *inside effects* — Ch 014 taught the pattern, Ch 025 owns `useEffect`; this lesson stays on JSX event props and doesn't open the effects surface.
- Manual `useMemo`/`useCallback` for handler identity — Ch 026 L3; the compiler handles it, named once, not taught.

---

## Code conventions notes (for downstream agents)

- **Function form**: handlers are arrow functions bound to `const` (`const handleClick = (e: MouseEvent<HTMLButtonElement>) => {...}`); inline arrows in JSX are fine and the default for simple handlers (course convention + compiler memoizes them). Components are arrow `const` with named export.
- **Imports**: event types are type-only — `import type { MouseEvent, ChangeEvent, FormEvent } from 'react'` (`verbatimModuleSyntax` enforces `import type`). Show this import line in the extracted-handler variant so the student sees where the types come from.
- **TS**: inference-led — inline handlers carry no annotation; extracted handlers annotate the parameter (matches the "annotate at the seams" rule and is the literal teaching point of the typing section).
- **JSX**: double quotes inside JSX attributes, single quotes elsewhere; `e.key === 'Escape'` uses single quotes.
- **Naming**: handlers are `handle<Event>` (`handleClick`, `handleChange`, `handleSubmit`); the event param is `e` (course-idiomatic for short handlers) — acceptable here as the conventional event-handler name, not a banned vague name.
- **a11y note for the downstream agent**: any interactive demo uses real semantic elements (`<button>`, `<form>`, `<input>` with an associated label) per the a11y baseline — even throwaway examples model semantic HTML. Don't put click handlers on `<div>`s.
- **Deliberate divergences to flag**: the `e.target.value` TS-error variant is shipped *as the anti-pattern being exposed* (paired with the `currentTarget` fix) — downstream agents must not "correct" it inline. The exploration `ReactCoding` uses `useState` ahead of Ch 024 — sanctioned chapter-wide, keep to the basic shape.
- **No `preventDefault` ceremony beyond the one form example**, and no controlled-input scaffolding — those are Unit 6's to model correctly.
- **Factual guardrail**: teach React 17+ event behavior throughout — root-container delegation (not `document`), no event pooling (`e.persist()` is a no-op), and `stopPropagation` in a React handler stopping `document`-level native listeners. Reject the pre-17 framing common in older tutorials.
