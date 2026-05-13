# Chapter 2.6 — Modules and the module graph

## Chapter framing

Chapters 2.1 through 2.5 taught the unit-of-work surface: values, functions, collections, the type system that describes them, and the type-level moves that prevent bug classes. Every snippet so far lived in a single file. A real 2026 SaaS codebase is hundreds of files wired together by `import` and `export` — and that wiring is itself load-bearing. The wiring decides what evaluates when, what bundles end up in which output, which files cross the server/client boundary, which initialization runs once at module load and which runs per request. The bugs that ship from misunderstanding the module graph are the worst kind: the file builds, the type-checker is green, the dev server boots, and then a `"use client"` page crashes at runtime because it pulled in a server-only secret through a transitive import. This chapter installs the mental model that prevents that class of bug and teaches the senior-2026 moves that the rest of the course will reach for everywhere.

The senior framing for the chapter: **modules are a graph, not a list.** The compiler doesn't see "a file with imports" — it sees a directed graph of modules that evaluates in a specific order, binds names live across module boundaries, and either resolves cleanly or fails the build. Knowing how the graph evaluates is what lets a senior reason about why a `process.env.STRIPE_SECRET` reaches the client bundle, why a top-level `await` in `db.ts` makes every consumer's first render block, and why a `declare module` in a `types/auth.d.ts` file changes the shape of `Session` across the whole codebase. The lessons foreground the graph, not the syntax — the syntax (`import`, `export`, `import()`, `declare module`) is a means to manipulating the graph, and the graph is what bites in production.

Threads that must run through every lesson:

- **ESM is the only module system the course teaches.** The 2026 Node.js LTS line (Node 24, Node 26) ships with ESM as the default for `"type": "module"` packages, and Next.js 16 ships ESM-only output. CommonJS is named once per lesson where the contrast matters (the `require`/`module.exports` shape, the `__dirname` and `__filename` globals that don't exist in ESM, the synchronous-load constraint that top-level await breaks) and dismissed. The course writes ESM by reflex; CJS interop is a one-paragraph aside in 2.6.2 for the consumer of a CJS-only npm package.
- **The graph is the unit of reasoning.** Every lesson refers to "the module graph" as a concrete object — nodes are modules, edges are imports, evaluation is a topological walk with cycle detection. The student leaves the chapter able to draw the graph for a small app and predict what evaluates when. The mental model is the lesson, the syntax is the means.
- **The bundler and the runtime split.** In a 2026 Next.js project, the module graph is *built* by Turbopack and *evaluated* in three different runtimes (the Node.js server, the Edge runtime, the browser). Lessons name when a behavior is a bundler-side rule (tree-shaking, the `"use client"` cut, `import 'server-only'` poisoning) and when it's a runtime-side rule (live bindings, evaluation order, top-level await blocking). The student learns to ask "is this a build-time error or a runtime error" before debugging.
- **The senior anchors for later units are seeded here.** The server/client boundary in Unit 5.2 lands on the module-graph framing this chapter installs. The `interface Session` augmentation for Better Auth in Unit 9 lands on 2.6.4. The `import 'server-only'` and `import 'client-only'` poisoning pattern lands on 2.6.1 and 2.6.2. The `await db.execute(...)` at the top of a config module lands on 2.6.3. Every lesson plants the forward reference at the call site where it earns its weight.
- **No bundler archaeology.** The course doesn't teach Webpack, Rollup, Vite, or esbuild as standalone tools. It teaches the Turbopack-shaped behavior the Next.js 16 student observes and names the underlying ECMAScript or Node.js spec when it matters. "Tree-shaking" is named for what it does (eliminate unimported exports from the output) and the conditions for it to work (named exports, no side effects in the imported file). The student doesn't tune a bundler config in this chapter or in this course.
- **TypeScript's `verbatimModuleSyntax` is operating.** The flag from 1.4.3 is on in the course tsconfig — type-only imports must be written as `import type`, value imports must not be erased. The lessons honor the flag in every snippet; the import-form discipline the student writes is the same form Turbopack expects.
- **Naming for intent stays operating.** A re-export barrel is named for the boundary it represents (`./auth/index.ts` not `./auth/exports.ts`). A side-effecting import is named in the surrounding comment for what it sets up (`import './polyfills'` with a comment, not a bare line). A dynamic-imported module is named for the feature it gates, not its file (`const editor = await import('./rich-text-editor')`, not `const m = await import('./m')`). The 2.2.3 reflex runs through every snippet.

This chapter ships small standalone snippets and short multi-file examples. `ScriptCoding` and `TypeCoding` carry single-module mechanics; multi-file blocks (labeled with the filename code-block title) carry graph topology and evaluation-order examples. `Mermaid` flowcharts carry the graph diagrams; a `Sequence` diagram or two carry the evaluation order. The student finishes the chapter able to write ESM correctly by reflex, predict the module graph's evaluation order for a small app, decide when a dynamic `import()` earns its weight over a static import, decide when a top-level `await` earns its weight over an explicit init function, and augment a third-party module's types without rewriting it.

The chapter ordering reflects the layering of the model. The base ESM surface (named, default, side-effecting, dynamic, the bare-specifier resolution) comes first because every later lesson references it. The graph mental model — evaluation order, live bindings, ESM/CJS interop, and the senior anchor for the server/client boundary — comes second because it's the substrate the rest of the chapter operates on. Top-level await comes third as the specific feature that re-shapes the graph's evaluation: it turns synchronous-by-default modules into asynchronous nodes and forces every downstream module to also be asynchronous. Module augmentation comes fourth as the type-level move that operates on the module graph: a `declare module` declaration changes the shape of a third-party module's exports everywhere it's imported. The quiz closes.

---

## Lesson 2.6.1 — ESM exports, imports, and the bare-specifier model

Topics to cover:

- The chapter-opening senior question: in a 2026 SaaS codebase, what's the exact form of an `import` line and an `export` line that a senior writes by reflex, and what does each form *mean* at the level of the module graph. The lesson installs the vocabulary the rest of the chapter operates on: named exports as the default reach, default exports as the conditional with a narrow trigger, side-effecting imports as the rare third form, dynamic `import()` as the runtime-deferred fourth, and the bare-specifier model as the resolution algorithm that picks which file the specifier points at.
- The four export forms, in order of senior reach:
  - **Named exports** — `export function createInvoice(...) { ... }`, `export const STATUSES = [...] as const`, `export type Invoice = ...`. The dominant form in 2026 application code. The named export is what makes tree-shaking work — the bundler can see which names are imported and prune the rest. The student writes named exports by reflex; every utility, every component, every type is a named export.
  - **Default exports** — `export default function Page(...)`. The conditional, with a narrow trigger: Next.js page/layout/route convention requires `export default`, and a handful of npm packages still publish a default-only API. The default export erases the name at the import site (`import Foo from './foo'` lets the consumer name the import anything, with no compile-time tie to the original). The senior call: use `export default` *only* when the framework or the third party demands it; named exports everywhere else. The course's chapter-end project pages in later units are the canonical `export default` site.
  - **Side-effecting imports** — `import './polyfills'`, `import 'server-only'`. No binding, no name — the import statement is just "evaluate this module for its side effects when this module is loaded." The senior triggers: polyfill installation (rare in 2026), the `import 'server-only'` and `import 'client-only'` poisoning pattern (Next.js, full treatment of the poisoning behavior in 2.6.2), the rare CSS import in legacy setups. The watch-out: every side-effecting import is a module-graph node that *will* evaluate, even when none of the file's named bindings are used — tree-shaking can't touch a side-effecting import.
  - **Dynamic `import()`** — `const mod = await import('./heavy-feature')`. A function-call form that returns a Promise resolving to the module's namespace object. The senior triggers: code-splitting at a route or interaction boundary (a heavy editor that loads on click), runtime conditional loading (a feature flag's branch), test-time mocking. Named here as the fourth form; full senior treatment in 2.6.2 once the graph mental model is in hand.
