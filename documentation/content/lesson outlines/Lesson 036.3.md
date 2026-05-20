# Lesson 036.3 — The `use cache` directive

## Lesson framing

This is the center-of-gravity lesson for Chapter 036. Lesson 036.1 set the "dynamic-by-default" mental model; 036.2 showed PPR as the rendering shape. This lesson teaches the directive that does the actual opting-in: `'use cache'`.

Pedagogical thesis: the student already understands *that* caching is opt-in per function. This lesson teaches the *contract* — what changes about a function once you add `'use cache'` at the top. The senior reach is recognizing that a cached function is no longer a normal function: it has a generated cache key, must be async, must serialize its inputs and outputs, and cannot reach for request-scoped data. Get the contract right and the rest of the chapter (lifetimes, tags, invalidation) clicks into place.

Cognitive-load plan: introduce the directive first with the simplest placement (the function-level fetcher), then add the cache-key model, then add serialization rules, then introduce the other two placements (component, route via layout+page). Closure capture is taught explicitly because the official docs treat closed-over variables as automatic cache-key inputs (not as forbidden references) — this is the senior-grade detail the student needs to internalize. The pass-through pattern for `children` and Server Actions is named because it's how cached chrome composes with dynamic content and shows up immediately in 036.2's worked example.

Common beginner mistakes to inoculate against:
- Reaching for `'use cache'` on a function that reads `cookies()` or `headers()` (they belong outside the cached scope, passed in as serializable arguments).
- Forgetting that file-level `'use cache'` requires every export to be async.
- Caching a function that closes over `Date.now()` or a database client at module scope and expecting fresh behavior.
- Thinking `'use cache'` replaces `React.cache()` — it doesn't; 036.5 pins this.
- Trying to whole-route-cache by adding `'use cache'` only to the page; the layout needs it too.

Anchoring decisions:
- The lesson is anchored in a single running example — a marketing-CMS post fetcher — so each placement scope (function, component, route) can be illustrated against the same problem.
- Two diagrams: (1) cache-key composition (build ID + function ID + serialized args + closure-captured vars), and (2) a two-axis matrix of placement scopes (function/component/route) cross-referenced with what gets stored.
- One live exercise: a `ReactCoding` drill where the student fixes three broken `'use cache'` functions (one reads `cookies()`, one closes over a class instance, one is synchronous). The fixes are mechanical once the contract is internalized.
- One `Buckets` exercise classifying values as "serializable arg," "serializable return only," or "rejected" to drill the contract before the student writes more code.

The lesson explicitly does *not* cover lifetimes (`cacheLife`) or tags (`cacheTag`) — those are 036.4 and live next door. The directive is the focus; freshness policy is the follow-up.

---

## Lesson sections

### Section 1: Introduction — the marketing post problem

Open with the senior question: a Server Component fetches a marketing CMS post (e.g., `/blog/[slug]`). The same content for every user, only changes when the editor publishes. Hitting the CMS on every request is wasteful, but in Next.js 16 every route is dynamic by default (callback to 036.1). What does opt-in caching look like, syntactically and semantically?

Name `'use cache'` as the answer: a React directive that marks an async function, an async component, or a whole module as cacheable, with the compiler generating the key automatically.

Set expectations:
- This lesson teaches the directive itself: placements, the cache key, the serialization contract, what closures do.
- Freshness windows (`cacheLife`) and named invalidation handles (`cacheTag`) are next lesson.

Keep this section to ~150 words.

### Section 2: The simplest placement — a cached fetcher function

Start with function-level `'use cache'`, the easiest scope to reason about.

Show the marketing post fetcher with and without the directive using **`CodeVariants`** (two tabs, "Uncached" vs. "Cached"):

```ts
// Uncached
export async function getPost(slug: string) {
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.json();
}

// Cached
export async function getPost(slug: string) {
  'use cache';
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.json();
}
```

