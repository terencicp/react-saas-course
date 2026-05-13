# Chapter 2.7 — Async semantics

## Chapter framing

Chapter 2.6 closed on top-level await as a graph-level shape; the underlying mechanic — what a Promise actually is, when the runtime gets around to running a `.then` callback, what `await` *does* to the function it sits in — has been a black box since the student first wrote `await fetch(...)`. This chapter opens that box. By the end the student knows the runtime model under every async API on the stack, writes the Promise and `async`/`await` surface by reflex, picks sequential vs. parallel composition for the right reason, and reaches for `AbortController` as the cancellation primitive every modern web API speaks.

The senior framing for the chapter: **async work is structured concurrency, and the structure is what a senior controls.** The novice writes `await x; await y; await z;` because that's what fits in their head. The senior asks: do `x`, `y`, and `z` depend on each other? If not, the sequential form pays three RTTs for one logical step. The novice puts `.map(async (item) => fetch(item))` in a loop and ships the N+1 trap; the senior knows the form is `Promise.all(items.map(async (item) => fetch(item)))` (or `pMap` when the list is unbounded). The novice writes `setTimeout(reject, 5000)` and forgets to clear it; the senior writes `AbortSignal.timeout(5000)` and the runtime handles the timer. The lessons foreground the decisions before the syntax: which composition shape, which cancellation primitive, which iteration form, and *why* on every one.

Threads that must run through every lesson:

- **The 2026 surface is the lesson, not the historical arc.** Callbacks, `util.promisify`, the deferred-pattern boilerplate, `bluebird`, `async.js` — all dismissed in one line where the contrast clarifies the modern form. The student writes `Promise.withResolvers()` (Node 22+, every modern browser), `Promise.all` and friends, `async`/`await` uniformly, `AbortSignal.timeout` and `AbortSignal.any`, and `for await...of` on async iterables. The course doesn't teach the legacy callback shape; it teaches the form a senior actually writes.
- **The microtask queue is the runtime model under every later async surface in the course.** Server Actions resolving on the server, React's `startTransition` deferring an update, `useEffect` cleanups firing between renders, the Drizzle `await db.query(...)` suspending a request handler — all of it lands on the event-loop and microtask-queue model 2.7.1 installs. Every later lesson references "the microtask queue" as a concrete object the student can reason about.
- **Decision before syntax on composition.** Sequential `await` is the default *only when each step depends on the previous one's output*. The senior reflex: write the parallel form first (`Promise.all` over independent operations) and fall back to sequential when the dependency is real. The N+1 trap inside `.map()` is named at the call site every lesson that touches a list of awaits.
- **Failure modes are part of the contract.** `Promise.all` rejects on first failure and abandons the rest (no aggregated error, no partial results). `Promise.allSettled` returns every outcome (use when you want to act on each, succeed or fail). `Promise.any` resolves on first success (rare, but right for redundant providers). `Promise.race` resolves on first settle, success or failure (the timeout idiom — and the place `AbortSignal.timeout` superseded it). Each lesson states the failure mode plainly, no hedging.
- **`AbortSignal` is the universal cancellation parameter shape.** Every modern web API on the stack takes `{ signal }` — `fetch`, `addEventListener`, `Drizzle` (some paths), `crypto.subtle` operations with the right primitive, the streams API. The student writes the parameter shape by reflex once 2.7.4 lands and recognizes the same shape on every API for the rest of the course.
- **Naming for intent stays operating.** A Promise that wraps a domain operation is named for the operation (`const invoice = await fetchInvoice(id)`, not `const result = await fetchInvoice(id)`). An `AbortController` is named for what it cancels (`const uploadController = new AbortController()`, not `const controller = ...`). A `for await` loop's variable is named for the item kind (`for await (const chunk of response.body)`, not `for await (const item of stream)`). The 2.2.3 reflex runs through every snippet.
- **Senior anchors for later units are seeded here.** `AbortController` lands again in Unit 3.6 (Fetch and cancellation), Unit 4.9 (`useEffect` cleanup that aborts in-flight fetches), Unit 7.5 (route handlers honoring `request.signal`). The N+1 trap from `.map()` lands again in Unit 6.3 (Drizzle queries inside loops) and Unit 11.1 (URL-state list views). `Promise.withResolvers` lands again in Unit 13.1 (deferred-promise patterns inside Trigger.dev tasks) and Unit 15.3 (rate-limit shared session-shaped data). Every lesson plants the forward reference at the call site where the move earns its weight.

This chapter ships small standalone snippets in `ScriptCoding` and a few small diagrams. The event loop's runtime model uses an interactive `Figure` (a tabbed timeline with the call stack, microtask queue, and macrotask queue panes synced to a small program's execution); the Promise combinator surface uses `TabbedContent` for `all`/`allSettled`/`any`/`race`; the sequential-vs-parallel diff uses `CodeVariants`. The student finishes the chapter able to predict the order in which a small async program logs its output, pick the right Promise combinator for a given failure tolerance, refactor a sequential await loop into a parallel `Promise.all` when independence allows, and instrument any async operation with `AbortSignal.timeout` plus a user-cancel `AbortController` combined through `AbortSignal.any`.

The chapter ordering follows the layering. The event loop and microtask queue come first because every later beat references the runtime model — what suspends, what resumes, what fires before what. Promises come second as the primitive that the microtask queue actually schedules; the combinator surface (`all`, `allSettled`, `any`, `race`) and the modern construction primitive (`withResolvers`) land here. `async`/`await` comes third as the syntactic surface over Promises with its own senior calls (sequential vs. parallel, the N+1 trap, async iteration). `AbortController` comes fourth as the cancellation primitive that's separate from but composes with everything before it. The quiz closes.

---

## Lesson 2.7.1 — The event loop and the microtask queue

