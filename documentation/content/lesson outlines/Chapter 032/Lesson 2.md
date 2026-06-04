# Lesson 2 — Shells and holes with PPR

- **Title:** Shells and holes with PPR
- **Sidebar label:** Shells and holes (PPR)

---

## Lesson framing

This lesson owns the **rendering picture** the rest of chapter 032 refers back to. Lesson 1 gave the student the *static model*: a route is a tree colored by disposition (cached vs dynamic), the seam between them is a Suspense boundary, and a route with no caching is fully dynamic (fine). This lesson gives the *dynamic, over-the-wire view of the same tree*: Partial Prerendering (PPR) is **how that tree becomes two transport modes on one URL** — a build-time-prerendered static shell that flushes from the CDN in tens of milliseconds, and dynamic holes that stream in over the same response through the exact Suspense protocol the student already learned in chapter 031.

The senior question the lesson answers: *a SaaS dashboard has marketing-grade chrome that never changes between users and an org-specific table that changes every request — how do you wire one page so the chrome ships from the edge instantly and the table streams in after?* The answer is "you don't wire it; you compose the tree right and PPR falls out." This is the payoff of lesson 1's model.

Pedagogical conclusions that apply lesson-wide:

- **This is a transport/timeline lesson, not a syntax lesson.** Like lesson 1, the student writes very little code here. `'use cache'`'s full anatomy is lesson 3; `cacheLife`/`cacheTag` are lesson 4; the async-API syntax is lesson 7. The deliverable is a *picture of what flushes when*, plus the senior judgment of *what to cache*. Resist completing cached-function examples — show only `'use cache'` as a marker and `<Suspense>` as the hole, both already named.
- **Build on chapter 031's streaming, do not re-teach it.** The student already knows: "the shell" (immediately-rendered non-suspended outer UI), "chunk/flush", the RSC payload, that boundaries *are* the streaming config, that skeletons must mirror the resolved footprint. PPR's whole insight is **it reuses that identical protocol** — the only thing that changes is *where the shell comes from*. In chapter 031 the shell was rendered fresh on the server at request time; under PPR the shell is **prerendered at build and served from cache/CDN**. Make this one-sentence delta the spine of the lesson. Lowering it to "you already know 90% of this" is the cognitive-load win.
- **Build on lesson 1, extend it.** Lesson 1 asserted "the seam is a Suspense boundary." This lesson explains *why that specific primitive* and *what it buys you*: the boundary's fallback is prerendered into the shell at build, ships with the shell, then gets swapped for streamed content. The boundary is simultaneously the cached/dynamic seam (L1) and the streaming hole (Ch031) — same line of code, two jobs.
- **Lead with the decision: what to cache, and why the chrome is the highest-leverage target.** The senior reach is a cost ledger: a 30ms edge shell beats a 200ms dynamic render even when the dynamic render is "fast," so caching the *chrome* (header, nav, footer, marketing surfaces) is the high-leverage move, while caching deep children inside an already-dynamic page often isn't worth the freshness cost. The student must leave able to *decide* where the shell boundary should fall.
- **Teach the two degenerate cases explicitly, because they dissolve a fear.** A pure-static route (everything `'use cache'`, no dynamic work) just ships entirely from cache — PPR degenerates to "fully static." A pure-dynamic route (no `'use cache'` anywhere — the typical authenticated surface) just renders fully at request time — PPR is still on, it simply has no shell to prerender. The student should not feel that PPR is a thing they must "set up" or that every page needs a shell+holes split. PPR is the *one model* that spans static-only, dynamic-only, and the mix; the mix is just the interesting case.
- **The constraint is a build error with a real message — frame it as a guardrail, not a gotcha.** Dynamic work that is neither cached nor wrapped in `<Suspense>` fails the build: *"Uncached data was accessed outside of a `<Suspense>` boundary."* This is the framework forcing the binary choice — *cache it (it joins the shell) or wrap it (it becomes a hole)*. There is no third option, and that's the legibility win (the explicit-beats-implicit chapter thread): the old model would have silently flipped the whole route dynamic; the new model makes you say which bucket the work belongs to.
- **Anchor in production SaaS stakes.** Running example is an authenticated invoices dashboard (continues the chapter's domain): cached chrome + a streamed org-scoped table. Forward-point once to parallel routes (`@slot`, ch 029) as the shape the chapter-035 project leans on — each slot is its own subtree that can independently be shell or hole.

Tone: adult, terse, assumes competence. No "what is streaming" preamble — the student streamed a dashboard two lessons ago. This lesson is about *where the shell is born and how the holes get back into it*.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely. Describe the dashboard: a header (logo, nav) identical for every user, and an org-scoped invoices table that changes every request and takes ~400ms to query. The header could ship from a CDN in ~30ms; the table can't. Ask: how do you make *one URL* ship as two transport modes — instant chrome, streamed data — without splitting it into two pages or two requests?

Name Partial Prerendering as the answer, and connect it immediately to what the student already has: in chapter 031 they streamed a shell that was rendered on the server at request time; lesson 1 told them the seam between cached and dynamic is a Suspense boundary. This lesson joins those two — the shell is now *prerendered at build and served from the edge*, and the same Suspense boundaries are the holes the dynamic parts stream into. Payoff: by the end, the student can look at any route, predict what flushes instantly vs streams, and decide where the shell boundary should fall. ~2 short paragraphs. Warm, brief.

### What PPR is: one route, two transport modes

The core mental model, stated plainly before any diagram. Teach:

- A route under Cache Components ships as **two things over one HTTP response**: a **static shell** (everything backed by `'use cache'` — the build-time-prerendered HTML) flushed immediately, and **dynamic holes** (everything inside a `<Suspense>` that reads request data) streamed in as each resolves.
- Quote the framework's own framing (paraphrase, don't block-quote a doc): Next.js prerenders a static HTML shell served immediately while dynamic content streams in when ready, letting you mix static and dynamic content in a single route.
- The user sees the shell in tens of milliseconds; the holes arrive chunk by chunk over the *same* response — this is the chapter-031 streaming transport, unchanged.
- **The one-sentence delta from chapter 031 streaming** (make this prominent, e.g. an `Aside` note): *in plain streaming the shell was rendered on the server at request time; under PPR the shell is rendered once at build time and served from cache/CDN, so it ships before any server work runs.* Everything else about the transport is identical.