Walk the student through the consequences of adding the directive:
- The function must be `async` (sync functions are rejected — they're cheap to re-run, caching them is pointless).
- Two callers with the same `slug` get the same cached entry.
- Two callers with different `slug` get separate entries (the compiler keys by argument).
- The entry survives across requests, across users.

Mention briefly here that `fetch()` in Next.js 16 defaults to *no* caching (unlike pre-16, which defaulted to opt-in caching). Reaching for `'use cache'` is now the explicit opt-in.

Use a small **`Aside` (tip)** to call out: the directive goes at the top of the function *body*, not as a decorator or comment annotation. It must be the first statement.

### Section 3: The cache key — what the compiler does

This is the lesson's center. Use **`AnnotatedCode`** to walk a small `getPostBySlugForLocale(slug, locale)` example through the cache-key construction.

The cache key is composed of (in order of importance):
1. **Build ID** — every deploy invalidates everything by default. Mention this once; it's why staging caches don't leak into production.
2. **Function ID** — a secure hash of the function's source and location. Changing the function body invalidates its entries.
3. **Serialized arguments** — primitives, plain objects, arrays, `Date`, `Map`, `Set`. The compiler stringifies these into the key.
4. **Closure-captured variables** — variables the function reads from its enclosing scope. *These are automatically captured and become part of the key, just like arguments.*

Stress point #4 because the student's intuition is that closures are forbidden. They're not — they're folded into the key. Show a small example where a `userId` is read from closure and `filter` is an argument, and both end up in the key (this is the exact pattern from the official Next.js docs).

Add an **`Aside` (caution)** for the senior reach: closure capture only works if the captured value is serializable. A database client or a logger instance captured from closure fails the build. The fix is to pass these as arguments (deferred to next section) or import them inside the function body.

**Diagram — cache key composition.** Use an **`<ArrowDiagram>` inside a `<Figure>`** showing four boxes (Build ID, Function ID, Arguments, Closure Vars) feeding into one "Cache Key" box, with a downstream "Cache Store" box. The pedagogical goal: the student sees the key as a deterministic composition, not magic. Horizontal layout, single arrow flow.

### Section 4: The serialization contract

This section drills the rules. Use **`TabbedContent`** with three tabs: "Arguments," "Return values," "Closure captures." Each tab carries a short rules list and a small code snippet.

**Arguments (most restrictive — RSC serialization).**
- Allowed: primitives (`string`, `number`, `boolean`, `null`, `undefined`), plain objects, arrays, `Date`, `Map`, `Set`, typed arrays, `ArrayBuffer`.
- Rejected: class instances, functions, symbols, `WeakMap`/`WeakSet`, `URL` instances.
- React elements allowed as *pass-through only* (see Section 6).

**Return values (slightly looser — RCC serialization).**
- Same as arguments plus JSX elements.
- This is what enables caching at the component level (a cached component returns JSX, which serializes).

**Closure captures.**
- Same rules as arguments — captured values must serialize.
- A captured `console.log` reference: rejected. A captured const string: fine.

After the tabs, add a **`Buckets` exercise** with ~8 items the student sorts into "Valid arg," "Return-only," "Rejected." Items to include:
- A `string` (valid arg)
- A `Date` (valid arg)
- A `Map<string, number>` (valid arg)
- A class instance `new User(id)` (rejected)
- A `URL` instance (rejected)
- A JSX element `<h1>hi</h1>` (return-only / pass-through)
- A `Promise<string>` (rejected as arg unless via React's pass-through pattern — keep this simple here, just mark rejected)
- A function reference (rejected as direct arg)

Grading: classify each into the right bucket; explanation reveals on completion.

Add a brief **`Aside` (note)** naming the migration story: pre-16, `fetch()` defaulted to caching with `cache: 'force-cache'`. In 16, the default is no-cache; opt in by wrapping the call in `'use cache'`. Student will see the old pattern in tutorials.

### Section 5: The three placements

Show the same problem (marketing posts) solved at three different scopes. Use **`CodeVariants`** with three tabs labeled "Function," "Component," "Route."

**Tab 1 — Function-level.**
The cached fetcher from Section 2. Each call with a given `slug` returns one stored value. Used by any Server Component on any route. The default placement for a data-layer function.

**Tab 2 — Component-level.**
```tsx
export async function PostCard({ slug }: { slug: string }) {
  'use cache';
  const post = await fetch(`https://cms.example.com/posts/${slug}`).then(r => r.json());
  return <article><h2>{post.title}</h2><p>{post.excerpt}</p></article>;
}
```
The component's entire render output (the JSX tree) is cached per `slug`. The student picks this when they want to skip both the data fetch and the render work. Note: the component's children render at build into the cached HTML; children that need request data must be passed as `children` and rendered outside the cached boundary (Section 6).

**Tab 3 — Route-level (page + layout).**
Show that whole-route caching requires `'use cache'` at the top of *both* the layout and the page. This is a Next.js 16 specific rule that beginners get wrong. Each segment is its own cache entry.

```tsx
// app/blog/[slug]/layout.tsx
'use cache';
export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className="prose">{children}</div>;
}