Topics to cover:

- The chapter-opening senior question: when a function calls `setTimeout(fn, 0)` and a Promise resolves on the next line, which callback runs first, and why does it matter. The answer is the event loop's queue ordering — microtasks drain before the next macrotask — and the question matters because every reactivity surface the course will touch in later units depends on it. The student leaves with a runtime model they can reason about, not a memorized rule.
- **The runtime as a three-part object**, named concretely:
  - **The call stack.** Synchronous JavaScript executes here. A function call pushes a frame; a return pops one. Nothing async happens while the stack is non-empty.
  - **The microtask queue.** A FIFO queue of callbacks queued by Promise resolutions, `queueMicrotask`, and `MutationObserver`. Drains to completion (every queued microtask runs, including microtasks queued by other microtasks) every time the call stack empties.
  - **The macrotask queue.** A FIFO queue of callbacks queued by `setTimeout`, `setInterval`, `setImmediate` (Node only), I/O completions, and UI events (in the browser). Exactly one macrotask runs per event-loop tick.
- **The tick**, stated as a four-step recipe. Pop one macrotask from the queue and run it to completion on the call stack. Drain the entire microtask queue. (Browser only: render if needed.) Repeat. The student writes the recipe out once and references it through the chapter.
- **The canonical order-of-output exercise** that every senior has seen, in a small worked example:
  ```ts
  console.log('1');
  setTimeout(() => console.log('2'), 0);
  Promise.resolve().then(() => console.log('3'));
  console.log('4');
  ```
  Output: `1`, `4`, `3`, `2`. The student walks the call stack and the queues by hand: line 1 runs synchronously (`1`), `setTimeout` schedules a macrotask (`2`), the `Promise.resolve().then` schedules a microtask (`3`), line 4 runs synchronously (`4`), the stack empties, the microtask queue drains (`3`), the macrotask queue runs one (`2`). The order is no longer a trick question; it's a consequence of the recipe.
- **`queueMicrotask`** as the explicit primitive for scheduling a microtask without creating a Promise. Rare reach in application code but named because the spec uses it (Promise resolution, Mutation Observer scheduling) and because the senior reader recognizes it in library source. The contrast with `setTimeout(fn, 0)` makes the macrotask/microtask split concrete.
- **`await` as syntactic sugar for `.then`**, named here so 2.7.3 doesn't have to re-introduce it. An `await x` in an `async` function suspends the function at that point, schedules the continuation as a microtask attached to `x`'s resolution, and returns a Promise from the outer call to the `async` function. The continuation runs in a *microtask*, not a macrotask — every `await` is microtask-paced. This is why an `await` that resolves immediately still yields to the queue once but lands before any pending `setTimeout`.
- **Node vs. browser**, named in one paragraph. The macrotask queue is split across multiple phases in Node's libuv event loop (timers, pending callbacks, poll, check, close callbacks); microtasks drain between each phase, not only between event-loop ticks. The browser model is the simpler abstraction the lesson teaches; Node's libuv refinement is named so the student isn't surprised when a Node deep-dive elsewhere uses different vocabulary. The course doesn't teach libuv internals — the senior reach is to write the same Promise-and-`await` code on both runtimes and trust the spec to schedule it correctly.
- **`process.nextTick` (Node only)**, named once. Schedules a callback that runs *before* the microtask queue drains — a higher-priority queue Node added before Promises existed in the language. The senior reach in 2026 is *not* to use it in application code; the legacy is internal to Node and to a few older libraries. The student recognizes the name in stack traces and moves on.
- **Why the model matters for the rest of the course**, named with three forward references:
  - **React's reconciliation and effects** (Unit 4.9) schedule work through the microtask queue (`startTransition`'s discontinuous render boundary) and the macrotask queue (`setTimeout`-driven cleanups). Reasoning about an effect that "doesn't fire when I expect" lands on this lesson's model.
  - **Server Actions** (Unit 7.2) run an async function on the server; the function's `await` points are microtask boundaries; the request handler waits for the outer Promise to resolve before responding. The lesson installs the substrate.
  - **Streams and `for await...of`** (2.7.3 and Unit 3.6.2) — every chunk arriving from a stream is a macrotask completion (an I/O event) that resolves a Promise consumed by the loop, which resumes as a microtask. The lesson names the seam.
- **The senior watch-outs**:
  - A long-running synchronous task starves both queues. `while (true) { ... }` in the call stack means no microtask, no macrotask, no fetch response, no UI repaint. The senior reflex: chunk long synchronous work with `await new Promise(r => setTimeout(r, 0))` to yield (rare in 2026 SaaS — the work usually moves to a Web Worker or a server route).
  - A microtask that queues more microtasks can starve the macrotask queue ("microtask flood"). Pathological in well-written code; named because the bug class exists and the student should recognize the symptom (a UI freeze during a Promise chain).
  - `Promise.resolve()` in a tight loop is not free — every `.then` allocates a microtask. The senior reflex: don't synthesize microtasks for no reason; use them when the schedule matters.

What this lesson does not cover:

- The full Promise surface, combinators, or construction (2.7.2).
- `async`/`await` syntax, sequential vs. parallel, the N+1 trap (2.7.3).
- `AbortController`, `AbortSignal`, cancellation primitives (2.7.4).
- Node's libuv phases at depth — the lesson names them once and trusts the spec.
- React's scheduler, transitions, or concurrent rendering (Unit 4.7 and Unit 4.9).
- Web Workers, `MessageChannel`, or off-main-thread work — out of scope for this chapter.
- The `MutationObserver` API or DOM-mutation scheduling (Unit 3.5 owns the DOM surface).

Pedagogical approach:

