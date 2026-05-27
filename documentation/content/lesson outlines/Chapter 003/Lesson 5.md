# Lesson 5 outline — Iteration and the lazy helpers

- **Title (h1):** Iteration and the lazy helpers
- **Sidebar label:** Iteration and lazy helpers

## Lesson framing

The lesson lives at the iteration layer that sits underneath every container the previous four lessons installed (objects, arrays, `Set`, `Map`). Two failure modes drive it:

1. **Eager waste.** A developer materializes a million-row source with `.toArray()` early in a pipeline, then filters down to ten. Or, less dramatic, calls `.map().filter()` over a generator and gets back an array of every yield.
2. **`for...in` leak.** A junior writes `for (const k in obj)` to iterate keys, walks the prototype chain, and picks up an inherited property.

The lesson installs:

- The iteration protocol in one paragraph (named once, parked) — recognition only, the student should never need to author one in 2026 app code.
- `for...of` as the default loop, with the **four triggers** that flip it on (already named in L3 — recalled, not re-taught).
- The four object-iteration entry points (`Object.entries/keys/values` + the **banned** `for...in`).
- Generators in one short snippet for recognition.
- The ES2025 `Iterator.prototype` helper surface — the central beat. Trigger: **lazy source, large size, or short-circuit**.
- The "stay with arrays" reminder so the student doesn't reach for lazy iteration on a 50-row array.

Pedagogical stance: **concept archetype**. The protocol is conceptual scaffolding, but the senior reflex is the trigger ("do I really need lazy?") plus the helper-chain shape. Keep the protocol paragraph tight; spend the lesson's word budget on (a) the `for...of` rule and (b) when and how to enter `Iterator.from(...)`.

Cognitive-load shape: start with the two bugs side by side → state the protocol once and park → walk `for...of` → walk object iteration entry points (and ban `for...in`) → introduce generators just enough to write the lazy-source example → enter `Iterator.prototype` helpers → close with the "stay with arrays" reminder and the async cousin foreshadow. Each beat earns one short snippet.

Domain continuity: keep using the invoices seed domain (`{id, amountCents, status, customerId, dueDate}` from L2/L3/L4). The lazy example uses a streamed source of invoice events — the framing students will meet again in chapter 015.

Components in play: `CodeTooltips`, `AnnotatedCode` (for the iteration protocol mechanics), `CodeVariants` (eager vs lazy, `for...in` vs `for...of`), `PredictOutput` + `PredictWhy` (laziness pull-count check), `ScriptCoding` (the rewrite exercise — vanilla runner is enough), `Term` (recurring vocabulary), `ExternalResource` + `CardGrid` (external resources), `Figure` with a custom SVG or Mermaid flowchart for the pull-through pipeline.

Open cold with two contrasting bug snippets (no intro h2) — same opening pattern L1–L4 used. No video this lesson (the protocol surface is small and prose-led).

## Lesson sections

### Opening (no h2)

Cold open. Two side-by-side snippets in a `CodeVariants` block:

- **Variant A — "Eager waste":** a generator yielding 1M error rows, fed through `[...stream].filter(isCritical).slice(0, 10)`. Prose: "Allocated 999,990 rows for nothing."
- **Variant B — "Prototype leak":** `for (const key in obj)` over a plain object that picked up `toString` because some polyfill added an enumerable property to `Object.prototype`. Prose: "Walked the prototype chain — `for...in` always does."

Then one paragraph: both are iteration bugs. The fix isn't a clever copy or a defensive check; it's reaching for the right loop and, when the source is lazy, the right helper surface. This lesson installs both.

### The iteration protocol, named once

H2. **Header:** `The iteration protocol`.

Goal: install enough mental model that `for...of`, the spread operator, `Array.from`, and the new `Iterator.from` make sense — then park. Beginners struggle because the protocol feels invisible; making it concrete in one paragraph + one mini diagram demystifies it without consuming lesson budget.

Content:

- One paragraph: anything with a `[Symbol.iterator]()` method that returns an iterator is **iterable**. An iterator is anything with a `.next()` method that returns `{ value, done }`. Every array, string, `Map`, `Set`, `URLSearchParams`, `NodeList`, generator return value, and the new `FormData.entries()` (recall from L3) implements it. The protocol is what `for...of`, `Array.from`, spread, and `Iterator.from` all consume.
- One short `AnnotatedCode` block (vanilla `Array` example): step 1 highlights `arr[Symbol.iterator]()` returning an iterator; step 2 highlights two `.next()` calls returning `{ value: 1, done: false }` then `{ value: 2, done: false }`; step 3 highlights `{ value: undefined, done: true }`. Color: `blue`. The goal is recognition, not authoring — the student leaves understanding that the protocol is a contract, not a class.

Use `<Term definition="...">` for **iterable** and **iterator** (the two pair, easy to confuse). Reusable in the rest of the chapter.

### `for...of` as the default

H2. **Header:** `for...of as the default loop`.

Restate from L3 (and from chapter 002 L4), but anchor it here as the consumer of the protocol. Cognitive-load lever: bullet list, not prose.

Content:

- One short paragraph: `for...of` calls `.next()` until `done`, runs the body for each `value`. Plays naturally with `break`, `continue`, `return`, `throw`, and crucially `await`.
- Bullet list — the **five things it lets you write that array methods don't**:
  - `break` / `continue` / `return` (short-circuit out)
  - `await` inside the body (sequenced async)
  - destructure in the binding: `for (const [key, value] of map)`, `for (const { id, amountCents } of invoices)`
  - the `.entries()` shape: `for (const [i, item] of arr.entries())` when you need the index
  - multiple statements per iteration without stuffing a `.forEach` callback
- Re-state the four triggers from L3 in one tight sentence (async, early termination, multi-statement bodies, index+value via `.entries()`) — explicitly cross-reference L3 by name.
- One short snippet: a `for...of` over `Object.entries(invoicesById)` with destructuring, summing `amountCents` until a threshold is hit (`break`). Shows the destructure + early-break combination — both impossible with `.map`/`.filter`/`.reduce`.

### Iterating objects: the three entry points and the banned form

H2. **Header:** `Iterating an object's own properties`.

Why a section: objects don't implement `[Symbol.iterator]` themselves, which trips up students coming from Python. The senior reach is "go through `Object.entries`/`.keys`/`.values`," not `for...in`. This is also where the `for...in` ban earns its one-time naming.

Content:

- One paragraph: plain objects are not iterable. The three entry points return iterables you then iterate.
- Tight enumerated block — three items, one line each:
  - `Object.entries(obj)` — `[key, value]` pairs. **Default.**
  - `Object.keys(obj)` — keys only.
  - `Object.values(obj)` — values only.
- All three already named in L1 (cross-reference). All three return arrays; the senior reach for "loop over an object" is `for (const [key, value] of Object.entries(obj))`.
- The `for...in` ban earns its own short subsection prose block:
  - **What it does:** iterates **string keys** (yes, even array indices as strings), **including inherited enumerable ones**.
  - **Why it's banned:** prototype-chain leaks (the cold-open example), accidental array-as-object iteration that returns `"0"`, `"1"` instead of values, and the `Object.entries` form is shorter and clearer for the only case `for...in` was ever intended for.
  - **Senior rule:** the 2026 course never writes `for...in`. If a linter setting is needed later, it's noted as a one-liner. Beginners coming from other languages need this explicit because `for...in` looks like Python's `for ... in dict` and isn't.

`CodeVariants` block — two tabs, both iterating the same `invoicesById` record:

- **Tab 1 — "`for...in` (banned)":** uses `for (const id in invoicesById)`, then `invoicesById[id].amountCents`. Prose: walks the prototype chain; under `noUncheckedIndexedAccess`, the indexed access is `Invoice | undefined`, so the body needs an awkward narrow.
- **Tab 2 — "`Object.entries` (default)":** `for (const [id, invoice] of Object.entries(invoicesById))`. Prose: own properties only; destructure gives both id and invoice in one binding; `invoice` is typed `Invoice` (the type assertion needed for `Object.keys`/`.entries` returning `string[]` instead of `keyof T` is one prose line, cross-referencing L1).

