# Reading promises with use()

**Title (h1):** Reading promises with use()
**Sidebar label:** Reading promises with use()

---

## Lesson framing

This is the lesson that closes the loop opened in lesson 2 ("effects don't run on first paint — `use()` is what replaced effect-fetching") and lesson 4 (the fetch-on-mount anti-pattern's fix path named `use()` but not taught). The senior payload: **`use()` lets a Client Component *read* an async resource during render and let React suspend, instead of orchestrating loading state by hand with `useEffect` + `useState` + a spinner.** The 2020 shape (effect kicks a fetch, sets state, manual loading/error/cleanup, no SSR) collapses into one line — `const data = use(promise)` — with loading delegated to a Suspense boundary and errors to an error boundary.

Two distinct capabilities live under one API and the lesson must keep them separate in the student's head:
1. **Unwrap a Promise** (suspend until resolved) — the headline, ~70% of the lesson.
2. **Read a Context conditionally** — the small bonus capability `useContext` lacks (cashes the one-sentence forward-ref from lesson 5). ~15%.

The remaining ~15% is the **stable-promise rule** — the single mistake that turns `use()` into an infinite suspend loop, and the one thing a junior will get wrong on day one.

Pedagogical spine, in order of cognitive load:
- **Lead with the pain, not the API.** Open on the concrete senior scenario from the outline: a Server Component has a slow DB query, needs to hand the result to an interactive Client child. The child can't `await` (Client Components aren't async), shouldn't `useEffect` (the anti-pattern this whole chapter has been dismantling). Show the dead end *before* the primitive.
- **Simplified model first, then complexity.** Stage 1: "`use(promise)` returns the value, or pauses the component if the value isn't ready yet." That mental model (synchronous-looking read that can interrupt) is the whole thing. Stage 2: *where does it pause to?* → the nearest `<Suspense>`. Stage 3: *what if it rejects?* → the nearest error boundary. Stage 4: *the catch* → the promise has to be stable. Build the picture one layer at a time; never dump the full throw-to-suspense machinery up front.
- **`<Suspense>` is a borrowed prerequisite, not a topic.** Define it in one sentence (a boundary that shows a fallback while a descendant is suspended) and a one-line `Term`/code sketch, then *use* it. Explicitly flag that placement granularity, nested boundaries, streaming, and the segment files are **chapter 031's** job — this lesson only needs "a fallback shows while the thing loads." Same for the error boundary: name it, show the minimal shape, defer depth to Unit 16. Do **not** re-teach Server Components — that's chapter 030; reference the `'use client'` boundary as already-known shorthand.
- **Decision framing over feature tour (course pillar).** The durable senior skill here is *which async-read tool for which situation*, so the lesson must land two comparisons crisply: `use()` vs. the old `useEffect`+state shape (what it replaces and why), and `use()` vs. TanStack Query (the lower-level streamed-read primitive vs. the client cache/poll/mutate layer). Frame `use()` as the **default for initial server-rendered reads**; TanStack Query as the trigger-gated upgrade (chapter 11). Both are recognition-depth comparisons, not full teaches.
- **`use()` in Server Components is a trap to pre-empt.** Seniors over-reach. State the rule plainly: Server Components `await` directly; `use()` earns its place in *Client* Components reading a promise from a server parent, and in conditional context reads. Don't sprinkle it where `await` is shorter.

The running example threads one domain object — a dashboard panel streaming a slow read (e.g. an activity feed or notifications list) from a Server parent into a Client child — so every code sample is the same story at a different zoom level. Keep examples staged/simplified per chapter convention: `'use client'` shown but no Result type, no real auth, abstract `getActivity()` standing in for the Drizzle query. Flag that production shape (the full data path, `cache()` dedup, real error UX) is owned by later chapters.

Exercises: one `MultipleChoice` to harden the stable-promise diagnosis (the infinite-loop tell), and one `ReactCoding` where the student converts an effect-and-spinner component into a `use()` + Suspense read (the single most representative real refactor). The conceptual model benefits from one `DiagramSequence` showing the suspend/resolve/re-render lifecycle — this is the one place a temporal animation earns its weight over prose.

---

## Lesson sections

### Introduction (no header)