- **The corresponding import forms**:
  - **Named imports** — `import { createInvoice, STATUSES } from './invoices'`. Maps directly to the named exports. The senior reach in 2026 codebases.
  - **Default import** — `import Page from './page'`. Maps to the module's default export. The name is the consumer's choice; no compile-time tie.
  - **Namespace import** — `import * as invoices from './invoices'`. The whole module as a single namespace object. The senior triggers: a module with many named exports the consumer treats as a vocabulary (`import * as z from 'zod'`), a re-export site, a test file that wants to spy on every export. The watch-out: namespace imports defeat tree-shaking unless the bundler can prove which names are accessed — Turbopack handles the common case; older bundlers don't. Use sparingly.
  - **Mixed default + named** — `import React, { useState } from 'react'`. One default + one or more named in one statement. The form Next.js 16 documents for the rare default+named library.
  - **Type-only imports** — `import type { Invoice } from './invoices'`. The 1.4.3 / 2.4.8 form; restated here because the module-graph lesson is where the *erasure* behavior belongs. A `import type` line vanishes at compile time — it's not a graph edge at runtime. This matters for the server/client boundary (Unit 5.2): importing a *type* from a server-only file is free; importing a *value* from a server-only file in a client file is a bundling error. The student installs the reflex here.
  - **Inline type-only specifiers** — `import { type Invoice, createInvoice } from './invoices'`. A type and a value from the same module in one statement, with the type marker on the type binding. The senior reach when one import line covers both shapes; the type binding still erases.
