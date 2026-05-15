# Chapter 2.7 — Async semantics

## Chapter framing

Chapter 2.6 closed the module-graph story — the four import shapes, depth-first evaluation, live bindings, the `'server-only'` boundary, and the top-level-await-vs-lazy-init call. The student can read any file as a node in a typed graph. This chapter zooms into what happens *inside* a node when the work it does isn't synchronous: how the runtime decides what runs next (the event loop and the microtask queue), how Promises model the three-state work-not-done-yet contract, how `async`/`await` collapses Promise chains into linear-looking code without losing the parallel-by-default reflex, and how `AbortSignal` carries cancellation through every modern web and Node API the course writes against. Every later chapter — `fetch` (3.6), the four async files (5.3), Server Actions (7.2), webhook ingestion (12.1), background work (13.1), streaming AI responses (23.2) — assumes the student can predict the order of any small async program and reach for `AbortSignal.any([...])` without ceremony.

Threads that must run through every lesson:

- **The student leaves able to predict execution order.** The event-loop model from 2.7.1 is the substrate the rest of the chapter rides on. Every later snippet that interleaves `await`, `setTimeout`, and `queueMicrotask` should be readable as a tick-by-tick trace.
- **Parallel by default, sequential by dependency.** The senior reflex is to check whether each `await` depends on the previous one's result. If not, the work runs through `Promise.all`. This rule fires in 2.7.3 and recurs in 5.3.2 (streaming a page), 6.4.2 (N+1), and 20.3.6 (RSC waterfalls).
- **The four combinators are not interchangeable.** `Promise.all`, `Promise.allSettled`, `Promise.any`, and `Promise.race` each model a different "what counts as done" contract; the chapter installs the trigger and the failure mode for each so the student stops reaching for `Promise.all` when one rejection shouldn't kill the rest.
- **Cancellation is structural, not a flag.** `AbortSignal` is the 2026 lingua franca every `fetch`, every `setTimeout`, every database query (Drizzle, `pg`), every AI SDK call, every route handler, and every Server Action passes around. The chapter installs the `{ signal }` parameter shape as the senior reflex, not a niche feature.
- **Errors at the async seam preview Chapter 2.8.** Async throws, `AbortError` discrimination, the `unknown`-in-catch narrow — named at the moment they apply in this chapter, taught at depth in 2.8. The chapter does not re-teach `try`/`catch` mechanics; it shows where they land in async code.
- **No history.** Callback hell, `util.promisify`, `Bluebird`, `q`, jQuery deferreds — gone. The chapter writes the form a senior writes in 2026 and names the legacy only where it still leaks into third-party SDKs.

The student finishes the chapter able to trace `await`/`setTimeout`/`queueMicrotask` interleavings tick-by-tick, pick the right combinator for a "what counts as done" contract, write `Promise.withResolvers()` instead of the deferred-pattern boilerplate, rewrite serial `await`s into `Promise.all` when no data flows between them, bound parallelism with `for await...of` or `pMap` instead of unbounded `.map(async ...)`, wire `AbortSignal` through every `fetch` and timer with `AbortSignal.timeout(ms)` and `AbortSignal.any([...])`, and discriminate `AbortError` at the catch from real failures. Chapter 2.8 lands on this floor with the error-channel discipline.

---

## Lesson 2.7.1 — The event loop and the microtask queue

Teaches the three-part runtime model (call stack, microtask queue, macrotask queue), the tick recipe that drains microtasks before the next macrotask, and `await` as a microtask-paced suspension so the student can predict the order of output in any small async program.

Topics to cover:

- The senior question. A function logs `'a'`, awaits a resolved Promise, logs `'b'`. A `setTimeout(..., 0)` logs `'c'`. A `queueMicrotask(...)` logs `'d'`. In what order does the output appear, and why does the answer not depend on the timer's `0`? The lesson installs the model that answers it deterministically, because every later async snippet rides on this prediction.
- The three-part runtime. Named once, used for the rest of the chapter.
  - **The call stack.** Synchronous JavaScript runs here, top to bottom. Nothing else runs while the stack is non-empty.
  - **The microtask queue.** Promise continuations (`.then` callbacks, the code after each `await`), `queueMicrotask(fn)` callbacks. Drained completely between every two macrotasks — the loop does not move on until the microtask queue is empty.
  - **The macrotask queue (the "task" queue).** `setTimeout`, `setInterval`, `setImmediate` (Node only), I/O completion callbacks, message events, user input. One task per tick.