// app/blog/[slug]/page.tsx
'use cache';
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetch(`https://cms.example.com/posts/${slug}`).then(r => r.json());
  return <article>{/* ... */}</article>;
}
```

Add an **`Aside` (caution)** explaining: file-level `'use cache'` requires every export in that file to be async. A sync helper export in the same file is a build error.

**Decision diagram — when to use which placement.** Use a **Mermaid `flowchart LR`** decision tree inside a `<Figure>`:
- "What do you want cached?" →
  - "A network call / DB query" → Function-level
  - "A subtree's render output (chrome, widget)" → Component-level
  - "An entire URL that doesn't change per user" → Route-level (page + layout)

Pedagogical goal: the student leaves with a clear mental rule for placement choice, not a vague "any of these works."

### Section 6: Composition — cached parents with dynamic children

This is the senior pattern that PPR (036.2) relies on. A cached component can hold a dynamic child *as long as that child arrives via `children` or another compositional slot* and isn't read inside the cached function.

Show the worked example with **`AnnotatedCode`**:

```tsx
async function CachedShell({ header, children }: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  'use cache';
  const promo = await getPromoBanner();
  return (
    <div>
      {header}
      <PromoStrip data={promo} />
      {children}
    </div>
  );
}

export default async function Page() {
  return (
    <CachedShell header={<h1>Home</h1>}>
      <Suspense fallback={<TableSkeleton />}>
        <DynamicTable />
      </Suspense>
    </CachedShell>
  );
}
```

Step the student through:
1. `CachedShell` is `'use cache'` — its render output is stored.
2. `header` and `children` come in as props but the cached function *doesn't introspect them*; it just renders them in place. This is the pass-through pattern.
3. The cached HTML contains markers where `header` and `children` slot in. At request time, dynamic content fills those slots.
4. This is the mechanism that makes PPR work: cached chrome + dynamic content under the same component.

Add an **`Aside` (caution)**: pass-through breaks the moment the cached function *reads* `children.props` or iterates over them. The build catches this; the student doesn't have to remember a rule, just write the obvious code.

Briefly name (one sentence) that Server Actions can also pass through cached components the same way — useful for forms wrapped in cached layouts. Cross-reference Chapter 047 for the full Server Action surface.

### Section 7: The closure capture rules — what you can and can't reach for

Reinforce the closure rules with a focused subsection. Use **`AnnotatedCode`** to show three patterns side by side (different highlights step by step):

```ts
// Pattern A — primitive captured from module scope: fine
const CMS_BASE = 'https://cms.example.com';

export async function getPost(slug: string) {
  'use cache';
  return fetch(`${CMS_BASE}/posts/${slug}`).then(r => r.json());
}

// Pattern B — class instance captured: rejected at build
import { db } from './db'; // db is a Drizzle client instance

export async function getOrgFlag(orgId: string) {
  'use cache';
  return db.flags.findFirst({ where: { orgId } }); // build error
}

// Pattern C — fix: import inside the function body
export async function getOrgFlag(orgId: string) {
  'use cache';
  const { db } = await import('./db');
  return db.flags.findFirst({ where: { orgId } });
}
```

Step 1 highlights Pattern A — shows the legal closure capture (a serializable constant).
Step 2 highlights Pattern B — shows the build error pattern and pointer.
Step 3 highlights Pattern C — shows the senior fix (dynamic import) and notes the second fix (pass the client as an argument, though it serializes only for primitive identifiers).

Tag the senior reach: cached functions are *parameterized on data inputs*, not on infrastructure handles. Infra (DB client, logger, telemetry) gets imported inside the function or accessed through a side-effect-free wrapper.

### Section 8: What `'use cache'` cannot reach for — runtime APIs

The negative space. Cached functions cannot directly call `cookies()`, `headers()`, `searchParams`, or `connection()` from inside. The framework rejects these at build with a clear pointer.

The pattern is: read the runtime API *outside* the cached scope and pass the resulting value (which must be serializable) as an argument.

Show with **`CodeVariants`** (two tabs, "Wrong" and "Right"):

```tsx
// Wrong — cookies() inside use cache
async function getDashboardData() {
  'use cache';
  const cookieStore = await cookies(); // build error
  const session = cookieStore.get('session');
  return db.dashboards.findFor(session?.value);
}

// Right — read cookies outside, pass value in
async function getDashboardData(sessionToken: string | undefined) {
  'use cache';
  return db.dashboards.findFor(sessionToken);
}