- **The `verbatimModuleSyntax` flag**, restated. The flag from 1.4.3 enforces that every type import is written `import type` (or with `type` per-specifier) so the compiler doesn't have to guess at erasure. Turbopack (and esbuild, swc) all rely on the same convention. The student writes the explicit form by reflex; the flag breaks the build if they don't.
- **The bare-specifier model** — the resolution algorithm for `import x from 'foo'` (no `./` prefix). The specifier is "bare" and Node.js (or the bundler) resolves it by walking `node_modules` up the directory tree, consulting the package's `package.json` `exports` field, and picking the file that matches the consumer's environment (Node, browser, types). The senior takeaway in 2026:
  - Bare specifiers point at npm packages. Relative specifiers (`./foo`, `../foo`) point at files in the same project. Absolute-style aliases (`@/lib/db`) are *project-defined* (configured in `tsconfig.json` `paths` and the Next.js project root) and resolve to project files, not to npm packages.
  - The `package.json` `exports` field is what the npm package author wrote to *control* which file consumers can import. A `import 'better-auth/server'` works because the package exposes `./server` in `exports`; a `import 'better-auth/lib/internal'` fails because that subpath isn't exposed. The student doesn't write `exports` fields in application code but reads them to debug a "can't resolve" error.
  - The `imports` field (the project-level one in the consumer's `package.json`) is the senior-2026 alternative to `tsconfig` `paths` aliases for some projects — it's the spec-aligned form. The course uses Next.js's `@/` alias by reflex because it's the framework convention; the `imports` field is named once and dismissed.
- **Re-exports** — `export { createInvoice } from './invoices'`, `export * from './invoices'`, `export { default } from './page'`. A barrel file (`index.ts` that re-exports from a directory) is the senior reach for a public boundary of a module — a feature directory exposes its public API through one file, internal files stay internal. The 2026 watch-out: a barrel file that re-exports from a side-effecting child module pulls the side effect into every consumer; the senior reflex is to barrel only pure modules and let side-effecting modules stand on their own.
- **The watch-outs a senior names**:
  - Mixed default + named exports in a file the team owns. Adds confusion at the import site; named-only is the senior default. Reserve the default export for framework-mandated files.
  - `export *` from a file that has overlapping names with its sibling. The bundler picks one or errors — both behaviors confuse the reader. Name the re-exports explicitly.
  - Re-importing a module's own exports through a third file to break a cycle. The cycle is the bug; named re-exports through a fourth file hide it. Cycle resolution is 2.6.2.

What this lesson does not cover:

- The evaluation-order and live-bindings semantics of the module graph (2.6.2).
- Top-level await (2.6.3).
- Module augmentation and declaration merging (2.6.4).
- CommonJS `require`/`module.exports` syntax in any depth — the contrast lives in 2.6.2 where the interop story belongs.
- The `package.json` `exports` field as authored — the lesson teaches the reader's side, not the publisher's side.
- Configuring Turbopack or any bundler — the student writes ESM and the framework handles the rest.
- The legacy `tsconfig` `module: 'commonjs'` configuration — the course assumes `module: 'esnext'` and `moduleResolution: 'bundler'` per the 1.4.3 setup.

Pedagogical approach:

Mechanics archetype with a concept opening that installs the four export forms as a unified surface. Open with the senior question — "you've been reading and writing `import` and `export` for five chapters; here's the senior-2026 form and what each shape means at the graph level" — and a `TabbedContent` block with one tab per form (named, default, side-effecting, dynamic). Each tab is a 4-to-6-line snippet and a one-sentence trigger. The student sees the surface as one picture. Then a `ScriptCoding` block where the student writes a small two-file module — `invoices.ts` with two named exports and one type, and `app.ts` that imports both. The student exercises named, type-only, and mixed-inline imports in three small edits, observing the editor's autocomplete narrow per form. A `CodeVariants` block contrasts the named-only vs. default+named import sites on the same module — one tab shows the named site with autocomplete fire on `createInvoice`, the other shows the default site where the consumer names the import freely. The senior call is annotated inline.

A small `AnnotatedCode` block walks a bare-specifier resolution: `import { auth } from 'better-auth'` with annotations pointing at the `node_modules/better-auth/package.json` `exports` field that resolves the specifier to a file. The student sees the resolution algorithm as a concrete trace. A `Buckets` exercise sorts eight import lines into "named," "default," "side-effecting," "dynamic," "namespace," "type-only," "mixed," and "re-export." The trigger-recognition is the deliverable.

Close with a `CodeReview` exercise on a 30-line module file with three issues: a default export of a utility function (should be named), a `import * as utils` namespace import where two names would suffice (should be named imports), and a side-effecting import without a comment explaining its purpose (should be annotated or moved). The student leaves a comment naming each fix.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.6.2 — The module graph: evaluation order, live bindings, dynamic import, and the server/client boundary

Topics to cover:

- The senior question: when the runtime starts a module, what evaluates first and what evaluates next, and what does a value imported from another module *actually* refer to at runtime. The answer is the module graph — a directed graph of modules connected by import edges, walked in a specific evaluation order, with bindings that update *live* across the edges. The lesson installs the mental model and uses it to explain three senior-anchor behaviors: why dynamic `import()` is a graph-level deferral, why a `"use client"` file that transitively imports a server-only module fails the build, and why module-level state is shared by reference across every consumer.
- **The module graph as a concrete object**:
  - Nodes are modules — each file is one node, regardless of how many other files import it. A module is loaded once per runtime; subsequent imports return the same namespace object.
  - Edges are import statements — every `import` in a file's source creates an edge from that file's node to the imported module's node. Type-only imports (`import type`) do not create runtime edges; they're erased before evaluation.
  - Evaluation order is depth-first, in source order. The runtime walks the graph from the entry module, recursively evaluates each imported module before the importing module's body runs, and memoizes each module's namespace once evaluation finishes.
  - **Cycles** are handled but fragile. When module A imports B and B imports A, the runtime starts A, sees the import of B, starts B, sees the import of A — and at that point A's evaluation is *in progress*. B receives a partial namespace from A (only the bindings that finished evaluating before A's import of B). The senior reflex: cycles are a code smell; if a cycle is necessary, ensure the bindings the cycle consumes are function declarations (hoisted) or are accessed lazily (inside a function body), not top-level value reads.
