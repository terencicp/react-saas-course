# Lesson 3 outline — The event model: capture, bubble, delegate

## Lesson title

- Title: `The event model: capture, bubble, delegate`
- Sidebar label: `The event model`

## Lesson framing

This is the third and final teaching lesson of the substrate-only chapter (L4 is the quiz).
It closes the chapter's arc: L1 made the DOM a live tree, L2 split attribute vs. property, L3 puts that tree in motion — how an interaction travels through it and how a senior wires one listener to serve many nodes.

Conclusions from brainstorming that govern the whole lesson:

- **One load-bearing idea, everything hangs off it.** Every event makes two trips through the tree: down (capture) to the target, then back up (bubble). That single mental model explains delegation, `target` vs `currentTarget`, why `stopPropagation` is dangerous, and what React's event system is doing under the hood. Teach the trip first, concretely and visually; every later section is a consequence of it. This mirrors L1's "one spine sentence" and L2's "two slots" structure — the chapter's house style is *one picture, then its consequences*.
- **The senior payoff is delegation + the 2026 cleanup reflex.** Two durable skills the student leaves with: (1) write a delegated handler with `closest()` + `data-*`, and (2) the `AbortController` cleanup pattern — one controller per setup site, its signal threaded into every `addEventListener`, one `abort()` in teardown. Everything else (phases, `preventDefault`, options flags) is scaffolding that makes those two legible. Foreground them.
- **"Trigger before tool" filing, held from L1/L2.** The student writes JSX and `onClick`, not `addEventListener`, in 99% of a React codebase. So every primitive here is filed as "recognize it / rare reach," NOT a daily tool. The two framings that pay this off: (a) delegation is *exactly* what React's synthetic system does, so learning it is learning what `onClick` compiles to; (b) `addEventListener` survives in three named escape-hatch sites (window/document globals, third-party DOM libs, non-JSX browser APIs), always inside an effect/ref-callback with `AbortController` cleanup. Name the React abstraction at the call site, never as preamble (per pedagogy filter "underlying primitive named at the call site").
- **Substrate-only line MUST hold.** Vanilla JS/TS only. Zero JSX wired into runnable code, zero hooks taught. The few React mentions (`onClick`, synthetic events, the `useEffect`/ref-callback cleanup shape) are prose-level *recognition forward-references*, never runnable. This is deliberate and downstream agents must not "modernize" into JSX — flag it explicitly, same as L2 did. React events are owned by Chapter 022; hydration by Unit 4; `useEffect`/ref-callback cleanup by Chapter 022.
- **Reuse established framings and assets verbatim.** Keep L1's "photograph (source) vs running program (DOM)" spine and "rare reach, recognize it" filing. Reuse the running markup the chapter already established — `<nav id="main-nav">` with `<ul>`/`<li>`/`<a>`, and `<ul id="menu">`/`<ul id="list">` — so delegation lands on familiar DOM. Reuse `closest()`/`matches()` exactly as L1 introduced them ("you'll see it doing real work when this chapter reaches event delegation" — this lesson pays that debt). Reuse `data-*`/`dataset` from L2 ("write `data-*` in JSX, read `dataset.*` in handlers" — the delegation handler is where the reading side finally happens; this pays L2's named bridge).
- **Code conventions for samples** (per L1/L2 + Code conventions §Formatting/§Async): single quotes, 2-space indent, `const` + arrow functions, semicolons. The `AbortController`/signal cleanup pattern aligns with the conventions' cancellation rule (`{ signal }` threading, `AbortSignal`). Markup shown as a JS comment above the code (the chapter's established convention for "here's the DOM this code runs against").
- **Cognitive-load sequencing.** Three phases → `target`/`currentTarget` (needs phases) → delegation (needs both + `closest`/`data-*` from prior lessons) → `preventDefault`/`stopPropagation` (needs propagation) → options object incl. `signal` → `AbortController` pattern (needs `signal`) → React recognition (needs delegation) → escape-hatch sites + watch-outs. Each section strictly depends only on earlier ones. Start simplified (a single click, three handlers fire) and add complexity gradually.