Concept archetype as the chapter's load-bearing lesson. The lesson teaches a mental model, not a syntactic capability. Open with the senior question — "what does this small program log, and in what order?" — and a `ScriptCoding` block containing the four-line example above. The student runs it and sees `1 4 3 2`. The question is now concrete: why? The lesson answers by installing the runtime model.

A `Figure` with a hand-authored SVG renders the three queues side by side — call stack, microtask queue, macrotask queue — with the small program's execution stepped through five frames (an animated or "step through" interactive widget). The student watches the call stack drain to empty, the microtask queue drain `3`, the macrotask queue release `2`. The picture is the lesson's anchor; every later beat references the diagram.

A `Sequence` exercise asks the student to put the four log lines in execution order for two more variants — one with a nested `Promise.resolve().then(() => Promise.resolve().then(...))` and one with a `setTimeout` inside a `.then`. The decision discipline is "drain microtasks before the next macrotask," and the student applies it twice.

A small `ScriptCoding` block exercises `queueMicrotask` directly: the student writes a `queueMicrotask(() => console.log('mt'))` between a synchronous `console.log` and a `setTimeout`, and observes the same ordering rule fire. The mechanic without the Promise wrapper makes the queue surface tangible.

A `Figure` with a small Mermaid diagram lays out the four-step tick recipe as a flowchart loop (run one macrotask → drain microtasks → (browser: render) → repeat). The student leaves with a one-page picture they can hold in their head.

Close with a `MultipleChoice` exercise: given a 6-line program mixing `console.log`, `setTimeout(0)`, `Promise.resolve().then`, and `queueMicrotask`, pick the correct output order from four options. The wrong answers each correspond to a specific misunderstanding (macrotasks before microtasks; microtasks queue at definition time, not resolution time; nested microtasks defer to the next tick). The discrimination is the deliverable.

Estimated student time: 45 to 60 minutes. Load-bearing for the rest of the chapter and the course.

---

## Lesson 2.7.2 — Promises: the combinator surface and modern construction

Topics to cover:

- The senior question: an async function returns a Promise; what's the full surface a 2026 senior reaches for to *compose* Promises, *handle* their settlement, and *construct* one when wrapping a non-Promise API. The lesson installs the surface as a tight reference, with the senior trigger named on every form.
- **The Promise as a three-state value**, named concretely. *Pending* — the operation is in flight. *Fulfilled* — the operation produced a value. *Rejected* — the operation produced an error. Once a Promise leaves pending it never re-enters; the settlement is one-way. The vocabulary is "settled" for "either fulfilled or rejected." The 2.7.1 microtask-queue model says where the settlement actually lands: on the queue, drained between macrotasks.
- **The instance methods**, with senior trigger per method:
  - **`.then(onFulfilled, onRejected?)`** — the registration form. Two callbacks; the second is the rejection handler (rarely used directly — `.catch` is the senior reach). Returns a new Promise chained to the callback's return value. The senior reflex in 2026 application code is `async`/`await` over `.then` chains; `.then` survives where the consumer needs a Promise-returning expression rather than an `async` function body (a one-line `.then(parse)` after a `fetch`, for instance — rare).
  - **`.catch(onRejected)`** — equivalent to `.then(undefined, onRejected)`. The senior reach when a Promise is consumed at the edge of an `async` boundary and the catch can't go in a `try/catch` (a top-level `mainEntry().catch(logFatal)` in a script entry point).
  - **`.finally(onFinally)`** — runs on either settlement. No value passed in, no return value forwarded; for side effects only (closing a connection, clearing a loading flag in legacy code). The senior reach is rare in modern code — the same effect lives in a `try/finally` inside an `async` function. Named for recognition.
- **The combinators**, the chapter's primary deliverable. Four static methods, four distinct semantics, and the lesson teaches the trigger for each:
  - **`Promise.all(iterable)`** — resolves to an array of fulfilled values when *every* input fulfills, rejects with the *first* rejection. The senior default for "run N independent operations, fail fast, need every result." The canonical site: a Server Action that loads three pieces of data in parallel before rendering.
  - **`Promise.allSettled(iterable)`** — resolves to an array of `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` objects when every input settles. Never rejects. The senior reach when partial failure is acceptable and each outcome is acted on separately. The canonical site: a batch notification dispatcher that sends to N recipients and reports which succeeded.
  - **`Promise.any(iterable)`** — resolves to the *first* fulfilled value, rejects with an `AggregateError` only when *every* input rejects. The senior reach for redundant providers (try CDN A; on failure, CDN B; aggregate failure only when all are down). The form is rare in application code but right when it lands.
  - **`Promise.race(iterable)`** — resolves or rejects with the first settled input. The senior reach historically for the timeout idiom (`Promise.race([fetch(url), timeoutPromise])`) — superseded in 2026 by `AbortSignal.timeout` (full treatment in 2.7.4). Named with the deprecated-by-pattern note so the student recognizes the older form in code and reaches for the newer one.
- **The decision matrix**, stated as one prose paragraph. Independent operations, fail-fast, need every result → `all`. Independent operations, partial-success tolerated → `allSettled`. Independent operations, *one* result wanted → `any`. *Any* settle wanted → `race`. The 2026 senior reach for race-as-timeout is `AbortSignal.timeout`, not `Promise.race`.
- **`Promise.resolve(value)` and `Promise.reject(reason)`** — the lifting primitives. `Promise.resolve(x)` is `x` if `x` is already a Promise, else a fulfilled Promise wrapping `x`. The senior reach is rare in application code (`async` functions handle the lifting implicitly) but lands in test fixtures and in adapters that must always return a Promise.
- **`Promise.withResolvers()`** — the modern construction primitive (Node 22+, every major browser since early 2024; ES2024). Returns `{ promise, resolve, reject }` — a Promise paired with its resolvers as separately-callable functions. The senior reach when the resolution event is *outside* the Promise constructor's executor — an event listener that fires later, a stream end, a `MessageChannel` reply.
  ```ts
  function waitForUploadComplete(uploader: Uploader) {
    const { promise, resolve, reject } = Promise.withResolvers<UploadResult>();
    uploader.on('complete', resolve);
    uploader.on('error', reject);
    return promise;
  }
  ```
  The contrast with the legacy *deferred pattern* — declare `let resolve!: ...; let reject!: ...; const promise = new Promise((res, rej) => { resolve = res; reject = rej; });` — is named in one line. The `withResolvers` form is shorter, scoped, and TypeScript infers the resolver types without the definite-assignment assertion. The student writes `withResolvers` by reflex.
