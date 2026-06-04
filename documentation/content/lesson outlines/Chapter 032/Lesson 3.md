# Lesson outline — Chapter 032, Lesson 3

## Lesson title

- **Title:** The `use cache` directive
- **Sidebar label:** The use cache directive

---

## Lesson framing

This is the **center-of-gravity lesson** of the chapter. L1 named `'use cache'` as the opt-in and told the student "its full anatomy is the lesson after next." L2 treated it as an opaque "this belongs in the shell" marker and again deferred the anatomy here. This lesson pays off both debts: it is the first time `'use cache'` gets a body, a cache key, and rules. Everything after it (L4 lifetimes/tags, L5 `cache()`, L6 invalidation) hangs off the anatomy taught here.

Conclusions from brainstorming that shape the whole lesson:

- **The student can already write the components.** They wrote async Server Components (030) and wrapped slow reads in `<Suspense>` (031). What they cannot yet do is turn one of those components into a *cacheable* one and reason about *what gets stored under what key*. Lead with that gap, not with syntax. The senior question: "I have a Server Component that fetches a CMS post — same content for every user. How do I store its render output across requests, and what exactly is the key?"
- **One directive, three placements, one set of semantics.** The single most important structural idea is that file-level, component-level, and function-level `'use cache'` are *the same directive at three scopes* — the student picks the scope by *what they want stored*. Build the lesson around this trichotomy; it is the mental model the student should leave with.
- **The cache key is the hard part, and the official model corrects a common misconception.** The chapter outline (and most blog posts) say "cached functions cannot capture closure variables." That is **wrong** per the official v16 docs and must NOT be taught. The truth: outer-scope variables a cached function references are **automatically captured and bound as arguments**, becoming part of the cache key. What is forbidden is (a) request-time APIs (`cookies()`/`headers()`/`searchParams`) and (b) non-serializable captured values. Teach the *correct* model: a cached function is keyed by `build id + function id + all its serializable inputs (arguments AND captured closure vars)`. This is a place to deliberately diverge from the chapter outline — flag it loudly for downstream agents.
- **Serialization is the contract, and it is asymmetric.** Arguments use the stricter RSC (server→) serialization; return values use the looser client serialization. Practical upshot the student must internalize: *you can return JSX but you cannot accept JSX as a normal argument* — JSX/children/Server Actions cross only as **pass-through** (you don't introspect them). This pass-through pattern is what makes a cached shell wrap dynamic children, which directly explains the PPR shape from L2. The chapter outline missed pass-through entirely; it is load-bearing and must be taught.
- **Minimize cognitive load via staged complexity.** Build the model in layers: (1) the simplest case — a function-level `'use cache'` on a data fetcher with no arguments; (2) add arguments → distinct entries per argument; (3) reveal that closure vars are captured too; (4) the serialization contract and its asymmetry; (5) pass-through for the non-serializable cases; (6) the three placements as scope choices; (7) what `use cache` is *not* (the boundary against L5's `cache()`). Each layer adds one idea.
- **Connect relentlessly to prior chapters.** Serialization is "the same boundary rule as the server/client wire from 030" (Code conventions §Module boundaries even lists the same allowed/rejected types). The three directives `'use client'`/`'use server'`/`'use cache'` are one family (L1 already said this). The pass-through pattern is *why* L2's cached shell could wrap a dynamic hole.
- **Stay in the established domain and palette.** Continue the dashboard/invoices/CMS domain from L1–L2. Keep the cached=blue, dynamic=orange color convention. Keep `'use cache'` single-quoted. Keep cached examples as real bodies *now* (the staging that kept them opaque in L1–L2 ends here — this is the lesson that opens the box), but defer `cacheLife`/`cacheTag` to L4 (name that a cached function *also* takes a lifetime and tags, show a one-line teaser, don't teach them).
- **This lesson earns a hands-on exercise.** It is the syntax-and-rules center of the chapter; a `ReactCoding`-style live exercise is impractical (no Next.js server / build in the iframe), so the right tools are: a `Buckets` "serializable vs not" drill, a `Dropdowns` fill-in for placing the directive correctly, and a `CodeReview` plant where the student catches a request-API-in-cache bug and a non-serializable-arg bug. Prefer guided exercises over sandboxes throughout.
- **Mental model to leave with:** *A `'use cache'` function is a pure-of-request function whose output is memoized across requests under a key built from its code identity plus every serializable input it touches (args and captured vars). You choose page / component / function scope by what you want stored. Request data never goes in; it comes in as an argument or stays outside in a dynamic sibling.*

Estimated student time per the chapter outline: 50–65 minutes. This is the longest teaching lesson of the chapter; budget the depth on the cache-key and serialization sections.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. Show a tiny Server Component that fetches a marketing CMS post (`getPost(slug)` → render) — the canonical "same for every user, refreshed when an editor publishes" case. State plainly: the student can already *write* this component; what they can't yet do is **cache its output across requests**, and the question that matters is *what gets stored, and under what key*. Recall the two IOUs: L1 named `'use cache'` and promised its anatomy "the lesson after next"; L2 used it as an opaque "shell" marker. This is that lesson. Preview the payoff: by the end the student can add `'use cache'` to a page, a component, or a function; predict what the cache key will be; and know exactly which values are allowed to cross in and out. Keep it to ~2 short paragraphs, warm and terse (per pedagogical guidelines).

Use a plain `Code` block for the opening `getPost` component (simple, no annotation needed yet).

### One directive, three placements

Teach the structural spine first: `'use cache'` is **one directive with three placements**, and the placement decides **what gets stored**.

- **File level** — `'use cache'` as the first line of a module caches every export. Constraint to state explicitly (from official docs): *all exports must be async functions*. Used for a `page.tsx`/`layout.tsx` (cache the whole route segment) or a data-layer module of fetchers.
- **Component level** — the directive as the first line of an async component body caches that component's render output; its serialized props are part of the key.
- **Function level** — the directive as the first line of an async function body caches that function's return value (the data-fetcher case).

Convey this with a single **`CodeVariants`** (three tabs: "File", "Component", "Function"), each tab showing the minimal correct placement and a one-sentence "stores: …" framing in the prose. Use the exact official syntax shapes:
- File: `'use cache'` at top, then `export default async function Page() { … }`.
- Component: `export async function Bookings() { 'use cache'; … }`.
- Function: `export async function getData() { 'use cache'; const data = await fetch(…); return data; }`.

Reinforcement: the directive sits in the **same family** as `'use client'` and `'use server'` (callback to L1) — a string-literal directive at the top of a scope that changes that scope's semantics. Mark deliberately for downstream agents: **show real bodies now** (the L1/L2 staging that kept these opaque ends here).

Pedagogical note: do NOT front-load `cacheLife`/`cacheTag` here. One inline sentence — "a real cached function usually also declares how long it lives and how it's tagged; that's the next lesson" — is enough.

Reconciliation note for downstream agents: the official *getting-started* guide frames `use cache` as **two** uses — "data-level" (cache a fetcher) and "UI-level" (cache a component/page). That is the same thing as our three *placements* viewed by intent: function-level = data-level; component-level and file-level = UI-level. Teach the **three placements** (they are the syntactic reality, confirmed in the directive reference) but you may borrow the data-vs-UI *framing* as the "why you'd choose each." Don't present them as conflicting.

After this section, a short **`Dropdowns`** (fenced-code mode) exercise: give a stripped fetcher and a component with `___` where the directive goes, plus one decoy line, and have the student pick the correct placement line and the `'use cache'` token. Goal: cement *where* the directive physically goes (top of body / top of file). Keep it to 2–3 blanks.

### The cache key: what makes two calls share an entry

This is the conceptual heart of the lesson — budget the most depth here. Build it in stages to keep cognitive load low.

**Stage 1 — no arguments.** A `'use cache'` fetcher with no arguments produces exactly one entry: first call computes and stores, every later call across requests and users serves the stored value. Establish the baseline: *cached output is computed once and reused.*

**Stage 2 — arguments split the cache.** Add a parameter (`getPost(slug)`). Now the compiler keys the entry by the **serialized arguments**: `getPost('pricing')` and `getPost('about')` are two separate entries; two callers passing `'pricing'` share one. The student writes no key by hand — *distinct arguments produce distinct entries automatically.*

**Stage 3 — the full key, and the closure correction.** Reveal what actually goes into the key, quoting the official model. The key is a serialized hash of:
1. **Build ID** — changes every build, so a new deploy invalidates all entries.
2. **Function ID** — a hash of the function's location and signature, so editing the function's code invalidates its entries.
3. **Serializable arguments** — the function's arguments / a component's props.
4. (dev-only HMR hash — mention in one clause, not load-bearing.)

Then the **critical correction** (flag for downstream agents — diverge from the chapter outline here): when a cached function **references a variable from an outer scope, that variable is automatically captured and bound as an argument**, so it *also* becomes part of the cache key. Closures are **not** rejected — they are folded into the key. The thing that *is* forbidden is request-time data and non-serializable captures (next sections). State the senior mental model that falls out: *think of a cached function as keyed by its code identity plus every serializable input it touches, whether you passed it as an argument or it reached out and grabbed it from the enclosing scope.*

Components to use:
- An **`AnnotatedCode`** walking the official closure example (the `Component({ userId })` → inner `getData(filter)` with `'use cache'`, where the cache key includes **both** `userId` from closure and `filter` from argument). Steps: (1) the outer component receives `userId`; (2) the inner cached fetcher takes `filter`; (3) highlight the directive — color blue; (4) highlight both `userId` and `filter` — explain *both* are in the key, one captured, one passed. This single example is the clearest possible vehicle for the corrected closure model. Cap at ~8 lines, `maxLines={10}`.
- A **`Figure`** (custom HTML+CSS, wrapped in `<Figure>`) visualizing the key as a composed hash: four stacked "ingredient" chips (build id, function id, args, captured vars) feeding into one "→ cache key → stored entry" box, with two example calls (`getPost('pricing')`, `getPost('about')`) fanning out to two distinct entries. Pedagogical goal: make "the key is a *composition of inputs*" a picture, and make "different inputs → different entries" visible. Keep horizontal, compact, capped height. Reuse the cached=blue tint for the entry boxes.

A `Term` gloss on **cache key** the first time it's used ("The identity under which a cached result is stored and looked up; two calls with the same key share one stored value.").

Consequence to state plainly (it lands a watch-out inside the teaching, per the no-tips-section rule): non-deterministic operations inside a cached scope — `Date.now()`, `Math.random()`, `crypto.randomUUID()` — get **frozen at build**, computed once and reused for everyone. Cache Components makes you handle this on purpose, and the official model gives exactly two choices: (a) if you want a fresh value *per request*, defer it — `await connection()` (from L1) before the operation and wrap the component in `<Suspense>` so it streams as a hole; (b) if a shared, occasionally-refreshed value is fine, leave it in the cached scope and accept that all users see the same value until revalidation. Frame as "closure capture is a feature until you accidentally capture something that should change — then you pick: defer it or share it." Keep this to the framing; the revalidation timing itself is L4.

End the section with a **`MultipleChoice`** (single-correct): given a cached `getInvoices(orgId)` called twice with the same `orgId` in two different requests, "how many times does the underlying query run, and why?" Correct: once (or per revalidation) — same key from same argument → shared entry. Distractors cover "twice, caches are per-request" (that's `cache()`, L5 — flag the confusion) and "twice, different requests never share" (wrong — cross-request reuse is the whole point).

### What can cross the boundary: the serialization contract

Teach serialization as **the contract that makes caching safe**, and explicitly tie it to the server/client wire from chapter 030 (the student already knows this rule for a different reason).

Core idea: a cached function's **arguments and return value must be serializable**, because the cache stores and reloads them across process boundaries. Then the **asymmetry** (this is the subtle, senior part):

- **Arguments** use **RSC / Server Component serialization** (the stricter one).
- **Return values** use **Client Component serialization** (the looser one).
- Practical consequence: *you can **return** JSX, but you cannot **accept** JSX as a normal argument.*

Allowed (both directions): primitives (`string`, `number`, `boolean`, `null`, `undefined`), plain objects, arrays, `Date`, `Map`, `Set`, typed arrays / `ArrayBuffer`. Return values additionally allow JSX elements.

Rejected: class instances, functions, `Symbol`, `WeakMap`/`WeakSet`, **`URL` instances** (call this one out — it surprises people). Connect to Code conventions §Module boundaries, which lists the same allowed/rejected set for the RSC wire and notes `Temporal.*` is rejected → encode as ISO strings at the boundary (mention this as the project's convention so the student isn't surprised later).

Components:
- A **`CodeTooltips`** on a single cached function signature, glossing the inferred-serializability of each parameter type inline (e.g., tooltip on `Date` = "serializable — crosses the cache boundary", tooltip on a class-typed param = "rejected — class instances aren't serializable"). This keeps the type/serializability mapping in the code instead of a wall of prose.
- The canonical "this fails the build" contrast via **`CodeVariants`** (two tabs, red/green): Tab "Rejected" — a `'use cache'` component taking a `UserClass` instance as a prop (red highlight on the param), prose first sentence: "Build error — class instances aren't serializable, so the cache can't store this argument." Tab "Fixed" — take the serializable fields (`{ id, name }`) instead (green highlight), prose: "Pass the plain data the function actually needs; the key is built from serializable values only." Use the official `UserCard`/`UserProfile` shapes adapted to the invoices domain (e.g., a `customer` class instance vs. its plain fields).

Then a **`Buckets`** (two-column) exercise — "Can it cross the cache boundary?" Bucket A "Serializable (allowed)", Bucket B "Rejected (build error)". Items: `string`, `{ id, total }` plain object, `Date`, `Map`, an array of plain rows → A; a `Drizzle db` client instance, a logger instance, a `URL`, a bare `() => void` callback → B. Per-item feedback restates the rule. This is the highest-value drill in the lesson — the serializable/non-serializable judgment is exactly what students get wrong in production.

### Pass-through: how a cached shell wraps dynamic children

This section makes the PPR shape from L2 finally *click* at the code level, and it is missing from the chapter outline — treat it as a required addition.

The puzzle to pose: "If a cached component can't accept JSX as an argument, how did L2's cached `Header`/shell wrap a *dynamic* `<OrgInvoices />` child?" The answer is **pass-through**: a cached component may receive non-serializable values (JSX `children`, compositional slots, even Server Actions) **as long as it does not introspect them** — it just places them in its returned tree. They are *not* part of the cache key and are *not* cached; they flow through untouched.

Teach with the official interleaving example, adapted to the domain: a cached `CachedShell({ header, children })` that renders `{header}` and `{children}` around its own cached content, called with a dynamic child. Use **`AnnotatedCode`**:
1. highlight the `'use cache'` directive (blue);
2. highlight the `children` / slot props — "non-serializable, but only passed through, never read";
3. highlight the cached body's own `await` (its real cached work);
4. highlight the call site passing a dynamic `<OrgInvoices />` as the child — "this child stays dynamic; the shell stays cached."

Land the payoff explicitly: **this is exactly the L2 shell-with-a-hole, now visible as code.** The cached shell is `'use cache'`; the dynamic child is passed through and lives in its own `<Suspense>`. One sentence connecting back: "the rule that 'dynamic can't nest inside cached' from L1 is satisfied precisely because the dynamic child is passed *through*, not rendered *inside* the cached scope."

Note for downstream agents: keep this example honest — the child must be passed as a prop/`children`, and the cached body must *not* reference it except to place it in JSX. Add a one-line caution (inline, not a section): calling a passed-through Server Action *inside* the cached body, or reading the children's content, breaks the pattern.

### Where the cached value actually lives

Short, grounding section so the student knows caching is real storage with real tradeoffs (and to seed L4's lifetime discussion).

- Default backend: **in-memory LRU** on the server. The student writes the directive; the runtime supplies the store.
- **Deployment-dependent behavior** (state plainly, from official docs): on **serverless** (e.g., Vercel default functions), in-memory entries typically *don't persist across requests* — build-time caching works, but runtime reuse is per-instance; on **self-hosted / persistent** runtimes, entries persist across requests. This matters: "I added `'use cache'` and it still recomputes on every request" is usually a serverless-instance reality, not a bug.
- Name once, don't teach: **`'use cache: remote'`** for a dedicated cross-instance handler (Redis/KV), and the self-hosted `cacheHandlers` config. One `Term` gloss on each at most; these are pointers, not curriculum.
- Also name once (do not teach): **`'use cache: private'`** is the variant that *is* allowed to read request APIs (cookies/headers/searchParams) and caches **per-user, in the browser's memory only** (never stored on the server, never prerendered) — for personalized content you genuinely can't refactor to argument-passing. Frame it as "the rarely-needed escape hatch; the default discipline in this course is *pass request data as arguments*, and personalized-but-fresh content streams as a dynamic hole." Get the gloss right (browser-only, per-user) — do not describe it as compliance-only or as server-side caching.

No diagram needed; a tight `Aside` (note) capturing the serverless-vs-self-hosted persistence split is the right weight. The senior takeaway: *caching is storage; storage has a budget; cache the smallest useful slice.*

### Composing a cached data layer

Bring it together into the **senior pattern** the student should actually adopt — this is the "what should I do with this" section.

- The pattern: every read is a small `'use cache'` async function in the data layer; components that need data import the fetcher; the cache is **automatic and shared** across every caller passing the same arguments. A cached component can call cached functions; entries compose.
- Show the migration framing the student will recognize in old code: pre-16, `fetch()` was cached by default and you opted *out* with `{ cache: 'no-store' }`; in 16 under Cache Components, the way you cache a fetch is to **wrap it in a `'use cache'` function**. (Verified against official docs — frame as "the explicit-by-default story applied to data fetching," consistent with L1's inversion. Do not overstate the `fetch` default mechanics; the durable rule is "wrap to cache.")
- One inline forward-pointer sentence: these fetchers will grow a `cacheLife` and `cacheTag` next lesson — show a single commented teaser line inside one fetcher (`// cacheLife + cacheTag → next lesson`) and stop there.

Use a **`CodeVariants`** before/after (two tabs, `del`/`ins`): "Inline uncached fetch" (a component doing a bare `await fetch(...)` that re-runs every render) → "Extracted cached fetcher" (the fetch moved into a `getPost(slug)` with `'use cache'`, imported by the component). First-sentence framing per tab. This mirrors the §Caching conventions shape without yet introducing tags/lifetimes.

Optionally close the section with a **`CodeReview`** (single file, two plants) as the capstone check — the student reviews a PR adding caching to an invoices fetcher and must catch:
1. a `'use cache'` function that calls `cookies()` inside it (kernel: "request-time API inside a cached scope — read it outside and pass the value as an argument"); and
2. a cached function taking the `db` client instance as an argument (kernel: "non-serializable argument — class/SDK instances can't be part of the cache key").
This drill validates the two most common real-world mistakes the lesson exists to prevent. If `CodeReview`'s Ollama dependency is a concern for the build environment, the fallback "lines graded" mode still works; keep the plants on exact lines.

### What `use cache` is not

Close by drawing the boundaries that prevent misuse and set up the next two lessons. Keep tight — this is a clarifying section, not new machinery.

- **Not request-scoped.** `'use cache'` persists *across* requests and users. The per-request memoization tool (for work that *must* read request data, like `getCurrentUser()`) is React's `cache()` — **next-but-one lesson**. Name the distinction crisply so the student has the hook; do not teach `cache()` here. (This is the single most common confusion; the L5 outline depends on the contrast being seeded here.)
- **Not a hint or heuristic.** It is a contract enforced at **build** (purity, serializability) — violations are build errors, not silent slow paths. Callback to L1/L2's build-error theme.
- **Not free.** Every entry costs storage and is subject to eviction; cache the smallest useful slice.
- **Not for client code.** `'use cache'` is server-only; it has no meaning in a `'use client'` module.
- **Not the same as `'use cache: private'` or `'use cache: remote'`** — named above, not the default.

A compact **`TrueFalse`** round (4–5 statements) is the right closing check here: e.g., "`'use cache'` deduplicates two calls *within the same request* but forgets them across requests" (false — that's `cache()`); "A cached function can read `cookies()` if it awaits it" (false); "Returning JSX from a cached component is allowed" (true); "Editing a cached function's body invalidates its cache entries" (true — function id is in the key); "A `URL` argument to a cached function builds fine" (false). Per-statement review reinforces the lesson's spine.

### What's next (closing)

Two-sentence wrap: the student now has the anatomy — placements, key, serialization, pass-through, storage. Next lesson adds the two pieces every real cached function carries: **how long it lives (`cacheLife`)** and **how it's named for invalidation (`cacheTag`)**. Then per-request `cache()`, then invalidation after a mutation.

Close with one or two **`ExternalResource`** cards (Next.js brand icon `simple-icons:nextdotjs`): the official `use cache` directive reference, and the "Caching" getting-started guide. (Verified live URLs in fact-check.)

---

## Diagrams and components summary (for downstream agents)

- **Intro:** `Code` (plain) — the `getPost` opener.
- **Three placements:** `CodeVariants` (3 tabs: File/Component/Function) + `Dropdowns` (placement drill).
- **Cache key:** `AnnotatedCode` (closure example, the corrected model) + custom HTML/CSS `Figure` (key-as-composition) + `MultipleChoice` (cross-request reuse count). `Term`: cache key.
- **Serialization:** `CodeTooltips` (per-type serializability) + `CodeVariants` red/green (class instance rejected → plain fields) + `Buckets` (serializable vs rejected).
- **Pass-through:** `AnnotatedCode` (interleaving example, ties to L2).
- **Storage:** `Aside` (note) on serverless-vs-self-hosted persistence. `Term`: `'use cache: remote'`, `'use cache: private'` (one-line glosses).
- **Data layer:** `CodeVariants` before/after + optional `CodeReview` capstone (2 plants).
- **What it's not:** `TrueFalse` round.
- **Closing:** `ExternalResource` cards.

Palette: cached = blue, dynamic = orange (chapter-wide). Directive spelled `'use cache'` (single quotes), matching `'use client'`/`'use server'`.

---

## Terms for `Term` / `CodeTooltips` glosses

Strategic, lesson-supporting only:

- **cache key** (prose `Term`) — the identity under which a result is stored/looked up.
- **serializable** (prose `Term`, first use) — can be encoded to a transferable form and reconstructed; the requirement for crossing the cache (and RSC) boundary. Tie to the 030 boundary.
- **pass-through** (prose `Term`) — a non-serializable value (children, Server Action) accepted by a cached component but never introspected, so it isn't part of the key.
- **LRU** (prose `Term` or `CodeTooltips`) — least-recently-used in-memory eviction; the default cache backend.
- **`'use cache: private'`** and **`'use cache: remote'`** — one-line `Term` glosses where named; explicitly "not taught here."
- Inside `CodeTooltips` on the signature: per-parameter "serializable — crosses" vs "rejected — doesn't serialize" microcopy.

Do NOT gloss terms already owned/glossed by L1–L2 (`'use cache'` itself, `cacheComponents`, Partial Prerendering, request-time API, CDN, dynamic bailout) — assume the student met them.

---

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- Dynamic-by-default + caching-by-opt-in, `cacheComponents: true`, the closed set of request-time APIs, the cached-can't-contain-dynamic rule, `connection()` (all L1).
- PPR shell/holes, the Suspense seam, "this belongs in the shell" reading of `'use cache'` (L2).
- Async Server Components, the server/client serialization boundary and its allowed/rejected types (chapter 030).
- `<Suspense>` and streaming (chapter 031).
- The `'use client'`/`'use server'` directive family (prior units).

**This lesson does NOT cover (defer, with the named owner):**
- `cacheLife` — the three lifetimes (stale/revalidate/expire), preset profiles, custom profiles, call-site rules. **Lesson 4.** (Name only that a cached function *also* declares a lifetime; show a commented teaser; do not teach numbers or presets. The default profile's actual values — stale 5min / revalidate 15min / never-expire — belong to L4; at most say "there's a sensible default lifetime" without the numbers.)
- `cacheTag` — naming, entity/record conventions, multiple/computed tags. **Lesson 4.**
- React `cache()` and per-request memoization. **Lesson 5.** (Seed the contrast only — "request-scoped, not cross-request" — so L5 can build on it.)
- The invalidation surface: `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`. **Lesson 6.** (The `updateTag('products')` call appears only incidentally inside the official examples if reused; if shown, label it "→ lesson 6" and don't explain it.)
- Async request API *syntax* — awaiting `params`/`searchParams`/`cookies()`/`headers()`, `React.use()` unwrap in Client Components, legacy segment config migration. **Lesson 7.** (This lesson says request-time APIs are *forbidden inside* cached scopes and must be passed as arguments; it does not teach how to *read* them.)
- `generateStaticParams` / seeding the cache for known dynamic segments at build. **Lesson 8 of chapter 034** (the chapter-outline reference). Name once at most when discussing page-level caching of `[slug]` routes; do not teach.
- Self-hosted cache handler implementation, `'use cache: remote'`/`'use cache: private'` internals, `cacheHandlers` config authoring. **Named, not taught** (pointers only).
- TanStack Query's client-side cache and the two-system invalidation discipline. **Out of chapter** (Unit 4 conventions); do not mention.
