# Chapter 036 — The Cache Components rendering model

## Chapter framing

Chapter 036 teaches the rendering and caching model that defines Next.js 16. The student has the App Router structure (chapter 033), the server/client boundary (chapter 034), and Suspense plus streaming (chapter 035). What they don't yet have is an answer to "when does this route render, where does the result live, and what makes a value go stale." The chapter names Cache Components as the 2026 contract — `cacheComponents: true` flips the default so every route is dynamic and caching is opt-in via the `use cache` directive at function, component, or page level. Partial Prerendering is the rendering shape that falls out: a static shell with streamed dynamic holes, the same Suspense boundaries from chapter 035 doing double duty as the seam between cached and uncached. The chapter ends with the post-mutation surface (`updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`) and the async request APIs that make the boundary between dynamic and prerendered explicit.

Threads that run through every lesson: explicit beats implicit — Next.js 16 deletes the magic where reading `cookies()` silently flipped a route to dynamic, and replaces it with directives the student writes and reads; the static-or-dynamic decision is now per-component, not per-route, and the seam is a Suspense boundary; `use cache` is the new opt-in for any cross-request reuse and it changes the function's semantics — closures cannot capture request data, arguments must be serializable, return values must be serializable; `cacheLife` profiles three lifetimes (stale, revalidate, expire) and the choice is a UX question, not a perf question; `cacheTag` is the named handle the mutation surface uses to invalidate; the React `cache()` primitive is for per-request memoization and lives at a different layer than `use cache`; `updateTag` (Server-Action-only, read-your-writes) and `revalidateTag` (stale-while-revalidate) split on whether the user expects to see their change immediately after redirect; the legacy route segment config (`export const dynamic`, `export const revalidate`) is rejected under Cache Components and the migration path is `use cache` + `cacheLife`; async request APIs (`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`) return Promises that must be awaited, and `connection()` is the explicit "everything below this point is dynamic" marker for cases the type system can't infer. The chapter ships seven teaching lessons plus a quiz, ordered so each lesson depends only on the ones before it; the project in chapter 039 leans on every primitive from this chapter except `updateTag` (which lands in Unit 7 with Server Actions proper).

---

## Lesson 1 — Dynamic by default

How `cacheComponents: true` flips every route to dynamic-by-default with per-component opt-in caching, and the explicit signals (`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`, `connection()`) that mark a code path dynamic.

Topics to cover:

- **The senior question.** A `page.tsx` runs `await db.invoices.find()` and renders the result. Does that page render at build time, at request time, or somewhere in between, and who decides? In Next.js 15 the answer was a flowchart of implicit triggers (a `cookies()` call, a non-cached `fetch`, an `export const dynamic`). Under `cacheComponents: true` the answer collapses: every route is dynamic by default, and the student opts into prerendering per function with `use cache`. The lesson names the new default and the mental model that follows from it.
- **The old model in one paragraph, then dropped.** Next.js 13–15 inferred dynamic rendering from API usage: a Server Component that read `cookies()` or did an uncached `fetch` flipped the whole route to dynamic; everything else got Full Route Cached at build time. The model was implicit and broke when a deep child reached for a dynamic API. Named once so the student recognizes it in older codebases and the migration guide.
- **The Next.js 16 default — explicit, dynamic, opt-in caching.** With `cacheComponents: true` in `next.config.ts`, every route renders at request time. A Server Component can read `cookies()`, await `searchParams`, or hit the database without flipping any flag, because no flag exists — it's already dynamic. Caching is something the student *adds* with `use cache`, not something they *avoid* tripping.
- **What "static" means now.** Static is per-component, not per-route. A component marked `use cache` renders once per cache key and serves the cached HTML on subsequent requests until the cache expires; the rest of the route still renders at request time. The page can mix both freely — a cached header alongside dynamic content alongside another cached widget — and the seam between them is a Suspense boundary.
- **The mental model — the route as a tree of cached and uncached subtrees.** Draw the component tree. Every node is dynamic by default. Marking a node `use cache` makes that node and its render output cacheable; the children of a cached node are also cached as part of the same entry. Dynamic content under a cached parent is forbidden — the framework rejects it at build with a clear error. The way to mix the two is to keep the cached subtree pure (no awaiting request data) and lift the dynamic work to a sibling.
- **The Suspense boundary is the seam.** When a route has both cached and dynamic content, the Suspense boundary around the dynamic part is what lets PPR ship the cached shell immediately and stream the dynamic hole in. Without the boundary, the entire route waits for the dynamic work. The chapter revisits this in lesson 2 of chapter 036.
- **Where dynamic comes from now — the explicit signals.** Awaiting `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`, or `connection()` marks the code path as dynamic. The framework's static analysis tracks this; a `use cache` function that tries to await any of them fails the build. The signals are all from `next/headers` or the page props — there is no hidden third channel.
- **The "everything below this point is dynamic" escape hatch.** `await connection()` from `next/server` is the explicit marker for code that has no other dynamic signal but must run at request time (calling a third-party SDK that reads `process.env` at call time, generating a random ID, reading `Date.now()` for a freshness check). Named here, used in lesson 8 of chapter 036.
- **The build-time prerender pass — what it does now.** Next.js still runs a build-time pass: it renders every `use cache` boundary it can resolve without request data and stores the result. At request time, the static parts are served from cache (or the CDN) and the dynamic parts run. The pass is what makes PPR's "instant shell" possible.
- **Enabling `cacheComponents` — the config line.** `next.config.ts` exports a config object with `cacheComponents: true`. The legacy `experimental.dynamicIO` and `experimental.useCache` flags are deprecated and removed; the top-level `cacheComponents` replaces both. The course pins this on from day one in the starter (chapter 033 reference). Named here so the student recognizes the line and knows what it does.
- **The teaching diagram.** A two-column diagram: pre-16 (a route flag per page, implicit triggers, Full Route Cache) on one side; 16 (per-component opt-in, explicit dynamic signals, PPR shell + streamed holes) on the other. The student leaves the lesson with the new mental picture.
- **Watch-outs.** Without `cacheComponents: true`, the previous-model rules still apply and the directives in later lessons do nothing or behave subtly differently; mixing dynamic reads inside a `use cache` function fails the build with a clear message — fix by lifting the read into a sibling or removing the directive; "static" no longer means a fully static HTML file at the route level — partial pages are the default; a route with no `use cache` anywhere is fully dynamic, which is correct and fine for most authenticated SaaS surfaces; the build log still distinguishes static-prerendered, dynamic, and streamed segments — read it to confirm what shipped where.

