# Per-request memoization with React cache()

- **Title (h1):** Per-request memoization with React cache()
- **Sidebar label:** React cache()

---

## Lesson framing

Short, single-idea lesson (target 35–45 min). Its whole job is to pin **one distinction** the rest of the chapter already gestured at: React's `cache()` is *request-scoped* deduplication; `'use cache'` is *cross-request* persistence. Two tools, two layers, one decision. Everything in the lesson serves that contrast.

Conclusions from brainstorming that apply lesson-wide:

- **This is a "trigger before tool" lesson, and the trigger is concrete.** Open with the real problem (the senior question from the outline): one render calls `getCurrentUser()` from a layout, the page, and a deep Server Component. Each call hits the DB. Three identical DB round-trips for one page. The student already knows (from ch 030) that Server Components compose freely and don't share props down the tree automatically; that freedom is exactly what produces the duplicate-fetch problem. `cache()` is the fix. Lead with the pain, name the tool second.
- **The mental model is two layers, and it must be drawn, not just stated.** Request layer (born and discarded inside one render) vs cross-request layer (survives across renders and users). This is the keystone visual. Every other point in the lesson hangs off it. Students coming from the pre-16 mental model (or from client React) conflate "caching" into one bucket; the layer split is the whole insight.
- **Build directly on L3, do not re-teach it.** L3 taught `'use cache'` in full and *already seeded* the contrast ("`'use cache'` is cross-request, `cache()` is per-request"). This lesson pays that off. Reference `'use cache'` as known; spend the budget on what's new: the request layer, argument identity, and the decision between the two.
- **The why-does-this-even-exist question is the hard part, and the answer is request data.** `'use cache'` *also* dedupes within a request (as a side effect of being cached), so a sharp student asks: why is `cache()` a separate primitive at all? The answer pins the whole lesson: some work **cannot** be cached cross-request because it reads request data (`cookies()`, `headers()`, the resolved session). For that work, `'use cache'` is *forbidden* (a build error — established L3), so `cache()` is the only available dedup primitive. Frame `cache()` as "the per-request equivalent for work that touches the request."
- **Anchor in the production pattern the course actually ships.** The `lib/auth.ts` session-read ladder is canonical (Code conventions §Authentication): `getCurrentUser` / `requireUser` / `requireOrgUser`, all React-`cache`d, all resolving through one `auth.api.getSession({ headers: await headers() })` per request. This is *the* reason `cache()` exists in this codebase, and it ships in Unit 8. Teach the pattern's shape here so it's familiar when auth lands. Keep it shaped as the real thing but stripped to the teaching core (don't pull in Better Auth specifics — that's Unit 8's job).
- **Two named anti-patterns carry most of the practical value.** (1) `cache()` defined *inside* a component → fresh memoizer every render → silently no benefit. (2) Passing freshly-constructed object arguments → reference inequality → defeats memoization. Both fail *silently* (no error, just no dedup), which is what makes them senior-grade watch-outs. Give each a visible treatment, not a footnote.
- **Disambiguate against the two neighbors the student will confuse it with:** `'use cache'` (the headline contrast) and `useMemo` (client-side, React fiber, different layer entirely — the React Compiler lesson already covered it). A one-line "not this" for each prevents cross-wiring.
- **Code is small.** The wrapper is one line. The lesson's weight is in the model (diagram), the decision (when each), and the two silent failures — not in syntax volume. Keep code blocks short and high-signal.
- **Cognitive load:** simplest version first (wrap a function, call it twice, it runs once), then layer in argument identity, then the request-data rationale, then the production ladder. Never open with the full auth ladder.

---

## Lesson sections

### Introduction (no heading)

State the goal and the pain in the same breath. Warm, brief, 1–2 short paragraphs.

- Open on the concrete problem: a dashboard render reaches for the current user in three places — the layout (to show the avatar), the page (to scope a query), a nested `<Nav>` (to highlight the active org). Each call independently runs `auth.api.getSession(...)` → a DB read. **Three reads, one page, identical result.** Tie to what they know: ch 030 established that Server Components compose without threading props down; that same independence is why three components each fetch the user on their own.
- Name the fix in one sentence: React's `cache()` wraps a function so it runs **once per render**, and every caller in that render shares the result.
- Preview the real payoff: by the end, the student can build the request-scoped data layer (the `getCurrentUser` shape) that the whole authenticated app leans on, and — more importantly — know exactly when to reach for `cache()` versus the `'use cache'` they learned last lesson.

### The duplicate-read problem

Make the pain real before naming the tool (decisions-before-syntax filter).

- Show the naive shape: three Server Components in one tree, each importing and calling an un-memoized `getCurrentUser()`. Keep it tiny.
- Spell out what happens: React renders the tree, each component's `await getCurrentUser()` fires independently, three DB round-trips. The student can't "just pass it as a prop" cleanly — the nav is three levels down, prop-drilling the user through intermediate components that don't use it is the exact smell the course avoids. (Brief: this is *not* a React Context problem either — Context is client-side; these are Server Components.)
- The senior reframe: the duplication isn't a bug in any one component — it's structural. Each component is correct in isolation. The fix has to live at the **function**, not the call sites. That's the hook for `cache()`.

Component: a small `Code` block (the three-caller tree, ~10 lines, can collapse the bodies). Consider a tiny `RequestTrace` is **overkill** here — the point is "same read three times," not a render pipeline; a plain code block + prose is enough. Do **not** reach for `RequestTrace` in this section.

### What cache() does

The simplest correct version. One concept: wrap → dedupe-per-render.

- `cache` is a named import from `react` (not `next/*` — it's a React primitive, not a Next.js one; worth stating because the student's instinct after L3/L4 is to import cache things from `next/cache`). It wraps a function and returns a memoized version. (Fact-checked June 2026 against react.dev/reference/react/cache — import path, per-request invalidation, and module-scope requirement all current.)
- The canonical shape, **at module scope**:
  ```ts
  import { cache } from 'react';

  export const getCurrentUser = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  });
  ```
- Semantics, stated plainly: called more than once **with the same arguments during one render**, the wrapped function body runs **once**; every caller gets the same returned value (the same Promise, in fact). When the render finishes, the memo is thrown away.
- Critical scoping rule, stated here and reinforced in watch-outs: the `cache(...)` wrapper **must live at module scope**. Defined inside a component, it creates a brand-new memoizer on every render → every caller in that render gets a *different* memoized function → zero deduplication, no error. This is the #1 silent failure; plant it early.

Component: a single `Code` block for the canonical shape. Use `CodeTooltips` on this block to gloss `cache` ("memoizes for one server render") and the `headers()` call (defer the *how* to L7, just label it "per-request API — reading it is what makes this uncacheable cross-request; that's why we need `cache()`"). The tooltip on `headers()` does double duty: it both defers the syntax and seeds the request-data rationale.

Note for downstream agent: `auth.api.getSession` / Better Auth is Unit 8 territory — show it as the realistic call but do **not** explain Better Auth here. A `// resolved once per request` comment is enough. This is deliberate staging, mirroring how L1–L2 kept `'use cache'` opaque.

### Two cache layers: per-request and cross-request

The keystone. The mental model the whole lesson (and the student's future cache decisions) hangs on.

- The single sentence the student should leave with: **`cache()` deduplicates within one render and forgets; `'use cache'` persists across renders and across users.**
- Draw it. This is the lesson's primary diagram (details below).
- Walk the two lifetimes:
  - **Request layer (`cache()`):** memo is created when the render starts, lives only as long as that render, discarded when it completes. User B hitting the same route in the same second gets their own fresh memo — nothing is shared between requests. No persistence, no eviction, no invalidation, no `cacheLife`/`cacheTag` (those are L4 concepts and they don't apply here — say so explicitly).
  - **Cross-request layer (`'use cache'`):** entry is keyed by arguments + function source (recap from L3, one line), stored in the server's cache backend, served to *any* request whose key matches until it's invalidated or expires. Shared across users by design.
- The decision in one line, previewing the dedicated section: request-dependent work → `cache()`; request-independent work → `'use cache'`.

**Diagram — "Two layers" (keystone).** Pedagogical goal: cement that these are different *scopes*, not competing strategies. Recommend an HTML+CSS `<Figure>` (annotated illustration — the diagram engine doc's pick for color-coded segments with callouts; this isn't a graph or sequence). Shape: two stacked lanes.
- Top lane "Cross-request — `'use cache'`": a single persistent store box, with two request arrows (Request A, Request B, different users) both reading from / writing to the *same* box. Label "survives across requests, shared across users."
- Bottom lane "Per-request — `cache()`": two separate request swim-lanes side by side; inside Request A, three call sites (layout, page, nav) all point to one in-render memo box that's drawn *inside* A's lane; Request B has its own separate memo box. A dotted "discarded when render ends" marker on each memo box. Label "born and dies inside one render, never shared."
- Color convention: reuse the chapter's **cached = blue** for the `'use cache'` store; use a distinct color (green or violet) for the per-request memo so the student reads them as different layers at a glance. (Note for agent: pick one and stay consistent within the figure; the chapter reserves blue for cross-request cached and orange for dynamic/holes — don't reuse orange here.)

Term glosses in this section: `memoization` (cache a function's result and return it on a repeat call with the same input — likely first rigorous use in this chapter; gloss it), and reuse `serializable` only if `'use cache'`'s key is mentioned (it's defined in L3, a one-word `Term` recap is fine).

### Argument identity decides what dedupes

The non-obvious mechanic. This is where the second silent failure lives.

- The rule: `cache()` keys by **argument identity** — value equality for primitives, **reference equality** for objects. Same string twice → one entry. Two separately-constructed objects with identical contents → two entries → the body runs twice.
- Why it matters: the deduplication only happens when callers pass *the same* arguments by this rule. Pass a primitive (a `userId` string, an `orgId`) and dedup is automatic. Pass `{ id, role }` constructed fresh at each call site and you've silently defeated it.
- The senior pattern: **prefer primitive arguments**, or pass a stable reference that's resolved once per render and threaded down. The auth ladder's no-argument shape sidesteps this entirely (it reads `headers()` itself), which is part of why it's shaped that way.
- Contrast the two call shapes side by side.

Component: `CodeVariants` with two tabs — "Dedupes" (primitive arg, e.g. `getOrg(orgId: string)` called twice with the same string → one read) and "Silently doesn't" (object arg constructed fresh at two call sites → two reads). Per-pane mark color: green on the working variant, red/orange on the broken one. First sentence of each variant's prose carries the verdict per the component's convention ("Deduplicates — same string, same entry." / "Runs twice — two object literals are two different references.").

### When to reach for cache() vs 'use cache'

The payoff decision. The reason the lesson exists.

- Re-pose the question sharply: the student now has two caching tools. Which one for a given function?
- The hinge is **one question: does the work depend on request data?**
  - Reads `cookies()`, `headers()`, the resolved session/user, `params`/`searchParams`-derived values, anything per-request → **`cache()`**. It *cannot* be `'use cache'` — that's a build error (recap L3: request APIs are forbidden inside a cached scope), so `cache()` isn't just the better choice, it's the only one.
  - Request-independent — a CMS post by slug, a product catalog, an expensive pure computation over serializable inputs, a fetched third-party API response → **`'use cache'`**. It persists and is shared; `cache()` would re-do the work for every request, wasting the persistence you could have had.
- Name the redundant-but-legal case: putting *both* on one function is allowed but pointless — pick based on the request-data question. (Don't dwell; one sentence.) Fact-checked nuance for the agent: React `cache()` actually operates as an isolated per-render scope *inside* a `'use cache'` boundary too — so "both at once" is coherent, just redundant. Do **not** claim the two are mutually exclusive or that they can't coexist; the teaching frame is "different layers," not "rivals."
- Reinforce the layers framing: this isn't "which is better," it's "which layer does this work belong to."

Component: `StateMachineWalker` (`kind="decision"`) — the chapter's established tool for "which tool do I reach for" (the request-trace doc explicitly routes decision trees here). One root question drives it. Suggested shape:
- Root `Question` "Does this function read request data (cookies, headers, the current user, params)?"
  - Branch "Yes — it touches the request" → `Leaf` verdict **`cache()`** — reason: request-scoped, can't be cross-request cached (build error), dedupe within the render. Names the auth ladder as the canonical example.
  - Branch "No — same result for every user" → second `Question` "Do you want it shared across requests and users?"
    - Branch "Yes, persist it" → `Leaf` verdict **`'use cache'`** — reason: cross-request store, keyed by args, add `cacheLife`/`cacheTag` (L4). CMS/catalog example.
    - Branch "No, just dedupe within this one render" → `Leaf` verdict **`cache()`** — reason: pure but you only care about in-render dedup; the rare honest case (e.g. an expensive pure computation you don't want to persist). Keeps the tree honest rather than forcing a false binary.

Keep the walker to ≤2 question levels — this is a short lesson and the decision is genuinely shallow.

### The request-scoped data layer

The production shape, assembled. Lands the pattern the rest of the course leans on.

- Show `lib/auth.ts` (stripped) exporting the session-read ladder as the canonical use: a small set of `cache()`-wrapped readers — `getCurrentUser()` (returns `User | null`), and *name* `requireUser` / `requireOrgUser` as siblings that build on it (the reflexes for protected pages, full coverage in Unit 8). All three resolve through one `getSession` call, and because that single call is `cache`d, **it runs exactly once per render** no matter how many of the three helpers fire.
- The senior payoff, stated explicitly: every Server Component imports the reader it needs and calls it freely — no prop-drilling the user, no "fetch once at the top and thread it down," no Context. The framework guarantees one read per render. This is the structural answer to the opening problem.
- Tie back: this is the request layer doing exactly its job. The downstream fetchers these readers feed (e.g. a request-independent `getProductCatalog()`) are `'use cache'` — the two layers compose, request-scoped readers above, cross-request fetchers below.

Component: `AnnotatedCode` on the `lib/auth.ts` ladder — one block, stepped highlights: (1) the `cache()` wrapper on the shared `getSession` reader, (2) `getCurrentUser` built on it, (3) the `require*` siblings named as building on the same cached read, (4) the one-read-per-render guarantee called out on the shared call. `AnnotatedCode` is the right pick here because it's one block where attention needs to move across distinct parts. Keep ≤18 lines (component cap); strip Better Auth detail to the teaching core, add a `// Unit 8` marker on the `require*` helpers so the agent knows not to flesh them out.

Note for downstream agent: this section deliberately previews Unit 8's auth ladder shape, matching Code conventions §Authentication. Keep it shaped-but-stripped; do not import or explain Better Auth, the org plugin, redirects, or cookie hardening. The lesson is teaching `cache()`, the ladder is the vehicle.

### What cache() will not do

Tight disambiguation block — close the door on the predictable confusions. Each is one or two lines; these qualify the concept just taught, so they live here, not in a tips dump.

- **Does not persist across requests.** A second user gets their own memo. If you reached for `cache()` expecting cross-request reuse, you wanted `'use cache'`. (The single most common mistake carried over from the old mental model.)
- **Does not invalidate.** No `cacheTag`, no `cacheLife`, nothing to revalidate — the memo is created and destroyed in one render, so invalidation is meaningless. (Pre-empts the student trying to apply L4/L6 tools to it.)
- **Does not cross the server/client boundary.** It's a server-render primitive. Client Components share values through Context (or props), not `cache()`.
- **Is not `useMemo`.** `useMemo` is a client hook living in the React fiber, for client-render work; the React Compiler lesson already covered it and told you to skip the manual reflex. `cache()` is a server-side, module-scope primitive for deduping server work. Different layer, different problem — don't reach for `useMemo` to dedupe a server fetch.

Component: prose, possibly a small `Aside` for the `useMemo` contrast if it reads cleanly. No diagram needed — these are clarifications, not models.

### Practice (exercise placement)

Distribute one understanding-check after the layers/decision content. Guided exercises only — there is **no Next.js server in the iframe**, so no live-coding for this lesson (matches the chapter's established constraint from L3/L4 continuity notes; `cache()`/`'use cache'` semantics can't run in a sandbox). State this constraint for the agent.

- **`Buckets`** (primary): two buckets, "`cache()` — per-request" and "`'use cache'` — cross-request." Items are real function descriptions the student classifies: "reads the current user's session," "fetches the marketing CMS post by slug," "returns the product catalog," "derives a value from `cookies()`," "an expensive pure sort of a serializable list you want shared," "scopes a query by `await params`." This drills the one decision the lesson is built on; classification is exactly the right mechanic. Place it right after **When to reach for cache() vs 'use cache'**.
- Optional **`Dropdowns`** (fenced-code mode) on a tiny snippet: blanks for the import source (`react` not `next/cache`) and the placement (module scope vs inside component), reinforcing the two silent-failure points. Place after **What cache() does** or fold into the Buckets section. Keep it optional — don't pad a short lesson.

Do not build a custom exercise; the pre-built `Buckets` + `Dropdowns` cover the assessable surface cleanly.

### External resources (optional, end)

One or two `ExternalResource` cards: React `cache` reference (react.dev) and, if a current Next.js page distinguishes `cache()` from `'use cache'`, that page. URLs need fact-check (step 6).

---

## Terms to gloss (`Term` / `CodeTooltips`)

- `memoization` (`Term`, prose) — first rigorous use in chapter; "store a function's result and return it on a repeat call with the same input."
- `cache` (`CodeTooltips`, on the canonical block) — "React primitive: memoizes an async function for the duration of one server render."
- `headers()` (`CodeTooltips`, on the canonical block) — "Per-request API (full syntax in the async-request-APIs lesson). Reading it is request-dependent, which is exactly why this function can't be `'use cache'`." Double duty: defers syntax + seeds the rationale.
- `serializable` (`Term`, one-word recap) — only if `'use cache'`'s key composition is restated; defined fully in L3.
- `request-scoped` (`Term`) — "lives only for one server render of one request, then discarded." Used throughout; gloss on first appearance.

Be sparing — this is a short lesson; over-glossing fragments it.

---

## Scope

**Prerequisites (recap in one line each, do not re-teach):**

- `'use cache'` directive — three placements, serializable args, compiler cache key, request APIs forbidden inside a cached scope (L3, this chapter). The corrected closure model from L3 applies: outer-scope variables *are* captured into the key — do **not** restate the old "closures forbidden" error.
- Server Components compose without auto-threading props; they run on the server (ch 030). The reason the duplicate-read problem exists.
- Async Server Components / `await` in components (ch 030).
- `cacheLife` / `cacheTag` exist as the cross-request freshness+tag controls (L4) — named only to say they do **not** apply to `cache()`.

**Out of scope (owned elsewhere — name and defer, don't teach):**

- The `'use cache'` directive itself, in any depth — **L3**.
- `cacheLife`, `cacheTag`, preset profiles, custom profiles — **L4**.
- The invalidation surface: `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` — **L6**. `cache()` has no invalidation, so this lesson only needs to say "not applicable."
- Async request API **syntax** — how to actually read `params`, `searchParams`, `cookies()`, `headers()`, the Promise shape, `React.use()` unwrap — **L7**. This lesson uses `headers()` as a known opaque call (one tooltip) and defers the mechanics.
- Better Auth: the `auth` instance, session config, cookie hardening, `getSession` internals, the org plugin, redirects in `require*` — **Unit 8**. The auth ladder is shown shaped-but-stripped as the vehicle for `cache()`, not taught.
- `useMemo` / `useCallback` / React Compiler memoization — **Chapter 024 / Hooks lesson**. Named once as the client-side "not this."
- Database access patterns, query optimization, `QueryClient` per-request (which also uses `cache()`, Code conventions §TanStack) — **Unit 5 / later**. Don't pull TanStack in; it's a different audience for the same primitive and would dilute the focus.
- Client-side state sharing (Context) — named once as "not this for server work," not taught.

**Deliberate divergences from Code conventions (note for downstream agents):**

- The auth ladder is shown **stripped** of Better Auth specifics for teaching focus — this is intentional staging, the full shape lands in Unit 8 per §Authentication.
- `getCurrentUser` is shown with no arguments (reads `headers()` itself), matching §Authentication. This is also the cleanest illustration of "no-argument shape sidesteps argument-identity pitfalls" — pedagogically convenient and production-correct simultaneously.