Open on the senior scenario, concretely. A dashboard route is a Server Component that fires a slow read (`getActivity(orgId)` — a few hundred ms). The result feeds an **interactive** panel (filtering, marking-as-read) that must be a Client Component. State the three dead ends the student already knows are wrong, each in one line, so the gap is undeniable:
- It can't `await` — Client Components can't be `async` (back-ref chapter 030 / the module-boundary rule).
- It shouldn't `useEffect(() => getActivity().then(setData), [])` — that's the lesson-4 anti-pattern, and it can't run during SSR so the first paint has no data.
- It shouldn't hand-roll `useState` + spinner + error flag — manual orchestration this chapter has been retiring.

Land the thesis: the Server parent starts the read and passes the *unresolved promise* down; the Client child **reads** it with `use()` and lets React handle the waiting. Preview the end state — by the lesson's close the student can stream a server read into a Client Component with one line and a Suspense boundary, and can name when to reach for TanStack Query instead. Keep it to ~4-6 sentences, warm and terse.

Reasoning: the course's "decisions before syntax" filter wants the senior question implicit in the intro; staging the three dead ends first makes `use()` feel like relief rather than a new toy.

### The shape of use()

Teach the signature and the simplest mental model before any machinery.

- `const value = use(resource)` — `resource` is a `Promise<T>` **or** a `Context<T>`; returns `T`.
- The one-sentence model to commit: **`use()` reads a resource during render and either hands back the value or pauses the component until it's ready.** "Pauses" is the hook into Suspense, introduced next.
- The four outcomes as a tight list (don't over-explain yet): Promise pending → component suspends; resolved → returns the value; rejected → throws to an error boundary; Context → returns the current value (and — flagged for later — can be read conditionally).
- Note it's imported from `react` alongside the hooks but is described by React as an **API, not a hook** — which is *why* it gets the rules-of-hooks exemption taught later. Plant the flag here, pay it off in "Why use() can be called conditionally."

Components: a single `Code` block for the signature line is enough — this is a one-liner, not a multi-part file, so `AnnotatedCode` would be overkill. `Term` tooltip on **suspend** (a component pausing its render until an awaited resource is ready, handing control to the nearest Suspense boundary).

Reasoning: establishing the synchronous-looking read as the core model up front means everything after is just "where does the pause go / what makes it safe," which is lower load than leading with throw-to-boundary internals.

### Streaming a server read into a Client Component

The headline use case — this is the section that earns the lesson.

- The full pattern, both halves shown together with `CodeVariants` (two related files, the component-grouping use of the component):
  - **Server parent** (`page.tsx`, Server Component): call the read **without awaiting** — `const activityPromise = getActivity(orgId)` — and pass it as a prop into the Client child, wrapped in `<Suspense fallback={<ActivitySkeleton />}>`. Emphasize the *unawaited* promise crossing the boundary; back-ref chapter 030's "what crosses the RSC wire" only as recognition (Promises are one of the React extensions the wire accepts; the resolved value must be serializable).
  - **Client child** (`'use client'`): `const activity = use(activityPromise)` then render the list. No effect, no state, no loading branch in the child — the child renders *as if the data is already there*, because by the time it commits, it is.
- Walk the runtime with a **`DiagramSequence`** (see Diagrams below) so the student sees *why* this doesn't block the page: the shell renders, the boundary shows the fallback, the promise resolves, the child re-renders with data.
- Land the senior payoff explicitly against the old shape — use `CodeVariants` (before/after, the canonical use of the component for incorrect-vs-correct framing):
  - **Before** (`data-mark-color="red"`, smell-leading prose): `useEffect` + `useState` + `if (!data) return <Spinner/>`. Tally the costs in the prose: two renders, manual loading, manual error, manual cleanup, **no SSR / empty first paint**.
  - **After** (`data-mark-color="green"`): `const data = use(promise)`. One render, Suspense for loading, error boundary for errors, works during SSR.
- One sentence pre-empting the `<Suspense>` placement question: where you *put* the boundary (and how granular) is a UX decision owned by chapter 031; here, one boundary around the panel is enough.

Components: `CodeVariants` twice (the two-file pattern, then before/after), `DiagramSequence` for the lifecycle. `Term` on **RSC wire** (the serialization channel between Server and Client Components) and **Suspense boundary** (a `<Suspense>` wrapper that shows its `fallback` while any descendant is suspended).

Reasoning: showing both files side by side makes the "promise is created on the server, read on the client" data flow concrete — this split is the whole mental model and prose alone blurs which side owns what. The before/after is the course's decisions-before-syntax filter made literal: the student sees the pile of manual work `use()` deletes.

### The stable-promise rule

The one mistake that breaks everything — taught as a named failure mode, not a footnote.

- The bug, shown first (`CodeVariant` or a single `Code` block marked red): `const data = use(fetch('/api/activity'))` *inside the component body*. Walk the death spiral in prose: render creates a new promise → `use()` suspends → promise resolves → component re-renders → render creates *another* new promise → suspends again → never settles. The diagnostic tell the student must recognize: **a component stuck on its fallback forever / a network tab firing the same request on loop.**
- The rule: **the promise passed to `use()` must be referentially stable across renders for the same logical resource.** `use()` tracks the promise *by reference* (forward-link to why it's exempt from rules of hooks).
- The two sanctioned sources of a stable promise:
  1. **Created in a Server Component** — runs once per request, so the promise is created once and streamed down (this is exactly the headline pattern; the stability is free).
  2. **Held in a stable reference** for client-origin promises — name `cache()` (server) and, for client-side async that needs caching/refetch, defer to TanStack Query. Do **not** teach `useMemo`-wrapping a fetch as a blessed pattern — flag it as a fragile last resort the conventions steer away from; the real answer for client-cached data is the next section's tool.
- Connect to `cache()` at recognition depth only: React's server-only `cache()` dedups calls to the same function with the same args within a request, so two components reading the same resource share one fetch. One-line example, then defer the full data path to **chapter 032**. Important nuance to state (not belabor): `use()` itself does **not** deduplicate — two children each calling `use(samePromise)` is fine (same reference), but two children each *creating* their own promise for the same data suspend independently; `cache()` is what collapses the *function calls*.

Components: `MultipleChoice` here — give the student three component snippets and ask which one suspends forever, with the diagnostic in the `McqWhy`. Make the choices structurally different (promise created in body vs. passed as prop vs. created in a parent) so it's a reasoning task, not prose-matching. `Term` on **referentially stable** (the same object reference across renders, compared by `Object.is`) — back-ref the identity trap from chapter 024.

Reasoning: this is the highest-leverage 10 minutes in the lesson — every `use()` bug a junior hits in the wild is this one. Teaching it as a recognizable shape (forever-fallback + looping network) rather than an abstract rule is what makes it stick. Steering away from `useMemo(fetch)` keeps the lesson aligned with the conventions' "no manual memo by default" and "TanStack Query for client cache" posture.

### use() vs. TanStack Query

The decision the senior actually makes — recognition-depth comparison, not a teach of TanStack Query.

- The cut, stated as a reflex: **initial server-rendered read, simple "fetch once and show it" → `use()` + Server Components. Interactive client data needing cache, polling, invalidation, or optimistic updates → TanStack Query** (the four triggers, named, owned by chapter 11).
- `use()` is the lower-level primitive — closer to the metal, no cache, no automatic refetch, no mutation story. TanStack Query is the batteries-included layer for client-owned server state.
- They compose, not compete: TanStack Query's `useSuspenseQuery` suspends through the *same* Suspense machinery `use()` taps. One sentence; depth is chapter 11.
- Tie back to the chapter's through-line: this is the same "platform default before the power tool" shape as every other lesson — reach for the heavier tool only when a named trigger crosses.

Components: a 2-row comparison rendered as a small `Figure`-wrapped HTML table, or a tight `MultipleChoice` ("which tool for this requirement?") — prefer the table for scannability plus one MCQ scenario. `ExternalResource` cards (TanStack Query docs, React `use` reference) belong in the closing resources, not here.

Reasoning: the course optimizes for the decision, not the API surface. A student who leaves knowing *when* `use()` is the right reach and when to graduate to TanStack Query has the senior skill; memorizing the `use()` signature is the commodity part.

### Reading context conditionally with use()

The second capability — kept deliberately short and clearly separated from the promise story.

- The gap it fills: `useContext` must run at the top level, before any early return (rules of hooks). `use(Context)` can be called **after** an early return, inside a branch, inside a loop.
- The canonical reach: a component that bails early for a disabled/empty state and only needs the context value in the live path — `if (!isEnabled) return null; const theme = use(ThemeContext);`. Reading the context unconditionally at the top would be wasted (or force awkward restructuring).
- Same value `useContext` returns — this is *not* a different subscription model. Explicitly rebut the temptation: `use(Context)` does **not** give per-field subscription and does **not** change the every-consumer-re-renders rule from lesson 5; it only relaxes *where* the call can sit. (Back-ref lesson 5's "all-or-nothing subscription" thesis.)
- Frame it as "rarely needed, but the one thing `useContext` can't do" — don't oversell it.

Components: one `Code` block for the early-return-then-`use` snippet, highlighting the early `return` and the conditional `use` call. No exercise here — it's a small capability; the MCQ budget is better spent on the stable-promise diagnosis.

Reasoning: bundling both capabilities under one API risks the student conflating them. Teaching context-reads as a short, clearly-fenced section *after* the promise story keeps the two mental models distinct, and the explicit rebuttal of "this fixes the re-render storm" prevents a wrong inference from lesson 5.

### Why use() can be called conditionally

Pay off the flag planted earlier — the conceptual closer that connects to lesson 8.

- Restate the exemption: alone among the React API surface, `use()` may be called conditionally, after early returns, in loops, in branches.
- The *why*, which is the actually-interesting part: regular hooks (`useState`, `useEffect`) are tracked by **call order** — React advances an internal slot index on each call and the next render must hit the same sequence. `use()` doesn't depend on call order: a **Promise is tracked by its reference**, a **Context by its position in the tree** — neither needs the indexed-slot bookkeeping. So conditional calls don't desync anything.
- The lint understands this — `react-hooks/rules-of-hooks` has a built-in exemption for `use()` and won't flag a conditional call. (Forward-ref lesson 8 for the full rules-of-hooks teach and the indexed-slot mechanic.)
- The senior guardrail, stated firmly: **this is the *one* deliberate exception — do not generalize it.** Every other hook still obeys top-level-only. A student who reads "hooks can be conditional now" has misread the lesson.

Components: a short `Aside` (note) pinning the one-exception rule so it's visually quotable. No diagram — the indexed-slot mechanic is lesson 8's to visualize; here a two-sentence contrast (order-tracked vs. reference/tree-tracked) is enough.

Reasoning: students *will* notice `use()` breaks the rule they're about to formalize in lesson 8, and an unexplained exception breeds cargo-culting. Explaining the mechanic (reference/tree lookup vs. call-order slots) satisfies the course's "explicit over magic" stance and inoculates against over-generalizing. Keeping it brief and forward-pointing avoids stealing lesson 8's thunder.

### Practice: replace the effect-and-spinner with use()

Hands-on consolidation — the single most representative real refactor.

- `ReactCoding`, tests-graded. Starter: a Client Component that fetches on mount via `useEffect`, holds `useState` for data + loading, and renders a spinner until data arrives — receiving a **stable promise prop** so the exercise is self-contained in the browser runtime (no real server round-trip). The student rewrites the body to `const items = use(itemsPromise)` and deletes the effect, the state, and the loading branch, with the component wrapped so a Suspense fallback covers the pending phase.
- Grading (tests; failure names carry the fix since error text is hidden from the student): assert the resolved list renders; a source-shaped assertion that the component no longer declares `useEffect`/`useState` (the point is *deleting* the orchestration, not duplicating it). Keep the promise stable (passed in / module-scope) so the student doesn't hit the infinite-loop trap mid-exercise — but mention in the instructions *why* it's passed in, reinforcing the stable-promise rule.
- Reference solution behind `<details>`.

Reasoning: lesson 4 named "delete the effect, derive in render" as the canonical fix for *derived* state; this is its async sibling — "delete the effect, read the promise." A guided `ReactCoding` (over a sandbox) lets the student feel the deletion, which is where the senior lesson lands. Per `react-coding.md`, tests-mode with failure-name-as-hint is the right grading shape.

### External resources (optional closing LinkCards)

A small `CardGrid` of `ExternalResource` cards: React `use` reference (react.dev), TanStack Query docs (as the named graduation path), and optionally the React `cache` reference. Keep to 2-3, brand-iconed.

---

## Scope

**Prerequisites to restate briefly (one line each, not re-taught):**
- `<Suspense>` exists and shows a `fallback` while a descendant is suspended — minimal definition only; placement/granularity/streaming is **chapter 031**.
- Error boundaries catch thrown errors and render a fallback — name the minimal shape; depth is **Unit 16**.
- Server Components run on the server and can `await`; `'use client'` marks the interactive boundary — already taught conceptually, owned in full by **chapter 030**.
- `useContext` and the all-or-nothing re-render rule — from **lesson 5**.

**Explicitly out of scope (defer, do not teach):**
- `<Suspense>` placement, nested boundaries, the `key`-to-re-suspend trick, streaming SSR, and the `loading.tsx` / `error.tsx` / `not-found.tsx` segment files → **chapter 031**.
- Server Components, the `'use client'` / `'use server'` directive mechanics, and the full "what crosses the RSC wire" rules → **chapter 030** (referenced as recognition only).
- `cache()` at depth, `'use cache'`, `cacheLife`/`cacheTag`, and the full App Router data path → **chapter 032**.
- The action-side React 19 async surface — `useActionState`, `useFormStatus`, `useOptimistic`, Server Actions → **Unit 6** (one forward-reference sentence max; these are the "write/submit async" counterparts to `use()`'s "read async").
- TanStack Query's API — `useQuery`, `useSuspenseQuery`, cache/poll/invalidate/optimistic mechanics → **chapter 11** (named as the decision boundary, not taught).
- The full rules of hooks, the indexed-slot mechanic, and the ESLint setup → **lesson 8** ("Why use() can be called conditionally" forward-refs it; does not pre-teach it).
- Error boundaries at depth, `react-error-boundary`, error UX patterns → **Unit 16**.
- Browser-only promises (timers, `setTimeout`) coordinating with UI — explicitly *not* a `use()` case; that's `useEffect`+state or `useDeferredValue` (lesson 2 / lesson 6). One watch-out sentence so the student doesn't misapply `use()` to non-resource async.

---

## Code conventions notes (for downstream agents)

- `use` is imported from `'react'`. Promise read in a Client Component must be wrapped in a Suspense boundary; the promise must be stable across renders (conventions §Hooks: "`use(promise)` reads a server-streamed Promise inside a Client Component, wrapped in a Suspense boundary. The promise must be stable across renders.").
- Client Components are never `async`; they take Promises as props and read them with `use()` (conventions §Module boundaries — quote the rule, it's the exact justification for the headline pattern).
- The resolved value crossing the RSC wire must be serializable (structured-cloneable + React extensions). Abstract `getActivity()` examples should resolve to plain objects/arrays, never class instances or functions.
- Server Components `await` directly — do **not** show `use()` inside a Server Component; that's the over-reach the lesson warns against.
- **Deliberate divergences from conventions (flag for downstream agents):** (1) "Before" variants intentionally violate the conventions (effect-fetch, manual spinner) — mark `data-mark-color="red"` with smell-leading prose so no agent mistakes them for endorsed code; "after" variants are convention-clean (`green`). (2) Examples are staged/simplified — `'use client'` shown but no `Result` type, no real auth, no real Drizzle query, no full error UX — production shape is explicitly later chapters' job. (3) The `useMemo(fetch)` stable-promise workaround is named but *not* endorsed — keep it subordinated to "Server Component / `cache()` / TanStack Query" per the no-manual-memo-by-default convention.
- React version references must read **React 19** (or **19.2** if a version is stated); Next.js 16. Never invent versions; `use()` is stable, no experimental flag.

---

## Terms to tooltip (strategic set)

- **suspend** — a component pausing its render until an awaited resource is ready, handing control to the nearest Suspense boundary.
- **Suspense boundary** — a `<Suspense>` wrapper that renders its `fallback` while any descendant is suspended.
- **error boundary** — a component that catches errors thrown by descendants and renders a fallback instead.
- **RSC wire** — the serialization channel that carries values (and Promises) from Server Components to Client Components.
- **referentially stable** — the same object reference across renders, compared by `Object.is` (back-ref the chapter-024 identity trap).
- **`cache()`** — React's server-only request-scoped deduplication of a function's calls (recognition only; depth in chapter 032).

(Deliberately *not* tooltipping: Server Component, Client Component, `useContext` — already owned/taught; over-tooltipping dilutes the signal.)
