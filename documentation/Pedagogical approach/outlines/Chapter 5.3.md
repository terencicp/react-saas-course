## Concept 1 — Suspense is a contract, not a config flag

**Why it's hard.** The student arrives expecting `isLoading` state, a Promise, and a ternary. `<Suspense>` looks like just another wrapper component. The misconception to break is that Suspense *does* anything — it doesn't fetch, it doesn't time, it doesn't retry. It catches a signal a child throws and renders a fallback until the signal stops. Until the student feels the cause-and-effect (something below me is pending, therefore I render `fallback`), every other Suspense lesson is decoration.

**Ideal teaching artifact.** A controllable two-pane simulator — *Concept* archetype. On the left, a small Server Component tree with a knob the student turns: *child status: pending / resolved / pending again*. On the right, the rendered DOM, with the Suspense boundary outlined. When the student flips the knob to pending, the boundary's children visually swap to the fallback in real time; flip to resolved, the children swap in. The point is that Suspense reacts to a *signal from below*, not to a prop the parent owns. A second knob — *fallback itself suspends: on / off* — produces the canonical broken state (the boundary becomes useless and the parent's fallback takes over) so the student sees why fallbacks must not suspend.

**Engagement.** A `PredictOutput`-style round: three small trees with stated child statuses (resolved, pending, pending-with-suspending-fallback). The student predicts what the user sees for each. Locks in the rule "fallback shows iff any descendant is pending."

**Components.**
- New component: **`SuspenseSimulator`** — a labeled tree visual with per-leaf status toggles and a rendered-DOM pane; outline shows the boundary, swaps content on signal. Inputs: tree shape, leaf labels, initial statuses, optional fallback-suspends toggle.
- Forward-links: Concept 2 (boundary placement), Concept 3 (which shapes throw the signal), Concept 4 (`key` re-suspension uses the same widget), Concept 5 (streaming layer added on top), 7.3.6 (Server Action `useOptimistic` UX flow).
- Confirmation: `PredictOutput`.

**Project link.** Every `loading.tsx` skeleton in the 5.7 list-plus-detail project is the fallback half of this contract; the student needs the "what triggers the swap" half cemented before they write the skeleton.

---

## Concept 2 — Draw the boundary at the unit of UX

**Why it's hard.** Given the contract, the student's first reflex is to wrap the whole page in one big Suspense — *that* makes the page "have a loading state." It also defeats streaming, blocks fast widgets behind slow ones, and produces a single jarring full-page fallback. The senior diagnostic — "what should the user see resolve as a unit?" — is a question the student doesn't know to ask yet. Boundary placement is a *decision*, not a syntax choice.

**Ideal teaching artifact.** A boundary-placement puzzle — *Decision* archetype with a wrong-by-default sandbox. The student sees a dashboard mock: profile (10ms), chart (300ms), activity (800ms), and a footer (static). A draggable Suspense boundary marker starts wrapping the entire page; under the mock, a stylized waterfall shows time-to-first-paint for each widget. The student moves and clones the marker. Three configurations to discover: (a) one boundary around everything (everything waits for activity), (b) one boundary around just the slow widget (profile and chart paint at 10ms, activity at 800ms), (c) three boundaries, one per widget (each paints independently). The waterfall updates live so the student watches latency redistribute.

**Engagement.** The puzzle carries assessment — the student must reach configuration (c) to advance. Confirm with one `MultipleChoice` whose stem reads "Two queries that resolve independently belong in…" with distractors that name the wrong unit (per file, per route, per query).

**Components.**
- New component: **`BoundaryPlacementPuzzle`** — mock UI with per-widget latency, draggable boundary markers, live waterfall pane. Inputs: widgets with names + latencies, target configurations.
- Forward-links: Concept 5 (streaming makes the waterfall *real* — the same widget with chunk-arrival markers), Concept 6 (parallel-vs-sequential reuses the latency model), 5.7 project verification.
- Confirmation: `MultipleChoice`.

**Project link.** The 5.7 starter has two slots (`@list` and `@detail`); the student must place exactly two `loading.tsx` files (one per slot) and not one at the layout root. This concept is the rule they apply at that moment.

---

## Concept 3 — The two suspending shapes the student actually writes

**Why it's hard.** Suspense as a contract is abstract; the student needs to know *which code* throws the signal. Two shapes carry 100% of what they'll write — an `async` Server Component whose body awaits, and a Client Component calling `React.use(promise)` on a Promise prop. Other shapes (`lazy()`, suspending hooks in third-party libs) get named once. The misread is treating these as different mechanisms; they're the same signal from two source locations.