- **Live bindings** — the property of ESM imports that distinguishes them from CJS `require`. An imported binding is a *reference* to the export, not a copy. When the exporting module reassigns the exported variable, every consumer sees the new value on next read. The mechanics: `export let counter = 0; export function increment() { counter++; }` — consumers import `counter`, observe `0`, call `increment()`, then read `counter` again and see `1`. The reference is bound to the export, not snapshot.
  - **The senior reach for live bindings**. The pattern shows up in module-level singletons (a config loaded once and read everywhere), in lazy-init patterns (a database connection set on first call), and in the framework's session-cache pattern (Next.js's per-request cache lives as a module-level Map that's reset by the framework). The student reads code that depends on live bindings; they rarely *exploit* the property — the senior default is `const` exports and immutable module-level state.
  - **The watch-out**. CJS `require` *copies* the imported value at the moment of `require` — a `module.exports.counter = 0` followed by reassignment doesn't update consumers. Code that crosses the ESM/CJS boundary and relies on live bindings breaks. Named once for the rare CJS-interop file.
- **ESM/CJS interop in 2026 Node.js**:
  - Node 22+ allows `require()` to load an ESM module synchronously when the ESM module's graph has no top-level await. When the graph *does* have top-level await, `require()` of any module in that graph throws `ERR_REQUIRE_ASYNC_MODULE`. The senior reach in 2026 is "write ESM everywhere; if a CJS dependency is unavoidable, isolate the bridge at one file."
  - The other direction (ESM importing CJS) works: a CJS module's `module.exports` is exposed as the ESM default export, and named properties on `module.exports` are exposed as named exports when the bundler can statically detect them. The bundler-detection heuristic is the source of "named export 'X' not found" errors at import sites for some CJS libraries; the senior reach is the namespace import (`import * as pkg from 'cjs-lib'; pkg.foo()`) when the heuristic fails.
  - CJS's `__dirname`, `__filename`, `require`, `module`, `exports` do not exist in ESM. The 2026 replacements: `import.meta.url` (a `file://` URL) for the current file, `import.meta.dirname` (Node 22+) for the directory, `createRequire(import.meta.url)` from `node:module` for the rare synchronous-CJS-load case. The senior writes ESM-native code; the CJS globals are named here once and never again.
- **Dynamic `import()` at the graph level**. A dynamic `import()` is a *deferred* edge: the module isn't in the graph until the `import()` is called. The runtime walks the dynamically-imported subgraph on demand, returns a Promise resolving to the namespace object, and memoizes the load.
  - **Bundler behavior** (Turbopack, esbuild, Webpack): a static `import()` literal-string call is the signal for *code splitting* — the bundler emits the dynamically-imported subgraph as a separate chunk that loads on demand at runtime. A `import(variable)` with a non-literal specifier defeats the static analysis and either fails the build or bundles everything together; the senior reach is the static literal.
  - **The senior triggers for dynamic `import()`**, named with the canonical patterns:
    - **Route-level code splitting**. In Next.js 16, `next/dynamic` (which wraps `React.lazy` and `import()` under the hood) is the senior reach for a heavy client component (a rich-text editor, a charting library) that shouldn't ship in the initial bundle. Full treatment in Unit 5.6; the lesson plants the seed.
    - **Conditional feature loading**. `if (flagEnabled('beta-editor')) { const m = await import('./beta-editor'); ... }` — the beta editor's code only loads when the flag is on.
    - **CLI / script entry points** where one binary supports many subcommands. Each subcommand loads its handler on demand.
    - **Test-time mocking and lazy-init utilities**. Out of scope for the lesson body, named in one line.
  - **The watch-out**. Dynamic `import()` returns a Promise — the consumer is on the async path. A consumer that wants the import resolved synchronously (a top-level config read, a constant export) shouldn't use dynamic import; the senior reach there is a static import and accept that the module loads at startup.
- **The server/client boundary as a module-graph rule**. Next.js 16's `"use client"` directive marks a module as the *root* of a client subgraph. The framework's bundler walks the graph from each `"use client"` file and includes every transitively imported module in the client bundle. The graph rule the student installs:
  - A module without `"use client"` is a *server module* by default. Server modules can import other server modules and can import (the *types* from) client modules.
  - A module with `"use client"` is a *client module*. Client modules can import other client modules and (transitively, through a `"use client"` boundary) cause the server-side bundler to also produce a serializable RSC payload for the same component tree.
  - A server module imported by a client module pulls into the client bundle. *This is the bug class the chapter foregrounds.* A client component that imports a server-only file (a `db.ts` that imports `drizzle`, a `env.ts` that reads `process.env.STRIPE_SECRET`) bundles the server code — and the secret — into the browser.
  - The defense, named in three layers: write `"use client"` at the boundary you actually mean; reach for `import 'server-only'` at the top of any module that must not be bundled to the client (the import throws at build time when a client module pulls it in); reach for `import 'client-only'` at the top of any module that uses browser-only APIs (the import throws at build time when a server module pulls it in). The `server-only` and `client-only` npm packages are the 2026 senior reach for the poisoning pattern.
  - Type-only imports are exempt. `import type { Invoice } from '@/lib/db'` from a client component is *free* — the type binding erases at compile time and never enters the runtime graph. This is the import-form discipline that lets a client component name a server-derived type without dragging the server code with it.
- **The senior anchors**, named at the call site for what each cashes in:
  - Module-level state (a singleton DB connection, a module-level cache `Map`, a config loaded once) lives on live bindings and lives once per runtime. Used in Unit 5.5 (the per-request cache), Unit 6.2 (the Drizzle client export), Unit 15.1 (`cacheTag`).
  - The `import 'server-only'` poisoning at the top of `lib/db.ts`, `lib/auth.ts`, `lib/env.ts`. Used in every later unit; the pattern lands here.
  - The dynamic `import()` for code splitting at the client boundary. Used in Unit 5.6 for `next/dynamic`, Unit 16.1 for the editor pattern.