- The tick recipe, stated as an algorithm.
  1. Run a macrotask to completion (a script load counts as the first one).
  2. Drain the microtask queue completely. If a microtask schedules another microtask, that one runs too, in this same drain.
  3. Render (browser only, and only when the renderer decides to).
  4. Pick the next macrotask. Go to 1.
- `await` as microtask-paced suspension. The senior takeaway in one line: **`await p` does not block the thread; it pauses the surrounding `async` function and schedules its continuation as a microtask when `p` settles.** Three consequences named.
  - Code *before* the first `await` in an `async` function runs synchronously on the call stack. The function returns a Promise as soon as it hits the first `await`.
  - Code *after* each `await` is a microtask. It runs before any pending macrotask (any `setTimeout(..., 0)`), even if the awaited Promise was already resolved.
  - An `async` function with no `await` still returns a Promise. The body runs synchronously; the Promise resolves on the next microtask.
- Walked example, the canonical interleaving. A small program that logs `'sync 1'`, schedules `setTimeout(() => log('macro'), 0)`, schedules `queueMicrotask(() => log('micro'))`, calls an `async` function that logs `'sync 2'` then `await`s a resolved Promise then logs `'micro 2'`, and finally logs `'sync 3'`. The output order: `sync 1`, `sync 2`, `sync 3`, `micro`, `micro 2`, `macro`. The lesson walks the queues step by step and the student can read the trace.
- Promise resolution does not jump the queue. `Promise.resolve()` does not run the `.then` synchronously; the continuation is scheduled as a microtask. Stated once because students often expect a pre-resolved Promise to skip the queue.
- `queueMicrotask(fn)` — the explicit microtask scheduler. The senior reach when a callback needs to run "after this synchronous work but before any rendering or I/O." Rare in app code; appears in libraries that batch work (state libraries, the React scheduler). Named once with one trigger; the student should recognize it, not reach for it.
- Node specifics, named in one paragraph. Node has `process.nextTick` (drains before microtasks — a Node-only sub-queue) and `setImmediate` (a separate macrotask family that runs after I/O callbacks). The senior watch-out: `process.nextTick` recursion starves the event loop; do not reach for it in app code. `setImmediate` is for libraries; the app code in this course reaches for `setTimeout` when it needs a macrotask and never for `process.nextTick`.
- The browser-vs-Node split, stated once. The model in this lesson holds in both runtimes. The Node-only extras (`process.nextTick`, `setImmediate`) are runtime-specific; the microtask/macrotask split is universal.
- The performance reflex. The senior implication of the tick recipe: a long-running microtask (a Promise chain that synchronously does heavy compute) blocks rendering, blocks I/O, blocks every other task. The fix is to yield by scheduling a macrotask (a `setTimeout(..., 0)` or a `MessageChannel` ping) between batches of work. Named once; the deeper performance treatment lives in Unit 20.

What this lesson does not cover:

- Authoring Promises (2.7.2 owns the constructor and combinators).
- The `async`/`await` syntax beyond the microtask framing (2.7.3 owns the parallel-by-default and sequential-by-dependency rules).
- Cancellation (2.7.4).
- `try`/`catch` discipline at depth (Chapter 2.8).
- Node's event loop *phases* (timers / pending callbacks / poll / check / close). The course's app code does not depend on the phase split; named in one line for completeness.
- Worker threads, `MessageChannel`, `BroadcastChannel`. Niche; not in this lesson.
- React's scheduler or `useTransition`'s priority queue. Unit 4.9 owns that.

Pedagogical approach: Concept archetype with an interactive widget at the center. Open with the prediction prompt (the four-line `'a'`/`'b'`/`'c'`/`'d'` program) and refuse to answer it until the model lands — the student should feel the gap. Show a small interactive widget where the user steps through one of two pre-written programs tick by tick: a "Next tick" button advances the call stack, the microtask queue, and the macrotask queue panels side by side, with the log accumulating in a fourth panel. The widget does the heavy lifting because the model has three moving parts and a static picture can't show the cause-and-effect. Walk the tick recipe in adjacent prose. The canonical interleaving example gets a labeled code block with the predicted output below it; do not show the output until the student reads the prose explanation. Use a `PredictOutput` exercise with three short programs the student must trace to the right log order. Close with one short `TrueFalse` set covering the three consequences of the `await`-as-microtask model. No sandbox: the widget is the play surface.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.7.2 — Promises: combinators and `withResolvers`