**Ideal teaching artifact.** A side-by-side *Pattern* comparison — `TabbedContent` with two tabs sharing one Suspense parent. Tab 1: the async Server Component shape — `<Suspense><InvoiceList /></Suspense>` where `InvoiceList` is `async function` and awaits the DB. Tab 2: the streamed-Promise shape — `<Suspense><InvoiceListClient invoicesPromise={db.invoices.find()} /></Suspense>` with the Client Component reading via `use()`. Both tabs render the *same* visible behavior; the difference is where the await happens and what the Client Component can do with it (interactive sorting, animation, etc.). A short caption under each tab names when each earns its weight.

**Engagement.** A `Buckets` sort: a deck of seven small code fragments (`async function Page() { const x = await db... }`, `function Page() { const x = use(promise); }` inside a Client Component, `const Lazy = lazy(...)`, plain `useEffect` + `useState` fetching, `await fetch` inside a Server Component body, etc.) sorted into *Suspends*, *Does not suspend*, *Suspends but not a shape you should write here*. The third bucket is load-bearing — it forces the student to name `useEffect`-based fetching as legal-but-wrong-shape.

**Components.**
- Existing: `TabbedContent` for the side-by-side, `Buckets` (three-category mode).
- Code blocks inside each tab via `Code`.

**Project link.** The 5.7 detail slot is the canonical async-Server-Component shape; the student writes exactly the tab-1 pattern there.

---

## Concept 4 — `key` is how you ask for a fresh suspend

**Why it's hard.** When the student navigates from invoice `A` to invoice `B` under the same `<InvoicePage>` component, React reuses the resolved tree — the user sees A's data while B's data loads. The student tries to fix it with `isPending` state, a manual loading flag, or a `useEffect` that resets. None of these are right. The senior fix is one prop: `<Suspense key={invoiceId}>` forces React to treat each render as a fresh mount, which re-throws the suspense signal. The misconception is treating `key` as a list-rendering thing only.

**Ideal teaching artifact.** A scrubbable time-travel widget — *Mechanics* archetype. Two scenes side by side, both showing the same invoice detail page with the URL `invoiceId` changing across the timeline. Left scene: no `key` on the Suspense — scrubbing forward shows old data flash visible while new data loads (stale flash highlighted in red). Right scene: `key={invoiceId}` — scrubbing forward shows the fallback skeleton between every transition (highlighted in green). The student drags the scrub bar back and forth and feels the two behaviors. A short caption names the rule and the alternative (`useTransition` for the "keep old visible deliberately" case, with a forward pointer to 4.9.5).

**Engagement.** A `TrueFalse` round of four statements ("`key` on Suspense forces React to unmount and remount the children" — true; "Without `key`, React shows the fallback when props change" — false; "`startTransition` and `key` solve the same problem" — false; "Adding `key={Math.random()}` is a reasonable fix" — false). Calibrates the rule against the canonical wrong fixes.

**Components.**
- Reuse: **`SuspenseSimulator`** (from Concept 1) extended with a `key` toggle and a *prop change* button — the simulator shows the two behaviors with the same teaching surface the student already knows.
- Existing fallback if the extension feels heavy: a `DiagramSequence` with four frames per scene (initial render, prop change, with-key fallback, with-key resolved) and a captioned comparison.
- Confirmation: `TrueFalse`.

**Project link.** The 5.7 detail slot's URL-driven `invoiceId` is exactly the scenario `key` addresses; the project's "Done when" verifications expect skeleton-on-change, not stale-flash.

---

## Concept 5 — Streaming is HTTP chunks, and you can see them

**Why it's hard.** The student knows Suspense renders a fallback. They don't know *how the user sees content arrive after the initial response*. The mental model gap: streaming is not magic, it's a single HTTP response held open while the server flushes chunks. The shell goes first, then each Suspense boundary's resolved HTML follows when its child settles. Without seeing the chunks arrive separately, the student can't reason about which work goes above which boundary, why a slow layout blocks every page, or why a single big top-level `<Suspense>` is wasteful.

