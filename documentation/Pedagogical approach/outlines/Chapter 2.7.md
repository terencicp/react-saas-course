# Chapter 2.7 — Pedagogy

## Concept 1 — The three-part runtime and the tick recipe

**Why it's hard.** Students arrive with a vague "JavaScript is single-threaded and async" mental model that has no slots for *where* a pending callback lives or *who decides* what runs next. Without a structural picture of the call stack, microtask queue, and macrotask queue and an explicit drain rule, every later prediction is a guess.

**Ideal teaching artifact.** A tick-stepper widget — four panels (call stack, microtask queue, macrotask queue, output log) that the student advances with a "Next tick" button. The widget loads a small pre-written program (the canonical `'sync 1' / setTimeout / queueMicrotask / async fn / 'sync 3'` snippet from the outline) and on each click pushes/pops items across the panels while the log accumulates. The student watches the microtask queue drain *completely* between two macrotask ticks; the drain rule becomes a thing they saw happen, not a sentence they memorized. Concept archetype with an interactive widget at the center, because the model has three moving parts whose relationship is the lesson.

**Engagement.** A `PredictOutput` round with three short programs (a `Promise.resolve().then` vs `setTimeout(..., 0)`, a `queueMicrotask` chained inside an `await`, a nested-microtask drain) that the student must trace to the right log order before the widget reveals the stepped trace.

**Components.**
- New: `EventLoopStepper` — props: `program` (array of step descriptors: which queue to push to, which to pop, what to log). Renders the four-panel state and a "Next tick" / "Reset" control. Used here and at multiple downstream sites.
- Existing: `PredictOutput` for the prediction round; `Code` for the canonical snippet block.
- Alternative if `EventLoopStepper` slips: `DiagramSequence` with hand-authored SVG frames in `Figure` showing each tick's queue state. Loses the "I drove it" effect but carries the rule.

## Concept 2 — `await` as microtask-paced suspension

**Why it's hard.** The student's mental model of `await` is "this line blocks until the Promise resolves" — true in feel, wrong in mechanism. The misconception bites the moment a pre-resolved Promise's continuation runs *after* a synchronous `console.log` further down the script: the student expected `await Promise.resolve()` to skip the queue, and the output order says otherwise. Three consequences (code before first `await` is sync, code after each `await` is a microtask, an `async` function with no `await` still returns a Promise) must each be felt.

**Ideal teaching artifact.** A misconception-first ambush. Present the four-line `'a'/'b'/'c'/'d'` program from the outline and refuse to answer it. Ask the student to predict the order. Then load the same program into the tick-stepper widget from Concept 1 and walk it — the student sees their wrong prediction collide with the queue trace. Follow with three labeled paired snippets, one per consequence, where the *only* change between paired versions is whether the body has reached its first `await` yet, whether a pre-resolved Promise's `.then` was already enqueued, and whether an `async` function with no `await` still returns a Promise. Concept archetype, leaning on the prediction-collision moment.

**Engagement.** A `TrueFalse` round of six statements covering the three consequences — phrased as "the line after `await fetch(...)` runs synchronously after the response arrives" (false: microtask), "an `async` function with no `await` returns its value directly" (false: still a Promise), etc.

**Components.**
- Existing: `Code` for the four-line program; `EventLoopStepper` (from Concept 1) reused with a different program; `CodeVariants` for the three paired-consequence snippets; `TrueFalse` for the recall round.

## Concept 3 — Promise three-state permanence

**Why it's hard.** The combinators only behave predictably because settled Promises don't un-settle. Students who skip the state machine reach for `Promise.all` and are surprised when "the resolved one rejected later" doesn't happen, or write code that re-resolves a Promise to update a value and silently does nothing. Three states and two one-way transitions are the load-bearing claim; without it, the combinator differences in Concept 4 are unmotivated.

**Ideal teaching artifact.** A small state diagram (three nodes, two arrows, both pointing out of `pending`) inside a `Figure`, with one prose paragraph that names permanence as the property the four combinators rely on. Concept archetype, no animation needed — the geometry carries the rule.

**Engagement.** Three quick `MultipleChoice` items: "What happens when you call `resolve(2)` on a Promise already resolved with `1`?" (no-op), "Can a Promise transition from fulfilled to rejected?" (no), "Why does `Promise.all` know it can stop waiting on the first rejection?" (because settled state is permanent).

**Components.**
- Existing: `Figure` wrapping a hand-authored SVG of the three-state diagram; `MultipleChoice`.

