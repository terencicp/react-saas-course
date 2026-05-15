## Concept 1 — The default flipped: dynamic-by-default, opt-in caching

**Why it's hard.** The student's mental model from Next.js 13–15 (and from most tutorials still on the web) is "static unless something dirties the route." Under `cacheComponents: true`, the polarity reverses: every route is dynamic, caching is an additive directive, and the implicit flow of dirty-by-API-usage is gone. Until that flip lands, the student keeps reasoning as if `cookies()` is doing something hidden behind the scenes.

**Ideal teaching artifact.** A side-by-side "old model vs. new model" comparator the student toggles through. On the left, a Next.js 15 `page.tsx` reads `cookies()`; an arrow labelled "implicit dynamic flip" reroutes the whole route's render. On the right, the same `page.tsx` under `cacheComponents: true` — no flip, no arrow, the route was already dynamic. The student switches between the two models with a single control and watches the static analysis decisions change. The archetype is Concept-with-comparator: two diagrams that share enough visual vocabulary that the *delta* is the teaching, not either side in isolation.

**Engagement.** A `TrueFalse` round of six statements about routes ("a page that reads `cookies()` is dynamic", "a page with no `use cache` is static", "removing `cookies()` makes the route static again") locks the new polarity in. The student must answer each under the new model.

**Components.**
- `TabbedContent` with two tabs (`Pre-16` / `Next.js 16`), each tab a hand-SVG inside `Figure` showing the route tree with annotated decision arrows. Static composition; no new component needed.
- `TrueFalse` for the assessment round.

**Project link.** Lands in 5.7.3 — the student wires `@list` and `@detail` slots without worrying about flipping the route dynamic, because it already is.

---

## Concept 2 — The route as a tree of cached and uncached subtrees

**Why it's hard.** "Static or dynamic" used to be a per-route attribute; now it's a per-component one, and the relationship between cached parents and dynamic children is asymmetric (a dynamic child under a cached parent is a build error; a cached child under a dynamic parent is fine). The student needs to see the tree and the rule simultaneously.

**Ideal teaching artifact.** A controllable component-tree widget. The student sees a route tree of six or seven nodes (Layout, Header, Page, Sidebar, InvoiceList, FooterAd). Each node has a toggle: `dynamic` / `use cache`. As the student flips toggles, the widget colors the subtree (cached = blue, dynamic = orange) and surfaces a banner when the configuration produces a build error ("dynamic read inside cached `<InvoiceList>` — lift it to a sibling"). The widget enforces the asymmetric rule structurally — the student cannot *avoid* discovering it. The archetype is Mechanics-as-puzzle: the rule emerges from the interactions, not from a paragraph.

**Engagement.** The widget itself carries assessment via its error states. A confirming `Buckets` exercise follows: six node configurations sorted into "valid", "fails the build", "legal but wasteful".

**Components.**
- New component `CacheTreePlayground` — see Component proposals.
- `Buckets` for the confirmation sort.

**Project link.** 5.7.3 and 5.7.5 — the student designs the slot's tree of cached chrome (the layout, the sidebar) versus dynamic content (the table) and reads the build's segment log against the same mental picture.

---

## Concept 3 — The Suspense boundary as the cache/dynamic seam

**Why it's hard.** Suspense was introduced in 5.3 as a loading boundary. Here it does a second job — it marks the seam where a cached parent hands off to a dynamic child — and the student needs to see that the *same primitive* serves both roles. Without that recognition, the boundary feels like a magic incantation that PPR demands.

**Ideal teaching artifact.** A short scrubbable timeline of one request. Position 0: build time — the cached shell renders, the `<Suspense fallback>` ships inside the shell. Position 1: request arrives — shell flushes from the edge in 30ms. Position 2: dynamic boundary resolves — content streams in over the same HTTP response and replaces the fallback. The student scrubs the slider and watches the same Suspense boundary play two roles: it's the fallback contract from 5.3.1, and it's the PPR hole. The archetype is Concept-with-timeline; the cause-and-effect is that the boundary is one mechanism, not two.

**Engagement.** A `PredictOutput`-style prediction: given a `page.tsx` source with one `<Suspense>` wrapping a dynamic component inside an otherwise-cached page, the student predicts (a) what ships from the CDN, (b) what streams later, (c) what the user sees at 50ms vs. 500ms.

**Components.**
- `DiagramSequence` with three or four steps; each step is a hand-SVG snapshot of the request lifecycle.
- `PredictOutput` framed against a small code sample.