**Ideal teaching artifact.** A scrollytelling timeline — *Concept* archetype, two beats. Beat one: an animated transport diagram. The student scrubs through the request lifecycle — server receives request, server renders shell + non-suspended content, *flush*, server renders Suspense fallbacks, *flush*, server awaits the slow child, *flush*, browser receives resolved chunk, browser swaps it in. The transport bytes flow visibly across a wire. Beat two: a simulated DevTools Network panel showing the same request's response body materializing in three timestamped chunks — the student can hover each chunk and see what's in it (`<html>...<Suspense fallback>` first, the resolved HTML and the inline swap script later). The "you can see this" reflex lands here.

**Engagement.** A `Sequence` exercise: drag five labeled events into the order they occur for a streamed page response (server emits shell, server emits fallback HTML, client paints fallback, server flushes resolved chunk, client swaps in resolved HTML). Locks in the chunk timing.

**Components.**
- New component: **`StreamingTimeline`** — animated transport diagram synced to a fake Network panel pane that shows chunks with timestamps and contents. Inputs: a list of boundaries with their resolve times, the shell content.
- Forward-links: Concept 6 (parallel boundaries reuse the chunk timing visualization), 5.4.2 (PPR shell-vs-holes uses an extended version), 5.7 project (the project's throttled-network verification step is exactly this diagnostic).
- Confirmation: `Sequence`.

**Project link.** 5.7's verification step opens DevTools under throttled network and watches the list and detail stream independently — this concept is the model that makes the network panel readable.

---

## Concept 6 — Parallel boundaries vs sequential awaits: the latency shape

**Why it's hard.** A Server Component that writes three `await`s in sequence — `const a = await q1(); const b = await q2(); const c = await q3();` — serializes 800ms + 300ms + 100ms = 1.2s of work that could have run in 800ms. The student writes this naturally; it looks like reading code linearly. The fix is either `Promise.all` (one boundary, all-or-nothing) or three Suspense boundaries with three independent async children (parallel and progressive). The decision rule the student needs is: *consumed together → `Promise.all`; consumed adjacently → parallel boundaries.* Without the rule, the student picks one and reuses it for both situations.

**Ideal teaching artifact.** A waterfall comparator — *Decision* archetype. Three columns side by side, all showing the same three queries (10ms, 300ms, 800ms): column one is the sequential-await shape with a 1.1s waterfall (request bars stacked end-to-end), column two is `Promise.all` in one component with an 800ms waterfall (request bars overlapping, all-resolve at 800ms), column three is parallel Suspense boundaries with three independent waterfalls (each widget paints at its own resolve time). Under each column, the code that produces that shape. The visual makes the latency cost of sequential awaits viscerally obvious; the captions name the trigger condition for each pattern.

**Engagement.** A `CodeReview`-style round on a PR diff: a Server Component with three sequential awaits feeding three independent widgets. The student leaves an inline comment with the kernel rubric phrase "Independent reads in one Server Component serialize — split into Suspense-wrapped children or `Promise.all`."

**Components.**
- Reuse: **`BoundaryPlacementPuzzle`** from Concept 2 reconfigured to show three waterfall columns (sequential, `Promise.all`, parallel-Suspense) for the same three queries.
- Existing alternative if the reuse feels strained: a `Figure` wrapping a hand-SVG of the three waterfalls side by side with code captions, plus `CodeReview`.
- Confirmation: `CodeReview`.

**Project link.** 5.7's two slots fetch independent data — the project shape *is* parallel boundaries; this concept is what stops the student from collapsing them into one parent that awaits both.

---

## Concept 7 — The three segment files are sugar over the primitives

**Why it's hard.** The student has learned `<Suspense>` and Error Boundaries as React primitives. Now they meet `loading.tsx`, `error.tsx`, `not-found.tsx` and assume they're a different system. They're not — they're file conventions Next.js expands into the primitives the student already knows, with two extras: the framework wires the boundary at the route-segment level, and the boundary inherits down the segment tree until a child overrides. The student needs to read each file and mentally desugar to the wrapping primitive. Without that move, every file convention feels like magic to memorize.

**Ideal teaching artifact.** A desugaring animation — *Concept* archetype with a side-by-side reveal. Left pane: a `FileTree` showing `app/dashboard/{layout.tsx, loading.tsx, error.tsx, not-found.tsx, page.tsx}`. Right pane: the conceptual React tree the framework builds — `<Layout><ErrorBoundary fallback={Error}><Suspense fallback={Loading}><NotFoundBoundary>{Page}</NotFoundBoundary></Suspense></ErrorBoundary></Layout>`. The student clicks each file in the tree and a colored arrow animates from the file to the wrapping primitive it produces. Below, a second move: the student adds `app/dashboard/invoices/loading.tsx` and watches the right pane gain a nested Suspense boundary inside the existing tree, demonstrating the inheritance-and-override rule.

**Engagement.** A `Matching` exercise: four files on the left (`loading.tsx`, `error.tsx`, `not-found.tsx`, `page.tsx`) paired with their conceptual wrapping primitive on the right (`<Suspense fallback>`, `<ErrorBoundary fallback>`, `<NotFoundBoundary>`, `children`). The student finishes with the desugaring reflex in muscle memory.

**Components.**
- New component: **`SegmentFileDesugarer`** — paired `FileTree` (left) and conceptual React tree (right) with click-driven arrow animation between them. Inputs: file list per segment, the wrapping primitive each produces, optional nested-segment toggle.
- Single-use check: recurs in Concepts 8 (error boundary placement against the layout) and 9 (not-found in the same tree shape) within this chapter; forward-links to 5.4.2 (PPR's static shell vs Suspense holes uses the same desugaring shape). Earns its weight.
- Confirmation: `Matching`.

**Project link.** Every `loading.tsx` and `error.tsx` in 5.7 is a file the student writes — the desugaring is what tells them what they've actually written.

---

## Concept 8 — `error.tsx` is a Client Component, and it doesn't catch its own layout

**Why it's hard.** Two non-obvious facts sit on the same file. First: `error.tsx` requires `"use client"` because React Error Boundaries are class components with `componentDidCatch` and stateful `reset` — both client-only. The student who learned that Server Components are the default expects every file convention to also be a Server Component by default; the missing directive is a build error they'll hit if not warned. Second: an Error Boundary catches errors *in its descendants*, not in its own siblings or parents — so `app/error.tsx` cannot catch a throw in `app/layout.tsx`, because the boundary lives *inside* the layout's children. The two facts are entangled in the same file and the same misconception: "error.tsx catches any error in this segment."

**Ideal teaching artifact.** Two beats, because the directive rule and the layout-catch rule teach different things and both are load-bearing.

Beat one — directive trap. A `CodeVariants` block with two tabs: tab one is `error.tsx` without `"use client"` and the actual Next.js build error verbatim; tab two is the same file with the directive at the top and a successful build. The error message points at the directive line; the fix is one line.

Beat two — the boundary placement diagram. Reuse the **`SegmentFileDesugarer`** from Concept 7, now annotated with where errors are caught and where they escape: a throw in `page.tsx` lands in `error.tsx` (green arrow), a throw in `layout.tsx` escapes `error.tsx` and goes up to the parent segment (red arrow with caption "the boundary lives inside layout's children — too late"). The student sees the geometric reason.

**Engagement.** A `Tokens` round on a real `error.tsx` file: the student clicks the `"use client"` directive (correct) and the `reset` prop in the component signature (correct — names the affordance) and is shown a decoy that names "catches errors in this segment" as the load-bearing wrong choice (the boundary catches errors *under* it). Reinforces both facts in one motion.

**Components.**
- Existing: `CodeVariants` for the directive trap.
- Reuse: **`SegmentFileDesugarer`** for the boundary placement diagram, with an authored variant showing throw-origins and which arrows reach the boundary.
- Confirmation: `Tokens`.

**Project link.** 5.7's `error.tsx` sits next to each slot's `page.tsx`; the student needs the directive in place and the placement geometry in mind before they write it.

---

## Concept 9 — `not-found.tsx` is signaled, not thrown

**Why it's hard.** The student knows two ways to produce a 404: the framework's automatic "no matching route" 404, and a `fetch` that returns 404. The third way — `notFound()` from `next/navigation` called inside a Server Component after a DB lookup returns null — is structurally different. It's *not* an error throw, it's a framework signal that renders the nearest `not-found.tsx` ancestor and emits a 404 status. The student who reads `notFound()` as `throw new Error('not found')` will route the missing-invoice case into `error.tsx` (the 500 surface) instead of `not-found.tsx` (the 404 surface). The misconception is treating missing data as an exceptional condition rather than a *normal expected route outcome*.

**Ideal teaching artifact.** A flow comparison — *Decision* archetype. A small ArrowDiagram in three columns showing three outcomes of a dynamic-segment data fetch: (a) record exists → `page.tsx` renders normally → 200 streaming response, (b) record missing → `notFound()` → nearest `not-found.tsx` → 404 status, (c) DB throws → uncaught error → nearest `error.tsx` → 500 status. Each column shows the calling code at the top, the file that renders at the bottom, and the HTTP status emitted. The three columns sit on the same horizontal axis so the student sees the trichotomy as one decision tree, not three.

**Engagement.** A `Dropdowns` exercise on a real `app/invoices/[id]/page.tsx` snippet — the student fills in three blanks: `const invoice = await getInvoice(id); if (___) ___; return <Invoice invoice={invoice} />;` from a dropdown that includes `!invoice`/`invoice === undefined`/`invoice` for the first blank and `notFound()`/`throw new Error('not found')`/`return null` for the second. The wrong picks for the second blank are precisely the misconception this concept fixes.

**Components.**
- Existing: `Figure` wrapping `ArrowDiagram` for the three-column flow.
- Existing: `Dropdowns` for the senior-pattern fill-in.

**Project link.** 5.7's detail slot calls `notFound()` when a record is missing — the project's "Done when" expects 404 emitted, not 500. This concept is what gets the student to the right call.

---

## Concept 10 — `global-error.tsx` catches what `error.tsx` cannot

**Why it's hard.** The student has just learned that `error.tsx` doesn't catch its own layout (Concept 8). The follow-up question is: what does? The answer is one file with three unusual properties at once — it must be a Client Component, it must render its own `<html>` and `<body>` tags (because the layout that normally owns them is the thing that crashed), and it only fires in production (in dev the framework overlay takes precedence). Each property looks arbitrary on its own; together they make sense — the boundary lives *above* the root layout in the framework-wired tree, so the layout's HTML scaffold isn't available, and the dev overlay would otherwise hide the file the student is trying to test.

**Ideal teaching artifact.** A real-artifact replica — *Pattern* archetype. A side-by-side `TabbedContent` with three tabs: (1) a minimum-viable `global-error.tsx` with `"use client"`, the `<html><body>` wrapper, a heading, a `reset` button, and `error.digest` — annotated with `CodeTooltips` on each load-bearing piece (the directive, the `<html>` tag, `digest`, `reset`); (2) the same file with two things broken — no directive, no `<html>` — and the production behavior (blank page, build failure) captioned underneath; (3) a senior-shape version with brand-aligned minimal styling, support contact, and a one-line `captureException` call (with a forward pointer to 20.1) showing what production deployment of this file looks like. Sitting above the tabs: a `DiagramSequence` of three frames showing where this file sits in the boundary tree — *above* the root layout — so the student feels the "why must own html/body" geometry.

**Engagement.** A `TrueFalse` round of five short claims ("`global-error.tsx` renders in development" — false; "`global-error.tsx` must render `<html>` and `<body>`" — true; "`global-error.tsx` catches errors thrown in `app/layout.tsx`" — true; "Adding `global-error.tsx` removes the need for `app/error.tsx`" — false; "Importing the design-system provider in `global-error.tsx` is a senior move" — false). Each statement targets one of the three unusual properties plus the "what belongs here" discipline.

**Components.**
- Existing: `TabbedContent` for the three-tab artifact, `CodeTooltips` inside tab one, `DiagramSequence` for the geometry frames (hand-SVG inside each frame).
- Confirmation: `TrueFalse`.

**Project link.** 5.7's root has both `app/error.tsx` and `app/global-error.tsx` — the project's "Done when" verifications expect a production build run that confirms the catastrophic-error UI renders.

---

## Component proposals

- **`SuspenseSimulator`** — Tree visual with per-leaf status toggles (pending/resolved) and a rendered-DOM pane that swaps content when any descendant suspends. Optional `key` toggle for the re-suspension scene; optional fallback-suspends toggle.
  - Uses in this chapter: Concepts 1, 4.
  - Forward-links: 5.4.2 (PPR holes resolving inside the same boundary shape), 7.3.6 (Server Action `useOptimistic` UX flow uses the same "what does the user see when X is pending" framing), 16.2 (TanStack Query suspending in a leaf).
  - Leanest v1: three-leaf tree, toggle per leaf, one Suspense boundary outlined, DOM pane shows either the fallback (`<Loading>`) or the children. Skip animation. The `key` and fallback-suspends toggles are additions for Concept 4 — ship them in v2 only if Concept 4's `DiagramSequence` fallback proves insufficient.

- **`BoundaryPlacementPuzzle`** — Mock UI with per-widget latencies, draggable Suspense boundary markers, and a live waterfall pane that updates as markers move. Authoring includes target configurations the student must reach.
  - Uses in this chapter: Concepts 2, 6 (reconfigured as a three-column waterfall comparator).
  - Forward-links: 5.7 project verification (the verification step asks the student to defend their boundary placement), 5.4.2 (the same latency reasoning extends to PPR static-vs-dynamic).
  - Leanest v1: a fixed mock with three named widgets and known latencies, one to three draggable boundary markers, a static SVG waterfall pane that recomputes on marker move. No real network. Concept 6's three-column comparator falls back to a hand-SVG `Figure` until the puzzle ships.

- **`StreamingTimeline`** — Animated transport diagram synced to a fake Network panel pane showing chunks with timestamps and contents. Hover-over chunks reveals their HTML.
  - Uses in this chapter: Concept 5.
  - Forward-links: 5.4.2 (PPR shell from CDN + dynamic holes streamed — same diagram with a CDN segment), 5.7 project (the throttled-network verification step). Strong forward-link.
  - Leanest v1: a static three-frame `DiagramSequence` showing the chunks at t=0, t=100ms, t=800ms, paired with a static `Figure` of the simulated Network panel listing the chunks with their contents. Drop the live animation; the scrub gives the temporal feel. Build the animated version only if it lands within the v1 component-build window.

- **`SegmentFileDesugarer`** — Paired `FileTree` (left) and conceptual React tree (right) with click-driven arrows that connect each file to the wrapping primitive it produces. Optional throw-origin overlay for Concept 8.
  - Uses in this chapter: Concepts 7, 8 (with the throw-origin overlay).
  - Forward-links: 5.4.2 (the same desugaring move for PPR's wrapping `Suspense`), 5.4.7 (async request APIs and which boundary they sit under).
  - Leanest v1: a static side-by-side `Figure` — `FileTree` on the left, a hand-SVG conceptual tree on the right, with pre-drawn colored arrows. No click animation. For Concept 8, two such figures side by side — one for the green-arrow case, one for the red-arrow escape. The interactive desugarer is the v2 if reuse in 5.4 materializes.

## Build priority

The proposal that earns first place by reuse weight is **`SuspenseSimulator`** — Concept 1 is the foundational mental model for the entire chapter, and the same widget extends to Concept 4 and forward-links into 5.4.2, 7.3.6, and 16.2. Build a v1 with two leaves, a fallback outline, and per-leaf toggles before any other component in this chapter.

Second is **`BoundaryPlacementPuzzle`** — Concept 2 is the senior decision the chapter is built to install, and the puzzle is the only artifact in the candidate set that forces the student to *make* the placement decision rather than read about it. The puzzle also carries Concept 6 in its three-column comparator mode and forward-links to the 5.7 project's verification step. Build a v1 with one fixed mock and three boundary configurations before extending.

**`SegmentFileDesugarer`** is third — it carries Concepts 7 and 8 in this chapter, but its v1 collapses to a static `Figure` cleanly. Build the static version first; promote to interactive only if 5.4 picks up the desugaring shape.

**`StreamingTimeline`** is fourth — Concept 5 is load-bearing, but the static `DiagramSequence` + `Figure` v1 teaches the chunk timing adequately. Build the live-animated version only if there's spare component-build capacity after the top three land.

## Open pedagogical questions

- Concept 1's `SuspenseSimulator` and Concept 4's reuse of it for the `key` scene share a teaching surface. Is it worth deliberately reintroducing the same widget in Concept 4 (so the student feels "same primitive, new affordance") or does Concept 4 want a different visual (the scrubbable time-travel widget) to emphasize the *change-over-time* nature of `key`?
- Concept 8 splits the `error.tsx` rules across two beats (directive trap + boundary placement). The two beats together may run long for a single concept; an alternative cut is to lift the boundary-placement geometry into its own concept between 7 and 8. The current cut keeps them together because the misconception "error.tsx catches its own layout" is what makes the directive feel arbitrary — separating them risks teaching `"use client"` as a rule to memorize rather than a consequence of the boundary geometry.
- The 5.7 project's verification step uses throttled network to confirm streaming. Concept 5's `StreamingTimeline` could be authored as a *DevTools tutorial* (where to find the network panel, how to throttle, what to look for) instead of, or alongside, the transport diagram. Worth deciding whether the diagnostic-skills framing replaces or complements the mental-model framing.
