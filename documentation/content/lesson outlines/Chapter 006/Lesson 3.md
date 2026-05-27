# Lesson 3 — Top-level await vs. lazy init

## Title and sidebar

- **Title (h1):** Top-level await vs. lazy init
- **Sidebar label:** Top-level await vs. lazy init

The chapter-outline title fits — it names both branches of the decision tree the lesson teaches. Keep it.

## Lesson framing

This lesson is a **Decision archetype** sitting on top of the depth-first / live-binding graph model lesson 2 just installed. The senior question is "module needs to do work before exporting — which pattern?" Two answers exist: top-level `await` (the module's evaluation completes only after a promise resolves; every upstream consumer becomes implicitly async) or a lazy getter (a function that does the work on first call and caches the result). The lesson teaches the trade-off, names the canonical sites for each pattern, and ends with the student able to look at a new boundary file and pick the right shape without reading docs.

Pedagogical conclusions from brainstorm:

- **Cognitive-load order.** First the *what* (top-level await is a graph-level change), then the *what it costs* (the cascade), then the *alternative* (lazy init), then the *decision rule*. The cascade picture must precede the rule because the rule is meaningless without understanding the cost it avoids.
- **Don't pretend `env.ts` uses top-level await.** The canonical t3-env shape is synchronous. It is the canonical "right shape for top-level work" precisely *because* it doesn't need `await` — cheap, mandatory, deterministic. Forcing it into the top-level-await example would be a lie. Treat it as the synchronous reference point that anchors the "cheap and mandatory" branch.
- **The `let cached: Db | null = null` pattern is load-bearing.** Lesson 2 already promised this comes back ("module-level singleton — `let cached: Db | null = null` at module scope really is one slot for the whole app"). Lesson 3 must deliver it as the canonical `getDb()` shape, complete with the `import 'server-only'` first line. This is the lesson's main payload, not a footnote.
- **Frame both patterns through the graph.** Lesson 1 introduced "every import is one of four shapes drawing an edge"; lesson 2 walked the graph depth-first and made the edges either eager or deferred. Lesson 3 names what each module *does at the moment its node is evaluated* — sync, await-blocking, or pure-export-of-getter. This is the third leg of the chapter's graph mental model: edges (lesson 1), traversal (lesson 2), per-node behavior (this one).
- **Where beginners go wrong.** Two pain points to address head-on. First, reaching for top-level await for a database connection because "the SDK constructor returns a promise" — the right reach is the lazy getter, and the lesson needs a worked rewrite showing the same database setup in both shapes. Second, the "every consumer pays" cost is invisible until you measure the cold start or notice a page render is gated on a remote call — the cascading-async diagram is the visualization that makes this concrete.
- **Forward-link generously, recap minimally.** Drizzle wiring details, Stripe SDK initialization, and connection-pool tuning all belong to later units. This lesson teaches the *decision shape* (the `getDb()` pattern), not the Drizzle specifics. Mention Unit 5 and Unit 11 once each and move on.
- **Decision archetype assets.** A Mermaid decision-tree flowchart for the picker (three questions, two leaves) and a Mermaid flowchart for the cascading-async cost. Both small, both horizontal-LR per the diagram constraints. Plus the side-by-side `env.ts` / `getDb()` canonical shapes as code blocks (not CodeVariants — they aren't variants of the same code) and a `Buckets` exercise as the recognition recap.
- **No quiz / wrap.** Chapter quiz is lesson 5. End on the `Buckets` plus a short `ScriptCoding` rewrite that grades "no work happens at import time" — the student transforms an eager `db.ts` into the lazy shape and the test imports the module and asserts no connection was opened.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs, total ~5 sentences.

- Open with the **scenario as the senior question**: a module needs to do work before it can export. Validate env vars; open a database connection; load a signing key from a secret manager. Two patterns are available. Name them — top-level `await` and lazy init via a cached getter — and promise the lesson teaches *when each earns its weight*.
- Re-anchor the chapter's graph framing in one sentence: lesson 2 taught how the runtime walks the graph; this lesson teaches what each node *does* at evaluation time, and how that choice ripples back up to every consumer above it. This makes the chapter's three-lesson arc (edges → traversal → per-node work) visible without restating it.

No bullet list or motivation section — Decision archetype opens with the question, not with framing.

### Top-level await: the graph-level change

The first technical beat. Goal: install the mental model that adding `await` at the top of a leaf module is a graph-level mutation, not a local code change.

Content:

- **What it is, in one sentence.** ES modules permit `await` at the top level outside any `async` function (ES2022; supported everywhere the course's stack runs — Node 24 LTS, Next.js 16, modern browsers). The runtime guarantees the module's exports are observable only after the awaited promise resolves.
- **The graph-level consequence, named twice.** A module with a top-level `await` is itself a deferred node: the runtime will not declare it evaluated until the promise settles. Every module that statically imports it inherits that wait — they cannot finish their own top-level code until this module finishes. This propagates **upward** along static-import edges to the entry. Use the term "implicitly async" once and `<Term>` it.
- **One short snippet.** A 4-line module showing the form:

  ```ts
  // feature-flags.ts
  import 'server-only';

  const flags = await loadFlagsFromService();

  export const isFeatureEnabled = (key: string) => flags[key] === true;
  ```

  Code component: plain Expressive Code (`Code`). No fenced highlighting needed — the `await` on a `const` at module scope is the load-bearing token, and the comment above it is enough. Add `'server-only'` on the first line so the discipline from lesson 2 stays visible (this is a server-only seam). The prose around the snippet should explicitly note that `loadFlagsFromService` is an illustrative stub — the lesson teaches the *shape*, not a real feature-flag SDK.

- **When the wait belongs there.** Three properties make top-level await the right reach: (a) the work is **cheap** (sub-second, deterministic), (b) the result is **mandatory for every consumer** (no consumer of `feature-flags.ts` can function without resolved flags), (c) the value is **needed at module load**, not lazily on first use. Name the three properties as a tight inline list; the decision rule consolidates them later.

No diagram in this section yet. The diagram earns its keep one section down when the cost lands.

### The cascade: how one `await` propagates upward

This section makes the cost visible. The diagram is the load-bearing asset.

Content:

- **One sentence framing.** "If `feature-flags.ts` has a top-level `await`, every module that imports it implicitly awaits too, and so on up the chain to the page render."
- **Mermaid flowchart, LR direction.** Wrapped in `<Figure>` per the diagram standard. Four nodes from entry on the left to the awaiting leaf on the right; arrows point from importer to imported, matching lesson 2's diagram convention. Mark the leaf with the explicit `await` and tint the three upstream nodes as "implicitly awaiting." Concretely:

  ```mermaid
  flowchart LR
    page["page.tsx<br/>⏳ awaits"] --> dashboard["dashboard.tsx<br/>⏳ awaits"]
    dashboard --> flagsHook["use-flags.ts<br/>⏳ awaits"]
    flagsHook --> flags["feature-flags.ts<br/>⏳ await (explicit)"]

    classDef leaf fill:#fde68a,stroke:#b45309,color:#111
    classDef upstream fill:#fef3c7,stroke:#a16207,color:#111
    class flags leaf
    class page,dashboard,flagsHook upstream
  ```

  Caption: "A top-level `await` on a leaf node propagates a wait to every importer above it; the page cannot render until the chain completes." Note for the writing agent: in Mermaid, `<br/>` works inside node text; the `classDef` colors above are illustrative — pick palette tokens that read in both light and dark Starlight themes (see `documentation/diagrams/mermaid.md` for the `themeCSS` escape hatch if needed).

- **The render-blocker watch-out.** Two short paragraphs. First: in a Next.js Server Component, the page render is upstream of every module it imports — so a slow top-level `await` in any leaf delays the whole render. Second: this is *fine* if the wait is the env validation that should fail-closed anyway; it is *catastrophic* if the wait is a 2-second cross-region call to a feature-flag service. Forward link in one sentence — Suspense / streaming is the right tool for a per-component async fetch (Unit 4 / chapter 030 owns the depth); top-level await is the wrong tool when the wait is long or per-request.
- **The senior cut, stated plainly.** Top-level await is for **fast, deterministic, mandatory** work. Anything else belongs in a function call.

`<Term>` candidates introduced in this section:
- *implicitly async* — "An upstream module that doesn't write `await` itself but waits because a statically-imported descendant does."
- *render-blocker* — "Work that gates the first paint of a server-rendered page because the page cannot return JSX until the work completes."

### `env.ts`: cheap, mandatory, synchronous — the reference shape

A short section that anchors the "cheap and mandatory" branch of the decision tree by showing a real example that *doesn't* need `await` at all. This both prevents the student from misreading `env.ts` as a top-level-await site and shows that the question "top-level await or lazy init?" doesn't always have a non-trivial answer — sometimes the right shape is synchronous module-load work.

Content:

- **The canonical t3-env shape.** Show a typical `env.ts` using `@t3-oss/env-nextjs` + Zod 4. The student has not built this file yet (it lands in chapter 037 of Unit 5), so the snippet is illustrative — frame it as "the shape every project's `env.ts` lands on."

  ```ts
  // env.ts
  import 'server-only';

  import { createEnv } from '@t3-oss/env-nextjs';
  import { z } from 'zod';

  export const env = createEnv({
    server: {
      DATABASE_URL: z.url(),
      STRIPE_SECRET_KEY: z.string().min(1),
    },
    client: {
      NEXT_PUBLIC_APP_URL: z.url(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
  });
  ```

  Code component: plain Expressive Code. Notes for the writing agent: (a) Zod 4 idiom — `z.url()` is the top-level form; the legacy `z.string().url()` chain is the Zod-3 shape and should not appear; (b) `runtimeEnv` is destructured by hand on purpose, because t3-env documents this as the bundler-safe way to keep Next.js from stripping unused vars at build time (don't "simplify" it to `runtimeEnv: process.env`).
  
  Add a one-line annotation in prose noting that `createEnv` fires **synchronously** at module evaluation — there is no `await`, because Zod parsing is sync and `process.env` is already populated by the time any module runs.

- **Why this is the right shape.** Three sentences. The validation is **cheap** (microseconds of Zod parsing). It is **mandatory** — every consumer that reads a secret depends on it. It is **deterministic** — same inputs, same result, no I/O. The fact that it doesn't need `await` does not mean it isn't doing top-level work — `createEnv` *is* the top-level work. The lesson's category for it is "synchronous mandatory module-load work," which is the same category as top-level await minus the I/O.
- **Fail-closed in one sentence.** If `DATABASE_URL` is missing, `createEnv` throws at module load and `env.ts`'s evaluation errors out — propagating upward through the graph and crashing the process before a single request lands (lesson 2 named this short-circuit behavior). Re-anchors lesson 2's "errors short-circuit upward" rule on a real production site.

No diagram, no exercise here — the section is short and acts as the synchronous-branch anchor for the decision tree two sections down.

### Lazy init: the alternative for expensive or conditional work

The second technical beat. Symmetric weight to the top-level-await section. Goal: install the canonical `getDb()` shape and the module-level singleton pattern.

Content:

- **The trade.** A lazy getter exports a function (`getDb()`, `getStripe()`) that does the setup work the first time it is called and caches the result in a module-scoped variable. Consequence: importing the module costs **nothing** — no connection opened, no SDK instantiated — until something actually calls the function. The cost moves from "every consumer pays at import time" to "the first consumer to call pays, and everyone after reuses the cache."
- **The canonical `getDb()` shape.** This is the lesson's payload snippet. Use `AnnotatedCode` to walk the student through it part by part, because there are four discrete moves to point at and the student must read each one as a deliberate choice. Single code block, four `<AnnotatedStep>`s.

  Code (the `code` prop on `<AnnotatedCode>`, language `ts`):

  ```ts
  import 'server-only';

  import { drizzle } from 'drizzle-orm/postgres-js';
  import postgres from 'postgres';

  import { env } from '@/env';

  let cached: ReturnType<typeof drizzle> | null = null;

  export const getDb = () => {
    if (cached) return cached;
    const client = postgres(env.DATABASE_URL);
    cached = drizzle({ client, casing: 'snake_case' });
    return cached;
  };
  ```

  Steps:
  1. `meta="{1}"` colored `green`: `'server-only'` as the first line — the seam-enforcement rule from lesson 2 (the `getDb` factory must never reach a client bundle).
  2. ``meta={`{7} "let cached" "null"`}`` colored `blue`: the module-scoped cache. The `let` is deliberate — lesson 2 named module-scoped `let` as "one slot for the whole app," and that's exactly what this is.
  3. `meta="{9-13}"` colored `orange`: the getter body — return the cache if set, otherwise build it, store it, return it. Single source of truth for "do I have a connection yet."
  4. `meta="{11-12}"` colored `violet`: where the actual cost is paid — the `postgres(...)` call opens the pool, the `drizzle({...})` call wires the ORM. These run **on first call**, never at import.

  This is exactly the kind of multi-part single block `AnnotatedCode` is designed for; the code is ~13 lines and four annotations would make a `CodeVariants` block redundant.

- **The implementation comment.** Drizzle's actual project shape (chapter 037 / Unit 5) wires this through `db/index.ts` and exports a more sophisticated client (schema-aware return type, `tenantDb(orgId)` factory for row-level tenancy). The lesson teaches the **decision shape**, not the Drizzle-specific surface. One sentence forward-linking, then move on. Note for the writing agent: the snippet uses `ReturnType<typeof drizzle>` for the cache type on purpose — the student hasn't authored a schema yet, and pulling one in would derail the focus. Don't "improve" this by importing a schema.
- **The wider rule.** "Stateful singletons that need setup are exposed through getters, not as top-level exports." Name the rule once. This is the architectural takeaway that generalizes the `getDb()` example to `getStripe()`, `getRedis()`, `getS3Client()`, every SDK adapter in the course's `lib/` folder.
- **Serverless cold-starts in one paragraph.** In a serverless platform (Vercel functions, Cloudflare Workers), each instance has its own module evaluation and its own `cached` slot. A cold start pays the connection cost; warm requests on the same instance reuse the cached client. Forward link to Unit 5 (connection-pool sizing for serverless Postgres) in one sentence and stop. The student needs to know the cache is per-instance, not per-region or per-deployment, so they don't expect it to behave like a Redis cache.

`<Term>` candidates introduced in this section:
- *module-level singleton* — "A value cached in a module-scoped variable, exposed through a getter, that lives for the lifetime of the module's evaluation. One slot per process or per serverless instance."
- *cold start* — "The first request handled by a freshly-instantiated serverless function instance. Pays setup costs that warm instances reuse from cached state."

### The decision rule

The fork that resolves the trade-off. This is the load-bearing artifact of the lesson — the picture and table the student copy-pastes into a notebook.

Content:

- **The rule, stated as two bullets, before the diagram.** State the rule first; the diagram visualizes it.
  - **Top-level await** when the work is **cheap, mandatory for every consumer, and async by necessity**. (If the work is sync — like `env.ts` — there's no `await` to argue about; the same category applies.)
  - **Lazy init via a cached getter** when the work is **expensive, conditional, or only needed by a subset of consumers**.

- **Decision-tree diagram (Mermaid `flowchart LR`).** Three questions, two leaves, no cycles. Wrapped in `<Figure>` with a caption naming the rule. Suggested shape:

  ```mermaid
  flowchart LR
    start([New boundary file does setup work]) --> q1{Expensive?<br/>I/O or large deps}
    q1 -- "Yes" --> lazy[Lazy init<br/>getDb-style getter]
    q1 -- "No" --> q2{Conditional?<br/>env-gated or optional}
    q2 -- "Yes" --> lazy
    q2 -- "No" --> q3{Mandatory for<br/>every consumer?}
    q3 -- "Yes" --> tla[Top-level await<br/>or sync at module load]
    q3 -- "No" --> lazy
  ```

  Caption: "Three questions pick the shape. Any 'expensive' or 'conditional' answer routes to a lazy getter; only cheap, deterministic, universally-required work earns top-level work." Note for the writing agent: literal `(` `)` `;` in Mermaid node labels can confuse the parser (see `documentation/diagrams/mermaid.md`) — keep the labels as shown above without parens.

- **Two wrong reaches, named explicitly.** This is where the rule becomes muscle memory.
  - **Top-level await for a database connection.** Every consumer of the module pays the connection cost at import — including tests that never query, scripts that never read data, build-time imports during page generation. The right reach is `getDb()`.
  - **Lazy init for env validation.** Hiding `createEnv` behind a `getEnv()` getter defers the failure: the bug doesn't surface until the first request. Env validation is the canonical fail-closed-at-startup site precisely *because* it runs synchronously at module load.

- **`Buckets` exercise.** Two-column, eight items. This is the recognition recap.

  Buckets:
  - **`top-level-or-sync`** — labeled "Top-level await (or sync at load)" with description "Cheap, mandatory, deterministic."
  - **`lazy`** — labeled "Lazy init via cached getter" with description "Expensive, conditional, or partial."

  Items (8):
  - "Env-var validation with Zod" → `top-level-or-sync`
  - "Postgres connection pool" → `lazy`
  - "Feature-flag config fetched from a remote service at startup, used by every page" → `top-level-or-sync` (cheap + mandatory; remote fetch but small payload and every consumer needs the flags)
  - "Stripe SDK instance with API key" → `lazy`
  - "Redis cache client" → `lazy`
  - "Signing-key load from a secret manager (used by every request)" → `top-level-or-sync`
  - "S3 client (used only by the file-upload route)" → `lazy`
  - "PostHog analytics client (initialized only when `POSTHOG_KEY` is set)" → `lazy`

  Instructions: "Sort each setup task into the shape that earns its weight."

### Rewriting an eager `db.ts` into the lazy shape

A short `ScriptCoding` exercise that closes the lesson. The student takes a wrongly-eager `db.ts` (which does `const db = drizzle(postgres(env.DATABASE_URL))` at the top, opening a connection on import) and rewrites it to the `getDb()` shape. Tests verify that importing the module does not open a connection — only calling `getDb()` does.

This is the lesson's act of practice; the `Buckets` checks recognition, the rewrite checks production.

Configuration:

- `runner="sandpack"` because the file uses TS imports and the vanilla runner doesn't parse TS.
- **Instructions**: "Rewrite `db.ts` so the connection is only opened on the first call to `getDb()`. The tests verify nothing happens at import time and that repeated calls return the same instance."
- **Starter code (single editor file)**:
  ```ts
  // Stand-ins for the real drizzle/postgres APIs so the test runner
  // doesn't need a real database. Treat them as already-imported.
  let postgresCalls = 0;
  let drizzleCalls = 0;
  const postgres = (_url: string) => {
    postgresCalls += 1;
    return { __client: true };
  };
  const drizzle = (_config: { client: unknown }) => {
    drizzleCalls += 1;
    return { __db: true };
  };

  // The eager shape — rewrite below this line.
  const client = postgres('postgres://localhost/app');
  export const db = drizzle({ client });

  // TODO: replace the two lines above with a lazy getDb() that:
  //   1. caches the drizzle instance in a module-scoped variable
  //   2. opens the connection only on first call
  //   3. returns the same instance on subsequent calls

  export const __counts = () => ({ postgresCalls, drizzleCalls });
  ```
- **Tests** (jest-flavored, run after the student edits):
  - `test('no connection at import time')`: reads `__counts()` immediately and asserts `postgresCalls === 0 && drizzleCalls === 0`.
  - `test('first call opens the connection')`: calls `getDb()` and asserts both counters are `1`.
  - `test('subsequent calls reuse the cached client')`: calls `getDb()` three more times and asserts both counters are still `1`.
  - `test('getDb returns the cached instance')`: asserts `getDb() === getDb()`.

The fake `postgres` / `drizzle` are inlined in the editor so the student sees them as part of the exercise. No custom component needed. Note for the writing agent: the starter intentionally exports `db` (the eager mistake the student deletes); after the rewrite, the file exports `getDb` instead. The tests import `getDb` and `__counts` from the student's module.

### External resources

`CardGrid` with two `ExternalResource` cards. Stay tight.

- **MDN — Top-level await** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#top_level_await`). Canonical reference for the JavaScript feature.
- **t3-env — Next.js docs** (`https://env.t3.gg/docs/nextjs`). Forward reference for the `env.ts` shape the student will author in Unit 5.

Skip the Next.js Server Components doc here — lesson 2 already linked it, and the cascade story is general (it's not Next-specific).

## Components, diagrams, exercises — summary roll-up

- **Code blocks.** Plain `Code` for short isolated snippets (the `feature-flags.ts` example, the `env.ts` shape). `AnnotatedCode` (with four steps) for the canonical `getDb()` shape — this is the lesson's central code asset and needs stepped attention. No `CodeVariants` is needed; the env vs. lazy contrast is structural enough to land as two separate prose sections each with one Code block. (A `CodeVariants` would invite a false equivalence; the patterns aren't variants of the same code, they're different shapes for different problems.)
- **Diagrams.** Two Mermaid diagrams, both `flowchart LR` per the diagrams-INDEX preference. (1) The cascade — leaf with `await`, three upstream nodes inheriting the wait, all wrapped in `<Figure>`. (2) The decision tree — three questions, two leaves, the picker.
- **Exercises.** One `Buckets` (eight items, two buckets) as the recognition recap, one `ScriptCoding` (sandpack runner) as the production rewrite.
- **Tooltips (`<Term>`).** *implicitly async*, *render-blocker*, *module-level singleton*, *cold start*. Skip terms that lesson 2 already introduced (`fail-closed`, `tree-shaking`, `'server-only'`, `code splitting`). Keep tooltip density modest — four new terms across the whole lesson is enough.
- **No video embed.** No 5-minute YouTube clip exists that lands top-level-await-vs-lazy-init at the right altitude; skip rather than fish for filler.

## Scope

What this lesson does **not** cover:

- **`async`/`await` mechanics, microtasks, the event loop.** Chapter 007 lesson 3 owns the language semantics — promise lifecycle, `await` as a yield point, the rejection-vs-throw distinction. This lesson treats `await` as already-known syntax and teaches only its module-graph consequence.
- **The four import shapes, evaluation order, live bindings, `'use client'` placement, `'server-only'` enforcement at depth.** Owned by lessons 1 and 2 of this chapter. Re-anchor `'server-only'` as the first line of `env.ts` and `getDb()` (one sentence each) — do not re-derive what it does.
- **Drizzle wiring at depth.** Connection pool sizing, schema imports, the `tenantDb(orgId)` factory, relations, casing config. Unit 5 / chapter 037 owns the production shape. The `getDb()` here is the **decision shape**, not the final wiring. Forward link once.
- **Stripe SDK initialization at depth.** Unit 11's billing chapter owns the full `getStripe()` and `lib/billing/` carve-out. Mention `getStripe()` once as a member of the same pattern family; no code.
- **`@t3-oss/env-nextjs` at depth.** Chapter 037 lesson 2 owns the full env-validation pattern. Show the canonical shape once for context, do not teach the package's API surface.
- **Hot-reload / module-reset behavior in Next.js dev.** Tangential and Next-version-specific. Skip.
- **`declare module` and third-party type augmentation.** Lesson 4 of this chapter owns it.
- **Suspense, streaming, async Server Components.** Forward-linked once in the cascade section as the right tool when top-level await is the wrong tool; no depth.
- **Worker threads, child processes, edge-runtime constraints.** Out of scope.

## Code conventions alignment

Skimming `Code conventions.md` for the relevant sections (TypeScript, Function form, Imports, Module boundaries, Data layer):

- Arrow functions bound to `const` for the `getDb` getter (matches §Function form).
- Named exports for `env` and `getDb` (no defaults — `env.ts` and `db.ts` are not framework-named files).
- `import 'server-only';` as the first line of any module touching secrets or DB (matches §Module boundaries — and lesson 2's payload).
- `let` for the module-scoped cache (`let cached: ... | null = null`) is the **deliberate** carve-out from "default to `const`" — the cache mutates, by design. Conventions don't forbid it; note in prose that the `let` is intentional for the single-slot mutation. The course's existing `db.ts` shape uses this exact pattern.
- Three-group import order: external (`drizzle-orm`, `postgres`) → `@/` aliases (`@/env`) → relative (none in the snippet). Side-effecting `'server-only'` lives in its own pre-group, alone on the first line.
- Zod 4 idiom: `z.url()` (top-level form), not the legacy `z.string().url()` chain.
- t3-env `runtimeEnv` is destructured by hand on purpose — bundler-safe vs. `runtimeEnv: process.env`.

Pedagogical divergences from conventions:

- The `getDb()` snippet uses `ReturnType<typeof drizzle>` as the cache type instead of importing a schema-aware type. This is deliberate — the lesson teaches the shape, not the typing, and dragging in a schema type would derail the focus.
- The `feature-flags.ts` snippet uses a fictional `loadFlagsFromService()` without importing it. Intentional minimal-example shape; the focus is the `await` token at module scope.
- The `ScriptCoding` exercise inlines fake `postgres` / `drizzle` functions in the same file as the student's code. This is intentional — the test runner doesn't need a real database, and the fakes are visible learning surface (the student sees that the same module exports both the fakes and the rewritten getter).

## Estimated student time

30 to 35 minutes (matches the chapter outline estimate).