- **CommonJS in 2026**, named once. A few npm packages still ship CJS-only; the consumer-side reach is the namespace import or the `createRequire` bridge in a server module. The course doesn't write CJS in application code.

What this lesson does not cover:

- The `"use server"` directive and server actions (Unit 5.2 and 7.2).
- The full server/client boundary mechanics — composition rules for client → server components, the RSC payload shape, the streaming model (Unit 5.2 and 5.3 own the surface).
- Bundler internals beyond the graph-walking and code-splitting behaviors named.
- Top-level await (2.6.3).
- Authoring an npm package's `package.json` `exports` field.
- Edge runtime specifics — named once as "a third runtime the graph evaluates in," full treatment in Unit 5.6.

Pedagogical approach:

Concept archetype as the chapter's load-bearing lesson, with two Mechanics beats (dynamic import, server/client poisoning). Open with the senior question — "what evaluates first, and what does an imported value actually refer to" — and a `Figure` with a small Mermaid flowchart of a four-module graph (`entry.ts` → `a.ts` → `c.ts`, `entry.ts` → `b.ts` → `c.ts`). The student reads the depth-first walk order from the diagram: `c → a → c (memoized, skip) → b → entry`. The graph is the lesson's anchor; every later beat references it.

A `ScriptCoding` block exercises live bindings: the student writes a `counter.ts` module with `export let value = 0; export function increment() { value++; }` and a consumer that imports `value` and `increment`, calls `increment`, and logs `value` again. The student observes the binding update — the lesson's mechanics payoff. A second `ScriptCoding` block exercises the cycle case: a tiny A↔B cycle where one binding is a `function` (works because of hoisting) and the other is a `const` (returns `undefined` at the cycle entry). The student sees the failure mode in the editor's console.

A `CodeVariants` block contrasts a static and a dynamic import on the same heavy module — tab 1 ships the module in the initial bundle, tab 2 defers it. The annotation names the bundler's chunk-splitting heuristic and the Promise return type. A small `TypeCoding` exercises the `await import('./feature')` form: the student writes the call, hovers the result, and sees the inferred namespace type.

The server/client beat lands in a `Figure` (a Mermaid graph with `page.tsx` → `Button.tsx` ("use client") → `db.ts`) followed by an `AnnotatedCode` block showing the three poisoning patterns in 12 lines: `import 'server-only'` at the top of `lib/db.ts`, the client component that imports `db.ts`, the build error message. The student sees the safety net concretely. A small `Sequence` exercise puts five module-evaluation steps in order for a given graph; a small `MultipleChoice` exercise asks "given this `"use client"` file, which of these imports is safe (a, b, c, d)?" — the student picks the type-only import as the safe option.

Close with a `CodeReview` exercise on a Next.js component file that imports a server-only utility, with the senior fix (either move the call into a Server Action, switch to a type-only import, or split the utility). The student leaves a comment naming the cause and the fix.

Estimated student time: 60 to 75 minutes. The chapter's longest lesson; the model it installs pays compound across the rest of the course.

---

## Lesson 2.6.3 — Top-level await and module-init patterns

Topics to cover:

- The senior question: a module needs an asynchronous step at initialization — a database connection probe, a Zod parse of `process.env`, a feature-flag fetch. The historical reach was an exported `init()` function that the consumer awaits; the 2026 reach is top-level `await` directly in the module body. The lesson teaches when to use which, what top-level await costs at the graph level, and why this isn't a free lunch even though the syntax makes it look like one.
- **The mechanic**. In an ESM module, `await` is legal at the top level (outside any function). The module's evaluation becomes asynchronous — the runtime suspends evaluation at the await, resumes when the awaited promise settles, then continues. The exported bindings aren't available until the module's body finishes.
  ```ts
  // env.ts
  import { z } from 'zod';

  const envSchema = z.object({
    DATABASE_URL: z.url(),
    STRIPE_SECRET_KEY: z.string().min(1),
  });

  export const env = await envSchema.parseAsync(process.env);
  ```
  The module exports a fully-parsed, fully-typed `env` object that every consumer can import as `import { env } from './env'`. No `await getEnv()`; the binding is ready.
- **The cost at the graph level**. A module with top-level await becomes an *async module*. Every importing module — recursively, the whole subgraph — is also async. The runtime walks the graph as before, but at every edge into an async module the consumer's evaluation suspends until the async module resolves. The implications:
  - **Every consumer pays the latency**. If `db.ts` does a top-level `await db.execute('select 1')` at startup and `actions.ts` imports `db.ts`, then `actions.ts` can't finish evaluating until the probe completes. A 100ms probe at the bottom of the graph adds 100ms to every consumer's first-load critical path.
  - **CJS `require()` fails**. The Node 22+ ability to `require()` an ESM module synchronously *only* works when the ESM module's graph has no top-level await. A `require('./env')` from a CJS file throws `ERR_REQUIRE_ASYNC_MODULE`. Inside a pure-ESM project (the course's default) this isn't a constraint; in a hybrid CJS/ESM codebase, top-level await poisons the graph for CJS consumers.
  - **Failure-mode propagation**. If the top-level `await` rejects, the module's evaluation rejects, and every consumer's import rejects with the same error. The senior reflex: top-level await is for *init* — work that must succeed before the module is usable. Failure means the module is unloadable; the rest of the app can't recover from a partial init.
