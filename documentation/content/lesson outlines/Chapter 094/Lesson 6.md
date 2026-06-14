# RSC waterfalls and Promise.all

- Title: RSC waterfalls and Promise.all
- Sidebar label: RSC waterfalls

## Lesson framing

Archetype: **pattern** (diagnose-then-fix). The senior question: *the dashboard renders in 320ms, every DB span is under 80ms, no slow upstream — why is the page slow?* Answer: the Server Component awaited four reads back-to-back when three had no dependency between them. This is the server-side cousin of the N+1 trap (ch039 L2 owns the DB-loop version; this owns the component version), and it is the load-bearing server-side lesson of the chapter — the one place the Server Component thread from Unit 4 onward "cashes in" a hidden cost.

Two load-bearing skills, in order:
1. **Read the trace.** The bug is *invisible* without a waterfall view. A student who profiles the DB in isolation finds nothing. The Sentry trace (wired in ch092, `tracesSampleRate` + `withServerActionInstrumentation`) shows four spans stacked top-to-bottom — sequential — and the cause becomes obvious *from the picture*. The trace is the gateway; the lesson must teach trace-reading as the diagnostic reflex before any fix.
2. **Apply the dependency-check reflex, then pick the fix shape.** ch007 L3 already taught "parallel by default, sequential by dependency" and the `const [a, b] = await Promise.all([...])` tuple shape as a *JS* pattern. This lesson is where that reflex pays off in real RSC code. The fix is not always `Promise.all` — there are three distinct shapes keyed to the *kind* of waterfall, which is the core decision the lesson installs.