Teaches the Promise three-state model, the four combinators (`all`, `allSettled`, `any`, `race`) with the senior trigger and failure mode for each, and `Promise.withResolvers()` as the modern replacement for the deferred-pattern boilerplate when resolvers must live outside the constructor's executor.

Topics to cover:

- The senior question. A page must fetch the user, the org, and the recent invoices. Three independent reads, one render. What does the page do if one of them fails? What if the user read is required and the invoices read is optional? What if any of the three taking longer than 2 seconds should fail the whole render? Each answer is a different combinator. The lesson installs the four-way cut so the student stops reaching for `Promise.all` reflexively.
- The Promise three-state model. Named for the vocabulary.
  - **Pending.** The work hasn't finished. The Promise has no value yet.
  - **Fulfilled.** The work finished successfully. The Promise holds a value.
  - **Rejected.** The work finished with a reason (an error, conventionally).
  - Two transitions only: pending → fulfilled, pending → rejected. Once settled, a Promise never changes state. This permanence is what makes the combinators predictable.
- The Promise constructor, named briefly. `new Promise((resolve, reject) => { ... })` is the low-level shape. The course rarely authors raw Promises — most async work returns a Promise from a platform API (`fetch`, a Drizzle query, the `node:timers/promises` helpers). The constructor earns its weight only when wrapping a callback-style API or a manually-resolved event. Forward link to `Promise.withResolvers()` below for the modern shape.
- The four combinators, with the trigger and the failure mode for each.
  - **`Promise.all([p1, p2, p3])`.** Resolves with `[v1, v2, v3]` when *every* input resolves; rejects with the first rejection's reason. The senior trigger: the caller needs every value to proceed, and any failure should bubble up as a single failure. The failure mode: a `Promise.all` over heterogeneous critical/non-critical work loses the non-critical results when the critical one fails — the wrong tool for "render what you can."
  - **`Promise.allSettled([p1, p2, p3])`.** Always resolves with an array of `{ status, value? , reason? }` objects after every input settles. The senior trigger: the caller wants every result, success or failure, to make a render decision per item. The failure mode: the caller forgets to inspect each entry's `status` and treats the array as values; the type system flags this if the result is consumed correctly.
  - **`Promise.any([p1, p2, p3])`.** Resolves with the first fulfillment; rejects with an `AggregateError` only when every input rejects. The senior trigger: redundant providers (a CDN fallback, two analytics endpoints, a primary and a replica read). The failure mode: a single fast-but-wrong response wins, masking that the slower-but-correct ones rejected. The reach is narrow.
  - **`Promise.race([p1, p2, p3])`.** Settles with the first input's settlement, fulfilled or rejected. The senior 2026 reach: very narrow now that `AbortSignal.timeout(ms)` exists for the canonical "fail if it takes too long" case (taught in 2.7.4). `race` still earns its weight as a primitive for composing custom "first to settle wins" semantics where one of the racers is a signal-driven cancellation flag, but the timeout pattern is no longer one of them.
- The combinator decision rule, stated as one question. **What counts as "done"?**
  - Every result needed: `Promise.all`.
  - Every result reported, success or failure: `Promise.allSettled`.
  - The first success, others discarded: `Promise.any`.
  - The first settlement of any kind: `Promise.race`.
- `Promise.withResolvers()` — the 2026 replacement for the deferred pattern. Returns `{ promise, resolve, reject }` so the resolvers can live outside the constructor's executor. The senior reach when:
  - **An event-driven flow needs a Promise.** A `socket.once('message', resolve)` handler, a UI dialog whose Promise resolves when the user clicks one of three buttons. Without `withResolvers()`, the code wraps the handler in `new Promise(...)` which forces the handler-installation logic to live inside the executor; with it, the resolvers are values in scope.
  - **A Promise is exposed for external resolution.** A test fixture, a request-deduplication cache, a singleton "first-load" gate. The pattern that used to require a hand-rolled `deferred` helper is now one standard call.
  - Failure mode of the legacy pattern, named in one line: `let resolve; const p = new Promise(r => { resolve = r; })` — the executor runs synchronously, so it works, but it's fragile (a stack trace through `Promise` is unhelpful) and the `let resolve` declaration before the assignment trips type inference. `withResolvers()` makes the pattern explicit.