- **When top-level await earns its weight** — three named triggers:
  - **Environment validation at module load**. The canonical 2026 pattern. The course writes `env.ts` once as a top-level-`await`'d Zod parse over `process.env`. Every consumer imports `env` knowing it's typed and validated. The probe is sub-millisecond (synchronous Zod call wrapped in `parseAsync` for the symmetry); the cost is negligible and the safety floor is high.
  - **Module-level singletons that need async setup**. A Drizzle client that opens a pooled connection; a Better Auth instance that loads a JWKS; a feature-flag client that fetches the initial flag manifest. The senior call: top-level await is the right tool *if* the consumer can tolerate the latency and the work has to happen at startup. If the work can be deferred to first call (a lazy `getDb()` that opens the pool on first use), defer it.
  - **Polyfill installation that fetches**. A polyfill that fetches a definition from a CDN before becoming usable. Rare in the 2026 stack; named for completeness.
- **When top-level await is over-reach** — three named anti-patterns:
  - **Network calls that aren't init-critical**. Fetching the current user's profile, loading the dashboard's data — these are per-request work, not per-process. The senior reach is to fetch inside the handler that needs the data, not at module load.
  - **Conditional async work**. A "if config says X, fetch Y" at module top level pays the X-check at every startup. The senior reach is a function `async getY()` called from the consumer's flow, where the conditional is part of the call site's logic.
  - **Async cleanup or teardown**. There's no "top-level finally" — the module body runs once. Cleanup belongs in a process-level `SIGTERM` handler, not in a module body.
- **The senior pattern the lesson cements** — the `env` module:
  ```ts
  // env.ts
  import 'server-only';
  import { z } from 'zod';

  const schema = z.object({
    DATABASE_URL: z.url(),
    STRIPE_SECRET_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }

  export const env = parsed.data;
  ```
  Two things to notice. First, no `await` here — `safeParse` is synchronous, no top-level await needed. The lesson teaches that *most* env-validation patterns are synchronous; top-level await earns its weight only when the validation reaches an async API (a remote-config probe, a secrets-manager call). The `parseAsync` form belongs to schemas with `.transform(async ...)` steps.
  - The `import 'server-only'` poisoning from 2.6.2 cashes in here — `env.ts` reads secrets and must never bundle into a client component.
