# Lesson outline — Chapter 031, Lesson 3

## Lesson title

- **Title:** The three segment files
- **Sidebar label:** Segment files

---

## Lesson framing

This lesson collapses three React primitives the student already half-knows (Suspense from L1, streaming from L2, and Error Boundaries — named but never written) into the three sibling files Next.js wires for them: `loading.tsx`, `error.tsx`, `not-found.tsx`. The senior payoff is *not* "here are three more files to memorise." It's a single mental model: **drop a file next to `page.tsx`, the framework wraps your segment in a boundary, and that boundary protects this segment plus every nested segment until a child overrides it.** Every file is sugar over a primitive the student can already name — and the lesson's job is to keep that mapping load-bearing (`loading.tsx` → `<Suspense>`, `error.tsx` → Error Boundary, `not-found.tsx` → a 404 boundary tripped by `notFound()`), so the student never treats these as magic.

The four-states discipline is the spine. The Code conventions name "Loading / empty / error / populated as the four states for every list and detail surface." This lesson is where the student first ships three of those four states for a real route with three files plus the page. Frame the whole lesson around one dynamic route — `app/invoices/[id]/` — and build its full state coverage incrementally: the page that fetches, then `loading.tsx` for the pending state, then `not-found.tsx` for the missing-invoice state, then `error.tsx` for the failed-fetch state. The student should leave able to look at any route and ask "where are my four states?" and know which file ships each.

Three things demand care because they're where beginners get burned and where the chapter outline is now out of date (verified against Next.js 16.2 docs, March 2026):

1. **`error.tsx` retry changed in 16.2.** The recommended prop is now `unstable_retry()`, which internally does `router.refresh()` + `reset()` inside a transition — so it *re-fetches and re-renders*. This obsoletes the old "`reset` re-renders but doesn't refetch, so combine with `router.refresh()`" advice. Teach `unstable_retry()` as the current default, name `reset()` as the stable-but-narrower fallback (clears error state, does *not* re-fetch — useless for Server Component data errors), and flag the `unstable_` prefix honestly so the student isn't surprised when it's renamed. This is the single most important correctness update in the lesson.