- **`new Promise((resolve, reject) => ...)`** as the underlying constructor, named once. The senior reach for the *rare* case where the executor's synchronous body is the right place to call the resolver (a synchronous one-shot wrapping). Most call sites for "I want a Promise I can resolve later" land on `withResolvers`. The student should be able to read the constructor form but write `withResolvers` first.
- **Unhandled rejections**, named with the runtime contract. A rejected Promise with no `.catch` or `try/catch` along its chain triggers an `unhandledrejection` event (browser) or an `unhandledRejection` process event (Node). Node 16+ defaults to *terminating* the process on unhandled rejection. The senior reach: every Promise that crosses a boundary (a route handler, a Server Action, a background job) has explicit error handling. The full discipline lands in Chapter 2.8; the lesson plants the seed.
- **The watch-outs a senior names**:
  - `Promise.all` over a large array of in-flight fetches without concurrency limits — fan-out is unbounded. The senior reach is a small concurrency-limited helper (`p-map` from the `p-*` family of utilities, or a hand-rolled worker pool). Named here in one paragraph; full treatment in 2.7.3 where the iteration pattern lands.
  - Forgetting that `Promise.all` *abandons* the still-pending operations on first rejection. The other operations don't cancel — they keep running until they settle, but their results are thrown away. If cancellation matters, pair `Promise.all` with an `AbortController` (full treatment in 2.7.4).
  - `Promise.race` over inputs that include a `setTimeout` for the timeout case leaks the timer when the fetch wins the race. The 2026 fix is `AbortSignal.timeout`, not a `Promise.race` workaround.
  - Calling `resolve()` or `reject()` on a `withResolvers` more than once silently does nothing after the first call. The senior reflex: design the call site so the resolution can fire at most once (a `once: true` listener; a state-machine guard on the resolver).

What this lesson does not cover:

- `async`/`await` syntax and the sequential-vs-parallel decision at depth (2.7.3).
- The N+1 trap inside `.map()` (2.7.3).
- `AbortController`, `AbortSignal`, cancellation (2.7.4).
- Error handling at the `catch` binding under TS strict — `unknown` narrowing (Chapter 2.8).
- Custom `Error` subclasses and `Error.cause` (Chapter 2.8).
- React 19's `use(promise)` hook for unwrapping Promises in components (Unit 5.3).
- The `Streams` API and `ReadableStream`-based async iteration (Unit 3.6.2).

Pedagogical approach:

Reference/survey archetype with two Mechanics beats (the combinators and `withResolvers`). The lesson is a tight tour of the surface with the trigger for each form named at the call site. Open with the senior question — "you have three independent fetches; what's the form, and what changes if one is allowed to fail?" — and a `CodeVariants` block contrasting four versions of the same three-fetch operation: tab 1 is sequential `await` (the slow, naive form), tab 2 is `Promise.all` (the senior default for fail-fast), tab 3 is `Promise.allSettled` (for partial-failure-tolerated), tab 4 is `Promise.any` (for redundant providers). The annotation on each tab names the trigger and the failure mode. The student sees the four combinators in one picture.

A `TabbedContent` block organizes the four combinators as a reference card — one tab per combinator, each containing the signature, the resolution rule, the rejection rule, the failure-tolerance note, and a one-line canonical site. The student leaves the lesson able to pick the right combinator on sight.

A `ScriptCoding` block exercises `Promise.all`: the student writes a function that loads three independent records (`fetchUser(id)`, `fetchOrg(id)`, `fetchSubscription(id)`) and returns them as a typed tuple. The student first writes the sequential form (three `await`s), then refactors to `Promise.all`, observes the parallel pattern, and notes the speedup. A second `ScriptCoding` exercises `Promise.allSettled`: the student dispatches three notification sends and aggregates the per-recipient results into a `{ delivered: string[]; failed: { id: string; reason: string }[] }` shape using a discriminated narrow on the `status` field. The 2.5.1 discriminated-union narrow cashes in here.

The `withResolvers` beat lands in an `AnnotatedCode` block walking the upload-complete example above with three annotations — the destructure, the listener registration, the returned `promise`. A `CodeVariants` block contrasts the legacy deferred pattern (definite-assignment assertions and outer `let`s) with the modern `withResolvers` form. The diff makes the senior call obvious; the student writes the modern form by reflex.

A `Buckets` exercise sorts ten async scenarios into the four combinator buckets — "load three independent records before rendering," "send notifications to 200 recipients, report failures," "fetch from primary CDN, fall back to secondary," "race a fetch against a 5s timeout (legacy form)," etc. The trigger-recognition is the deliverable.

