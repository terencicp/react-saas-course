# Lesson 3 — `async`/`await`: parallel by default, sequential by dependency

## Title and sidebar

- **Title (h1):** `async`/`await`: parallel by default, sequential by dependency
- **Sidebar label:** Parallel by default

The chapter-outline title fits — it names the whole load-bearing reflex this lesson installs. Inline backticks on `async`/`await` for the h1 since they are literal keywords; the sidebar drops the slash form and shortens to the reflex itself for a scannable nav entry.

## Lesson framing

This lesson is a **Pattern archetype**. Lesson 1 installed the scheduler; lesson 2 installed the Promise contract and the four combinators. This lesson installs the **dependency-check reflex** — the senior reading of any block of consecutive `await`s that asks "does the next one need the previous one's value?" — and the handful of related patterns that ride on it: bounded fan-out for `.map(async ...)`, `for await...of` for streams and pagination, `return await` for stack-trace fidelity, and the "fire-and-forget with explicit `.catch`" hazard.

Pedagogical conclusions from brainstorming:

- **The lesson's center of gravity is the dependency-check reflex.** "Parallel by default, sequential by dependency" is a one-line rule but it inverts how a beginner reads `await`. Beginners read top-to-bottom and write three sequential `await`s because they look right; the senior reads and asks "is `org` derived from `user`?" and if not, rewrites. The lesson's first beat should let the student *feel* the rewrite before stating the rule — show the slow code, prompt the reading, then show the `Promise.all` shape. The wrong-then-right pattern is non-negotiable here.
- **The N+1 trap is the second center.** `.map(async ...)` looks like the obvious fan-out shape and silently blows past every rate limit. This is *the* production failure mode the lesson exists to prevent. Treat it as a production incident in framing, then walk the three fixes (bounded `Promise.all`, `pMap`, single batch query) with the trigger for each so the student picks the right one. Crucially the *first* fix isn't always parallelism — it's often "ask the backend for the batch."
- **`for await...of` covers two real sites and one trap.** Streams (a streamed `fetch` body) and paginated APIs (the typical SDK iterator). Both are genuinely sequential — order matters, and the next page can't be requested until the current page tells you the cursor. The trap is reaching for `for await...of` to "process N items in parallel" — that's `pMap`'s job. Frame the watch-out explicitly with the right alternative.
- **`return await` is a tight, two-snippet beat with one rule.** Inside a `try`/`catch`, `return await` is mandatory. Outside, it preserves stack-trace fidelity. Show both; state the rule once. Don't make this a whole h2; it's one sub-section.
- **Fire-and-forget is a hazard-naming beat, not a teaching beat.** Bare `someAsyncFn();` was named in lesson 2 as the unhandled-rejection hazard. This lesson installs the explicit `void someAsyncFn().catch((err) => log.error(err))` shape as the fix, and forward-links to chapter 066 for the durable answer (enqueue a job, don't drop a Promise on the floor). Do not turn this into a section about job runners.
- **The `async` function signature is one paragraph.** `async fn()` always returns `Promise<T>`. The student should not annotate the return type as `T` — TypeScript wraps it. Beginners coming from typed languages reach for the unwrapped type out of habit. One paragraph; no extensive treatment.
- **Top-level `await` is named in one line and forward-linked.** Lesson 3 of chapter 006 owned the decision. Here, recognize the shape, don't re-teach.
- **The `Promise.all` destructuring shape was named in lesson 2 as a combinator.** Here it earns its weight as the *rewrite target*. The lesson uses the same destructuring shape but the framing is different — lesson 2 said "this is what `Promise.all` returns"; this lesson says "this is what your sequential awaits become." Don't re-explain the destructuring; reach for it as a known pattern.
- **One real coding exercise.** A `ScriptCoding` refactor where the student rewrites four sequential `await`s into `Promise.all` and the tests verify total time is `max`, not `sum`. The exercise targets the reflex specifically. One bucketing exercise classifies six scenarios into the right shape (sequential, `Promise.all`, `pMap`, batch query, `for await...of`, fire-and-forget). One sandbox callout for free play.
- **No diagram for the dependency check itself.** It's a reading reflex, not a system — a Gantt-style timing visualization is the only kind of figure that adds value, and it earns its weight to *show* the sum-vs-max latency difference in one glance. Keep it small and HTML/CSS-based.
- **`Array.fromAsync` and `Promise.try` are out.** `Array.fromAsync` only hits Baseline Widely Available in July 2026 and the senior pattern for the cases it covers is still `pMap` for bounded concurrency or `for await...of` for sequential consumption. `Promise.try` was already cut in lesson 2. Mentioning either dilutes the lesson.
- **No video callout.** Lesson 1 already carries two on the event-loop model. The patterns in this lesson are reflex-shaped, not concept-shaped — code blocks and one timing figure do the work.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs.

- **The senior question, as code.** Show a small three-line snippet:

  ```ts
  const user = await getUser(userId);
  const org = await getOrg(orgId);
  const invoices = await listRecentInvoices(orgId);
  ```

  In prose: three sequential `await`s, three round trips, total time is the sum. Each is its own request. But notice — `org` doesn't need `user`, and `invoices` doesn't need either. The senior reads this code, runs the dependency check, and rewrites. This lesson installs that reflex.

- **Where this sits in the chapter.** One sentence: lesson 1 installed the scheduler, lesson 2 installed the Promise contract and the four combinators, this lesson installs the patterns — the dependency-check reflex, the N+1 trap, the streaming iteration shape, the stack-trace discipline.

### Parallel by default, sequential by dependency

Goal: install the dependency-check reflex as the default reading of any block of consecutive `await`s. Wrong-then-right.

Content structure:

- **The rule, stated plainly in one bold sentence.** **If two `await`s don't share data, they run in parallel.**

- **The dependency check, as a question.** Two-line tight bullet list:
  - **No data flow → promote to `Promise.all`.** The default.
  - **Yes → keep sequential.** Comment the dependency at the call site if it's non-obvious.

- **The rewrite, as a `CodeVariants` block** (two variants, before/after). `syncKey="dep-check"`.

  - **Before tab** (`label="Sequential"`): three sequential `await`s; total time `t1 + t2 + t3`. Tint with `data-mark-color="red"`.
  - **After tab** (`label="Promise.all"`): the destructuring shape from lesson 2; total time `max(t1, t2, t3)`. Tint with `data-mark-color="green"`.

  ```ts
  const [user, org, invoices] = await Promise.all([
    getUser(userId),
    getOrg(orgId),
    listRecentInvoices(orgId),
  ]);
  ```

  In the prose of the After tab: "Same correctness, lower latency, no extra cost. TypeScript infers a tuple from the array literal — `user`, `org`, and `invoices` keep their original types in order."

- **A small Gantt-style figure** that shows the timing difference visually. Plain HTML+CSS bars inside `<Figure caption="Sequential awaits stack; `Promise.all` overlaps.">`. Three colored bars per row, one row "Sequential" (bars head-to-tail) and one row "Promise.all" (bars stacked vertically, all starting at t=0). Width of each bar represents request latency. The pedagogical goal: the sum-vs-max difference is structural, not just numerical — one glance shows it. Keep the figure small (one screen height, no scroll).

  Author the figure as a simple HTML grid with bar widths set via inline styles; no engine needed. Wrap in `<Figure>`.

- **The dependency-yes case, one short snippet.** Show the case where the rule does *not* fire:

  ```ts
  const user = await getUser(userId);
  const invoices = await listInvoices(user.orgId); // needs user.orgId
  ```

  Prose: this is the legitimate sequential shape — `invoices` derives its argument from `user`. The senior rewrites the previous snippet but leaves this one alone.

- **Senior watch-out on dynamic arrays.** One sentence: if the input array to `Promise.all` is built dynamically (e.g. `ids.map((id) => getOne(id))`), TypeScript widens the tuple to a union and destructuring loses element-wise typing. In that case the caller takes the array form (`const results = await Promise.all(...)`) and lets element-wise typing flow from the array's mapper signature.

### The N+1 trap: `.map(async ...)`

Goal: name the canonical broken shape, frame it as a production incident, walk the three fixes.

Content structure:

- **The broken shape, as a code block with framing.** Show:

  ```ts
  const results = items.map(async (item) => fetchOne(item.id));
  const values = await Promise.all(results);
  ```

  Frame in prose: looks like the canonical fan-out shape. The bundler issues every `fetchOne` in parallel — and if `items` has 500 entries, that's 500 concurrent requests. Downstream service rate-limits, database connection pool exhausts, page never recovers. "Parallel by default" has a ceiling.

- **Name three failure modes** of the broken shape, as a tight unordered list:
  - **Unbounded parallelism.** 500 requests at once. Rate limits, pool exhaustion.
  - **The await-in-loop "fix" is worse.** `for (const i of items) { results.push(await fetchOne(i.id)) }` — sequential, slow, but at least bounded. Wrong fix for the wrong reason: trades latency for the rate-limit instead of solving both.
  - **The hidden round trip.** Each `fetchOne` is a network call. If the work is N reads against the same backend, the right answer is often a *single batched call*, not N parallel ones.

- **Three correct fixes, in a `CodeVariants` block** with three tabs (`label="Bounded list"`, `label="pMap"`, `label="Database batch"`). `syncKey="n-plus-one-fix"`. Each tab gets one code block and one prose paragraph naming the trigger.

  - **Bounded list with `Promise.all`.** Trigger: small list (under ~10), cheap calls. `await Promise.all(items.map((i) => fetchOne(i.id)))`. Fine.

  - **`pMap` with bounded concurrency.** Trigger: large list, work is genuinely independent, throughput-vs-rate-limit is the explicit trade.

    ```ts
    import pMap from 'p-map';
    const values = await pMap(items, (i) => fetchOne(i.id), { concurrency: 8 });
    ```

    Prose: issues at most 8 concurrent calls and feeds the next as each completes. Project default for bounded fan-out per `Code conventions.md` §Async.

  - **Database batch.** Trigger: N reads against the same backend. The right move is one query.

    ```ts
    const rows = await db
      .select()
      .from(invoicesTable)
      .where(inArray(invoicesTable.id, items.map((i) => i.id)));
    ```

    Prose: one round trip, one query, the right shape. Forward-link in one line to lesson 2 of chapter 039 (the N+1 chapter) for the deeper treatment — here we name the reflex: when N awaits all hit the same backend, ask the backend for the batch.

- **One `Aside type="caution"`** below the three fixes: the senior reflex is "look at `.map(async ...)` and ask what N could be." If N is bounded by UI (a list of 5 selected rows), `Promise.all` is fine; if N comes from user input or a paginated source, the answer is `pMap` or a batch query, never a bare `.map(async ...)`.

### `for await...of`: streams and pagination

Goal: install the right shape for sequential consumption of async iterables, with the watch-out about what it isn't for.

Content structure:

- **The two canonical sites,** as h3-free prose with one code block per site.

  - **Streaming response bodies.** A streamed `fetch` body is an async iterable of `Uint8Array` chunks. The iteration suspends between chunks; the surrounding `async` function yields to the event loop while the next chunk arrives.

    ```ts
    const response = await fetch('/api/export', { signal });
    if (!response.body) return;
    for await (const chunk of response.body) {
      processChunk(chunk);
    }
    ```

    One sentence on the `signal` parameter that threads through — full treatment in lesson 4.

  - **Paginated SDK iterators.** Most modern SDKs (Stripe, OpenAI, the AI SDK, the Vercel platform) expose paginated results as an async iterable that fetches the next page on demand. The student gets bounded per-page work without writing the pagination loop.

    ```ts
    for await (const invoice of stripe.invoices.list({ limit: 100 })) {
      await process(invoice);
    }
    ```

    Prose: under the hood, the iterator fetches one page, yields each item from that page, then fetches the next page when the current one's items run out. The cursor is the dependency that forces sequentiality — page 2 can't be requested until page 1 returns the cursor for it.

- **The watch-out, in one bold sentence then one paragraph.** **`for await...of` is sequential.** Inside it, every iteration waits for the previous. This is the right shape for streams and pagination (where order matters and parallelism would defeat the purpose) and the *wrong* shape for "process 500 independent items" — that's `pMap`'s job. The senior signal: if reaching for `for await...of` to fan out work, stop and ask whether the iterations are actually order-dependent.

### `return await` inside `try`/`catch`

Goal: install the stack-trace discipline. Tight, two-snippet beat. No h3 split.

Content structure:

- **The bug, as a `CodeVariants` block** with two tabs. `syncKey="return-await"`. Both tabs use the same surrounding `try`/`catch`.

  - **Before tab** (`label="The catch doesn't catch"`): tint red.

    ```ts
    async function loadUser(id: string) {
      try {
        return getUser(id); // missing await
      } catch (err) {
        log.error('loadUser failed', { err });
        throw err;
      }
    }
    ```

    Prose: returning the Promise without awaiting it. By the time the Promise rejects, `loadUser`'s stack frame is gone — the `catch` never runs because the rejection escapes the function before the `try` block resolves. The log line never fires.

  - **After tab** (`label="return await"`): tint green.

    ```ts
    async function loadUser(id: string) {
      try {
        return await getUser(id);
      } catch (err) {
        log.error('loadUser failed', { err });
        throw err;
      }
    }
    ```

    Prose: the function awaits, so its frame is alive when the rejection lands; the `catch` runs, the log line fires, and the function's name appears in the stack trace. Inside a `try`/`catch`, `return await` is mandatory.

- **One sentence on the outside-try case.** Outside a `try`/`catch`, the correctness is the same (the rejection propagates either way), but the stack trace still includes the function frame only with `return await`. Project default per `Code conventions.md` §Async: write `return await` consistently. The historical ESLint rule `no-return-await` is gone for this exact reason.

- **One short reminder of `try`/`catch` mechanics, as inline prose, not a section.** One sentence: a `try` block that contains an awaited Promise behaves as if the rejection were a synchronous `throw` — `catch (err)` binds the reason; full treatment of `err: unknown` narrowing and `Result<T, E>` lands in chapter 008. Forward-link, don't re-teach.

### The `async` function signature

Goal: one short paragraph plus one snippet. No exercise. Name the wrap-into-`Promise` rule so the student doesn't write the wrong return type.

Content:

- **One paragraph.** An `async` function always returns `Promise<T>`. TypeScript infers the wrap automatically. The function's `return value` becomes the Promise's fulfillment; the function's `throw` becomes the Promise's rejection. Forward-link in one sentence: if the function does I/O, it should also accept a `signal` — lesson 4 owns the parameter shape.

- **One small snippet** showing the inference, with a `CodeTooltips` annotation on the return value showing TypeScript inferred `Promise<User>` even though the function body returns a `User`:

  ```ts
  async function getUser(id: string): Promise<User> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }
  ```

  Tooltip on the return type: `Promise<User>` — the `async` keyword wraps the function's `User` return into a Promise; never annotate the return as the unwrapped `User`.

- **One sentence** on the top-level `await` shape: top-level `await` is legal in modules — recognize it; lesson 3 of chapter 006 already taught when to reach for it (over lazy init).

### Fire-and-forget, with an explicit `.catch`

Goal: one short paragraph + one snippet. Install the explicit shape; forward-link to chapter 066.

Content:

- **The hazard.** A bare `someAsyncFn();` call drops the Promise on the floor — if it rejects, Node 20+ crashes the process by default (lesson 2 named this).

- **The fix, two equivalent shapes.** `Code` block with both forms:

  ```ts
  void logEvent('signed-in', { userId }).catch((err) => log.error('logEvent failed', { err }));
  ```

  Prose: the `void` operator marks the dropped Promise as intentional (and satisfies the `no-floating-promises` lint rule); the explicit `.catch` keeps the rejection from crashing the process. Always pair them.

- **Forward-link to chapter 066, one sentence.** For work that needs durability (retries, observability, multi-step transactions), the answer is enqueuing a background job, not dropping a Promise on the floor. Chapter 066 owns that.

### Practice: pick the shape

Goal: lock in the six-way classification. One `Buckets` exercise, two-column layout.

Six buckets across two columns: `Promise.all` (sequential to parallel), `pMap` (bounded fan-out), `for await...of` (sequential consumption), single batched query, sequential `await` (real dependency), fire-and-forget with `.catch`.

Item scenarios (drop into the right bucket):

- "Render a page that needs the user, the org, and the recent invoices in parallel" → `Promise.all`
- "Process 500 user uploads through a rate-limited image API" → `pMap`
- "Iterate a paginated Stripe SDK response to total all invoices for the year" → `for await...of`
- "Fetch all line items for an order from the database" → batched query
- "Look up the user, then list invoices for the user's org" → sequential `await`
- "Stream a downloaded file's response body chunk by chunk" → `for await...of`
- "Read a row from cache, fall back to the database if missing" → sequential `await`
- "Fire an analytics ping after the user signs in, don't wait for it" → fire-and-forget with `.catch`

Eight items, six buckets — two of the buckets get two items, which keeps the exercise from looking like a 1:1 trivial mapping.

### Practice: rewrite to `Promise.all`

Goal: fingertip practice with the dependency-check reflex. One `ScriptCoding` exercise, vanilla runner.

Setup:

- **Starter code:** a function `loadDashboard(userId, orgId)` that does four sequential `await`s against fake helper functions provided in the starter (`getUser`, `getOrg`, `getRecentInvoices`, `getOrgMembers`). Each helper returns a Promise that resolves after a fixed delay (200ms each, simulated via `setTimeout`). None of the four needs the others' results — the dependency check passes on all four.
- **Task:** rewrite the function so all four reads run in parallel via `Promise.all`. Keep the function's return value the same shape (`{ user, org, invoices, members }`).
- **Tests:**
  - **Correctness:** the function returns the right shape with the right values.
  - **Latency:** the total time the function takes is closer to one helper's delay than to four. The test measures `performance.now()` before and after the call and asserts the elapsed time is under 400ms (well under the 800ms sequential would take but well above the 200ms a single helper takes — gives margin for system jitter).
  - **Structural:** the function body contains the substring `Promise.all` (so a student can't pass the latency assertion by removing `await`s and breaking correctness).

This is the lesson's one real coding exercise. Three asserts is enough.

### Free play: timing comparison

Goal: a sandbox the student can poke at to *feel* the latency difference. Optional, opens lazily.

Use a `SandboxCallout` linking to a small StackBlitz or CodeSandbox prefilled with two functions — `sequentialLoad()` and `parallelLoad()` — each wrapping the same four fake helpers, and a `console.time` / `console.timeEnd` around each call. The student runs both, reads the console, sees `sequential: ~800ms` vs `parallel: ~200ms`.

Label: `Open the timing playground`. One sentence in the slot: "Run both functions and watch the time difference — same work, different latency."

If hosting a prefilled StackBlitz is fiddly, fall back to a `SandpackCallout` with the four helpers inlined as a `dependencies` and `files` prop. Either works; the goal is "the student can play with it without leaving the page."

## `<Term>` candidates

Keep the budget tight — lessons 1 and 2 already carried `event loop`, `macrotask`, `microtask`, `Promise`, `settled`, `executor`, `AggregateError`. This lesson adds:

- **`unbounded parallelism`** — "Issuing many concurrent async operations with no cap on the number in flight. The default failure mode of `.map(async ...)` over a large list."
- **`backpressure`** — "When a consumer can't keep up with a producer. Bounded concurrency (`pMap` with `concurrency`) is the explicit fix; unbounded fan-out has none."
- **`N+1`** — "An anti-pattern where one query to list N parent rows is followed by N additional queries to fetch each child. The fix is usually a single batched query that joins or filters by an `IN` list."

Three tooltips, well below the usual budget for a 40-50min lesson.

## Scope

This lesson does **not** cover:

- **The microtask queue, the tick recipe, or `await`-as-microtask scheduling.** Lesson 1 of this chapter owns the runtime model. This lesson uses `await` freely but does not re-teach when its continuation runs. Forward-references to lesson 1's model land naturally in the `for await...of` section ("the iteration suspends, yielding to the event loop"); do not re-explain the queues.
- **Authoring raw Promises with the constructor or `Promise.withResolvers()`.** Lesson 2 owns Promise authoring. This lesson consumes Promises returned by platform APIs (`fetch`, Drizzle, `pMap`) and does not create new ones with `new Promise(...)` or `withResolvers`.
- **The four combinators in depth.** Lesson 2 owns the four-way cut. This lesson reaches for `Promise.all` as a *rewrite target* but does not re-introduce it — its trigger and failure mode were taught in lesson 2. `Promise.allSettled` and `Promise.any` are not used in this lesson's examples; `Promise.race` is not even named.
- **`AbortController`, `AbortSignal`, `AbortSignal.timeout`, `AbortSignal.any`, `AbortError` discrimination.** Lesson 4 owns cancellation. This lesson's `for await...of` example passes a `signal` through but does not teach the parameter shape, the abort flow, or the catch-side discrimination — those land in lesson 4 with the full treatment. One sentence acknowledges the signal threads through; nothing more.
- **`try`/`catch` mechanics in depth.** Chapter 008 owns the error channel. The `return await` section names `try`/`catch` only to demonstrate the stack-trace consequence; the lesson does not teach `err: unknown` narrowing, `instanceof Error` checks, `ensureError`, the throw-vs-return rule, custom domain errors, or the `Result<T, E>` shape.
- **The Drizzle batch-query API at depth.** Forward-linked in one line to lesson 2 of chapter 039. Here, the `inArray` shape is shown once as the right move; the full N+1 treatment (including joins, `relations`, and the Drizzle query builder's relational API) lands in chapter 039.
- **Background work, durable retries, job runners.** Forward-linked in one line to chapter 066. The fire-and-forget section installs the explicit `.catch` shape; it does not teach Trigger.dev, BullMQ, or any specific runner.
- **Node streams (`Readable`, `Writable`, pipelines).** Niche. The chapter covers Web Streams iteration via `for await...of` and stops there.
- **React's `use(promise)` hook for unwrapping Promises in Server Components.** Chapter 025 lesson 7 and chapter 031 own that.
- **`Array.fromAsync`.** Hits Baseline Widely Available in July 2026; the senior 2026 reach for the cases it covers is still `pMap` (bounded fan-out) or `for await...of` (sequential consumption). Not in this lesson.
- **`Promise.try`.** Stage 4 and out of scope per lesson 2's cut.
- **Concurrency primitives beyond `pMap` — semaphores, channels, work pools, `p-queue`.** Out of scope.
- **Generators and async generators (`function*`, `async function*`).** Niche for app code in 2026; consumers see async iterables from SDKs and `fetch` bodies but rarely author one. Out of scope.

## Code conventions alignment

Skimmed §Async, cancellation, and time and §TypeScript from `Code conventions.md`. Lesson code adheres to:

- **`async`/`await` uniformly.** No `.then` chains.
- **`Promise.all` for independent parallel awaits.** This is the lesson's rule.
- **Bounded concurrency via `pMap`** for fan-out over large lists. The lesson installs `p-map` as the project default per the conventions doc.
- **`return await` inside `try`** — taught explicitly in the lesson, matching the convention.
- **Arrow function form** for inline helpers; `async function` form for named functions in code blocks (matches the convention's preference for named declarations at module scope).
- **Inference at boundaries.** Generics on `Promise.all` are not annotated — the array tuple is inferred. Named `Promise<T>` return types appear only when authoring an exported function in the `async` signature section.
- **Single quotes, 2-space indent, trailing commas everywhere multiline, semicolons on.**
- **Drizzle example** uses `db.select().from(table).where(inArray(...))` per `Code conventions.md` §Data layer; column references use `inArray(table.col, [...])` rather than raw SQL.

One deliberate divergence from the conventions: the lesson's example call sites elide `'use server'` / `import 'server-only'` headers and the `{ signal }: { signal?: AbortSignal }` parameter shape from helper signatures. The reason: this lesson teaches `await` patterns, not module boundaries or cancellation. Adding those headers and signatures would distract from the dependency-check reflex and the N+1 trap. Lesson 4 will install the `{ signal }` shape with the full treatment; until then, the helper signatures stay bare. Downstream agents should not add them.