**Project link.** 5.7.5 — the student adds `loading.tsx` per slot and sees the streaming boundary do double duty as both the loading contract and the PPR seam.

---

## Concept 4 — PPR's three shapes: mixed, pure-static, pure-dynamic

**Why it's hard.** Students hearing "Partial Prerendering" assume it's one configuration. In practice, the same mechanism degenerates into three observable shapes: a mixed shell+holes page, a fully static page, and a fully dynamic page. Without seeing the degeneracy, the student over-thinks the mixed case for routes that don't need it (an authenticated dashboard) and under-uses caching for routes that do (the marketing pages).

**Ideal teaching artifact.** A three-up comparison gallery. Each panel shows one route shape — `app/(marketing)/pricing/page.tsx` (pure static), `app/(marketing)/page.tsx` with a dynamic newsletter signup (mixed), `app/dashboard/invoices/page.tsx` (pure dynamic) — paired with the build log lines that prove the shape. The student reads the file, reads the log, and pattern-matches what falls out. The archetype is Reference-as-pattern-trio.

**Engagement.** A `Matching` drill: six route descriptions on the left, three shape labels on the right (static / mixed / dynamic). Each route maps to the shape its content forces.

**Components.**
- `CardGrid` of three `Card`s, each carrying a code block and a build-log fragment.
- `Matching` for the assessment.

**Project link.** 5.7.3 — the student's own routes resolve to "mixed" (the list page with a cached header) and the dashboard's authenticated detail page is "pure dynamic". The student names which shape each of their routes is.

---

## Concept 5 — `use cache` at three placements: page, component, function

**Why it's hard.** One directive, three target scopes, and the student must build the intuition that the *scope of the directive* equals the *scope of what gets stored*. The page placement caches the whole route render, the component placement caches a subtree, the function placement caches a return value. The compiler's behavior changes by placement but the directive's syntax is identical — easy to misplace.

**Ideal teaching artifact.** A `TabbedContent` of three side-by-side examples, each tab one placement. Each tab shows the code *and* a small diagram of what part of the running system the cache entry corresponds to: the rendered HTML for the route (page), the rendered HTML for a subtree (component), the serialized return value (function). The student sees that "what is stored" is what changes between placements, not "how it's declared". The archetype is Decision-with-three-defaults — placement is the decision.

**Engagement.** `Tokens` on a single code block: the student clicks every spot where `use cache` would be a legal placement, and the decoys are spots that look legal but aren't (inside a component body, on a synchronous function, inside a Client Component).

**Components.**
- `TabbedContent` with three tabs; each tab pairs `Code` with a small hand-SVG inside `Figure`.
- `Tokens` for the placement-recognition drill.

**Project link.** 5.7 doesn't use `use cache` in the project, but the discipline is staged here for Unit 6 where the data layer's read functions become the canonical function-level placement.

---

## Concept 6 — The cached function's contract: serializable, closure-free

**Why it's hard.** The student writes a cached fetcher that closes over a Drizzle client imported at module scope, expects it to work, and is confused when the build fails. The contract that "cached functions cannot capture non-serializable values or request data from their enclosing scope" is the kind of constraint that's invisible until violated and humiliating when it is. Worse, `Date.now()` in a closure compiles fine but produces a key that's correct at build and wrong at runtime — a silent footgun the compiler doesn't catch.

**Ideal teaching artifact.** A wrong-by-default sandbox the student repairs. The starting code is a `use cache` function that closes over `db`, captures `Date.now()`, and accepts a class-instance argument — three violations, three build errors, one runtime footgun. The student fixes each in sequence: move `db` import inside the function, lift `Date.now()` into the function body, change the argument to a primitive ID. After each fix, the student re-runs and sees the next error surface. The archetype is Pattern-as-repair: the failure modes are the lesson; the structural fix is the answer.

**Engagement.** The repair sandbox itself carries the assessment — the student doesn't progress until each fix lands. A follow-up `MultipleChoice` asks which of five sample functions are safely cacheable; the decoys are violations that look subtler than the sandbox's three.

**Components.**
- New component `CompileErrorSandbox` — see Component proposals. Carries Concept 6 and reused in Concept 13.
- `MultipleChoice` for the confirmation round.

**Project link.** Forward-staged for Unit 6's data layer — students will write `getInvoiceList(orgId)` etc. against this exact contract.

---

## Concept 7 — `cacheLife` as a UX contract, not a perf knob

