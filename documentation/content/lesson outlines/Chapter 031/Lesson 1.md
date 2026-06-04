# Lesson 1 — Suspense, the fallback contract

- **Title (h1):** Suspense, the fallback contract
- **Sidebar label:** Suspense

## Lesson framing

This is the first lesson of Chapter 031 and the entry point to async UI in the App Router.
Chapter 030 left the student with two facts: a Server Component can `await` data in its body, and a Server Component can pass a `Promise` to a Client Component that reads it with `React.use()`.
The unanswered question this lesson owns: **what does the user see during that await?**

The single mental model the student must leave with: **Suspense is a declarative contract — "while any child suspends, render the `fallback`; when every child resolves, render the `children`."**
Not a hook, not a config flag, not a data-fetching library — a component with one job that catches a "still loading" signal thrown by a descendant.

The senior frame runs through the whole lesson and should be stated explicitly, not just implied: the boundary goes at the **unit of UX**, not the unit of code.
The pain this relieves is the `useState(isLoading)` + `useEffect` + `fetch` triad the student may have seen elsewhere — loading state scattered across the tree, manually threaded, easy to get wrong.
Suspense moves loading from imperative bookkeeping to a declarative boundary the framework drives.

Keep cognitive load low by staging the model:
1. the contract (suspend → fallback → resolve → children) on a single boundary,
2. the two shapes the student actually writes that trigger it,
3. what makes a *good* fallback,
4. *where* the boundary belongs (the senior decision),
5. composition (nesting) and the `key` escape hatch.

Hard scope discipline: this lesson is the **primitive**.
It does not teach streaming transport (lesson 2), `loading.tsx` and the file conventions (lesson 3), or errors / error boundaries (lesson 3).
Mention each exactly once as "next lesson owns this" so the student isn't confused about why Suspense alone doesn't catch a thrown error.
Estimated student time 50–65 min; this is load-bearing for every async surface in the rest of the course.

Code-component strategy at a glance:
- Plain `Code` fences for short, single-focus snippets.
- `CodeVariants` for the imperative-`isLoading` vs. declarative-Suspense before/after, and for the unit-of-UX one-boundary-vs-two comparison.
- `AnnotatedCode` for the two suspending shapes (server-component shape and the streamed-Promise client shape) where attention must move across several lines.
- A box-and-arrow / sequence diagram for the contract and for the nested-boundary cascade.
- One `ReactCoding` exercise to let the student place a boundary themselves; one `StateMachineWalker` as the "where does the boundary go?" decision drill; `MultipleChoice` checks for the misconceptions.

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete: a dashboard Server Component runs `const invoices = await db.invoices.find()` and that query takes ~800 ms.
For those 800 ms, what fills the screen?
Name the bad-old answer the student may carry from client-side React — a `useState` loading flag flipped inside a `useEffect` after a `fetch` resolves — and the cost: that flag lives in a Client Component, has to be threaded to wherever the spinner shows, and multiplies for every independent piece of data.
State the lesson's promise: React gives one declarative primitive, `<Suspense>`, that replaces all of it, and the senior skill is not its syntax but *where you draw it*.
Keep it to a few short paragraphs; do not preview the four async files (that framing belongs to the chapter, the student meets it in lesson 3).

### Suspense is a contract, not a hook

Define Suspense precisely and minimally: a built-in React component that catches the "suspend" signal thrown by any descendant and renders its `fallback` prop in place of `children` until every suspending descendant has resolved.
Emphasize the three properties that kill the common misconceptions:
- it is a **component**, used in JSX, not a hook and not a flag;
- it reacts to a *signal a child throws*, so the boundary doesn't need to know what or how the child loads;
- the rule is all-or-nothing per boundary: fallback shows while *any* child suspends, children show only when *all* resolve.

Reinforce the contract with a small diagram.
Use a `<Figure>` wrapping an HTML/CSS state strip (or a `DiagramSequence` of 3 steps) showing the boundary cycling: **suspended → render `fallback`** then **resolved → render `children`**.
Pedagogical goal: cement that the boundary has exactly two visual states and the transition is driven by the children, not by code the student writes. Keep it horizontal and short per the vertical-space constraint.

Then the canonical minimal snippet as a plain `Code` fence — a `<Suspense fallback={<InvoiceSkeleton />}>` wrapping an `async` child — so the student sees the literal shape before any nuance:

```tsx title="app/dashboard/page.tsx"
<Suspense fallback={<InvoiceSkeleton />}>
  <InvoiceList />
</Suspense>
```

Note in prose that `InvoiceList` here is an `async` Server Component; the next section shows both shapes that can sit inside.

