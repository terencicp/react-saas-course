# Lesson 2 outline — First byte to pixels

## Lesson title

- **Title (h1):** First byte to pixels
- **Sidebar label:** First byte to pixels

The chapter-outline title is precise and pairs with lesson 1 ("URL bar to first byte"). Keep it — it sets up the unit's two-lesson trace from URL commit to interactive page.

---

## Lesson framing — conclusions from brainstorm

**Target student.** Junior coming straight from lesson 1, where DNS/QUIC/TLS/HTTP were named as four stages on the wire. The student has internalised the network spine but has not yet seen the *other* half of the latency budget: everything that happens *inside* the browser between the first byte landing and a user being able to click. Has heard "DOM", "render", maybe "SSR" — not as a pipeline.

**What this lesson is.** A map, not a deep dive. Six browser-side stages (parse → DOM, CSS → CSSOM, render tree, layout, paint, composite) named in order, plus a *second-pass overlay* showing where SSR plugs in (the bytes that arrive are already populated HTML) and where hydration plugs in (after first paint). The lesson is structural — it lays the rails Units 3 and 4 will run on. The student finishes able to (a) point at any pipeline stage and name what it produces and what it costs; (b) explain why CSS in `<head>` is render-blocking and why scripts at the bottom of `<body>` or with `defer` aren't; (c) explain why CSS `transform`/`opacity` animations hit 60fps and `width`/`top` don't; (d) frame the senior insight "the page is *visible* before it's *interactive*" — and name the gap as hydration time.

**The senior framing carried forward.** Lesson 1 ended on "a slow page load is a *stage* problem — name the stage, debug the stage." This lesson extends that mental model into the browser. Between *the first byte arriving* and *the user being able to click*, the browser runs another pipeline with its own stages and its own dominant costs. The engineer who can point at the slow stage — DNS, transport, server, parse, layout, paint, hydration — owns the debugging conversation across the whole page load.

**Pedagogical levers.**
- **Diagram-led.** The center of gravity is a single annotated horizontal pipeline diagram (bytes → parser → DOM, CSS → CSSOM, both merging into render tree → layout → paint → composite). A second smaller diagram layers the SSR/hydration overlay on top of the first. Prose orbits these diagrams.
- **Step-by-step revelation.** The full pipeline is visually busy; introduce stages one at a time using `DiagramSequence` so cognitive load stays low and the student watches the pipeline build up.
- **Defaults before conditionals.** The 2026 default is server-rendered HTML from a Next.js 16 + React 19 Server Component tree, streamed and progressively hydrated. State it; don't pretend client-only SPAs are still the baseline.
- **No bootcamp scaffolding.** Adult tone. Do not re-explain "what is HTML." The student has shipped HTML pages before; they just haven't seen what the browser does with the bytes.
- **No history.** No "in the old days the browser would block on every script." No DOMContentLoaded vs. load nostalgia. The course operates on the 2026 stack.
- **One concrete interactive moment.** The `transform` vs. `width` animation comparison is *the* moment the student feels — not just reads — why compositor-only properties matter. Build this with `ParamPlayground` so the student can manipulate the duration and watch jank vs. smoothness.
- **Cognitive load.** Start with the one-paragraph senior frame (the first byte is not the finish line; another pipeline runs in the browser). Build the pipeline stage by stage. Layer the SSR/hydration overlay only after the base pipeline is in. Close with a `Sequence` exercise that confirms the ordering stuck.

**Common beginner traps to defuse.**
- Thinking "the page rendered" means "the page is interactive." It doesn't — paint and hydration are separate stages, and on a server-rendered Next.js page the gap can be hundreds of milliseconds.
- Thinking the parser stops if it hits a `<script>` no matter what. It only stops for *blocking* scripts; `defer` and `async` let the parser keep running.
- Thinking CSS is "loaded async because it's in `<head>`." It's the opposite — being in `<head>` is what makes it render-blocking; that's the point.
- Animating `width`, `top`, `margin`, `height` and wondering why the page judders. The dev didn't realise those properties trigger layout, which can't run on the compositor thread.
- Thinking hydration "renders the page." It doesn't — the page is already painted from server HTML before hydration runs. Hydration *attaches behaviour*.
- Thinking Server Components "are how SSR works in Next 16" — close enough to name as the default, but the SC/CC boundary mechanics are Unit 4's owner. This lesson stays on the pipeline placement.

