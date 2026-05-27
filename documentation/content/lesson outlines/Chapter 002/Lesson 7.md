# Lesson 7 — Closures: lexical capture by reference

- **Title (h1):** Closures: lexical capture by reference
- **Sidebar label:** Closures

## Lesson framing

Closures are the chapter's only **invisible mechanism** lesson — every prior lesson (arrow vs. declaration, options-object, naming, flat control flow, `??`/`?.`, destructuring) operated on text the reader can point at on the page. Closures are the rule that explains *what bindings a function can see at call time*, which the reader cannot see — they have to imagine it. The pedagogical center, therefore, is the mental model, not the syntax. Closures have no new syntax; every function the student has written since Ch 001 was already a closure. What they're learning is *how to predict the value the closure sees* when something other than the obvious call site invokes it (a `setTimeout`, an event listener, a render-after-next `useEffect`, a module-scoped Server Action). That mental model has three components — **lexical** (write-time, not call-time), **by reference** (binding, not snapshot), **whole environment** (every enclosing binding, not just the ones the body names) — anchored to the binding-vs-box model from Ch 001 L1 and the `const` semantics from Ch 001 L6.

The lesson opens with the **stale-closure bug shape** that every student will ship at least once (the `var i` setTimeout loop printing the same number three times), since the bug is the only way to feel why "by reference, not by value" matters before they meet React. The model lands second. The fix (`let`/`const` per-iteration scope) lands third — and importantly, the language *already gives them this fix for free* in `for...of` (from L4), so the takeaway is not "remember the workaround" but "the modern loop forms close this bug for you, here's why." The lesson then names the three 2026 production sites where the bug surfaces in shapes the student doesn't yet recognize as closure bugs — Server Actions capturing module-scope bindings, `useEffect` cleanups seeing the render-that-created-them's bindings, route-handler factories closing over their config — each as a one-paragraph forward link so the student recognizes the family resemblance when those chapters arrive. The closing exercise is a `<PredictOutput>` that puts the student in the predictive seat: given a closure, what does it see, and why.

Key pedagogical decisions:

- **Bug first, model second, syntax never.** Closures have no syntax to teach; the entire lesson is mental model + recognition. Open on a bug snippet whose output is surprising; the surprise creates the motivation for the model.
- **One diagram, not three.** A single `<DiagramSequence>` showing a closure capture-and-call across three steps (define / outer reassigns / closure runs) carries the binding-not-value point in one figure. Multiple parallel diagrams would dilute focus.
- **Forward links land softly.** Server Actions, `useEffect`, route-handler factories each get one short paragraph. The depth is reserved for Ch 023/024/030 — this lesson plants the closure framing so the later chapters can say "the stale-closure pattern from Ch 002 L7" without re-deriving.
- **The cleanup discipline is named, not derived.** "Forgotten closures keep their environment alive → memory leak" gets one Aside with one sentence forward to `AbortController` (Ch 007 L4) and effect cleanup (Ch 024 L2). The student doesn't need GC mechanics; they need the warning.
- **No live React code.** The student hasn't met React yet (Unit 3 starts at Ch 022). All `useEffect`/Server Action references are illustrative pseudocode in fenced blocks, not live components. The closure pattern is the teach; the React surface is the preview.
- **React 19.2's `useEffectEvent` is the modern fix and replaces the older "reach for `useRef`" prescription.** The outline's original advice ("reach for `useRef` for values the cleanup needs to read mutably") is out-of-date as of React 19.2 (Oct 2025), which shipped `useEffectEvent` stable specifically for this bug class. The lesson mentions this in the forward link without teaching it.

Architectural Principle counter not advanced (this lesson is a mechanics + recognition install; no new numbered principle).

Seed domain continues from L2–L6: invoices, customers, orders, billing.

Estimated student time: 30 to 35 minutes.

---

## Lesson sections

### Introduction (no header)

Open with the **failure-mode beat** the chapter does for every lesson — the bug class the form prevents. Two-to-three sentences:

> A junior writes a loop that schedules three timeouts. The loop body looks correct: `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);`. The output is `3 3 3`, not `0 1 2`. The bug isn't in `setTimeout`. It's in what the callback **saw** when it finally ran — the same `i` the loop had finished mutating, not the `i` the callback was scheduled with.

Frame the lesson goal in one sentence: every function in JavaScript is a closure (every function the student has written since Ch 001 already was one), and this lesson installs the rule that lets the student predict what a closure sees at call time. Forward-promise the three 2026 production sites at the end (Server Actions, effect cleanups, route-handler factories) so the student knows why this matters past loop tricks.