export default async function Page() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  return <Dashboard data={await getDashboardData(sessionToken)} />;
}
```

Pedagogical point: the contract is the boundary. The student writes a function that's pure of request, and they call it from a place that has access to request data.

Briefly mention (one paragraph) the existence of two escape-hatch directive variants — `'use cache: private'` (for compliance cases where the function genuinely cannot accept the runtime value as a parameter) and `'use cache: remote'` (for cases where in-memory cache is insufficient and the platform supplies a remote handler). Don't teach them; just name them so the student recognizes them in advanced material. One `<ExternalResource>` link can point at the official docs page.

### Section 9: Where the cached value lives

Brief operational note. Walk the student through where their cached entries actually go:
- **In development**: in-memory (`.next/cache`) and reset on dev server restart.
- **In production**: in-memory on the Node server by default. On Vercel and similar platforms, the platform's distributed cache (edge-replicated). Self-hosted Next.js can plug in a custom cache handler (Redis, etc.) via `cacheHandlers` in `next.config.ts`.
- **Cache entries persist across deploys unless the build ID changes their key.** Mention this once because the student will wonder.

Add a small **`Aside` (note)** about the debug env var: `NEXT_PRIVATE_DEBUG_CACHE=1` prefixes cached function logs with "Cache" so the student can see hit/miss behavior during development.

### Section 10: Practice — fix the cached functions

Live coding exercise to drill the contract. Use **`ReactCoding`** in tests mode (or `ScriptCoding` if no React rendering is needed — prefer `ScriptCoding` here since the focus is on the function contract, not rendering).

Provide three pre-written cached functions that fail the contract. The student fixes each:

1. **Reads `cookies()` inside `'use cache'`.** Fix: lift the read above, pass the value in as a string argument.
2. **Closes over a database client (class instance).** Fix: dynamic import inside the function body.
3. **Is a synchronous function with `'use cache'`.** Fix: mark it `async` (or remove the directive if no I/O happens).

Grading criteria per task:
- Function signature is async.
- No `cookies()`/`headers()`/`searchParams` calls inside the cached body.
- No class-instance closure captures (verified by checking that the captured identifiers are only primitives or pure module-level constants).
- Function still produces the expected output for given inputs.

Each task carries a short rubric phrase visible to the student so they understand what passed/failed.

This exercise is the lesson's payoff — by the end the student has written, with their own hands, the three classes of fix for the three classes of contract violation.

### Section 11: Recap and what comes next

Quick recap as a bullet list:
- `'use cache'` marks an async function, an async component, or a whole module as cacheable.
- The compiler generates the key from build ID + function ID + serialized arguments + closure captures.
- Arguments and return values must serialize; closure captures must serialize.
- Runtime APIs (`cookies()`, `headers()`, `searchParams`) belong outside the cached scope.
- Three placements: function (a fetcher), component (a render subtree), route (page + layout together).
- Pass-through composition lets cached parents hold dynamic children via `children`.

Forward link (one sentence each):
- 036.4 adds the freshness window (`cacheLife`) and the named handle (`cacheTag`).
- 036.5 adds the per-request memoization primitive (`React.cache`) and contrasts it with `'use cache'`.
- 036.6 closes the loop with the invalidation surface.

Add **`<ExternalResource>`** card linking to the official `'use cache'` reference page so the student has the canonical source for follow-up reading.

---

## Scope

**This lesson teaches:**
- The `'use cache'` directive syntax at three scopes (function, component, route via page+layout).
- The cache-key composition (build ID, function ID, arguments, closure captures).
- The serialization contract for arguments, return values, and closures.
- The pass-through pattern for `children` and other compositional slots.
- Why runtime APIs cannot live inside cached scopes, and the lift-then-pass-in pattern.
- The async-only requirement and the file-level-all-exports-async rule.

**This lesson does NOT teach (covered elsewhere):**
- `cacheLife` and the three-number freshness contract — Lesson 036.4.
- `cacheTag` and the named-handle pattern — Lesson 036.4.
- `React.cache()` per-request memoization — Lesson 036.5.
- `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` — Lesson 036.6.
- Deprecated route segment config (`export const dynamic`, `revalidate`, `fetchCache`) — Lesson 036.7.
- Async request APIs in full (`params`, `searchParams`, `cookies()`, `headers()`, `connection()`) — Lesson 036.7 (named here only in the "what cached functions can't reach" subsection).
- `generateStaticParams` for SSG seeding — Lesson 038.8 (named once when whole-route caching is shown).
- Server Actions in full — Chapter 047 (named once in the pass-through subsection).
- Self-hosted cache handlers and `'use cache: remote'`/`'use cache: private'` — named once with a docs link, not taught.

**Prerequisite concepts (briefly re-anchored, not re-taught):**
- `cacheComponents: true` flag from 036.1 (one sentence).
- Server vs. Client Component boundary from 034.x (mentioned in serialization tab — server-component serialization is what arguments use).
- Suspense boundaries from 035.x (one sentence in the composition section).
- The new dynamic-by-default model from 036.1 (the lesson's opening connects back to it).

Sources:
- [Directives: use cache | Next.js docs](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [next.config.js: cacheComponents | Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Getting Started: Caching | Next.js docs](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js 16 blog post](https://nextjs.org/blog/next-16)