**Why it's hard.** "How long should this cache live?" reads like a performance question. It's actually a UX question — how stale is acceptable before the user notices, how aggressively to refresh, when to make a request wait. The three numbers (stale / revalidate / expire) form a contract on the user's experience, not on the server's load. Until that frame lands, the student tunes lifetimes by gut feel.

**Ideal teaching artifact.** A two-beat artifact. **Beat one:** a controllable timeline. The student sees a horizontal time axis with three configurable points (stale, revalidate, expire) and a marker that moves over it. As the marker advances, the widget shows what the *next request at that moment* sees: fresh value served, stale value served and background refresh kicked off, request blocks for fresh content. The student drags the three points and runs requests at different positions. **Beat two:** a preset gallery — four named profiles (`seconds`, `minutes`, `hours`, `max`) shown as ranges on the same axis with one-line "reach for it when" captions, so the student leaves with both the model and the menu. The archetype is Concept-with-simulator, paired with a Reference.

**Engagement.** A `Buckets` sort: eight data examples (the marketing copy, the org's invoice list, the user's open notifications, the product catalog, the auth token, the OG image, a webhook-fed counter, a search index) sorted into the four preset profiles. Wrong sorts surface why.

**Components.**
- New component `CacheLifeTimeline` — see Component proposals. Single-use within this chapter but with a forward-link to Unit 15's caching deep-dive.
- `Buckets` for the preset sort.

**Project link.** Not used in the 5.7 project (which is pure-dynamic on the authenticated surface). Forward-staged for Unit 11's production list and Unit 15's caching unit.

---

## Concept 8 — `cacheTag` as a named address; tag-namespace discipline

**Why it's hard.** `cacheTag` is a single function with no signature pressure — pass any string, it works. The senior shape is unwritten: collection tags (`invoices`) for lists, record tags (`invoice:42`) for items, both attached at the cache site so both forms of invalidation land for free. Without the convention the student tags things by route or by file and the invalidation surface becomes brittle.

**Ideal teaching artifact.** A worked example of a single fetcher rendered as a network diagram: `getInvoice(id)` attaches two tags; the diagram shows arrows from "invoice list page", "invoice detail page", and "dashboard widget" all pointing to the cached entries with their tag labels. Then a second view: a mutation fires `updateTag('invoices')` *and* `updateTag('invoice:42')` — the diagram highlights which cached entries each invalidates. The student sees that tags are the *address space* that connects writes to reads. The archetype is Concept-with-system-diagram; the network is the explanation.

**Engagement.** A small `DrizzleCoding`-style fill-in (using `ScriptCoding` since this is plain TS) where the student writes the `cacheTag` lines for a `getCustomerList(orgId)` and `getCustomer(orgId, customerId)` pair, following the entity / entity:id convention.

**Components.**
- `ArrowDiagram` inside `Figure` for the network — boxes are cached entries and consumers, arrows are tag attachments.
- `ScriptCoding` for the tag-writing exercise.

**Project link.** Forward-staged for Unit 7's Server Actions where the tags written here are the invalidation targets, and Unit 11's production list.

---

## Concept 9 — The two-layer cache: request-scoped vs. cross-request

**Why it's hard.** `use cache` and React's `cache()` look superficially similar — both memoize, both wrap functions — but they live at different layers and serve different purposes. The student who reaches for `use cache` to dedupe `getCurrentUser()` calls hits a build error (request data in a cached function); the student who reaches for `cache()` to share a CMS post across users gets no persistence at all. The decision question is "does the work depend on request data?" — and once that question is internalized, the choice is automatic.

**Ideal teaching artifact.** A two-axis decision diagram. Horizontal axis: request-dependent vs. request-independent. Vertical axis: deduplication scope (within-render vs. cross-request). Four quadrants, but only two are populated: `cache()` sits in the request-dependent / within-render quadrant; `use cache` sits in the request-independent / cross-request quadrant. The other two quadrants are explicitly labeled "doesn't exist" with one line each on why. The student leaves with the decision shaped as a 2D space, not a list. The archetype is Decision-as-coordinate-space.