No `<Aside>`. No code yet — the `for var` snippet itself shows up under the bug section so it stays adjacent to the model that explains it.

---

### The bug that motivates the model

**Goal:** Plant the surprise that creates demand for the model. The student predicts `0 1 2`; the actual output is `3 3 3`. The dissonance forces the question "what does the callback actually see?" — which the model answers in the next section.

Show the bug snippet as a fenced `ts` block (not interactive — the student should *read*, not run yet). Use `var` deliberately, not `let`, because `var`'s function-scope is what makes the bug visible. State the predicted vs. actual output in adjacent prose. Do **not** explain the fix yet; that's three sections away. Just plant the question.

```ts
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Predicted: 0 1 2
// Actual:    3 3 3
```

One-paragraph framing immediately below: the three callbacks all ran *after* the loop finished. They all looked at the same `i`. The loop had run `i` up to `3` by then. That's what they saw.

Use `<Term>` on **"closure"** here on first mention — short definition: "a function paired with the variables it can see from where it was written." This pre-stages the formal model.

No exercise here. The bug is the hook, not a practice item.

---

### Lexical capture, by reference, of the whole environment

**Goal:** Install the three-component mental model. This is the heart of the lesson; everything after this section is application.

State the model as one definition, then break out the three components, each as a short labeled paragraph.

> A **closure** is a function bundled with the lexical environment (the bindings in scope) where it was defined. When the function runs, it reads bindings — not snapshots of values — from that environment.

Then the three components as an h3-free bulleted list with bold leads (no subheadings; the components are too tightly related to split):

- **Lexical (write-time, not call-time).** What the closure can see is fixed by where the function was *written*, not where it's called from. A function defined inside `outer()` sees `outer`'s locals from wherever it's later invoked — another module, a timeout, a network response. The scope chain is decided at write time.
- **By reference, not by value.** The closure holds a reference to the binding, not a copy of the value at definition. Anchor explicitly to Ch 001 L1's binding-vs-box diagram: the closure holds onto the **box**, not the value currently in it. When the outer scope changes the box's contents, the closure sees the new contents on its next call. (`const` prevents the binding itself from being rebound, but a `const` array can still be mutated and that mutation is visible to the closure — same rule as Ch 001 L6.)
- **The whole environment, not just what's named.** A closure captures every binding in its enclosing scopes, including ones the function body doesn't visibly use. That's why a closure over a large object keeps it alive in memory until the closure itself is dropped. (Memory-leak discipline gets one Aside in the production-sites section below.)

**Diagram:** `<DiagramSequence>` with three steps, the only diagram in the lesson. Each step is a small hand-coded SVG (or HTML+CSS — the diagrams index lists both as fine for "picture of a specific thing"). Pedagogical goal: show that the closure holds a **reference into** the outer scope, and that mutating the outer scope between definition and call changes what the closure sees.

- **Step 1 — Define.** Outer scope box on the left containing `count = 0`. Inner function box on the right with the body `() => console.log(count)`. An arrow from the inner function to the outer `count` binding labeled "captures by reference."
- **Step 2 — Outer reassigns.** Same boxes. The outer `count` is now `5`. The arrow from the inner function still points to the same binding (not a copy). Caption: "The closure doesn't have a snapshot; it has a pointer."
- **Step 3 — Closure runs.** A call-site marker invokes the inner function. The function reads through the arrow and prints `5`, not `0`. Caption: "Call-time read, not write-time read."

Wrap each step in `<DiagramStep>` with a one-sentence `caption`. Do not wrap the whole `<DiagramSequence>` in `<Figure>` (the docs say it provides its own card).

`<Term>` candidates in this section:
- **"lexical environment"** — definition: "the set of bindings in scope at the spot in the source where a function is defined."
- **"scope chain"** — definition: "the ordered list of enclosing scopes a name lookup walks until it finds the binding or fails."

---

### The stale-closure trap and the fix the language gives you

**Goal:** Close the loop opened in the bug section, *using* the model to explain why and *the modern loop forms from L4* as the fix the student already has.

Walk the `var` loop again, now armed with the model. Three explanatory beats in prose:

1. `var i` is function-scoped. The whole loop shares one `i` binding.
2. Each callback closes over the **same** binding (not its value at iteration time).
3. By the time the timers fire, the loop has run `i` to `3`. All three callbacks read `3`.

Then the fix, as a `<CodeVariants>` with two tabs:

- **Tab "Broken — `var`"** with `data-mark-color="orange"` around the fence. Shows the original snippet, output `3 3 3`.
- **Tab "Fixed — `let` / `for...of`"** with `data-mark-color="green"`. Two equivalent fixes shown stacked in the same fence — the `let i` C-style loop, and the `for (const item of items)` form from L4. Output `0 1 2`. Prose: each loop iteration gets its **own** binding under `let`/`const`, so each callback closes over a different one. The `for...of` form (the senior default from L4) gives this behavior for free — block scope per iteration is built in.

Two-sentence senior reflex: in a 2026 codebase the student will essentially never write `var`, and `for...of` and `.map`/`.forEach`-style callbacks all give per-iteration block scope. The stale-closure-in-loop bug is structurally extinct in modern code; the model still matters because the *same shape* surfaces in the three production sites below.

**Exercise:** `<MultipleChoice>` single-correct, with `<McqWhy>`. Pedagogical goal: confirm the student can apply "by reference" to predict, not just recite.

> A function `makeCounters(n)` builds and returns an array of `n` functions; each function `console.log`s its index when called. Which implementation prints `0 1 2` when each returned counter is invoked?
>
> - **A** — `var i` in a C-style `for` (decoy, prints `3 3 3`)
> - **B** — `let i` in a C-style `for` (correct)
> - **C** — `Array.from({ length: n }, (_, i) => () => console.log(i))` (correct — `.map`-style callback gives per-iteration scope)
> - **D** — `for...in` over a fresh array (decoy — also iterates inherited keys, anti-pattern from L4)
>
> Two-correct multi-select mode (B and C). `<McqWhy>` explains that the rule is "each callback needs its own captured binding," and `.map`/`for...of`/`let` all give that for free; `var` does not, and `for...in` is wrong for unrelated reasons (L4 forward-ref).

---

### Why this bug class surfaces in three places you'll see again

**Goal:** Plant the recognition framing for the three production sites the student will meet in later units. Each gets one short paragraph — a sentence on the shape, a sentence on the fix, a sentence on the chapter that goes deep. No live code; one short illustrative fenced block per site.

Subsections via h3 (these are three genuinely distinct topics, even though each is short):

#### `useEffect` cleanups see the previous render's bindings

One paragraph + one short illustrative fenced block. The shape: `useEffect`'s setup function captures the current render's props/state; when the effect re-runs or the component unmounts, the **cleanup** function that runs is the one from the render that *created* the effect, so it sees that render's bindings — not the latest. The classic bug: a subscription cleanup tries to use a callback or value that's already been replaced; the cleanup unsubscribes the *wrong* handler, leaking.

The fix in one sentence, current as of React 19.2 (Oct 2025): **reach for `useEffectEvent`** (stable in React 19.2) when the effect needs to read the latest props/state without re-subscribing — it captures the latest values without joining the dependency array. Forward-link to Ch 024 L2 for the full effect lifecycle and `useEffectEvent` API. Mention in one parenthetical that the older `useRef` workaround is now legacy.