Use `<Term definition="...">` for **own property** (already used in L1, easy refresher).

### Generators in one snippet

H2. **Header:** `Generators, in one snippet`.

Why a section: generators are the easiest way to author a custom iterable, and the lazy-helper section needs a non-array source to demonstrate laziness. Goal: the student recognizes `function*` and `yield` syntax. They do not need to write generators by reflex — narrow tool, named once.

Content:

- One short paragraph: a generator function (`function* name() { ... yield value; ... }`) returns an iterator when called. Each `yield` pauses the function; `.next()` resumes it. The generator object is both an iterator (has `.next()`) and an iterable (has `[Symbol.iterator]()` returning itself), so it drops straight into `for...of` and into the lazy helper chain.
- One short snippet: a `function* invoiceEvents()` that simulates a streamed source — `console.log` on each yield (so the next section's `predict-output` exercise can count how many times it fires), yields three or four sample invoice events. Vanilla syntax — keep it small. The `console.log` is the **observable signal** of laziness in the next section.
- Senior reach in one sentence: in 2026 app code, the only common author site for generators is "I need a custom lazy source and writing it as a generator beats hand-rolling a `[Symbol.iterator]` method." Common consumer sites: anything streamed — `ReadableStream` (chapter 015), paginated API loops (chapter 007 L3).

No exercise here — just recognition.

### The lazy `Iterator.prototype` helpers

H2. **Header:** `The lazy iterator helpers`.

The central beat. Cognitive-load shape: state the trigger first (so the student knows when to reach), then the surface, then *show* the laziness with a worked example that the student then predicts and rewrites.

Content:

- **Trigger paragraph.** The three conditions that make the array-method chain the wrong choice and lazy iteration the right one: (a) the source is itself lazy (generator, stream, paginated API), (b) the source is large enough that materializing it is wasteful, (c) the pipeline short-circuits (you only need the first N matches). On a 100-row in-memory array, `.filter().map()` reads better; the iterator helpers earn their place when the source is lazy. **Trigger before tool.**
- **The surface.** Tight enumerated block — methods grouped by "lazy" (returns a new iterator, nothing materializes) vs "terminal" (pulls the chain):
  - **Lazy:** `.map(fn)`, `.filter(fn)`, `.take(n)`, `.drop(n)`, `.flatMap(fn)`.
  - **Terminal:** `.reduce(fn, init)`, `.toArray()`, `.forEach(fn)`, `.some(fn)`, `.every(fn)`, `.find(fn)`.
  - **Entry point:** `Iterator.from(iterable)` wraps any iterable so the helper chain is available.
- One paragraph: nothing runs until the terminal step pulls. `.toArray()` pulls everything; `.find` / `.some` / `.every` pull until a match short-circuits; `.take(n)` followed by `.toArray()` pulls exactly `n` items (plus the calls needed to find them) from the source.

`Figure` with a hand-coded SVG (or Mermaid `flowchart LR`) — the **pull-through pipeline**:

- Three boxes left-to-right: `generator source` → `.filter(isCritical)` → `.take(10)`.
- A `.toArray()` box on the right pulls.
- Arrows annotated: forward arrow labeled `pull (next)`, backward arrow labeled `value`. The visual point: `.toArray()` requests one value at a time from `.take(10)`, which requests from `.filter`, which requests from the source. The source yields exactly the items that survive the filter until 10 pass through.
- Caption: "Each terminal call pulls one value through the chain at a time — the source yields only what the terminal needs."

Choose the engine that produces the clearest annotated arrows; SVG gives the most control for the bidirectional pull/value annotations, so default to SVG unless the agent prefers Mermaid `flowchart LR` (acceptable fallback).

**Worked example.** One short snippet showing the lazy form alongside the eager form, as a `CodeVariants`:

- **Variant A — "Eager (wasteful)":** `[...invoiceEvents()].filter((e) => e.severity === 'critical').slice(0, 10)`. Prose: materializes the entire stream first, *then* filters, *then* slices. Wrong shape for a lazy source.
- **Variant B — "Lazy (senior reach)":** `Iterator.from(invoiceEvents()).filter((e) => e.severity === 'critical').take(10).toArray()`. Prose: the source yields only the events `.take(10)` needs. If the first 10 critical events are in the first 50 of the stream, the source's `console.log` fires 50 times, not 1,000,000.

**Predict-output exercise.** A `PredictOutput` block with a small generator that `console.log`s on each yield, wrapped in `Iterator.from(...).filter(...).take(2).toArray()`. The expected output is the `console.log` lines from the source up to the second match plus the array of two matches. Student predicts how many "yielding…" lines print before the `toArray()` resolves. Include a `PredictWhy` that explicitly draws the pull-through: `.toArray()` pulls one item, `.take(2)` asks `.filter` for one, `.filter` asks the source — repeat until 2 items have made it through.

**Rewrite exercise.** A `ScriptCoding` block (vanilla runner — pure JS is enough since `Iterator.prototype` ships in Node 22+/24 and modern Chromium, well within the bundled runtime, and JSX/TS isn't needed). Starter: a function that takes a generator + a predicate and returns the first 5 matches, implemented eagerly with `[...gen].filter(predicate).slice(0, 5)`. The test asserts both the result array **and** the count of how many times the source generator's `yield` fired (the source instruments a counter on each yield). The eager form fails the count assertion; the rewrite to `Iterator.from(gen).filter(predicate).take(5).toArray()` passes both. The failing test is the lesson — the student watches "yielded 1000 times" become "yielded 23 times" after the rewrite.

If the vanilla runner can't expose the count cleanly, fall back to a single test that compares `Array.from(...).length` of helper-chained vs. eagerly-materialized — but prefer the count assertion if feasible because the laziness is the point.

### Stay with arrays when the source isn't lazy

H2. **Header:** `When to stay with arrays`.

Why a section: the most common mistake after learning the helpers is reflex-reaching for them on a 50-row array. Cognitive-load lever: a one-paragraph anti-overreach so the student doesn't trade one footgun for another.

Content:

- One paragraph: most application data fits in memory. A `.filter().map()` over an in-memory array of 50 rows is the right shape — eager, readable, terminal in one step. The iterator helpers earn their place when the **source itself** is lazy (generator, stream, paginated API) or when the pipeline genuinely short-circuits past the array surface.
- One-sentence rule: if you can already point at the array, don't wrap it in `Iterator.from`. If the source yields values over time, do.

### The async iteration cousin, foreshadowed

H2. **Header:** `Async iteration, in one paragraph`.

Why a section: the student should recognize `for await...of` when it appears in the React Server Components / streamed-fetch chapters. One paragraph, no exercise, no code beyond a one-line snippet.

Content:

- One paragraph: when the source itself is asynchronous (a `ReadableStream`, server-sent events, a paginated API that returns a `Promise<Page>` per pull), the loop form is `for await (const value of asyncIterable)`. Same shape, awaits each value. The async cousin of the lazy helpers (async `Iterator.prototype` helpers) ships under a separate spec; the course covers the async-iteration loop in chapter 007 L3 and reaches for the lazy helpers' async counterpart only where it earns its place.
- One-line snippet: `for await (const chunk of response.body) { ... }` — the shape only.

### External resources

H2. **Header:** `External resources`.

`CardGrid` with two or three `ExternalResource` cards:

- MDN — Iteration protocols (the canonical reference)
- TC39 — Iterator Helpers proposal (the ES2025 spec, for the senior who wants to read the actual surface)
- Node.js docs — async iterators (forward link)

No video — the surface is small and prose-led, matching L1, L3, L4's pattern.

## Scope

### What this lesson covers

- The iteration protocol (`Symbol.iterator`, `.next()`, `{ value, done }`) — recognition only.
- `for...of` as the default loop, anchored to the four triggers from L3.
- Object iteration via `Object.entries`/`.keys`/`.values`.
- The `for...in` ban with the prototype-chain rationale.
- Generator functions — recognition only, one snippet, no authoring practice.
- The ES2025 `Iterator.prototype` lazy helper surface and the `Iterator.from(iterable)` entry point.
- The trigger that earns lazy iteration (lazy source / large size / short-circuit) and the inverse "stay with arrays" rule.
- One-paragraph foreshadow of `for await...of`.

### What this lesson does NOT cover

- **Writing custom iterables from scratch** via `[Symbol.iterator]` methods — generators are the only authored form a senior reaches for in 2026 app code.
- **Async iterator helpers** (the async cousin spec) — named in one sentence, no surface walk. The course teaches `for await...of` in chapter 007 L3.
- **The full async-generator surface** (`async function*`, `Symbol.asyncIterator`) — chapter 007 L3 and chapter 015 own these.
- **Stream backpressure, `ReadableStream`, server-sent events** — chapter 015.
- **Performance benchmarking** of eager vs. lazy iteration — the trigger (lazy source / size / short-circuit) is the call, not microbenchmarks.
- **Tree traversal, visitor patterns, custom recursion shapes** — outside the SaaS daily reach.
- **`useState`/React mechanics** for iterables — the React snippets in this lesson (if any) stay illustrative; chapter 023 owns the mechanics.
- **`Array.from(formData.entries())` and Server Action input** — forward to chapter 030 L4.

### Prerequisites assumed (recap, do not re-teach)

- `noUncheckedIndexedAccess` and bracket-access discipline — L1.
- The four ES2023 non-mutating array updates — L2.
- The eight array methods (`.map`/`.filter`/`.reduce` family) and the four `for...of` triggers — L3. The four triggers are explicitly recalled, not re-taught.
- `Set`/`Map` and the serialization watch-out — L4.
- `Object.entries`/`.keys`/`.values` and the `string[]` vs `keyof T` widening — L1 (referenced in one sentence).
- `??`, destructuring, spread — chapters 001/002.
- Node 24 LTS as the pinned runtime, making `Iterator.prototype` helpers (ES2025) universally available — L2/L8 forward.

## Code conventions alignment

Applied selectively:

- All snippets `.ts` where TS adds value; vanilla `.js` only where types would noise the iteration mechanics (e.g., the generator snippet). The protocol mechanics step (`AnnotatedCode`) reads cleaner as plain JS.
- Single quotes, 2-space indent, semicolons on — per Biome defaults.
- Arrow functions bound to `const` for callbacks; `function*` is the standard form for generators (no `const fn = function*() {}` cruft).
- No `any`. Where the iterator helper return type matters in the rewrite exercise, lean on inference — TypeScript 6.0 (the May-2026 stable) moved the iterator helper typings into `lib.es2025.iterator.d.ts`, so `Iterator.from(...).filter(...).take(...)` is fully typed under the default course `tsconfig` without needing `esnext` in `lib`.
- `for...of` over `.forEach` everywhere; `for...in` only appears in the banned-variant tab of the `CodeVariants`.
- `Object.entries` for object iteration, with the L1 cross-reference for the `string[]` typing watch-out.
- Camera on the **trigger**: trigger paragraphs before the surface block, in line with the chapter's "trigger before tool" thread.

Deliberate divergences from production conventions (noted so downstream agents know):

- The cold-open variant A and the rewrite-exercise starter intentionally use bad shapes (`[...gen].filter(...)` and `for (const k in obj)`) — these are pedagogical plants, not production-shape code. Flag both in the prose so a student copy-pasting can't ship the wrong version.
- The generator snippet uses `console.log` inside `yield` — non-idiomatic in production, intentional here to make laziness observable.
