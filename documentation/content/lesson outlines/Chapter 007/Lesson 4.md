# Lesson outline — Chapter 007, Lesson 4

## Title

- **Title (h1):** Cancellation with AbortController and AbortSignal
- **Sidebar label:** Cancellation

## Lesson framing

The student already knows how to author Promises (L2), how to read `await`/`setTimeout`/`queueMicrotask` interleavings (L1), and how to parallelize independent reads (L3). What remains is the part every modern web API speaks but most legacy tutorials skip: **how to stop work in flight**. In 2026 the answer is `AbortController`/`AbortSignal`. Every `fetch`, every timer, every `addEventListener`, every Drizzle query, every AI SDK call, every Server Action signature the course writes takes `{ signal }`. The student leaves this lesson with the reflex that **if an async function does I/O, its signature includes `signal`**, and the ability to discriminate the three "this work didn't finish on purpose" conditions at the catch (user-cancel `AbortError`, timeout `TimeoutError`, real failure).

Conclusions that shape the whole lesson:

- **Decisions before syntax.** Open with the search-suggestions race condition — a production failure mode the student can picture (slow response clobbers fast latest). The lesson is the answer.
- **Two-party split as the central mental model.** Producer (`AbortController`) decides *when*; consumer (`AbortSignal`) listens. The split is what makes signal composition possible (`AbortSignal.any`). Visualize this once.
- **One canonical `{ signal }` shape, repeated across surfaces.** Show the same parameter shape on `fetch`, `setTimeout`, `addEventListener`, and a custom async helper. The repetition installs the reflex without needing five examples.
- **Three "didn't finish" outcomes at the catch.** This is the most-skipped fact in 2026 tutorials: `AbortSignal.timeout(ms)` rejects with `TimeoutError`, not `AbortError`. The lesson teaches the dual `name` check explicitly. Fact-checked against MDN May 2026.
- **Composition is the senior reach.** `AbortSignal.any([userSignal, AbortSignal.timeout(30_000), shutdownSignal])` is the canonical SaaS shape that recurs in chapters 043, 066, 106. Teach it as the *target form*, not an advanced footnote.
- **Cancellation is structural, not a flag.** Forbids the legacy patterns (cleanup booleans, `Promise.race([fetch, timeout])`). Names what cancellation does *not* do — it stops further work, not work already done.
- **Pedagogical archetype:** pattern lesson with one diagram, two CodeVariants paired wrong/right blocks, one AnnotatedCode walkthrough of the canonical pattern, and one ScriptCoding refactor exercise that verifies an aborted fetch rejects with `AbortError`. Close with a Matching exercise on signal sources.
- **Cognitive load discipline.** Build complexity in three beats: (1) controller→signal→single consumer, (2) discrimination at the catch with two named errors, (3) composition of multiple sources. Each beat is a section; do not introduce composition before discrimination.
- **No React wiring.** The function shape is the lesson; the effect-cleanup integration lands in Chapter 025 L2. Name it once, forward-link it once.

## Lesson sections

### Introduction (no h2 — sits above the first h2)

Open cold with the search-suggestions race condition in prose: a user types `r`, `re`, `rea`, `reac`, `react` over one second; five `fetch`es fly out; the slow response for `rea` arrives after the fast response for `react` and clobbers the dropdown. Frame the question: how do we stop the obsolete requests the moment they're obsolete? Name the two-part answer (`AbortController` + `AbortSignal`) and the project-wide claim — every modern API that does I/O takes `{ signal }`.

Three concrete sites named in one line each: `fetch`, the Vercel AI SDK's `streamText`, Drizzle queries through the `pg` driver. The student should leave the intro knowing this is *the* cancellation mechanism in 2026, not one of several.

No code in the intro; the prose carries the motivation.

### The producer–consumer split

Teach the two-part contract. The lesson's central mental model.