Close with a `MultipleChoice` exercise on rejection semantics: "given `Promise.all([promiseA, promiseB, promiseC])` where promiseA rejects after 100ms and promiseB resolves after 500ms, what's the state of promiseB at 600ms?" The correct answer (promiseB is *fulfilled*, but its value is thrown away by `Promise.all`'s rejection) names the abandon-but-don't-cancel semantics that lands again in 2.7.4.

Estimated student time: 50 to 65 minutes.

---

## Lesson 2.7.3 — `async`/`await`: sequential vs. parallel, the N+1 trap, async iteration

Topics to cover:

- The senior question: every modern async API on the stack returns a Promise, and the student has been writing `await` against them since Chapter 1. What's the senior surface of `async`/`await` — sequential vs. parallel composition, the N+1 trap in `.map()`, the `for await...of` form for async iterables, the call-stack discipline that keeps stack traces useful — and where does the form a junior writes break down at production scale.
- **The mental model**, restated from 2.7.1. An `async` function returns a Promise from the moment it's called; the function body runs synchronously up to the first `await`, suspends at the `await` (the awaited value is wrapped if not already a Promise), and resumes as a microtask when the awaited Promise settles. The function's outer Promise resolves with the function's return value or rejects with a thrown error. The discipline the lesson installs is "every `await` is a suspension point — what's the function not doing while it's suspended?"
- **Sequential vs. parallel** as the chapter's primary decision:
  - **Sequential** — `const a = await loadA(); const b = await loadB(a); const c = await loadC(b);`. Each step depends on the prior step's output. The senior default *when the dependency is real*. The form is correct here; the cost is the sum of latencies, which is the cost the dependency requires.
  - **Parallel** — `const [a, b, c] = await Promise.all([loadA(), loadB(), loadC()]);`. Independent operations. The senior default when no dependency exists. The cost is the *max* latency, not the sum. Three 100ms operations land in 100ms, not 300ms.
  - **The trap**: writing the sequential form when the parallel form would do. The novice writes `const a = await loadA(); const b = await loadB(); const c = await loadC();` — three independent operations serialized for no reason. The senior reflex: every time you write more than one `await` in sequence, ask "does the second depend on the first?" If not, the form is `Promise.all`.
  - **Reading the diff**: the lesson teaches the student to spot the wrong sequential form in code review at a glance — multiple `await` statements with no data flowing between them is the smell.
- **The N+1 trap inside `.map()`**:
  - **The wrong form** — `const results = items.map(async (item) => await fetch(`/api/items/${item.id}`));`. The `.map` returns an array of Promises (not the resolved values), and *no one is awaiting them as a batch*. If the consumer does `await Promise.all(results)`, the fan-out is the full length of `items` with no concurrency limit. If the consumer iterates and `await`s each, the result is sequential (and the `.map`'s "parallel" appearance is a lie — the Promises started in parallel but the consumer drained sequentially, which is the worst of both worlds because the Promises *did* start in parallel and any rejection from a later index already happened by the time the consumer awaits it).
  - **The right form when the list is small and bounded** — `const results = await Promise.all(items.map(async (item) => fetch(`/api/items/${item.id}`)));`. The `.map` returns an array of Promises that fire in parallel; the `Promise.all` resolves when all settle. Correct for lists of ten to a hundred items and operations that are cheap to fan out (a database is generally not the right consumer for a 100-wide parallel fanout — see the database-pool watch-out below).
  - **The right form when the list is unbounded or the concurrency must be bounded** — a concurrency-limited helper. The 2026 senior reach is `p-map` from the `p-*` family (`pMap(items, async (item) => fetch(...), { concurrency: 8 })`) or a hand-rolled worker pool when a dependency is a step too far. Named with the trigger: when N can grow beyond a small bound, or when the downstream service has rate limits the fan-out would violate.
  - **The database angle**, named with the canonical SaaS site. A Drizzle query inside a `.map` is the most common production form of the N+1 trap. The senior reach is *not* to `Promise.all` the queries — the connection pool will be saturated and the database load is the same regardless of the fan-out. The senior reach is to *batch the query*: one `select ... where id in (?)` with the full ID list, or a join. Named here as a forward reference; full treatment in Unit 6.3.
- **The `for await...of` form** for async iterables:
  - The shape — `for await (const chunk of stream) { ... }` — iterates an async iterable, awaiting the next item on each iteration. The body runs once per emitted item, in order, with the loop suspended between iterations.
  - The canonical SaaS sites:
    - **Streaming response bodies** — `for await (const chunk of response.body)` over a `ReadableStream` (Fetch API). Used in Unit 3.6.2 for server-sent events and chunked responses; used in Unit 23 (conditional) for LLM token streams.
    - **Paginated API consumption** — a generator function that fetches a page, yields its items, fetches the next cursor, repeats. The consumer writes `for await (const item of paginate(api))` and ignores the page boundary entirely.
    - **Node `events.on(emitter, event)`** — converts an `EventEmitter` into an async iterable of events. Used in background-job processors (Unit 13.1).
  - The contrast with `Promise.all`: `for await...of` is *sequential* by design — each iteration awaits the previous. It's not a replacement for parallel fan-out; it's the right form when the items themselves arrive over time and back-pressure matters (a network stream that produces one chunk per RTT).
- **Top-level `async` entry points and unhandled rejection**, restated from 2.7.2. A script's top-level `main()` call returns a Promise; if not handled, an unhandled rejection terminates the Node process. The senior pattern at a script entry is `main().catch(handleFatal)`. Inside a route handler or Server Action, the framework's outer boundary handles the rejection; inside a background job, the job runner does. The student writes the explicit `.catch` at script entry by reflex.
- **`try`/`catch` around `await`**:
  - The form — `try { const data = await loadData(); ... } catch (error) { ... }`. The synchronous-looking error-handling shape that's the senior default for handling errors inside an `async` function. Compares with `.catch()` chained to the Promise: equivalent semantics, but the `try`/`catch` form keeps the local variable in scope after the `catch` (which a `.then(...).catch(...)` chain does not).
  - The watch-out: forgetting `await` before a Promise inside a `try` block. The Promise rejects after the `try` exits, the rejection lands as unhandled, and the `catch` never fires. The senior reflex: every `await` that can reject is inside a `try`, *or* its rejection is intentionally propagated to the caller. The full error-handling story lands in Chapter 2.8; the lesson plants the seed.
- **The watch-outs a senior names**:
  - **The hidden serial wait**: `await` inside a `forEach` callback does not await — `Array.prototype.forEach` ignores the callback's return value. The senior reflex: never `.forEach` over an `async` callback; use `for...of` (sequential) or `Promise.all(items.map(...))` (parallel) instead. Named with the small wrong-then-right diff.
  - **The accidental sequential form**: two `await`s with no dependency that should have been parallel. The lesson's primary code-review smell.
  - **The Drizzle-in-a-loop trap**: any database query inside a `.map`/`for...of` over a list of IDs. The senior reach is the batched query; named again here for emphasis.
  - **`return await` vs. `return`**: `return await promise` and `return promise` resolve to the same value, but `return await` keeps the `async` function's frame on the stack for the duration of the awaited operation, which preserves the stack trace in a rejection. Pre-2020 advice was "drop the `await`"; the 2026 senior reach is to keep `return await` for better stack traces, especially in error paths. The TypeScript ESLint rule `no-return-await` is now `return-await: "always-error-handling-only"` in 2026 lint configs.

What this lesson does not cover:

- `AbortController` and `AbortSignal` (2.7.4).
- Error-handling discipline at depth — `unknown` in `catch`, custom Error subclasses, `Error.cause` (Chapter 2.8).
- Async generators (`async function*`) at depth — the consumer side (`for await`) is the lesson's reach; the producer side gets a one-paragraph mention.
- The streams API surface — `ReadableStream`, `WritableStream`, `TransformStream` (Unit 3.6.2).
- React 19's `use()` hook (Unit 5.3).
- The Drizzle query API and the N+1 fix in detail (Unit 6.3).

Pedagogical approach:

Mechanics archetype with the sequential-vs-parallel decision as the chapter's load-bearing payoff. The lesson teaches a syntactic surface the student has already touched and re-frames it through a senior lens. Open with the senior question — "you write three `await` lines and the page is slow; what's wrong with the code?" — and a `CodeVariants` block with two tabs: tab 1 is the three-sequential-`await` form, tab 2 is the `Promise.all` form. The annotation calls out the dependency check: if no data flows between the awaits, the second form is the senior default.

A `ScriptCoding` block puts the student in the seat. They start with the slow sequential form (`fetchUser`, `fetchOrg`, `fetchSubscription`, with timed delays the student can see in the console), measure the wall time, refactor to `Promise.all`, and re-measure. The speedup is concrete; the senior reflex lands in muscle memory.

The N+1 beat lands in a `CodeReview` exercise — a 20-line function with `items.map(async (item) => await loadItem(item.id))` followed by code that consumes `results` assuming it's an array of values. The student spots two bugs (the `await` is meaningless inside `.map` without an outer await; the array is Promises, not values) and leaves a comment with the fix (`await Promise.all(items.map(...))`). A second `CodeReview` exercise shows the database-fanout variant — the senior fix is the batched query, not `Promise.all`. The trigger-recognition is the deliverable.

A `TabbedContent` block presents the three concurrency forms the student picks between: sequential `for...of` (with the trigger), parallel `Promise.all` (with the trigger), and concurrency-limited `pMap` (with the trigger). One tab per form, each with the signature, the cost model, and the canonical site. A small `Buckets` exercise sorts eight scenarios into the three buckets — "load three independent counts for a dashboard," "process 10,000 webhook events," "load each row's children one at a time in a paginated table," etc.

The `for await...of` beat lands in a small `ScriptCoding` block where the student writes a tiny async generator that yields three values with `await new Promise(r => setTimeout(r, 100))` between each, then consumes it with `for await...of`. The student observes the items arrive one-per-100ms — the sequential-by-design property is concrete. A `CodeVariants` block contrasts a `for await...of` consumer of a paginated API with a `while (cursor)` consumer of the same paginated API; the `for await` form is shorter and the iteration boundary disappears.

A small `PredictOutput` exercise on a `forEach`-with-`async` callback: the student sees the call site and predicts whether the `await`s actually awaited. The correct prediction (no, `forEach` ignored the returned Promises, the function returned before any of them resolved) names the trap.

Close with a small `AnnotatedCode` walking the `return await` form with stack-trace-preservation annotations. The student sees why the modern advice is the opposite of the 2018 advice and the lesson cashes in for the error-handling chapter next.

Estimated student time: 55 to 70 minutes. The chapter's heaviest application-skill lesson.

---

## Lesson 2.7.4 — `AbortController`, `AbortSignal`, and structured cancellation

Topics to cover:

- The senior question: a user navigates away from a page mid-fetch; a Server Action takes longer than its budget; a background job needs to honor a shutdown signal. What's the cancellation primitive that every modern web API on the stack speaks, and what's the form a 2026 senior writes by reflex. The answer is `AbortController` and `AbortSignal` — a paired primitive where the controller fires `abort()` and every consumer reads the signal's state and listens for the `abort` event. The lesson teaches the surface, the canonical patterns (user cancel, timeout, race-the-shutdown), the composition (`AbortSignal.any`, `AbortSignal.timeout`), and the failure-mode discipline.
- **The primitive**, named concretely:
  - **`AbortController`** — a class with a `signal` property (an `AbortSignal`) and an `abort(reason?)` method. The producer side. Create one per cancellable operation; call `.abort(reason)` to fire the cancellation.
  - **`AbortSignal`** — the consumer-side handle. Has `aborted: boolean`, `reason: any`, an `addEventListener('abort', listener)` API, and `throwIfAborted()` for the synchronous "throw if cancelled" check.
  - **The contract**: every modern async API that accepts an `AbortSignal` in its `{ signal }` option must wire the signal to its internal cancellation. Fetch aborts the in-flight request and rejects with an `AbortError`. `addEventListener` removes the listener when the signal aborts. The Streams API closes the stream. The student writes `{ signal }` by reflex and trusts the API to honor it.
- **The canonical user-cancel pattern**:
  ```ts
  const controller = new AbortController();

  cancelButton.addEventListener('click', () => controller.abort());

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: file,
      signal: controller.signal,
    });
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // user cancelled; not a real error
      return null;
    }
    throw error;
  }
  ```
  The pattern lands again in Unit 4.9 inside a `useEffect` cleanup that aborts an in-flight request when the component unmounts. Seeded here.
- **`AbortSignal.timeout(ms)`** — a static method that returns a pre-armed signal that aborts after `ms` milliseconds. The 2026 senior reach that supersedes the `Promise.race(fetch, timeoutPromise)` idiom from 2.7.2.
  ```ts
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  ```
  The runtime owns the timer; no `setTimeout` cleanup needed. The rejection on timeout is a `TimeoutError` (a `DOMException` with `.name === 'TimeoutError'`). The senior reflex: every server-to-server fetch in the application has a timeout; the default is `AbortSignal.timeout`.
- **`AbortSignal.any([signal1, signal2, ...])`** — combines multiple signals into one. The resulting signal aborts when *any* of the inputs aborts, with the reason set to the triggering signal's reason. The 2026 senior reach for "user-cancel OR timeout OR shutdown-signal":
  ```ts
  async function uploadWithCancellation(file: File, userSignal: AbortSignal) {
    const signal = AbortSignal.any([
      userSignal,
      AbortSignal.timeout(30_000),
    ]);
    return await fetch('/api/upload', {
      method: 'POST',
      body: file,
      signal,
    });
  }
  ```
  The watch-out (named for honesty): `AbortSignal.any` in Node has had reliability issues in the 22.x line — memory leak in 22.0–22.4, timeout interaction edge cases in 22.5–22.10. Fixed in 22.11+ and current in 24/26. The senior reach in 2026 is to use it freely on the current LTS line; the awareness of the historical bug class is named in one line so the student recognizes a stack-overflow result that points at the workaround.
- **`signal.throwIfAborted()`** — the synchronous check inside a long-running synchronous loop or between async steps. The senior reach when a function does *non*-async work that should still honor cancellation:
  ```ts
  for (const row of rows) {
    signal.throwIfAborted();
    processRow(row);
  }
  ```
  The form throws an `AbortError` (or whatever the signal's `reason` is) when aborted; otherwise it's a no-op. The student writes it at every yield-point in a long-running operation.
- **The fetch-cancellation flow**, named end-to-end:
  - The controller signals `abort()`.
  - The fetch's internal listener fires and tears down the underlying TCP/TLS connection (or returns the connection to the pool if no body has streamed yet).
  - The fetch Promise rejects with `AbortError`.
  - The consumer's `try`/`catch` distinguishes `AbortError` from real errors (the discriminated narrow on `error.name`).
- **The Server Action / route-handler angle**, named for the forward reference. Every Next.js route handler receives a `Request` object with a `signal` property. The framework aborts the signal when the client disconnects. The senior reflex inside a route handler: pass `request.signal` down to every fetch and database call that can be cancelled, so a client disconnect tears down the in-flight work. Lands in Unit 7.5.
- **The `useEffect` cleanup angle**, named for the forward reference. A `useEffect` that fetches data wires an `AbortController` and aborts it in the cleanup function so an unmounted component's in-flight fetch doesn't update unmounted state. Lands in Unit 4.9 with the full pattern; named here so the primitive is familiar.
- **Idempotent vs. non-idempotent cancellation**, named with the contract. Aborting a `GET` is safe — no server-side state changes. Aborting a `POST` that has already started is *not* safe in general — the server may have completed the side effect. The senior reach: design `POST` endpoints to be idempotent (an `Idempotency-Key` header, or a server-side dedup; lands in Unit 3.2.1 and Unit 7.5), and treat cancellation of a `POST` as a "best effort" — the side effect may still have happened. Named in one paragraph.
- **The watch-outs a senior names**:
  - **The unhandled `AbortError`**: if the consumer doesn't catch `AbortError` and distinguish it from a real failure, the user sees a generic error message for a cancel they initiated. The senior reach is always the `error.name === 'AbortError'` narrow at the catch, with a no-op or a different code path. Lands in Chapter 2.8 with the full `unknown`-narrowing discipline.
  - **The timer that doesn't clear**: `setTimeout(reject, 5000)` inside a manual race leaks the timer when the fetch wins. `AbortSignal.timeout` doesn't have this problem — the runtime cancels the timer when the signal is no longer referenced. The form is just better; use it.
  - **Listener leaks** in long-lived signal consumers: a component that registers `addEventListener('abort', listener)` on a long-lived signal (a parent context's signal) without `{ once: true }` accumulates listeners across re-mounts. The senior reach is `{ once: true }` for one-shot listeners or `removeEventListener` for managed lifecycle. Rare in application code; named for completeness.
  - **The signal is not the work**: aborting a signal cancels the *coordination* but not necessarily the work. A fetch's in-flight bytes are abandoned but the server may continue processing; a Drizzle query may complete on the database even after the signal aborts (depends on the driver). The senior framing: cancellation is a request, not a guarantee. Design with the assumption that work may have happened.

What this lesson does not cover:

- Error-handling discipline at depth — `unknown` in `catch`, `error.name` narrowing in production, custom `AbortError` subclasses (Chapter 2.8).
- The full Fetch API surface — `Request`, `Response`, `Headers`, `FormData`, streaming bodies (Unit 3.6).
- `useEffect`-with-cleanup patterns at depth (Unit 4.9).
- Server Action cancellation propagation (Unit 7.2 and Unit 7.5).
- Background-job cancellation with Trigger.dev's signal (Unit 13.1).
- The internals of how the runtime implements `AbortSignal.timeout`'s timer ownership.

Pedagogical approach:

Pattern archetype. The lesson teaches a specific primitive (`AbortController` + `AbortSignal`) and the bug class it kills (in-flight async work that outlives the caller's interest). Open with the senior question — "the user clicked Cancel; the upload's still going. What's the form that stops it?" — and a `CodeVariants` block showing two tabs: tab 1 ignores cancellation (the fetch finishes and the response is discarded; the bandwidth and server work are wasted), tab 2 wires `controller.abort()` and the fetch rejects with `AbortError`. The diff is the lesson's seed.

A `ScriptCoding` block has the student write the canonical user-cancel pattern: create a controller, pass `controller.signal` to `fetch`, call `.abort()` from a simulated cancel handler, catch the `AbortError` and discriminate it from a real error with `error.name`. The student observes the abort flow end-to-end in the console.

A `TabbedContent` block organizes the three signal-construction primitives — `new AbortController()` (the manual form), `AbortSignal.timeout(ms)` (the timeout form), `AbortSignal.any([...])` (the composition form). One tab per form with the signature, the canonical site, and a one-line example. The reference card the student returns to.

A `CodeVariants` block contrasts the legacy timeout idiom (`Promise.race([fetch(url), new Promise((_, rej) => setTimeout(rej, 5000))])` with its timer-leak watch-out) against the modern form (`fetch(url, { signal: AbortSignal.timeout(5000) })`). The senior call is annotated inline; the diff is the deliverable.

A second `ScriptCoding` block exercises `AbortSignal.any`: the student combines a user-cancel signal with a 10-second timeout, runs a slow fetch, and verifies that whichever signal fires first aborts the fetch. The composition is the lesson's mechanics payoff.

A small `AnnotatedCode` block walks the `signal.throwIfAborted()` form inside a long-running for loop, with annotations naming the yield points where the check belongs (before the per-item work, after a chunk boundary, etc.).

A `Buckets` exercise sorts eight async operations into "needs `AbortSignal.timeout`," "needs `AbortController` for user cancel," "needs `AbortSignal.any` for both," "no cancellation needed" — a dashboard data load, a webhook handler's outbound fetch to Stripe, a user-initiated file upload, a `select 1` health check, etc. The trigger-recognition is the deliverable.

Close with a `CodeReview` exercise on a Next.js component's `useEffect` that fetches data without an `AbortController` and updates state on response. The student spots the unmounted-set-state bug and leaves a comment naming the cause (no cancellation on cleanup) and the fix (wire `controller.abort()` in the effect's cleanup function). The forward reference to Unit 4.9 lands.

Estimated student time: 50 to 65 minutes.

---

## Lesson 2.7.5 — Quizz

Top ten topics to quiz:

1. The event-loop tick recipe — one macrotask, drain microtasks, (browser) render, repeat; the order-of-output question for a small program mixing `console.log`, `setTimeout(0)`, `Promise.resolve().then`, and `queueMicrotask`.
2. The Promise three-state model — pending, fulfilled, rejected; settlement is one-way; `await` is microtask-paced.
3. The four combinators — `Promise.all`, `allSettled`, `any`, `race` — and the senior trigger for each (fail-fast/need-every, partial-failure-tolerated, redundant-providers, deprecated-by-`AbortSignal.timeout`).
4. The rejection semantics of `Promise.all` — first rejection wins, other operations are abandoned but not cancelled; pair with `AbortController` if cancellation matters.
5. `Promise.withResolvers()` as the modern construction primitive — when it earns its weight (resolvers outside the constructor's executor), the contrast with the legacy deferred pattern, the TypeScript win.
6. The sequential-vs-parallel decision — `Promise.all` for independent operations, sequential `await` only when the next call depends on the prior's output; the code-review smell of consecutive `await`s with no data flowing between them.
7. The N+1 trap inside `.map(async ...)` — what `.map` actually returns, the right form (`await Promise.all(items.map(...))`) for bounded lists, the concurrency-limited form (`pMap`) for unbounded, the batched-query form for database queries.
8. `for await...of` over async iterables — the sequential-by-design property, the canonical sites (streaming response bodies, paginated APIs, event emitters), the contrast with `Promise.all` (parallel) and `for...of` over an array of Promises.
9. `AbortController` and `AbortSignal` as the universal cancellation primitive — the `{ signal }` parameter shape, the `AbortError` rejection, the `error.name` discrimination at the catch.
10. `AbortSignal.timeout(ms)` and `AbortSignal.any([...])` as the senior 2026 form — timeout supersedes `Promise.race`; `any` composes user-cancel and timeout into one signal; aborting cancellation is a request, not a guarantee that the work didn't happen.

---

## Total chapter time

Roughly 200 to 260 minutes across the four teaching lessons plus the quiz. The chapter splits naturally across two evenings — the event-loop model (2.7.1) plus the Promise surface (2.7.2) as the first sitting, then `async`/`await` with the sequential-vs-parallel decision (2.7.3) plus `AbortController` (2.7.4) as the second sitting where the application-skill payoff lands. The student finishes the chapter able to predict the order of output in a small async program, pick the right Promise combinator on sight, refactor a sequential await loop into `Promise.all` when independence allows, spot the N+1 trap inside `.map()`, and wire `AbortController` + `AbortSignal.timeout` + `AbortSignal.any` as the cancellation primitive every later async surface on the stack speaks. Chapter 2.8 (Errors as a first-class concern) lands directly on this floor — the `try`/`catch` around `await`, the `unknown` in the catch binding, and the `AbortError` discrimination this chapter named get their full treatment.