- Promise chaining vs. `await`, named in one paragraph. The `.then`/`.catch`/`.finally` chain is the underlying form; `async`/`await` is its sugar. The course writes `await` by default. The two sites where `.then` still earns its weight: returning a Promise from a function that immediately transforms its result (when wrapping for an API surface where adding `async` would change the signature), and the `finally` cleanup hook in callers that don't want to mark themselves `async`. Beyond those, `await`.
- The unhandled-rejection failure mode. A Promise rejection with no `.catch` and no `await ... try/catch` becomes an *unhandled rejection*. In Node, the default behavior in 2026 (since Node 20+) is to crash the process; in the browser, it fires a `window.onunhandledrejection` event. The senior reflex: every Promise the app creates either is `await`ed inside a `try`/`catch`, has a `.catch`, or is fed to a combinator that handles rejection (`allSettled`, `any`) (try/catch mechanics: Chapter 2.8.1). Forward link to 2.8.1 for the throw-vs-return discipline that decides which branch handles the rejection.
- A note on `Promise.resolve(x)` and `Promise.reject(reason)`. The synchronous shortcuts for already-settled Promises. The reach when wrapping a synchronous value to fit an async signature; rare in app code, common in framework adapters. Named once.

What this lesson does not cover:

- The `async`/`await` mechanics in depth (2.7.3).
- Cancellation (2.7.4).
- `try`/`catch` discipline and the `Result<T, E>` return shape (2.8.1).
- Authoring custom `AggregateError` subclasses. The default `AggregateError` is enough; 2.8.2 covers the broader custom-error story.
- Async iterators (`for await...of`). 2.7.3 owns the iteration shape.
- `Promise.try` (Stage 4 2026 — wraps a callback that may be sync or async into a Promise without throwing synchronously). Named in one line; not load-bearing in app code where the call sites are already `async` functions.

Pedagogical approach: Decision archetype with a small `Figure` (a comparison matrix). Open with the three-read scenario in prose to motivate the four-way cut. Show the four combinators as a tight comparison table (combinator / resolves when / rejects when / canonical trigger) — the table is the lesson's center of gravity because the differences are structural. Walk each combinator with one short labeled snippet using the user/org/invoices example, swapping one combinator at a time so the difference is concrete. The `Promise.race` entry gets one paragraph explicitly naming "the legacy timeout pattern is gone — `AbortSignal.timeout(ms)` in 2.7.4 owns it now." Walk `Promise.withResolvers()` with two adjacent code blocks: the legacy `let resolve; new Promise(r => resolve = r)` pattern and the modern `const { promise, resolve, reject } = Promise.withResolvers()` shape. Use a `Matching` exercise pairing six scenarios ("rendering what you can when some reads fail," "picking the fastest of two replica reads," "loading three resources where any failure should fail the page," "waiting for a user to click one of three buttons," "running cleanup after a Promise no matter how it settles," "two analytics endpoints — succeed if either works") to the right combinator or `withResolvers()`. Close with a short `script-coding` exercise: the student rewrites a `new Promise((resolve) => { ... })` wrapping an event handler into the `withResolvers()` shape.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.7.3 — `async`/`await`: parallel by default, sequential by dependency

Teaches the dependency-check reflex that picks `Promise.all` over consecutive `await`s when no data flows between them, the N+1 trap inside `.map(async ...)` with its bounded (`Promise.all`), unbounded (`pMap`), and database-batched fixes, `for await...of` for streams and paginated APIs, and the `return await` discipline that preserves stack traces.

Topics to cover:

- The senior question. The code reads `const user = await getUser(); const org = await getOrg(); const invoices = await getInvoices();`. Three sequential awaits, three round trips, total time is the sum. Each await is its own request — but the org and invoices reads don't depend on the user. The senior reads the code, notices no data flows from one to the next, and rewrites to `Promise.all`. The lesson installs that **dependency-check reflex** as the default reading of any block of consecutive awaits.
- The parallel-by-default rule, stated plainly. **If two awaits don't share data, they run in parallel.** The default rewrite shape: `const [user, org, invoices] = await Promise.all([getUser(), getOrg(), getInvoices()])`. Total time becomes `max(t1, t2, t3)` instead of `t1 + t2 + t3`. Same correctness, lower latency, no extra cost.
- The dependency check, stated as a question. **Does the next `await` need the previous one's value?**
  - **No.** Promote to `Promise.all`. The default.
  - **Yes.** Sequential is correct. Keep the awaits in order. Comment the dependency at the call site if it's non-obvious.