- `AbortController` — the **producer**. Caller creates one (`const controller = new AbortController()`), holds the reference, calls `controller.abort(reason?)` when it wants the operation to stop.
- `AbortSignal` — the **consumer's view**. Exposed as `controller.signal`. Read-only. Aborts when the controller fires; emits an `'abort'` event; sets `signal.aborted` to `true`.
- Why the split exists: producer and consumer are different parties. A consumer must not be able to trigger cancellation on someone else's controller. The split is also what makes composition (`AbortSignal.any`) possible — you can hand out signals while keeping the controllers private.

**Diagram (one).** A small `<Figure>` containing an `<ArrowDiagram>` (or hand-coded SVG if the layout is tight): on the left, an `AbortController` box. From it, an arrow labeled `.signal` to an `AbortSignal` box. From the signal, three outgoing arrows labeled `{ signal }` to three consumer boxes — `fetch(url, …)`, `addEventListener('click', fn, …)`, `setTimeout(fn, 1000, …)`. Above the controller, a single inbound arrow labeled `.abort(reason?)` from a "your code" box. Pedagogical goal: the student sees in one glance that one producer fans out to many consumers through the signal value. Cap height around 280px; wide layout.

Short code block (use `Code`, the Starlight code fence) showing the canonical construction and abort:

```ts
const controller = new AbortController();
// later, when we want to stop
controller.abort();
```

Mention `signal.aborted` (boolean) and `signal.reason` (the value passed to `abort`, defaults to a `DOMException`) in one sentence each — useful for guard clauses in long-running loops.

`<Term>` tooltips: *AbortController*, *AbortSignal*. Inline definitions for both.

### The `{ signal }` parameter shape

Teach the convention by listing four canonical sites with the same shape repeated. Use one `CodeVariants` block with four tabs, `syncKey="abort-sites"`, since the shape is the same and the difference is the API surface. The repetition is the lesson.