Illustrative pseudocode (do not run — student hasn't met React):

```tsx
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []); // empty deps → closure captures `count` from first render only
```

#### Server Actions can't capture per-request data at module scope

One paragraph. The shape: a Server Action exported from a module-scope file is *defined* once, at module load. If the file tries to capture per-request state in its outer scope — `cookies()`, `headers()`, the request user — those bindings either don't exist at module-load time or, worse, hold values from whichever request happened to load the module. Capture at module scope is **build-time-ish**; per-request data must be read **inside** the action body so each call resolves its own request context.

Illustrative pseudocode:

```ts
// Wrong: tries to capture request data at module scope.
const user = await getCurrentUser(); // ← runs once, at module load
export async function archiveInvoice(id: string) {
  if (user.role !== 'admin') throw new Error('forbidden');
  // ...
}

// Right: read request-scoped data inside the action.
export async function archiveInvoice(id: string) {
  const user = await getCurrentUser();
  if (user.role !== 'admin') throw new Error('forbidden');
  // ...
}
```

Add a `<Aside type="caution">` linking the same rule to `setTimeout`/`setInterval` callbacks: Next.js's request-scoped APIs (`cookies()`, `headers()`) must be called *directly* in the request's call stack; calling them inside a timer or another async context throws because the request scope is gone. The closure model explains why: the timer callback closes over the lexical scope, but it runs *outside* the original request's execution context.

Forward-link to Ch 030 L4 (Server Actions, the five-seam shape).

#### Route-handler factories close over their config

One paragraph. The shape: higher-order functions that produce route handlers — `const withAuth = (handler) => async (req) => { const user = await requireUser(req); return handler(req, user); }` — close over the `handler` parameter and any factory-time config. The pattern is the foundation of the wrapper idioms taught in Ch 005 L7 (`safeAction`, `requireRole`). Each invocation of the factory produces a *new* handler closure with its own captured config; the closure model is what makes that work.

Illustrative pseudocode:

```ts
const withRole = (role: string) =>
  async (req: Request) => {
    const user = await requireUser(req);
    if (user.role !== role) return new Response('forbidden', { status: 403 });
    return handler(req, user);
  };

export const POST = withRole('admin'); // closes over 'admin'
```

Forward-link to Ch 005 L7 (typed wrappers) and Ch 032 (route handlers).

`<Term>` candidate: **"higher-order function"** — definition: "a function that takes a function as input or returns a function as output."

---

### Closures as a design tool, not just a bug source

**Goal:** Reframe — closures aren't only the source of bugs, they're the language's primary mechanism for hiding state behind a function boundary. One short paragraph; this is balance, not a deep-dive.

The point in two sentences: in a 2026 SaaS codebase the student writes essentially no classes; "private state" almost always lives in a module's lexical scope, and the exported functions are closures over that state. The classic example is a counter factory — `makeCounter()` returns a function that increments and returns an internal `count`, with no way for the caller to read or mutate `count` directly.

One short fenced block (read-only, no exercise):

```ts
const makeCounter = () => {
  let count = 0;
  return () => ++count;
};

const next = makeCounter();
next(); // 1
next(); // 2
next(); // 3
```

Two-sentence closing: this is what `useState` is doing under the hood (forward-link to Ch 023), what memoization helpers (`memoize`, `pipe`, `compose`) are doing, and what every middleware-style wrapper does. The course's reaches stay functional; closures are why that works without losing encapsulation.

No exercise. Add `<Aside type="note">` with the **memory-leak discipline** in two sentences: a closure that's never dropped keeps every binding in its captured scope alive. Long-lived event listeners and timers are the two real-world leak sites; `AbortController` (Ch 007 L4) and React effect cleanup (Ch 024 L2) are the discipline that prevents it. The student doesn't need GC mechanics — they need to know that a forgotten closure is a forgotten memory leak.

---

### Closing exercise: predict the closure

**Goal:** Confirm the model is installed. The student looks at four small closure scenarios and predicts the output. Wrong predictions reveal an explanation that re-anchors the model.

`<PredictOutput>` with multi-line `expected`. The program contains all four scenarios in one block so the prediction is a single text answer. Order the scenarios from easy → hard so a student who gets the first two right can use the model on the harder pair.

Program:

```ts
// 1. Counter factory — does each counter have its own count?
const makeCounter = () => {
  let count = 0;
  return () => ++count;
};
const a = makeCounter();
const b = makeCounter();
console.log(a(), a(), b());

// 2. The stale-closure-in-loop, now with `let`
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// 3. Outer-binding reassignment between definition and call
let name = 'first';
const greet = () => console.log(name);
name = 'second';
greet();
```

Expected output:

```
1 2 1
first
0
1
2
second
```

Wait — order of `setTimeout` vs. synchronous logs matters here. The synchronous `console.log(name)` runs before the queued `setTimeout`s. Correct expected:

```
1 2 1
second
0
1
2
```

`<PredictWhy>` explanation: scenario 1 confirms each call to `makeCounter` creates a fresh closure with its own `count` binding. Scenario 2 confirms `let` gives per-iteration block scope, so each callback closes over a different `i`. Scenario 3 is the binding-not-value rule: `greet` doesn't snapshot `name` at definition, it reads it at call time — and the call happens after the reassignment. The setTimeout queue empties after the synchronous `greet()` call.

(Author's note for the writer: double-check the expected output by running the program. The `setTimeout` callbacks fire after `greet()` regardless of `delay: 0` because the macrotask queue is drained after the synchronous code completes. This is the lesson's only event-loop observation and is incidental to the closure point — keep the explanation in `<PredictWhy>` focused on closures, not on the event loop, which is Ch 007's territory.)

---

### External resources

Three to four `<ExternalResource>` cards, no `<CardGrid>` (the component does its own layout when stacked):

1. **MDN — Closures** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures). The canonical reference. Short description: "MDN's closure reference — scope chains, the classic counter factory, the loop trap."
2. **You Don't Know JS Yet — Scope & Closures (2nd ed.)** by Kyle Simpson. The book chapter on closures is the depth-pass for students who want to go past the model this lesson installs.
3. **React 19.2 — `useEffectEvent`** (https://react.dev/reference/react/experimental_useEffectEvent or the stable docs URL — verify at write time). Forward-link to the modern fix for the `useEffect` stale-closure pattern. One-line description: "React 19.2 (Oct 2025) shipped `useEffectEvent` stable as the canonical fix for stale closures in effects."
4. (Optional) **A short YouTube video on closures** via `<VideoCallout>` — a single-author explainer that visualizes the scope chain alongside code. Use this only if a high-quality 2024+ video can be found (avoid Fun Fun Function-era content; the rule "no historical detours" applies). If no clear winner, drop this entry — the model lands in prose + the diagram.

---

## Scope

### In scope

- The three-component closure model: lexical, by-reference, whole-environment.
- The stale-closure bug shape in a `var` loop and the language-provided fix (`let`, `for...of`, `.map`-style callbacks).
- Recognition of the three 2026 production sites where the same bug shape surfaces: React effect cleanups, Server Action module-scope captures, route-handler factories. One paragraph each, illustrative pseudocode, forward-linked.
- Closures as a deliberate encapsulation tool (the counter factory).
- The memory-leak discipline in one Aside.

### Out of scope (handled elsewhere or intentionally cut)

- **Spec-level execution-context internals** (lexical environment record, scope chain at the spec level, hoisting mechanics inside closures). The binding-with-reference framing is the right depth; the spec is not.
- **`this`, `bind`, `call`, `apply` interaction with closures.** Arrow `const`s don't rebind `this`; the course writes essentially no `this`. Named in passing only if it comes up naturally; otherwise omit.
- **The revealing module pattern, IIFE encapsulation, AMD/CommonJS-era patterns.** Superseded by ES modules; no historical detours.
- **Performance tuning around closure allocation cost.** Microoptimization; not on the senior path.
- **`AbortController` mechanics.** Named once in the memory-leak Aside; full treatment in Ch 007 L4 (async cancellation) and Ch 014 L3 (browser event listeners).
- **React `useEffect` deep dive and `useEffectEvent` API mechanics.** Reserved for Ch 024 L2; this lesson plants the closure framing only.
- **Server Action mechanics (the five-seam shape).** Reserved for Ch 030 L4; this lesson plants the module-scope-capture warning only.
- **Higher-order function typing with generics** (`Parameters<typeof>`, variadic tuples). Reserved for Ch 005 L7; this lesson plants the closure framing only.
- **The full event-loop model.** Reserved for Ch 007; the lesson's `setTimeout` examples are incidental (only one scenario in the closing exercise depends on event-loop ordering, and that's flagged in the `<PredictWhy>` as adjacent, not the lesson's point).
- **Cached functions (`'use cache'`) and the "closures are forbidden in cached functions" rule.** Reserved for Ch 027 (caching). Mentioning here would confuse — the rule is about serialization across cache boundaries, not the closure model itself.

### Prerequisites assumed from prior lessons (do not re-teach)

- **Binding-vs-value distinction** (Ch 001 L1). The closure model anchors to this — re-reference in one sentence, do not re-derive.
- **`const` reassignment vs. mutation** (Ch 001 L6). The "by reference" component restates the rule at one sentence; the student already knows it.
- **Arrow-`const` form** (Ch 002 L1). Every closure example uses `const fn = (...) => ...`; no need to justify the form.
- **`for...of` and "never `for...in`"** (Ch 002 L4). The fix-the-loop section reuses the rule.
- **Discriminated unions, `useEffect`, Server Actions, route handlers.** Named only as forward-links — the student hasn't met them. Use a single sentence per forward reference.

---

## Code conventions adherence notes

- Function form: `const fn = (...) => ...` everywhere. The lesson's *only* `function` declaration would be inside an `assertNever`-style helper, and the lesson uses no such helper.
- Code blocks use `ts` language tag (TypeScript-flavored, inference-led — the chapter's "one language" rule). Two exceptions: the React `useEffect` pseudocode uses `tsx`, and the Server Action pseudocode uses `ts` with the `export async function` shape from the conventions doc.
- `var` appears **only** in the broken-loop snippet — deliberately, as the bug being shown. Every fixed version uses `let` or `const`.
- Naming follows L3: `count`, `name`, `makeCounter`, `archiveInvoice`, `withRole`, `requireUser`. No `foo`/`bar`/`data`.
- Imports stripped from pseudocode (per Pedagogical guidelines §4 — the writer must keep illustrative code focused). Module-scope `export` kept where the pattern is the point (Server Action example).