- The `Promise.all` destructuring shape, named once. `const [a, b, c] = await Promise.all([...])` — TypeScript infers a tuple from the array literal, so `a`, `b`, `c` get the right types in order. Senior watch-out: if the array is built dynamically, the inference widens to a union; in that case, the call site needs a typed signature on the function returning the array.
- The N+1 trap inside `.map(async ...)`. The canonical broken shape: `const results = items.map(async (i) => fetchOne(i.id))` — returns an array of Promises, the caller awaits the array, and the bundler issues every fetch in parallel. Three problems named.
  - **Unbounded parallelism.** A list of 500 items issues 500 concurrent requests. The downstream service rate-limits or falls over; the database's connection pool exhausts. The "parallel by default" rule has a ceiling.
  - **The await-in-loop variant.** `for (const i of items) { results.push(await fetchOne(i.id)) }` — sequential, slow, but at least bounded. The wrong fix for the wrong reason: it solves the rate-limit but at the cost of N times the latency.
  - **The hidden round trip.** Each `fetchOne` is a network call. The right fix in a data-fetch context is often a *single batched call* (`fetchMany([ids])` or `db.select().where(inArray(table.id, ids))`).
- The three correct fixes for `.map(async ...)`, named with the trigger.
  - **`Promise.all` over a bounded list.** The list size is small (< 10) and the calls are cheap. `await Promise.all(items.map((i) => fetchOne(i.id)))` is fine.
  - **`pMap` (from `p-map`) for bounded concurrency.** The list is large but the call site is the right place to fan out. `await pMap(items, (i) => fetchOne(i.id), { concurrency: 8 })` issues at most 8 concurrent calls and feeds the next as each completes. The senior reach when the work is genuinely independent and the throughput-vs-rate-limit trade is the call to make.
  - **Database batch.** If the work is N database reads, the right answer is one query: `db.select().where(inArray(table.id, items.map((i) => i.id)))`. Forward link to 6.4.2 (N+1) for the deeper treatment. Named here because the reflex is general — when N awaits in a loop are all hitting the same backend, the right fix is to ask the backend for the batch.
- `for await...of` — the async-iteration shape. Two canonical sites.
  - **Async iterators and streams.** Reading the body of a streaming response: `for await (const chunk of response.body) { ... }`. The iteration suspends between chunks; the surrounding `async` function yields to the event loop while the next chunk arrives.
  - **Paginated APIs.** Consuming a paginated iterator: `for await (const page of client.invoices.list())` — the SDK's `list()` returns an async iterable that fetches the next page on demand. The student gets bounded per-page work without writing the pagination loop.
  - The watch-out: `for await...of` is sequential. Inside it, every iteration waits for the previous. This is the right shape for streams and pagination (where order matters and parallelism would defeat the purpose) and the wrong shape for "process 500 independent items" (where `pMap` is the answer).
- `return await` — the stack-trace discipline. A one-line primer on the minimal shape used below: `try { … } catch (err) { … }` runs the `try` block and, if any awaited Promise inside rejects (or any synchronous `throw` fires), jumps to `catch` with the rejection reason bound as the block-scoped `err`; full treatment in 2.8.1. Two snippets.
  - **`return getX()`** — returns the Promise without awaiting it. The caller's stack frame is gone by the time the Promise rejects. The error's stack trace lacks the function that called `getX`.
  - **`return await getX()`** — awaits, then returns. The function's stack frame is alive when the rejection lands; the error trace includes the function name.
  - The senior rule: **inside a `try`/`catch`, `return await` is mandatory** (otherwise the `catch` doesn't catch the rejection). Outside a `try`/`catch`, the stack-trace difference still matters for debugging but the correctness is the same.
- The "fire-and-forget" pattern, named once. A function that kicks off async work it doesn't wait for: `void logEvent(...)` or `logEvent(...).catch((err) => log(err))`. The senior watch-out: an unhandled rejection from a fire-and-forget call still crashes the process; the explicit `.catch` is non-negotiable. Forward link to 13.1 (background work) for the durable version of "fire and forget" — most of the time, the right move is to enqueue to a job runner, not to drop a Promise on the floor.
- The `async` function signature, named in one paragraph. An `async` function always returns a `Promise<T>` (TypeScript infers `Promise` automatically). The function's `return` value is wrapped; the function's `throw` becomes a rejection. The student should never type-annotate the return as `T` when the function is `async` — the compiler refuses it, but newer students reach for the unwrapped type out of habit.
- Top-level await pattern, named in one line. Chapter 2.6.3 owns the decision (top-level await vs. lazy init). Here, the student should recognize that top-level `await` is legal in modules and reaches for it only on the senior-call cases from 2.6.3. No re-teaching.

What this lesson does not cover:

- Authoring the Promises themselves (2.7.2 owns the constructor and combinators).
- Cancellation (2.7.4).
- `try`/`catch` discipline and `Result<T, E>` (Chapter 2.8).
- The Drizzle batch-query API at depth (6.4.2).
- Node streams (`Readable`, `Writable`, pipelines). Niche; the chapter covers the Web Streams iteration via `for await...of` and stops there.
- React's `use(promise)` hook for unwrapping Promises in Server Components (Unit 4.9.7 and 5.3 own that).
- Concurrency primitives beyond `pMap` — semaphores, channels, work pools. Out of scope.

Pedagogical approach: Pattern archetype with two wrong-then-right beats. Open with the three-sequential-awaits snippet and the dependency-check reflex in prose — the student should feel the rewrite before the lesson states the rule. Show the `Promise.all` rewrite as the paired snippet; mark the before/after clearly. The N+1 trap gets the lesson's center: a `.map(async ...)` snippet that issues 500 concurrent fetches, framed as a production incident, followed by the three fixes (bounded `Promise.all`, `pMap`, database batch) in three adjacent code blocks with the trigger for each. Use a `react-coding` or `script-coding` exercise where the student is given a function that sequentially awaits four independent reads and rewrites it to `Promise.all`; tests verify that the total wait time is `max`, not `sum`. The `return await` discipline gets a paired snippet (the `try`/`catch` that doesn't catch) with one paragraph on the stack-trace consequence. Walk `for await...of` with one small streaming-response example. Close with a `Dropdowns` or `Buckets` exercise: given six scenarios ("read three independent resources," "process 500 items through a rate-limited API," "iterate a paginated SDK response," "fetch 5 records from the database," "stream a response body," "kick off an analytics ping without waiting"), the student picks the right shape (`Promise.all`, `pMap`, `for await...of`, single batch query, fire-and-forget with `.catch`). Optional `SandboxCallout` with a four-read function the student can play with to compare `Promise.all` vs. sequential timings via `performance.now()`.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.7.4 — Cancellation with `AbortController` and `AbortSignal`