## Lesson sections

### Introduction (no header)

Per pedagogy: warm, brief, states the goal, motivates with a concrete problem, connects to prior lessons, previews the end skill. No "Introduction" header — flows straight into the first h2.

Open with **the senior question as a concrete surprise** (the chapter's house opening, matching L1's autofill/View-Source and L2's typing experiment): you bind a click handler to a button. You click the button. But a handler on the surrounding `<form>` *also* fires. And one on `document` fires too. You never clicked the form or the document. Why did they run?

Because the event didn't happen "on the button" — it traveled. Every event walks the tree twice: down to the target, then back up. Listeners can sit anywhere along that path. State the payoff: this one fact is the whole lesson. From it falls the single most useful pattern in DOM event handling — *delegation*, one listener on a parent serving hundreds of children — which is **exactly** what React's `onClick` is doing under the hood. Connect back: L1 gave you the live tree, L2 split its data; now you watch that tree *react*. Preview the end state: by the end you can write a delegated click handler with `closest()` and `data-*`, know `preventDefault` from `stopPropagation`, and clean up listeners the 2026 way with one `AbortController`. Hold the chapter line lightly: still no React syntax — this is the substrate `onClick` sits on, and seeing it makes React legible later.

Reasoning: a counterintuitive observable surprise is the chapter's proven hook and satisfies the "decisions/why before syntax" filter. Naming delegation + React up front gives the lesson a destination so the phase mechanics don't feel academic.

### An event makes two trips: capture, target, bubble

**Goal/mental model:** install the three-phase model as a literal round trip through the tree. This is the spine; everything else is downstream.

Content:

- Teach the journey, not a definition list. An event is *dispatched at the target* but the browser walks the ancestor chain from the top first. Three phases, in order:
  - **Capture** — from `window`/`document` *down* through each ancestor to the target's parent. ("Capture" = the outer elements get first chance to intercept.)
  - **Target** — the event reaches the element actually interacted with; listeners on it fire (in registration order).
  - **Bubble** — back *up* from the target through every ancestor to `window`. ("Bubble" = rises up like a bubble.)
- Land the default that matters: **`addEventListener(type, handler)` registers on the *bubble* phase.** The third-argument `{ capture: true }` (or legacy boolean `true`) moves it to capture. State the proportion explicitly (trigger-before-tool): production code lives almost entirely on bubble; capture is the niche reach. Name the two legit capture uses lightly — intercepting before a child handles, and catching non-bubbling events at a parent — then immediately pivot to the senior alternative: for focus, `focus`/`blur` don't bubble but **`focusin`/`focusout` do**, and the bubbling pair is what you reach for (forward-link to delegation + watch-outs). Don't overspend on capture; it earns one paragraph.
- Resolve the opening surprise explicitly: the button-form-document mystery is just bubble — all three are ancestors on the bubble leg, all three had a click listener, so all three fired in bottom-up order.

**Diagram (primary, this is the lesson's keystone visual):** a `DiagramSequence` walking one click through the phases on a small concrete tree (`window` → `document` → `form` → `button`). 
- Pedagogical goal: make the abstract "two trips" spatial and temporal — the student scrubs the event down then back up, seeing which node is "active" at each tick.
- Build as plain HTML+CSS nodes inside `DiagramStep`s (one node highlighted/"lit" per step), per the html-css diagram doc (inline styles, `margin: 0` on every inner element for the prose-margin gotcha, `currentColor`/Starlight vars for theme). Steps: (1) idle tree, (2–4) capture descending `document`→`form`, arrow pointing down, (5) target phase on `button` lit, (6–8) bubble ascending `form`→`document`, arrow pointing up. Per-step captions name the phase + what fires. `DiagramSequence` is the right engine here because the whole point is the *temporal* down-then-up motion a static diagram can't show; it's self-carding (no `<Figure>` wrapper).
- This is a lesson-specific custom component: `src/components/lessons/014/3/EventPhaseWalk.astro` (or author the steps inline in MDX if simple enough — prefer inline plain-HTML steps to keep it AI-authorable, matching the diagram doc's bias).

**Exercise:** a `Sequence` ordering drill — given a click on a deeply nested `<a>`, drag the handler-fire order into sequence (e.g. `document` capture → `form` capture → `a` target → `form` bubble → `document` bubble, when listeners exist on each phase). Reinforces order recall cheaply. Place it right after the diagram.

**Tooltips (`Term`):** none strictly needed here; "capture"/"bubble"/"target" are taught inline as the subject, not assumed.

Reasoning: phases are the foundation; teaching them as a single animated trip (not three separate definitions) minimizes load and makes `target`/`currentTarget` and delegation fall out naturally. The `Sequence` exercise checks the one thing that sticks (order) without heavy machinery.

### `target` vs `currentTarget`: what was clicked vs what's listening

**Goal/mental model:** two words, two questions. `target` = the element the user actually hit (deepest node). `currentTarget` = the element *this handler is bound to*. They differ the instant a listener sits on an ancestor — which is every delegation handler.

Content:

- Define both against the trip just learned: `currentTarget` changes as the event moves (it's whichever node is currently running its listener); `target` is fixed for the whole journey (the origin). In a handler bound on `<ul>`, `currentTarget === ul` always, while `target` is whichever `<li>` (or a descendant inside it) was clicked.
- The 2026 reflex sentence to memorize: **`target` for "what was clicked," `currentTarget` for "what the handler is on."**
- Foreshadow the delegation footgun (paid off next section + watch-outs): `target` can be a *descendant* of the thing you care about (a `<span>` or even a text node inside the `<li>`), which is precisely why delegation reaches for `closest()` rather than trusting `target` directly.

**Code:** a small `Code` block (or `AnnotatedCode` if two highlights are warranted) on the established `<ul id="menu">` markup: one listener on the `<ul>`, click an `<li>`, log both `e.currentTarget.tagName` (`UL`) and `e.target.tagName` (`LI`). Keep it short; the concept is the point, not API volume.

**Exercise:** a `PredictOutput` — given the `<ul>` listener and a click on a nested element (e.g. a `<span>` inside an `<li>`), predict the two logged tag names. Withheld-answer mechanic makes the `target`-is-the-deepest-node lesson bite safely. `PredictWhy` explains: `currentTarget` is always the bound `<ul>`; `target` is the deepest hit `<span>`, which is why you climb with `closest('li')`.

Reasoning: this distinction is the #1 thing beginners get wrong with delegation, and it's a direct consequence of the phase trip, so it sits second. A predict-output drill on a nested target both teaches and pre-loads the `closest()` motivation.

### Event delegation: one listener for many children

**Goal/mental model:** the senior pattern and a chapter centerpiece. One listener on a stable ancestor handles events for any number of descendants — present or added later — by inspecting `event.target` and climbing to the meaningful element with `closest()`, then routing on a `data-*` attribute.

Content:

- Motivate against the naive alternative (decision-before-syntax): the obvious approach is a listener per button. Name where it breaks — (a) dozens/hundreds of items means dozens/hundreds of listeners (memory + setup cost), and (b) items added *after* setup (a new row, a fetched list) have no listener at all. Delegation fixes both: the parent is stable, the listener is one, and it works for children that don't exist yet because the event bubbles up to the parent regardless.
- The canonical shape, built step by step:
  1. One `addEventListener('click', handler)` on a stable ancestor (e.g. a toolbar `<div>` or `<ul>`).
  2. Inside, `const actionEl = event.target.closest('[data-action]')` — climb from the deepest hit node to the nearest element carrying the discriminator. (This *is* the `closest()` use L1 promised; this is the reading side of the `data-*`/`dataset` bridge L2 promised.)
  3. Guard: `if (!actionEl) return;` — the click landed somewhere with no action (whitespace, padding, a non-action child). This guard is non-optional and a common omission.
  4. Route on `actionEl.dataset.action` (e.g. a `switch`), each case doing the work.
- State the recognition payoff plainly: **this is what React's synthetic event system does** — one listener high up, dispatched to the right component by walking the tree. Learning delegation is learning what `onClick` compiles to. (Recognition only; Chapter 022 owns React events.)

**Primary teaching code:** `AnnotatedCode` (this is the one complex block the student must focus on part-by-part — exactly the component's stated use). Markup as a comment header: a small toolbar with two/three buttons, each `data-action="…"` (e.g. `save`, `delete`), with a child `<span>` icon inside one button to make the `closest()` climb matter. Steps walk: the single listener, the `closest('[data-action]')` climb, the null guard, the `dataset.action` switch routing. Use `color="green"` for the correct-pattern emphasis (matching L1's blue-default / red-wrong / green-good convention). `maxLines` sized to fit.

**Exercise (the lesson's main practice — live coding):** `ScriptCoding` (vanilla runner). Provide a starter with the markup built in JS (or a `document.body.innerHTML` seed) — a list/toolbar with `data-action` buttons — and a partially written delegated handler; the student completes the `closest()` + `dataset` routing so the assertions pass. Tests simulate clicks (dispatch `click` events on a nested child and on a non-action region) and assert the right branch ran and the null-click was safely ignored. 
- Why `ScriptCoding`/vanilla: the subject is plain-DOM event wiring (no JSX, holds the substrate line), and the doc says vanilla is instant-boot plain-JS with jest-style `expect`. Note for the builder: if simulating dispatched DOM events against a seeded DOM proves awkward in the vanilla iframe, fall back to having the student implement a `routeClick(targetEl)` pure-ish function that takes a node and returns the resolved action string (asserted directly) — keeps grading deterministic while still drilling `closest`/`dataset`. State this fallback so the agent can choose.

**Tooltips (`Term`):** `delegation` could carry a one-line definition on first use ("one listener on an ancestor handling events for many descendants") if it reads as jargon; optional.

Reasoning: delegation is the durable, transferable skill of the lesson and the bridge to React, so it gets the richest treatment — annotated teaching code plus a hands-on completion exercise. Leading with the naive-approach failure satisfies "trigger before tool / decisions before syntax." The null-guard and the `closest()`-not-`target` points are exactly where beginners' real-world delegation breaks, so they're foregrounded, not buried in watch-outs.

### `preventDefault` and `stopPropagation` do different jobs

**Goal/mental model:** two methods constantly confused; they're orthogonal. `preventDefault` cancels the *browser's* default reaction but lets the event keep traveling. `stopPropagation` halts the *journey* but doesn't cancel any default. You can call either, both, or neither.

Content:

- `event.preventDefault()` — cancels the default action the browser would take: form submit + navigation, link navigation, checkbox toggle, context menu. The event still propagates to other listeners. This is the common one.
- `event.stopPropagation()` — stops the trip (no further ancestors on the current leg run their listeners). The default action still happens. `event.stopImmediatePropagation()` additionally blocks *other listeners on the same element*.
- The senior warning, stated as a rule (this is the real-world footgun): **`stopPropagation` breaks delegation.** A delegated handler lives on an ancestor; a child that calls `stopPropagation` silently prevents the event from ever reaching it, and the bug is invisible at the call site. A senior almost never reaches for `stopPropagation`; reconsider the design instead. `preventDefault` is the one you actually want most of the time.
- Make the orthogonality concrete with the canonical case: a form's submit handler calling `preventDefault()` suppresses the page navigation/reload while letting your JS take over — the bread-and-butter use. Note (watch-out-adjacent, but belongs here) it does *not* stop browser-native validation or autofill.

**Diagram/decision aid:** a small 2×2 framing — call neither / `preventDefault` only / `stopPropagation` only / both — as a compact `Figure` with a plain HTML+CSS table-ish grid, or fold into prose. Pedagogical goal: cement that the two axes are independent (default-action axis vs propagation axis). Keep it lightweight; a full `StateMachineWalker` is overkill for two orthogonal toggles — do not build one here.

**Exercise:** `TrueFalse` round (matches L2's house style) with 3–4 statements probing the confusions: "`stopPropagation` prevents a form from submitting" (false — that's `preventDefault`), "calling `preventDefault` stops parent listeners from firing" (false — propagation continues), "`stopPropagation` in a child can break a delegated parent handler" (true), "you can call both on one event" (true). Each `TfWhy` re-states the orthogonality.

**Tooltips (`Term`):** `default action` — short definition ("the browser's built-in reaction to an event: a link navigating, a form submitting, a checkbox toggling") on first use, since "default" is overloaded.

Reasoning: this confusion is near-universal and directly endangers the delegation pattern just taught, so it follows delegation immediately and frames `stopPropagation` as a design smell. The orthogonality (two independent axes) is the precise mental model that dissolves the confusion — hence the 2×2 framing rather than prose alone.

### The addEventListener options object

**Goal/mental model:** the third argument's four flags, with `signal` set up as the headline (it's the gateway to the cleanup pattern next section). Frame as "the modern listener has options, and one of them changed how cleanup works in 2026."

Content — name four flags, weighted by real use:

- `capture: true` — register on the capture phase (callback to the first section). Niche; one line.
- `once: true` — auto-removes the listener after its first invocation. Real uses: one-shot setup, "first interaction" telemetry. Composes with `signal` (you can still abort before it ever fires).
- `passive: true` — a promise to the browser that you **won't** call `preventDefault`, so it can scroll/zoom without waiting on your handler (a real scroll-jank fix). State the 2026 default precisely (fact-checked): for `wheel`, `mousewheel`, `touchstart`, `touchmove` on the document-level nodes `Window`, `Document`, and `Document.body`, modern browsers (Chrome, Firefox; **Safari excepted**) already default `passive` to `true`. The senior reflex: **explicitly pass `{ passive: true }` on scroll/wheel/touch listeners on any other element**, both for clarity and because the default only covers those document-level nodes. The trigger to opt *out* (`passive: false`) is the rare case where you genuinely must `preventDefault` (e.g. a custom gesture surface that blocks native scroll) — name the trigger, per "trigger before tool."
- `signal: AbortSignal` — the 2026 cleanup reach. Pass a signal from an `AbortController`; calling `controller.abort()` removes this listener (and every other listener sharing that signal). This replaces the `removeEventListener` ceremony. Tee this up as the subject of the next section.

**Code:** a compact `Code` block showing the options object on a couple of `addEventListener` calls (a `wheel` listener with `{ passive: true }`, a setup listener with `{ once: true }`), so the syntax is concrete before the dedicated `AbortController` section.

**Exercise:** none here (the section is short and feeds directly into the next, which carries the exercise). Avoid exercise fatigue.

**Tooltips (`Term`):** `passive` is taught inline; no tooltip. `AbortSignal`/`AbortController` are taught in the next section, not assumed.

Reasoning: keeping options brief and weighting toward `passive` (a named 2026 reflex) and `signal` (the bridge to cleanup) respects the chapter's "defaults and reflexes" framing. Stating the passive default with its exact scope (document-level nodes, Safari carve-out) prevents teaching a half-truth.

### One AbortController per setup site: the 2026 cleanup reflex

**Goal/mental model:** the chapter's headline durable pattern. Replace "match every `add` with an exact `remove`" with "one shutdown switch per scope." This is the reflex that composes with React 19's ref-callback cleanup and `useEffect` teardown (forward-ref, recognition only).

Content:

- Name the pain the pattern relieves, against the legacy alternative (decisions-before-syntax). The old way: keep a named reference to every handler, call `removeEventListener(type, sameReference)` for each in cleanup. Two failure modes that bite real code: (1) **anonymous handlers can't be removed** — `removeEventListener` needs the exact same function reference, so an inline arrow is unremovable and leaks; (2) book-keeping N handlers across N targets is error-prone and easy to under-clean.
- The pattern, four points (lift the chapter outline's four bullets):
  1. **One controller per setup site:** `const controller = new AbortController();`
  2. **Thread its signal into every `addEventListener` in that scope:** `addEventListener('scroll', onScroll, { signal: controller.signal })` — works across *multiple* event types and *multiple* targets (window + document + an element) with the same signal.
  3. **One `controller.abort()` in the cleanup branch** removes them all at once.
  4. Mental model line: **one signal, many listeners, one shutdown switch** — fewer references to hold, fewer leak surfaces, and anonymous handlers are now fine (you never need their reference).
- The React forward-reference, named once and lightly (recognition, not taught — Chapter 022 owns it): in React the cleanup branch is a `useEffect` return or a ref-callback's returned function; the *shape is identical* — create a controller in setup, register listeners with its signal, `abort()` in cleanup. Priming this here means the React lesson reads as "oh, the substrate pattern I already know." Do **not** write the React code; one or two sentences max. (Ties to the conventions' cancellation rule — `{ signal }`, `AbortSignal` — so it's the same reflex used server-side.)

**Primary teaching code:** `CodeVariants` — a before/after comparison (the component's stated sweet spot). 
- Variant 1 "The `removeEventListener` ceremony": named handlers, multiple `removeEventListener` calls in a `cleanup()`; annotate the leak risk and the anonymous-handler trap. Tint/flag as the worn pattern.
- Variant 2 "One `AbortController`": the same listeners registered with `controller.signal`, a single `controller.abort()`. Annotate the win. 
- This makes the ergonomic payoff visible side-by-side, which is more persuasive than prose. Vanilla JS, holds the substrate line.

**Diagram (optional, light):** an `ArrowDiagram` or simple plain-HTML figure showing one `controller` fanning its `signal` into three `addEventListener` calls on different targets (window, document, an element), and one `abort()` arrow severing all three. Pedagogical goal: visualize "one switch, many listeners." Only build if it reads clearly at small size; otherwise the `CodeVariants` block carries it. Note this as optional so the agent can judge.

**Exercise:** `ScriptCoding` (vanilla) — give the student setup code with two or three `addEventListener` calls and a `cleanup()` stub; task: wire a single `AbortController` so that after `cleanup()` runs, dispatching the events fires nothing. Tests: dispatch before cleanup → handlers ran (counter incremented); call cleanup; dispatch again → counter unchanged. Drills the whole pattern end to end. If event-dispatch-against-targets is awkward in the runner, fall back to asserting `controller.signal.aborted` flips and that a flag set by the listeners stops changing — state this fallback.

Reasoning: this is the single most reusable takeaway, so it earns the richest before/after treatment and a hands-on drill. Leading with the two concrete failure modes of `removeEventListener` (anonymous handlers, N-bookkeeping) is the "trigger" that motivates the tool. The React forward-ref is kept to recognition to protect the chapter boundary while still paying the composition dividend.

### What React owns, and where you still write addEventListener

**Goal/mental model:** close the chapter's recurring "leak" thread for events. React owns listeners for anything in the component tree (you write `onClick`, not `addEventListener`); you reach for `addEventListener` only at a small, named set of escape-hatch sites — always inside an effect/ref-callback with the `AbortController` cleanup just learned.

Content:

- **What React owns (recognition only, Chapter 022 owns depth).** React intercepts native events at the **root container** where the tree is mounted (fact-checked: root container since React 17, *not* `document`), normalizes them, and dispatches through the component tree — i.e. it runs the delegation pattern you just learned, at framework scale. It exposes the result as a `SyntheticEvent` on `onClick={…}`. Most native semantics carry through (`preventDefault`, `stopPropagation`, `target`, `currentTarget`). One historical note worth one sentence (fact-checked): `e.persist()` is a no-op since React 17 because events are no longer pooled — recognition only, in case they see it in old code. The takeaway: for component-tree events you use `onClick`, never `addEventListener`.
- **The three escape-hatch sites where `addEventListener` still appears** (the durable list the student must recognize), each living inside a `useEffect`/ref-callback with `AbortController` cleanup:
  1. **`window`/`document` globals** — global keyboard shortcuts (`keydown`), `resize`, `scroll` on `window`. There's no JSX element to hang these on.
  2. **Third-party DOM integrations** — Stripe Elements, Mapbox, a charting lib that hands you a DOM node and its own callbacks.
  3. **Non-JSX browser APIs that emit events** — `MediaQueryList.change`, `BroadcastChannel.message`, `WebSocket.message`. Event-driven, but not through the component tree.
- Tie the bow: the pattern you just learned (one `AbortController`, signal threaded, `abort()` in cleanup) is *exactly* how you wire each of these three in real React code. The substrate lesson hands React-readiness for free.

**Diagram/visual:** none needed; a `Card`/`CardGrid` (three cards, one per escape-hatch site) is a clean, low-cost way to present the three sites memorably. Optional.

**Exercise:** `Buckets` (two-column, matches L1/L2 house style) — sort scenarios into "React owns it — use `onClick`/`onChange`" vs "escape hatch — `addEventListener` in an effect with `AbortController`." Items: a button click in a component (React), a global `Escape`-key shortcut (escape), a form field change (React), `window` resize (escape), a Mapbox marker callback (escape), a list-item click (React). Checks the trigger-before-tool judgment, which is the actual skill.

**Tooltips (`Term`):** `SyntheticEvent` — one-line definition ("React's cross-browser wrapper around the native DOM event, with the same `preventDefault`/`target`/`currentTarget` surface") on first use.

Reasoning: this section pays off the chapter's spine ("React abstracts the substrate but doesn't replace it; read the leak in DOM terms") for the event surface specifically. The three-site list is the concrete, durable recognition the student carries into Unit 3/Chapter 022. The `Buckets` drill tests judgment (when do I leave React?) rather than syntax, matching the lesson's senior-mindset aim.

### Watch-outs that bite (distributed, NOT a standalone section)

Per instructions, watch-outs live in the section teaching the concept they qualify — do **not** create a "gotchas" section. Distribution map for the writer (each is a one-liner or `Aside`/`:::caution` in its home section):

- `stopPropagation` breaks delegation → in the `preventDefault`/`stopPropagation` section (already foregrounded there as the rule).
- A passive listener that calls `preventDefault` → the call is ignored *and* logs a console warning → in the options-object section under `passive`.
- `focus`/`blur` don't bubble; use `focusin`/`focusout` for delegation → in the phases section (already raised) and reinforce in delegation.
- `click` fires on keyboard activation (Enter/Space on a button) but `mousedown`/`mouseup` don't → keyboard-accessible code branches on `click` → in delegation (accessibility-relevant, since delegated handlers should catch keyboard-triggered clicks).
- Anonymous handlers can't be `removeEventListener`'d → in the `AbortController` section (already the motivating failure mode).
- `event.target` can be a descendant (even a text node) → use `closest()` to climb → in `target`/`currentTarget` and delegation (already foregrounded).
- Touch + mouse fire together on mobile; prefer unified `pointer*` events when you need pointer input → brief one-liner; the chapter names `pointer*` only as the unifying primitive (depth is out of scope), so keep to a single sentence in the options/escape-hatch area or a closing aside.

Reasoning: spreading watch-outs into their home sections keeps each at the moment of relevance (lower load, better recall) and complies with the "no watch-out-only section" rule.

### External resources

Optional closing `CardGrid` of `ExternalResource` cards (matches L1/L2). Candidates (verify URLs at write time):
- MDN — "Introduction to events" / event bubbling & capture (canonical platform reference).
- MDN — `EventTarget.addEventListener()` (the options object, including the passive-default note).
- MDN — `AbortController` / `AbortSignal` (the cleanup primitive).
- Optionally a short video via `VideoCallout` if the resourcer finds a strong, current (<6 mo or evergreen) explainer of bubbling/capturing or delegation — leave the videoId for the resourcer to fill; do not invent one.

Reasoning: gives the self-directed student the authoritative platform docs behind the lesson, consistent with prior lessons; video is optional and deferred to the resourcer (respecting the YouTube-quota memory).

## Scope

**Prerequisites (redefine concisely, do not re-teach):**
- DOM as a live tree of typed nodes; `Node`/`Element`/`HTMLElement` hierarchy (L1) — assume known; one-line callback at most.
- The four-method access surface, especially `closest()` and `matches()` (L1) — assume known; this lesson *uses* them in delegation (paying L1's promise). Do not re-teach what they do; just deploy them.
- `data-*` attributes and the `dataset` property, incl. the kebab→camel rename (L2) — assume known; the delegation handler is the reading side L2 promised. One-line reminder, not a re-teach.
- Attribute vs property, `value`/`checked` divergence (L2) — assume known; relevant only where `preventDefault` touches checkbox/form defaults; no re-teach.

**This lesson does NOT cover (reserve for later, name only as forward-refs):**
- React's `onClick`/`onChange`/`onSubmit` and `SyntheticEvent` at depth → Chapter 022 (recognition only here).
- `useEffect` cleanup and ref-callback cleanup mechanics → Chapter 022 (the `AbortController` *shape* is primed here, the React API is not taught).
- Hydration / SSR event wiring → Unit 4.
- Pointer vs mouse vs touch event *families* at depth → out of scope; name `pointer*` only as the unifying primitive (one sentence).
- `KeyboardEvent` key/code surface and building keyboard shortcuts at depth → later chapter (Chapter 022 / 027). Here, only "`keydown` on window is an escape-hatch site" and "`click` covers keyboard activation."
- Custom events / `CustomEvent` for component messaging → out of scope; the course messages via props/context, not DOM events. Do not introduce.
- `IntersectionObserver`/`ResizeObserver`/`MutationObserver` → later chapters as they earn weight; not events-substrate material.
- The full event-type taxonomy → recognition only on the families named (click, submit, scroll/wheel/touch, focus/focusin, keydown).
- `removeEventListener` as the *recommended* pattern → shown only as the legacy "before" in the cleanup comparison, explicitly superseded by `AbortController`.
- JSX/hooks in runnable code → chapter is substrate-only; all React mentions are prose-level recognition.

## Notes for downstream agents

- **Hold the substrate-only line (deliberate).** Samples are vanilla JS/TS. The few React references (`onClick`, `SyntheticEvent`, the `useEffect`/ref-callback cleanup shape) are recognition-only prose — never wire them into runnable exercises or `AnnotatedCode`. Do not "modernize" delegation/cleanup samples into JSX. (Same stance L2 recorded.)
- **Reuse established assets:** the `<nav id="main-nav">`/`<ul>`/`<li>`/`<a>` and `<ul id="menu">` markup from L1; the `closest`/`matches`/`data-*`/`dataset` framings already introduced. Pay the explicit debts L1 ("you'll see `closest` in delegation") and L2 ("read `dataset.*` in a delegation handler") left open.
- **Custom components likely needed:** `src/components/lessons/014/3/EventPhaseWalk.astro` (the capture/target/bubble `DiagramSequence`) — or author its steps inline if simple. The optional `AbortController` fan-out figure can be inline `ArrowDiagram`/HTML.
- **Code conventions:** single quotes, 2-space indent, `const`+arrows, semicolons; markup shown as a leading JS comment (chapter convention).
- **Fact-checked claims safe to state:** (1) `passive` defaults to `true` for `wheel`/`mousewheel`/`touchstart`/`touchmove` on `Window`/`Document`/`Document.body` in modern browsers except Safari — explicit `{ passive: true }` is still the senior reflex elsewhere; (2) React delegates events at the **root container** (since React 17), not `document`; (3) `e.persist()` is a no-op since React 17 (no more event pooling).
