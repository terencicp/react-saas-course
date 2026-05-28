# Lesson 1 — The event loop and the microtask queue

## Title and sidebar

- **Title (h1):** The event loop and the microtask queue
- **Sidebar label:** Event loop & microtasks

The chapter-outline title fits — it names the runtime model the lesson installs. Keep it.

## Lesson framing

This lesson is a **Concept archetype** with a custom interactive widget at the core. It opens Chapter 007 and lays the substrate every subsequent lesson rides on: the runtime model that determines what runs next. The senior payoff is the ability to read any small async program — `await`, `setTimeout`, `queueMicrotask` interleaved — and trace the output tick by tick without guessing.

Pedagogical conclusions from brainstorming:

- **The model has three moving parts, so the lesson needs a moving picture.** A static diagram of "call stack, microtask queue, macrotask queue" can label the three boxes but cannot show the cause-and-effect of one tick flushing both queues. The lesson commits a custom step-through widget as the central asset. The widget is *the* lesson — the prose around it explains what the student is looking at, but the student's mental model is built by clicking through ticks.
- **Open with the puzzle, refuse to answer it until the model lands.** Per the chapter-outline pedagogical brief, the four-line `'a'/'b'/'c'/'d'` program goes at the top and the student should *feel* the gap. Do not show the predicted output up front. The student's curiosity carries them through the model section; the resolution is the satisfaction at the end.
- **Three-part model, named once each, then used.** Call stack, microtask queue, macrotask queue. The names are vocabulary — define them tightly so they stop being a hurdle. The tick recipe is the *behavior*; the queues are the *furniture*. Teach the furniture first, walk the behavior on it.
- **`await` reframed as scheduling, not blocking.** Newer students read `await` as "the function pauses on this line." The correct mental model — "the function returns immediately; the continuation is scheduled as a microtask when the awaited Promise settles" — is the single biggest reframing this lesson does. State it three times in three contexts (synchronous run before the first `await`; a `setTimeout(..., 0)` cannot beat an `await` of a pre-resolved Promise; an `async` function with no `await` still returns a Promise).
- **Beginners' biggest trap: assuming pre-resolved Promises skip the queue.** State this explicitly once so the student doesn't carry the misconception out of the lesson. The widget's canonical trace lands on this exact case — a `Promise.resolve()` continuation runs as a microtask, not synchronously.
- **The performance reflex earns one paragraph, not a section.** "A long microtask chain blocks rendering and I/O" is the senior takeaway the model implies. Name it; forward-link to Unit 19; do not pretend this lesson teaches scheduling.
- **Node specifics in one short paragraph, not a section.** `process.nextTick` and `setImmediate` exist; `process.nextTick` recursion can starve the loop; app code reaches for `setTimeout` for macrotasks and never `process.nextTick`. Browser-vs-Node split: the microtask/macrotask model is universal. Anything deeper (Node phases — timers/pending/poll/check/close) gets a single-sentence completeness note.
- **Two exercise beats — predict the order, then quiz the consequences.** `PredictOutput` for three short programs of increasing complexity, then a `TrueFalse` round on the three consequences of "`await` is a microtask scheduler." No sandbox — the widget is the play surface.
- **Connect to lesson 2 forward.** Lesson 2 owns Promise authoring and the four combinators; this lesson treats Promises as already-created objects whose `.then`/`await` continuations schedule on the microtask queue. Don't preview combinators here; their existence is enough.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs.

- **The senior question.** Show the four-line prediction program inline, then refuse to answer it: "Trace this program in your head and write down the output order. We'll come back to this — by the end of the lesson you should be able to walk anyone through *why* it's the only possible order, no guessing."

  ```js
  console.log('a');
  Promise.resolve().then(() => console.log('b'));
  setTimeout(() => console.log('c'), 0);
  queueMicrotask(() => console.log('d'));
  ```

  Code component: plain `Code` (Expressive Code). No `PredictOutput` here — that would close the loop before the model is taught. The question hangs.