Teaches the `{ signal }` parameter shape every modern web API speaks, the canonical user-cancel pattern with `AbortError` discrimination at the catch, `AbortSignal.timeout(ms)` as the 2026 replacement for `Promise.race` timeouts, and `AbortSignal.any([...])` for composing user-cancel, timeout, and shutdown signals into one.

Topics to cover:

- The senior question. A user types in a search box; each keystroke triggers a `fetch` for suggestions. The user types five characters in a second. Without cancellation, five requests fly out, five responses race back, and the slowest-but-latest response can clobber the fastest-and-newest result — the dropdown shows results for "rea" after "react" already arrived. The fix is to cancel the previous request when the next keystroke fires. The 2026 mechanism for that is `AbortController` and `AbortSignal`, and the student should leave the lesson knowing that every modern API — `fetch`, `setTimeout`, `addEventListener`, the AI SDK, Drizzle queries with the underlying driver, the Stripe SDK, Better Auth, every Server Action signature the course writes — accepts an `AbortSignal`.
- The two-part contract. Named once.
  - **`AbortController`** — the producer. The caller creates one (`const controller = new AbortController()`), holds the reference, and calls `controller.abort(reason?)` when it wants the operation to stop.
  - **`AbortSignal`** — the consumer's view. The controller exposes a `signal` property; the awaitable API takes `{ signal }` as an option. When the controller aborts, the signal's `aborted` becomes `true` and its `'abort'` event fires.
  - Why the split: the producer and the consumer are different parties. The producer (the React component, the parent function) decides *when* to cancel; the consumer (the `fetch`, the database driver) listens. The signal is a read-only view so a consumer can't trigger cancellation on someone else's controller.
- The `{ signal }` parameter shape, the 2026 convention. Every modern web/Node API that does any kind of async work takes a `signal` option. The canonical sites named in one paragraph.
  - `fetch(url, { signal })` — the call rejects with an `AbortError` when the signal fires.
  - `setTimeout(fn, ms, { signal })` (Node) and `AbortSignal.timeout(ms)` (universal) — the timer clears when the signal fires.
  - `addEventListener('click', fn, { signal })` — the listener is removed when the signal fires. Cleaner than `removeEventListener` for one-shot listeners.
  - `crypto.subtle.*` (the async crypto surface) — supports `signal` for long-running operations.
  - The Vercel AI SDK's `streamText({ abortSignal })`, Drizzle queries that pass `signal` to the underlying `pg` driver, the Stripe and Better Auth SDKs in 2026. The student doesn't need the full surface today; they need the reflex that **if an async function does I/O, it should accept and thread a `signal`**.
