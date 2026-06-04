# Lesson 1 — Dynamic by default

- **Title:** Dynamic by default
- **Sidebar label:** Dynamic by default

---

## Lesson framing

This is the mental-model lesson that the rest of chapter 032 and every later data lesson assumes. It answers one senior question: *when a `page.tsx` reads the database and renders, does that run at build time or request time, and who decides?* The whole lesson is the shift from "the framework infers the answer from your API usage" (Next.js 13–15) to "every route is dynamic by default and you opt into caching explicitly" (Next.js 16 under `cacheComponents: true`).

Pedagogical conclusions that apply lesson-wide:

- **Lead with the decision, not the syntax.** This lesson is almost pure systems-design — there is very little code the student writes here. `'use cache'`, `cacheLife`, `cacheTag`, and the async-API specifics are all explicitly deferred to later lessons. The deliverable is a *mental picture*, not a working file. Resist showing full cached-function anatomy; show the shape and point forward.
- **The pain point is real and nameable.** The Next.js 13–15 model was a flowchart of implicit triggers — a `cookies()` call deep in a child silently flipped the whole route dynamic, an uncached `fetch` did the opposite, and a junior could not predict from reading one file what shipped where. The relief Cache Components offers is *legibility*: the dynamic/static decision is now something you read in the source (a directive you wrote, an `await` on a request API), not something you reverse-engineer. Frame the lesson around this legibility win — it is the senior "why."
- **Contrast is the teaching engine.** The single most valuable artifact is a side-by-side of the old model vs. the new model. Build it as a two-column diagram (the chapter outline's "teaching diagram") and return to it. The student should leave able to say, in one breath, what changed and why it is better.
- **Simplify then layer.** Start with the binary "build time vs. request time" framing, establish "everything is request time now," *then* add the wrinkle that you can opt pieces back into build-time rendering with a directive, *then* add that the seam between the two is a Suspense boundary they already know from chapter 031. Three layers, introduced in order, never all at once.
- **Connect to prior chapters explicitly.** The student arrives with: App Router file tree (029), Server/Client boundary and what crosses the RSC wire (030), Suspense + streaming (031). This lesson reuses *all three*. The Suspense boundary from 031 is now load-bearing as the static/dynamic seam; the Server Component from 030 is the thing that's dynamic-by-default; the route tree from 029 is the canvas the cached/uncached subtrees live on. Lean on this — it lowers cognitive load and makes the new model feel like a natural extension rather than a new system.
- **Pin the vocabulary precisely.** "Static" no longer means "a static HTML file for the whole route" — it means "this subtree was prerendered and is served from cache." "Dynamic" is the default, not a failure mode or a performance smell. A fully-dynamic authenticated route is *correct and common*. The student must not leave thinking "dynamic = slow = bad"; that's the old SSG-era reflex and it's wrong here.
- **Anchor in production SaaS stakes.** The running example is an authenticated SaaS surface (an invoices dashboard) because that's what the student will build. The senior takeaway: most authenticated product surfaces are fully dynamic and that's fine; caching is a targeted move for the app chrome and public/marketing surfaces, taught in detail later.

Tone: adult, terse, assumes competence (per pedagogical guidelines). No "what is rendering" preamble — the student rendered Server Components in chapter 030. This lesson is about *when* and *where* that render happens.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely. A Server Component `page.tsx` runs `await db.invoices.find()` and renders a table. Ask the reader: does this render at build, at request, or in between — and what in the code decides? Note that in Next.js 15 the honest answer was "it depends on a flowchart of implicit triggers you have to hold in your head," and that Next.js 16 collapses the flowchart to one rule. State the lesson's payoff: by the end, the reader can look at any route and know what renders where, and why dynamic-by-default is the more legible default. Warm, brief, ~2 short paragraphs. Do not preview syntax — preview the *mental model*.

Connect back: the reader already writes async Server Components (ch 030) and wraps slow work in `<Suspense>` (ch 031); this lesson tells them *when* that component runs and what the Suspense boundary now also does.

### The old model: rendering inferred from your code

The Next.js 13–15 model, in one tight pass, named so the student recognizes it in older codebases, blog posts, and migration guides — then dropped. Teach:

- The default was the inverse of today: routes were **statically prerendered at build (Full Route Cache)** unless something tripped them into dynamic rendering.
- The triggers were **implicit**: reading `cookies()` or `headers()`, an uncached `fetch()`, reading `searchParams`, or an `export const dynamic = 'force-dynamic'` — any one flipped the **entire route** dynamic.
- Why it hurt: the trigger could be a deep child component three levels down reaching for a dynamic API, and nothing in the `page.tsx` told you. You reverse-engineered the rendering mode by auditing the whole subtree. The decision was real but invisible.

Keep this to a few paragraphs. The goal is recognition, not mastery — the student will never write this model, only read it. End with the pivot: "Next.js 16 deletes the flowchart."

Do **not** enumerate every legacy trigger exhaustively (the route segment config deprecations are lesson 7). Name the *shape* of the problem (implicit, route-wide, invisible) over the parts list.

Tooltip candidates (`Term`): **Full Route Cache** ("Next.js 13–15 name for the build-time-rendered HTML+RSC payload of a whole route, served on every request until revalidated.").

### The Next.js 16 default: dynamic, with caching as opt-in

The new rule, stated plainly and made central. Teach:

- With **`cacheComponents: true`** in `next.config.ts`, **every route renders at request time by default.** A Server Component can read `cookies()`, await `searchParams`, or hit the database without flipping any flag — *because no flag exists.* It's already dynamic.
- The inversion in one sentence: pre-16 you avoided *tripping* dynamic; post-16 you *add* caching. Dynamic is the floor, caching is the opt-in you build up from.
- Name the directive **`'use cache'`** as the opt-in mechanism — *but only name it.* Say "you mark a piece cacheable with a directive called `'use cache'`; lesson 3 of this chapter is its full anatomy." Show at most a one-line teaser, not a working cached function. The point here is *that* caching is opt-in, not *how* to write it.
- Reframe the disposition: a route with **no caching anywhere is fully dynamic, and that is the correct, common shape** for authenticated SaaS surfaces (dashboards, settings, anything org-scoped). The student should feel zero pressure to cache by default.

This is the load-bearing section. Use an `Aside` (note) to state the headline rule in one boxed sentence the student can carry: *"Next.js 16 under Cache Components: dynamic by default, caching by opt-in."*

The config line — show it as a small `Code` block (not `AnnotatedCode`, it's three lines):

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

Note in prose that the course starter (chapter 029) ships this flag on from day one, so the student has been running under this model already without it being named — this lesson names it. Also note (one sentence, for codebase-reading) that the deprecated `experimental.dynamicIO` / `experimental.useCache` flags are gone, replaced by this top-level `cacheComponents`. Don't dwell — it's a recognition aid.

Tooltip candidates (`Term`): **`cacheComponents`** ("Next.js 16 config flag that makes routes dynamic by default and turns on the `'use cache'` opt-in caching model and Partial Prerendering.").

### The mental model: a route is a tree of dynamic and cached subtrees

The core mental picture. This is where the student's model crystallizes. Teach via a diagram (see below) plus prose:

- Draw the component tree of a route. **Every node is dynamic by default.**
- Marking a node `'use cache'` makes that node *and its children* part of one cached entry — the subtree renders once and serves from cache on later matching requests.
- **The hard rule:** dynamic content (anything awaiting request data) **cannot live inside a cached subtree.** The framework rejects it at build with a clear error. A cached subtree must be *pure of request data*.
- **The fix when you need both:** keep the cached subtree pure, and **lift the dynamic work to a sibling**, wrapped in its own boundary. Don't try to make one component half-cached — split responsibilities across siblings.
- The page mixes freely at the *sibling* level: a cached header next to a dynamic table next to a cached footer ad. Three pieces, three dispositions, one route.

**Diagram (central artifact of the lesson).** A component-tree figure showing a route's children color-coded by disposition: cached nodes (one tint), dynamic nodes (another tint), and the Suspense boundary drawn as the seam between a cached parent region and a dynamic sibling. Pedagogical goal: make "cached subtree vs. dynamic subtree, separated at a sibling boundary" a *picture* the student can recall, not a rule they memorize.
- Engine: **HTML + CSS** nested tree inside a `<Figure>` (per diagrams INDEX: nested hierarchies with color-coded segments → HTML+CSS). Color-match the two dispositions; a short legend maps tint → meaning. Keep it horizontal/compact (vertical-space constraint).
- Show the **forbidden case** too — a dynamic node *inside* a cached parent — marked with a clear "build error" indicator, so the rule lands visually. Consider a `TabbedContent` with two tabs: "Legal: dynamic lifted to a sibling" vs. "Rejected: dynamic nested under cache." This makes the constraint concrete and shows the fix side by side.

Reuse from 030: the tree is the same Server/Client component tree the student already reasons about; here we color it by render-time disposition instead of by environment.

### The Suspense boundary is the seam

Connect the new model to chapter 031's Suspense, which the student already knows — now it does double duty. Teach:

- When a route has both a cached shell and dynamic content, the **`<Suspense>` boundary around the dynamic part is what lets the cached shell ship immediately while the dynamic hole streams in.** Without the boundary, the whole route waits for the slowest dynamic read.
- The reuse insight: this is the **same Suspense primitive from chapter 031**, the same streaming transport — no new mechanism. The boundary that was "show a fallback while this loads" in 031 is now *also* "this is where the static part ends and the dynamic part begins."
- Keep it light: the full rendering shape (static shell + streamed holes) is **Partial Prerendering, which is lesson 2 of this chapter.** Name PPR in one sentence, point forward, do not teach the transport here. This section's job is only to establish that *the seam is a boundary the student already knows*, lowering the cognitive cost of lesson 2.

No new diagram needed; reference the tree diagram above (the seam is already drawn there) and forward-reference lesson 2.

Tooltip candidates (`Term`): **Partial Prerendering (PPR)** ("Next.js rendering mode: a cached static shell ships immediately and dynamic holes stream in through Suspense boundaries. The default under Cache Components.") — only if PPR isn't already glossed; keep it one line since lesson 2 owns it.

### Where dynamic comes from: the explicit signals

The catalog of what marks a code path dynamic — named here, with specifics deferred to lesson 7. Teach:

- Under Cache Components, dynamic rendering comes from **awaiting a request-time API**: `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`. These are the page props and the `next/headers` surface — **there is no hidden third channel.** The dynamic signal is always visible in the source as an `await` on one of these.
- The framework's **static analysis tracks this**: a `'use cache'` function that tries to await any of them **fails the build** (request data and cached output are incompatible — the same purity rule from the tree section, now stated at the API level).
- This is the legibility payoff made concrete: you can find every dynamic dependency of a route by searching for these awaits. No more auditing for an uncached `fetch` buried in a child.

Present the signal list compactly — a small table or a tight `Card`/list mapping each API to what it reads (e.g. `searchParams` → URL query, `cookies()` → request cookies). **Do not teach the syntax or the Promise-unwrapping** — that's lesson 7. This is a "here's the closed set; you'll learn to use each later" inventory.

A quick check-your-understanding exercise fits well here (see Exercises below).

Tooltip candidates (`Term`): **request-time API** ("A value that only exists when a real request arrives — the URL's query, the user's cookies, request headers. Reading one forces dynamic rendering.").

### The escape hatch: `connection()` for dynamic with no other signal

The explicit "everything below is dynamic" marker — named here, used in lesson 7. Teach:

- Some code must run at request time but has **no request-time API to give it away**: generating a random ID, reading `Date.now()` for a freshness stamp, calling a third-party SDK that lazily reads `process.env` at call time. The static analyzer can't infer "this must be dynamic" from such code.
- **`await connection()`** (from `next/server`) is the explicit declaration: "everything below this line is dynamic." It's the manual version of the signal the framework usually detects automatically.
- One sentence on the pairing: code after `connection()` that produces per-request values typically lives inside a `<Suspense>` boundary so it can stream as a hole. Forward-reference lesson 7 for the worked usage.

Keep this short — it's a named escape hatch, not a taught pattern. Show at most a one-line `Code` teaser (`await connection();`). The senior framing: this is the *explicit* replacement for cases the old implicit model would have caught by accident — fitting the chapter's "explicit beats implicit" thread.

Tooltip candidates (`Term`): **`connection()`** ("Next.js function from `next/server`; awaiting it marks everything below as dynamic, for request-time code the framework can't otherwise detect.").

### Reading what shipped: the build log

The senior verification habit — close the loop on "who decides and how do I confirm it." Teach:

- The build still runs a **prerender pass**: it renders every `'use cache'` boundary it can resolve without request data and stores the result; at request time the cached parts serve from cache (or CDN) and the dynamic parts run. This pass is what makes the instant shell possible (full treatment in lesson 2).
- The **build log labels each route's segments** — prerendered/static, dynamic, and streamed. The senior move is to *read the log to confirm what actually shipped where*, rather than assuming. This turns the abstract model into something the student can check on their own project.
- One consequence worth stating: because the prerender pass *runs* cached components at build, a `'use cache'` component that throws at build time **fails the whole build**, not just one request. (One sentence; deeper in lessons 2–3.)

Optionally show a short, illustrative build-output snippet as a `Code` block with a legend mapping the symbols to dispositions — but mark it clearly as illustrative (exact symbols vary by version) so it doesn't become a brittle fact to maintain. Keep it minimal.

### A quick map of the chapter ahead (no header, or short closing prose)

Half a paragraph orienting the student: this lesson set the model — dynamic floor, cached opt-in, sibling seam. The rest of the chapter fills it in: PPR as the rendering shape (lesson 2), `'use cache'` in full (lesson 3), lifetimes and tags (lesson 4), per-request `cache()` (lesson 5), invalidation (lesson 6), the async APIs and legacy config (lesson 7). Keep it to a sentence or two so the student knows the deferrals are intentional, not gaps. Pair with an `ExternalResource` LinkCard to the official Cache Components docs.

---

## Exercises

Place exercises *inside* the relevant sections, not bundled at the end (per pedagogical guidelines).

1. **After "Where dynamic comes from" — a `Buckets` classification.** Sort a set of code snippets / operations into **"forces dynamic"** vs. **"can be cached / static."** Items: `await cookies()`, `await searchParams`, `await db.invoices.find()` *(trick: a DB read alone is dynamic-by-default but is cacheable when wrapped — judge by the simplified rule taught: no request API → cacheable)*, a pure markdown render, reading `headers()`, `Date.now()` for a freshness check, rendering a static marketing header. Goal: cement the "what makes a path dynamic" inventory. Tune item wording so the bucket is unambiguous given only what this lesson taught (avoid edge cases that need lesson 3–7 nuance). Provide per-item feedback explaining the rule.

   *Alternative if `Buckets` framing gets ambiguous:* a `TrueFalse` round on the headline rules ("Under `cacheComponents`, a route with no `'use cache'` is fully dynamic — true/false", "Reading `cookies()` flips the whole route dynamic like in Next.js 15 — false, it's already dynamic", "Dynamic content can be nested inside a `'use cache'` component — false", "Dynamic routes are slower and should be avoided — false"). Pick whichever produces cleaner, unambiguous items; `TrueFalse` may be the safer choice given the conceptual nature of the lesson.

2. **After the tree / forbidden-case section — a `MultipleChoice` (single correct).** Present a small route component tree with a dynamic read nested under a `'use cache'` parent; ask "what happens?" Correct answer: "build fails — lift the dynamic read to a sibling." Distractors: "renders fine, the child is just dynamic"; "the whole route silently becomes dynamic (Next.js 15 behavior)"; "the child is cached too." Goal: lock in the nesting rule and its fix. Strong fit because the misconception (it silently works / silently flips) is exactly the old-model reflex this lesson is replacing.

No live-coding exercise — the student writes almost no code in this lesson and the directives aren't taught until lesson 3. A coding exercise here would force teaching syntax out of order. Keep exercises conceptual.

---

## Scope

**This lesson establishes the mental model only.** It names many tools and teaches none of their mechanics. Hard boundaries:

- **`'use cache'` directive** — named as *the* opt-in, with at most a one-line teaser. Its three placements (page/component/function), the compiler-generated cache key, serialization rules, and closure rules are **lesson 3**. Do not show a complete cached function with `cacheLife`/`cacheTag` inside it.
- **Partial Prerendering as a rendering shape** — named, established as "the seam is a Suspense boundary," forward-referenced. The transport (shell flushes from edge, holes stream), the worked dashboard example, pure-static/pure-dynamic degenerate cases are **lesson 2**.
- **`cacheLife` and `cacheTag`** — not mentioned beyond, at most, "lesson 4 covers freshness and naming." No three-number contract, no presets, no tag conventions here. (Note for downstream: the course uses `tags.ts` helpers, never inline tag strings — but that's a lesson-4 convention; this lesson shows no tags at all.)
- **React `cache()`** (per-request memoization) — **lesson 5.** Not the same as `'use cache'`; do not introduce the distinction here, it would muddy the dynamic/static model. One is request-scoped, the other cross-request — that contrast is lesson 5's whole job.
- **The invalidation surface** (`updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`) — **lesson 6.** Not mentioned.
- **Async request API specifics** — `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`, `connection()` are **named and inventoried** here as "the dynamic signals," but their **Promise shape, `await` syntax, `React.use()` unwrapping in Client Components, and Zod validation are lesson 7.** This lesson says *that* awaiting them is the dynamic signal; lesson 7 says *how* to read each.
- **Deprecated route segment config** (`export const dynamic` / `revalidate` / `fetchCache`) — **lesson 7.** This lesson may name `export const dynamic = 'force-dynamic'` *once*, only as an example of an old implicit trigger, without teaching the migration table.

**Prerequisites to redefine concisely (one line each, no re-teaching):**

- *Server Component* (ch 030): renders on the server, ships no client JS, can be `async` and read the DB directly. The thing that is dynamic-by-default.
- *`<Suspense>`* (ch 031): declarative loading boundary; shows a fallback while its child awaits. Here it's also the static/dynamic seam.
- *Streaming* (ch 031): the App Router flushes the shell first and resolved boundaries later over one response. The transport PPR reuses.
- *RSC wire / serializable values* (ch 030): only structured-clone-compatible values cross to the client. Touched lightly when explaining why cached values must be pure/serializable — but full serialization rules are lesson 3.

---

## Code conventions notes (for downstream agents)

- The course writes the directive **quoted: `'use cache'`** (matches `'use client'` / `'use server'`). Use single quotes.
- `next.config.ts` is **typed** with `NextConfig` and uses a **named exports everywhere except framework-dictated defaults** rule — `next.config.ts` exports the config as `default` (framework-dictated), which is correct.
- This lesson deliberately keeps code minimal and below full production shape (no `cacheLife`/`cacheTag` pairing, no `tags.ts`) because those conventions are taught in lessons 3–4. This staging is intentional — note it so a downstream agent doesn't "complete" the cached-function examples and break the teaching order.
- TS+JS as one language; show `.ts`/`.tsx`, no historical detours.