**Forward links named once each, never elaborated:**
- JSX and the React render model → Unit 3 (chapter 023 owns *what triggers a render*).
- App Router, Server vs. Client Components, streaming, `loading.tsx` → Unit 4 (chapter 031).
- HTML element semantics (`<header>`, `<main>`, heading hierarchy) → chapter 017.
- Tailwind, the cascade, OKLCH design tokens → chapters 019–021.
- Core Web Vitals (LCP, FCP, INP, CLS), the Performance panel, bundle analyzer → Unit 19.
- Image decoding, `next/image`, `decoding` attribute → Unit 4 and Unit 19.

**Out-of-scope, do not write code.** No application code in this lesson. Any HTML/CSS shown is illustrative (a `<link>` tag, a tiny `<style>` rule, a `<script defer>` example) and exists only to ground the stage being explained. The interactive `transform` vs. `width` widget is a built-in `ParamPlayground` instance — not student code.

**Estimated student time:** 35–45 minutes.

---

## Lesson sections

The lesson opens with an introduction (no h2), then walks the six browser-side stages, layers the SSR + hydration overlay, then closes with the ordering exercise. The flow is:

1. Introduction — the senior framing carried from lesson 1.
2. The pipeline at a glance — full diagram, scrubbable.
3. Parse: HTML bytes become the DOM (with the script-blocking rule).
4. Style: CSS becomes the CSSOM (render-blocking by default).
5. Render tree: DOM + CSSOM merge.
6. Layout: geometry is computed.
7. Paint: pixels are filled into layers.
8. Composite: layers are combined on the GPU — *and* the compositor-only properties demonstration.
9. The First Contentful Paint summary — what the chain produces.
10. The SSR + hydration overlay — visible before interactive.
11. Closing exercise — order the events on a timeline.
12. What stays out — forward links named once.

### Introduction (no header)

Two short paragraphs:

1. **The carry-over from lesson 1.** The first byte just arrived. The user does not yet see a pixel, let alone get to click anything. Between bytes-on-the-wire and a-page-the-user-can-use, the browser runs *another* pipeline — six stages, each with its own job, its own cost, and its own ways to go wrong. This lesson is the map.
2. **What the student walks out with.** A mental model of the pipeline (parse → DOM, CSS → CSSOM, render tree, layout, paint, composite) and where SSR plus hydration sit on top of it. When Unit 3 talks about React renders triggering layout, when Unit 4 streams HTML inside a `<Suspense>` boundary, when Unit 19 tunes Core Web Vitals — every one of those conversations lands on a stage of this map.

End with a one-line directive: "We won't open DevTools mid-lesson this time — the Performance panel that visualises these stages is taught in Unit 19. Here the pipeline is the lesson."

### The pipeline at a glance

Before walking each stage, show the full pipeline so the student has the structure in view. The diagram is the lesson's spine — it gets shown once whole, then stage-by-stage as each section progresses.

**Diagram — full pipeline, hand-coded HTML+CSS inside a `<Figure>`.**

Horizontal layout, left to right, two input lanes merging into a single downstream chain:

```
[ HTML bytes ] ──▶ [ Parse ] ──▶ [ DOM tree ]   ┐
                                                 ├──▶ [ Render tree ] ──▶ [ Layout ] ──▶ [ Paint ] ──▶ [ Composite ] ──▶ [ Pixels on screen ]
[ CSS bytes  ] ──▶ [ Parse ] ──▶ [ CSSOM   ]   ┘
```