What this lesson does not cover:

- The `use cache` directive in full (lesson 3 of chapter 036).
- Partial Prerendering as a rendering shape (lesson 2 of chapter 036).
- `cacheLife` and `cacheTag` (lesson 4 of chapter 036).
- React `cache()` for per-request memoization (lesson 5 of chapter 036).
- The post-mutation invalidation surface (lesson 6 of chapter 036).
- Async request API specifics — `params`, `searchParams`, `cookies()`, `headers()`, `connection()` (lesson 8 of chapter 036).
- The deprecated route segment config (lesson 7 of chapter 036).

Estimated student time: 35 to 45 minutes. Sets the mental model that the rest of the chapter and every later data lesson assumes.

---

## Lesson 2 — Shells and holes with PPR

How Partial Prerendering ships a cached static shell from the edge and streams dynamic holes through Suspense boundaries, plus the pure-static and pure-dynamic degenerate cases.

Topics to cover:

- **The senior question.** A SaaS dashboard has a marketing-grade header (logo, nav, footer) that never changes between users and an org-specific table that changes every request. The header should ship from the CDN in 30ms; the table can stream in 400ms. How does the student wire one page to ship as two transport modes? The lesson names Partial Prerendering as the answer: the cached shell flushes from the edge, the dynamic holes stream after, the page is one URL.
- **What PPR is — the transport mental model.** At build time, Next.js renders everything wrapped in `use cache` and stores the HTML. At request time, the cached shell is served immediately (CDN-first, then the Node server's cache); each Suspense boundary marks a hole where dynamic content streams in once it resolves. The user sees the shell in tens of milliseconds; the dynamic content arrives chunk by chunk over the same HTTP response (lesson 2 of chapter 035 streaming).
- **PPR is no longer experimental.** Next.js 16 removed the `experimental.ppr` flag and the `experimental_ppr` segment config. PPR is the default rendering mode under `cacheComponents`. Named once because the student will see the old flag in tutorials and blog posts.
- **The two ingredients — `use cache` and `<Suspense>`.** A component marked `use cache` becomes part of the static shell. Any dynamic content (something that awaits request data) must live inside a `<Suspense>` boundary; that boundary is the hole PPR streams into. Without the boundary, the build fails — the framework cannot prerender something that needs request data. The senior reach: write the page as if the static shell and the dynamic holes are two collaborating things, not one component.
- **The canonical shape — a worked example.** A dashboard page: cached `<Header />` (the user-agnostic chrome), a `<Suspense>` boundary wrapping `<OrgInvoices />` (the dynamic table reading `cookies()` and `db.invoices.findForOrg(orgId)`), and a cached `<FooterAd />`. The route renders three pieces: shell, streamed hole, shell. The student maps the diagram to the file structure.
- **What's served at build vs. request.** The cached pieces ship from the static cache; the dynamic pieces stream from the server. The build log marks each route's segments. The CDN serves the shell; the origin runs the dynamic work. For Vercel, the shell sits on the edge network and the dynamic work runs in the serverless function for that route.
- **Why the seam is a Suspense boundary specifically.** Streaming (lesson 2 of chapter 035) sends the page as chunks; the shell is one chunk, each Suspense boundary's fallback is another. PPR repurposes the same protocol: the shell is *prerendered* HTML, the fallback is shipped with the shell, the boundary's content streams in when ready. The same primitive serves both transports — no new mechanism to learn.
- **The fallback inside a PPR hole.** The Suspense `fallback` is rendered at build time and ships in the static shell, then gets replaced by the streamed content. The senior reach: skeletons that match the final layout exactly so the swap is invisible; spinners are acceptable but lower-quality UX. Identical to the rules from lesson 1 of chapter 035 — PPR doesn't change the contract, it just makes the fallback's role load-bearing for perceived performance.
- **Pure-static routes — the marketing pages.** A page where every component is `use cache` and nothing is dynamic ships entirely from the static cache. The marketing site, the `/pricing` page, the `/blog/[slug]` posts all qualify. No Suspense boundaries needed if there's no dynamic work; PPR degenerates to "fully static" for those routes. The senior pattern: marketing routes in the same `app/` tree as the product, the framework decides per-route.
- **Pure-dynamic routes — the authenticated surfaces.** A route with no `use cache` anywhere renders fully at request time. The dashboard, the settings page, anything org-scoped. PPR is still active — Next.js just has no static shell to prerender. This is correct and common; the student should not feel pressure to cache authenticated content.
- **The runtime cost ledger.** A static shell that ships in 30ms beats a dynamic render that ships in 200ms even if the dynamic render is "fast." Caching the chrome of the app is the highest-leverage move; caching deep child components inside a dynamic page often isn't worth the freshness cost. The senior diagnostic: profile the route, find the slow boundary, decide if the data inside it would tolerate a cached lifetime.
- **PPR and parallel routes.** Each `@slot` in a parallel route (lesson 5 of chapter 033) is its own subtree; each can be independently cached or dynamic. The chapter 039 project leans on this — a cached navigation slot alongside a dynamic detail slot, both under the same URL, each with its own loading and streaming behavior.
- **Watch-outs.** PPR requires `cacheComponents: true`; without it the directives below behave under the legacy model; a dynamic read in a `use cache` component fails the build, never silently; a missing Suspense around a dynamic component in an otherwise-cached page also fails the build with a clear pointer; the shell is only as fast as the slowest cached component — keep cached work pure and fast; the build's prerender pass runs every cacheable component, so a `use cache` function that throws at build time fails the build, not just one request.

What this lesson does not cover:

- The `use cache` directive's full syntax and semantics (lesson 3 of chapter 036).
- `cacheLife` and `cacheTag` (lesson 4 of chapter 036).
- React `cache()` for per-request work (lesson 5 of chapter 036).
- Invalidation after a mutation (lesson 6 of chapter 036).
- Async request APIs (lesson 8 of chapter 036).
- Streaming and Suspense from scratch (chapter 035).

Estimated student time: 35 to 45 minutes. Owns the rendering picture every other lesson in the chapter refers back to.

---

## Lesson 3 — The use cache directive

The three placements (page, component, function) of `use cache`, the compiler-generated cache key, the serializable-arguments-and-return-value contract, and the closure rules cached functions must obey.

Topics to cover:

- **The senior question.** The student has a Server Component that fetches a marketing CMS post — the same content for every user, refreshed when the editor publishes. How do they cache the render output across requests, and what does the directive look like? The lesson names `use cache` as the React directive that marks a function, component, or page module as cacheable, with the compiler generating the cache key from the function's closure and arguments.
- **The three placements — page, component, function.** `use cache` at the top of a `page.tsx` caches the whole route. At the top of any Server Component module caches that component's render output. At the top of an async function body caches that function's return value (data fetchers). The same directive, three scopes, same semantics. The student picks based on what they want stored.
- **The cache key — generated by the compiler.** The compiler hashes the function's source plus the serialized arguments to produce the key. Two callers that pass the same arguments get the same cached entry; different arguments get different entries. The student writes no key by hand; the compiler ensures distinct arguments produce distinct entries.
- **Serialization rules — the contract.** Arguments to a `use cache` function must be serializable (same shape as the server-client boundary in lesson 4 of chapter 034 — primitives, plain objects, arrays, `Date`, `Map`, `Set`, typed arrays). Return values must be serializable. Functions, class instances, Promises-of-Promises are rejected. The compiler enforces this at build; a violation is a build error with the offending parameter pointed at.
- **What "the closure" means for caching.** A cached function cannot capture request-scoped data from its enclosing scope. The compiler treats anything outside the function as part of the cache key only if it's reachable and serializable; it rejects references to dynamic APIs and to anything that smells request-scoped. The senior shape: cached functions take all inputs as arguments, never read from outer scope.
- **Async-only.** `use cache` only marks `async` functions and `async` components. Synchronous functions don't need caching because they're cheap to re-run; the directive on a sync function is a build error.
- **Where the cached value lives.** The cache backend is pluggable. On Vercel it lives in the platform's distributed cache (edge-replicated); locally it lives in `.next/cache`. The framework abstracts the storage — the student writes the directive, the deployment supplies the backend. Self-hosted Next.js can plug in Redis or another store via the cache handler API; named once, not taught.
- **Page-level `use cache` — the fully-static route.** A `page.tsx` with `use cache` at the top renders once per cache key and serves the cached HTML on subsequent matching requests. Useful for marketing pages, blog posts, public profiles. Pair with `generateStaticParams` (lesson 11 of chapter 038) to seed the cache for known dynamic segments at build.
- **Component-level `use cache` — the cached widget.** A leaf component that takes its inputs as props, marked `use cache`, becomes a cacheable subtree. Useful for chrome, sidebars, footers, anything shared across routes. The component's children render at build into the cached HTML; if they themselves are dynamic, the component fails to cache.
- **Function-level `use cache` — the cached fetcher.** An async function that fetches and returns data, marked `use cache`, becomes a deduplicated and persistent cache. Two callers across two requests with the same arguments get one fetch, one stored value. Distinct from React `cache()` (lesson 5 of chapter 036) which is per-request, not cross-request.
- **The migration from `fetch` caching.** Pre-16, `fetch()` defaulted to caching and the student opted out with `{ cache: 'no-store' }`. In 16, `fetch()` defaults to no-store and the student opts in by wrapping the call in a `use cache` function. The change is part of the explicit-by-default story; named so the student recognizes the old code patterns.
- **Inputs that go into the cache key — the compiler's contract.** Function arguments (always), the function's source code (so a code change invalidates the entry), and the deployment ID. Nothing else. The student should think of a cached function as "pure of request, parameterized by arguments."
- **Composition — cached components calling cached functions.** A cached component can call a cached function; the function's cache entry is shared with any other caller passing the same arguments. The senior pattern for a data layer: every fetcher is a small `use cache` async function, components that need the data import the fetchers, and the cache is automatic and shared.
- **What `use cache` is not.** Not a hint, not a heuristic — it's a contract enforced at build. Not request-scoped — that's React `cache()` (lesson 5 of chapter 036). Not free — every cached entry costs storage and has eviction implications. Not for client code — `use cache` is server-only; a Client Component module with `use cache` is a build error.
- **Watch-outs.** A `use cache` function that closes over a non-serializable value (a database client, a logger instance) fails the build — pass these as arguments or import inside the function body; capturing `Date.now()` in the closure produces a key that's correct at build but stale at runtime — read time inside the function or accept the cached freshness; the compiler enforces the rules statically, so missing argument coverage shows up at build, not at runtime; cached entries persist across deploys unless the deployment ID changes the key — for staging environments this is usually fine; large cached values eat the storage budget — cache the smallest useful slice; nesting `use cache` inside a non-cached parent is legal and common; nesting a dynamic await inside `use cache` is a build error.

What this lesson does not cover:

- `cacheLife` for freshness windows and `cacheTag` for naming (lesson 4 of chapter 036).
- React `cache()` and the request memo cache (lesson 5 of chapter 036).
- Invalidating cached entries (lesson 6 of chapter 036).
- Route segment config and its deprecations (lesson 7 of chapter 036).
- Async request APIs (lesson 8 of chapter 036).
- Self-hosted cache backends — named, not taught.

Estimated student time: 50 to 65 minutes. The center-of-gravity lesson for the chapter; every later lesson references it.

---

## Lesson 4 — Lifetimes and tags

The three-number `cacheLife` contract (stale, revalidate, expire) with its preset profiles, and `cacheTag` naming conventions for entity-level and record-level invalidation.

Topics to cover:

- **The senior question.** The student cached a `getProductCatalog()` function with `use cache`. The catalog updates a few times a day in the admin panel. How long should the cache live, and how does the admin's update trigger fresh data without a full deploy? The lesson names `cacheLife` as the freshness-window control and `cacheTag` as the named handle the invalidation API targets.
- **`cacheLife` — the three-number freshness contract.** Every cached entry has three lifetimes: `stale` (how long a client can use the cached value without revalidation), `revalidate` (after this, the next request triggers a background refresh), and `expire` (after this with no requests, the next request waits for fresh content). The numbers form a UX contract: how stale is acceptable, how often to refresh, when to discard entirely.
- **The preset profiles — `default`, `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`.** Next.js ships a set of preset names, each a `{ stale, revalidate, expire }` triple tuned for a common use case. The senior reach: start with a preset, customize only when the data has unusual freshness needs. The `max` profile (effectively never-expires, revalidated in background) is the right reach for catalog-shaped data with explicit invalidation.
- **The call site — inside the function, not at module scope.** `cacheLife('max')` is called *inside* the function body, after the `use cache` directive. Calling it at module scope throws. The senior reach: keep the directive and the lifetime side by side at the top of the function so the contract is local.
- **Custom profiles in `next.config.ts`.** For project-specific lifetimes (e.g., "30 minutes stale, refresh every 5 minutes, expire after a day"), define a named profile in `cacheLife` config and reference it by name in the function. The profile lives in one file so the team can audit freshness policies in one place.
- **Default lifetime — what you get without `cacheLife`.** A `use cache` function with no `cacheLife` gets the `default` profile — sensible for most cases but not always appropriate. The senior reach: state the lifetime intentionally for any cache that holds business data.
- **`cacheTag` — the named handle.** `cacheTag('product-catalog')` inside a `use cache` function attaches the named tag to that cache entry. The tag is the address the invalidation API (lesson 6 of chapter 036) uses to mark the entry stale or replaced. A function can attach multiple tags; an entry can be invalidated by any of them.
- **Tag naming — the senior shape.** Tags are strings. The senior pattern is `entity-type` for collections (`invoices`, `products`) and `entity-type:id` for individual records (`invoice:42`, `product:abc`). The reason: the mutation surface in lesson 6 of chapter 036 needs to express both "invalidate one record" and "invalidate the list that contains it," and the tag namespace is the way to do both.
- **Tags scoped by argument — the senior pattern.** `cacheTag(\`product:${id}\`)` attaches a per-record tag at call time. The compiler permits computed tags as long as they're string-typed. The pattern composes with `cacheTag('products')` — a function can attach both, allowing fine-grained ("invalidate this one") and coarse-grained ("invalidate the list") invalidation against the same cached entry.
- **The interaction with `cacheLife`.** A tag-targeted invalidation marks the entry stale immediately regardless of `cacheLife`. `cacheLife` is the timeout policy when no invalidation arrives; `cacheTag` plus an invalidation call is the push policy when the upstream knows the data changed. Production SaaS uses both: `cacheLife('max')` plus precise tags is the canonical shape.
- **Stale-while-revalidate semantics.** Between `revalidate` and `expire`, the cache serves stale content and refreshes in the background. Between `expire` and infinity, the cache makes the next caller wait for the refresh. The student should think of `revalidate` as "best-effort freshness, no user impact" and `expire` as "the line where staleness becomes unacceptable."
- **Reading `cacheTag` and `cacheLife` from `next/cache`.** Both are named imports. They're typed; the preset names are a union string type and editors autocomplete the choices.
- **Tags vs. paths — the senior reach.** Tags name *entities*; paths name *URLs*. Tag the cached data, not the URL it appears in. The same `product-catalog` tag invalidates every page rendering the catalog (homepage, search, admin) without enumerating URLs. Path-based invalidation (lesson 6 of chapter 036) exists for cases where the URL is the unit of caching (a generated PDF, a sitemap) and the tag isn't.
- **Watch-outs.** Calling `cacheLife` outside a `use cache` function throws — the directives are paired; the `max` profile with no `cacheTag` is a footgun (the entry never refreshes until a code change) — pair them; tags are case-sensitive and untyped at the invalidation site — a typo means a silent no-op, so centralize tag strings in a const-export; tagging by user-supplied IDs without sanitization opens cache-namespace pollution — derive tags from validated IDs; multiple cached calls with the same tag share invalidation, which is usually what you want; an entry with no `cacheTag` can still be invalidated by `revalidatePath`, but not by any tag — pick one model per function and stick with it.

What this lesson does not cover:

- The `use cache` directive itself (lesson 3 of chapter 036).
- `revalidateTag`, `updateTag`, `revalidatePath`, `router.refresh` — the invalidation surface (lesson 6 of chapter 036).
- React `cache()` for per-request memoization (lesson 5 of chapter 036).
- Cache backends and self-hosting (named in lesson 3 of chapter 036).
- Webhooks as invalidation triggers — Chapter 067.

Estimated student time: 45 to 55 minutes. Pairs with lesson 3 of chapter 036 as the two-part anatomy of a cached function.

---

## Lesson 5 — Per-request memoization with React cache()

React's `cache()` as the request-scoped deduplication primitive for work that depends on request data, contrasted with `use cache` for cross-request persistence, with the canonical request-scoped-user pattern.

Topics to cover:

- **The senior question.** A page calls `getCurrentUser()` from three places: the layout, the page itself, and a nested Server Component. Each call hits the database. How does the student deduplicate identical calls within one render without persisting anything across requests? The lesson names React's `cache()` as the request-scoped memoization primitive, and contrasts it with `use cache` (cross-request) to pin the distinction.
- **What `cache()` is.** A function imported from `react` that wraps another function and memoizes its return value for the lifetime of one server render. Called twice with the same arguments during one request, the wrapped function runs once and returns the same value. The cache is scoped to the React render tree and discarded when rendering completes.
- **The two-layer cache model — request vs. cross-request.** React `cache()` lives at the request layer: deduplicate within one render, then forget. `use cache` lives at the cross-request layer: persist across renders and across users, key by the function's arguments and source. The student picks based on what they want to share — within a render, or across renders.
- **The canonical shape — wrap at module scope.** `export const getCurrentUser = cache(async (cookies: ReadonlyRequestCookies) => { /* db read */ });`. The wrapper must live at module scope (not inside a component) so every importer gets the same memoized function. Defined inside a component, `cache()` creates a fresh memoizer per render and provides no benefit.
- **Argument identity — the deduplication key.** `cache()` keys by argument reference equality for objects and value equality for primitives. Two calls with the same string argument deduplicate; two calls with separately-constructed object arguments do not. The senior pattern: pass primitives or pass the same reference (e.g., the resolved `cookies()` object once per render).
- **The deduplication pattern for the request-scoped user.** The auth layer reads `cookies()` once at the layout level, calls the cached `getCurrentUser()`, and the result is reused by every Server Component that calls `getCurrentUser()` deeper in the tree. The page doesn't need to thread `user` as a prop; each consumer imports the cached function. Chapter 9 builds on this.
- **The interaction with `use cache`.** `use cache` itself deduplicates within a request as a side effect of being cached. So why does React `cache()` still exist? Because some work *cannot* be cached cross-request — anything that reads `cookies()`, `headers()`, or per-request derived data. For that work, `cache()` is the per-request equivalent and the only available primitive. The decision tree: if the work is request-independent, reach for `use cache`; if it depends on request data, reach for `cache()`.
- **What `cache()` does not do.** It does not persist across requests — a second user hitting the same route gets their own cache. It does not invalidate — the cache is created and destroyed in the same render. It does not cross the server-client boundary — Client Components have their own React Context for sharing values, not `cache()`.
- **`cache()` is not the same as `useMemo`.** `useMemo` is for Client Components and lives in the React fiber. `cache()` is for any server-side function and lives at the module level. The two solve different problems at different layers; the student should not reach for `useMemo` to dedupe server work.
- **The senior pattern — building a small request-scoped layer.** A `src/lib/auth.ts` module exports `getSession`, `getCurrentUser`, `getOrg`, each wrapped in `cache()`. Every Server Component imports the function it needs; the framework guarantees one database read per render. The pattern composes with `use cache` for downstream functions that are request-independent.
- **What `cache()` is *not* the right tool for.** Caching a database query whose result doesn't depend on request data — `use cache` does that and persists. Caching expensive computation that depends only on serializable inputs — same. Caching a fetched API response — same. `cache()` is specifically for work that *must* run per-request but is called from multiple places.
- **Watch-outs.** `cache()` defined inside a component or hook creates a fresh memoizer every render and silently provides no benefit — always at module scope; argument identity matters — passing freshly-constructed objects defeats memoization, so pass primitives or stable references; the cache does not persist beyond render — using `cache()` for cross-request reuse is a common mistake under the old mental model; combining `cache()` and `use cache` on the same function is legal but redundant — pick one based on whether the work is request-scoped; `cache()` does not deduplicate across Suspense boundaries that resolve at different times if the arguments differ.

What this lesson does not cover:

- The `use cache` directive (lesson 3 of chapter 036).
- `cacheLife` and `cacheTag` (lesson 4 of chapter 036).
- The invalidation surface (lesson 6 of chapter 036).
- Async request APIs that `cache()` is often paired with (lesson 8 of chapter 036).
- Client-side state and `useMemo` (Chapter 028).
- Database access patterns at scale — Unit 6.

Estimated student time: 35 to 45 minutes. Short and focused; the lesson pins the distinction the rest of the chapter assumes.

---

## Lesson 6 — Invalidating after a mutation

The four-tool decision tree — `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (stale-while-revalidate), `revalidatePath`, and `router.refresh` — picked by the user-expectation question.

Topics to cover:

- **The senior question.** The user clicks "Update invoice," the Server Action writes to the database, the action redirects back to the list. If the list is cached, the user sees their old invoice and assumes the save failed. How does the student invalidate exactly the cached entries that changed, when, and from where? The lesson names the four-tool decision tree: `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`, and the question that picks between them.
- **The senior question, sharpened — read-your-writes.** The reach is whether the user expects to see *their own change* immediately after the mutation completes, or whether brief staleness is acceptable. Form submissions in the same session demand read-your-writes; webhook-driven updates and admin tools can tolerate stale-while-revalidate. The two `*Tag` APIs split on exactly this question.
- **`updateTag` — read-your-writes semantics.** New in Next.js 16. Called from inside a Server Action with a tag string and a new value; the tag's cached entry is replaced synchronously within the same request, and the action's caller (the redirect target) reads the fresh value on the next render. The user's change is visible on the very next page. `updateTag` is Server-Action-only — calling it from a route handler or a webhook throws.
- **`revalidateTag` — stale-while-revalidate semantics.** Marks the tag's cached entries as stale; the next read serves the stale content and refreshes in the background. The freshness is "soon but not now." Usable from Server Actions, route handlers, and any server-side code. The canonical reach: webhooks (Stripe, CRM sync), scheduled jobs, admin mutations where a brief stale read is fine. Next.js 16 requires `revalidateTag` to accept a `cacheLife` profile as the second argument naming the SWR behavior.
- **The decision tree — which `*Tag` to reach for.** Does the user expect their change visible on the next page after the redirect? Use `updateTag`. Is the mutation from a webhook, a scheduled job, or an admin tool where a moment of staleness is acceptable? Use `revalidateTag`. Both target tags from `cacheTag` (lesson 4 of chapter 036); the difference is timing.
- **`revalidatePath` — when the URL is the unit.** Marks every cached entry tied to a specific path stale. The reach is for cases where the cached unit is the URL itself (a generated sitemap, a static export page, an OG image route). Rarely the right call for tag-based caches; tags are more precise. Named once, used sparingly.
- **`router.refresh` — the client-side trigger.** Imported from `next/navigation`, called from a Client Component. Tells the router to refetch the current route's Server Components without a full page reload. The reach: after a Client-Component-initiated state change that should be reflected in server-rendered content (e.g., a manual refresh button). It does not invalidate caches — it just re-renders. Pair with `revalidateTag` in the action if the cache needs invalidating.
- **The post-mutation pattern — the canonical Server Action shape.** Pseudo-shape: validate input, write to the database, call `updateTag('invoices')` and `updateTag(\`invoice:${id}\`)`, redirect to the list. The user lands on the list, the cached list reads fresh, the user sees their change. Chapter 047 owns the full Server Action surface; this lesson names the invalidation slot.
- **Coarse-grained vs. fine-grained invalidation.** When the user edits one invoice, two tags fire: `invoice:42` (the detail page) and `invoices` (any list rendering the collection). Both are cheap; the senior pattern is to attach both tags at the cache site and invalidate both at the mutation site. Granularity is free at the invalidation layer; the cost is what you cache and what you tag.
- **What fires after a webhook — the asymmetric pattern.** A Stripe webhook updates a subscription. The user isn't in the loop — they were redirected to a Stripe-hosted page or notified by email. `revalidateTag('subscription:...', 'max')` is the right reach: the next time the user loads their billing page, they see the fresh state, and the stale read in the meantime is acceptable. Chapter 067 owns webhooks proper; this lesson sets the timing pattern.
- **What `router.refresh` does not do.** It does not invalidate any cached entries. It does not re-fetch on a different URL. It does not work from a Server Component (no router there). It's the client tool for "I changed local state, re-pull the server side." Common pairing: a "Mark all read" button in a Client Component triggers a Server Action that calls `revalidateTag('notifications', 'max')`, then calls `router.refresh()` so the route re-pulls.
- **Path-based legacy — `revalidatePath` for the migration case.** Pre-16 codebases often invalidated by path. The migration to tags is the senior reach: tag the data once at the cache site, invalidate by tag everywhere. `revalidatePath` stays in the toolbox for genuine path-as-resource cases.
- **Watch-outs.** `updateTag` outside a Server Action throws — wrap the call in `'use server'` or use `revalidateTag`; `revalidateTag` without a `cacheLife` profile as the second argument fails the build in 16 — supply one; tag strings are untyped — typos at the invalidation site silently miss every entry; `router.refresh` doesn't fire if the route has no cached server work — it's a no-op for fully dynamic routes; calling `revalidatePath` for a tag-targeted cache works only when the cached function happens to be called from that exact route — tags are more reliable; running `updateTag` and `revalidateTag` for the same tag in one action is wasteful — pick one based on timing; `router.refresh` is debounced by Next.js, so calling it twice in quick succession runs once.

What this lesson does not cover:

- `cacheTag` and `cacheLife` (lesson 4 of chapter 036).
- Server Actions in full — Chapter 047.
- Webhook ingestion patterns — Chapter 067.
- Optimistic UI with `useOptimistic` — lesson 6 of chapter 048.
- Path-based static generation — lesson 11 of chapter 038.
- Form-with-action wiring — Chapter 048.

Estimated student time: 50 to 65 minutes. Closes the loop on the cache lifecycle and prepares for Server Actions in Unit 7.

---

## Lesson 7 — Async request APIs and legacy segment config

Awaiting `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` as Promises with `React.use()` for Client Components, `connection()` as the explicit dynamic opt-in, and the migration away from the deprecated `dynamic`, `revalidate`, and `fetchCache` segment exports.

Topics to cover:

- **The senior question.** The student opens an older codebase and sees `export const dynamic = 'force-dynamic'`, `export const revalidate = 60`, `export const runtime = 'edge'` at the top of a `page.tsx`. Which of these still work in Next.js 16, which are deprecated under Cache Components, and what replaces them? Separately, the student writes a page that needs the URL's `?status=` query, the user's session cookie, and a freshly-generated request ID. What's the syntax for reading each, and where does dynamic rendering come from? The lesson covers both: the deprecated config surface and the async request APIs that replace much of it.
- **Why one lesson.** The route segment config and the async request APIs are two halves of "how does this route declare itself dynamic." Under Cache Components, the config surface shrinks and the API surface becomes the primary signal. Teaching them together pins the migration story.
- **The legacy route segment config — what got deprecated.** `export const dynamic`, `export const revalidate`, `export const fetchCache` are deprecated under `cacheComponents: true`. The framework warns or errors when it sees them. The replacements: `use cache` plus `cacheLife` for the freshness window, `await connection()` for explicit dynamic, no replacement needed for `force-dynamic` (the default is already dynamic).
- **What's left of segment config — `runtime` and `dynamicParams`.** `export const runtime = 'nodejs'` is still valid and is now the default (the Edge runtime is named once, deprecated for most cases — Next.js 16 standardizes on Node for App Router). `export const dynamicParams = false` for dynamic segments still works and pairs with `generateStaticParams` (lesson 11 of chapter 038) for SSG. Both are reference items the student will rarely touch.
- **The migration table — old to new.** `dynamic = 'force-dynamic'` becomes "remove the line." `revalidate = 60` becomes `use cache` plus `cacheLife({ revalidate: 60, ...})`. `fetchCache` becomes "wrap the fetcher in `use cache` or don't." The student leaves the lesson able to read either form.
- **Async request APIs — the contract.** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` all return Promises in Next.js 16. The student awaits them in Server Components and unwraps with `React.use()` in Client Components. No synchronous access is supported; the framework rejects sync reads at build with a clear error.
- **`params` — the route's dynamic segments.** Comes in as a Promise via the page or layout's `props.params`. `const { id } = await props.params;` inside an `async` Server Component. Validate with Zod for any param that's a number or constrained string. The Promise resolves once per render; awaiting it does not flip the route dynamic by itself, but the route was dynamic anyway under Cache Components unless wrapped in `use cache`.
- **`searchParams` — the URL query.** Same shape as `params` — `props.searchParams` is a Promise of `Record<string, string | string[] | undefined>`. Reading `searchParams` is the canonical URL-state pattern (lesson 4 of chapter 037). The shape allows arrays (for repeated keys) and undefined (for missing keys). Validation with Zod is standard.
- **`cookies()` and `headers()` — server-side request reads.** Both from `next/headers`, both async. `const cookieStore = await cookies();` then `cookieStore.get('session')`. Used by the auth layer (Chapter 9) and any feature reading per-request state. Reading either makes that code path dynamic — but, again, dynamic is the default in 16, so this is no longer a flag-flipping concern.
- **`draftMode()` — preview vs. published.** Returns a Promise resolving to an object with `isEnabled` and `enable`/`disable` methods. The CMS-preview pattern: a route handler enables draft mode for editors, the page reads `await draftMode()` and conditionally renders draft content. Named once; full coverage when the student builds a CMS integration.
- **`connection()` — the explicit dynamic marker.** Imported from `next/server`. `await connection()` in a Server Component declares "everything below this line is dynamic." Used when the dynamic signal isn't visible to the framework's static analysis — calling a third-party SDK that reads `process.env` lazily, generating a random ID, reading `Date.now()` for cache busting. The reach is rare but precise; the framework cannot infer it otherwise.
- **The Client-Component unwrap — `React.use(promise)`.** A Client Component that needs `params` or `searchParams` receives the Promise as a prop and unwraps with `React.use()`. Same shape as the streaming-Promise pattern in lesson 4 of chapter 034. The Client Component suspends until the Promise resolves; wrap the consumer in `<Suspense>` for the boundary.
- **The senior shape — read at the layout or page, pass down resolved.** Read the async APIs at the highest reasonable level (layout for cookies, page for params), await, pass the resolved value to children as a regular prop. The pattern keeps `await` calls at the top of the file and the rest of the component tree synchronous and easy to read.
- **The codemod and `next typegen`.** Next.js 16 ships a codemod that converts sync access to async access automatically. `npx next typegen` generates the typed `PageProps<'/path'>` and `LayoutProps<'/path'>` helpers that give `params` and `searchParams` precise types based on the route. Named so the student knows the tooling exists.
- **Watch-outs.** Synchronous access to `cookies()`, `headers()`, `params`, `searchParams` is a build error in 16 — the codemod handles most cases automatically; awaiting `params` inside a `use cache` function is a build error — request data and cached output don't mix; `connection()` flips everything below dynamic, including children — placing it inside a `use cache` function is a build error; the typed `PageProps` helper is per-route and stale until `next typegen` is re-run after route changes; `draftMode()` is rarely needed for SaaS apps but is the right reach for CMS-style preview surfaces; the legacy `runtime = 'edge'` is named once because some older patterns still use it — for SaaS, Node is the default and right reach in 2026.

What this lesson does not cover:

- The `cookies()` and `headers()` server-side reads in full — lesson 1 of chapter 037.
- URL state patterns at depth — lesson 4 of chapter 037.
- Client-side navigation hooks (`useRouter`, `usePathname`, etc.) — lesson 5 of chapter 037.
- `proxy.ts` and request-level rewrites — lesson 2 of chapter 037.
- The Zod validation pattern in full — Chapter 046.
- `generateStaticParams` and SSG — lesson 11 of chapter 038.

Estimated student time: 55 to 70 minutes. Closes the chapter with the surface every Server Component and route module touches.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

- The Next.js 16 default — every route is dynamic, caching is opt-in via `use cache`, `cacheComponents: true` is the flag that enables this contract.
- Partial Prerendering as the rendering shape — static shell at build, dynamic holes streamed in at request, the seam is a Suspense boundary.
- The `use cache` directive — three placements (page, component, function), serializable arguments and return value, compiler-generated cache keys.
- `cacheLife`'s three numbers (stale, revalidate, expire), the preset profiles, where to call the function (inside the cached function body).
- `cacheTag` as the named handle for invalidation, the senior naming pattern (`entity` and `entity:id`), the interaction with `cacheLife`.
- React `cache()` versus `use cache` — request-scoped memoization for work that depends on request data, versus cross-request persistence for work that doesn't.
- `updateTag` (Server-Action-only, read-your-writes) versus `revalidateTag` (any context, stale-while-revalidate); the user-expectation question that picks between them.
- `revalidatePath` and `router.refresh` — when each is the right reach, and what `router.refresh` does *not* do (invalidate caches).
- The deprecated route segment config under Cache Components — `dynamic`, `revalidate`, `fetchCache` replaced by `use cache` plus `cacheLife`.
- Async request APIs — `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` return Promises; `connection()` as the explicit dynamic opt-in.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