- **One-sentence chapter framing.** Chapter 007 is about predicting and shaping async execution; this lesson installs the runtime model the rest of the chapter rides on. The student leaves able to read any program that mixes `await`, `setTimeout`, and `queueMicrotask` and write down the output without running it.

### The three-part runtime

The first technical beat. Goal: install the vocabulary — call stack, microtask queue, macrotask queue — as named furniture the rest of the lesson points at.

Content:

- **One framing sentence.** JavaScript runs on a single thread. The runtime decides what runs next using one stack and two queues — a structure called the event loop. The three pieces are named individually because their rules are different.
- **Three tight definitions.** Use a small custom HTML+CSS figure (three labeled boxes, horizontal, captioned) wrapped in `<Figure>` — *not* a Mermaid diagram. This is annotated-illustration shape per `documentation/diagrams/INDEX.md`. The figure is just the labeled vocabulary; the dynamics come in the widget below.
  - **Call stack.** Where synchronous code runs, top to bottom. Functions push frames on call, pop on return. Nothing else runs while the stack is non-empty.
  - **Microtask queue.** Promise continuations (`.then` callbacks, the code after each `await`) and `queueMicrotask(fn)` callbacks. **Drained completely between every two macrotasks.**
  - **Macrotask queue (the "task" queue).** `setTimeout`, `setInterval`, I/O completion, message events, user input. **One task per tick.**
  - The figure's caption should say one line: "The call stack drains synchronous code; between macrotasks the microtask queue is drained completely."
- **The asymmetry, named.** One sentence: macrotasks are processed *one per loop iteration*; microtasks are processed *until the queue is empty*. This is the single most load-bearing fact in the lesson — a microtask scheduled by another microtask runs in the same drain.

`<Term>` candidates introduced in this section:
- *event loop* — "The runtime mechanism that picks the next chunk of work to run: one macrotask, then a full drain of the microtask queue, then optionally render, then the next macrotask."
- *macrotask* — "A unit of work scheduled via `setTimeout`, `setInterval`, I/O completion, message events, or user input. Processed one per event-loop iteration."
- *microtask* — "A continuation scheduled by a settled Promise, an `await` resumption, or `queueMicrotask`. Microtasks drain completely between two macrotasks."

### The tick recipe

The behavior on top of the furniture. Goal: state the loop as a four-step algorithm the student can execute on paper.

Content:

- **The algorithm, as a `<Steps>` list.** Use the Starlight `<Steps>` component (this is a numbered procedure the student follows in order — exactly its purpose).
  1. **Run one macrotask to completion.** The script's initial evaluation counts as the first macrotask. Synchronous code pushes and pops frames on the call stack until the stack is empty.
  2. **Drain the microtask queue.** Run every microtask one after another. If a microtask schedules another microtask, that one runs in this same drain — the queue is fully empty before the loop moves on.
  3. **(Browser only) Render, if it's time.** The renderer can opt to paint between macrotasks. The course doesn't depend on the exact policy; just know it lives here.
  4. **Pick the next macrotask. Go to 1.**
- **One paragraph naming the cost.** The recipe is why a runaway microtask chain blocks rendering, I/O, and every other task. Forward link to Unit 19 in one sentence ("how to bound long work — yielding via `setTimeout(..., 0)` or `MessageChannel` — lands when scheduling depth earns its keep"). Do not teach yielding here.

### Walking one tick: the canonical interleaving

The lesson's center of gravity. The interactive widget plays a single canonical program tick by tick.

Custom component to build: **`EventLoopWalker.astro`** under `src/components/lessons/007/1/`.

- **UI shape.** Four side-by-side panels, fixed-width grid (responsive to single column under narrow viewports if needed):
  1. **Source program.** A short code listing with a highlighted "current line" indicator.
  2. **Call stack.** A vertical box that shows pushed frames (top entry = topmost frame). Empty when no synchronous code is running.
  3. **Microtask queue.** A horizontal list of pending microtasks (FIFO, leftmost = next to run). Items have short labels like `then(log b)`, `resume f after await`.
  4. **Macrotask queue.** A horizontal list of pending macrotasks (FIFO). Items like `setTimeout(log c)`, `setTimeout(log macro)`.
  5. **Console.** A bottom panel that accumulates output lines as the program logs.