Keep this section conceptual and tight. The diagram below carries the visual; this section gives the student the words.

Tooltip candidates (`Term`): **Partial Prerendering (PPR)** ("Next.js rendering mode: a static shell is prerendered at build and served instantly from cache/CDN, while dynamic content streams into Suspense-shaped holes over the same response. The default under Cache Components." — keep to one line; lesson 1 may have glossed it, re-gloss here since this lesson owns it). **CDN** (only if not glossed earlier in the unit: "Content Delivery Network — geographically distributed cache servers that serve static content from a location near the user.").

### The two ingredients: `'use cache'` and `<Suspense>`

Establish the entire authoring surface for PPR — and it's two primitives the student already knows by name. Teach:

- **`'use cache'` puts a component into the shell.** A component marked `'use cache'` is prerendered at build and becomes part of the static shell. (Full anatomy — three placements, the cache key, serialization — is lesson 3; here it is *the marker that means "this is shell".*)
- **`<Suspense>` carves out a hole.** Any dynamic content (something that awaits request data) must live inside a `<Suspense>` boundary; that boundary is the hole PPR streams into. The fallback is the placeholder that ships in the shell.
- **The binary rule** (this is the load-bearing idea): every piece of a route is either **cached → it joins the shell**, or **wrapped in `<Suspense>` → it becomes a streamed hole**. There is no third bucket. Dynamic work that is *neither* fails the build (next section).
- The senior reach: write the page as if the shell and the holes are **two collaborating things**, not one component. Decide per piece which bucket it belongs in.