## Concept 4 — The combinator decision: what counts as "done"

**Why it's hard.** Most students reach for `Promise.all` reflexively. The four combinators model four different "done" contracts, and the wrong pick produces the wrong failure mode silently: a `Promise.all` over critical+optional reads loses every optional result on one rejection; an `allSettled` consumer that forgets to inspect `status` treats failure entries as values; an `any` masks slow-but-correct rejections behind a fast-but-wrong response. The lesson must install the decision question, not the four signatures.

**Ideal teaching artifact.** A controllable comparison demo paired with a decision matrix. The matrix (combinator / resolves when / rejects when / canonical trigger) anchors the structural differences. Adjacent to it, a small interactive panel where the student picks each input's outcome (resolve fast / resolve slow / reject) for three Promises and watches what `all`, `allSettled`, `any`, and `race` each return. The student toggles "the invoices read rejects" and watches `all` reject, `allSettled` give them three result objects, `any` ignore it, `race` settle on whichever was first. Decision archetype with a small explorable that makes the contracts concrete.

**Engagement.** A `Matching` exercise pairing six scenarios (the six in the chapter outline — "render what you can when some reads fail," "fastest of two replica reads," "three resources where any failure fails the page," "wait for user to click one of three buttons," "cleanup after any settlement," "two analytics endpoints — succeed if either works") to the right combinator or `Promise.withResolvers()`.

**Components.**
- Existing: `Figure` wrapping a hand-authored HTML comparison matrix for the four-way cut; `Matching` for the recall round.
- New: `CombinatorPlayground` — props: three input Promises with toggleable outcomes (resolve-fast / resolve-slow / reject) and a result panel showing what each of the four combinators would return given the current inputs. Forward-links to 5.3 (page streaming where `allSettled` lands per-slot), 6.4.2 (parallel reads), 23.2 (multi-provider AI calls with `any`).
- Alternative if `CombinatorPlayground` slips: `TabbedContent` with four pre-baked tabs, one per combinator, showing the same three-read example with the same one rejection and the four different outcomes. Loses the "I toggled it" feel but preserves the four-way contrast.

## Concept 5 — `Promise.withResolvers()` for resolvers outside the executor

**Why it's hard.** The legacy `let resolve; const p = new Promise((r) => { resolve = r; })` shape works but is fragile and trips type inference. The senior reach in 2026 is one standard call; the student needs to recognize the *trigger* (event-driven flows, externally-resolvable Promises) more than the syntax. Pattern archetype with a wrong-then-right beat.

**Ideal teaching artifact.** Two adjacent code blocks via `CodeVariants` — the legacy `let resolve` shape and the modern `const { promise, resolve, reject } = Promise.withResolvers()` shape — wrapping the same event-handler-to-Promise example (a `socket.once('message', resolve)` or a three-button dialog). The student reads the trigger in the second tab's prose: "the resolvers are values in scope; no executor lambda."

**Engagement.** A `ScriptCoding` refactor: the student is handed a function that wraps a `setTimeout`-driven event in the legacy `new Promise((resolve) => …)` shape and rewrites it to `Promise.withResolvers()`. Tests verify the function still resolves when the event fires.

**Components.**
- Existing: `CodeVariants` for the legacy-vs-modern comparison; `ScriptCoding` for the refactor exercise.

## Concept 6 — The dependency-check reflex: parallel by default

**Why it's hard.** Three sequential `await`s read naturally; the student writes them. The senior reflex on reading them is to scan each line for *"does this `await` need the previous one's value?"* and rewrite to `Promise.all` when the answer is no. The cost of missing it is `sum-of-latencies` instead of `max-of-latencies` — invisible in dev, paying real wall-clock in production. The rewrite shape (`const [a, b, c] = await Promise.all([...])`) and the dependency question must arrive as one reflex.