- **Controls.** A "Next tick" button advances one *step* of the algorithm. A "Previous" button reverses one step (state is fully reconstructible — the widget holds a pre-baked array of step snapshots). A "Reset" button returns to step 0. A small step counter "Step N / total". A short prose label above the controls explains the current step (e.g., "Synchronous: `console.log('a')` pushes onto the stack and runs.").

- **The program the widget plays.** Match the chapter outline's canonical interleaving, lightly normalized for the widget:

  ```js
  console.log('sync 1');

  setTimeout(() => console.log('macro'), 0);

  queueMicrotask(() => console.log('micro'));

  const f = async () => {
    console.log('sync 2');
    await Promise.resolve();
    console.log('micro 2');
  };
  f();

  console.log('sync 3');
  ```

  Expected output: `sync 1`, `sync 2`, `sync 3`, `micro`, `micro 2`, `macro`.

- **Step granularity.** Each click advances one *meaningful* event-loop step. A non-exhaustive trace of the steps the writing agent should bake into the snapshot array:
  1. Start. Source highlighted at the top; all queues empty.
  2. Run `console.log('sync 1')`. Console: `sync 1`.
  3. Run `setTimeout(...)`. Macrotask queue gains `setTimeout(log macro)`.
  4. Run `queueMicrotask(...)`. Microtask queue gains `queueMicrotask(log micro)`.
  5. Call `f()`. Stack pushes `f`. Console: `sync 2` (synchronously before the `await`).
  6. Hit `await Promise.resolve()`. `f` suspends; its continuation is queued as a microtask: `resume f`. Stack pops `f`. Microtask queue: `[queueMicrotask(log micro), resume f]`.
  7. Run `console.log('sync 3')`. Console: `sync 3`. Top-level script's macrotask is done.
  8. Begin microtask drain. Run `queueMicrotask(log micro)`. Console: `micro`. Microtask queue: `[resume f]`.
  9. Continue drain. Run `resume f` — executes `console.log('micro 2')`. Console: `micro 2`. Microtask queue: `[]`.
  10. Microtask drain complete. (Optional render.) Pick next macrotask: `setTimeout(log macro)`. Console: `macro`. Macrotask queue: `[]`.
  11. Done.

- **Pedagogical accents.** The step label for step 6 must explicitly call out "`f` returned from the stack; the code *after* `await` is now a queued microtask." This is the single most important step of the trace and the moment the model clicks for the student. Steps 8–9 should be visibly grouped as "microtask drain (one continuous beat)" so the student sees they belong to the same loop iteration.

- **Implementation hints for the building agent.** Render as static HTML with `data-step="N"` attributes on alternative-state elements; a small inline `<script>` swaps the visible step on button clicks. Keep state changes purely in DOM class toggles (no framework). Color tokens consistent with prior lesson widgets — pick a palette that reads in both themes. The widget is bounded in height (cap around 500px including controls) — vertical-space constraint per `documentation/diagrams/INDEX.md`.

- **Prose around the widget.** One paragraph before introducing the program, one paragraph after walking through it. The "after" paragraph: name the three things the student should notice — (1) all synchronous code ran before any queued continuation; (2) every microtask ran before the timer; (3) the `await` of a pre-resolved Promise still scheduled a microtask — it did **not** continue inline. Forward to the next section.

### `await` is microtask-paced, not blocking

This is the conceptual payload — the single biggest reframing for newcomers. Goal: install the correct mental model for `await` and head off the most common misconceptions.

Content:

- **The one-line headline.** State it verbatim: **`await p` does not block the thread. It pauses the surrounding `async` function and schedules its continuation as a microtask when `p` settles.**
- **Three consequences, each with one short snippet.** Use plain `Code` blocks (no `AnnotatedCode` — each consequence is its own short snippet, and they are conceptually separate beats).

  - **Consequence 1: code before the first `await` runs synchronously.**

    ```ts
    const greet = async () => {
      console.log('inside, before await');
      await Promise.resolve();
      console.log('inside, after await');
    };

    console.log('before call');
    greet();
    console.log('after call');
    ```

    Output: `before call`, `inside, before await`, `after call`, `inside, after await`. Prose: the `greet()` body up to the `await` runs synchronously on the caller's stack; the function then returns a pending Promise and the caller continues. The "after await" line runs as a microtask, after the synchronous tail of the caller finishes.

  - **Consequence 2: a pre-resolved Promise does *not* skip the queue.** This is the misconception trap, named explicitly.

    ```ts
    setTimeout(() => console.log('macro'), 0);
    Promise.resolve().then(() => console.log('micro'));
    console.log('sync');
    ```

    Output: `sync`, `micro`, `macro`. Prose: even though the Promise is already resolved when `.then` runs, the continuation is *still* scheduled as a microtask — never invoked inline. This is what guarantees the loop's drain order and what makes a `setTimeout(..., 0)` never beat an awaited resolved Promise.

  - **Consequence 3: an `async` function with no `await` still returns a Promise.**

    ```ts
    const f = async () => 42;

    const result = f();
    console.log(result); // Promise { 42 }
    console.log(await result); // 42
    ```

    Prose: the function body ran synchronously, but the return value is wrapped in a Promise. The resolution lands on the microtask queue.

- **`queueMicrotask(fn)` — the explicit microtask scheduler.** One short paragraph.
  - What it does: schedules `fn` to run at the next microtask point, after the current synchronous code but before any pending macrotask.
  - When seniors reach for it: rare in app code. The senior reach is in library code that batches work (state libraries scheduling subscribers, the React scheduler internally) — when a callback needs to run "after this synchronous work but before any rendering or I/O" and the caller doesn't want the overhead of a settled Promise.
  - The rule of thumb: **recognize it in library code; do not reach for it in app code.** The course's app surface uses `await` and `Promise` combinators (lesson 2 of chapter 007) and never reaches for `queueMicrotask` directly.

### Node specifics

One short section — single h3 under the previous h2 would be wrong because the topic shift is real. Goal: cover the universal-vs-runtime split in one beat so the student isn't surprised by `process.nextTick` or `setImmediate` in Node code later.

Content as one paragraph of prose plus one `<Aside type="caution">`:

- **The universal model.** Everything taught so far (call stack, microtask queue, macrotask queue, the tick recipe, `await` as microtask scheduling) holds in both Node and the browser.
- **The Node-only extras, named.** Node has `process.nextTick(fn)` — a sub-queue that drains *before* the microtask queue on each tick (Node-specific) — and `setImmediate(fn)` — a separate macrotask family that fires *after* I/O callbacks (Node-only).
- **The Aside (caution).** `process.nextTick` recursion starves the event loop: a callback that calls `process.nextTick` again will keep the loop pinned in the next-tick drain and never run any I/O or timer callback. App code in this course reaches for `setTimeout(fn, 0)` when it needs a macrotask and never for `process.nextTick`. `setImmediate` is library territory (Node internals, some test runners) — name-recognize, don't reach for.
- **Phases, one sentence.** Node's event loop has explicit phases internally (timers, pending callbacks, poll, check, close) — the course's app code does not depend on the phase split. Mention for completeness; do not teach.

### The puzzle, resolved

A short closing section that revisits the opening prediction program and confirms the student can now trace it.

Content:

- Repeat the four-line opening program.
- Use a `<PredictOutput>` with the program in the slot and the literal expected output `'a\nd\nb\nc'` (sync `'a'`, then microtasks in order — `queueMicrotask`'d `'d'` and `then`-scheduled `'b'`, in the order they were enqueued, but the order of `'b'` and `'d'` deserves explicit attention — see Predict-Why below), then the macrotask `'c'`. **Important:** trace the queue ordering carefully — `Promise.resolve().then(b)` enqueues `b` first; then `setTimeout(c, 0)` enqueues a macrotask; then `queueMicrotask(d)` enqueues `d` *after* `b` in the microtask queue. Output order: `a, b, d, c`. The writing agent must verify this ordering before authoring the `expected` prop. Run the snippet against a real runtime if needed.
- `<PredictWhy>` (revealed on wrong answer): explain the ordering in one short paragraph: synchronous code first (`a`), then the microtask drain in FIFO order — `b` was enqueued before `d`, so `b` runs first, then `d` — then the macrotask `c`. Note that `setTimeout(..., 0)` does *not* race with the `then` — the `then` continuation was queued earlier in the synchronous run, and the microtask queue is always drained completely before any macrotask runs.

Note for the writing agent: this `PredictOutput` is the puzzle from the opening, resolved. It is intentionally a slightly more involved trace than the canonical widget program — the widget builds the model on a tractable trace, the closing exercise validates that the model holds on the opener.

### Practice: three traces

A `<PredictOutput>` per program, three programs of increasing complexity. Each in its own block, no shared header. The goal is to build confidence with the trace.

Three programs to bake (the writing agent must verify each output against a real runtime — the orderings are easy to get wrong by reading):

1. **Two `await`s, one timer.** A program that interleaves a `setTimeout(0)` and an `async` function with two sequential awaits of resolved Promises. The student should see that the timer fires only after both microtask continuations land.

   ```ts
   const f = async () => {
     console.log('1');
     await Promise.resolve();
     console.log('2');
     await Promise.resolve();
     console.log('3');
   };

   setTimeout(() => console.log('timer'), 0);
   f();
   console.log('script end');
   ```

   Expected output: `1`, `script end`, `2`, `3`, `timer`. `<PredictWhy>`: the body up to the first `await` runs synchronously, then `f` returns. Synchronous tail of the script runs (`script end`). Microtask drain: `2` then `3` (each `await` re-queues the continuation on a microtask). Macrotask: `timer`.

2. **A microtask scheduling another microtask.**

   ```ts
   queueMicrotask(() => {
     console.log('outer micro');
     queueMicrotask(() => console.log('inner micro'));
   });
   setTimeout(() => console.log('timer'), 0);
   console.log('sync');
   ```

   Expected: `sync`, `outer micro`, `inner micro`, `timer`. `<PredictWhy>`: the inner microtask is enqueued *during* the drain, but the drain continues until empty — the inner runs before any macrotask. This is the "drain completely" rule made concrete.

3. **A pre-resolved Promise's `.then` chained off a `setTimeout(0)`.** Lightly trickier — the macrotask schedules a microtask which schedules another macrotask.

   ```ts
   setTimeout(() => {
     console.log('A');
     Promise.resolve().then(() => console.log('B'));
     setTimeout(() => console.log('C'), 0);
   }, 0);
   console.log('sync');
   ```

   Expected: `sync`, `A`, `B`, `C`. `<PredictWhy>`: the script's macrotask runs first — `sync`. Macrotask queue at that point: `[setTimeout(A)]`. Loop runs A's macrotask: `A` logs, then `.then(B)` enqueues a microtask, then `setTimeout(C)` enqueues a macrotask. Microtask drain runs `B`. Next macrotask: `C`. The lesson within the lesson: each iteration of the loop is `macrotask → full microtask drain`, so any microtask queued inside a macrotask runs *before* the next macrotask, even if the next macrotask was queued earlier in this iteration.

### Three consequences of `await`-as-microtask

A `<TrueFalse>` round closes the lesson — six statements that probe the three consequences from the "`await` is microtask-paced" section. The round is short and self-checking; each statement has a `<TfWhy>`.

Statements (the writing agent must verify each verdict and tune wording):

1. **(true)** Code before the first `await` in an `async` function runs synchronously on the caller's stack. `<TfWhy>`: the function body executes top-to-bottom until it hits an `await` — only then does the function return a pending Promise.
2. **(false)** Awaiting a Promise that is already resolved continues execution inline, without yielding to the event loop. `<TfWhy>`: even a pre-resolved Promise schedules its continuation as a microtask. This is what guarantees the microtask-vs-macrotask ordering.
3. **(true)** A `setTimeout(fn, 0)` cannot run before any pending microtask, because the microtask queue is drained completely between two macrotasks. `<TfWhy>`: the loop runs *one* macrotask, then drains *all* microtasks. A 0ms timer is still a macrotask; it waits its turn.
4. **(false)** An `async` function with no `await` runs synchronously and returns its value directly, without wrapping in a Promise. `<TfWhy>`: every `async` function returns a Promise — the `async` keyword *is* the wrapping. The body runs synchronously, but the return value is wrapped.
5. **(true)** A microtask that schedules another microtask runs the new one before the next macrotask. `<TfWhy>`: the drain runs until the microtask queue is empty. Microtasks added during the drain join the same drain.
6. **(false)** `queueMicrotask(fn)` and `setTimeout(fn, 0)` are equivalent ways to defer a callback to the next event-loop iteration. `<TfWhy>`: `queueMicrotask` enqueues on the *microtask* queue (runs before any macrotask); `setTimeout(fn, 0)` enqueues a *macrotask*. They differ in priority.

Use `instructions="Each statement is about the runtime model from this lesson — call stack, microtask queue, macrotask queue, and the tick recipe."` on the `<TrueFalse>` wrapper.

### External resources

`CardGrid` with two `ExternalResource` cards. Stay tight.

- **MDN — Concurrency model and event loop** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop`). The canonical reference; covers run-to-completion, the queue model, and rendering.
- **Jake Archibald — In The Loop (JSConf.Asia)** (`https://www.youtube.com/watch?v=cCOL7MC4Pl0`). Use a `<VideoCallout>` rather than an `ExternalResource` card for this one — it's the canonical visualization of the event loop with a real demo. The card title should mention it's ~35 minutes and that the macrotask/microtask split is its core.

Decision note: the Archibald talk is dated 2018 but remains the best teaching artifact for this model — the runtime semantics haven't changed. Embed it as the optional reinforcement after the lesson body.

## Components, diagrams, exercises — summary roll-up

- **Code blocks.** Plain `Code` for every short isolated snippet (opening puzzle, the three `await` consequences, each `PredictOutput` slot). No `AnnotatedCode` — the snippets are short and each beat is conceptually whole on its own. No `CodeVariants` — there's no before/after pair worth tabbing.
- **Diagrams.** One small HTML+CSS "three boxes" figure inside `<Figure>` to anchor the call-stack / microtask-queue / macrotask-queue vocabulary (annotated illustration shape — author the three boxes as a flex row of styled divs with labels, captioned). One Starlight `<Steps>` for the tick recipe (this is a procedure, exactly `<Steps>`'s use case).
- **Interactive widget.** `EventLoopWalker.astro` — custom component at `src/components/lessons/007/1/EventLoopWalker.astro`. Four panels (source, call stack, microtask queue, macrotask queue) plus a console, Prev/Next/Reset controls, ten step snapshots baked in. This is the lesson's center asset; estimate it as the largest single build cost in the lesson and ensure the writing agent treats it as such.
- **Exercises.** One opening `PredictOutput` (the puzzle resolved) — gated by the model section above it. Three `PredictOutput` traces of increasing complexity in the practice section. One `TrueFalse` round of six statements as the closing check.
- **Tooltips (`<Term>`).** *event loop*, *macrotask*, *microtask*. Three terms, all introduced in "The three-part runtime." Skip terms the course has already introduced in prior chapters. No tooltip on `await`, `Promise`, `setTimeout` — these are familiar by chapter 7 (Promise depth lands in lesson 2 of this chapter, but the *word* is not new).
- **Video.** One `<VideoCallout>` for Jake Archibald's "In The Loop" at the end. Skip if the writing agent finds a more current 2024+ alternative that lands at the same altitude — the model itself hasn't changed, so the older talk is acceptable.

## Scope

What this lesson does **not** cover:

- **Authoring Promises.** Lesson 2 of chapter 007 owns the constructor, the three-state model, and the four combinators (`all`, `allSettled`, `any`, `race`). This lesson treats Promises as objects whose `.then` and `await` continuations are microtask-scheduled — nothing more.
- **`async`/`await` patterns at depth.** Lesson 3 of chapter 007 owns the parallel-by-default vs. sequential-by-dependency rule, the N+1 trap in `.map(async ...)`, `for await...of`, and `return await`. This lesson stops at "`await` is a microtask scheduler" — the *patterns* land in lesson 3.
- **Cancellation, `AbortController`, `AbortSignal`.** Lesson 4 of chapter 007 owns the entire cancellation surface.
- **`try`/`catch` mechanics, throw-vs-return, the `unknown`-in-catch narrow.** Chapter 008 owns error-channel discipline. Async throws and rejected Promises are named in this lesson only as "a rejected Promise's continuation runs the `.catch` branch as a microtask" — no mechanics.
- **Node's event loop *phases* (timers / pending callbacks / poll / check / close).** Named in one sentence for completeness. The course's app code does not depend on the phase split.
- **Worker threads, `MessageChannel`, `BroadcastChannel`, `SharedArrayBuffer`.** Niche. Out of scope.
- **React's scheduler, concurrent rendering, `useTransition`'s priority queue.** Unit 4 / chapter 025 owns React's scheduler. The microtask queue is not React's scheduler — name once if asked, do not preview.
- **The `Promise.resolve().then(...)` vs. `process.nextTick` vs. `setImmediate` ordering matrix in Node.** Beyond this lesson's altitude. The single-sentence "`nextTick` drains before microtasks" is enough.
- **Performance scheduling primitives (`requestIdleCallback`, `scheduler.postTask`, `MessageChannel` ping).** Forward link in one sentence to Unit 19. Do not teach.

## Code conventions alignment

Skimming the relevant sections of `Code conventions.md` (TypeScript, Function form, Async-cancellation-and-time):

- **Function form.** All `async` functions in this lesson's code samples use arrow expressions bound to `const` — matches §Function form's default. `const f = async () => { ... }` is the shape; never `async function f() { ... }` unless the snippet's lesson requires the declaration form (it doesn't here).
- **TypeScript.** Snippets are `.ts` shape — annotated where the lesson needs them readable, otherwise inference. Return types are not annotated on the example async functions because the snippets are illustrative inline examples, not exported functions (the convention requires return-type annotations on *exported* functions). Note this deliberately if the writing agent is tempted to add `Promise<void>` annotations — they would be conspicuous noise here.
- **Async, cancellation, and time.** The Async section of the conventions says "`async`/`await` uniformly. `.then` chains only when teaching Promise mechanics directly (lesson code, not project code)." This lesson is exactly the carve-out: `.then` appears in the snippets *because the lesson is teaching the scheduling model* — and `.then` is the form the senior reads on platform-API call sites. Note the carve-out in passing if helpful to the writing agent; do not rewrite the snippets to use `await`.
- **Semicolons, single quotes, two-space indent.** Standard.
- **No `var`, no `function` keyword unless hoisting/recursion/type-guard.** Standard.

Pedagogical divergences from conventions:

- The lesson uses `.then` and `console.log` extensively in snippets — both are appropriate for the topic. No `Result<T, E>` shape, no logger abstraction; the snippets are about runtime semantics, not production app code.
- The `EventLoopWalker.astro` widget renders fixed step snapshots — it does not simulate JavaScript execution dynamically. This is intentional: hand-baked snapshots are deterministic, debuggable, and don't rely on a JS interpreter in the widget. Note the deliberate choice so the writing agent doesn't reach for `eval` or `new Function`.

## Estimated student time

35 to 45 minutes (matches the chapter outline estimate). The interactive widget is the time sink — most students will click through the canonical trace twice.