Tabs:
1. **`fetch`** — `await fetch(url, { signal })`. Rejects with `AbortError` when the signal fires.
2. **`setTimeout`** (Node's promise-based variant) — `await setTimeout(1_000, undefined, { signal })` imported from `node:timers/promises`. The wait is interrupted and rejects with `AbortError` when the signal fires. Note: the *callback-style* DOM `setTimeout` does **not** take a `{ signal }` option in browsers — naming this distinction prevents the most common student trap (assuming browser `setTimeout` is abortable). Inside the course's app code, use `node:timers/promises` for abortable sleeps on the server and a manual `AbortSignal.timeout(ms)` + `fetch` pattern in the browser.
3. **`addEventListener`** — `el.addEventListener('click', handler, { signal })`. The listener is removed when the signal fires. Cleaner than juggling `removeEventListener`. Name as a senior-reach idiom; the student should recognize it the next time they see it in framework code.
4. **A custom helper** — `async function searchSuggestions(query: string, { signal }: { signal?: AbortSignal })`. Threads `signal` to `fetch`. This is the shape the student will *author*; the prior three are shapes they *consume*.

Closing rule (canonical sentence, italicized in prose): *If an async function does I/O, its signature includes `signal`.*

Aligns with conventions doc line 366. State once that the project default for optional cancellation is `{ signal }: { signal?: AbortSignal }` in the options object (matching the convention exactly).

### The canonical user-cancel pattern

Walk the search-suggestions example end-to-end, but only the **function shape** and the **caller shape** in vanilla TS (no React — that lands in Chapter 025 L2; name the forward link once).

Use `AnnotatedCode` here. One file (~14 lines) showing:

```ts
async function searchSuggestions(
  query: string,
  { signal }: { signal?: AbortSignal },
): Promise<Suggestion[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json();
}

let active: AbortController | null = null;
async function onInputChange(query: string) {
  active?.abort();
  active = new AbortController();
  try {
    const results = await searchSuggestions(query, { signal: active.signal });
    render(results);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    throw err;
  }
}
```

AnnotatedCode steps:
1. **Signature** — highlight `{ signal }: { signal?: AbortSignal }`. The reusable shape from the prior section.
2. **Threading** — highlight `{ signal }` on the `fetch` call. The signal is *passed through*; the function does not own it.
3. **Abort previous** — highlight `active?.abort()`. Old controller fires; the previous in-flight `fetch` rejects with `AbortError`.
4. **Fresh controller per request** — highlight `active = new AbortController()`. Controllers are not reusable. One controller per logical operation.
5. **Catch discrimination** — highlight `err.name === 'AbortError'`. The next section unpacks this.

This is the only fully worked-out cancellation example. Everything later (timeout, composition) is built on top.

### Discriminating cancellation at the catch

The most-skipped fact in 2026 tutorials and the lesson's load-bearing payload. Promote it to its own h2.

Three "didn't finish" outcomes at the catch:

1. **User-cancel** — `controller.abort()`. The awaited operation rejects with a `DOMException` whose `name === 'AbortError'`. Intentional. Treat as no-op (return early).
2. **Timeout** — the signal came from `AbortSignal.timeout(ms)` (next section). Rejects with `name === 'TimeoutError'`. Intentional. Surface to the user as a "took too long" message; do not silently swallow.
3. **Real failure** — anything else. Network error, 500 from the server, parsing error. Propagate.

The canonical catch (use `Code`):

```ts
try {
  await searchSuggestions(query, { signal });
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') return; // user moved on
  if (err instanceof Error && err.name === 'TimeoutError') {
    notify('Search timed out, try again.');
    return;
  }
  throw err;
}
```

Why `err.name` and not `err instanceof DOMException`:
- `DOMException` is a browser type. In Node, abort errors from the `pg` driver, `node:fs`, the AI SDK, etc. can be different concrete classes that share the `name`.
- The `name` check is the durable cross-runtime form across the SaaS stack. (Verified against MDN May 2026 — `AbortSignal.timeout` explicitly rejects with `TimeoutError`, not `AbortError`. The WHATWG rationale: developers almost always want to distinguish timeouts from user aborts.)

Pair as `CodeVariants` (`syncKey="discrim"`, red/green `data-mark-color` tints):
- **Tab A (no discrimination, red tint)** — bare `catch (err) { console.error('search failed', err) }`. Result: every keystroke logs "search failed" because the previous abort *is* a rejection. Console noise. Real failures get lost in it.
- **Tab B (with discrimination, green tint)** — the form above. Aborts are silent; timeouts surface; real failures propagate.

Brief forward link in one sentence: the deeper `unknown`-in-catch narrowing and `ensureError` normalizer land in Chapter 008 L1. Here, the `instanceof Error && err.name === ...` form is enough.

### Timeouts with `AbortSignal.timeout(ms)`

The 2026 replacement for the legacy `Promise.race([fetch(...), timeoutPromise])` pattern (called out twice in the chapter outline, once in L2, once here).

Static factory: returns an `AbortSignal` that aborts itself after `ms` ms. No controller to hold, no `clearTimeout` dance, no cleanup leak.

Code (use `Code`):

```ts
const res = await fetch('/api/slow', { signal: AbortSignal.timeout(5_000) });
```

Three points named:
- The signal aborts with `name === 'TimeoutError'`, not `'AbortError'`. **This is the gotcha** — most students assume timeout-via-abort means `AbortError`. (Confirmed against MDN; the spec deliberately separates the two so apps can show "took too long" to the user without swallowing user-cancel as the same thing.)
- One line replaces the legacy `Promise.race` shape. The chapter outline names this as the canonical retirement of the `Promise.race` timeout pattern from L2.
- The timer is automatic and cleans itself up. The signal can be safely discarded if the request completes first.

`Aside type="tip"`: For a *combined* user-cancel + timeout signal, the next section composes them with `AbortSignal.any`.

### Composing signals with `AbortSignal.any([...])`

The senior-reach shape that recurs in chapters 043 (Server Actions), 066 (background work), 106 (AI streaming). Teach it as the target form.

The canonical SaaS composition (use `Code`):

```ts
const signal = AbortSignal.any([
  userController.signal,
  AbortSignal.timeout(30_000),
  shutdownSignal,
]);

const result = await fetch('/api/ai/stream', { signal });
```

The result signal aborts the instant **any** input signal aborts. The reason on `signal.reason` comes from whichever input fired first — so the same `err.name` discrimination from the previous section still tells the catch *why* the operation stopped.

Three named composition sources, each with a real trigger:
- **User cancellation** — the user closed the tab, navigated away, clicked Stop. (The component's controller.)
- **Deadline** — `AbortSignal.timeout(30_000)`. Server gives up if the upstream doesn't respond.
- **Shutdown** — a server-wide signal that fires on `SIGTERM` so in-flight work drains gracefully. (Named only — the wiring lands in Unit 11 / deployment chapters.)

State once: `AbortSignal.abort(reason?)` is the static factory for a *pre-aborted* signal. Trigger: passing an already-aborted signal to short-circuit work the caller already knows it doesn't want. Name in one sentence.

Senior watch-out (`Aside type="caution"`): when wiring custom listeners on a composed signal, use `{ once: true }`. Long-lived `AbortSignal.any` results that accumulate listeners can leak under listener churn — a tracked issue in recent Node releases. The lesson's pattern (compose once per request, let it fall out of scope) sidesteps this; the gotcha matters only if you stash a composed signal in module scope and add listeners to it across many calls.

### What cancellation does and does not do

Short, dense section. Stated as two named contracts, no code.

- **Guaranteed.** The signal's `'abort'` event fires. Consumers using `{ signal }` stop pending work. The Promise returned by the operation rejects.
- **Not guaranteed.** Work already completed is **not** reversed. A `db.insert(...)` that already committed is committed; a Stripe charge that already settled is settled. Cancellation prevents *further* work, not work already done.
- **The fix for "undo what was done"** — transactions (forward-link Chapter 039 L4) or compensating actions (chapter 066). Named in one sentence each, no expansion.

One-paragraph aside titled with the canonical sentence: *the unit of cancellation is the work, not the Promise*. This sentence is also seeded by L1 (per continuity notes). Reinforce here in its load-bearing site.

### Practice — refactor a fetch helper

`ScriptCoding` exercise. Starting code: an async function `fetchUser(id: string)` that does a bare `fetch(`/api/users/${id}`)` with no signal threading and a bare `catch (err) { console.error(err) }`.

Tasks the student performs:
1. Add `{ signal }: { signal?: AbortSignal }` to the signature.
2. Thread `signal` into the `fetch` call.
3. Discriminate `AbortError` at the catch (return `null` for the test surface, since the exercise can't display UI).
4. Discriminate `TimeoutError` at the catch (also return `null` here).
5. Real errors still propagate (rethrow).

Tests (jest-flavored, in the `ScriptCoding` runner):
- A normal fetch returns the user object.
- An aborted fetch (test pre-aborts the controller before calling `fetchUser`) returns `null`; no uncaught rejection.
- A timed-out fetch (test passes a pre-aborted `AbortSignal.timeout(0)` signal) returns `null`.
- A 500 response throws (real error propagates).
- Substring checks on the function source: contains `signal`, contains `AbortError`, contains `TimeoutError`.

This is the lesson's hands-on payload. It exercises every concept taught.

### Practice — match the source to the move

`Matching` exercise. Five scenarios on the left; five tools on the right.

| Scenario | Right answer |
| --- | --- |
| User types a new search query; cancel the previous request | `controller.abort()` + fresh controller per call |
| Request taking longer than 30 seconds should fail | `AbortSignal.timeout(30_000)` |
| Compose user-cancel, timeout, and shutdown into one cancel source | `AbortSignal.any([...])` |
| One-shot click listener that auto-removes on cancel | `addEventListener('click', fn, { signal })` |
| Pass an already-aborted signal to skip the call entirely | `AbortSignal.abort()` |

Five pairs, no decoys (keep it tight). Pedagogical goal: pattern-match the trigger to the API surface, the canonical senior-reflex move.

### Wrap-up

Tight closing block, no h2. Two `ExternalResource` cards:
- MDN — `AbortSignal` reference.
- MDN — `AbortSignal.timeout` static method (specifically because of the `TimeoutError` vs `AbortError` distinction the lesson teaches).

One sentence forward link: the React effect-cleanup pattern that holds the controller in a ref lands in Chapter 025 L2; server-side cancellation through Server Actions and route handlers in Chapter 043 and 046; AI streaming cancellation in Chapter 106.

### Terminology — `<Term>` tooltips

Inline definitions for these terms at first use. Do not add a glossary section; tooltips ride on prose.

- **AbortController** — "The producer side of cancellation: an object whose `abort()` method signals downstream consumers to stop."
- **AbortSignal** — "The consumer-facing view of an `AbortController`; a read-only signal that async APIs subscribe to via `{ signal }` to stop in-flight work."
- **AbortError** — "The error name a `fetch` (or other abortable API) rejects with when its signal was aborted by `controller.abort()`."
- **TimeoutError** — "The error name a signal from `AbortSignal.timeout(ms)` rejects with when the deadline elapses — distinct from `AbortError`."

Do **not** add tooltips for `fetch`, `Promise`, `try`/`catch`, or `await` — already-known by this point in the chapter.

## Scope

**In scope (this lesson):**
- `AbortController` / `AbortSignal` two-party contract.
- The `{ signal }: { signal?: AbortSignal }` parameter shape.
- Threading `signal` through I/O calls (`fetch`, `node:timers/promises` `setTimeout`, `addEventListener`, custom helpers).
- The browser-`setTimeout`-callback-form-is-not-abortable trap (one sentence).
- The user-cancel pattern (fresh controller per call, abort previous).
- Discrimination at the catch: `AbortError` vs `TimeoutError` vs real failure, via `err.name`.
- `AbortSignal.timeout(ms)` and the gotcha that it rejects with `TimeoutError`.
- `AbortSignal.any([...])` composition for user-cancel + deadline + shutdown.
- `AbortSignal.abort()` static factory (one line).
- The "guaranteed / not guaranteed" contract — cancellation stops further work, not work already done.

**Out of scope (deferred, not retaught):**
- React effect-cleanup with `useEffect` cleanup function or `useEffectEvent` — Chapter 025 L2.
- Server Action / route handler cancellation signal threading — Chapter 043 and 046.
- AI SDK streaming cancellation specifics — Chapter 106.
- Drizzle/`pg` cancellation at depth — Chapter 039 L4 names the connection-level effect briefly.
- Background-job cancellation (`ctx.run.abortSignal` in Trigger.dev) — Chapter 066 L5.
- Custom abort reasons / reading `signal.reason` at depth and authoring custom error subclasses — Chapter 008 L2.
- `try`/`catch` discipline at depth (`unknown`-in-catch narrowing beyond `instanceof Error`, `ensureError`, `Result<T, E>`) — Chapter 008 L1; the lesson uses the minimum `instanceof Error && err.name === '...'` form.
- Polyfills for environments missing `AbortSignal.timeout` or `AbortSignal.any` — both universally supported in Node 22+ (the course's pinned runtime) and modern browsers in 2026; no polyfill discussion.
- Cross-realm `instanceof DOMException` gotcha — Chapter 008 L2 owns it; this lesson names only the `err.name` check as the durable form.

**Quick re-anchors (do not re-teach):**
- "`async`/`await` is the project default." (One sentence if needed.)
- "Promise rejections settle the awaited Promise; `try`/`catch` around an `await` catches them." (One sentence; full treatment in Chapter 008 L1.)
- "JavaScript Promises have no native cancellation; the unit of cancellation is the *work*, not the Promise." (Canonical sentence from L1, reinforced here in its load-bearing site.)