**Ideal teaching artifact.** A before/after timing visual. Show the three-sequential-awaits snippet and, beside it, a small gantt-style bar diagram in a `Figure`: three bars stacked end-to-end summing to `t1+t2+t3`. Then the rewritten `Promise.all` snippet beside the parallel bars overlapping to `max(t1, t2, t3)`. The student *sees* the saved time. Follow with the dependency question stated plainly and three short snippets (two pairs of independent awaits the student can collapse, one pair where the second needs the first's value — keep sequential). Pattern archetype where the visual carries the cost.

**Engagement.** A `ScriptCoding` exercise: the student is given a function that sequentially awaits four independent reads and rewrites it to `Promise.all`. The grader uses `performance.now()` to verify the total elapsed time is closer to `max` than `sum`.

**Components.**
- Existing: `Figure` wrapping a hand-authored SVG gantt of the two timing profiles; `CodeVariants` for the sequential vs. `Promise.all` pair; `ScriptCoding` for the rewrite.

## Concept 7 — The N+1 trap and its three fixes

**Why it's hard.** `items.map(async (i) => fetchOne(i.id))` looks like the parallel-by-default rule applied correctly. It's wrong for two reasons that point in opposite directions: unbounded fan-out swamps the downstream service or the connection pool; and if the work is N database reads, the right answer isn't "fan out smarter" but "ask for the batch." The three fixes (bounded `Promise.all`, `pMap` with concurrency cap, single batched query) live on different axes — list size, throughput trade, and round-trip count — and the student must pick by trigger, not by syntax similarity.

**Ideal teaching artifact.** A production-incident narrative as the lesson's center of gravity. Open with a `.map(async ...)` snippet that fans out 500 fetches; show a `Figure` of the concurrency curve (500 simultaneous requests spiking, the rate-limit 429s landing). Walk the three fixes as three adjacent code blocks via `CodeVariants` — each with its own concurrency-curve thumbnail (bounded `Promise.all` for tiny lists, the smooth concurrency-8 plateau of `pMap`, the single round trip of the batched query). The student reads the trigger for each in adjacent prose. Pattern archetype, wrong-then-three-rights.

**Engagement.** A `Buckets` exercise: six scenarios ("process 500 items through a rate-limited API," "fetch 5 user records from the database," "read three independent resources for one page," "iterate a paginated SDK response," "stream a response body," "kick off an analytics ping without waiting") into the right shape (`Promise.all`, `pMap`, single batched query, `for await...of`, fire-and-forget with `.catch`).

**Components.**
- Existing: `Code` for the broken `.map(async ...)` snippet; `CodeVariants` for the three fixes; `Buckets` for the scenario sort.
- New: `ConcurrencyCurve` — props: an array of `{ start, end }` request windows, renders a small horizontal-bar chart showing concurrent in-flight count over time. One canvas-or-SVG widget reused four times in this lesson (broken case, bounded all, pMap with cap, single-batch). Forward-links to 6.4.2 (N+1 deep dive), 13.1 (background work concurrency), 15.4 (rate limit visualization), 20.3.6 (RSC waterfalls).
- Alternative if `ConcurrencyCurve` slips: hand-authored SVG inside `Figure` for each of the four concurrency profiles. Loses the visual-family consistency but ships.

## Concept 8 — `for await...of` and `return await`: the two iteration disciplines

**Why it's hard.** Two unrelated disciplines that share an evening. `for await...of` is the right shape for *sequential* consumption — streams, paginated SDKs — and the wrong shape for independent parallel work; students who know `Promise.all` reach for it when they should be iterating, and vice versa. `return await` looks redundant ("the caller will await it anyway") until the student writes a `try`/`catch` around a `return getX()` and watches the rejection escape uncaught.

**Ideal teaching artifact.** Two short paired-snippet beats. For `for await...of`, a streaming-response example where chunks arrive over time — show the snippet and a small timeline `Figure` of chunks landing one per tick, the loop body running between them. For `return await`, the canonical `try`/`catch` failure: the wrong version where the catch never fires because the rejection happened after the function returned, paired with the `return await` fix where the function's stack frame is still alive. The stack trace difference is named in adjacent prose with a screenshot-style trace block showing the missing frame. Pattern archetype.

**Engagement.** A two-part follow-up. (1) A `MultipleChoice` item: "Why does `for await...of` defeat the purpose of parallelism for 500 independent items?" (it's sequential, each iteration waits for the previous). (2) A `Tokens` exercise on a `try`/`catch`/`return getX()` snippet: the student clicks the missing `await` to fix the swallowed rejection.

**Components.**
- Existing: `Code` for the streaming-response snippet; `Figure` wrapping a hand-authored SVG of the chunk-arrival timeline; `CodeVariants` for the `return getX()` vs `return await getX()` pair; `MultipleChoice`; `Tokens`.

## Concept 9 — The `{ signal }` shape and the controller/signal split

**Why it's hard.** `AbortController` and `AbortSignal` look like two names for the same thing until the student is told *why* they're split: producer vs. consumer, read-only view, no one can cancel someone else's work. The 2026 reflex — "if an async function does I/O, it accepts and threads a `signal`" — is the durable takeaway, not the constructor mechanics. Students arrive expecting cancellation to be a Promise feature; the lesson must move the unit of cancellation to *the work*, not the Promise.

**Ideal teaching artifact.** An `ArrowDiagram` inside a `Figure` showing one `AbortController` on the left, a `signal` arrow threading right through three consumers — a `fetch`, an `addEventListener`, an `AbortSignal.any(...)` composition that fans into a child function. Below it, a single labeled code block of the canonical `searchSuggestions(query, signal)` function shape with the `signal` parameter in the signature and threaded into the `fetch`. The prose names the propagation discipline: "the `signal` parameter is part of the signature, not an afterthought." Pattern archetype with the diagram carrying the *shape* and the snippet carrying the *call site*.

**Engagement.** A `ScriptCoding` exercise: the student is given a function that does a `fetch` with no `signal` and refactors it to accept `signal`, thread it through, and document the signature. The grader verifies the call site passes the signal and that an aborted call rejects with `AbortError`.

**Components.**
- Existing: `Figure` + `ArrowDiagram` for the controller/signal/consumers picture; `Code` for the canonical function shape; `ScriptCoding` for the refactor.

## Concept 10 — `AbortError` discrimination and the `timeout`/`any` composition

**Why it's hard.** The catch sees the abort and a real failure as the same thing unless the student installs the `error.name === 'AbortError'` branch — at which point every aborted call quietly returns instead of logging "search failed" on each keystroke. The `name`-based check (not `instanceof DOMException`) is the cross-realm portable form. Composition is the second beat: in the SaaS shape, one operation is canceled by *any of* user-cancel, timeout, or shutdown, and `AbortSignal.any([userSignal, AbortSignal.timeout(ms), shutdownSignal])` is the one-liner that composes them.

**Ideal teaching artifact.** A wrong-by-default sandbox. A small search-suggestions playground where the student types into an input and watches a request log: in the initial "broken" state, every keystroke fires a `fetch` and the log shows stale responses clobbering the latest. The student adds the `AbortController` (the lesson provides the call-site code; the change is two lines) and watches the log clean up — only the latest query's response lands. Then a second toggle: enable `AbortSignal.timeout(2000)` and watch slow responses abort cleanly with `AbortError`. The artifact carries the assessment because the student must make the change for the log to clean up. Pattern archetype with a wrong-by-default repair.

**Engagement.** Confirm recall after the sandbox with a `Matching` round: five scenarios ("user typed a new search query," "request taking longer than 30 seconds should fail," "server shutting down — drain in-flight work," "one-shot event listener that auto-removes on cancel," "compose user-cancel and timeout into one signal") matched to the right move (`AbortController.abort()`, `AbortSignal.timeout(ms)`, a shutdown signal threaded in, `addEventListener('click', fn, { signal })`, `AbortSignal.any([...])`).

**Components.**
- Existing: `Matching` for the recall round; `CodeVariants` for the with/without-`AbortError`-discrimination catch pair.
- New: `SearchRaceLab` — props: a mock `fetch` with configurable latency jitter, a stale-response toggle, and a code-edit pane scoped to two or three lines where the student adds the controller and the timeout. Renders the input, the request log, and the rendered "suggestions." Forward-links to 3.6 (`fetch` with `AbortSignal.timeout`), 4.9.2 (effect cleanup with abort), 5.3 (Suspense + cancel), 7.2 (Server Actions threading signals), 23.2 (AI stream cancellation).
- Alternative if `SearchRaceLab` slips: a `SandboxCallout` containing a pre-wired StackBlitz/CodeSandbox with the same setup. Heavier load on the student, lighter authoring lift.

---

## Component proposals

### `EventLoopStepper`
- **Sketch.** Four-panel widget (call stack, microtask queue, macrotask queue, output log). Props: a `program` array of step descriptors describing pushes, pops, and log entries per tick. Controls: "Next tick," "Reset," optional "Auto-play."
- **Uses in this chapter.** Concepts 1 and 2.
- **Forward-links.** Strong. 4.9.2 (effect timing under Strict Mode's double-invoke), 5.3 (Suspense + streaming order), 7.2 (Server Action queuing), 23.2 (AI stream microtask interleaving). Also useful as a debugging aid the student can refer back to whenever an async snippet's order is surprising.
- **Leanest v1.** A non-animated `DiagramSequence` with hand-authored SVG frames in `Figure`, one frame per tick of the canonical program. Loses interactivity; preserves the queue-by-queue trace. Build the interactive version if the team has the budget — the cause-and-effect feel is what makes the model stick.

### `CombinatorPlayground`
- **Sketch.** Three input Promises with toggleable outcomes (resolve-fast / resolve-slow / reject), four result panels (one per combinator) updating live as the toggles change. Compact, no animation.
- **Uses in this chapter.** Concept 4.
- **Forward-links.** Moderate. 5.3 (per-slot `allSettled` for streaming pages), 6.4.2 (parallel database reads), 16.x (TanStack Query parallel queries), 23.2 (multi-provider AI calls with `any`). Useful, but each downstream site can also stand on its own snippets.
- **Leanest v1.** `TabbedContent` with four pre-baked tabs, one per combinator, all sharing the same three-read example with the same one rejection. Loses the "I toggled it" feel but preserves the four-way contrast. Build the interactive version only if the playground earns its keep across the forward-links.

### `ConcurrencyCurve`
- **Sketch.** A small horizontal-bar / stacked-line chart of concurrent in-flight count over time. Props: an array of `{ start, end }` request windows; optional `cap` annotation. SVG, static (no animation needed — the shape is the lesson).
- **Uses in this chapter.** Concept 7 (four times: broken `.map(async ...)`, bounded `Promise.all`, `pMap` cap, single batch).
- **Forward-links.** Strong. 6.4.2 (N+1 deep dive), 13.1 (background-job concurrency caps), 15.4 (rate-limit visualization), 20.3.6 (RSC waterfall vs. parallel reads). The visual family compounds.
- **Leanest v1.** Hand-authored SVG inside `Figure`, one per profile, with the bar shapes drawn by hand. Loses the props-driven generation but ships immediately. Promote to a real component when the forward-links land.

### `SearchRaceLab`
- **Sketch.** A debounced-search playground with a mock `fetch` (configurable latency jitter and stale-response toggle), a code-edit pane scoped to two or three lines where the student adds the controller and timeout, and a live request log + rendered suggestions panel. Wrong-by-default; the student's two-line edit fixes the race.
- **Uses in this chapter.** Concept 10.
- **Forward-links.** Strong. 3.6 (`fetch` + `AbortSignal.timeout`), 4.9.2 (effect-cleanup abort pattern), 5.3 (request cancellation at navigation), 7.2 (Server Actions threading signals), 23.2 (AI stream cancellation). The search-race scenario is the canonical mental model the whole curriculum returns to.
- **Leanest v1.** A `SandboxCallout` with a pre-wired StackBlitz scaffold of the same setup. Loses inline integration with the lesson flow and pushes the failure-mode reveal off-page, but ships without authoring a bespoke component. Build the bespoke version when the forward-link sites start needing the same scenario.

---

## Build priority

Two components carry the most teaching load across the chapter and forward into the curriculum:

1. **`EventLoopStepper`** — the substrate Concept 1 installs is the substrate every later async lesson rides on. The widget's reuse value is highest. Build first; an interactive version compounds across the curriculum more than any other proposal here.
2. **`SearchRaceLab`** — the cancellation reflex is the chapter's most senior takeaway, and the search-race scenario is referenced explicitly in 3.6, 4.9.2, 5.3, 7.2, and 23.2. Wrong-by-default sandboxes are also rare in the existing toolkit, so this one fills a gap.

`ConcurrencyCurve` is third-priority — strong forward-links, but a hand-authored SVG in `Figure` is a credible leanest v1 that ships the lesson without blocking the build. `CombinatorPlayground` is the lowest-priority proposal: the decision matrix plus a `TabbedContent` v1 already teaches the four-way cut effectively; promote it only if 5.3 or 23.2 land on the same playground shape.

---

## Open pedagogical questions

- Concept 7's "production incident" framing depends on whether the student has seen enough production context by this point in Unit 2 for the rate-limit narrative to land. If not, lean harder on the concurrency-curve visual and lighter on the incident framing.
- Concept 10's `SearchRaceLab` overlaps with 4.9.2's effect-cleanup teaching. Worth deciding whether the lab lives in 2.7.4 with a *function-shape* framing and 4.9.2 reuses it with a *React-wiring* framing, or whether 2.7.4 uses a thinner version and 4.9.2 owns the full sandbox.