2. **`not-found.tsx` status code is nuanced.** It returns **200** for a *streamed* response (with a `<meta name="robots" content="noindex">` injected so search engines don't index it) and **404** only for a *non-streamed* response. The flat "emits 404" framing is wrong once streaming is in play. Teach the SEO-correct version: the `noindex` meta is what protects SEO, not the raw status code, and if you genuinely need a 404 status (compliance/analytics) you must decide *before* the body streams.

3. **The bridge to L4 must land precisely.** `error.tsx` does **not** catch errors in the layout it sits beside — the boundary lives *inside* that layout's subtree. This is the exact cliffhanger that motivates `global-error.tsx` (L4). State it as a known limitation with the fix deferred, not as a footnote.

Cognitive-load management: introduce the files one at a time, each motivated by a missing state on the running example, never as a list of four conventions up front. The composition diagram (how all three wrap the segment) comes *last*, once each file has earned its place — it's a synthesis, not an introduction. Keep `global-error.tsx` and `global-not-found.js` named-and-deferred; this lesson owns the *segment-level* trio only.

The student writes Server Components by default (`loading.tsx`, `not-found.tsx`) and reaches for `"use client"` only where the primitive forces it (`error.tsx`). Reinforce the L030 "Server is the default, client is the opt-in with a reason" reflex: the reason here is that Error Boundaries are built on class-component state, which is client-only.

Target length 55–70 min. This is load-bearing for every route in the course and the Ch035 project.

---

## Lesson sections

### Introduction (no heading)

Open on the running route, not on a definitions list. The student finished L2 knowing how to *stream* a page; now ask the senior question implicitly: a real route has four states, not one. Use `app/invoices/[id]/page.tsx` — it fetches one invoice by ID and renders it. Walk the four things that can happen on a real request:
- the fetch is in flight (what does the user see for those 800ms?),
- the fetch succeeds (the happy path — already handled),
- the ID matches no invoice (the row is `null` — what then?),
- the fetch throws (DB down, timeout — what then?).

Land the thesis: the student *could* hand-wire `<Suspense>` and an Error Boundary at every page (they know the primitives from L1), but Next.js gives three files that do it per segment — and one extra trigger function, `notFound()`. Preview the build: by the end, `app/invoices/[id]/` ships all four states with `page.tsx` plus three sibling files. Keep it warm and short. Reference the `((tooltip))` inline syntax and `CourseProgressBar` exactly as L2 does.

Connect explicitly to prior lessons: Suspense (L1), streaming as the transport (L2), and `notFound()` named in Ch029 L4. The student is *assembling* known parts, not learning from scratch — say so, it lowers the stakes.

### The file-next-to-page model

Teach the one idea that makes all three files click before introducing any single file: **a specially-named file in a route folder becomes a boundary that wraps that segment's `page.tsx` and everything nested below it, until a deeper segment provides its own.** This is the inheritance/override model and it's identical across all three files — teach it once, here, so each file section can lean on it.

Use a `FileTree` to show the shape concretely:

```
app/
  invoices/
    loading.tsx        ← wraps everything under invoices/
    error.tsx
    [id]/
      page.tsx
      loading.tsx      ← overrides for the [id] subtree
      not-found.tsx
```

Pedagogical goal: separate the *placement-and-scope* concept (shared by all three) from the *per-file behaviour* (taught next). State the senior reach now: **one boundary file per coherent visual surface, not one per route** — many routes legitimately share the same loading shell, so don't reflexively drop a `loading.tsx` in every folder.

Terms for `Term`/`((...))`: "route segment" (one folder in `app/` = one URL segment + its UI), "inherit/override" (a child file shadows the ancestor for its subtree).

### `loading.tsx`: the segment's Suspense fallback

The first file, motivated by the in-flight state. Reveal that `loading.tsx` is nothing but the framework writing `<Suspense fallback={<Loading />}>` around the segment for you — connect directly to L1's primitive. The student writes the skeleton; the framework wires the boundary.

Use **`CodeVariants`** to make the sugar visible — this is the highest-value teaching move in the section:
- Variant "What you write": `app/invoices/[id]/loading.tsx` exporting a default `Loading` component returning an `InvoiceSkeleton`.
- Variant "What Next.js wires": the equivalent `<Suspense fallback={<Loading />}><Page /></Suspense>` shape, conceptually, so the student sees the file *is* the L1 pattern.

First sentence of each variant carries the framing ("you write a skeleton" / "the framework wraps the segment"), per `CodeVariants` conventions.

Cover, in prose tied to the running example:
- **Default export, no props.** `loading.tsx` is default-exported (framework convention — note this is one of the sanctioned default-export exceptions from Code conventions §Function form) and receives **no props** (verified: "Loading UI components do not accept any parameters").
- **Server Component by default.** No `"use client"`. Reinforce the L030 default. If the skeleton needs animation, the animated piece is a Client Component the loading file *renders* — the file itself stays a Server Component. (Docs note it *can* be a Client Component via the directive, but the senior default is to keep it server and push animation to a leaf — say this.)
- **Skeleton over spinner**, callback to L1: mirror the resolved layout's footprint (same heights, same item count) so no layout shift when content swaps in. Tie to Code conventions: "`<Skeleton>` over spinners."
- **Scope and inheritance**, applying the model from the previous section to this file specifically: `app/invoices/loading.tsx` covers `invoices/` and all nested routes without their own; a nested `[id]/loading.tsx` overrides for that subtree.

**The Cache Components caveat (brief, important).** The course runs `cacheComponents: true` (Code conventions §Caching). Verified 16.2 behaviour: if a *layout* reads uncached/runtime data (`cookies()`, `headers()`, uncached fetch), `loading.tsx` will **not** cover it — that data access must be wrapped in its own `<Suspense>` or Next.js errors at build time, and the static shell streams first. Frame as the senior fix: push slow reads out of the layout into `page.tsx`, or wrap them in their own boundary. This is the same "keep above-boundary work cheap" lesson from L2, now enforced by the compiler — a one-paragraph callback, not a new topic.

Use an `Aside` (tip) for the skeleton-footprint rule and an `Aside` (caution) for the layout-data caveat.

### `not-found.tsx` and the `notFound()` trigger

The second file, motivated by the missing-invoice state (`getInvoice(id)` returns `null`). This is the pairing students most often get wrong, so teach the *trigger* and the *file* as two halves of one mechanism.

Lead with the senior pattern as the anchor code — use **`AnnotatedCode`** on `app/invoices/[id]/page.tsx`:
```tsx
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  return <InvoiceDetail invoice={invoice} />;
}
```
Steps: (1) await `params` — callback to Ch030's async request APIs; (2) fetch the row, may be `null` (the `getInvoice` shape returns the row or `null`, per Code conventions §Functions by intent); (3) `notFound()` short-circuits rendering — it *throws* a special signal, execution stops here, nothing below runs; (4) TypeScript narrows: after the `notFound()` guard, `invoice` is non-null in the return (worth a `CodeTooltips` note on `notFound()` having a `never` return so the narrowing is real, not hand-waved).

Then teach the file: `app/invoices/[id]/not-found.tsx` renders when `notFound()` fires in that segment. The senior reach is **co-location** — resource-specific not-found UI lives next to the dynamic segment ("This invoice doesn't exist" with a link back to the list), not a generic site-wide 404.

Cover:
- **The two ways it fires.** (a) `notFound()` called explicitly after a data lookup → renders the nearest `not-found.tsx` ancestor; (b) the framework's automatic unmatched-URL 404 → renders the **root** `app/not-found.tsx`. Verified: root `app/not-found.tsx` handles *all* unmatched URLs app-wide, not just explicit `notFound()` calls.
- **No props, Server Component by default.** Verified: accepts no props; is a Server Component (can be `async` to fetch data for the 404 UI, e.g. read `headers()`). Cannot read `params`/`searchParams` directly — if the UI needs that context, fetch it in `page.tsx` before calling `notFound()`. If it needs client hooks like `usePathname`, fetch on the client instead.
- **Status code — the SEO-correct version (verified, corrects the chapter outline).** Returns **200 for a streamed response** with `<meta name="robots" content="noindex">` injected, and **404 for a non-streamed response**. Teach: the `noindex` meta is what keeps the page out of search results regardless of status; if you specifically need a 404 *status* (compliance, analytics, some crawlers), the existence check must complete *before* the body streams (i.e. `notFound()` before any suspending `await`/boundary). This directly callbacks L2's streaming mechanics — the status header is locked the moment the first byte flushes.
- **Not the same as a `fetch` 404.** `not-found.tsx` is tripped by the `notFound()` function, *not* by a 404 HTTP status from a `fetch` call to some API. The student converts the API result to `null`/throw and calls `notFound()` themselves.

Use an `Aside` (note) for the 200-vs-404 status nuance — it's surprising and worth visually setting apart.

Terms: "short-circuit" (stops rendering at the call, like an early `return`/`throw`), `notFound()` returns `never` (TS narrowing).

Name once and defer: `global-not-found.js` exists (experimental, behind a `globalNotFound` config flag) for apps with multiple root layouts or dynamic root segments — out of scope here, one sentence.

### `error.tsx`: the segment's Error Boundary

The third file, motivated by the failed-fetch state. This is the longest and most consequential section — it's where the `"use client"` requirement, the props contract, the retry semantics, and the layout-can't-catch-itself cliffhanger all live.

Open with the primitive: `error.tsx` is the framework writing a React Error Boundary around the segment. Any uncaught throw in the segment, its nested layouts, or its children renders the error UI instead of crashing the tree. Connect to L1's "Suspense does *not* catch errors — that's the Error Boundary's job" — this is the file that fills that gap.

Anchor code — **`AnnotatedCode`** on the canonical `app/invoices/[id]/error.tsx` (use the verified 16.2 shape):
```tsx
'use client';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div>
      <h2>Couldn't load this invoice</h2>
      {error.digest && <p>Reference: {error.digest}</p>}
      <button onClick={() => unstable_retry()}>Try again</button>
    </div>
  );
}
```
Steps:
1. **`'use client'` is mandatory** — Error Boundaries are built on class-component machinery (`getDerivedStateFromError`/`componentDidCatch`) and state, both client-only. Missing the directive fails the build with a clear error. This is the *reason* the file is the exception, not just a rule to memorise. (Note for the writer: also one of the sanctioned default-export files.)
2. **`error` prop.** `Error & { digest?: string }`. Critical security point, callback to Ch030's "the full Error never crosses the wire": errors thrown in **Server Components** arrive as a *generic* message + a `digest` (a hash) — the real message and stack stay server-side so secrets don't leak. Errors from **Client Components** keep their original message. Show `digest` in the UI for support tickets — it's the key to correlate with server logs.
3. **`unstable_retry()` — the recommended retry (verified 16.2, corrects the outline).** Re-fetches *and* re-renders the segment (internally `router.refresh()` + `reset()` in a transition). This is what you wire to "Try again", because most segment errors are data-fetch failures and you want a real re-fetch. Flag the `unstable_` prefix: the API is settling, the name may change — but it's the current documented default in 16.2.
4. **`reset()` — the stable, narrower fallback.** Still available; clears error state and re-renders **without** re-fetching. Useless when the cause is Server Component data (the re-render reproduces the same error). Teach the distinction crisply: `reset` = "try rendering again with the same data"; `unstable_retry` = "go get fresh data and try again." Default to `unstable_retry`.

**The hierarchy — what `error.tsx` does and doesn't catch.** Use a small **`ArrowDiagram`** or annotated HTML diagram (see Diagrams section) to show bubbling: a throw in a child bubbles up to the nearest `error.tsx`. Two precise rules:
- It **catches**: throws in `page.tsx`, nested layouts *below* it, and children.
- It **does not catch**: throws in the layout (or `template.tsx`) it sits *beside* — that layout is the boundary's *parent*, the boundary lives inside the layout's subtree, so a render error in the layout happens before the boundary exists. (Verified against 16.2 component-hierarchy docs: `error.js` wraps `loading.js`, `not-found.js`, `page.js`, and nested `layout.js`, but **not** the `layout.js`/`template.js` above it in the same segment.)

Land the cliffhanger: this is exactly why a throw in the *root* layout escapes `app/error.tsx` and crashes to the default error screen. The fix is `global-error.tsx` — **next lesson.** State it as a deliberate handoff, not a gap.

**Dev vs production divergence (verified, senior diagnostic).** In development, the Next.js error overlay shows first with the full stack — `error.tsx` renders *behind* it. In production, only `error.tsx` renders, with `digest` for the logged error and a generic message for Server Component throws. The senior rule: **never sign off on `error.tsx` UX from dev mode alone** — build and run locally to see what the user actually gets. (Note: `global-error` also shows in dev since 15.2, but the overlay still takes visual precedence — keep the "verify in prod build" rule.)

**What does and doesn't belong in `error.tsx`.** Belongs: the failure UI, the digest, a "Try again" button, a `useEffect` to log to monitoring (named — full Sentry integration is Ch092). Doesn't belong: business logic, data fetching that can itself throw.

Asides: `Aside` (danger/caution) for "`'use client'` or the build fails"; `Aside` (caution) for "never test error UX in dev only."

Terms / `CodeTooltips`: `digest` (server-side error ID/hash for log correlation), "bubble" (errors propagate up to the nearest boundary), `unstable_retry` tooltip explaining it's `router.refresh()` + `reset()`.

### How the three files wrap one segment

The synthesis section — only now, after each file has earned its place, show how they compose. Pedagogical goal: cement that these aren't three independent gadgets but three nested boundaries the framework assembles in a fixed order around `page.tsx`.

Use a **`DiagramSequence`** (preferred) or a single annotated nested-box HTML diagram showing the wrap order, verified against the 16.2 component hierarchy:

```
<ErrorBoundary fallback={error.tsx}>      ← outermost: catches throws
  <Suspense fallback={loading.tsx}>        ← shows skeleton while suspended
    <NotFoundBoundary fallback={not-found.tsx}>  ← catches notFound()
      {layout → page.tsx}
    </NotFoundBoundary>
  </Suspense>
</ErrorBoundary>
```

If `DiagramSequence`: step through the order — (1) the bare segment; (2) wrap in the not-found boundary; (3) wrap in Suspense; (4) wrap in the error boundary — each step adds one layer and one state, mirroring the order the lesson taught them. Caption each with which state it ships. This reinforces nesting (`error.tsx` is *outside* `loading.tsx`, so an error during loading skips the skeleton and trips the error UI — verified: `error.js` wraps `loading.js`; `not-found.js` renders *between* `loading.js` and `page.js`).

Key takeaways to state explicitly:
- The student writes **none** of this wrapper — three files plus the page produce it.
- Order matters: an error while the skeleton is showing replaces the skeleton with the error UI (error boundary is outermost); a `notFound()` is caught inside Suspense.

Then close the loop on the running example with a **`FileTree`** showing the finished `app/invoices/[id]/` — `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` — captioned "the four states of a route, four files." This is the image the student should carry out.

### Check your understanding

End-of-lesson assessment. Two exercises, targeting the two highest-error-rate concepts:

1. **`Buckets` — "which file ships this state?"** Items are scenarios ("a DB query times out", "the user opens an invoice that was deleted", "an 800ms query is still resolving", "`getInvoice` returns null", "a syntax error throws while rendering the detail"); buckets are `loading.tsx` / `error.tsx` / `not-found.tsx`. Tests the four-states mapping directly. (Note: "missing route entirely" → root `not-found.tsx` is a good decoy/edge item.)

2. **`MultipleChoice` (multi-select acceptable) or `TrueFalse` round** on the precise gotchas the lesson most wants to stick:
   - `error.tsx` requires `'use client'` (T).
   - `error.tsx` catches an error thrown in the layout file beside it (F — the cliffhanger).
   - `loading.tsx` needs `'use client'` (F).
   - `reset()` re-fetches data on retry (F — `unstable_retry()` does; `reset` doesn't).
   - `notFound()` is triggered by a 404 status from `fetch` (F).
   - A streamed `not-found.tsx` returns HTTP 404 (F — 200 + `noindex` meta).

Prefer `TrueFalse` for the gotcha round (fast, scannable, end-of-round review surfaces the corrections). Keep `Buckets` for the state-mapping because the drag-to-classify action *is* the four-states mental model.

Skip a live-coding (`ReactCoding`) exercise: the meaningful behaviour here is framework file-convention wiring (no real server/DB/route segments in the in-browser runtime), so a coding sandbox would teach a stand-in, not the thing. The L1 continuity notes already flag that `ReactCoding` can't model the server — same constraint applies harder here. Classification + recall exercises are the right fit.

### External resources (optional)

One or two `ExternalResource` cards to the official file-convention docs (`error.js`, `not-found.js`, `loading.js`) for the student who wants the full prop tables. Optional — don't pad.

---

## Scope

**Prerequisites to redefine briefly (one line each, don't re-teach):**
- Suspense as the loading contract and the unit-of-UX placement rule (L1) — restate only as "the primitive `loading.tsx` wraps you in."
- Streaming as the chunked transport, status header locked at first byte (L2) — needed to explain the `not-found.tsx` 200-vs-404 nuance.
- `notFound()` exists in `next/navigation` (Ch029 L4) — this lesson is where it gets *used*, so a fuller treatment is fair, but don't re-explain the rest of `next/navigation`.
- Async request APIs are Promises: `await params` (Ch030) — used in the page example, named not taught.
- "The full Error never crosses the wire"; secrets stay server-side (Ch030) — the basis for the `digest` discussion.
- Server Components are the default, `"use client"` is the reasoned opt-in (Ch030) — the frame for why only `error.tsx` needs the directive.

**Explicitly out of scope (defer, name at most once):**
- `global-error.tsx` and *why* `error.tsx` can't catch its own layout's *fix* → **L4** (this lesson states the limitation and hands off; it does not teach the solution).
- `global-not-found.js` → named once as experimental/niche, deferred.
- Full `next/navigation` API surface → Ch029 L4.
- Server Action error returns / the `Result<T>` channel for *expected* errors → Ch043. (Worth one sentence: `error.tsx` is for *unexpected* throws; expected failures like validation return a `Result` from an action — different channel. Don't teach the Result shape.)
- Custom error classes, `ensureError`, the throw-vs-return discipline → Ch080 (Code conventions §Error handling names it; don't pull it forward).
- Sentry / `captureException` / monitoring integration → Ch092 (name the *location* in `error.tsx` only).
- Page metadata for error/404 pages (`<title>`, `generateMetadata`) → Ch034 L9 (note only that `error.tsx`/`global-error.tsx` can't export `metadata` because they're Client Components; defer the rest).
- `unstable_catchError` (component-level error recovery not tied to a segment) → out of scope, do not introduce.
- PPR / caching / `cacheLife` / `cacheTag` → Ch032 (the Cache Components caveat in `loading.tsx` references the *flag*, not the caching model — keep it to the one build-error behaviour).
- i18n of error pages → Ch084.

---

## Code conventions notes (for downstream agents)

- **Default exports are correct here.** `loading.tsx`, `error.tsx`, `not-found.tsx` are on the sanctioned default-export list (Code conventions §Function form). This is the one place the course's "named exports everywhere" rule is overridden — say nothing about it in prose unless it confuses, but do *not* "fix" it to a named export.
- **`function` declaration vs arrow.** Framework file-convention components are conventionally written as `export default function Error(...)` — match the Next.js docs shape (the docs use `function`). This is consistent with Code conventions §Function form allowing `function` where the framework dictates default exports.
- **Quotes:** single quotes for `'use client'` per §Formatting (the docs show single quotes too — good).
- **`getInvoice(id)` returns the row or `null`** per §Functions by intent — use that exact shape so the `if (!invoice) notFound()` pattern reads true. Do *not* use `requireInvoice` here even though it exists (it would hide the `notFound()` call the lesson is teaching) — note this is a deliberate pedagogical un-abstraction; mention `requireInvoice` once as the production wrapper that bundles this pattern.
- **Props typing:** type `params` as a Promise (`{ params: Promise<{ id: string }> }`) per Ch030 / Next.js 16. Type the `error.tsx` props inline as shown.
- **No `any`.** The `error` prop is `Error & { digest?: string }` — verbatim from the docs.
- Keep example code minimal and staged (skeleton bodies can be `<InvoiceSkeleton />` referenced, not fully implemented) — pedagogy over completeness; downstream agents may stub `InvoiceSkeleton`/`InvoiceDetail`/`getInvoice` as named imports with a `// data layer` comment, matching the L1 convention.

---

## Fact-check log (verified against Next.js 16.2 docs, March 2026)

- `error.tsx` recommended prop is `unstable_retry()` (added v16.2.0); `reset()` retained as narrower fallback. **Chapter outline is out of date — updated in this outline.**
- `unstable_retry()` = `router.refresh()` + `reset()` in a `startTransition` → re-fetches and re-renders. Obsoletes the outline's "`reset` doesn't refetch, combine with `router.refresh()`" watch-out.
- `error.tsx` does NOT wrap its own segment's `layout.tsx`/`template.tsx` — confirmed in the component-hierarchy docs.
- `not-found.tsx` returns 200 for streamed responses (+ `noindex` meta), 404 for non-streamed. **Chapter outline's flat "emits 404" corrected.**
- `loading.tsx` and `not-found.tsx`: no props; Server Component by default (each can be a Client Component / `async` respectively).
- `loading.tsx` + Cache Components: uncached layout data isn't covered by `loading.tsx` and must be wrapped in its own `<Suspense>` or it's a build error — confirmed.
- `global-not-found.js` is experimental (introduced v15.4.0, behind `globalNotFound` flag) — kept out of scope, named once.
- `error.tsx`/`global-error.tsx` can't export `metadata` (Client Components) — use React `<title>` instead. Noted, deferred to Ch034.