`Term` candidates in this section: **fallback** (the UI rendered while suspended), **suspend / suspend signal** (the throw a not-ready component emits — re-explained briefly since it's the mechanism, not a prerequisite the student has seen named).

### The before and after: declarative beats the loading flag

Drive home *why* this is better with a `CodeVariants` before/after.
- Variant "Loading flag (client)": the `useState` + `useEffect` + `fetch` triad in a Client Component, with the `if (isLoading) return <Skeleton />` branch. First sentence frames it: **imperative — you own the state machine and must thread it everywhere.**
- Variant "Suspense (server)": the `async` Server Component that just `await`s, wrapped by a parent `<Suspense>`. First sentence: **declarative — the boundary owns the loading state, the component just awaits.**

Use `del`/`ins` sparingly; the point is the shape contrast, not a line diff.
Keep each variant's prose to one paragraph.
After the block, a sentence of payoff: the loading state is no longer the component's concern, and there is no flag to forget to flip.
This section earns its place because the student's prior mental model is the thing being replaced; making the replacement explicit is the highest-leverage move in the lesson.

### The two shapes that suspend

This is the "what do I actually write" section.
The student needs to recognize the two suspending shapes they will author and understand both throw the same signal Suspense catches.

Use one `AnnotatedCode` per shape (or a single `TabbedContent` holding two, but two `AnnotatedCode` blocks read cleaner since each has its own walkthrough), `lang="tsx"`, `color="blue"`:

Shape 1 — **async Server Component.**
Steps walk: the `async function` signature, the `await db.invoices.find()` in the body, the `return` that renders the data. Explain that until the `await` settles the component has not produced output, so it suspends; the nearest `<Suspense>` ancestor shows its fallback meanwhile.

Shape 2 — **Client Component reading a streamed Promise with `use()`.**
This is the pattern from chapter 030 lesson 4, now given its loading behavior.
Steps walk: a Server Component creating `const invoicesPromise = db.invoices.find()` (no `await`), passing it as a prop, the Client Component calling `const invoices = use(invoicesPromise)`, and the `<Suspense>` sitting above the Client Component.
Explain: `use()` suspends the Client Component until the Promise resolves; this is how an interactive shell (sorting, filtering) can wrap data that is still streaming in.

Critical correctness note to surface in prose (flag it as a deliberate watch-out, tie-back to chapter 030 and forward to chapter 032): the Promise must be **created on the server and passed down**, or otherwise stable across renders — creating it inside a re-rendering Client Component makes a new Promise every render and breaks the boundary.
Full stability rules are chapter 032 lesson 5 (request memoization / `cache()`); name it, don't teach it.

Close the section by naming, in one sentence each, the other shapes that suspend so the student knows the universe but doesn't dwell: `React.lazy()` for code-split components, and Suspense-aware library hooks (e.g. data libraries). These are not the 2026 default for data, so they get a mention and no more.

`Term` candidates: **`use()`** (React hook that reads a Promise/Context and suspends until ready — brief, since chapter 030 introduced it), **streamed Promise** (a Promise created on the server and handed to the client as a prop).

### A good fallback mirrors the resolved layout

Teach the fallback contract and what separates a senior fallback from a junior one.
Two rules:
1. **The `fallback` is rendered synchronously and must not itself suspend.** A fallback that awaits or reads a pending Promise makes the boundary useless — there's nothing to show while showing the loading UI. State this as a hard constraint.
2. **Prefer a skeleton that mirrors the final layout** — same heights, same item count, same rough shape — so the content swap doesn't shift layout. Spinners and "Loading…" text are acceptable but lower-quality UX because they collapse to a different size than the real content, causing a jump.

Visualize the difference with a small `TabbedContent` or side-by-side `<Figure>`: tab/panel A shows a spinner fallback then the resolved list (with a visible layout jump implied); tab/panel B shows a skeleton fallback whose rows match the resolved list (no jump).
Pedagogical goal: the student *sees* why skeleton-matching-layout is the senior reach, not just reads the assertion.
Use HTML/CSS for these mock UIs (devtools-inspectable, cheap to author).

Tie to a real production stake in one sentence: layout shift on data load is a measurable UX defect (it hurts perceived performance and is jarring on every page view), which is why teams invest in skeletons that match.

Short note: the student writes the fallback — Suspense does **not** auto-generate a skeleton from the children.

### Drawing the boundary at the unit of UX

This is the heart of the lesson and the senior decision.
Lead with the diagnostic question the student should internalize: **"What should the user see resolve as a single unit?"**

Teach the rule by contrast with a `CodeVariants` (or two `Code` fences side by side via `CodeVariants`):
- **One boundary around two independent reads** — a fast user-profile read (10 ms) and a slow activity read (800 ms) share one `<Suspense>`. First-sentence frame: **the user waits 800 ms to see the 10 ms widget too — the slow read holds the fast one hostage.**
- **Two boundaries, one per read** — each widget owns its own `<Suspense>` and its own async child. Frame: **each resolves and reveals independently; the fast widget paints immediately.**

Pair this with a diagram — a `<Figure>` containing an `ArrowDiagram` or a simple HTML two-column layout — contrasting "1 boundary = 1 fallback for everything" against "2 boundaries = 2 independent fallbacks."
Goal: make boundary count map visually to reveal granularity.

State the unit-of-UX rule cleanly: draw the boundary around the smallest piece of UI that loads as a single concept (a widget, a list, a sidebar card).
Two things that resolve independently belong in two boundaries; things that only make sense together belong in one.

Note explicitly that *why parallel boundaries each reveal separately* (the streaming transport) is lesson 2's job — here the student only learns the **placement decision**, framed as UX, with the mechanism deferred.
This keeps the lesson scoped and avoids pre-teaching streaming.

**Decision drill — `StateMachineWalker` (`kind="decision"`).**
Build a short "where does the boundary go?" walker that forces the senior question order.
- Root question: "Do these pieces of data resolve into one combined view, or several independent views?"
  - Branch "One combined view (e.g. a summary that aggregates them)" → leaf: **One boundary around the whole unit** (and a one-line forward-pointer that `Promise.all` in a single component is the data-side counterpart — lesson 2).
  - Branch "Several independent views" → next question: "Do they finish at similar speeds, or is one much slower?"
    - "Similar" → leaf: **Separate boundaries still fine; cost is low, reveal stays granular.**
    - "One much slower" → leaf: **Separate boundaries — wrap the slow one so the fast ones paint immediately.**
Pedagogical goal: the lesson lives in the *order* of questions (combined-vs-independent first, then latency), which is exactly the senior reasoning. Keep leaves to two sentences.

### Nested boundaries compose into a reveal cascade

Teach composition: Suspense boundaries nest, and nesting produces a content-first reveal without any coordinating state.
The model: an outer boundary's fallback shows until its directly-awaited content is ready; once the outer subtree renders, an inner boundary takes over for its own slower subtree, showing the inner fallback while the rest is already visible.

Best vehicle: a `DiagramSequence` of 3–4 steps (this is inherently temporal).
- Step 1: outer fallback covers everything (shell skeleton).
- Step 2: outer resolves — shell + header visible, inner region still showing its own skeleton.
- Step 3: inner resolves — full content.
Per-step captions name what's on screen and which boundary is responsible.
Pedagogical goal: the student sees that "skeleton, then partial, then full" is *built from nesting*, not from orchestration code. Do not wrap `DiagramSequence` in `<Figure>` (it is its own card).

Companion code: a compact `Code` fence showing the nested JSX (`<Suspense fallback={Shell}>` containing some synchronous header plus an inner `<Suspense fallback={Inner}>` around the slow child).
One watch-out in prose: nesting *too* deeply produces a distracting flash-cascade of skeletons — nest at meaningful UX seams, not at every component.

### Re-suspending on input change with `key`

Teach the trap and its fix.
Setup: the same component re-renders with new props — a different `invoiceId`, a new search query.
React, seeing the same component in the same position, reuses the already-resolved tree and **skips the fallback**, so the user stares at *stale* content while the new data loads. This surprises everyone the first time.

The fix: put a `key` that changes with the input on the suspending subtree (or the `<Suspense>`), e.g. `key={invoiceId}`.
A changed `key` tells React this is a *different* instance, so it remounts, re-suspends, and the fallback returns.
Frame as the senior reach for "show a loading state when the route param changes" without reintroducing an `isPending` flag.

Code: a small `CodeVariants` —
- "Without key": stale content flashes on param change. Frame: **React reuses the resolved tree; no fallback.**
- "With `key={invoiceId}`": fallback returns on every change. Frame: **changed key = fresh mount = fresh suspend.**

Name the counterpart once, do not teach it: a state update wrapped in `startTransition` does the *opposite* on purpose — it keeps the old tree visible and exposes `isPending` instead of flashing the fallback, which is what you want for search-as-you-type or tab switches.
`useTransition` is owned by chapter 025 lesson 5; one sentence and a pointer is enough here.

`Term` candidate: **`key`** (React's identity hint — changing it remounts the subtree; brief reminder, the student met `key` in lists).

### What Suspense does not do

A short, explicit boundary-of-responsibility section, because every misconception here is a real bug the student will otherwise hit.
List, each one sentence:
- **It does not catch errors.** A thrown error escapes Suspense and needs an Error Boundary / `error.tsx` (lesson 3). Suspense catches a *suspend* signal, not an error.
- **It does not retry, and `fallback` is not an error state.**
- **It does not deduplicate fetches.** Two children reading the same data make two requests unless something memoizes them (`cache()` / request memoization — chapter 032 lesson 5).
- **It does not auto-skeleton** — the student writes the fallback.

A tiny `Buckets` or `MultipleChoice` could check the error-vs-loading split, but keep it light; the dedicated understanding check is the next section.
Pedagogical goal: pre-empt the "I wrapped it in Suspense, why did the error still crash the page?" support ticket by naming the seam to lesson 3 cleanly.

### Practice: place the boundary

Hands-on consolidation with a `ReactCoding` exercise (target-match or tests mode).
Because `ReactCoding` runs client-side React 19 (no real server/DB), simulate suspending children with a component that reads a `use(promise)` where the promise is a `setTimeout`-backed resolve — this faithfully reproduces the suspend/fallback behavior in-browser.
Provide a starter with two simulated-async widgets (a fast one and a slow one) currently sharing one wrong-shaped boundary or no boundary; the student's task is to give the slow widget its own `<Suspense>` with a skeleton fallback so the fast widget paints immediately.

- `instructions`: "Wrap the slow widget so the fast widget renders without waiting. Each widget should show its own skeleton while loading."
- Grading: `tests` asserting two distinct `<Suspense>` regions / that a fallback testid renders for the slow widget on first paint and the fast widget's content is present immediately. If reliable DOM assertions on suspend timing prove flaky in this runtime, fall back to `target` match against a reference output.
- Keep the starter under ~25 lines; pre-write the `delay()`/`use()` helper and the skeleton components so the student focuses only on boundary placement.

Pedagogical goal: the student performs the unit-of-UX decision, not just reads it.
If the agent finds the suspend-in-`ReactCoding` simulation unreliable, downgrade to a `Sequence` exercise ordering the reveal phases (shell → fast widget → slow widget) over a fixed nested-Suspense code block, and note the substitution.

### Recall check

Close with 2–3 `MultipleChoice` cards targeting the specific misconceptions (answers must paraphrase, not quote the prose):
1. What renders during a Server Component's `await`, and what drives the swap back to content (the contract).
2. Two independent reads, one fast one slow — which boundary shape lets the fast one paint first (unit-of-UX).
3. A detail view shows stale data when the route param changes — which fix returns the loading state (`key`), with a distractor offering an `isLoading` flag (the thing we replaced) and a distractor offering `try/catch` (the error confusion).
Optionally a `TrueFalse` round folding in "Suspense catches errors" (false) and "the fallback may itself await" (false).

### External resources (optional)

One or two `ExternalResource` cards: the React `<Suspense>` reference and the Next.js streaming/Suspense doc.
Optional `VideoCallout` only if a current, high-quality short explainer on Suspense-as-a-contract is available; do not pad with a long video. The resourcer pass can fill this — leave a placeholder note rather than guessing a URL.

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- Server Components are the App Router default, can be `async`, and `await` data in the body (chapter 030 lesson 1).
- A Server Component can pass a `Promise` to a Client Component that reads it with `React.use()` (chapter 030 lesson 4).
- `key` as React's identity hint in lists (earlier React chapter).

**This lesson does NOT cover (defer, with a one-line pointer where the student would expect it):**
- **Streaming transport** — how the server flushes the shell first and resolved boundaries later, chunked HTTP, why parallel boundaries reveal independently. Lesson 2. (Here we teach only *where* boundaries go as a UX decision; the mechanism is deferred.)
- **`Promise.all` vs. parallel boundaries** as a data-fetching pattern — named once as the data-side counterpart to "one combined view," taught in lesson 2.
- **`loading.tsx` and the file conventions** — Suspense wired at the route segment by the framework. Lesson 3. (This lesson is the hand-written `<Suspense>` primitive that `loading.tsx` expands to.)
- **`error.tsx`, Error Boundaries, `not-found.tsx`** — error handling. Lesson 3. Named only as "Suspense does not catch errors."
- **`global-error.tsx`** — lesson 4.
- **`useTransition` / `useDeferredValue`** in full — chapter 025 lesson 5. Named once as the deliberate opposite of `key` re-suspending.
- **Promise stability rules / `cache()` / request memoization** — chapter 032 lesson 5. Named once as the reason a Client-created Promise breaks.
- **`useOptimistic` and Server Action UX** — chapter 044.
- **Caching, PPR, static vs. dynamic rendering** — chapter 032.

## Notes for downstream agents

- Deliberate divergence from production code conventions: the `ReactCoding` exercise simulates suspending with a `setTimeout`-backed `use(promise)` because the in-browser runtime has no server/DB. Label it in the exercise framing as a teaching stand-in for an `async` Server Component / streamed Promise, so the student doesn't carry the `setTimeout` shape into real code.
- Keep all diagrams horizontal and under the ~800px height cap; the contract, unit-of-UX, and skeleton-vs-spinner visuals are small by design.
- Do not introduce `loading.tsx` even informally — it is the single most tempting scope leak here, and lesson 3 needs it fresh.
