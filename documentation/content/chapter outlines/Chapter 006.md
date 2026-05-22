# Chapter 006 — Modules as a graph

## Chapter framing

Chapter 005 closed the type-modeling story — discriminated unions, branded IDs, derived types, the utility-type toolbox, and constrained generics. The student can author the TypeScript the rest of the course writes. This chapter zooms out one level: every file the student writes is a node in a **directed module graph** that the runtime evaluates in a specific order, with live bindings between nodes, and a hard rule that some nodes (server-only) must never be reachable from other nodes (client bundles). The chapter teaches the graph as a first-class object — the four import/export shapes that form its edges, the evaluation order and live-binding semantics that make `let`-exports work and circular cycles tricky, the `"use client"` boundary and `server-only`/`client-only` packages that enforce the bundle split, the top-level-await vs. lazy-init call that decides where setup costs land, and the `declare module` pattern that ties third-party shapes (Better Auth's `Session`, Drizzle relations) to the project's branded types at the source.

Threads that must run through every lesson:

- **Modules are a graph, not a list of files.** The student leaves with a mental model of nodes (modules) and edges (imports), evaluated depth-first, with cycles as a real hazard. Every lesson reinforces the graph framing — even the syntax lesson names which edge each import form draws.
- **`verbatimModuleSyntax` is the floor.** From lesson 4 of chapter 024 and lesson 8 of chapter 004, `import type` is mandatory for type-only imports. The chapter operates under this rule; it does not re-teach the flag but names the failure mode at the moment it applies (the side-effect import erased by tree-shaking, the circular type import that deadlocks).
- **The client bundle is sacred.** Every server-only seam (`env.ts`'s secrets, the Drizzle client, `cookies()`, the auth handler) must not be reachable from a `"use client"` file. The chapter installs the structural enforcement (`server-only`, `client-only`, the directive boundary) as the senior reflex, not a discipline. Forward links to Unit chapter 030 (server/client boundary at depth) thread through lesson 2 of chapter 006.
- **Setup costs decide between top-level await and lazy init.** Top-level await is the right reach for cheap, mandatory startup validation (the `env.ts` parse). A lazy `getDb()` getter is the right reach for expensive or conditional setup that should not block module evaluation. The chapter names the threshold once and applies it across the SaaS stack.
- **`declare module` is the seam, not the workaround.** When a third-party type doesn't carry the project's branded IDs or extra session fields, the senior move is to augment the published interface in a dedicated `.d.ts` file — not to cast at every call site. The chapter installs the pattern with three canonical 2026 sites (Better Auth `Session`, Drizzle relation inference, `next-intl` typed messages).
- **No build-tool deep dives.** Turbopack, esbuild, and SWC own the actual graph walk and bundling; the chapter teaches the **semantics every bundler agrees on**, not bundler internals. The student should leave able to predict whether a snippet ships server code to the browser, not able to recite Turbopack's chunk-split algorithm.

The student finishes the chapter able to read any file in the codebase as a node in a graph with predictable edges, write the four import/export shapes with the correct type-only discipline, dynamically import a heavy component to defer its bundle, place a `"use client"` directive at the right leaf, decide between top-level await and a lazy getter for a new boundary file, and augment a third-party module to carry a branded ID through its session type. Chapter 007 (async semantics) and Unit 4 (App Router server/client model) land on this floor.

---

## Lesson 1 — The four import-export shapes

Teaches the named, default, side-effecting, and dynamic export forms with their matching import surface, the type-only import discipline under `verbatimModuleSyntax`, and the bare-specifier resolution algorithm that picks the file behind every `import 'pkg'`.

Topics to cover:

- The senior question. Every import statement the student writes is one of four shapes, and a senior reads each shape and knows what edge it draws into the graph, what the bundler will do with it, and what the runtime cost is. The lesson installs the recognition vocabulary before any other module concept lands.
- The four shapes, named with the trigger for each.
  - **Named export / named import.** `export const x = ...; export function f() {}; export type T = ...` paired with `import { x, f, type T } from './mod'`. The course default for everything — every utility, every component, every type. Names survive renames at one site, tree-shake cleanly, and read explicitly at the call site.
  - **Default export / default import.** `export default ...` paired with `import X from './mod'`. The senior cut: default exports earn their weight only where the framework demands them — Next.js `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, route handlers' HTTP-method exports (named, not default, but listed for the same framework-owned shape), and a handful of third-party libraries that ship a default. Anywhere else, named exports win. The named-vs-default debate is closed in 2026; the course teaches the cut without re-litigating it.
  - **Side-effecting import.** `import 'pkg'` with no binding — the file runs for its side effects (a polyfill, a CSS injection, a global-state hook registration). Rare and intentional. The two canonical sites: `import 'server-only'` / `import 'client-only'` (taught in lesson 2 of chapter 006 for what they enforce) and global CSS imports in `app/layout.tsx`. Anywhere else, a side-effecting import is a smell.
  - **Dynamic import.** `await import('./mod')` — an `import()` expression that returns a `Promise<Module>`. Different from the three static forms: the edge into the graph is **deferred**. The bundler turns it into a separate chunk, the runtime fetches it on demand. The student should leave knowing this is a value-level expression (it can appear inside a function body, conditionally), unlike the three static forms that live only at the top level.
- The type-only discipline, restated from lesson 8 of chapter 004.
  - **`import type { T } from './mod'`** for type-only imports. Erased at compile time; draws no runtime edge into the graph.
  - **Inline `type` modifier** — `import { foo, type Bar } from './mod'` — mixes a value import and a type import in one statement. The senior reach when one file genuinely needs both; otherwise split into two statements for legibility.
  - **`export type { T }`** for re-exports of type-only symbols. Same rule as imports.
  - The failure mode `verbatimModuleSyntax` prevents, named in one paragraph: a value import that's only used as a type can be erased by the bundler, taking the side-effecting initialization with it. The flag forces the student to be explicit, and the bug class disappears.
- Re-exports, with the two forms.
  - **`export { foo } from './mod'`** — a transparent re-export. The module is still evaluated (the edge is real); the binding becomes available from the re-exporting module. The course's barrel-file rule: re-exports are valid but barrels of unrelated symbols (`./index.ts` re-exporting fifty things) hurt tree-shaking and editor go-to-definition. Named once.
  - **`export * from './mod'`** — re-export everything. Cleaner for a domain module that wants to expose its entire surface, dangerous when two re-exported modules share a name (the compiler refuses the ambiguity). The senior reach is to enumerate; the wildcard is for cases where the surface is intentionally open.
- The named-vs-default closing rule, stated plainly. **Default exports are framework-mandated; everywhere else, named.** Two practical consequences:
  - Renaming a default-exported symbol at one site doesn't propagate (the import-side name is whatever the caller chose); renaming a named export breaks every caller and tooling can update them. Named exports are refactor-safe.
  - The `import X from 'pkg'` form silently widens if the library's default export is `unknown`-typed in older `.d.ts` files; named imports carry their types faithfully. Old story, but still bites in 2026 with legacy CJS interop.
- Bare specifier resolution — the algorithm behind every `import 'pkg'`. The chapter installs this once because every later lesson depends on it.
  - **What "bare" means.** A specifier with no `./`, `../`, or absolute path — `'react'`, `'next/cache'`, `'@/lib/db'`. Three sub-cases.
  - **`'react'` — a package name.** Node walks up `node_modules/` directories from the importing file, finds `react/package.json`, reads its `exports` field, and resolves to the file the package itself names. In 2026, `exports` is the source of truth — `main` is the legacy fallback for packages that haven't published `exports` yet. The senior watch-out: a package with `exports` blocks deep imports the field doesn't list (`import 'react/internal/foo'` fails even if the file is on disk), and this is the desired behavior (it's how libraries communicate their public surface).
  - **`'next/cache'` — a subpath inside a package.** Resolved via the package's `exports` field with the subpath key (`"./cache"` in `next/package.json`). The subpath surface a SaaS engineer reaches for daily: `next/cache`, `next/headers`, `next/navigation`, `next/server`, `zod/v4`. Named here so the student knows what the slash means.
  - **`'@/lib/db'` — a TypeScript path alias.** Not a node_modules lookup at all — resolved against the `paths` field in `tsconfig.json` (lesson 4 of chapter 024). The bundler and `tsc` agree on the resolution because both read the same `tsconfig.json`; runtime tools that don't (raw `node`, `tsx` without project config) fall back to the on-disk path. Named once; the student has the mental model from lesson 4 of chapter 024.
- The `with { type: 'json' }` import attribute. The 2026 way to import JSON modules from ESM — `import config from './config.json' with { type: 'json' }`. The attribute is mandatory in modern Node and required by the V8-runtime spec for security (the runtime validates the MIME type before parsing). The senior reach when reading a static JSON file at module load. The watch-out: the import is synchronous in the source but the runtime materializes it before the module evaluates, so it works in static positions only. Named with one example; the deeper JSON parsing story lives in lesson 1 of chapter 009.

What this lesson does not cover:

- Module evaluation order, live bindings, or circular imports (lesson 2 of chapter 006 owns the graph semantics).
- Dynamic `import()` as a code-splitting tool (lesson 2 of chapter 006 owns the bundling consequence).
- `"use client"`, `'server-only'`, and the bundle boundary (lesson 2 of chapter 006).
- CommonJS, `require()`, `__dirname`, `module.exports`. The course's codebase is ESM end-to-end; CJS appears only as a third-party dependency's emitted output, never authored. Mentioned in one line where the `esModuleInterop` flag from lesson 4 of chapter 024 already paid for the interop.
- Authoring a publishable package's `exports` field. The course writes app code, not libraries; named once as the trigger that flips the lesson.
- AMD, UMD, and SystemJS module formats. Dead in 2026 SaaS code; not mentioned.

Pedagogical approach: Reference / survey archetype with one Decision opening. Open with the four-shape recognition framing in one paragraph — every import is one of four shapes, and the senior reads the shape before the contents. Walk the four shapes in tight code blocks, with one-line framing on what edge each draws into the graph. Show the type-only modifier next to the value-only modifier in adjacent snippets, then a paired snippet showing the value-import-of-a-type bug that `verbatimModuleSyntax` catches. Walk re-exports briefly. Then the bare-specifier resolution algorithm gets a small `ArrowDiagram` or annotated SVG showing the three sub-cases (`'react'`, `'next/cache'`, `'@/lib/db'`) resolved against their respective resolution rules — the diagram makes the algorithm concrete in one glance. Close with a `Buckets` exercise sorting twelve import statements ("`import { Button } from './ui/button'`," "`import 'server-only'`," "`import Page from './page'`," "`import type { User } from '@/lib/db'`," "`const m = await import('./heavy')`," "`import config from './config.json' with { type: 'json' }`," "`import { cookies } from 'next/headers'`," "`export { foo } from './mod'`," "`import { foo, type Bar } from './mod'`," "`import './styles.css'`," "`import 'client-only'`," "`import { sql } from 'drizzle-orm'`") into the four shapes plus type-only and re-export. The exercise is the recognition confirmation; no sandbox.

Estimated student time: 30 to 35 minutes.

---

## Lesson 2 — Walking the graph: evaluation, live bindings, and the client bundle

Teaches modules as a depth-first-evaluated directed graph with live-binding semantics, dynamic `import()` as a deferred edge that drives code splitting, and `"use client"` plus `import 'server-only'`/`'client-only'` as the module-graph rule that keeps server code out of the browser.

Topics to cover:

- The senior question. The student wrote two utility modules: `auth.ts` (calls the database, reads cookies) and `format.ts` (a pure date formatter). The bundle ships, and the user's browser downloads 800 KB of database driver code because a client component imported a helper that imported `auth.ts` for one type. The framing: every import is an edge in a graph, and the bundler walks that graph to decide what ships to the client. The lesson teaches the graph at the depth a SaaS engineer needs to predict that walk.
- Modules as a directed graph. Nodes are files; edges are static `import` statements (and dynamic `import()` expressions, treated specially). The runtime (Node or the browser, via the bundler's output) walks the graph from the entry module, evaluating each node once, in **depth-first post-order** — a module's dependencies finish evaluating before the module's own top-level code runs. The student should leave with this picture: a tree-shaped traversal, leaves first, root last.
- Live bindings, the ES-modules semantic. Imports are **bindings to the exporter's variable**, not copies of the value. If module A does `export let count = 0; export function increment() { count++ }` and module B does `import { count, increment } from './a'`, calling `increment()` from B updates the `count` B sees. The senior takeaway: ES modules pass variable references at the binding level, not values. Two consequences named.
  - The `import` statement is not an assignment of a snapshot. Re-exports preserve the live binding too.
  - This is one of the differences from CommonJS `require()`, which copies the value at the time of the require — named in one line for context, not taught at depth.
- Circular dependencies. The graph framing makes the failure mode legible. When A imports B and B imports A, the runtime evaluates one of them first (depth-first from the entry); when the second one's top-level code runs, the first is still mid-evaluation, and any value the second tries to read from the first that hasn't been assigned yet is `undefined`. The compile-time vs. runtime split:
  - **Type-only circular imports** are safe. `import type` is erased; the cycle exists in the type checker (where it's resolved cleanly) but not at runtime.
  - **Value-level circular imports** are a bug class. Top-level usage of a not-yet-exported value crashes (or worse, silently uses `undefined`); function-body usage of the same value is fine because the function runs after both modules finish evaluating.
  - The senior reflex: when a cycle appears, extract the shared types into a third module that neither side imports as a value. The pattern lands in Drizzle relations (Unit chapter 037) where this comes up regularly.
- Dynamic `import()` as a deferred edge. Static imports draw an edge the bundler **must** include in the importing chunk; dynamic `import()` draws an edge the bundler **defers** into a separate chunk fetched on demand. The senior reach when:
  - **A heavy module is rarely used.** A chart library (Recharts, `@nivo/*`) imported only in a settings page. Static import bloats the main bundle; dynamic import keeps it out until the page renders.
  - **A module is conditionally used.** A locale-specific date-fns module loaded based on the user's locale. Static import would force all locales; dynamic import loads one.
  - **Code-splitting at the route level is already automatic.** Next.js route segments split automatically — the student doesn't need dynamic `import()` for page-to-page splits, only for component-to-component or feature-flag splits inside a single page.
- The Next.js `next/dynamic` wrapper. One paragraph: `next/dynamic` is a Next.js helper that wraps `React.lazy` with SSR controls (e.g., `ssr: false` for components that depend on browser APIs). The senior reach when the dynamic import is a React component the page renders inside Suspense. Forward link to Unit chapter 030 (client components and `next/dynamic` together). Named here so the student knows the wrapper exists; the depth lives where React components are taught.
- The bundle boundary — the load-bearing 2026 rule.
  - **`"use client"`** at the top of a file marks it as a client entry. Every module reachable from that file becomes part of the client bundle. Server code (database calls, secrets, `cookies()`, `headers()`) reached from a `"use client"` file is a build error or a security failure depending on enforcement.
  - **`import 'server-only'`** at the top of a server-only module installs structural enforcement: if any client module ever reaches this file, the build fails with an explicit error. The reach for `env.ts` (so the server-only env keys can't leak), the Drizzle client, the auth handler, any file that touches secrets or the database. The cost is one line; the value is the build refuses to ship the bug.
  - **`import 'client-only'`** is the mirror — installs enforcement that the module never enters a server-rendering path. The reach for code that touches `window`, `localStorage`, or a browser-only API and would crash in SSR. Less commonly needed than `'server-only'`; named for completeness.
  - The pairing rule, stated plainly. **`env.ts` imports `'server-only'`.** The Drizzle client imports `'server-only'`. The auth handler imports `'server-only'`. The chapter installs this discipline once; Unit chapter 030 enforces it across the App Router boundary.
- The "looks fine, ships everything" trap. A short worked example. A `lib/utils.ts` file exports a pure `formatDate` and also a `getCurrentUser` that calls the database. A client component imports `formatDate`. Without enforcement, the bundler can pull `getCurrentUser`'s dependency chain into the client bundle because the file is reachable. The fix: split into `lib/format.ts` (pure, client-safe) and `lib/auth.ts` (`import 'server-only'`). The senior reflex: pure utilities live in their own files; anything that touches a server seam imports `'server-only'`.
- The build-time vs. runtime split. The bundler resolves the graph at build time; the runtime evaluates it. Most bugs in this lesson are **build-time errors** when enforcement is on (good — the build refuses to ship), and **runtime errors or silent leaks** when enforcement is off (bad). The senior reflex is to install enforcement as early as possible.

What this lesson does not cover:

- The full server/client boundary at App Router depth (Unit chapter 030).
- React Server Components rendering model, RSC payload, streaming (Unit chapter 030 and chapter 031).
- Turbopack or esbuild internals (chunk-split algorithms, hoisting, etc.). Out of scope; the course teaches semantics, not bundler internals.
- The `import.meta` surface (`import.meta.url`, `import.meta.glob`). Named once — Vite-ecosystem feature surfaced by some Next.js plugins; not a daily reach in 2026 Next.js code.
- `import()` as a tool for breaking circular dependencies. The right fix is to extract shared modules; dynamic import as a circularity workaround is a smell.
- Web Workers and `new Worker(new URL('./worker.ts', import.meta.url))`. Real 2026 surface but a niche; covered in Unit 19 (performance) if it earns a lesson.

Pedagogical approach: Concept archetype with a Mermaid diagram at the center. Open with the 800-KB-bundle scenario in prose. Show the module graph as a small Mermaid diagram (4–6 nodes with directed edges, two of them marked `'server-only'`, one marked `"use client"`) and walk the depth-first evaluation order in adjacent prose. The diagram does the heavy lifting; the prose names what the picture shows. Walk live bindings with a 6-line paired snippet (the `count` and `increment` example) showing the binding semantics. Walk circular dependencies with a wrong-then-right example: A and B importing each other at the value level (crashes) versus extracting the shared type into a third module (resolves). Walk dynamic `import()` with one snippet showing the deferred edge and a one-line note that the bundler emits a separate chunk. The bundle-boundary section gets a paired snippet — the same `lib/utils.ts` file before and after the `'server-only'`-split fix — with explicit annotations on which file is now reachable from a client component. Use a `script-coding` exercise where the student is given a 4-file graph with one circular dependency and one server-leak; they refactor to fix both. Close with a `PredictOutput`-style exercise: given five snippets (one circular cycle, one live-binding mutation, one `'use client'` file importing `'server-only'`, one dynamic-import code split, one type-only circular import), the student predicts whether each succeeds or fails at build/runtime.

Estimated student time: 40 to 50 minutes.

---

## Lesson 3 — Top-level await vs. lazy init

Teaches top-level `await` as a graph-level change that turns every upstream consumer async, the canonical `env.ts` shape, and the senior call between top-level await for cheap startup validation and a lazy `getDb()` for expensive or conditional setup.

Topics to cover:

- The senior question. A module needs to do work before it can export — validate env vars, open a database connection, read a remote config. Two patterns are available: **top-level await** (the module's top-level code waits for a promise before evaluation completes, all consumers wait too) or **lazy init** (a getter function that does the work on first call). The lesson teaches the trade-off and names the canonical SaaS sites for each.
- Top-level await — the graph-level change. ES modules allow `await` at the top level outside any `async` function. The runtime guarantees the module's exports are available only after the top-level promise resolves, and every upstream consumer that statically imports this module becomes implicitly async (the consumer's top-level code waits too). The senior takeaway: **adding a top-level await to a leaf module makes every module in the graph above it wait.** This is fine when the wait is cheap and the work is mandatory; it's wrong when the wait is expensive or conditional.
- The canonical site: `env.ts` validation. The starter's `env.ts` (taught in lesson 2 of chapter 037) uses `@t3-oss/env-nextjs` and Zod. The package fires synchronously at module load — no top-level await needed. Named here so the student sees the pattern in context: the env validation is the **right shape** for top-level work (cheap, mandatory, deterministic) but happens to be synchronous, so the question of `await` doesn't arise. The lesson uses `env.ts` as the canonical shape for "validate at module load, fail closed."
- When top-level await earns its weight. The trigger: the module exports a value that requires an async call to produce, and every consumer needs that value to exist. Two concrete sites:
  - **A remote config loader.** A module that fetches feature-flag config from a service at startup and exports the resolved values. Every consumer reads the resolved flags; the wait is mandatory.
  - **A pre-warmed certificate or signing key.** A module that loads a signing key from a secret manager and exports a configured signer. The signer can't function without the key; the wait is mandatory.
- Lazy init — the alternative. The module exports a function (`getDb()`, `getStripe()`) that, on first call, does the setup work and caches the result. The senior reach when:
  - **The setup is expensive.** Opening a database connection pool, instantiating an SDK with retry config. A test that doesn't use the database shouldn't pay the cost.
  - **The setup is conditional.** The Stripe SDK only initializes if the env var is set; the module gracefully exports a `null` or throws on use otherwise.
  - **The module is imported in environments without the dependency.** A file that imports the auth handler from a CLI script doesn't need to spin up the auth handler.
- The canonical `getDb()` shape. A module-level cached singleton:
  - A `let cached: Database | null = null` at module scope.
  - An exported `getDb()` function that returns `cached` if set, otherwise creates the connection, stores it, and returns it.
  - One line of `import 'server-only'` at the top (from lesson 2 of chapter 006) so the client bundle can never reach this code.
  - A brief note that in a serverless environment (Vercel functions, Cloudflare Workers), the cache is per-instance — cold starts pay the connection cost, warm starts reuse it. Forward link to Unit 5 for the database connection-pooling story.
- The decision rule. State it plainly:
  - **Top-level await** if the work is cheap, mandatory for every consumer, and synchronous-feeling (env validation, locale registry, log formatter setup).
  - **Lazy init** if the work is expensive, conditional, or only needed by a subset of consumers (database client, Stripe SDK, Redis client, S3 client).
  - The wrong reach: a top-level await for a database connection (every consumer pays the cost, even ones that never query); a lazy init for env validation (the bug doesn't surface until first request).
- The cascading-async cost. A small mental model: if `featureFlags.ts` has a top-level await, then every module that imports it has an implicit top-level await, then every module that imports those has an implicit top-level await, all the way up to the entry. In a server-rendered Next.js page, this cascades into the page render — the page can't render until the chain of top-level awaits completes. The senior watch-out: top-level await for a slow remote call is a render-blocker. Two paragraphs on the impact, and the cut: top-level await is for **fast, deterministic** work.
- The forward link to Unit 5 (database) and Unit 6 (Server Actions). The `getDb()` pattern lands again in Unit 5 with the Drizzle-specific shape; the lesson here teaches the **decision shape**, not the Drizzle wiring. Same for `getStripe()` in Unit 11.
- Module-level singletons, the wider rule. The lazy-init pattern is one application of a broader rule: **stateful singletons that need setup are exposed through getters, not as top-level exports.** This protects the module graph from doing work eagerly and from doing work twice (the getter caches). Named once; the chapter doesn't generalize further.

What this lesson does not cover:

- Drizzle connection wiring, pool sizing, or serverless edge cases (Unit 5).
- Stripe SDK initialization at depth (Unit 11).
- The `async`/`await` mechanics themselves (lesson 3 of chapter 007 owns the semantics).
- Module reset / hot-reload behaviors in dev. Next.js's hot reload handles module re-evaluation correctly for the patterns in this lesson; the student doesn't need to think about it.
- Worker-thread or child-process module loading.

Pedagogical approach: Decision archetype. Open with the two-pattern framing in one paragraph and a small decision-tree diagram (Mermaid flowchart) — three questions ("Is the work expensive?", "Is the work mandatory for every consumer?", "Is the work conditional on env or feature flags?") and the leaves landing on "top-level await" or "lazy init." Walk the cascading-async cost with a small Mermaid diagram showing three modules with arrows pointing up the import chain, the leaf marked `await`, and the implicit `await` propagating to each upstream node. Show the canonical `env.ts` shape (which is synchronous — that's the point) and the canonical `getDb()` shape side by side as adjacent labeled code blocks. Use a `Buckets` exercise sorting eight setup scenarios ("env var validation," "Postgres connection pool," "feature-flag registry from a remote service," "Stripe SDK init," "i18n locale messages," "Redis cache client," "JWT signing key from secret manager," "PostHog analytics client") into "top-level await," "lazy init," or "neither (synchronous at module load)." Close with a short `script-coding` exercise where the student rewrites a wrongly-eager `db.ts` (top-level `await createConnection()`) into the lazy `getDb()` shape and the tests verify no work happens at import time.

Estimated student time: 30 to 35 minutes.

---

## Lesson 4 — Augmenting third-party modules

Teaches the `declare module` pattern in dedicated `.d.ts` files to extend a published package's interfaces (Better Auth `Session`, Drizzle relations, `next-intl` messages) and tie branded IDs to the third-party session shape at the source.

Topics to cover:

- The senior question. The student set up Better Auth (Unit 8). The default `Session` type the package exports has a `user.id: string` field. The project's `UserId` is a branded type from lesson 4 of chapter 005. At every call site that reads `session.user.id` and needs to pass it to a function expecting `UserId`, the student is currently casting (`session.user.id as UserId`) or unbranding at the boundary. Both are wrong: the cast is a discipline that drifts, and the unbranding loses the safety the brand exists for. The fix is to **augment the third-party type at the source** so `session.user.id` is `UserId` everywhere it's read.
- Module augmentation, the mechanism. TypeScript's `declare module` block, written in a `.d.ts` file the project owns, extends or merges into an existing module's type declarations. Two flavors named.
  - **Interface merging.** For interfaces (and only interfaces — `type` aliases don't merge), the augmentation adds fields. `declare module 'better-auth' { interface Session { user: User & { id: UserId } } }` merges the `Session` interface, replacing or extending the `id` field's type.
  - **Whole-module augmentation.** Adding new exports the package doesn't ship. Rare; the senior reach is to augment what exists, not invent new module surface.
- The dedicated `.d.ts` file convention. Augmentations live in a project-owned file under `types/` or `src/types/` — `types/better-auth.d.ts`, `types/drizzle.d.ts`, `types/next-intl.d.ts`. Reasons:
  - **One file per package.** Easy to find, easy to delete when the augmentation is no longer needed.
  - **Outside the regular source tree.** The file is type-only; placing it in a dedicated directory makes the intent obvious and keeps it from being imported as a value module.
  - **Included by `tsconfig.json` `include`.** lesson 4 of chapter 024's `include` array picks up `**/*.ts` and `.d.ts` files; the augmentation fires automatically.
- The three canonical 2026 augmentation sites.
  - **Better Auth's `Session`.** The library uses module augmentation (rather than generics) as its primary extension mechanism in 2026 because it keeps types clean across the app without threading generics through every helper. The course's augmentation: `interface Session { user: User & { id: UserId; orgId: OrgId; role: Role } }`, with a placeholder `type Role = 'owner' | 'admin' | 'member'` shown above the snippet (the real `Role` is wired in Unit 9's permissions config; here it's a stand-in so the augmentation reads cleanly). The result: `session.user.id` is `UserId`, `session.user.orgId` is `OrgId`, the role is the literal-union `Role` type from the permissions config. Every Server Action that reads the session gets the right types without casting. Forward link to Unit 8 (Better Auth setup) for the full pattern.
  - **Drizzle relation inference.** Drizzle's `relations()` helper returns inferred types for the related rows; the augmentation pattern lets the project add convenience selectors or override widened relations with narrower branded types. The course's site: when Drizzle infers a relation as `User | undefined` and the application's query always joins it, the augmentation narrows to `User`. Forward link to chapter 037.
  - **`next-intl` typed messages.** The i18n library reads message keys at runtime; the augmentation registers the project's messages JSON shape so `useTranslations('home')` and `t('title')` are autocompleted and type-checked. The pattern: `declare module 'next-intl' { interface AppConfig { Messages: typeof import('./messages/en.json') } }` (the exact shape depends on the `next-intl` version; the lesson teaches the **augmentation pattern**, not the specific config keys). Forward link to Unit chapter 084 (i18n).
- The trigger that earns an augmentation. Three questions stated plainly.
  - **Does the third-party type appear in five or more places without the augmentation?** Below that count, casting at the call site is faster and survives the augmentation's maintenance cost.
  - **Does the augmentation tie a branded ID or domain type to the third-party shape?** The augmentation is the right reach when the cast would erase a brand the project authored.
  - **Is the third-party type designed to be extended?** Better Auth, Auth.js, and `next-intl` document module augmentation as the extension mechanism. Augmenting a type the library treats as internal is a smell — the library can change the shape between minor versions and the augmentation breaks.
- The wrong reach. Three anti-patterns named.
  - **Augmenting to bypass a strict type.** If the library's type says `string | undefined` and the project augments to `string`, the augmentation is lying — the runtime can still be `undefined`. The fix is a narrow at the call site, not an augmentation.
  - **Augmenting application types.** Augmentation is for third-party modules. The project's own types are owned by the project; edit them in place.
  - **Augmenting `globalThis` to add ambient values.** Rare and almost always wrong in app code. The course's rule: every value enters through an import, not through global ambient declarations. Named once.
- The build-time fire. The augmentation lands in the editor and the type checker immediately. A worked example: the student adds the Better Auth augmentation, opens an existing handler that reads `session.user.id`, and the editor now infers `UserId` instead of `string`. The student tries to pass `session.user.id` to a function expecting `OrgId` — the compiler refuses. The augmentation pays for itself the moment a downstream type catches a real mismatch.
- The `import type` discipline inside `.d.ts` files. The augmentation file imports the project's branded-ID types at the top: `import type { UserId, OrgId, Role } from '@/types/ids'`. Type-only imports keep the `.d.ts` file free of runtime cost (it has none anyway — `.d.ts` files are pure types) and document that the file is exclusively type-level.

What this lesson does not cover:

- The full Better Auth configuration (Unit 8).
- Drizzle's relation API at depth (Unit chapter 037).
- `next-intl` setup, locale routing, or message authoring (Unit chapter 084).
- Global type augmentation (`declare global { ... }`) — niche and often wrong; named once as the form to avoid.
- Writing publishable library types with proper extension points (the inverse: how to design a library that wants to be augmented). Out of scope.
- Patches to third-party `.d.ts` files via `pnpm patch`. The augmentation pattern handles the type story; runtime patches earn a different lesson if they earn one at all.

Pedagogical approach: Pattern archetype. Open with the `session.user.id as UserId` bug — the cast that drifts and erases the brand — as a paired snippet. Walk the `declare module` shape in a tight code block, named clearly so the student recognizes the construct. Show the three canonical augmentation sites in three small adjacent code blocks: Better Auth `Session`, Drizzle relations, `next-intl` messages. The Better Auth example gets the most weight because it ties back to lesson 4 of chapter 005's branded IDs and is the load-bearing site every later auth lesson depends on. Use a `script-coding` exercise where the student is given a stub `better-auth` module export and a partial `Session` interface; they write the `declare module` block in a `.d.ts` file that adds branded `UserId` and `OrgId` to the session, and the test verifies the augmentation fires (the type checker now refuses a mismatched call). Close with a `Buckets` exercise sorting six "should I augment?" scenarios ("Better Auth `Session.user.id` should be `UserId`," "my own `User` type needs an `email` field," "the library returns `string | undefined` and I want it to be `string`," "`next-intl` should know about my messages JSON," "the global `window` needs a `dataLayer` property," "Drizzle infers a relation as nullable but my query never returns null") into "augment," "don't augment," or "narrow at the call site instead."

Estimated student time: 30 to 35 minutes.

---

## Lesson 5 — Quizz

Top 10 topics to quiz:

1. The four import-export shapes (named, default, side-effecting, dynamic) with the trigger for each, and the senior cut that defaults to named everywhere the framework doesn't demand otherwise.
2. The `import type` discipline under `verbatimModuleSyntax`, the inline `type` modifier, and the side-effect-erasure bug class the flag prevents.
3. Bare specifier resolution: package names resolved via `exports`, subpath imports gated by the `exports` field, and `@/*` path aliases resolved through `tsconfig.json` `paths`.
4. Modules as a depth-first-evaluated directed graph with live bindings — the import is a reference to the exporter's variable, not a snapshot of its value.
5. Circular dependencies: when they crash at runtime, when they resolve cleanly, and the type-only-import escape hatch for circular type references.
6. Dynamic `import()` as a deferred edge that drives code splitting, with the senior trigger (heavy + rarely used, or conditional) and the Next.js `next/dynamic` wrapper.
7. The `"use client"` directive plus `import 'server-only'` and `import 'client-only'` as the structural enforcement that keeps server code out of the browser bundle.
8. Top-level await vs. lazy init: the cascading-async cost of top-level await, and the canonical `env.ts` (mandatory + cheap) vs. `getDb()` (expensive + conditional) shapes.
9. Module-level singleton patterns: the cached-getter shape with `import 'server-only'`, and the per-instance cache reality in serverless environments.
10. The `declare module` augmentation pattern in dedicated `.d.ts` files: interface merging for Better Auth `Session`, Drizzle relations, and `next-intl` messages, with the trigger that earns an augmentation over a call-site cast.

---

## Total chapter time

Roughly 130 to 155 minutes across the four content lessons plus the quiz. The chapter splits naturally across two evenings — lesson 1 of chapter 006 + lesson 2 of chapter 006 (import shapes and the graph) as one sitting since they share a mental model, lesson 3 of chapter 006 + lesson 4 of chapter 006 (the boundary-file patterns: lazy init and module augmentation) plus the quiz as the second. At the end the student can read any file as a node in a typed graph with predictable edges, write the four import shapes with the right type-only discipline, defer a heavy module with dynamic `import()`, place `'server-only'` at every secret-touching seam, decide between top-level await and lazy init for a new setup task, and augment a third-party module to carry the project's branded IDs through its session shape. Chapter 007 lands on this floor and starts teaching async semantics without re-explaining what a module is.
