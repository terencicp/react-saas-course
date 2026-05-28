# Lesson 2 — Promises: combinators and withResolvers

## Title and sidebar

- **Title (h1):** Promises: combinators and `withResolvers`
- **Sidebar label:** Promise combinators

The chapter-outline title fits — it names the two unrelated topics this lesson covers. Inline backticks on `withResolvers` for the h1 since it's a literal API name; the sidebar drops them (Starlight sidebar renders better without markup).

## Lesson framing

This lesson is a **Decision archetype**. Lesson 1 installed the scheduler (the microtask queue); this lesson installs the *contract language* the chapter rides on: a Promise is an immutable three-state thing, and there are exactly four ways to combine several of them into one result. The senior payoff is the reflex to read the question "what counts as done?" out of any caller before reaching for `Promise.all` by default.

Pedagogical conclusions from brainstorming:

- **The combinators are the lesson's center of gravity.** Four functions, structurally distinct, easy to mis-pick. The student's most common failure mode is reaching for `Promise.all` reflexively when the requirements are actually "render what you can" (`allSettled`) or "the first reply wins" (`any`). Build the lesson around the decision rule — what counts as "done?" — and let the trigger/failure-mode pair anchor each combinator.
- **A tight comparison table is the visual core.** Five columns (combinator / resolves when / rejects when / canonical trigger / failure mode) communicates the structural difference faster than any prose can. The table is the keeper; the prose around each combinator is just enough to make the table memorable.
- **Three-state model is vocabulary, not a section unto itself.** Pending / fulfilled / rejected gets named once in a tight definition list — the student needs the words to follow the combinator descriptions. Don't dwell. The permanence property (settled is forever) is the one non-obvious fact worth a sentence because it's why combinators are predictable.
- **The constructor earns one paragraph.** App code rarely authors raw Promises in 2026 — `fetch`, Drizzle, AI SDK, every platform helper already returns one. Name the `new Promise((resolve, reject) => ...)` shape briefly so the student recognizes it, then forward-pivot to `Promise.withResolvers()` as the modern shape when manual control is genuinely needed.
- **`Promise.race` needs a deprecation-shaped framing without saying "deprecated".** It's still standard, still useful for composing "first to settle wins" semantics with cancellation flags, but the legacy timeout use case is gone — `AbortSignal.timeout(ms)` from lesson 4 owns it. State this explicitly so the student doesn't carry the legacy pattern out of this lesson. This is the only forward-anchor that affects how a current combinator is taught.
- **`withResolvers()` is one of the small 2026 wins worth installing as a reflex.** Stage 4 / standardized in Node 22 LTS and all evergreen browsers. The `let resolve; const p = new Promise(r => { resolve = r; })` pattern is fragile, awkward to type, and historically the boilerplate that produced every project's hand-rolled `deferred()` helper. Replacing it with `const { promise, resolve, reject } = Promise.withResolvers()` is a one-line win — show the before/after explicitly.
- **The unhandled-rejection failure mode lives here.** Lesson 1 didn't name it, lesson 3 will assume it, chapter 008 lands the `try/catch` discipline on top. This lesson is the right place to install "every Promise this app creates is either awaited inside a try/catch, has a `.catch`, or is fed to a combinator that handles rejection." Node 20+ default crashes the process; the browser fires `unhandledrejection`. One paragraph, no fixes — that's chapter 008.
- **Chaining (`.then`) is the underlying form; `async`/`await` is its sugar.** Name `.then`/`.catch`/`.finally` exactly once and only to acknowledge they exist. The course writes `await` by default per the conventions doc. The two real carve-outs (returning a Promise from a wrapper that can't be `async`, and `.finally` cleanup from a non-async caller) get one sentence each so the student recognizes them in third-party code.
- **No history.** Skip jQuery deferreds, Bluebird, `q`. The "deferred pattern" gets named only because `withResolvers()` is its replacement — without the name, the student wouldn't recognize the legacy shape in older codebases.
- **One end-of-lesson `Matching` exercise that pairs scenarios to combinators or `withResolvers`.** The decision rule is what the student needs to walk out with. A short `ScriptCoding` exercise refactors a legacy `new Promise((resolve) => { ... })` wrapping an event-emitter handler into the `withResolvers()` shape — that's the only fingertip exercise the lesson needs.
- **No video callout.** Lesson 1 carries two; this lesson is decision-shaped and the comparison table does the heavy lifting. A combinators video would just restate the table.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs.

- **The senior question.** A page must fetch the user, the org, and the recent invoices. Three independent reads, one render. Pose four follow-ups in plain prose, no code:
  - What does the page do if one of them fails?
  - What if the user read is required but the invoices read is optional?
  - What if any of the three taking longer than 2 seconds should fail the whole render?
  - What if the org read has two replica URLs and either reply is fine?

  State that each question is a different combinator. The lesson installs the four-way cut so the student stops reaching for `Promise.all` reflexively.

- **Where this sits in the chapter.** One sentence: lesson 1 installed the scheduler; this lesson installs the contract the scheduler executes — a Promise as a permanent three-state value and the four ways to combine several into one.

### The three-state model

Goal: name the vocabulary so the combinator descriptions in the next section read fluently. Three definitions, one permanence sentence, done.

Content:

- **One framing sentence.** A Promise represents work that hasn't finished yet. It exists in one of three states, and the transition out of "not finished" is final.
- **Three tight definitions** as a plain markdown list. No diagram — this is vocabulary, not a system.
  - **Pending.** The work hasn't finished. No value, no reason yet.
  - **Fulfilled.** The work finished successfully. The Promise holds a value.
  - **Rejected.** The work finished unsuccessfully. The Promise holds a reason (an `Error`, by convention).
- **The permanence rule, one sentence.** Once a Promise transitions from pending to fulfilled or rejected, it stays in that state forever. This is what makes the combinators below predictable — every result is a value that can be inspected, never a moving target.
- **One paragraph on the constructor, named not taught.** `new Promise((resolve, reject) => { ... })` is the low-level shape that creates a pending Promise. In 2026 app code, you rarely write this directly — `fetch`, Drizzle queries, the AI SDK, every platform helper returns a Promise for you. The constructor still earns its weight in two places: wrapping a callback-style API into a Promise, and exposing resolvers for external resolution. The second case is what `Promise.withResolvers()` makes ergonomic; we'll get there.

`<Term>` candidates for this section (passed through the lesson's `<Term>` budget — keep it tight):
- *settled* — "A Promise that has transitioned out of pending. Either fulfilled with a value or rejected with a reason. Settled state is permanent."
- *executor* — "The function passed to `new Promise((resolve, reject) => { ... })`. It runs synchronously when the Promise is constructed. Its job is to call `resolve` or `reject` exactly once."

### The four combinators

The lesson's centerpiece. Goal: install the decision rule "what counts as done?" and pair each combinator with its trigger and its failure mode.

Structure:

- **Open with the decision question.** Bold sentence: **What counts as "done?"** Then a tight 4-line bulleted answer:
  - Every result needed → `Promise.all`
  - Every result reported, success or failure → `Promise.allSettled`
  - The first success, others discarded → `Promise.any`
  - The first settlement of any kind → `Promise.race`

  This is the senior takeaway distilled. The student should be able to recite this list out of the lesson.

- **The comparison table.** A plain markdown table — five columns, four rows. This is the lesson's reference asset; the student returns to it later.

  | Combinator | Resolves when… | Rejects when… | Trigger | Failure mode |
  | --- | --- | --- | --- | --- |
  | `Promise.all` | every input fulfills | any input rejects | every value needed, any failure = page fails | loses other results when one read fails |
  | `Promise.allSettled` | every input settles | never | render-what-you-can, per-item decisions | caller forgets to inspect each `status` |
  | `Promise.any` | first input fulfills | every input rejects (`AggregateError`) | redundant providers, replica reads | fast-but-wrong wins over slow-but-right |
  | `Promise.race` | first input settles (fulfilled or rejected) | first input settles with rejection | composing custom "first to settle" semantics | (see note below — legacy timeout pattern moved to lesson 4) |

  No `<Figure>` wrapper — a markdown table renders cleanly inline.

- **One subsection per combinator** as h3 headers below this section's h2. Each gets:
  - One paragraph naming the trigger in plain English.
  - A small labeled `Code` block using the user/org/invoices example, swapping one combinator at a time so the difference is concrete.
  - One paragraph on the failure mode.

  Use `CodeVariants` to group the four together with a `syncKey` for cross-page tab consistency. Each variant tab gets the same code skeleton with the combinator swapped — the student can flip tabs to see the structural difference. Inside each tab's prose: the trigger sentence + the failure mode sentence. This is a tighter shape than four separate code blocks and the side-by-side framing reinforces the decision rule.

  Code skeleton each variant uses (real-feeling but bare):

  ```ts
  const [user, org, invoices] = await Promise.all([
    getUser(userId),
    getOrg(orgId),
    listRecentInvoices(orgId),
  ]);
  ```

  Variant tabs:
  - **`Promise.all`** — the destructuring shape, total time `max(t1, t2, t3)`. Trigger: every value needed. Failure: a single rejection drops the other two values on the floor.
  - **`Promise.allSettled`** — array of `{ status: 'fulfilled', value } | { status: 'rejected', reason }`. The render-what-you-can shape. Show one short post-call pattern that destructures the array and decides per-item; do not teach exhaustive narrowing — that's chapter 008.
  - **`Promise.any`** — first fulfillment wins. Show two replica URLs as the input. Mention `AggregateError` in one line — it carries all rejection reasons in `.errors`. Frame the narrow reach explicitly: "this is a power tool for genuine redundancy, not for normal parallel reads."
  - **`Promise.race`** — first settlement (success *or* failure) wins. State plainly: **the legacy timeout pattern (`Promise.race([fetch(...), timeoutPromise])`) is gone**; `AbortSignal.timeout(ms)` in lesson 4 owns that use case now. `race` still earns its weight when composing custom "first to settle" semantics with a cancellation flag, but reach is narrow.

  This is the only place the lesson breaks into h3 subheaders. Four h3s here are content-driven (one per combinator) and earn their weight.

### `Promise.withResolvers()` — the modern deferred pattern

Goal: install `Promise.withResolvers()` as the senior reflex for the two cases where the constructor's executor is awkward. Before/after framing.

Content:

- **The senior trigger.** Two cases where you need to resolve a Promise from outside the executor:
  - **Event-driven flows.** A socket emits a `message` event and the caller wants a Promise that resolves on the next message. The handler-installation code lives at the caller's level, not inside the executor.
  - **External resolution.** A test fixture, a request-deduplication cache, a once-and-only-once "first-load" gate — the Promise is created in one place and resolved in another.

- **The legacy pattern, in a `CodeVariants` "before / after" block.**

  - **Before tab** (`label="The deferred boilerplate"`): the classic shape.

    ```ts
    let resolve: (value: Message) => void;
    let reject: (reason: Error) => void;
    const promise = new Promise<Message>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    socket.once('message', resolve!);
    socket.once('error', reject!);
    return promise;
    ```

    Prose: this works because the executor runs synchronously, but it's fragile — the non-null assertions, the dangling `let`s, the executor-as-assignment-trick.

  - **After tab** (`label="Promise.withResolvers()"`): the 2026 shape.

    ```ts
    const { promise, resolve, reject } = Promise.withResolvers<Message>();
    socket.once('message', resolve);
    socket.once('error', reject);
    return promise;
    ```

    Prose: same semantics, no `let`, no executor, no non-null assertions. The `resolve` and `reject` are values bound at destructure time. This is the deferred pattern, standardized.

  Use `data-mark-color` to tint each variant — red for the legacy pattern's hand-rolled boilerplate, green for the modern shape.

- **One paragraph on availability.** `Promise.withResolvers()` is Stage 4 / standardized — Node 22 LTS and every evergreen browser ship it natively in 2026. No polyfill, no flag.

- **Don't overreach.** The combinators-vs-`withResolvers` cut: combinators compose Promises that already exist; `withResolvers` is for *authoring* a Promise that an external event will settle. App code reaches for it sparingly; if a platform API already returns a Promise, use that.

### Chaining (`.then`/`.catch`/`.finally`), named for recognition

Goal: name the underlying mechanism in one paragraph so the student recognizes it in third-party code, then forward-pivot to `await` as the project default.

Content:

- **One paragraph.** Every Promise exposes three instance methods: `.then(onFulfilled, onRejected?)`, `.catch(onRejected)`, and `.finally(onSettled)`. `async`/`await` is sugar over `.then` — the code after each `await` is what `.then` would have received as `onFulfilled`. The course writes `await` by default; lesson 3 owns the patterns.
- **One sentence on the two real carve-outs** where `.then` still earns its weight in modern code:
  - Returning a Promise from a function that immediately transforms its result, when wrapping for an API surface where adding `async` would change the signature (`fn().then((x) => x.id)`).
  - `.finally(...)` cleanup from a caller that doesn't want to mark itself `async`.

  Beyond those, `await`. Do not show a `.then` chain example — the student already saw `.then` callbacks scheduled as microtasks in lesson 1.

### Unhandled rejections

Goal: install the rule "every Promise has a handler" without re-teaching `try/catch`. Forward-link to chapter 008 for the discipline.

Content:

- **What goes wrong.** A Promise that rejects with no `.catch`, no surrounding `try/catch` around an `await`, and no combinator that handles rejection is an *unhandled rejection*. The runtime decides what to do — and the default has teeth.
- **Runtime behavior, named once.** In Node 20+ (course-pinned Node 24), the process crashes by default on unhandled rejection. In the browser, `window` fires `unhandledrejection` — the page doesn't crash but the error vanishes silently unless something listens. Both are bad defaults to bump into.
- **The senior reflex, stated as a rule.** Every Promise this app creates is one of:
  - awaited inside a `try`/`catch`,
  - has a `.catch` attached, or
  - fed to a combinator whose rejection branch you've thought about (`allSettled`, `any`).

  Forward-link in one line to lesson 1 of chapter 008 for the throw-vs-return discipline that decides which branch handles which rejection.

- **One small `Aside type="caution"`.** Naming the canonical "fire and forget" trap that lesson 3 will revisit: `someAsyncFn();` — a bare call that drops the Promise on the floor. If it rejects, the process crashes (Node) or the error disappears (browser). The fix is `void` + explicit `.catch` or, more usually, awaiting it. Don't teach the pattern in depth here — lesson 3 owns it. This is a hazard-naming aside, nothing more.

### A note on `Promise.resolve()` and `Promise.reject()`

Goal: one short paragraph, no h3. Name them because the student will see them in framework code.

Content:

- **`Promise.resolve(value)`** returns a Promise already fulfilled with `value`. **`Promise.reject(reason)`** returns one already rejected with `reason`. The reach: wrapping a synchronous value to fit an async signature in framework adapters and test helpers. App code rarely reaches for either.
- One line tying back to lesson 1: a `Promise.resolve()` continuation still schedules as a microtask. It does not run synchronously. The student saw this in lesson 1's canonical interleaving.

### Practice: pick the combinator

Goal: lock in the decision rule by pairing scenarios to combinators.

Use a `Matching` exercise (six pairs is the comfortable max). Scenarios on the left, the right shape on the right:

- "Three independent reads, page fails if any of them fails" → `Promise.all`
- "Three reads, render whatever succeeded — show a per-item error for the rest" → `Promise.allSettled`
- "Two analytics endpoints — fire to both, succeed if either accepts" → `Promise.any`
- "Two replica URLs for a read — use whichever replies first with a value" → `Promise.any`
- "Wait for the user to click one of three dialog buttons" → `Promise.withResolvers()`
- "Subscribe to a socket; expose the next inbound message as a Promise" → `Promise.withResolvers()`

Six entries — one decoy is the absence of `Promise.race`, which the student should not pick for any of these. (If the student looks for `race` to pair with the analytics scenario, the `any` framing in the previous section taught them otherwise.)

### Practice: refactor to `withResolvers()`

Goal: fingertip practice with the modern shape. One `ScriptCoding` exercise, vanilla runner.

Setup:
- **Starter code:** a small function `nextMessage(socket)` that wraps an `EventEmitter`-style `socket.once('message', ...)` / `socket.once('error', ...)` into a Promise, using the legacy `let resolve; let reject; const p = new Promise(...)` boilerplate. The starter intentionally has the dangling `let` declarations and the executor-as-assignment shape.
- **Task:** rewrite it using `Promise.withResolvers()`. Same observable behavior; cleaner shape.
- **Tests:** a tiny mock `socket` (provided in the starter as a fake `EventEmitter`) emits a message; the function's returned Promise should fulfill with the message value. A second test emits an `error`; the Promise should reject. A third test confirms the function's *body* contains the substring `Promise.withResolvers` (so the refactor actually happened — without this, a student could pass the behavioral tests by leaving the legacy shape in place).

The exercise targets the refactor specifically. Tests are short — three asserts is enough.

## Scope

This lesson does **not** cover:

- **The microtask queue, `await` scheduling, or the event-loop tick recipe.** Lesson 1 of this chapter owns the runtime model. This lesson treats Promises as already-scheduled objects whose `.then` continuations are microtasks. The student already knows that from lesson 1; do not re-teach.
- **`async`/`await` patterns at depth — the parallel-by-default rule, the N+1 trap, `for await...of`, `return await`.** Lesson 3 of this chapter owns them. This lesson uses `await` in code examples (the chapter project defaults to `await`) but does *not* teach the dependency-check reflex or the `Promise.all` rewrite — even though `Promise.all` is taught here as a combinator. The dependency-check angle is lesson 3's payoff; here, `Promise.all` is one combinator among four.
- **`AbortController`, `AbortSignal`, `AbortSignal.timeout`, `AbortSignal.any`.** Lesson 4 of this chapter owns cancellation. This lesson references `AbortSignal.timeout(ms)` exactly once — in the `Promise.race` section — to explain why the legacy timeout pattern is gone. No other coverage.
- **`try`/`catch` discipline, `Result<T, E>`, the `unknown`-in-catch narrow, custom domain errors.** Chapter 008 owns the error channel. This lesson names unhandled rejections and the senior reflex ("every Promise has a handler") but does *not* teach the `try`/`catch` mechanics, `instanceof Error` narrowing, or the throw-vs-return rule.
- **Authoring custom `AggregateError` subclasses.** Lesson 2 of chapter 008. Here, `AggregateError` is mentioned in one line as what `Promise.any` rejects with when all inputs reject; its `.errors` array is named once.
- **`Promise.try`.** Stage 4 wraps a sync-or-async callback into a Promise without throwing synchronously. Not load-bearing in app code where call sites are already `async`. Out of scope; not even named.
- **Async iterators (`for await...of`).** Lesson 3 owns the iteration shape — Promises and async iterables are different surfaces; this lesson stays on Promises.
- **Promise cancellation as a concept** ("why don't Promises cancel?"). Lesson 4 owns the answer (the unit of cancellation is the work, not the Promise). Don't preview here.
- **TypeScript's `Awaited<T>` utility type.** Niche; the student rarely reaches for it directly. Out of scope.
- **The legacy ecosystem.** No Bluebird, no jQuery deferreds, no `q`, no `util.promisify`. The deferred pattern is named only because `withResolvers()` is its replacement.

## Code conventions alignment

Skimmed §Async, cancellation, and time and §TypeScript from `Code conventions.md`. Lesson code adheres to:

- **`async`/`await` uniformly** in examples; `.then` only in the "named for recognition" paragraph and the one `.finally` carve-out sentence.
- **Arrow function form** bound to `const` for the combinator example callers.
- **Inference at boundaries**: typed `Promise.withResolvers<Message>()` generic at the call site (the example needs the type for the resolver shape); intermediate values inferred.
- **No `any`**; the `withResolvers()` example uses a named `Message` type for the generic.
- **Single quotes**, 2-space indent, trailing commas everywhere multiline, semicolons on.

One deliberate divergence: the example call sites elide `'use server'` / `import 'server-only'` headers because the code blocks are about Promise mechanics, not Next.js module boundaries. Downstream agents should not add those — they would distract from the lesson's topic.