**Engagement.** A `Matching` drill: eight work descriptions (read the session cookie, fetch the published blog post, look up the user's org from `cookies()`, compute the product catalog total, derive the request locale, hash a marketing image URL, etc.) matched to the right primitive.

**Components.**
- Hand-SVG inside `Figure` for the 2x2 quadrant diagram. Static, single-use, demoted from a bespoke component.
- `Matching` for the assessment.

**Project link.** Forward-staged for Chapter 9 (auth) where the request-scoped-user pattern lives.

---

## Concept 10 — The request-scoped user as the canonical `cache()` pattern

**Why it's hard.** `cache()`'s value is non-obvious in isolation; it lands when the student sees the dedup that happens across one render tree. Three Server Components in different files all call `getCurrentUser()`; without `cache()` the database is hit three times, the page slows, and nothing alarms. The pattern of "wrap-at-module-scope, dedupe-by-argument" is the senior shape this primitive exists to enable.

**Ideal teaching artifact.** A scrubbable execution trace. The route tree renders top-down: Layout → Page → InvoiceCard (×3). Each component calls `getCurrentUser(cookieStore)`. Position 0: no `cache()` — the trace logs three database reads, the timeline shows three sequential DB latencies. Position 1: `cache()` wrapped — the trace logs one read, two cache hits, the timeline compresses. The student scrubs and sees the *same render* produce two different network footprints. The archetype is Mechanics-as-instrumented-trace.

**Engagement.** A `ReactCoding` exercise (target-match mode): the student starts with three components each calling `getCurrentUser`, wraps the function in `cache()`, and the test pane verifies that exactly one DB call fires per render.

**Components.**
- New component `RenderTraceTimeline` — see Component proposals. Single-use in this chapter; demoted to alternative.
- Primary: a `TabbedContent` of two tabs ("without `cache()`" / "with `cache()`"), each tab a hand-SVG render-tree-with-DB-call-counts inside `Figure`.
- `ReactCoding` for the practice.

**Project link.** Forward-staged for Chapter 9's auth layer where this is the canonical shape.

---

## Concept 11 — The post-mutation decision: which of four invalidation tools

**Why it's hard.** Four tools — `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` — overlap superficially. The student reaches for whichever they read about first and ships the wrong semantics. The discriminating question isn't technical — it's *what does the user expect to see immediately after the mutation completes?* Read-your-writes (form save and redirect) demands `updateTag`; stale-while-revalidate (webhook, admin tool) demands `revalidateTag`. That UX-shaped question is the entire decision.

**Ideal teaching artifact.** A decision tree the student walks. Root: "Did a user action mutate data?" Branch on user expectation: "Will they land on a page that should reflect their change?" → `updateTag`. "Is the change asynchronous (webhook, scheduler)?" → `revalidateTag`. "Is the unit a URL, not a tag?" → `revalidatePath`. "Did a Client Component change state that should re-pull server work?" → `router.refresh`. Each leaf has a one-line example. The archetype is Decision-as-flowchart, with the discriminating questions phrased in UX terms.

**Engagement.** A `Sequence` exercise: given six mutation scenarios (user edits invoice and redirects, Stripe webhook updates subscription, admin re-syncs the search index, user clicks "mark all read" in a Client Component, sitemap regenerates, OG image refreshes), the student picks the right tool for each — framed as a six-question round.

**Components.**
- A Mermaid flowchart for the decision tree.
- `Sequence` or `MultipleChoice` rounds for the six-scenario assessment.

**Project link.** The 5.7 project doesn't mutate (Server Actions land in Unit 7). The decision tree is forward-staged; the project lesson 5.7.6 names it in its forward references.

---

## Concept 12 — `updateTag` vs. `revalidateTag`: the read-your-writes split

**Why it's hard.** The two tag-based tools split on timing, not on syntax, and the student needs a vivid mental picture of what each produces. `updateTag` is synchronous: the next read in the same flow sees fresh data. `revalidateTag` is stale-while-revalidate: the next read sees stale data and a background refresh fires. Both target the same tags; the choice is about what the user sees.

**Ideal teaching artifact.** A side-by-side timeline animation. Two horizontal lanes; each lane is a request lifecycle. Top lane: user submits form → action runs → `updateTag` → redirect → page renders → user sees fresh data. Bottom lane: webhook fires → handler runs → `revalidateTag` → no user in loop → user next visits → sees stale → background refresh → next visit sees fresh. Same tag, same data, different timing, different UX. The archetype is Concept-with-paired-timeline.

**Engagement.** A `TrueFalse` round of six statements that probe the discriminating boundary ("`updateTag` works in a route handler", "`revalidateTag` blocks the next read until fresh", "`updateTag` fires synchronously within the same flow", "`revalidateTag` requires a `cacheLife` profile in Next.js 16").

**Components.**
- Hand-SVG inside `Figure` for the two-lane timeline. Static composition; single-use; demoted from a bespoke component.
- `TrueFalse` for the assessment.

**Project link.** Forward-staged for Unit 7 (Server Actions) and Unit 12 (Stripe webhooks).

---

## Concept 13 — Async request APIs: `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` as Promises

**Why it's hard.** Five APIs that used to be synchronous in older codebases are now Promises. The change is mechanical (add `await`) but the discipline is structural — read at the highest reasonable level, await once, pass the resolved value down. The student who awaits `cookies()` in every leaf component pays for it; the student who awaits it once at the layout and passes the resolved store down writes cleaner code. The senior reach is the discipline, not the syntax.

**Ideal teaching artifact.** A wrong-then-right `CodeVariants` pair. Variant A: a leaf component awaits `cookies()` directly, the parent awaits `cookies()` separately, every consumer awaits. The diagram beside shows three awaits in the call stack. Variant B: the layout awaits `cookies()` once, passes the resolved `ReadonlyRequestCookies` down as a prop, leaves are synchronous about the store. The diagram shows one await at the top. Same outcome, different shape. The archetype is Pattern with wrong-then-right.

**Engagement.** A short `Dropdowns` exercise inside a code block: given a page that needs `params.id`, `searchParams.status`, and the session cookie, fill in the placement of each `await` (page / layout / leaf component) to match the senior pattern.

**Components.**
- `CodeVariants` for the two versions.
- `Dropdowns` for the placement drill.

**Project link.** 5.7.3 — the student awaits `searchParams` at the slot page level, validates with Zod, and passes the resolved object to the pure render components.

---

## Concept 14 — `connection()` as the explicit dynamic escape hatch

**Why it's hard.** Most dynamic signals are inferrable from API calls (`cookies()`, `headers()`, awaited `params`). Some aren't — a third-party SDK that reads `process.env` at call time, a `Date.now()` for cache busting, a `crypto.randomUUID()` for a request ID. The framework's static analysis can't see these. The student needs to know `connection()` exists as the explicit marker and *when* it earns its weight — rarely, but precisely.

**Ideal teaching artifact.** A short decision-question prose paragraph with one code snippet showing `await connection()` at the top of a function that calls `Date.now()`. The artifact is intentionally small — this is a single-call surface and the lesson's job is to name it, not to elaborate. The archetype is Reference-with-trigger ("reach for it when the dynamic signal isn't otherwise visible").

**Engagement.** A `MultipleChoice` question with five code snippets — only one needs `connection()`; the other four already have an explicit dynamic signal the framework can see.

**Components.**
- `Code` block inline with prose. No diagram needed.
- `MultipleChoice` for the recognition round.

**Project link.** Not used in 5.7.

---

## Concept 15 — Legacy segment config: what's gone, what's left, the migration table

**Why it's hard.** Older codebases litter `export const dynamic = 'force-dynamic'`, `export const revalidate = 60`, `export const fetchCache = 'force-cache'` at the top of every `page.tsx`. Under `cacheComponents: true` most of these are deprecated and replaced. The student needs a translation table so older code reads instantly and new code is written in the new shape. This is reference material, but the migration shape is the senior knowledge.

**Ideal teaching artifact.** A three-column table: **Legacy export** → **What it did** → **New shape**. Five rows: `dynamic = 'force-dynamic'` → remove the line (the default), `dynamic = 'force-static'` → wrap in `use cache`, `revalidate = 60` → `cacheLife({ revalidate: 60, ... })`, `fetchCache = 'force-cache'` → wrap fetcher in `use cache`, `runtime = 'edge'` → use `nodejs` (the new default). The archetype is Reference-as-translation-table — exactly what the senior reaches for when migrating.

**Engagement.** A short `Matching` drill: five legacy snippets on the left, five modernized snippets on the right.

**Components.**
- Markdown table or `TabbedContent` with two tabs (legacy / 2026). Static.
- `Matching` for the migration drill.

**Project link.** Forward-staged for every later unit that touches an existing codebase — the table is the migration reflex.

---

## Component proposals

### `CacheTreePlayground`

- **Sketch.** A controllable component tree. Inputs: a tree definition (nodes with names and parent links) and an initial mode per node (`dynamic` / `use cache`). Each node has a toggle; the widget colors subtrees and surfaces a banner when the configuration violates the cache rules (dynamic read inside a cached subtree, etc.). Inline within the lesson, not modal.
- **Uses in this chapter.** Concept 2 (primary).
- **Forward-links.** None — single-use within Chapter 5.4. Build the bespoke component anyway because the rule it enforces structurally is the load-bearing teaching of the chapter's center-of-gravity model (the tree of cached and dynamic subtrees) and prose can't reproduce the asymmetric constraint.
- **Leanest v1.** A 5-node fixed tree, two valid configurations and two error configurations, toggle controls, color-by-state, one banner message per error. No animation, no save state. The lesson uses two of these widgets back to back rather than a configurable schema.

### `CompileErrorSandbox`

- **Sketch.** A wrong-by-default code block with a fixed list of staged "errors" the student fixes sequentially. Inputs: an initial broken code, an ordered list of fixes (each fix a regex/anchor + the message that appears until it's fixed). The widget shows the current code, highlights the active error, and advances when the student edits the right line. Not a runtime — a directed repair simulator.
- **Uses in this chapter.** Concept 6 (primary, three staged fixes).
- **Forward-links.** Strong candidates throughout the curriculum: schema constraint violations (Unit 6), Server Action `'use server'` violations (Unit 7), RLS column-name violations (Unit 10), migration hazards (Unit 6.5). Worth building because the "repair a broken thing under guidance" archetype is a recurring teaching shape the existing live-coding components don't carry.
- **Leanest v1.** Static code display with three fixed checkpoints, no real compilation — the widget pattern-matches the student's edits against expected fix anchors. Defer real type-checker integration to v2.

### `CacheLifeTimeline`

- **Sketch.** A horizontal time axis with three draggable points (stale, revalidate, expire). A "now" marker the student drags. As "now" passes each point, the widget shows what `getProductCatalog()` would return at that moment — fresh value, stale value plus background refresh, blocking refresh. Optional preset selector switches the three points to a named profile.
- **Uses in this chapter.** Concept 7 (primary).
- **Forward-links.** Unit 15 (caching deep-dive) is the only credible forward use within the current TOC. Demoted to alternative — the chapter's primary recommendation is a hand-SVG inside `Figure` showing the timeline statically with three named regions and a short prose walk of what each region serves.
- **Leanest v1.** If still built: fixed-position points (not draggable), four preset profiles selectable via radio, single "now" slider, value-served readout. Skip the drag interaction in v1.

### `RenderTraceTimeline`

- **Sketch.** Two-panel visualization of a server render. Top panel: the component tree of one route, with each node showing which functions it calls. Bottom panel: a horizontal timeline of those calls firing, with DB-read calls marked. A toggle swaps "without `cache()`" / "with `cache()`" and the timeline updates — sequential DB reads vs. one read plus two hits.
- **Uses in this chapter.** Concept 10.
- **Forward-links.** None directly named in the TOC; Unit 9 (auth, request-scoped user) and Unit 6.4 (N+1 spotting) might reuse, but neither has a confirmed need. Demoted to alternative — primary is a `TabbedContent` with two static hand-SVG render trees.
- **Leanest v1.** If still built: fixed example only, no scrubbing, just a before/after toggle and a static timeline annotated with call counts.

---

## Build priority

Two proposals carry meaningful teaching load and warrant the build.

**`CacheTreePlayground` is the priority build.** It's the chapter's center-of-gravity widget: it enforces the asymmetric cache rule structurally, and the rule is what the rest of the chapter depends on. Single-use in this chapter, but the teaching shape (a tree with toggleable per-node modes and structural rule enforcement) is the only credible artifact for Concept 2; prose can't substitute. Build it.

**`CompileErrorSandbox` is the second build, scoped for reuse.** Its primary chapter use is Concept 6 (the three-violation repair), but the "repair-broken-thing" archetype recurs across Units 6, 7, and 10. Build the leanest v1 (pattern-match anchor-based fix detection, no real compiler) and let it earn its weight across the curriculum.

`CacheLifeTimeline` and `RenderTraceTimeline` are both demoted to hand-SVG `Figure` compositions in the per-concept recommendations. Revisit them later if forward-link demand materializes in Unit 15.

---

## Open pedagogical questions

- Concept 4's pure-static / mixed / pure-dynamic gallery overlaps in spirit with 5.4.2's worked example. Is the gallery worth keeping as its own concept, or should it fold into Concept 3 (the seam) as a third panel?
- The chapter teaches `updateTag` in Concept 11 and Concept 12 with deliberate redundancy (the four-tool tree and the read-your-writes split). If the student internalizes the UX-shaped question early, Concept 12 may be a recap rather than a load-bearing concept. Cut to one concept if a draft shows the redundancy doesn't earn its weight.