Reuse explicitly: `'use cache'` was named in lesson 1 as the opt-in; `<Suspense>` is chapter 031's loading boundary. No new primitive is introduced in this lesson — that's the point, and worth saying out loud to the student.

Code: a single small `Code` block (not `AnnotatedCode` — it's short and the student isn't learning syntax yet) showing the *shape* only — a dashboard page with a `'use cache'` header, a `<Suspense>`-wrapped table, and a cached footer. Strip imports. Mark the cached components and the boundary with brief `// ` comments pointing at their bucket (shell / hole). Keep the cached components as opaque markers — do **not** show `cacheLife`/`cacheTag` inside them (that's lessons 3–4; note this staging for downstream agents). Something close to:

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main>
      <Header />              {/* 'use cache' → static shell */}
      <Suspense fallback={<InvoicesSkeleton />}>
        <OrgInvoices />       {/* awaits request data → streamed hole */}
      </Suspense>
      <FooterAd />            {/* 'use cache' → static shell */}
    </main>
  );
}
```

### Walking one request: shell out, holes in

The central interactive of the lesson — a step-by-step trace of the dashboard request so the *timeline* becomes concrete. Use the **`RequestTrace`** component (its docs explicitly list PPR / streaming / cache as a target use case, and ship a Ch 032 example). Pedagogical goal: convert "shell then holes" from a sentence into a scrubbable timeline the student controls, anchored on the same dashboard from the code block.

- Component: `RequestTrace`. Provides its own card — **do not** wrap in `<Figure>`.
- Phases: use the cache-aware preset — **all six** (`request, server-render, wire, shell, stream, hydrate`) is appropriate here since the lesson is the full render/stream pipeline; if hydration distracts, trim to `server-render,shell,stream` (the streaming preset). Recommend **all six** but note the trim is acceptable.
- Tree (3–5 nodes, depth ≤ 2 per the component's constraints): `DashboardPage` (`kind="server"`, `cache="static"`) containing `Header` (`cache="static"`), a `Suspense` node (`kind="suspense"`, `fallback="Invoices skeleton"`) wrapping `OrgInvoices` (`kind="server"`, `await="db: invoices"`), and `FooterAd` (`cache="static"`). This mirrors the code block exactly so the student maps figure → file.
- Author `<Phase>` captions that hammer the lesson's beats: at **`shell`** — "the prerendered shell paints instantly; `OrgInvoices` shows its skeleton placeholder, no server query has run yet for it." At **`stream`** — "the invoices query resolves on the server and streams into the hole over the same response; the skeleton is swapped in place."
- Caption the figure with the one-sentence delta: the static nodes were rendered at *build*, not at request time — that's the only difference from chapter 031's streaming trace.

This replaces the need for a separate hand-drawn shell/holes diagram — `RequestTrace` *is* that diagram, animated and correct-by-construction.

### Build vs request: where each piece actually runs

Make the build-time/request-time split explicit and concrete, since "the shell is from build" is the lesson's key novelty over plain streaming. Teach:

- **At `next build`**, Next.js renders the route like a static generation pass, but **stops at every `<Suspense>` boundary** wrapping dynamic content — it does not try to resolve the dynamic child. It renders everything outside the boundaries (the `'use cache'` pieces) into static HTML, drops the Suspense `fallback` in as a placeholder, and **stores that shell on the CDN/edge**.
- **At request time**, the shell serves instantly from the edge cache; the dynamic holes run on the origin (the serverless function for that route on a platform like Vercel) and stream into the placeholders.
- The split in one line: **cached pieces are paid for once at build and served from the edge; dynamic pieces are paid for on every request and run at the origin.** That cost asymmetry is the whole reason to push chrome into the shell.
- Reuse lesson 1's verification habit: the **build log labels each route's segments** (prerendered/static, dynamic, streamed), and `next build --debug-prerender` produces a per-component report of what's in the shell vs what bailed to dynamic. Name the flag — it's the senior tool for "confirm what shipped where" and for diagnosing the build error in the next section.

Diagram option (small, optional): a **two-lane HTML+CSS strip inside a `<Figure>`** — a "build time" lane showing the shell being prerendered and stored, and a "request time" lane showing shell-from-edge + holes-from-origin. Per the diagrams INDEX, sequential phase strips with color-coded segments are an HTML+CSS job. Keep it horizontal and compact (vertical-space constraint). This is optional because `RequestTrace` already carries the timeline; add it only if the build-vs-request split needs a second, simpler visual. If included, color-match "shell/cached" and "hole/dynamic" to the same tints used elsewhere in the chapter for continuity.

### Why the seam is a Suspense boundary, specifically

Pay off lesson 1's assertion. The student was told "the seam is a Suspense boundary"; now explain *why that primitive and no other*. Teach:

- Streaming (ch 031) already sends a page as chunks: the shell is one chunk, each Suspense fallback ships in it, each boundary's resolved content streams in a later chunk. **PPR repurposes that exact protocol** — the only change is the shell is *prerendered* rather than server-rendered.
- So the Suspense boundary is doing **double duty**: it is the *cached/dynamic seam* (lesson 1) and the *streaming hole* (chapter 031) at once. One line of code, two roles. There is no separate "PPR boundary" mechanism to learn — and that's deliberate, it's why the feature was buildable on top of Suspense.
- **The fallback's role is now load-bearing for perceived performance.** The fallback is rendered at build and ships *inside* the shell, then gets swapped for the streamed content. The skeleton-matches-resolved-footprint rule from chapter 031 lesson 1 isn't new advice — but under PPR it's the difference between an invisible swap and a layout shift the user sees on a page that otherwise felt instant. Re-state the rule and raise the stakes: a perfect shell undermined by a janky fallback swap wastes the win.

No new diagram — reference the `RequestTrace` figure above (the fallback→content swap is visible in the `shell`→`stream` phases). This is a "connect the dots" prose section.

### When PPR is just static, and when it's just dynamic

Dissolve the fear that every page needs a deliberate shell/holes split. Teach the two degenerate cases as first-class, normal outcomes of the *same one model*:

- **Pure-static routes — the marketing surfaces.** A route where every component is `'use cache'` and nothing awaits request data ships *entirely* from the static cache. The `/pricing` page, `/blog/[slug]` posts, the public landing page all qualify. No `<Suspense>` needed when there's no dynamic work — PPR degenerates to "fully static." The senior pattern: marketing routes live in the same `app/` tree as the product (often in a `(marketing)` route group), and the framework decides per-route — no separate static site.
- **Pure-dynamic routes — the authenticated surfaces.** A route with no `'use cache'` anywhere renders fully at request time. The dashboard, settings, anything org-scoped. **PPR is still active** — there's simply no static shell to prerender, so the whole thing is one big hole. This is correct and common; the student should feel zero pressure to manufacture a shell for authenticated content.
- The unifying statement (the takeaway): **PPR is the single rendering model that spans static-only, dynamic-only, and the mix.** "Static site" and "dynamic app" are not two modes you choose between per project — they're two ends of a continuum the same route model covers, decided per-route by where you put `'use cache'` and `<Suspense>`.

Visual: a compact **`TabbedContent`** with three tabs — "Pure static", "Mixed (shell + holes)", "Pure dynamic" — each tab a tiny HTML+CSS sketch (or even a one-line description + a stripped code skeleton) of the route's disposition. Pedagogical goal: show that the three are points on one spectrum, not three different machines. Keep each panel minimal. (`TabbedContent` provides its own card — don't wrap in `<Figure>`.) An exercise fits well right after this section (see Exercises).

### Deciding what to cache: the cost ledger

The senior-judgment section — this is the "decisions before syntax" core of the lesson. Teach:

- The arithmetic: a static shell that ships in ~30ms from the edge beats a dynamic render that ships in ~200ms even when the dynamic render is "fast." **Caching the chrome of the app is the highest-leverage move** — it's user-agnostic, changes rarely, and sits at the top of the tree where it gates first paint.
- The counter-case: **caching a deep child inside an otherwise-dynamic page is often not worth it.** The page is already paying for a request-time render; shaving one child off that doesn't change the transport mode, and you've taken on a freshness liability (the cached child can now be stale relative to the rest of the page).
- The senior diagnostic loop: *profile the route → find the slow boundary → ask whether the data inside it would tolerate a cached lifetime → only then reach for `'use cache'`.* Caching is a targeted instrument, not a default to sprinkle. (Lifetimes — how stale is acceptable — are the explicit subject of lesson 4; name the question here, defer the mechanism.)
- Tie back to lesson 1's reframe: dynamic is not a smell. A fully-dynamic authenticated dashboard is the *correct* shape; you cache the chrome around it, not the data inside it, unless a specific slow boundary earns it.

No diagram needed; this is prose carrying judgment. Optionally a small `Aside` (tip) with the one-line heuristic: *"Cache the chrome and the public pages; leave authenticated data dynamic unless a profiled boundary earns a cached lifetime."*

### The guardrail: dynamic work must pick a bucket

Teach the build-time constraint as the framework enforcing the binary rule — framed as legibility, not a trap. Teach:

- If a component awaits request data (a DB read keyed on the user, `cookies()`, `searchParams`, …) and is **neither** marked `'use cache'` **nor** wrapped in `<Suspense>`, the **build fails** with a clear message — paraphrase the real one: *"Uncached data was accessed outside of a `<Suspense>` boundary."*
- Why this is good, not annoying: the old model (ch 032 lesson 1) would have *silently* flipped the whole route dynamic when a deep child reached for request data. The new model refuses to guess and makes you state the bucket. **The fix is always one of exactly two moves**, and naming them is the senior takeaway:
  1. The data is the same for every user → mark it `'use cache'` (it joins the shell).
  2. The data is per-request → wrap it in `<Suspense>` (it becomes a streamed hole).
- One consequence worth stating (reuse from lesson 1): because the build's prerender pass *runs* every `'use cache'` component, a cached component that throws at build **fails the whole build**, not one request — you find the bug at deploy, not in production.
- Name the diagnostic again: `next build --debug-prerender` points at the exact component that triggered the bailout.

Component for the fix: a **`CodeVariants`** with two tabs — **"Rejected"** (the dynamic `OrgInvoices` rendered bare, no cache, no boundary → the build error) and **"Fixed"** (the same component wrapped in `<Suspense>`). Per the components INDEX, `CodeVariants` is purpose-built for incorrect-vs-correct code comparisons with per-tab explanation. The "Rejected" tab's text states the error message; the "Fixed" tab's text names which bucket the work landed in and why. (Optionally a second "Fixed" variant showing the `'use cache'` route for genuinely-static data, to drive home that there are two valid fixes — but keep it to two tabs if a third muddies the contrast.)

Tooltip candidates (`Term`): **dynamic bailout** ("When the build can't prerender a component because it reads request data, it 'bails out' of the static shell — that component must instead be cached or wrapped in `<Suspense>`.").

### PPR across parallel routes

Short forward-looking section connecting PPR to a structure the student met in chapter 029 and will lean on in the chapter-035 project. Teach:

- Each `@slot` in a parallel route (ch 029 lesson 5) is **its own subtree** — so each slot independently lands somewhere on the static↔dynamic spectrum. A cached navigation slot can ship in the shell while a dynamic detail slot streams as a hole, both under the same URL, each with its own loading/streaming behavior.
- The chapter-035 project shape, named in one sentence: a cached nav slot alongside a dynamic detail slot. The point here is recognition — *PPR composes with the routing structures you already know; you don't choose per page, you choose per subtree, and slots are subtrees.*

Keep this to a short paragraph. No new diagram — optionally reference the `RequestTrace` figure as "imagine two of these side by side, one per slot." This is a "PPR is not a special case, it's the substrate" closer.

### Closing and what's next (no header, or short closing prose)

Half a paragraph: this lesson gave the rendering picture — one route, a build-time shell from the edge plus streamed dynamic holes, the seam being the Suspense boundary doing double duty, and the judgment of what to cache (the chrome, the public pages). The rest of the chapter fills in the *how*: `'use cache'` in full (lesson 3), how long cached pieces live and how they're named (lesson 4), per-request `cache()` (lesson 5), invalidation after a mutation (lesson 6), and the async-API syntax those dynamic holes use (lesson 7). One or two sentences so the deferrals read as intentional. Pair with an `ExternalResource` LinkCard to the official "How rendering works" / Cache Components docs (`nextjs.org/docs/app/getting-started/caching` and the `cacheComponents` config page).

---

## Exercises

Place exercises *inside* the relevant sections, not bundled at the end.

1. **After "When PPR is just static, and when it's just dynamic" — a `Buckets` classification.** Two buckets: **"Ships in the static shell (cache it)"** vs **"Streams as a dynamic hole (wrap in Suspense)"**. Items tuned to be unambiguous given only what L1+L2 taught: a marketing footer with legal links; an org-scoped invoices table; the public `/pricing` page content; a personalized "welcome back, {name}" greeting; a `/blog/[slug]` post body; a per-user notification count. Goal: cement the binary rule (every piece is shell-or-hole) and the judgment of which bucket each surface belongs in. Per-item feedback states the rule (user-agnostic & rarely-changing → shell; per-request → hole). Strong fit — the binary classification *is* the lesson's core skill.

2. **In/after "Walking one request" — a `Sequence` ordering drill.** Drag the steps of a PPR request into order: (1) at build, the shell is prerendered and stored on the CDN; (2) a request arrives; (3) the shell flushes from the edge instantly, with skeleton placeholders in the holes; (4) the origin runs the dynamic reads; (5) resolved content streams into each hole over the same response and replaces its skeleton. Goal: lock the *build-then-request* timeline and the order-of-events (the misconception this kills: "the shell waits for the data" — the `RequestTrace` already fights it, the drill checks retention). Good fit; `Sequence` is purpose-built for ordering a pipeline.

   *Alternative if a `Sequence` feels redundant next to `RequestTrace`:* a 4–5 statement `TrueFalse` round on the headline beats ("Under PPR the shell is rendered fresh on the server on every request — false, it's prerendered at build"; "A page with no `'use cache'` anywhere still uses PPR — true, it's just all-dynamic"; "Dynamic data with no cache and no `<Suspense>` renders fine, it's just dynamic — false, the build fails"; "The Suspense fallback ships inside the shell — true"; "Caching a deep child in an already-dynamic page always makes the page faster — false"). Pick whichever is cleaner; `TrueFalse` may better target the specific misconceptions.

No live-coding exercise. The student writes almost no code in this lesson, and `'use cache'` syntax is taught in lesson 3 — a coding exercise here would force teaching syntax out of order, and the in-browser runtime can't model build-time prerendering or edge/CDN serving anyway (same constraint chapter 031 hit for streaming). Keep exercises conceptual.

---

## Scope

**This lesson owns the PPR rendering shape and the what-to-cache judgment. It teaches no caching syntax.** Hard boundaries:

- **`'use cache'` full anatomy** — used here *only* as the marker meaning "this is shell." The three placements (page/component/function), the compiler-generated cache key, serialization rules, and closure rules are **lesson 3**. Do not show a complete cached function; the cached components in this lesson's code are opaque `'use cache'`-tagged boxes with no body shown.
- **`cacheLife` / `cacheTag`** — **lesson 4.** Name the *question* "how long should a cached piece live / how stale is acceptable" once, in the cost-ledger section, and defer the mechanism. Show **no** `cacheLife(...)` calls, **no** `cacheTag(...)`, **no** preset names, **no** `tags.ts` helpers. (Note for downstream: the framework's current preset set and the `tags.ts` convention are lesson 4's to introduce.)
- **React `cache()`** (per-request memoization) — **lesson 5.** Not mentioned; it's a different layer and would muddy the build-vs-request transport story.
- **Invalidation surface** (`updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`) — **lesson 6.** Not mentioned. This lesson is about the *first* render's transport, not what happens after a mutation.
- **Async request API syntax** — `params`, `searchParams`, `cookies()`, `headers()`, `connection()` are referenced *only* as "things that, when awaited, make a component a dynamic hole." Their Promise shape, `await` syntax, `React.use()` unwrapping, and Zod validation are **lesson 7**. This lesson does not show how to read any of them.
- **Streaming and Suspense from scratch** — **chapter 031.** Redefine concisely (one line each, below); do not re-teach the protocol, the chunk-by-chunk flush mechanics, parallel-vs-serial reads, or skeleton authoring. PPR's contribution is *the shell comes from build*; everything else about streaming is assumed known.
- **Parallel routes mechanics** — **chapter 029 lesson 5.** Named here only as "each `@slot` is its own subtree that can be shell or hole." Do not re-teach slot syntax, `default.tsx`, or the folder convention.
- **`generateStaticParams` / SSG for dynamic segments** — out of scope (lesson 8 of chapter 034). A pure-static `/blog/[slug]` is *named* as a pure-static example; how its params are seeded at build is not taught here.

**Prerequisites to redefine concisely (one line each, no re-teaching):**

- *The route as a tree colored by disposition* (ch 032 L1): every node is dynamic by default; `'use cache'` colors a subtree cached; dynamic can't nest inside cached — lift it to a sibling. This lesson adds the *transport* view of that tree.
- *`'use cache'`* (ch 032 L1): the opt-in directive that marks a piece cacheable. Here: the marker that puts a piece in the static shell. Full syntax is L3.
- *`<Suspense>` and the fallback* (ch 031 L1): declarative boundary that shows a fallback while a child awaits. Here: the hole PPR streams dynamic content into; its fallback ships in the shell.
- *Streaming / the shell / chunk-flush* (ch 031 L2): the App Router flushes the non-suspended shell first and resolved boundaries later over one response. PPR reuses this exact transport; the only delta is the shell is prerendered at build, not server-rendered at request.
- *RSC payload* (ch 030): the serialized stream the server flushes in chunks. Named in passing in the `RequestTrace` wire phase if six phases are used; not re-explained.

---

## Code conventions notes (for downstream agents)

- Directive is written **quoted and single-quoted: `'use cache'`** (matches `'use client'` / `'use server'`, per L1 and code conventions).
- This lesson deliberately keeps cached components as **opaque markers with no body** and shows **no** `cacheLife`/`cacheTag`/`tags.ts` — that staging is intentional (those are lessons 3–4). Do not "complete" the cached examples; doing so breaks the teaching order.
- The dashboard `page.tsx` uses a **default export** (framework-dictated for `page.tsx`, the sanctioned exception to named-exports) and an arrow-or-`function` component — either is fine for a stripped teaching snippet; keep it minimal. Strip imports in MDX per pedagogical §4.
- `<Suspense>` is imported from `react` in real code; in stripped teaching snippets the import may be omitted (consistent with chapter 031's stripped Suspense examples).
- Continue the chapter's **invoices/dashboard domain** for the running example (continuity with L1 and chapter 031).
- TS+JS as one language; `.tsx` for the page, no historical detours.
