# Async request APIs and legacy segment config

- **Title (h1):** How a route declares itself dynamic
- **Sidebar label:** Request APIs and segment config

---

## Lesson framing

This is the **chapter capstone** (Lesson 7 of 7; the chapter ships 7 teaching lessons + a quiz — ignore the outline's stale "lesson 8" numbering).
The whole chapter has been building one model: under `cacheComponents: true` a route is dynamic by default, cached subtrees are carved out with `'use cache'`, and the seam is a `<Suspense>` boundary.
This lesson closes the loop by answering the one question the model left implicit: **how does a route declare itself dynamic at all?**

The answer has two halves, and the senior insight is that they are the same question seen from two eras:

1. **The old way is gone.** Next.js 13–15 declared a route's render disposition with *config exports* — `export const dynamic`, `export const revalidate`, `export const fetchCache`, `export const runtime`. Under Cache Components these are deprecated/rejected, and the student will meet them constantly in older codebases, blog posts, and AI-generated code. They need to read each one and know its replacement.
2. **The new way is the `await`.** Dynamic rendering now flows from a closed set of **async request APIs** — `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` — that all return Promises. Awaiting one *is* the dynamic signal. `connection()` is the explicit escape hatch for dynamic work the framework can't see.

Teaching both together is deliberate: the migration table (old config → new directive/API) is the spine that makes the chapter's "explicit beats implicit" thread land. The student leaves able to (a) read and migrate any legacy segment-config'd route, (b) write the async-API read shape correctly on both sides of the server/client boundary, and (c) reach for `connection()` precisely.

**Pedagogical stance.** This is a *reference-surface* lesson — the student will recognize far more than they memorize. Optimize for a clean mental model plus a lookup table they'll return to, not deep drills. Two pillars carry the weight: the **migration table** (a `Figure`) and the **async-read contract** (one shape, five APIs). Keep code samples at production shape but small — the student writes one `await` line, not whole features. The depth of *what each API returns and is used for* is owned by Chapter 033 and later units; this lesson owns the **Promise shape, the unwrap mechanics, and the dynamic-signal semantics**. Repeatedly tie back to the L1 model ("dynamic is the default, so awaiting a request API no longer *flips* anything — it just confirms the route is doing request-time work") to prevent the most common misconception carried from the old model.

**Cognitive-load plan.** Open with the concrete migration shock (real legacy code on screen) because it's the most visceral hook and grounds the abstract "render disposition" talk in a task the student will actually do. Then teach the async-read contract once on `params`/`searchParams` (props the student already met in Chapter 029), generalize to the `next/headers` trio by analogy, and only then introduce `connection()` as the "what about work with no visible signal?" capstone. Close with the typed-props tooling (`PageProps` / `next typegen`) as the senior ergonomic reach. No new diagram engine learning — one decision-flow widget and one comparison table.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely: the student inherits a Next.js codebase and opens a `page.tsx` that starts with four lines —

```ts
export const dynamic = 'force-dynamic';
export const revalidate = 60;
export const fetchCache = 'force-cache';
export const runtime = 'edge';
```

— and separately must write a new page that reads the URL's `?status=` filter, the user's session cookie, and a freshly generated request ID. Two tasks, one underlying question: **what makes this route render at request time, and how is that declared?** State that the chapter's model (dynamic by default, cache by opt-in) left this implicit, and this lesson makes it explicit by covering both the legacy config surface that's going away and the async request APIs that replace it as the primary signal. Keep it to ~4 sentences. Connect back to L1 (`cacheComponents`, the dynamic-by-default model) explicitly since this lesson pays off L1's deferred async-API syntax.

Reasoning: per the pedagogical guidelines the intro carries the senior question implicitly via a concrete problem; the inherited-codebase frame is the most authentic motivation for a migration-heavy reference lesson and signals "you will read code like this in the real world."

---

### The config exports that used to color a route

**Goal:** name the legacy route segment config once, accurately, so the student recognizes it in the wild and understands *why* it's being retired — then drop it.

Content:
- One tight paragraph on the **old model**: 13–15 inferred a route's render disposition from a mix of implicit triggers (an uncached `fetch`, a `cookies()` read) *and* explicit config exports the developer wrote at module scope. The config exports were the manual override. Frame them as "a per-route flag panel."
- Enumerate the four the student will actually encounter, one line each, as recognition targets (not usage instruction): `dynamic` (`'auto' | 'force-dynamic' | 'force-static' | 'error'`), `revalidate` (seconds, ISR window), `fetchCache` (cache policy for `fetch` in the segment), `runtime` (`'nodejs' | 'edge'`).
- The senior reframe that motivates the whole lesson: this panel was **implicit and route-global** — one export changed the disposition of the entire subtree, and a deep child reaching for a dynamic API could silently contradict it. Cache Components replaces the panel with per-component directives the developer reads and writes (`'use cache'`) and per-read signals (the `await`). Explicit beats implicit.
- State the hard rule plainly: **under `cacheComponents: true`, `dynamic`, `revalidate`, and `fetchCache` are rejected** — Next.js raises an error directing you to migrate. This is not a soft deprecation you can ignore.

Component: a short `Code` block (ts) showing the four-export header from the intro, so the student has the concrete artifact in view while reading what each does. Do **not** annotate heavily — these are being retired; the annotation budget belongs to the migration table next.

`Term` candidates: **route segment config** (the family name for these `export const` module-scope exports), **ISR** (incremental static regeneration — the 13–15 name for the time-windowed revalidation `revalidate` controlled; gloss it so the student recognizes the term in old docs without a detour).

Reasoning: the guidelines say name the old model in one paragraph then drop it; the student must recognize legacy code but not learn to write it. Leading with *why it's retired* (implicit + route-global) reinforces the chapter's central thread before the mechanical migration table.

---

### Reading legacy routes: the migration table

**Goal:** give the student a durable lookup they can apply to any inherited route. This is one of the two load-bearing sections.

Content — walk each legacy export to its Cache Components replacement, using the **official migration mapping** (verified against the Next.js 16 "Migrating to Cache Components" guide):

| Legacy export | Replacement under Cache Components |
| --- | --- |
| `dynamic = 'force-dynamic'` | **Remove it.** Dynamic is already the default. |
| `dynamic = 'force-static'` | Remove it; add `'use cache'` + `cacheLife('max')` at the data read (or page top), and remove any runtime-data reads (they now need `<Suspense>`, which contradicts "fully static"). |
| `revalidate = 3600` | `'use cache'` + `cacheLife('hours')` — pick the **preset closest to the interval**, not a raw second count. |
| `fetchCache = 'force-cache'` | **Remove it.** Inside a `'use cache'` scope all fetches are cached; outside one, nothing is. The directive subsumes it. |
| `runtime = 'edge'` | **Not supported under Cache Components.** Remove it (Node is the default and the 2026 SaaS reach). For genuine edge behavior, use `proxy.ts` (Chapter 033). |

- Pair this with the `fetch` default flip, since it's the same explicit-by-default story and the student will see the old pattern: pre-16 `fetch()` cached by default and you opted out with `{ cache: 'no-store' }`; in 16 `fetch()` is no-store by default and you opt *in* by wrapping the call in a `'use cache'` function. One sentence + a tiny before/after.
- One sentence on tooling: the `npx @next/codemod@canary upgrade latest` codemod performs most of this migration mechanically (and renames `middleware.ts` → `proxy.ts`, strips `experimental_ppr`), but the student should be able to read the result, which is why the table matters.

Components:
- **`Figure`** wrapping the migration table as the keystone reference. A clean HTML table (left: legacy, right: replacement) is the right vehicle — this is a lookup, not a sequence or a graph. Keep raw second-counts *out* of the preset guidance (consistent with the chapter's L4 convention — presets are matched by data shape, not seconds).
- **`CodeVariants`** for the `revalidate` → `cacheLife` case specifically (the only non-trivial transform), two tabs labeled "Legacy (15)" and "Cache Components (16)", using `del=`/`ins=` markers: tab 1 shows `export const revalidate = 3600`, tab 2 shows the `'use cache'` + `cacheLife('hours')` body. One-paragraph prose each. This is the migration the student is most likely to get wrong (reaching for a custom `{ revalidate: 3600 }` profile instead of the `'hours'` preset).
- A small `Code` before/after for the `fetch` opt-out → opt-in flip.

Exercise: **`Matching`** — left column = legacy exports (`dynamic = 'force-dynamic'`, `revalidate = 60`, `fetchCache = 'force-cache'`, `runtime = 'edge'`), right column = the correct migration action ("remove it", "`cacheLife('minutes')`", "remove — wrap fetches in `'use cache'`", "remove — Node is default / use `proxy.ts`"). Matching is ideal here: the lesson's value *is* the legacy→new pairing, and a two-column link drill rehearses exactly that. Place it directly under the table.

Reasoning: a migration table is the highest-leverage artifact a junior dev inheriting 2026 code can carry. `cacheLife` and `'use cache'` were taught in L3/L4, so this section *applies* them to migration rather than re-teaching — keep the explanations thin and link the concepts to their owning lessons. The `Matching` drill checks recognition without demanding the student write anything, matching the reference nature of the half.

---

### Request data arrives as a Promise

**Goal:** establish the single unifying contract — every async request API returns a Promise, you `await` it in a Server Component — using `params` and `searchParams` (props the student already met in Chapter 029 routing) as the worked example. Second load-bearing section.

Content:
- State the contract up front as the one sentence to carry forward: **`params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` all return Promises in Next.js 16; you `await` them in Server Components and unwrap them with `React.use()` in Client Components. Synchronous access is removed — a sync read is a build error.**
- The *why*, tied to L1: in 15, reading `cookies()` synchronously silently flipped the route dynamic — implicit magic. Making these async makes the dynamic moment **visible in the source**: the `await` is the signal. Under Cache Components dynamic is already the default, so the `await` doesn't *flip* anything — it confirms the route is doing request-time work and (crucially) it is what a `'use cache'` scope is forbidden from containing. This reframes "async is annoying" into "async is the explicit signal the whole chapter is built on."
- **`params`** — the route's dynamic segments, arriving via `props.params` on a page/layout. Show `const { id } = await props.params;` inside an `async` page. One line on validating constrained params with Zod (`z.coerce.number()`, `z.uuid()`) at the read site, pointing forward to Chapter 042 for the full pattern — do not teach Zod here.
- **`searchParams`** — the URL query, via `props.searchParams`, typed `Promise<Record<string, string | string[] | undefined>>`. Explain the shape honestly: `string[]` for repeated keys (`?tag=a&tag=b`), `undefined` for absent keys — this is where beginners get caught. Name that this is the canonical URL-state read but defer the *patterns* (filters, sort, pagination) to Chapter 033 L4.
- **`cookies()` and `headers()`** — same shape, imported from `next/headers`: `const c = await cookies(); c.get('session')?.value`. Teach only the await+access shape; explicitly hand the SaaS usage (session reads, trust boundaries, the read-once-at-top pattern) to Chapter 033 L1 with a one-line forward pointer. This keeps the lesson from bloating into a `cookies()` tutorial.
- **`draftMode()`** — name once: returns a Promise resolving to `{ isEnabled, enable, disable }`, the CMS preview toggle. One sentence, forward-pointer to when the student builds a CMS integration. It rounds out the closed set so the student knows the list is complete; it does not earn a worked example in a SaaS course.

Components:
- **`AnnotatedCode`** (tsx, `color="orange"` for the dynamic/await marks — orange is the chapter's reserved "dynamic" color per L2/L5 conventions) on a single small `async` page component that reads both `params` and `searchParams`. Steps: (1) the `async` page signature with typed props; (2) `await props.params` destructure, orange highlight on `await`; (3) `await props.searchParams` and the `string | string[] | undefined` reality; (4) using the resolved values in the returned JSX. This focuses attention on the *await is the signal* idea one part at a time — exactly what `AnnotatedCode` is for.
- **`CodeTooltips`** on the same or a sibling block to gloss the shape inline without prose detours: tooltip on `await` ("In 16 these props are Promises — the await is the dynamic signal"), on `searchParams` ("`string[]` for repeated query keys, `undefined` when absent"), on `cookies` ("from `next/headers`, async, read-only in a Server Component").

`Term` candidates: **dynamic segment** (the `[id]` route folder whose value lands in `params` — recap from Chapter 029, gloss don't re-teach), **request-time** (one-line recap: resolved per request, not at build).

Reasoning: teaching five APIs as five features would blow cognitive load and overlap Chapter 033. Teaching them as *one shape* with `params`/`searchParams` as the concrete instance (already-familiar props) and the trio/`draftMode` by analogy is the minimum-viable framing. The orange-await highlight makes the abstract "dynamic signal" idea literally visible, reinforcing the chapter's central seam concept.

---

### Reading request data in a Client Component with `React.use()`

**Goal:** the boundary half of the contract — how a Client Component consumes a request Promise it can't `await`.

Content:
- The constraint: Client Components can't be `async`, so they can't `await`. When a Client Component needs `params` or `searchParams`, the parent Server Component passes the **unresolved Promise** down as a prop, and the Client Component unwraps it with `React.use(promise)`.
- Tie explicitly to the shape the student already saw in Chapter 030 L4 (passing a Promise across the boundary and unwrapping with `use`) — this is the *same* primitive, not a new one. "You've done this; it's the same `use`."
- The Suspense pairing: `use()` suspends the component until the Promise resolves, so the consumer (or an ancestor) must sit inside a `<Suspense>` boundary — the same seam the whole chapter leans on. One sentence connects this to the streaming model (Chapter 031).
- Keep the example minimal: a Server page passes `searchParams` (the Promise, not awaited) to a `<Client />`; the client does `const { status } = use(searchParams)`. Note the senior default in one line: prefer to `await` on the server and pass the **resolved** value down as a plain prop; reach for passing the Promise + `use()` only when a Client Component genuinely owns that read (e.g., it needs to re-read on client interaction). This pre-empts the over-use of `use()` that beginners fall into.

Component: **`CodeVariants`** with two tabs — "Server reads, passes resolved value" (the default reach: `await` on server, child gets a plain `string`) vs "Client unwraps the Promise" (`use(searchParams)` in a `'use client'` component, wrapped in `<Suspense>`). This frames `use()` as the *conditional* tool against the *default* server-read, which is the senior judgment call. `del`/`ins` not needed; just two labeled approaches with one-paragraph prose each, the first marked as the default.

`Term` candidate: **`React.use()`** (gloss: "reads a Promise (or context) during render and suspends until it resolves — the client-side counterpart to `await`").

Reasoning: the server/client unwrap split is the one genuinely new mechanic for most students here, and it's a frequent confusion point ("why can't I just await in my component?"). Framing it against the server-read default (trigger before tool) keeps it from becoming a reflex. Leaning on the Chapter 030 `use` precedent minimizes new load.

---

### `connection()`: declaring dynamic when the framework can't see it

**Goal:** pay off the L1 teaser — the explicit escape hatch for request-time work that emits no other dynamic signal.

Content:
- The gap: the framework infers dynamic from the closed set of awaited request APIs. But some work *must* run per request yet touches none of them — so static analysis would happily try to prerender it at build, baking in a stale value. The student needs a way to say "stop: everything below here is dynamic."
- The tool: **`await connection()`**, imported from **`next/server`**. It marks the current render dynamic; placing it before the work guarantees that work runs at request time.
- The three canonical reaches (concrete, so the student recognizes the *shape* of the problem, not just the API):
  1. **Reading `process.env` at runtime.** With `serverRuntimeConfig`/`publicRuntimeConfig` removed in 16, runtime config is read straight from `process.env` — but inside a prerenderable scope that value could be frozen at build. `await connection()` before `process.env.RUNTIME_CONFIG` forces a runtime read. (This is now the official documented example — use it as the primary one.)
  2. **Non-determinism:** `Date.now()` for a freshness stamp, `Math.random()` / `crypto.randomUUID()` for a per-request ID. These are exactly the values that L3 warned "freeze inside a cached scope" — `connection()` is the inverse, forcing them to re-evaluate per request. Tie back to L3 explicitly.
  3. **Third-party SDK calls** that read ambient state lazily and have no awaited-API footprint.
- The build rule: `connection()` inside a `'use cache'` function is a build error — request-time and cached output are mutually exclusive (same rule as awaiting any request API in a cached scope; reinforce, don't re-derive).
- The senior judgment: this is a **rare, precise** tool. Most routes never need it because they already await a real request API. Reaching for `connection()` should make the student pause and confirm there's genuinely no other signal.

Components:
- **`Code`** (tsx) showing the `process.env` runtime-read shape: `import { connection } from 'next/server'`, `await connection()`, then `process.env.RUNTIME_CONFIG`. Small and exact — the import path and the ordering (connection *before* the read) are the load-bearing details.
- **`CodeTooltips`** glossing `connection` ("marks this render dynamic — nothing below is prerendered at build") and the import source (`next/server`, not `next/headers`).

`Term` candidate: **prerender (build-time)** — one-line recap of L1's build pass, since `connection()`'s whole job is to *opt out* of it and the student needs that anchor fresh.

Reasoning: `connection()` is conceptually the hardest piece — it's an *absence* of signal that needs an explicit marker, which is unintuitive. Grounding it in three concrete, recognizable problems (especially the now-canonical `process.env` case) and tying both `Date.now()` back to L3's freeze warning makes it land as "the inverse of caching's determinism rule" rather than a free-floating API. Placing it after the request APIs is correct: the student must first internalize what *does* signal dynamic before appreciating the hatch for what doesn't.

---

### Typed props without the boilerplate: `PageProps` and `next typegen`

**Goal:** the senior ergonomic reach — make the async props type-safe and self-documenting so the student writes them correctly by default.

Content:
- The friction: hand-writing `props: { params: Promise<{ id: string }> }` on every page is boilerplate that drifts from the actual route shape (rename the folder, the type lies).
- The tool: Next.js generates **globally available** `PageProps<'/route'>`, `LayoutProps<'/route'>`, and `RouteContext<'/route'>` helpers — **no import needed** — typed precisely from the route's segment structure. `PageProps<'/blog/[slug]'>` gives `params: Promise<{ slug: string }>` and the `searchParams` shape for free.
- The command: `npx next typegen` regenerates these (also runs as part of `dev`/`build`). The student runs it (or relies on the dev server) after changing routes.
- Show the payoff shape: an `async` page typed with `PageProps<'/invoices/[id]'>`, awaiting `props.params` to get a fully-typed `{ id }`.
- The one watch-out: the generated types are **per-route and only as fresh as the last `typegen`/build** — after adding or renaming a route, a stale type or a "route not found" type error means "re-run typegen." Frame this as the normal loop, not a bug.

Component: **`CodeTooltips`** on a single typed page block — tooltip on `PageProps<'/invoices/[id]'>` ("globally available, no import; typed from your actual route folders via `next typegen`") and on `await props.params` ("now typed `{ id: string }` for free"). One block, two glosses; the ergonomics speak for themselves and don't warrant a stepped walkthrough.

`Term` candidate: **`next typegen`** (gloss: "generates the route-typed `PageProps`/`LayoutProps` helpers; runs automatically in `dev`/`build`, or on demand").

Reasoning: this is squarely "teach the form they will write" — the typed-props helper is the 2026 default shape for page components, and a junior who knows it writes correct, drift-proof signatures from day one. It belongs last because it presupposes the student understands what `params`/`searchParams` *are* (prior sections) before learning the type machinery that describes them.

---

### Putting it together: a decision walk

**Goal:** consolidate the lesson's central question — "what makes this code path dynamic, and how do I express it?" — into one navigable decision the student can internalize as a senior reflex.

Content / component: a **`StateMachineWalker`** (`kind="decision"`, no `<Figure>` wrapper — it self-cards) that walks the disposition decision:

- Root Question: "This route/component needs a value. Where does it come from?"
  - Branch "Request data (URL param, query, cookie, header)" → Question: "Server or Client Component?" → Leaf "Server: `await` the API — the await is the dynamic signal" / Leaf "Client: receive the Promise as a prop, unwrap with `React.use()` inside `<Suspense>`".
  - Branch "Runtime-only work with no request-API footprint (`process.env`, `Date.now()`, random id, lazy SDK)" → Leaf "`await connection()` before the work — the explicit dynamic marker".
  - Branch "Same value for everyone, refreshed on a schedule or event" → Leaf "`'use cache'` + `cacheLife` (+ tags) — not dynamic at all (Lessons 3–4)".
  - Branch "I'm reading an old codebase and see `export const dynamic`/`revalidate`/`fetchCache`/`runtime`" → Leaf "Migrate via the table: remove, or replace with `'use cache'` + `cacheLife`; `runtime='edge'` → remove / use `proxy.ts`".

This forces the student through the *order* a senior asks the questions in (is this even dynamic? request data or ambient? which side of the boundary?) and ties all five sections together. The walker is the right component precisely because the lesson's value is the decision order, not any single leaf.

Reasoning: the chapter capstone deserves a consolidation artifact that re-touches every section. A decision walk is the canonical "which tool do I reach for" device and reinforces that the legacy-config and async-API halves are answers to the *same* question — the lesson's thesis.

---

### External resources (LinkCards)

`ExternalResource` cards (verify URLs are live before shipping):
- Next.js — Upgrading to Version 16 (the async request APIs + removals sections).
- Next.js — Migrating to Cache Components (the canonical migration table source).
- Next.js — `connection()` API reference.
- Next.js — `PageProps`/`LayoutProps` helpers / `next typegen` CLI reference.

---

## Scope

**This lesson teaches:**
- The legacy route segment config (`dynamic`, `revalidate`, `fetchCache`, `runtime`) as recognition + migration targets, and the official old→new migration table.
- The async request API **contract**: all return Promises, `await` on the server, `React.use()` on the client, sync access is a build error.
- The Promise shape worked through `params` and `searchParams`; `cookies()`/`headers()`/`draftMode()` named as the same shape.
- `connection()` as the explicit dynamic marker for work with no other signal.
- `PageProps`/`LayoutProps` typed-props helpers and `next typegen`.

**This lesson does NOT teach (prerequisites — assume taught, recap in one line only):**
- `cacheComponents`, dynamic-by-default, the cached/dynamic tree, the Suspense seam — **Chapter 032 L1** (recap in a sentence; this lesson builds on it).
- `'use cache'` anatomy and the serialization contract — **L3**. `cacheLife` presets / `cacheTag` / `tags.ts` — **L4**. React `cache()` — **L5**. The invalidation surface (`updateTag`/`revalidateTag`/`revalidatePath`/`router.refresh`) — **L6**. Reference these by name when migration touches them; do not re-teach.
- Passing a Promise across the server/client boundary and `use()` mechanics from scratch — **Chapter 030 L4** (this lesson reuses the precedent).
- `<Suspense>` and streaming from scratch — **Chapter 031**.
- Dynamic segments / the route tree / `[id]` folders — **Chapter 029** (recap the term only).

**This lesson does NOT teach (reserved for future lessons — name + forward-pointer only):**
- `cookies()`/`headers()` in depth: the SaaS read reference list, trust boundaries on proxy headers, read-once-at-top, write paths — **Chapter 033 L1**.
- `proxy.ts`, the matcher, request-time rewrites, the Node-only runtime — **Chapter 033 L2** (named when `runtime='edge'` migration points there).
- URL state at depth: filters, sort, pagination, tabs via `searchParams` — **Chapter 033 L4**.
- Client navigation hooks (`useRouter`, `usePathname`, `useSearchParams`) — **Chapter 033 L5**.
- The full Zod validation pattern for `params`/`searchParams` — **Chapter 042** (name `safeParse` at the read site, don't teach).
- `generateStaticParams` / SSG seeding and `dynamicParams` — **Chapter 034 L8** (so `dynamic = 'force-static'` migration mentions SSG only in passing; do not dwell on `dynamicParams`).
- Setting cookies / Server Actions — **Chapter 043**. CMS preview build-out for `draftMode()` — later integration chapter.

---

## Code conventions notes

Aligned with `Code conventions §Caching and invalidation` (lines 326–327): async request APIs are Promises, `await` on server / `React.use()` on client, `connection()` is the explicit dynamic opt-in; `cacheLife` presets matched by data shape (no raw seconds in the migration guidance); tags via `tags.ts` (only referenced here, owned by L4/L6). Zod reads follow `§Schemas with Zod 4` (top-level builders like `z.uuid()`, `z.coerce.number()` for params) — **named at the read site only**, not taught (Chapter 042 owns it). `Date` is forbidden in domain code per `§Async/time`, so the `Date.now()` reference inside the `connection()` section is framed strictly as a *non-determinism example* (a freshness stamp at a third-party seam), not as a recommended domain pattern — note this framing so downstream agents don't "promote" it to a real time-handling example. `next.config.ts` (TS, not `.js`) per the course's pinned config form.