- **The alternative pattern when top-level await doesn't earn its weight** — the lazy init:
  ```ts
  // db.ts
  import 'server-only';
  import { drizzle } from 'drizzle-orm/postgres-js';

  let dbInstance: ReturnType<typeof drizzle> | null = null;

  export function getDb() {
    if (!dbInstance) {
      dbInstance = drizzle(process.env.DATABASE_URL!);
    }
    return dbInstance;
  }
  ```
  The lazy form opens the connection on first call, not at module load. The trade-off named: lazy init is harder to reason about (the first call pays the latency, subsequent calls don't), but doesn't block the module graph. The senior call: top-level await for cheap synchronous-feeling init; lazy init for expensive or conditional setup. The full Drizzle wiring lands in Unit 6.2; this lesson names the pattern as the alternative shape.
- **Top-level await in dynamic `import()`**, named once. A dynamically imported module with top-level await suspends the dynamic-import Promise until the module's body resolves. The pattern is rare in application code (you'd write the await inside the consumer's `await import()` call site, not inside the dynamically-imported module) and named for completeness.

What this lesson does not cover:

- The full Drizzle client setup (Unit 6.2).
- The full Better Auth setup (Unit 9.2).
- Environment validation at depth (a separate lesson and the env-schema patterns belong with Zod in Unit 7.1 and the deployment story in Unit 21.3).
- `import.meta` properties past the `url`/`dirname` named in 2.6.2.
- The `Promise.resolve().then(...)` workaround for CJS — out of scope; the course doesn't write CJS.

Pedagogical approach:

Decision archetype with one Mechanics beat for the syntax surface. The lesson teaches a senior judgment (when to reach for top-level await) more than a syntactic capability (the keyword combination). Open with the senior question — "your `env.ts` needs to validate `process.env`; do you `export const env = parse(env)` at the top, or `export function getEnv()` for the consumer to call?" — and a `CodeVariants` block with both forms side by side. The student reads the diff and the trade-off annotation.

Then a Mechanics beat: a `ScriptCoding` block where the student writes a small top-level-`await`'d module (a fake async-config-load) and a consumer that imports it. The student adds a `console.log` before and after the import and observes the order — the consumer suspends until the awaited module resolves. The mechanic is concrete in their console.

A `Figure` with a Mermaid graph illustrates the async-module propagation: a top-level-`await` module at the bottom turns the whole upstream subgraph async. The student sees the propagation visually; the bug class (latency that propagates outward) becomes obvious.

A small `Buckets` exercise sorts six initialization scenarios ("Zod-parse `process.env`," "Open the Drizzle pool on first query," "Fetch the user's profile when the page loads," "Validate that `BETTER_AUTH_SECRET` is at least 32 chars," "Probe the database with `select 1` at startup," "Load a feature-flag manifest from an HTTP endpoint at module load") into "top-level await earns it," "lazy init earns it," or "per-request, no module-level work." The decision discipline is the deliverable.

Close with an `AnnotatedCode` block walking the canonical `env.ts` shape — the `import 'server-only'`, the schema, the `safeParse`, the throw-on-fail, the exported `env`. The student sees the senior 2026 pattern end-to-end and recognizes the form when it lands in Unit 21.3.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.6.4 — Module augmentation: extending third-party types

Topics to cover:

- The senior question: every 2026 SaaS codebase wires third-party packages that publish types — Better Auth publishes a `Session` interface, Drizzle publishes a `Relations` shape, `next-intl` publishes a message-key type. The application needs to *extend* these types — add a `role` field to the session, register a new relation, declare the message-key union — without forking the package. The move is module augmentation: a `declare module 'package-name'` block that merges the application's additions into the package's exported types. The lesson teaches the pattern, the file conventions, and the canonical sites where the rest of the course will reach for it.
- **The mechanic**. TypeScript's declaration merging extends to module declarations. A `declare module 'better-auth'` block in *any* `.ts` file that's part of the project (and reachable from the tsconfig's `include`) is merged with the original module's published declarations. The augmenting interface adds fields to the original interface; the augmenting type aliases can't (alias merging is a separate, rarely-used surface). The senior 2026 form is interface augmentation; type-alias augmentation is named once for completeness.
  ```ts
  // types/auth.d.ts
  import 'better-auth';

  declare module 'better-auth' {
    interface Session {
      user: {
        id: string;
        email: string;
        role: 'admin' | 'member' | 'viewer';
        activeOrganizationId: string | null;
      };
    }
  }
  ```
  The `import 'better-auth'` at the top is the side-effecting import that pulls the package's types into scope so the `declare module` block targets the right module. After the augmentation is in place, every `Session` import — `import type { Session } from 'better-auth'` — across the entire project sees the augmented shape.
- **The three canonical augmentation sites** in the 2026 SaaS stack, named with the unit each lands in:
  - **Better Auth `Session`** (Unit 9). The published session shape is generic; the application narrows it with the actual fields it depends on (the user's role, the active org, custom session fields). The augmentation lands once in `types/auth.d.ts` and pays back at every Server Action that reads the session. The branded-type discipline from 2.5.4 lands here too — the augmented session can declare `user.id: UserId` instead of `string`.
  - **Drizzle relations and the `db` instance type** (Unit 6.2). Drizzle's relational query API depends on a generated relations map. The senior pattern in 2026 is to declare the relations on the schema and let the type flow through; module augmentation is rare in pure-Drizzle code but lands when the team uses a custom column type or a plugin that doesn't ship its own types.
  - **`next-intl` message keys** (Unit 18.2). The message catalog is the source of truth for legal translation keys. Module augmentation declares `IntlMessages` (or the equivalent named-by-the-library interface) so `t('home.title')` is typed against the actual key set and `t('home.titel')` (typo) fails the build. The pattern lands here.
- **The file convention** the course uses. Augmentations live in a project-level `types/` directory (or `src/types/`) with one file per package being augmented — `types/auth.d.ts`, `types/intl.d.ts`. The `.d.ts` extension is convention, not required (a `.ts` file works too); the senior reach uses `.d.ts` because the file is type-only and `.d.ts` signals it. The `tsconfig.json`'s `include` covers the directory automatically when it includes `"**/*.d.ts"`.
- **The watch-outs**:
  - **Place the augmentation outside any module scope**. A `declare module` block inside a regular module (a file with any `import`/`export` of its own) requires careful attention — if the file has any top-level `import` or `export`, the `declare module` block lives in a module scope, which is fine for module augmentation but means the entire file must be referenced (imported, even just for side-effects) somewhere in the project for the augmentation to apply. The senior reach: put augmentations in dedicated `.d.ts` files in `types/` and let `tsconfig` `include` them globally — no need to import the file from application code.
  - **Augmentation overrides, not replaces**. Adding an `interface Session { newField: string }` adds the field; redeclaring an existing field with a different type errors with "Subsequent property declarations must have the same type." The senior reflex: augment by *adding* fields; if a field's type needs to change, the package's own API is the wrong shape and the fix is upstream (or a custom wrapper).
  - **`.d.ts` vs. inline `declare module`**. Both work. The course writes `.d.ts` for augmentations of third-party packages (clean separation, no risk of accidentally adding runtime code) and inline `declare module` for *project-internal* asset declarations (e.g., a `*.svg` module declaration for the rare non-component image-import pattern). The inline form is named once; the dedicated-file form is the senior default.
- **Module augmentation vs. ambient module declaration**. A `declare module '*.svg'` (no `interface` augmenting an existing module — the module didn't exist) is *ambient module declaration*, not augmentation. The course names the distinction in one paragraph: augmentation extends a module that's already typed; ambient declaration types an untyped or non-existent module. The latter is rare in 2026 (most file types have type definitions); the former is the daily reach.
- **Module augmentation for the brand seam from 2.5.4**. The branded-types lesson named module augmentation as the mechanism for tying Better Auth's session to the course's branded `UserId` and `OrgId`. The pattern:
  ```ts
  // types/auth.d.ts
  import 'better-auth';
  import type { UserId, OrgId } from '@/lib/brands';

  declare module 'better-auth' {
    interface User {
      id: UserId;
    }
    interface Session {
      user: { id: UserId; email: string; role: Role };
      activeOrganizationId: OrgId | null;
    }
  }
  ```
  Every consumer of the session gets a `UserId`-typed `id` for free. The branded-ID discipline lands at the source — the only file that says "this string is a UserId" is the augmentation file, and the brand flows from there.
- **`.d.ts` files at the depth the lesson needs**. The `.d.ts` extension is for *declaration files* — type-only files with no runtime output. Two roles:
  - **Augmenting an existing module** (this lesson's main pattern).
  - **Typing an untyped module** (the ambient declaration form). When a package has no `@types/...` and no built-in types, an ambient `.d.ts` declaring the module's shape unblocks consumption. Rare in 2026; named in one paragraph.
  - The course doesn't write a third role — *authoring* `.d.ts` files for the project's own modules. The TypeScript compiler emits those automatically when needed (for library publishing), and application code doesn't ship as a library.

What this lesson does not cover:

- Full TypeScript declaration merging (`interface` self-merging, enum-namespace merging, class-namespace merging) — out of scope; only module augmentation is taught.
- The `namespace` keyword and ambient-namespace patterns — out of scope for the 2026 course; the language has moved past the pattern.
- Authoring a third-party package's types (`.d.ts` published with the library) — out of scope for application code.
- The full Better Auth session wiring (Unit 9.4).
- The full Drizzle relations setup (Unit 6.2).
- The full `next-intl` typed-messages setup (Unit 18.2).

Pedagogical approach:

Pattern archetype. The lesson teaches a specific shape (`declare module` in a dedicated `.d.ts`) and the bug class it prevents (third-party types that don't match the application's domain). Open with the senior question — "Better Auth ships a `Session` type with `user.id: string`; your codebase uses `UserId`; how do you make the session's id be `UserId` without forking Better Auth?" — and a small `CodeVariants` showing two approaches: tab 1 wraps every session read in a cast (`session.user.id as UserId`), tab 2 augments the `Session` type once. The diff is the lesson's seed.

A `TypeCoding` block walks the augmentation: the student writes a `types/auth.d.ts` file with the `declare module` block adding a `role: 'admin' | 'member' | 'viewer'` field to the `Session` interface. The student then hovers a `session.user.role` access in a separate file and sees the augmented type. The merge is the lesson's mechanics payoff.

A short `AnnotatedCode` block walks the file-layout convention — `types/auth.d.ts`, `types/intl.d.ts`, the `tsconfig.json` `include` covering the directory. The student sees the project shape concretely. A second `AnnotatedCode` block walks the `UserId` brand integration (the snippet above) with annotations on each augmentation step.

A `Sequence` exercise orders the five steps of adding a custom session field: create the `.d.ts` file, write the side-effecting `import`, write the `declare module` block, add the interface field, verify the augmented type at a consumer call site. A `MultipleChoice` exercise asks "which of these is the right reach: (a) augmentation, (b) ambient module declaration, (c) a custom wrapper, (d) editing `node_modules`" for four scenarios. The trigger-recognition is the deliverable.

Close with a small `CodeReview` exercise on a `types/auth.d.ts` file with a subtle issue (the `declare module` block sits inside a regular module file that imports a value, and the augmentation doesn't apply because no consumer imports the file). The student leaves a comment naming the cause and the fix (move to a pure `.d.ts` covered by `include`).

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.6.5 — Quizz

Top ten topics to quiz:

1. The four export forms — named, default, side-effecting, dynamic — and the senior trigger for each (named as the default, default only for framework-mandated files, side-effecting for poisoning patterns, dynamic for code splitting).
2. The type-only import surface — `import type` and inline `type` specifiers — and why the form matters under `verbatimModuleSyntax` and at the server/client boundary.
3. The module graph as a directed graph evaluated depth-first; what gets memoized and what fires once per runtime; what happens at a cycle.
4. Live bindings — imports are references to exports, not copies; the contrast with CJS's copy semantics; when the senior actually reaches for the property.
5. Dynamic `import()` as a deferred graph edge and the bundler's code-splitting heuristic on a literal-string specifier; when to reach for it and when a static import is right.
6. The server/client boundary as a module-graph rule — `"use client"` marks a client subgraph root, every transitive value-import lands in the client bundle, type-only imports are exempt, `import 'server-only'` and `import 'client-only'` are the poisoning safety net.
7. Top-level await as a graph-level change — the importing module becomes async and the cost propagates upward; the senior call between top-level await and lazy init.
8. The canonical `env.ts` pattern — Zod schema, `safeParse`, throw on failure, `import 'server-only'` at the top; when the async-validation form earns the top-level await.
9. Module augmentation via `declare module` — the `.d.ts` file convention, the side-effecting import to bring the target module's types into scope, interface merging vs. type-alias merging, the canonical sites (Better Auth `Session`, Drizzle relations, `next-intl` messages).
10. The branded-IDs seam from 2.5.4 closed by augmenting Better Auth's `Session` so `session.user.id: UserId` flows through every consumer without per-callsite casts.

---

## Total chapter time

Roughly 170 to 215 minutes across the four teaching lessons plus the quiz. The chapter splits naturally across two evenings — the ESM surface (2.6.1) plus the module-graph model (2.6.2) as the first sitting, the heaviest of the chapter because 2.6.2 is the load-bearing lesson, then top-level await (2.6.3) and module augmentation (2.6.4) as a lighter second sitting. The student finishes the chapter able to write ESM by reflex, draw the module graph for a small app and predict its evaluation order, reason about when a dynamic `import()` or a top-level await earns its weight, and augment a third-party module's types so the rest of the course's seams (the Better Auth session, the Drizzle schema, the i18n message keys) carry the application's domain types from the source. Chapter 2.7 (Async semantics) lands directly on this floor — the event loop and microtask queue operate underneath the graph evaluation; the Promise surface 2.6.3 named (top-level await as syntactic sugar over Promise resolution at module scope) gets its full treatment.