- The user-cancel pattern, the canonical shape. A small worked example: a search-suggestions function that takes a `signal` parameter and passes it through to `fetch`. The caller (the React component, taught in Unit 4) holds an `AbortController` ref, aborts the previous one on each keystroke, creates a new one for the new request, and calls the function with the new signal. The lesson teaches the *function shape* — the React wiring lands in Unit 4.9.2's effect-cleanup pattern.
- `AbortError` discrimination at the catch. A `fetch` that aborts rejects with a `DOMException` whose `name === 'AbortError'`. The senior reflex: at every catch around an abortable call, the first branch distinguishes the abort from a real failure.
  - **The shape.** The `try`/`catch` form introduced in 2.7.3 (full treatment in 2.8.1) wraps the abortable call: `catch (err) { if (err instanceof Error && err.name === 'AbortError') return; throw err }` — the abort is intentional; treat it as a no-op. Anything else is a real failure and should propagate.
  - The cross-realm `instanceof DOMException` gotcha lives in 2.8.2; here, name the `error.name` check as the portable form.
  - Why `name` and not `instanceof`: `DOMException` is a browser type; `AbortError` in Node (from `node:fs`, the `pg` driver, etc.) can be different concrete classes that share the `name`. The `name` check is the durable form across the SaaS stack.
- `AbortSignal.timeout(ms)` — the 2026 timeout pattern. A static factory that returns a signal that auto-aborts after `ms` milliseconds. The canonical shape: `fetch(url, { signal: AbortSignal.timeout(5000) })`. No controller to manage, no `Promise.race`, no `setTimeout`/`clearTimeout`/cleanup dance. One line. The lesson states once that **this is what replaces the legacy `Promise.race` timeout pattern from 2.7.2**.
- `AbortSignal.any([...signals])` — composition. The 2026 static factory that creates a signal which aborts when any of the input signals abort. The senior reach when a single operation needs to be canceled by *any of* user cancellation, timeout, or shutdown.
  - **The canonical SaaS shape:** `const signal = AbortSignal.any([userController.signal, AbortSignal.timeout(30_000), serverShutdownSignal])`. The fetch (or the AI stream, or the database query) aborts the moment any of the three sources fires. Forward link to 23.2.1 (AI streaming) where this composes user-cancel and stream-timeout.