Use plain HTML + CSS for the boxes (`display: grid` or `flex` with two rows on the left side that converge into one row on the right). Each box is a labeled card with a small subtitle ("text → tree", "tree + tree → tree", "tree → geometry", "geometry → layered pixels", "layers → final frame"). Keep the diagram horizontal and compressed vertically — ~480–560px tall maximum. Apply the `margin: 0` reset to every inner element (Starlight's prose-margin gotcha — referenced in `documentation/diagrams/html-css.md`).

Caption: "Six stages from bytes to pixels. The DOM and CSSOM are built in parallel; they merge at the render tree and the rest of the pipeline is sequential."

**Then, immediately below:** the stage-by-stage walkthrough using `DiagramSequence`. Each `DiagramStep` renders the same horizontal pipeline, but highlights the currently-discussed stage (e.g. `is-on` class for the active box, dimmed for the rest). Six steps total — one per stage. Each step's caption is a one-sentence summary of that stage. The student scrubs through to feel the pipeline progress; the prose sections below explain each stage in detail.

Why this two-component approach: the full diagram inside `Figure` is the lesson's reference; the `DiagramSequence` is the *narrative* walk through the same shape. Don't wrap the `DiagramSequence` in `Figure` — it provides its own card.

### Stage 1 — Parsing HTML to a DOM tree

Two short paragraphs plus one small inline code example.

- **What happens.** The HTML parser is a streaming state machine. As bytes arrive (it doesn't wait for the body to finish downloading), it tokenises tags and emits typed DOM nodes — every `<div>` becomes an `HTMLDivElement`, every `<a>` an `HTMLAnchorElement`, etc. The result is the **DOM tree**: the in-memory model of the document the rest of the pipeline reads from. Use `<Term definition="Document Object Model — the in-memory tree of typed nodes the browser builds from parsed HTML. Every element is a JavaScript object with properties, methods, and events.">DOM</Term>` here.
- **The script parser-blocking rule.** A `<script>` without `async` or `defer` blocks the parser the moment the parser hits it. The browser must download the script, execute it, and *then* keep parsing — because historically a script could call `document.write` and rewrite the parser's input stream. `defer` queues the script for *after* parsing is complete (in source order). `async` runs the script whenever it finishes downloading, with no ordering guarantees. The senior reflex: scripts go in `<head>` with `defer` (or in `<body>` near the end without it). Frameworks like Next.js handle this for you, but the rule explains *why* they do.

**Small illustrative code block.** A `Code` fenced HTML block showing three `<script>` tags side by side with a comment annotating each:

```html
<script src="/blocking.js"></script>           <!-- blocks the parser here -->
<script defer src="/deferred.js"></script>     <!-- queued for after parsing -->
<script async src="/async.js"></script>        <!-- runs whenever it lands -->
```

This is a Code block (not `CodeVariants`) — they're not alternatives, they're the three behaviours side by side. Three lines is enough; no further commentary needed.

Close the section by foreshadowing: "Unit 3's React lessons assume the parser has done its job before any of your component code runs. That's almost always true on a Next.js page — the document HTML is delivered fully formed and the script tags use `defer` or are placed at the end of the document."

### Stage 2 — CSS parsing builds the CSSOM

One short prose paragraph plus a one-line callout.

- **What happens.** Every `<link rel="stylesheet">` and inline `<style>` block is parsed in parallel with HTML. The result is the **CSSOM** — a parallel tree of rules and computed properties. Use `<Term definition="CSS Object Model — the in-memory tree of style rules the browser builds in parallel with the DOM. Used together with the DOM to compute the render tree.">CSSOM</Term>` once.
- **Render-blocking by default.** The browser cannot construct the render tree without the CSSOM, so the *first paint waits for the stylesheet*. This is why `<link rel="stylesheet">` in `<head>` is the load-bearing tag — it's announcing the style dependency early so the browser fetches and parses it while the HTML is still arriving. Use `<Term definition="The CSSOM must be built before the browser can render the page. Stylesheets in &lt;head&gt; block the first paint until they are downloaded and parsed.">render-blocking</Term>`.
- **One-line exception.** A stylesheet with a non-matching `media` attribute (`media="print"`, `media="(min-width: 1200px)"` when the viewport is smaller) is downloaded *but does not block* the first paint. Senior callout, one sentence.

Use an `<Aside type="tip">` for the media-scoped exception so the student notices it without breaking the prose flow.

### Stage 3 — The render tree

One short prose paragraph.

- **What happens.** DOM and CSSOM are merged into the **render tree**: every node that will visually appear, with its computed styles attached. Nodes with `display: none` are excluded — they exist in the DOM but the render tree skips them. Pseudo-elements (`::before`, `::after`) *are* included even though they don't exist in the DOM. The render tree is the input to layout.
- **Senior note in one sentence.** This is why `display: none` is "cheaper" than `visibility: hidden` — it removes the node from the render tree entirely, so layout, paint, and composite all skip it. `visibility: hidden` keeps the node in the tree, just makes its paint invisible.

Use `<Term definition="The tree of nodes that will actually paint — DOM intersected with visible style. Nodes with display: none are excluded; pseudo-elements (::before / ::after) are included.">render tree</Term>` for the term.

### Stage 4 — Layout

Two short paragraphs.

- **What happens.** The browser computes geometry for every render-tree node: position, width, height, line-break points, the inline flow inside each block. This is the expensive stage — the cost grows with the number of nodes and the depth of the layout dependency chain. The output is a *geometry tree*, positions and sizes — not pixels yet. Use `<Term definition="Geometry computation — position, width, height, line breaks. Often called reflow. The expensive stage of the pipeline.">layout</Term> (sometimes called reflow)`.
- **What invalidates layout.** Any change that affects geometry — inserting a node, changing a width, resizing the viewport, or even *reading* a layout property like `offsetHeight` while the browser has pending mutations queued. The pathological case has a name: **layout thrashing** — reading a layout value, writing one, reading another in a tight loop. Each read forces the browser to flush the queued writes synchronously to give an accurate answer. One-paragraph mention, deferred for full treatment in Unit 3 (React render model) and Unit 19 (performance).

Use `<Term definition="A read-write-read pattern on layout properties (offsetHeight, getBoundingClientRect, then a width change, then another read) forces the browser to flush queued layout work synchronously each time. Multiplies layout cost in tight loops.">layout thrashing</Term>` for the term.

### Stage 5 — Paint

One short paragraph.

- **What happens.** The browser fills pixels into **layers**: text glyphs, background colors, borders, shadows, images, gradients. Paint runs *per layer* — the browser tries to repaint as little as possible, isolating changes to the smallest set of layers affected. The output is a set of bitmap textures ready to be combined.
- **One-line forward link.** Some CSS properties — `position: fixed`, `will-change`, certain `transform`s, `opacity` below 1 with descendants — promote elements to their own layer so the browser can manipulate them without repainting the surrounding content. Named once; not elaborated.

### Stage 6 — Composite, and the properties that hit 60fps

This is the section that *earns* the lesson's one interactive moment. Two paragraphs plus a `ParamPlayground` demo.

- **What happens.** The **compositor thread** takes the painted layers and combines them into the final frame, which is handed to the GPU and pushed to the screen. The compositor runs on a thread separate from the main thread, so it can keep pushing frames at 60fps (every ~16.7ms) even when the main thread is busy.
- **Compositor-only properties.** Two CSS properties — `transform` (translate, scale, rotate) and `opacity` — can be applied by the compositor *directly to a layer* without re-running layout or paint. That's why animations on `transform: translateX(...)` hit 60fps and animations on `left: ...` don't — `left` invalidates layout, which forces the main thread to recompute geometry for *every frame*, which inevitably blows the 16.7ms budget. Use `<Term definition="CSS properties (transform, opacity) the compositor thread can apply directly to existing layers without re-running layout or paint. The reason these animations stay smooth even when the main thread is busy.">compositor-only properties</Term>`.

**Interactive widget — `ParamPlayground` instance, lesson-specific component.** Build a custom playground that runs two animations side-by-side at the same duration and the student can toggle/scrub the duration to feel the difference.

The widget:
- Two boxes stacked or side-by-side. One animated using `transform: translateX(...)` (cheap). The other animated using `left: ...` or `width: ...` (expensive, triggers layout).
- One `Param` slider for the animation duration (e.g. 200–2000 ms).
- One `Param` toggle to inject a fake "main thread work" load — a busy-wait or `setTimeout` flood — so the student can *see* the layout-triggering animation stutter while the `transform` one stays smooth.
- The `Preview` slot holds both animated boxes; they loop. The animation is CSS keyframes driven by `var(--duration)` and one of `transform`/`left`.

This widget is lesson-specific — it doesn't exist as a generic `ParamPlayground` pattern in the codebase. Build it as `src/components/lessons/010-2/JankComparison.astro` (or similar). The widget should:
- Use `ParamPlayground` as the host, *or* hand-author the slider + toggle UI if the busy-wait toggle is hard to model in CSS-only param vars.
- If pure CSS, two `<div>`s with `@keyframes`, one keyframe set animating `transform`, the other animating `left` or `width`.
- For the "main thread work" toggle: when on, run a `requestAnimationFrame` loop with a 12–15ms `while`-busy-wait on each frame to starve the main thread. The compositor animation keeps going at 60fps; the layout-driven one visibly stutters.

**Alternative if the interactive widget is too custom to build cleanly:** Fall back to a `TabbedContent` block with two short CSS snippets and prose explaining the difference, plus a short embedded YouTube video (e.g. a 1–2 minute clip from the official Chrome DevTools or web.dev YouTube channel on layout vs. composite) inside a `<VideoCallout>`. The interactive widget is preferred — the lesson's "feeling" the difference moment depends on it — but the fallback exists.

Caption for the widget: "Two animations, same duration. Toggling the main-thread load makes the layout-driven animation stutter; the compositor-driven one keeps painting at 60fps."

### The Critical Rendering Path and First Contentful Paint

Short closing paragraph for the base pipeline before the SSR overlay.

- **What the chain produces.** HTML parsed → DOM tree; CSS parsed → CSSOM (in parallel); render tree built; layout computed; first paint occurs. That sequence is the **Critical Rendering Path** — the dependency chain everything else has to wait on before the user sees anything. The metric that fires when content first shows up is **First Contentful Paint (FCP)**.
- **Foreshadow Unit 19.** Name FCP and LCP (Largest Contentful Paint) in one line each. "These are the Core Web Vitals Unit 19 will tune; here they're just labels for the moments on the pipeline."

Use `<Term definition="First Contentful Paint — the moment any text, image, or non-whitespace content first appears on screen. The first user-visible signal that the page is loading.">FCP</Term>` and `<Term definition="Largest Contentful Paint — the moment the largest visible element finishes rendering. The standard 'page is meaningfully visible' metric.">LCP</Term>`.

No deep dive on the metrics here. They're labels for points on the pipeline; Unit 19 owns the targets, thresholds, and how to move them.

### The SSR + hydration overlay

The lesson's second-pass overlay. The base pipeline now exists in the student's head — this section places SSR and hydration on top of it without re-teaching the React/Next pieces (Unit 4's job).

Two short paragraphs plus one diagram.

- **Where SSR plugs in.** On the 2026 default stack (Next.js 16 + React 19), the HTML the browser receives *is already populated* — the server ran the React Server Component tree, serialised it to HTML, and streamed it as the response body. The pipeline above runs unchanged; the only difference is that the bytes coming down the wire already represent the rendered page. **First paint happens before any JavaScript has run.** That's the headline SEO and time-to-content win of SSR.
- **Where hydration plugs in.** After first paint, the JavaScript bundle for Client Components downloads, executes, and **attaches** event listeners and component state to the DOM nodes the server already emitted. The user can see the page; they can scroll; they cannot yet click anything that requires React state. **The page is visible before it's interactive.** The gap is hydration time. Use `<Term definition="The process where React attaches event listeners and component state to server-rendered DOM nodes. The page is visible during this gap but not yet interactive — a button click won't fire until its component has hydrated.">hydration</Term>`.

**Two-line callout on React 19's selective hydration and Next.js 16 streaming.** React 19 lets the runtime hydrate interactive components first, deferring the rest; Next.js 16 streams HTML for components inside a `<Suspense>` boundary so the user sees skeleton placeholders fill in as their data resolves. Name in two lines; do not teach the mechanics. Forward link: "Suspense, streaming, and `loading.tsx` are chapter 031's full treatment."

**Diagram — the overlay.** A second smaller HTML+CSS diagram sitting *below* the pipeline-at-a-glance reference. Shows:

- The same bytes-to-pixels pipeline as before, but compressed to a horizontal strip.
- A "server" lane on the left (an arrow labeled "Server Components → rendered HTML") feeding into the `HTML bytes` node.
- A second downstream lane branching off after `Paint`: "JS bundle downloads" → "React hydrates" → "page is interactive".
- A gap labeled **"visible but not interactive"** between first paint and the end of hydration.

Caption: "On a 2026 Next.js page, the HTML arrives already populated by Server Components. The browser pipeline paints it before React's hydration JavaScript runs — the page is visible before it's interactive."

If the second diagram makes the page too dense, condense the overlay into a smaller version or use `TabbedContent` (two tabs: "Pipeline only" and "Pipeline + SSR + hydration") to switch between the two views. `TabbedContent` is the better option here — same shape, two stages of complexity, lets the student build the model up.

**Hydration mismatches in one line.** "If the HTML the server rendered doesn't match what React would render on the client — for instance, a `Date.now()` call inside a component's render, or a conditional based on `typeof window` — React logs a hydration mismatch warning. Unit 4 owns the full debugging surface." One sentence; not the lesson's job.

### What stage does what — the Performance panel placement

One short paragraph, no header — this is a forward-link beat, not a section.

- **The DevTools Performance panel as the visualisation surface.** The Performance panel in Chrome DevTools visualises every stage of this pipeline on a frame timeline: parse events, layout events, paint events, composite events. The student does not open it here — Unit 19 owns the performance tour — but they should know which DevTools panel maps to which pipeline stage. One sentence; move on.

### Closing exercise — order the events

One `Sequence` exercise. The student orders six events on a timeline. This is the lesson's active-recall confirmation that the pipeline ordering stuck.

**Steps in correct order:**

1. HTML bytes arrive at the browser.
2. The DOM and CSSOM are both built.
3. First Contentful Paint — the user sees the page.
4. The hydration JavaScript bundle finishes downloading.
5. React hydration runs — event listeners attach.
6. A click handler fires for the first time.

The `Sequence` shuffles them on render; the student drags them into order and clicks Check. This is the active-recall moment — the moment the pipeline ordering becomes a thing they *did*, not just read.

Instructions string: "Order the six events of a Next.js 16 page load from earliest to latest."

### What stays out (named once)

A two-line wrap immediately after the exercise:

- React's render phases, hooks, reconciliation, JSX → Unit 3 (chapter 023 owns *what triggers a render*).
- Server vs. Client Components boundary mechanics, Suspense, streaming, `loading.tsx` → Unit 4 (chapter 031).
- Tailwind, the cascade, OKLCH design tokens → chapters 019–021.
- Core Web Vitals (LCP, FCP, INP, CLS), the Performance panel tour, the bundle analyzer → Unit 19.
- HTML element semantics — `<header>`, `<main>`, heading hierarchy, accessibility tree → chapter 017.

No `ExternalResource` cards here — the forward links are course-internal.

### Optional — `<details>` deep-dive

If extra room remains in the lesson budget, one collapsed `<details>` block: "Why `display: none` is cheaper than `visibility: hidden`." One paragraph on the render-tree implications — `display: none` removes the node from the render tree entirely (layout, paint, composite all skip it); `visibility: hidden` keeps the node in layout/paint but paints it invisible (still costs you geometry computation). Useful for the curious; not required.

If the lesson reads complete without it, omit. Skim, don't pad.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| The pipeline at-a-glance reference | Hand-coded HTML+CSS inside `<Figure>` (horizontal flow with two input lanes merging) |
| The stage-by-stage walk | `<DiagramSequence>` with one `<DiagramStep>` per stage, each highlighting the active node on the same pipeline layout |
| The three `<script>` behaviour comparison | A single fenced HTML `Code` block with inline comments (not `CodeVariants` — these are not alternatives) |
| The render-blocking media-scoped exception | `<Aside type="tip">` |
| The interactive `transform` vs. `width` animation | Custom lesson component at `src/components/lessons/010-2/JankComparison.astro`, hosted inside `<ParamPlayground>` if possible, or hand-authored if the main-thread-busy toggle is too custom |
| Fallback if the widget is too custom | `<TabbedContent>` with two short CSS snippets plus optional `<VideoCallout>` for a 1–2 minute web.dev or Chrome DevTools clip |
| The SSR + hydration overlay diagram | Hand-coded HTML+CSS inside `<TabbedContent>` (tabs: "Pipeline only" / "Pipeline + SSR + hydration") |
| The closing recall drill | `<Sequence>` |
| Optional deep-dive | `<details>` |

No live-coding components. No sandbox callout. The lesson is structural.

## Term tooltips to author

Strategic, not exhaustive. Each `<Term>` definition is one or two sentences of plain text.

- `DOM` — the in-memory tree of typed element nodes.
- `CSSOM` — the parallel tree of computed style rules.
- `render-blocking` — what it means for the CSSOM build to gate first paint.
- `render tree` — DOM ∩ visible style, plus pseudo-elements.
- `layout` (with parenthetical "reflow") — geometry computation.
- `layout thrashing` — the read-write-read anti-pattern.
- `compositor-only properties` — `transform` / `opacity` and why they're cheap.
- `FCP` — First Contentful Paint.
- `LCP` — Largest Contentful Paint.
- `hydration` — attaching listeners and state to server-rendered DOM.

`<Term>` placement: at first use of each term in prose. Don't sprinkle the same term multiple times.

---

## Scope

### What this lesson covers

- The six browser-side pipeline stages: parse → DOM, parse → CSSOM (in parallel), render tree, layout, paint, composite.
- The script parser-blocking rule, plus `async` and `defer` semantics in one block.
- The CSS render-blocking default and the `media`-scoped exception.
- Why `display: none` is cheaper than `visibility: hidden` (render-tree exclusion).
- Layout thrashing as a named anti-pattern; deferred for full treatment in Unit 3 / Unit 19.
- Compositor-only properties (`transform`, `opacity`) and the 60fps explanation, with one interactive demonstration.
- First Contentful Paint and Largest Contentful Paint *named as labels* — not tuned.
- The SSR + hydration overlay on top of the base pipeline: where Server-rendered HTML plugs in (it *is* the bytes), where hydration plugs in (after first paint, attaching behaviour to nodes).
- The senior framing: the page is visible before it's interactive; the gap is hydration time.
- One-line foreshadowing of React 19's selective hydration and Next.js 16's `<Suspense>` streaming.
- One-line foreshadowing of hydration mismatches.

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **React itself** — render phases, hooks, reconciliation, the JSX-to-Fiber-to-DOM path. Unit 3 (chapter 023) owns the render model. This lesson stays on the *browser* side of the pipeline.
- **Server vs. Client Component boundary mechanics** — the `"use client"` directive, what serializes across the boundary, how the RSC payload is structured. Unit 4 (chapter 030+) owns it. This lesson only places SSR on the pipeline map.
- **Suspense, streaming, `loading.tsx` mechanics** — chapter 031. Named in two lines as the React 19 / Next.js 16 enhancements layered on top of the base SSR-plus-hydration model.
- **Core Web Vitals tuning** — LCP, INP, CLS targets, thresholds, debugging. Unit 19. Named as labels here.
- **The DevTools Performance panel** — flame charts, frame timelines, the long-task surface. Unit 19 owns the tour.
- **HTML element semantics** — `<header>`, `<main>`, the heading hierarchy, the accessibility tree. Chapter 017. The lesson uses `<script>`, `<link>`, `<head>`, `<body>` in illustrative code only.
- **Tailwind, the cascade, OKLCH design tokens, dark mode** — chapters 019–021. The lesson uses raw CSS in illustrative examples; no Tailwind classes appear.
- **Image decoding, the `decoding` attribute, `next/image`** — Unit 4 and Unit 19.
- **CSS containment, `content-visibility`, layer isolation** — conditional power tools; if they earn a treatment, it's in Unit 19.
- **Service Workers** — out of scope on this stack. Server Components + Next.js data fetching cover the cache surface.
- **Application code on this lesson** — no React, no Next.js scaffolding. Illustrative HTML only.

### Prerequisites the student already has (do not re-teach)

The student arrives from lesson 1 of this chapter with:

- The four-stage network mental model (DNS, transport, TLS, HTTP).
- The DevTools Network panel familiarity.
- A reading-only fluency in HTML — has seen `<head>`, `<body>`, `<script>`, `<link rel="stylesheet">`. Has not been *taught* the script-blocking rule.
- A reading-only fluency in CSS — has used `display`, `position`, `transform`, `opacity` in passing. Has not been *taught* layout vs. paint vs. composite.
- Has heard "SSR" and "hydration" in industry vocabulary; has not had them placed on a pipeline.

Do not re-teach what HTML or CSS *are*. Do not re-teach what `<script>` does in general. Do not re-teach "what is the DOM" beyond the one-sentence `<Term>` tooltip. One-line refreshers are fine when needed for flow; do not detour.

---

## Notes for the writer agent

- **No application code in this lesson.** The HTML snippet showing three `<script>` tags side by side, and any CSS shown alongside the `transform`/`width` widget, are illustrative — not production-shape. Code conventions don't apply to the illustrative HTML/CSS (no Tailwind, no JSX). Use plain HTML and raw CSS where shown.
- **Diagrams are centre of gravity.** Build the pipeline-at-a-glance HTML+CSS first; the prose orbits it. The `DiagramSequence` re-uses the same pipeline layout per step — author the base diagram first, then duplicate per step with the active stage highlighted. Apply the `margin: 0` reset to every inner element per the html-css.md gotcha.
- **The compositor widget is the lesson's "feel" moment.** Prioritise building it; do not skip to the fallback unless the widget genuinely won't behave on first try. The senior insight ("`transform` is cheap, `width` is not, and you can *see* the difference") is the one moment in the lesson where the student gets cause-and-effect at the body, not just on the page.
- **The SSR + hydration overlay is a *placement*, not a *teaching*.** Do not re-teach Server Components, RSC payloads, the boundary, Suspense mechanics. Place them on the pipeline; name forward links once each.
- **Hydration mismatches: one line, no more.** It's a real bug class, but Unit 4 owns it. Foreshadow only.
- **Numerical claims to keep verifiable.** 60fps = ~16.7ms per frame; the compositor thread is separate from the main thread; React 19's selective hydration is stable (verify before publishing); Next.js 16 streams HTML inside `<Suspense>` boundaries (verify).
- **No history.** Do not name HTTP/1.1 script-loading workarounds, the `defer` browser-compat dark ages, or "in the bad old days the page froze on a slow script." The course operates on the 2026 stack.
- **Tone discipline.** No "fun fact." No "you might be wondering." Adult, terse, assumes competence. The opening senior framing carries from lesson 1; don't restate it for an imaginary new reader.