The three fix shapes (this taxonomy is the spine of the lesson):
- **Same-component sequential awaits, no dependency** → `Promise.all`. The direct ch007 cash-in.
- **Parent-child render waterfall** (parent fetches, renders a child, the child fetches its own data — sequential *because rendering is sequential*, not because of a data dependency) → two reaches: (a) **hoist the fetch to the parent + pass down**, or (b) **React `cache()`** so the parent can kick off the fetch (no `await`) while the child still calls the cached function — this preserves co-location/composition and is the modern senior default. (c) **sibling Suspense boundaries** that fetch in parallel and stream independently.
- **Slow + fast mix** (one fetch 800ms, one 50ms, both could parallelize but the slow one shouldn't block first paint) → **Suspense streaming**: wrap the slow one so fast content paints immediately. The decision: parallel-await when *all must complete before paint* (transactional page); Suspense streaming when *partial paint is acceptable* (dashboard widgets).

Mental model the student leaves with: *Co-location is the React way — but co-location plus `cache()` plus parallel awaits is the synthesis. Reading order in an RSC tree is render order; render order is sequential unless you deliberately overlap the awaits.* The student should be able to (a) open a slow trace, spot stacked-vs-overlapping spans, (b) run the dependency check, (c) reach for the right one of the three shapes.

Cognitive-load staging: start with the *picture* (what a waterfall looks like on a time axis), then the simplest fix (`Promise.all` on co-located awaits), then escalate to the harder parent-child case and its three reaches, then the streaming variant, then caching as the orthogonal upstream fix. Never introduce `cache()` and `Suspense` before the student has internalized the basic two-await rewrite.

Tone: terse, senior, production-stakes. No bootcamp scaffolding. Code is **fragments** illustrating the shape, not full compilable files — but fragments must obey conventions (`db/queries/` helper names like `getInvoices(orgId)`, `requireOrgUser()`, arrow-const where natural). Two diagrams carry the conceptual weight (the timing transformation, the parent-child render order); code samples carry the fix mechanics; one exercise checks the dependency-check reflex; one checks trace-reading.

Critical fact corrections vs. the source chapter outline (template corruption mangled numerics; also one stale API):
- The outline cites `unstable_cache` for request-scope dedup — **wrong for this purpose**. `unstable_cache` is cross-request persistence (and is the legacy name; the course uses the `'use cache'` directive, ch032). **Request-scope dedup is React `cache()`**. The lesson uses React `cache()` for the dedup story and only *names* `'use cache'` as the separate cross-request tool, forward-pointed to ch032/ch072.
- `fetch()` GET auto-dedupes per render pass; **Drizzle/`db.select()` does NOT** — this asymmetry is the reason `cache()` matters in this stack (the app's reads are Drizzle, not `fetch`). The outline's "missing the automatic `fetch()` dedup that doesn't apply to `db.select()`" watch-out is correct and is promoted to a teaching point.
- Corrupted numerics ("renders in chapter 004s") reconstructed as concrete illustrative millisecond figures throughout.

## Lesson sections

### Introduction (no header)

Open on the senior question as a concrete scene: a dashboard that *feels* slow, ~320ms server render, yet every DB query in the trace is <80ms and there is no slow third party. State the puzzle plainly: if no single operation is slow, where did the time go? Name the answer in one sentence — the page awaited four reads in series when three were independent — and frame the lesson's two skills (see the waterfall in a trace; rewrite it). Connect back to ch007 L3 ("parallel by default, sequential by dependency" — you learned the rule; this is where it pays off in real Server Components) and to ch039 L2 ("you met N+1 at the DB layer; this is its twin at the component layer"). Preview: by the end, the student can open a slow trace, run the dependency check, and pick the right fix. Keep it to ~5 sentences, warm and brief.

Reasoning: the pedagogical guidelines require the senior question stated implicitly up front and a connection to prior knowledge. The "every span is fast yet the page is slow" framing is the hook that makes the waterfall counterintuitive and memorable.

### What a waterfall looks like

**Goal:** install the *visual* model before any code. The student must be able to recognize the shape on a time axis — stacked bars = sequential, overlapping bars = parallel.

Content:
- Conceptual prose: an RSC awaits `user`, then `org` (needs `user.orgId`), then `invoices` (needs `org.id`), then `team` (needs `org.id`). Four awaits at ~80ms each = ~320ms. But `invoices` and `team` both depend on `org.id` and *not on each other* — they could fire together. The achievable floor is `user → org → max(invoices, team)` = ~240ms.
- Introduce the **dependency graph** explicitly: draw which read depends on which. This is the object the student reasons over for the rest of the lesson. `org` depends on `user`; `invoices` and `team` depend on `org` but are siblings.

**Diagram 1 — the timing transformation (DiagramSequence).** This is the lesson's anchor visual. Use `DiagramSequence` with 3 steps, each an HTML+CSS horizontal bar/Gantt strip on a shared time axis (per diagrams INDEX: "Gantt / parallel tasks on a shared time axis" → HTML+CSS bar grid; HTML+CSS chosen over Mermaid gantt for tight control of the before/after and the overlap highlight). Build the bars as simple colored divs with widths proportional to duration, labeled `user` / `org` / `invoices` / `team`, on a left-to-right ms axis.
- Step 1 ("The waterfall"): four bars stacked, each starting where the previous ended. Total bracket annotated ~320ms. Caption names this as four serial awaits.
- Step 2 ("Find the independent reads"): same four bars, but `invoices` and `team` highlighted as siblings (a brace or color) with a note "same dependency (`org`), no dependency on each other."
- Step 3 ("Overlap the siblings"): `invoices` and `team` bars now start at the same x (right after `org`), overlapping vertically. Total bracket shrinks to ~240ms. Caption: "three serial waits become two."
Pedagogical goal: make "serial vs parallel" a *spatial* intuition the student carries into trace-reading. The scrub-through animation makes the time-saving visceral.

Reasoning: leading with the picture (not code) directly serves the cognitive-load mandate — the student sees *what* we are fixing before *how*. A static before/after would work, but the scrub reinforces the transformation as a deliberate move.

Tooltips here: `RSC` (Term — React Server Component, render-on-the-server component that can `await` data directly in its body).

### The trace is the only place you see it

**Goal:** establish trace-reading as the diagnostic reflex — the bug is invisible without it.

Content:
- The failure-of-the-naive-approach narrative: a dev who suspects the DB profiles each query in isolation, finds every one fast, and concludes "the DB is fine" — and is stuck, because the cost is in the *serialization*, which only a timeline shows.
- What a trace shows: spans with a start time and a duration. **Sequential spans stack top-to-bottom and don't overlap; parallel spans overlap on the time axis.** This is the single reading skill. Tie back to ch092: the trace comes from Sentry (`tracesSampleRate` raised, `withServerActionInstrumentation` / auto-instrumentation produces the spans); Vercel observability is the named alternative surface. Do **not** re-teach Sentry install — back-reference ch092.
- The reading recipe, stated as a discipline: open the slow page's trace → find a run of spans that stack without overlapping → ask of each adjacent pair "does the second depend on the first?" → if no, that's a waterfall to rewrite.

**Diagram 2 — annotated trace (Figure + HTML/CSS, or Screenshot/TabbedContent).** A stylized Sentry-style waterfall: a labeled root span (`GET /dashboard`) with four child spans (`getUser`, `getOrg`, `getInvoices`, `getTeamMembers`) drawn as offset bars showing the staircase. Annotate the "staircase" shape with a callout: "each bar starts where the last ended — that diagonal is the smell." Prefer hand-built HTML/CSS (matches the bar vocabulary from Diagram 1 for continuity) wrapped in `<Figure>`. If a real Sentry screenshot is captured, use `Screenshot`; otherwise the HTML stylization is the deliberate fallback (note for downstream agent: a real screenshot is preferred but the stylized figure is acceptable and keeps visual continuity with Diagram 1).
Pedagogical goal: connect the abstract dependency graph to the concrete artifact the student will actually stare at in production. The "diagonal staircase = waterfall" heuristic is the takeaway.

**Exercise — Tokens or MultipleChoice on a trace.** Show a small trace (4-5 spans, a mix of stacked and overlapping). Ask the student to identify which spans form a waterfall (the stacked, independent ones) vs. which are correctly parallel/dependent. `MultipleChoice` (multi-select: "which spans could run in parallel?") is the cleanest fit; `Tokens` over a rendered trace is a richer alternative if the trace is expressed as clickable bars. Goal: verify the student can read stacked-vs-overlapping and apply the dependency question. Grading: correct selection of the independent stacked spans.

Reasoning: the chapter framing makes "trace is the gateway" a load-bearing thread. Teaching the fix without the diagnosis produces a student who can't find the bug in the wild. The exercise checks the diagnosis skill in isolation before the fix is introduced.

Tooltips: `span` (Term — one timed operation in a trace, with a start and duration), `trace` (Term — the tree of spans for one request).

### Rewriting co-located awaits with Promise.all

**Goal:** the simplest, most common fix — the direct ch007 cash-in.

Content:
- The dependency-check reflex, restated for RSC: *before adding a second `await` in a component body, ask "does this read need the value I just awaited?"* No → `Promise.all`. Yes → keep it sequential (and the order is load-bearing).
- The rewrite, shown as before/after. Once `org` resolves, `invoices` and `team` start together and are awaited as a pair:
  `const [invoices, team] = await Promise.all([getInvoices(org.id), getTeamMembers(org.id)]);`
  Three serial waits become two: `user` → `org` → `max(invoices, team)`. Name the per-render saving and that it compounds under load (every request pays the old cost).

**`CodeVariants` (before/after).** Two tabs, sharing the surrounding RSC shape (a `DashboardPage` server component reading `requireOrgUser()` then the four reads).
- Tab "Waterfall" (`del`/highlight the four serial `await`s): four sequential `const x = await getX(...)` lines. Prose: "four round trips in series — ~320ms."
- Tab "Parallel" (`ins` the `Promise.all`): `org` still awaited first (real dependency), then `const [invoices, team] = await Promise.all([...])`. Prose: "the two independent reads overlap — ~240ms, same correctness."
Use `db/queries/`-style helper names (`getOrg`, `getInvoices(orgId)`, `getTeamMembers(orgId)`) per conventions. Keep both fragments under ~12 lines.

- **Watch-out, taught inline (not bundled):** the partial-failure trap. `Promise.all` rejects on the *first* rejection; the other promises keep running but their results are discarded. When the wasted work matters, or when each result should be rendered independently of the others' success, reach for `Promise.allSettled` (named, ch007 L2 owns it). Frame as a decision, not a warning: "all-or-nothing render → `Promise.all`; render-what-you-can → `allSettled` (or Suspense, next)."
- **Watch-out, inline:** the *silent correctness* trap — `Promise.all` over two reads where the second genuinely needed the first's value will run with stale/undefined input and shape wrong data with no error. The dependency check is what prevents this; it is not optional.

**Exercise — `ReactCoding` (target-match or tests), or `Dropdowns`.** Best fit given the constraint that the sandbox is React-only and can't run a real DB/Sentry: a **`Dropdowns`** fill-in over a fragment, or a small **`ScriptCoding`** exercise that models the reads as timed async functions (e.g. `delay(80).then(...)`) and asserts total elapsed time drops from ~320 to ~240 when the student rewrites two sequential awaits into a `Promise.all`. `ScriptCoding` (vanilla TS runner, supports async + fake timers) is the strongest: the student literally turns two `await`s into `Promise.all` and a jest-style assertion checks the parallelized timing. Goal: practice the exact rewrite muscle. Grading: total time assertion + structural (both reads still awaited). Note for downstream agent: keep the dependent read (`org`) sequential in the starter so the student must distinguish it from the independent pair — this checks the *dependency* judgment, not just mechanical `Promise.all` use.

Reasoning: this is the highest-frequency real fix and the most direct payoff from prior learning; it earns the most concrete practice. The two inline watch-outs are the two ways juniors get `Promise.all` wrong in production (losing results; parallelizing a real dependency).

### When the waterfall hides in the component tree

**Goal:** the harder, less obvious case — sequential awaits caused by *render order*, not by a data dependency in one function. This is where most real RSC waterfalls live.

Content:
- The mechanism: a parent component `await`s its own read and renders; a child component `await`s *its own* read. Even with no data dependency between parent and child, the child's fetch *cannot start until the parent has rendered* — rendering is sequential, so the awaits serialize. This is the subtle one: the code looks clean and co-located, yet it waterfalls.

**Diagram 3 — parent-child render order (RequestTrace).** Use the project's `RequestTrace` component (`phases="server-render,shell,stream"` or `"request,server-render"`). Declare a small tree: `DashboardPage` (server, `await="db: org"`) with a child `InvoiceList` (server, `await="db: invoices"`). The component's phase engine visualizes the server-render phase where the child's await can't begin until the parent's resolves — exactly the render-order serialization. This is the canonical use of `RequestTrace` (it models the App Router render pipeline; the await-without-Suspense warning state even reinforces the streaming point in the next section). Pedagogical goal: show that the waterfall is structural to naive nesting, not a code typo.

The three reaches, taught as escalating options:
- **Reach 1 — hoist the fetch to the parent, pass data down.** The parent fires both reads (with `Promise.all` if independent) and passes results as props. Fixes the timing; cost: the parent now knows about data the child consumes, and deep trees turn into prop-drilling.
- **Reach 2 — React `cache()` (the modern senior default).** Wrap the read function in `cache()`. The parent can *kick off* the read without awaiting (`getInvoices(orgId)` — start the promise) so it's in flight, while the child still calls `await getInvoices(orgId)` and gets the *same* in-flight promise. Result: parallel timing **with** co-location preserved — no prop-drilling, child stays self-contained. State the load-bearing stack fact here: **`fetch()` GET auto-dedupes per render pass, but Drizzle/`db.select()` does not** — so in this app (Drizzle reads) you must wrap the query in `cache()` yourself to get dedup and the kick-off pattern. `cache()` mechanics are owned by ch036/ch072 — name and *use* the pattern, don't re-derive it.
- **Reach 3 — sibling Suspense boundaries.** Split the children so each fetches under its own `<Suspense>`; siblings under separate boundaries fetch in parallel and stream independently. Bridges into the next section.

**`CodeVariants` or `AnnotatedCode` for the `cache()` pattern.** Show the wrap + kick-off-without-await-in-parent / await-in-child shape. `AnnotatedCode` fits well: step 1 highlights `const getInvoices = cache(async (orgId) => db.query...)`; step 2 highlights the parent line that *starts* the promise without `await`; step 3 highlights the child's `await getInvoices(orgId)` reusing it. Keep to a fragment; annotate that the parent's un-awaited call is intentional (it warms the cache), and that this only dedupes because Drizzle isn't auto-memoized. Use `cache` color for the `cache()` step. Note for downstream: this un-awaited-call shape is non-obvious — the annotation must make clear it's deliberate and not a floating-promise bug.

- **Watch-out, inline:** prop-drilling the hoist deeply is its own smell; that's exactly when `cache()` at module level beats hoisting.

Reasoning: this is the section that separates a student who memorized "use `Promise.all`" from one who understands *why* RSC trees waterfall. The `cache()` reach is the senior synthesis the framing promised (co-location + dedup + parallelism) and corrects the outline's `unstable_cache` error. `RequestTrace` is purpose-built for exactly this render-order misconception.

Tooltips: `render order` (Term — the server renders parent before child, so a child's await can't start until the parent's resolves).

### When partial paint beats waiting: Suspense streaming

**Goal:** the third fix shape and its decision boundary — for the slow+fast mix where blocking on the slow read is the real cost.

Content:
- The scenario: one read is genuinely slow (an analytics aggregation, ~800ms) and another is fast (user profile, ~50ms). Even parallelized, `await Promise.all` makes the whole render wait ~800ms before *anything* paints. If partial paint is acceptable, that's wasteful.
- The fix: wrap the slow region in `<Suspense fallback={...}>`; the fast content paints immediately and the slow content streams in when ready. Crucial framing: **`<Suspense>` is not a speed-up — the slow fetch is still slow.** It changes *when the user sees something*, not *how long the fetch takes*. Reserve the depth for Unit 4 (ch031); here, name the pattern and the decision.
- The decision rule, stated cleanly (the keystone of the section): **parallel-await when all data must be present before paint** (a transactional page — an invoice you're about to act on); **Suspense streaming when partial paint is acceptable** (a dashboard of independent widgets). Both still require reading the dependency graph first.

**Diagram (reuse Diagram 1's bar vocabulary, or a small `TabbedContent`).** Two panels: "Block on all (Promise.all)" — fast + slow bars parallel, but a "first paint" line at the end of the slow bar; vs. "Stream the slow one" — fast bar paints at ~50ms (first-paint line early), slow bar streams in later with a skeleton placeholder shown until then. Pedagogical goal: visualize that streaming moves *first paint* left without moving the slow bar. Optional given budget; if cut, a concise prose contrast suffices — flag as nice-to-have, not load-bearing.

- **Watch-out, inline:** trace "Total" is misleading under streaming — the request span can look long while the user saw content early; read first-paint, not total, when streaming.

**Exercise — `MultipleChoice` or `StateMachineWalker` (decision).** A short decision drill: given a scenario (transactional invoice page / dashboard widgets / two independent equal-speed reads), pick the right shape (`Promise.all` / Suspense streaming / `Promise.all`). `StateMachineWalker` in decision mode is ideal — it walks "do all reads block paint? → is one much slower? →" to a recommendation. Goal: cement the decision boundary, not the syntax. Grading: arrives at the correct shape per scenario.

Reasoning: students conflate "parallel" with "fast" and reach for `Promise.all` even when streaming is the better UX lever. The explicit decision rule + drill prevents that. Keeping Suspense *mechanics* out (forward to Unit 4) holds the lesson's scope.

Tooltips: `streaming` (Term — sending parts of the page HTML as they become ready instead of waiting for the whole render).

### Caching removes the duplicate; parallelism removes the wait

**Goal:** distinguish the two orthogonal levers so the student doesn't conflate them, and close the loop on the chapter's vigilance theme.

Content:
- The two distinct problems and their distinct fixes: **serialization** (independent reads run one-after-another) → fixed by parallel awaits / streaming; **duplication** (the *same* read — `user`, `org` — happens many times across one render or across pages) → fixed by caching. They stack: a page can be both over-serialized and over-duplicated.
- Two caching tools, named and scoped (one sentence each, both forward-referenced — do not teach mechanics):
  - **React `cache()`** — request-scoped memoization: the same read called N times in one render runs once. (Already used above for the kick-off pattern.) Owned by ch036/ch072.
  - **`'use cache'` directive** — cross-request persistence: the result survives between requests. Owned by ch032. Explicitly correct the common confusion: `cache()` ≠ `'use cache'`; one is per-render, one is cross-request. (This is where the outline's `unstable_cache` reference is retired — name `'use cache'` as the current cross-request tool.)
- The N+1 cousin, tied off: this lesson's RSC waterfall is the same *shape* as ch039 L2's DB N+1, one layer up. A list renders, each row-child awaits its own read, the DB sees N serial queries. Same fix family: hoist + batch (one query with `inArray`/a join) + pass down. ch039 L7 owns the SQL side; this owns the component side. One or two sentences — the connection, not a re-teach.
- **Connection-pool watch-out, inline:** a `Promise.all` fan-out over many reads can saturate a small DB connection pool — the fix for serialization can create a new bottleneck. Name it (depth is ch094 L7's `pMap`/pool-sizing territory) so the student doesn't trade one failure for another silently.

Closing: the recurring-vigilance beat that threads the chapter — *read one slow trace a week; find the diagonal staircase; run the dependency check.* One line, ties to the chapter's "vigilance is recurring" thread.

Reasoning: the framing warned against "co-location is the React way" as license to skip the rewrite — the synthesis here (parallel + cache, two different levers) is the corrective. Separating the two caching tools prevents the single most common conceptual error in this area and fixes the outline's stale-API problem cleanly.

### External resources (optional)

`ExternalResource` cards: Next.js docs on data fetching / avoiding waterfalls; React `cache()` reference; optionally one high-quality blog on RSC waterfalls (e.g. the Aurora Scharff `cache()` waterfall piece). Keep to 2-3, official-first.

## Scope

**Prerequisites (redefine concisely, do not re-teach):**
- `Promise.all` and the parallel-by-default / sequential-by-dependency rule + the `const [a, b] = await Promise.all([...])` tuple shape — ch007 L3. Assume fluent; this lesson *applies* it in RSC. `Promise.allSettled` (ch007 L2) named at the partial-failure watch-out only.
- Server Components can `await` data directly in their body — Unit 4. Assume known; one-line reminder at most.
- Sentry traces and spans exist and are wired (`tracesSampleRate`, span instrumentation) — ch092. Assume live; back-reference, never re-install.
- N+1 at the Drizzle layer — ch039 L2. Named as the cousin; not re-taught.

**Explicitly out of scope (defer, do not teach):**
- **React `cache()` internals / API depth** — ch036 and ch072. This lesson *uses* the pattern (wrap-and-kick-off) and states the per-render-dedup behavior; it does not derive the API surface, cache key rules, or lifecycle.
- **`'use cache'` directive mechanics, `cacheLife`, `cacheTag`** — ch032. Named only to contrast request-scope vs cross-request.
- **Suspense mechanics / boundary semantics / fallbacks at depth** — Unit 4 (ch031). This lesson names streaming as a fix shape and the decision rule; it does not teach how Suspense works.
- **N+1 at the SQL layer, Drizzle relations, joins, `inArray` batching, connection-pool sizing, `pMap`** — ch094 L7 (and ch038/ch039). Named as the cousin and the pool watch-out; the SQL-side fixes belong to L7.
- **Sentry install / instrumentation wiring** — ch092.
- **Server Actions** — Unit 6. (Reads here are RSC body awaits, not actions.)
- **`AbortSignal` / cancellation of parallel reads** — ch007 L4. Not relevant to the latency fix; omit.
- **Bundle/LCP/Lighthouse/DB-index** waterfalls — other ch094 lessons (L2/L4/L5/L7). This lesson is strictly the *server-side data-fetch serialization* slice (the TTFB→LCP upstream cause, per the chapter map).

**Code-shape note for downstream agents (deliberate divergences from conventions, for pedagogy):**
- All code is **fragments**, not complete files — no imports block, no full component shell beyond what frames the await pattern. This follows the chapter's established code-light pattern (L1–L5 continuity notes) and §4 display rules. Helper names still follow conventions (`getOrg`, `getInvoices(orgId)`, `requireOrgUser()`, `db.query.*`).
- The un-awaited `cache()` kick-off call in the parent is intentional and must be annotated as such (it would otherwise read as a floating-promise lint error). Note it for the reviewer so it isn't "fixed."
- Use `db/queries/`-style read helpers (ch039/conventions `db/queries/` home) rather than inline `db.select()` in component bodies, to match how the app actually reads.
