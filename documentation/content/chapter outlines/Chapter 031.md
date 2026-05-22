# Chapter 031 — Loading, errors, and the four async files

## Chapter framing

Chapter 031 teaches the primitives that ship user-visible state for slow, failing, or missing data. The student already knows from Chapter 030 that Server Components can `await` data in the function body — what they don't yet know is what the user sees while the await is pending, what they see when it throws, and what they see when the resource is missing. The chapter names Suspense as the React primitive that declares a loading contract around an async boundary, streaming as the wire mechanism Next.js uses to deliver Suspense fallbacks first and resolved content second, and the four file conventions (`loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`) that wire those primitives into route segments with a single file each. Next.js 16, React 19, and Partial Prerendering form the rendering backdrop; the chapter focuses on the UX seams, not the cache mechanics (chapter 032 owns those).

Threads that run through every lesson: Suspense is a declarative contract — "render the fallback until the child stops suspending" — and the senior reach is to draw the boundary at the unit of UX, not the unit of code; streaming is the default in the App Router and the reason a slow query no longer blocks the shell; the file conventions are sugar over React primitives (`loading.tsx` wraps the route in `<Suspense>`, `error.tsx` wraps it in an Error Boundary), and the student should be able to name the primitive each file expands to; error boundaries are class-component machinery exposed only at file conventions and through third-party libraries — the student writes `error.tsx`, not a class; `global-error.tsx` replaces the root layout when it fires and must own its `<html>` and `<body>` because the layout is already gone; `notFound()` and the `not-found.tsx` file are how a route signals "this resource doesn't exist" without throwing. The chapter ships four teaching lessons plus a quiz, ordered by dependency: Suspense as the primitive first, then streaming at the route boundary, then the three sibling file conventions, then `global-error.tsx` as the root-level escape hatch — Chapter 032 picks up with rendering and caching.

---

## Lesson 1 — Suspense, the fallback contract

What the user sees while a Server Component awaits: `<Suspense fallback>` as React's declarative loading boundary, the two suspending shapes (async Server Components and `React.use()` on a streamed Promise), the unit-of-UX rule for placement, nested-boundary composition, and the `key` prop for re-suspending on param change.

Topics to cover:

- **The senior question.** A Server Component awaits `db.invoices.find()` and the query takes 800ms. What does the user see for those 800ms, and how does the student declare it without scattering `isLoading` state across the tree? The lesson names `<Suspense fallback={...}>` as React's contract: "while any child suspends, render the fallback; when every child resolves, render the children."
- **What Suspense is.** A React component that catches the suspense signal thrown by any descendant — a pending Promise read with `React.use()`, an async Server Component, or a Suspense-aware library — and renders its `fallback` prop in place of `children` until the descendant stops suspending. Not a hook, not a config flag, just a component with one job.
- **The two suspending shapes the student writes.** An `async` Server Component whose body awaits data; a Client Component that calls `React.use(promise)` on a Promise passed from a Server Component (the streaming-Promise pattern from lesson 4 of chapter 030). Both throw a suspense signal until ready. Other shapes — `lazy()`, third-party suspending hooks — named once.
- **The fallback contract.** The `fallback` prop is rendered synchronously and must not itself suspend. Senior reach: skeleton UI that mirrors the final layout (same heights, same number of items) so layout doesn't shift when the resolved content swaps in. Spinners and "Loading..." text are acceptable but lower-quality UX.
- **Where the boundary belongs — the unit-of-UX rule.** Draw the Suspense boundary around the smallest piece of UI that loads as a single concept: a dashboard widget, a list, a sidebar. Two slow queries that resolve independently belong in two boundaries so each shows its fallback and resolves separately; one fast-and-one-slow query in the same boundary makes the user wait for the slow one. The senior diagnostic: ask "what should the user see resolve as a unit?"
- **Composition — Suspense boundaries nest.** An outer boundary's fallback shows until *any* child suspends; once it resolves, an inner boundary takes over for its own subtree. The skeleton-then-content cascade is built from nested boundaries; the student gets a content-first reveal without coordinating state.
- **The `key` prop for re-suspending on input change.** When the same component re-renders with new props (a different invoice ID, a different search query), React reuses the resolved tree and skips the fallback — the user sees stale content while the new data loads. Setting `key={invoiceId}` forces a fresh suspend on every change; the fallback returns. The senior reach for "loading state on param change" without juggling `isPending` state.
- **The interaction with `useTransition` — named once.** A state update wrapped in `startTransition` does not re-trigger the Suspense fallback; instead the previous tree stays visible and `isPending` reads true. The pattern earns its weight when the fallback would be jarring (search-as-you-type, tab switches). lesson 5 of chapter 025 owns the hook; named here so the student knows the option exists.
- **What Suspense does not do.** It does not catch errors (`error.tsx` and Error Boundaries own that, lesson 3 of chapter 031). It does not retry. It does not deduplicate fetches (React `cache()` and the request memo cache own that, lesson 5 of chapter 032). It does not auto-skeleton the children — the student writes the fallback.
- **The Server Component shape.** `<Suspense fallback={<InvoiceSkeleton />}>` wrapping an `async` child is the canonical 2026 form. The child can be a Server Component, a Client Component, or a mix; Suspense doesn't care about the boundary, only about whether something suspended.
- **The Client Component shape — streaming Promises.** Server Component creates `const invoicesPromise = db.invoices.find()`, passes it to a Client Component as a prop, the Client Component reads `const invoices = use(invoicesPromise)`. Suspense above the Client Component catches the throw. This is how interactive shells (sorting, filtering, animation) wrap streamed data.
- **Watch-outs.** Suspense is not for errors — wrap with `error.tsx` or a separate Error Boundary; fallbacks that themselves suspend make the boundary useless; `key`-less Suspense around param-driven children shows stale content during transitions; nesting too deeply produces a flash-cascade of skeletons; promise creation in Client Components for `use()` is not stable across renders — create on the server, pass down, or wrap in a memo with `cache()` (lesson 5 of chapter 032); a Suspense boundary inside an `async` Server Component still has to wait for the parent's await before rendering its child.

What this lesson does not cover:

- Streaming and how the route shell sends fallbacks before resolved content (lesson 2 of chapter 031).
- `loading.tsx` as Suspense at the route boundary (lesson 3 of chapter 031).
- `error.tsx`, `not-found.tsx`, and Error Boundary semantics (lesson 3 of chapter 031).
- `global-error.tsx` (lesson 4 of chapter 031).
- `useTransition`, `useDeferredValue` in full — lesson 5 of chapter 025.
- `useOptimistic` and Server Action UX — lesson 6 of chapter 044.
- The full `React.use()` API and Promise creation rules — Chapter 025 in context, lesson 4 of chapter 030 introduced.
- Caching and `cache()` for request memoization — Chapter 032.

Estimated student time: 50 to 65 minutes. Load-bearing for every async UI in the course, the project in chapter 035, and every list-plus-detail surface in Units 10 and 11.

---

## Lesson 2 — Streaming a page in chunks

How the App Router flushes the shell first and resolved boundaries later: chunked HTTP transport, parallel data fetching with one Suspense boundary per independent read, `Promise.all` versus parallel boundaries, and the above-the-fold and sequential-await anti-patterns that defeat streaming.

Topics to cover:

- **The senior question.** A page renders three independent widgets: the user profile (10ms), the analytics chart (300ms), and the recent activity (800ms). With the React 18 rendering model the slowest query dictates time-to-first-byte. How does Next.js 16 deliver the fast widgets first and the slow one when it's ready? The lesson names streaming as the default response transport: the server flushes HTML in chunks, each Suspense boundary becomes its own chunk, and the browser paints what it has while the rest arrives.
- **What streaming is — the transport mental model.** The server opens an HTTP response, writes the static shell and any non-suspended content, then writes each Suspense fallback. When a suspended boundary resolves, the server writes a follow-up chunk — the resolved HTML plus a small inline script that swaps it into place. The connection stays open until every boundary settles. The user sees content progressively.
- **Why the App Router streams by default.** A `page.tsx` returns a stream, not a full document. Anywhere the renderer hits a suspended boundary, it emits the fallback and continues. No opt-in flag, no special export — the moment the student writes `<Suspense>` around an async child, streaming is in effect for that route.
- **The relationship to Partial Prerendering — named, deferred.** PPR (lesson 2 of chapter 032) extends streaming with a build-time static shell: the static parts ship from the CDN, the dynamic parts stream in. Same Suspense boundaries, two transports. lesson 2 of chapter 032 owns the rendering decision; this lesson focuses on the runtime mechanics of streaming a single request.
- **Parallel data fetching — the senior pattern.** Three Suspense boundaries with three independent async children, each starting its own query in the function body. Each query runs in parallel; each boundary streams independently. The wrong shape — one `async` parent that awaits all three sequentially — serializes the latency. The senior reach: each unit of UX owns its own data fetch *and* its own Suspense boundary.
- **`Promise.all` vs. parallel Suspense — when each wins.** `Promise.all` in one component when the UI cannot render before all data is in (e.g., a summary that aggregates across all three). Parallel Suspense boundaries when each piece can render independently (the dashboard widget case). The decision is whether the data is consumed *together* or *adjacently*.
- **Streaming and parallel routes — lesson 5 of chapter 029 revisited.** Each `@slot` in a parallel route is its own independent subtree and gets its own Suspense boundary. List-plus-detail surfaces stream the list and the detail in parallel; either can show its skeleton while the other resolves. The chapter 035 project leans on this.
- **What happens before the first byte.** Server Components above any Suspense boundary still block — they run to completion before any HTML flushes. The senior reach: keep above-Suspense work cheap (auth check, layout shell), push every slow read below a boundary. A 50ms global query in the root layout is 50ms of blank screen for every route.
- **The "above the fold" anti-pattern.** Wrapping the whole page in one big `<Suspense>` produces a single fallback for everything — defeats streaming. Wrap the *slow* parts only; let the fast parts ship in the initial chunk so the user sees the shell instantly.
- **Network panel reading — the diagnostic.** Open DevTools, watch the response stream in chunks; the initial chunk carries the shell and fallbacks, subsequent chunks carry the resolved content. The senior habit: confirm what's in the initial chunk by reading the network response, not by guessing from render order.
- **Cancellation and abandonment.** When the user navigates away mid-stream, Next.js aborts the request. Server work in flight (DB queries, fetch calls) does not auto-cancel — pass `signal` from `connection()` or accept the cost. Named here; full cancellation surface in lesson 8 of chapter 032.
- **Server-Sent Events and WebSockets — named once, dropped.** Streaming the RSC payload is HTTP response streaming, not SSE/WS. For real-time push (live notifications, chat), the SaaS reach is a dedicated channel (Pusher, Ably, server-sent events from a route handler) — out of scope here.
- **Watch-outs.** A page with no Suspense boundaries blocks until the slowest await completes; one big top-level Suspense produces a one-shot loading screen, not progressive reveal; sequential `await` calls in one Server Component serialize the requests even if they're independent — destructure with `Promise.all` or split into Suspense-wrapped children; slow work in a layout blocks every page under it; the streaming protocol is HTTP/1.1 chunked or HTTP/2 — no special infra; Vercel and Node servers stream out of the box; some edge proxies and old CDNs buffer the response and break streaming — the diagnostic is "did the initial chunk arrive while later chunks were still in flight?"

What this lesson does not cover:

- The file conventions — `loading.tsx`, `error.tsx`, `not-found.tsx` (lesson 3 of chapter 031).
- `global-error.tsx` (lesson 4 of chapter 031).
- Partial Prerendering, `cacheLife`, `cacheTag` — Chapter 032.
- `connection()` and dynamic-rendering opt-in — lesson 8 of chapter 032.
- Real-time push (SSE, WebSockets) at depth.
- Parallel routes in full — lesson 5 of chapter 029.
- React `cache()` for deduplicating parallel queries — lesson 5 of chapter 032.

Estimated student time: 45 to 60 minutes. Load-bearing for every page with more than one slow read, the project in chapter 035, and the PPR rendering model in lesson 2 of chapter 032.