- `AbortSignal.abort(reason?)` — the static factory for a pre-aborted signal. The reach: passing an already-aborted signal to skip the call entirely (a guard against starting work the caller already knows it doesn't want). Named in one line.
- Propagation discipline. Every `async` function in the chain that *does* I/O should accept `signal` and pass it through. A function that only awaits work it already kicked off doesn't need to thread the signal — but the moment it adds an I/O step, it does. The senior reflex: when authoring an async function, **the `signal` parameter is part of the signature, not an afterthought**. Forward link to 7.2 (Server Actions) where every action accepts and threads a signal.
- The cleanup contract — what cancellation guarantees and what it doesn't. Stated plainly.
  - **Guaranteed.** The signal's `'abort'` event fires; consumers that registered a listener (or used `{ signal }`) stop their pending work.
  - **Not guaranteed.** Work already completed isn't reversed. A database query that already wrote a row doesn't roll back because the signal aborted. The senior reflex: cancellation prevents *further* work, not work already done. For "undo what was done," the right tool is a transaction (Unit 6.4.4) or compensating action.
- The "Why not Promise cancellation?" aside, in one paragraph. Promises in JavaScript do not natively support cancellation — the design predates `AbortSignal`. The pattern in 2026 is that the *operation* is canceled via its signal, and the Promise the operation returned rejects with `AbortError`. The student should leave knowing that **the unit of cancellation is the work, not the Promise**.

What this lesson does not cover:

- The React-side wiring (effect cleanup, ref-held controllers, request deduplication). Unit 4.9.2 owns it.
- The Drizzle and `pg` cancellation specifics (Unit 6.4.4 names the connection-level effect briefly).
- Server-side request cancellation in Next.js (Server Actions, route handlers — Unit 7.2 and 7.5).
- The AI SDK's streaming cancellation contract (Unit 23.2).
- Background-job cancellation (`ctx.run.abortSignal` from Trigger.dev). Unit 13.1.5 owns it.
- Authoring custom abort reasons and reading `signal.reason`. Named in one line — `controller.abort(new Error('user-canceled'))` makes the reason readable in the catch; the deeper custom-error story is in 2.8.2.
- Polyfills for environments missing `AbortSignal.timeout` or `AbortSignal.any`. Both are universally supported in Node 22+ and modern browsers in 2026; no polyfill discussion.

Pedagogical approach: Pattern archetype. Open with the search-suggestions race condition in prose — a concrete production failure mode the student can picture. Show the controller/signal split as one small `ArrowDiagram` or annotated SVG (controller on one side, signal threaded through three consumers — a `fetch`, an `addEventListener`, an `AbortSignal.any` composition). Walk the canonical user-cancel shape as a labeled code block of a small `searchSuggestions(query, signal)` function and the caller pattern that creates a fresh controller per keystroke. The `AbortError` discrimination gets a tight paired snippet showing the catch with and without the `name === 'AbortError'` branch — the version without it logs "search failed" on every keystroke and the user sees the noise. Walk `AbortSignal.timeout(ms)` and `AbortSignal.any([...])` as two adjacent code blocks with the canonical SaaS shape (user signal + timeout + shutdown). Use a `script-coding` exercise where the student takes a function that does a `fetch` with no signal and refactors it to accept `signal`, pass it through, and discriminate `AbortError` at the catch. Tests verify that an aborted call rejects with `AbortError` and that the signal-less version leaks the request. Close with a `Matching` exercise pairing five scenarios ("user typed a new search query," "request taking longer than 30 seconds should fail," "server is shutting down, drain in-flight work," "one-shot event listener that auto-removes on cancel," "compose user-cancel and timeout into one signal") to the right `AbortController` / `AbortSignal.timeout` / `AbortSignal.any` / `{ signal }` listener move. Optional `SandboxCallout` with a working `fetch`/`AbortController` playground where the student aborts an in-flight request and watches the rejection land.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.7.5 — Quizz

Top 10 topics to quiz:

1. The three-part runtime model (call stack, microtask queue, macrotask queue) and the tick recipe that drains microtasks completely between macrotasks.
2. `await` as microtask-paced suspension: the code before the first `await` runs synchronously, the code after each `await` runs as a microtask, and a pre-resolved Promise does not skip the queue.
3. The Promise three-state model (pending, fulfilled, rejected) and the permanence of settled state that makes the combinators predictable.
4. The four combinators with the trigger for each: `Promise.all` (every result needed), `Promise.allSettled` (every result reported), `Promise.any` (first success), `Promise.race` (first settlement of any kind, with the note that `AbortSignal.timeout` replaces the legacy timeout use case).
5. `Promise.withResolvers()` as the modern replacement for the deferred-pattern boilerplate, with the canonical event-driven and externally-resolved sites.
6. The parallel-by-default rule: consecutive `await`s with no data dependency between them get rewritten to `Promise.all`, turning sum-of-latencies into max-of-latencies.
7. The N+1 trap inside `.map(async ...)` and the three fixes: bounded `Promise.all`, `pMap` with a concurrency cap, or a single batched query at the data-layer.
8. `for await...of` for sequential consumption of async iterables (streams, paginated SDK responses), with the watch-out that it's the wrong shape for independent parallel work.
9. `return await` inside a `try`/`catch` so the catch actually catches, and the stack-trace discipline that justifies it outside `try`/`catch` too.
10. The `{ signal }` parameter shape every 2026 API speaks, the `AbortError` `name`-based discrimination at the catch, and the canonical `AbortSignal.any([userSignal, AbortSignal.timeout(ms), shutdownSignal])` composition.

---

## Total chapter time

Roughly 150 to 190 minutes across the four content lessons plus the quiz. The chapter splits naturally across three evenings — 2.7.1 (the event loop and microtask queue) as a tight first sitting that earns its own evening because the mental model is load-bearing for everything after, 2.7.2 + 2.7.3 (Promises and `async`/`await` patterns) as the second sitting since they share the parallel-by-default rule, and 2.7.4 (cancellation) plus the quiz as the third. At the end the student can predict the execution order of any small async program, pick the right combinator for any "what counts as done" contract, reach for `Promise.withResolvers()` instead of the deferred-pattern boilerplate, rewrite sequential `await`s into `Promise.all` when no data flows between them, bound parallelism with `pMap` or pivot to a batched query, iterate streams and paginated APIs with `for await...of`, thread `AbortSignal` through every I/O call with `AbortSignal.timeout(ms)` and `AbortSignal.any([...])` as the composition reach, and discriminate `AbortError` at the catch. Chapter 2.8 lands on this floor and installs the error-channel discipline (throw vs. return, the `unknown`-in-catch narrow, custom domain errors) on top of the async substrate.