---

## Lesson 3 — The three segment files

The file conventions that wrap a route segment in Suspense, an Error Boundary, and a 404 surface: `loading.tsx` as Server-Component fallback, `error.tsx` as a `"use client"` boundary with `error` and `reset` props, `not-found.tsx` paired with `notFound()` from `next/navigation`, and their composition around `page.tsx`.

Topics to cover:

- **The senior question.** Now that the student knows Suspense and Error Boundaries are React primitives, what does Next.js give them above the primitives so they don't write a Suspense wrapper at every page? The lesson names the three sibling file conventions: drop a file next to `page.tsx`, the framework wires it as the boundary for the segment and every nested segment until a child overrides it.
- **`loading.tsx` — Suspense at the route boundary.** A file named `loading.tsx` exporting a default component is the Suspense fallback for the segment. Next.js wraps the segment's `page.tsx` and nested layouts in `<Suspense fallback={<Loading />}>`. While the segment's Server Components await, the user sees `<Loading />`. The student writes a skeleton, the framework wires the boundary.
- **Scope and inheritance.** `app/dashboard/loading.tsx` applies to `app/dashboard/page.tsx` and every nested route under `dashboard/` that does not provide its own `loading.tsx`. A nested `app/dashboard/invoices/loading.tsx` overrides for that subtree. The senior reach: one `loading.tsx` per coherent visual surface, not one per route — many routes share the same shell.
- **`loading.tsx` is a Server Component by default.** No `"use client"` needed. It cannot use hooks (and shouldn't — a fallback that animates is a Client Component the loading file renders).
- **`error.tsx` — Error Boundary at the route boundary.** A file named `error.tsx` is wrapped around the segment's content as a React Error Boundary. Any uncaught throw in the segment, its layout, or its children below the error boundary renders the error UI instead of crashing the whole tree. Errors above the boundary (in a parent layout) escape it — they get caught by the next `error.tsx` up the tree.
- **`error.tsx` must be a Client Component.** The directive is mandatory: `"use client"` at the top of the file. React Error Boundaries are built on `componentDidCatch` and state — both client-only. The framework rejects a missing directive at build time with a clear error.
- **The `error.tsx` props contract.** Receives `error: Error & { digest?: string }` and `reset: () => void`. `digest` is the server-side error ID Next.js logs; the UI shows it for support tickets. `reset` re-renders the segment from scratch — the senior wires it to a "Try again" button. The full Error never crosses the wire (lesson 4 of chapter 030); only `message` and `digest` are populated in production, the stack is server-side only.
- **The hierarchy — bubbling.** Errors bubble from the throwing component up through Error Boundaries to the nearest `error.tsx`. If a `loading.tsx`-wrapped Suspense fallback is in flight when the error is thrown, the error skips the fallback and triggers the boundary. The diagnostic: `error.tsx` is for the *segment under it*, not for sibling segments.
- **`error.tsx` does not catch errors in its own layout.** A throw in the layout that wraps `error.tsx` escapes — the boundary is *inside* the layout's children. The fix is to put the `error.tsx` one segment up, or to add `global-error.tsx` at the root (lesson 4 of chapter 031) for the layout-throws case.
- **`not-found.tsx` — the platform's 404 surface.** A file named `not-found.tsx` is rendered when the framework triggers a not-found for the segment. The trigger is the `notFound()` function from `next/navigation` (named in lesson 4 of chapter 029): called inside a Server Component, it short-circuits rendering and renders the nearest `not-found.tsx` up the tree.
- **The two ways `not-found.tsx` fires.** The framework's automatic "no matching route" 404 renders the root `not-found.tsx`. A call to `notFound()` after a database lookup returns nothing renders the nearest `not-found.tsx` ancestor for that segment. The senior pattern: every dynamic-segment data fetch checks for null and calls `notFound()`; the resource-specific not-found UI lives next to the dynamic segment.
- **`not-found.tsx` is a Server Component by default.** Receives no props. Cannot read `params` or `searchParams` directly — if the UI needs them, fetch them in `page.tsx` and call `notFound()` with the context already in scope.
- **The composition — `loading.tsx`, `error.tsx`, `not-found.tsx` all wrap the segment.** Conceptually Next.js renders `<ErrorBoundary fallback={Error}><Suspense fallback={Loading}><NotFoundBoundary>{children}</NotFoundBoundary></Suspense></ErrorBoundary>`. The student doesn't write the wrap — three files do it.
- **The senior pattern for a dynamic segment.** `app/invoices/[id]/page.tsx` does `const invoice = await getInvoice(id); if (!invoice) notFound();`. Sibling `loading.tsx` for the skeleton, sibling `error.tsx` for failed fetches, sibling `not-found.tsx` for missing invoices. The full set of states ships with three files plus the page.
- **Status codes — what each file emits.** `loading.tsx` is part of a 200 streaming response. `error.tsx` emits 500 by default for an uncaught throw; for known errors, throw inside a Server Action and handle in the action return shape (Chapter 043). `not-found.tsx` emits 404 — correct for SEO and for monitoring.
- **The `error.tsx` and dev vs. production divergence.** In development, the error overlay shows before `error.tsx` renders, with the full stack. In production, only `error.tsx` renders, with `digest` for the logged error. The senior diagnostic: never test `error.tsx` UX in dev mode alone.
- **Watch-outs.** `error.tsx` must have `"use client"` or the build fails; `error.tsx` does not catch errors in the layout that wraps it (lesson 4 of chapter 031 owns the fix); `loading.tsx` is a Server Component, animations inside it should be in a Client child; `not-found.tsx` is triggered by `notFound()`, not by a 404 status from `fetch`; throwing inside a Server Action goes through different channels (Chapter 043); `reset` re-renders the segment, it doesn't refetch — if data is the cause, the new render will reproduce the error (combine with `router.refresh()` to retry data); the same `error.tsx` catches errors at the layout level for nested routes — write it as if it's the only safety net for everything below.

What this lesson does not cover:

- `global-error.tsx` for the root-layout case (lesson 4 of chapter 031).
- `notFound()` and other `next/navigation` exports in full — lesson 4 of chapter 029.
- Server Action error returns — Chapter 043.
- Custom error classes and the error-handling discipline — Chapter 080.
- Sentry and error monitoring — Chapter 092.
- Page-level metadata for error pages — lesson 9 of chapter 034.

Estimated student time: 55 to 70 minutes. Load-bearing for every route in the course and the project in chapter 035.

---

## Lesson 4 — Catching the root layout

`global-error.tsx` as the only boundary above the root layout: why `error.tsx` cannot catch its own layout, the file's `"use client"` requirement, its responsibility for `<html>` and `<body>`, its production-only behavior, and the styling and monitoring constraints of a page that must not itself fail.

Topics to cover:

- **The senior question.** The student wrote `app/error.tsx`. A throw in `app/layout.tsx` (the root layout) crashes the page anyway and shows the default Next.js error screen. Why didn't the boundary catch it, and what file fixes this? The lesson names `global-error.tsx` as the root-level Error Boundary that wraps the root layout itself — the only place a layout error can be caught.
- **Why `error.tsx` can't catch its own layout.** An Error Boundary is a React component that catches errors *in its descendants*. The boundary lives inside the layout it's siblings with — by the time the boundary mounts, the layout has already rendered. A throw in the layout's render path happens *before* the boundary exists. `global-error.tsx` solves this by living *above* the root layout in the framework-wired tree.
- **`global-error.tsx` — the file shape.** Lives at `app/global-error.tsx`. Receives `error` and `reset` like `error.tsx`. Must have `"use client"`. Must render its own `<html>` and `<body>` tags because when it fires, the root layout (which normally owns those tags) is the thing that crashed — there is no parent shell.
- **The minimum viable shape.** A Client Component that returns `<html><body><h2>Something went wrong</h2><button onClick={reset}>Try again</button></body></html>`. The senior reach: a real error page with branding, support contact, and the `error.digest` displayed for support tickets.
- **Where it sits in the hierarchy.** `global-error.tsx` is the absolute outermost Error Boundary. Errors that escape every `error.tsx` in the tree, plus errors in the root layout itself, plus errors in the framework's internal rendering, all surface here.
- **Production-only by default.** In development, the Next.js error overlay takes precedence — the student sees the framework's full-stack error screen, not `global-error.tsx`. The fallback only renders in production builds. The senior diagnostic: never test the production error UX in dev; build and run locally to verify.
- **What does and does not belong here.** Belongs: the catastrophic-failure UI, a stripped-down brand-aligned page, a "contact support" path, the error digest for log correlation. Does not belong: business logic, data fetching, anything that itself can throw. The boundary's job is to render a page that cannot fail.
- **The relationship to `app/error.tsx`.** `app/error.tsx` catches errors in `app/page.tsx` and any nested segment without its own `error.tsx`. `app/global-error.tsx` catches errors in `app/layout.tsx` plus any error that escapes `app/error.tsx`. The senior reach: both files at the app root, plus segment-level `error.tsx` files where the UX deserves a feature-specific message.
- **`global-error.tsx` styling — the constraint.** When `global-error.tsx` renders, the global CSS imported in the crashed layout may not have applied. The senior practice: keep the page simple, inline minimal styles in `<style>` tags or use Tailwind utility classes (the global Tailwind layer is still loaded by the framework). No design-system providers, no fonts, no client-only providers.
- **Internationalization caveat — named.** Locale-aware messages require the i18n setup to have loaded *before* the crash. For top-of-layout failures it usually hasn't — keep `global-error.tsx` in the default locale or with stripped strings ("Something went wrong" plus a digest). Chapter 084 owns i18n proper.
- **Monitoring integration — the senior reach.** `global-error.tsx` is the canonical place to call `captureException(error)` from the monitoring SDK (Sentry, Datadog) so the catastrophe is logged. Chapter 092 owns the full integration; named here as the location.
- **Watch-outs.** Missing `<html>` and `<body>` produces a blank page in production; missing `"use client"` fails the build; testing `global-error.tsx` in dev shows the overlay, not the file — verify with a production build; throwing inside `global-error.tsx` itself crashes the page beyond recovery — keep it minimal and never call into infrastructure that can fail; relying on global styles or providers can mean the page renders unstyled; `reset` re-renders the root, which is a heavy operation — useful, but not a silver bullet for transient errors.

What this lesson does not cover:

- Segment-level `error.tsx` (lesson 3 of chapter 031).
- `not-found.tsx` and the not-found surface (lesson 3 of chapter 031).
- Error monitoring and Sentry — Chapter 092.
- Custom error classes and discipline — Chapter 080.
- Internationalization at depth — Chapter 084.
- Server Action error handling — Chapter 043.

Estimated student time: 30 to 40 minutes. Load-bearing for production resilience in every project from chapter 035 onward and the observability work in Chapter 092.

---

## Lesson 5 — Quizz

Top 10 topics to quiz:

- Suspense as a declarative contract — when a descendant suspends, render the fallback; when every descendant resolves, render children.
- The two suspending shapes — an async Server Component awaiting in its body, and a Client Component reading a Promise with `React.use()`.
- Where to draw the Suspense boundary — around the unit of UX, not the unit of code; parallel Suspense for parallel data; one big boundary defeats streaming.
- The `key` prop on Suspense for re-suspending on input change (route param, search query) without juggling state.
- Streaming as the default transport in the App Router — chunks for the static shell, fallbacks, then resolved boundaries; no opt-in flag.
- The sequential-await anti-pattern in a Server Component versus parallel Suspense or `Promise.all`.
- `loading.tsx` as the segment-level Suspense fallback the framework wires automatically; Server Component by default.
- `error.tsx` as the segment-level Error Boundary — requires `"use client"`, receives `error` and `reset`, does not catch its own layout.
- `not-found.tsx` and the `notFound()` trigger — emits 404, used for missing-resource UX after a server-side data fetch.
- `global-error.tsx` as the root-level boundary that catches root-layout errors — requires `"use client"`, must render its own `<html>` and `<body>`, only renders in production.
