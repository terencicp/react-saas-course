# Lesson title

- Title (h1): Walking the graph — evaluation, live bindings, and the client bundle
- Sidebar label: Walking the graph

# Lesson framing

The graph framing was installed in lesson 1 ("every import is an edge"). This lesson teaches what the runtime and bundler **do** with that graph: evaluate it depth-first, expose live bindings through the edges, defer some edges with `import()`, and refuse to ship server-only nodes to the client.

**Archetype:** Concept-driven, with one decision (split-the-file refactor) and three small visuals (one Mermaid graph, one DiagramSequence for evaluation order, one before/after `CodeVariants`). Heavier on diagrams and worked examples than lesson 1 — the student needs to *see* the traversal and the bundle boundary, not just read about them.

**Mental model to install:**
1. Modules form a directed graph. The runtime evaluates it **depth-first, post-order, once per module** — leaves finish before their importers begin.
2. Imports are **live bindings**, not value copies — `import` gives the consumer a read-only window onto the exporter's variable.
3. Cycles are a real hazard at the value level, free at the type level.
4. `import()` is the only way to draw a **deferred edge** — the bundler emits a separate chunk; the runtime fetches it on demand.
5. `"use client"` marks a graph entry point for the client bundle. Everything reachable from it ships to the browser. `import 'server-only'` makes that reachability a **build error** the moment it leaks.

**Pain points relieved:**
- The "why did 800KB ship to the client?" debugging session — installed once, structurally, with `'server-only'`.
- The "why is this `undefined` at the top of my module?" crash — the live-binding + cycle story explains it cleanly.
- The "I added `await import()` but my main bundle is still huge" confusion — code-splitting is the trigger, not a side effect of any async keyword.
- The "I put `'use client'` on the layout to fix one button" antipattern — the directive marks an entry, not a fix.

**What beginners get wrong:**
- Treating `import` as `let x = require('mod').x` (CJS snapshot semantics). They are caught off-guard when a mutation in the exporter is visible to the importer.
- Adding a function call to the top of a module that depends on a circularly-imported value, then debugging for an hour.
- Splitting a file randomly to "improve bundle size" without understanding that the bundler walks reachability, not file boundaries.
- Slapping `"use client"` on a parent component, forcing the entire subtree into the client bundle.
- Thinking `'server-only'` is for documentation. It is enforcement — a build error.

**What the student can do at the end:**
- Look at a 5-file graph and predict the evaluation order.
- Read a snippet with `export let` + `import`, mentate the live binding, and predict the mutation outcome.
- Diagnose a circular-dependency `undefined` and know whether to extract a shared module or convert to a type-only import.
- Pick the right reach between static `import` and dynamic `import()` for a given UI piece.
- Place `"use client"` at the smallest interactive leaf and `'server-only'` at every secret-touching seam, and explain why.

**Cognitive load management:** four concepts (evaluation order, live bindings, cycles, deferred edges) build the graph-semantics half. The bundle-boundary half (`"use client"` + `'server-only'`/`'client-only'`) is one decision applied to one worked example. Forward links to Unit 4 chapter 030 for the App Router boundary depth — this lesson installs the **rule and the enforcement primitive**, not the full RSC model.

# Lesson sections

## Introduction (no header)

Open with the 800KB-bundle scenario in two short paragraphs:

1. Concrete setup: the student has shipped two utility modules — `lib/auth.ts` (reads cookies, queries the DB) and `lib/format.ts` (a pure date formatter). A client component imports a helper that re-exports both. The browser downloads 800KB of database driver because the bundler walked from the client component through every reachable edge. Frame this as the **senior debugging session** that this lesson refuses to let happen.
2. Preview the four ideas: depth-first evaluation, live bindings (with cycles as the hazard), dynamic `import()` as the deferred edge, and the `"use client"`/`'server-only'` boundary as the **build-time** rule that keeps server code out of the browser.

Keep under ~130 words. No `Aside`. Reference the graph framing from lesson 1 in one sentence, then keep moving.

## Depth-first, once per module — how the graph runs

Teach the evaluation order. The student needs to *see* the traversal once and then never wonder again.

### Diagram: a small graph and its order

Use a Mermaid `flowchart LR` inside `<Figure>`. Five-node graph:

- `entry` (e.g. `page.tsx`) → `auth.ts`, `format.ts`
- `auth.ts` → `db.ts`
- `format.ts` → `temporal.ts`
- `db.ts` → `env.ts`

Caption: "The bundler walks from `entry` depth-first. Evaluation order: env → db → auth → temporal → format → entry. Each module runs once."

Pedagogical goal: make the traversal concrete — leaves finish first, root last, never revisits a node. The diagram replaces a long prose paragraph.

### Three rules the runtime guarantees

Three short rules in prose, each one sentence + one example:

1. **Depth-first, post-order.** A module's top-level code runs after **all** its imports finish. The example: in the diagram, `auth.ts`'s `const db = ...` line cannot run until `db.ts`'s exports exist.
2. **Once per module.** Importing the same file from two places does not run it twice. The exporter's top-level state is shared. (Forward-link in parenthetical: "this is what makes the module-level singleton pattern in lesson 3 work.")
3. **Errors short-circuit upward.** A `throw` at the top of a leaf prevents every upstream consumer from finishing — useful for fail-closed startup (`env.ts` parse failure, taught in lesson 3).

Optional: one short `Term` on **depth-first post-order** ("Tree walk that finishes a node's children before the node itself").

## Live bindings — imports point at the exporter's variable

Teach the most non-obvious ES module semantic.

### What "live binding" means

One paragraph: an `import` is **not** a copy — it is a read-only window onto the exporter's binding. When the exporter mutates the variable, the importer sees the new value. This is a structural property of ESM, not a Webpack quirk or a React thing.

### Code: the canonical counter

Use `CodeVariants` with two tabs to compare ESM live bindings vs. the value-copy intuition the student likely brings. Each tab holds the same two files (`counter.ts` and `consumer.ts`) and a third "result" comment block at the bottom.

**Tab 1 — Live binding (the ESM truth):**

```ts
// counter.ts
export let count = 0;
export const increment = () => {
  count += 1;
};
```

```ts
// consumer.ts
import { count, increment } from './counter';

console.log(count); // 0
increment();
console.log(count); // 1 — the import tracks the exporter
```

Prose under the tab: "`count` in `consumer.ts` is a **binding** to `counter.ts`'s variable. The second log reads `1` because the import never snapshotted — it follows the exporter."

**Tab 2 — Value-copy intuition (wrong):**

```ts
// What students often expect — this is NOT how ESM works
// (mental model: import = const assignment from the export's value)
let count = 0;
const increment = () => { count += 1; };
const consumerCount = count;   // snapshot at 0

increment();
console.log(consumerCount);    // 0 — would be 0 if imports were copies
```

Prose under the tab: "If imports were value copies, the second log would still be `0`. The mental model is wrong. ESM passes references at the binding level."

### Two consequences, stated plainly

One short list:
- **Re-exports also preserve the live binding** — `export { count } from './counter'` is still tracking the original.
- **The importer cannot reassign the binding.** `count = 5` from the consumer is a compile-time error. Only the exporter writes; everyone else reads.

One sentence on the CJS contrast: `require()` reads `module.exports` once and copies — this is the legacy semantic the student may have seen elsewhere. Named once for context, not taught.

## Circular dependencies — when the graph eats itself

This is the live-binding story applied to cycles. Three subsections:

### When a cycle crashes

One paragraph + a small `Code` block showing the failure shape:

```ts
// a.ts
import { fromB } from './b';
export const fromA = fromB + 1;  // CRASH — fromB is undefined here

// b.ts
import { fromA } from './a';
export const fromB = fromA + 1;
```

Walk it: entry imports `a.ts`, `a.ts` starts evaluating and imports `b.ts`, `b.ts` starts evaluating and imports `a.ts` — `a.ts` is mid-evaluation, its `fromA` export is not yet assigned, so `b.ts` reads `undefined`. The arithmetic on `undefined` produces `NaN` (or `TypeError` depending on the operation). The cycle is detected and the runtime returns the **partial** module to the second importer.

### When a cycle resolves cleanly

Two cases, named in one paragraph each:

1. **Function-body access.** If `b.ts` only reads `fromA` *inside a function body*, the cycle is harmless — by the time the function runs, both modules have finished evaluating.
2. **Type-only cycles.** `import type` is erased at compile time, so a type-level cycle exists only inside the type checker (where it's resolved cleanly) and never at runtime. The senior reach when two modules genuinely reference each other's types — convert one of the imports to `import type` and the cycle dissolves.

### The senior reflex: extract the shared module

One paragraph: when a value-level cycle appears, the structural fix is to extract the shared symbol into a third module that neither side imports as a value. The pattern lands again in Drizzle relations (forward link to Unit 5 chapter 037).

**Visual:** small `CodeVariants` with two tabs showing the cycle vs. the extracted shape. Each tab is a `FileTree` followed by a one-line summary, no full code — the student already saw the crash code.

- Tab 1 (cycle): `a.ts ↔ b.ts`
- Tab 2 (extracted): `shared.ts` ← `a.ts`, `shared.ts` ← `b.ts`

## Deferred edges — dynamic `import()` and code splitting

Lesson 1 introduced `import()` as a value-level expression that returns a `Promise<Module>`. This section teaches the *bundling consequence*.

### The static-edge default

One paragraph + a small `Code` block:

```ts
import { renderChart } from './heavy-chart';
```

Static imports are **eager edges**: the bundler must include the target in the same chunk as the importer (unless code-splitting heuristics carve it out). Cost: the target's bytes are part of the initial JS the browser parses.

### The deferred edge

One paragraph + a small `Code` block:

```ts
const onAnalyticsTabClick = async () => {
  const { renderChart } = await import('./heavy-chart');
  renderChart();
};
```

`import('./heavy-chart')` is a **deferred edge**: the bundler emits the target as a separate chunk, fetched only when the expression runs. Cost: one extra network round-trip the first time the tab is clicked; saving: the initial bundle does not carry `heavy-chart`'s bytes.

### When to reach for it

One short bulleted list (the chapter outline's three triggers, compressed):
- **Heavy + rarely used.** A chart library inside a settings page, a markdown editor inside an admin tool.
- **Conditional.** A locale-specific date module loaded based on the user's locale.
- **Not for page-to-page splits.** Next.js App Router route segments split automatically — dynamic `import()` is the tool for component-inside-page or feature-flag splits, not for the navigation graph.

### `next/dynamic` in one paragraph

One paragraph: `next/dynamic` is Next.js's React-aware wrapper around `import()` for the case where the dynamic target is a React component. It pairs with Suspense and adds SSR controls (`ssr: false` for components that touch `window`, `localStorage`, or other browser-only APIs). Named here so the student recognizes it; depth lives in Unit 4 chapter 030 (forward link, one parenthetical).

`Term` candidate here: **code splitting** ("Build-time technique where the bundler emits separate JS chunks for different parts of the app, fetched on demand instead of in the initial download").

## The bundle boundary — `"use client"`, `'server-only'`, `'client-only'`

The load-bearing section of the lesson. Decision archetype: which directive goes where, and what each one enforces.

### `"use client"` marks an entry into the client bundle

One paragraph: a file starting with `"use client";` is a **client entry point**. The bundler treats it as a root of the client subgraph; every module reachable from it (statically) ships to the browser. Server Components are the default — no directive needed.

One sentence on placement discipline: the directive belongs at the **smallest interactive leaf** — the actual button, form, or piece of state — not on a parent layout that pulls a whole subtree into the client bundle. (Forward link to Unit 4 chapter 030 for the placement story in depth.)

One short `Code` block showing the canonical shape:

```tsx
'use client';

import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

### `import 'server-only'` makes leaks a build error

One paragraph: a server-only module — anything that touches secrets, the database, request cookies/headers, an SDK key — starts with `import 'server-only';`. The package is a no-op at runtime in Node; in a client bundle it throws an explicit build error naming the file that leaked.

One short `Code` block — the canonical `lib/auth.ts` opening:

```ts
import 'server-only';

import { db } from '@/db';
// ...
```

One sentence: the convention is structural across the course's codebase — `env.ts`, the Drizzle client, the Better Auth instance, every billing/email/storage adapter starts with this line.

### `import 'client-only'` is the mirror

One short paragraph: the symmetric package, used on modules that touch `window`, `localStorage`, or any browser-only API and would crash if rendered on the server. Less common than `'server-only'` (most browser-only code already sits inside a `"use client"` file), but the right reach for utility modules that should refuse to be imported from a Server Component.

### Decision summary

A compact table-style summary inside an `<Aside type="tip">`:

| Directive | Where it goes | What it enforces |
| --- | --- | --- |
| `'use client'` | Top of a client component file | Marks a client-bundle entry point; everything reachable becomes client code |
| `import 'server-only'` | Top of any server-only module | Build error if a client bundle ever reaches this file |
| `import 'client-only'` | Top of any browser-only module | Build error if a server bundle ever reaches this file |

`Term` candidates: **server-only** ("Sentinel package whose only job is to fail the build if imported into a client bundle") and **client-only** (mirror definition).

## The "looks fine, ships everything" trap — a worked example

This is the lesson's payoff. A before/after refactor that shows the bundle boundary in action.

### Before: one file, two responsibilities

A `CodeVariants` block with two tabs.

**Tab 1 — `lib/utils.ts` (the leak):**

```ts
// lib/utils.ts — looks pure, isn't
import { db } from '@/db';
import { headers } from 'next/headers';

export const formatDate = (d: Date) => d.toISOString().slice(0, 10);

export const getCurrentUser = async () => {
  const h = await headers();
  // db query reading the session cookie...
  return db.query.users.findFirst(/* ... */);
};
```

Prose: "A client component imports only `formatDate`. The bundler still walks every reachable edge — `db`, `headers`, the Drizzle relations graph. The client bundle balloons with server code the user never needs."

**Tab 2 — Split into two files (the fix):**

```ts
// lib/format.ts — pure, safe to import from anywhere
export const formatDate = (d: Date) => d.toISOString().slice(0, 10);
```

```ts
// lib/auth.ts — server-only, enforced
import 'server-only';

import { db } from '@/db';
import { headers } from 'next/headers';

export const getCurrentUser = async () => {
  const h = await headers();
  return db.query.users.findFirst(/* ... */);
};
```

Prose: "Same surface, split by responsibility. The client component imports `lib/format.ts` and nothing else reaches `lib/auth.ts`. If a future client file ever does, the `'server-only'` import fails the build with a clear error pointing at the offending import."

### The senior reflex, stated once

One paragraph, in bold-led-sentence form: **Pure utilities live in their own files. Anything that touches a server seam imports `'server-only'`.** The file-per-responsibility split is not aesthetics; it is how the bundler knows where the client subgraph ends.

## Predict the outcome — five-snippet exercise

Close with a `PredictOutput`-style flow. The lesson outline calls for five mini-predictions covering the lesson's load-bearing concepts. Rather than one `PredictOutput` with multi-line output (mechanically awkward — the student would have to predict five separate things in one textarea), use **five small `MultipleChoice` cards** in a row, each presenting one snippet and asking "What happens?" with three options: "Logs X", "Crashes at runtime", "Build error".

Snippets and answers:

1. **Live-binding mutation.** Two files: `counter.ts` exports `let count = 0; const increment = () => { count++ }`; consumer imports both, logs `count`, calls `increment()`, logs `count` again. Expected output: `0` then `1`. Answer: "Logs 0 then 1". Decoys: "Logs 0 then 0", "TypeError on the second log".
2. **Value-level circular cycle.** `a.ts` and `b.ts` import each other at the top level and use the value in a top-level `const` expression. Answer: "Crashes at runtime (or produces `NaN`/`undefined`)". Decoys: "Logs 1", "Build error".
3. **Type-only circular import.** Same shape but converted to `import type`. Answer: "Logs the expected value" (no cycle at runtime). Decoys: "Build error", "Crashes at runtime".
4. **`'use client'` file importing a `'server-only'` module.** Answer: "Build error". Decoys: "Logs successfully", "Crashes at runtime".
5. **Dynamic `import()` reducing the initial bundle.** Show a snippet where `await import('./chart')` sits inside a click handler. Question: "Does the chart module's code ship in the initial bundle?" Answer: "No — separate chunk fetched on click". Decoys: "Yes, dynamic import is just an `await`", "Only if the user has JavaScript enabled".

Each `MultipleChoice` should have a one-paragraph `feedback` (or post-answer rationale) that re-states the rule the snippet exercised — this is the spaced-repetition pass on the lesson's five core ideas.

> Authoring note: if the `MultipleChoice` component does not support per-question rationale, fall back to five `<details>` blocks (one per snippet, each with a `<summary>` carrying the snippet and the body carrying the answer + explanation). The `MultipleChoice` flow is preferred for engagement; `<details>` is the structural fallback. Do **not** stack five `PredictOutput`s in a row — the output-text guessing UX does not fit yes/no/build-error questions.

## External resources

Two `ExternalResource` cards at the end:
- MDN — `import` (especially the "module namespace objects" and "live bindings" sections).
- Next.js docs — "Server and Client Components" page (forward link to Unit 4 chapter 030; this is the canonical reference for `'use client'` and the bundle boundary).

No video for this lesson. The content reads better as static diagrams + predictions; a video would dilute the structural focus.

# Scope

**This lesson teaches:**
- Modules as a depth-first, post-order-evaluated directed graph.
- Live bindings — imports as read-only windows onto the exporter's variable.
- Circular dependencies: when they crash, when they resolve, and the type-only and shared-module escape hatches.
- Dynamic `import()` as a **deferred edge** and the bundling consequence (code splitting).
- `next/dynamic` named in one paragraph, not taught at depth.
- `"use client"` as a client-bundle entry-point directive.
- `import 'server-only'` and `import 'client-only'` as structural build-time enforcement.
- The split-the-file refactor (`lib/format.ts` vs. `lib/auth.ts`) as the senior reflex.

**This lesson does NOT teach (reserved for later):**
- The four import-export shapes — **already taught in lesson 1**. Reference them, do not re-teach.
- The type-only import discipline under `verbatimModuleSyntax` — also lesson 1; reuse the rule, do not restate the bug class.
- Top-level `await` and the cascading-async cost; `getDb()` lazy-init shape — **lesson 3 of this chapter.**
- `declare module` augmentation — **lesson 4 of this chapter.**
- The full RSC server/client boundary, the RSC payload, Server Actions, streaming, Suspense — **Unit 4 chapter 030.** One-sentence forward links only.
- Bundler internals (Turbopack chunk-split algorithm, esbuild tree-shaking heuristics). The course teaches **semantics every bundler agrees on**, not internals.
- `import.meta` surface.
- CommonJS, `require()`, AMD, UMD, SystemJS — named once as the legacy contrast in the live-bindings section, not taught.
- Web Workers, `new Worker(new URL(...))`.

**Prerequisites the student has from earlier lessons** (do not re-teach):
- Lesson 1 of this chapter: the four import-export shapes, `import type` discipline, bare-specifier resolution, the graph framing itself.
- Chapter 004 lesson 8: `verbatimModuleSyntax` is on; type-only imports are erased at runtime.
- Chapter 005: branded IDs exist (do not pull them in; this lesson is not about types).

**Concepts referenced briefly without re-teaching:**
- `import 'pkg'` side-effecting form (lesson 1) — used here without re-defining the shape.
- `@/`-prefixed paths in code samples — alias from chapter 003 lesson 8.

# Code conventions alignment

- Single quotes throughout (Biome canonical), 2-space indent, semicolons, trailing commas multiline.
- Side-effecting imports (`import 'server-only'`, `import 'client-only'`) appear **first** in any composite snippet, before group 1.
- `import type` on its own line in any sample where a type is the only thing imported.
- `'use client'` (or `'use server'`) goes on the **very first line** of the file, before any imports. Match the project's single-quote convention.
- Named exports everywhere; the only default-export sample is the canonical Next.js `page.tsx` if it appears (it does not in this lesson).
- The `getCurrentUser` example uses async + `await headers()` per Next.js 16 (Async Request APIs). Drizzle reads use the `db.query.<table>` shape per code conventions.
- The `Counter` client component uses an arrow function bound to `const`, named export, and follows React 19 idioms (no `forwardRef`, no `useCallback` — the React Compiler is on).
- Where samples are simplified for pedagogy (no `tenantDb`, no Result type wrapping, no error narrowing), note the simplification in passing so downstream agents do not over-correct. The point of the `getCurrentUser` example is the **server-only seam**, not the production-shape auth flow.

# Authoring notes for downstream agents

- This lesson is the **conceptual core of the chapter**. Resist condensing the diagrams or the worked example — they are the load-bearing assets.
- The Mermaid graph in section 1 is small (5 nodes). Cap caption at one line. Use a `flowchart LR` (left-to-right) so the depth is visible across the width.
- The live-binding `CodeVariants` is the hardest part for the student. Make sure the comments inside the snippets explicitly call out the moment the binding semantics matter ("0" vs "1" log, `count = 5` reassignment compile error). Do not lecture; let the code carry the difference.
- The before/after `lib/utils.ts` split is the lesson's emotional payoff. Frame it as a real debugging session ("the user's browser downloads 800KB") — the student should *feel* the cost before reading the fix.
- The `MultipleChoice` exercise is the recap. Do not write a separate summary section.
- Forward links to Unit 4 chapter 030 appear three times (placement of `'use client'`, `next/dynamic` SSR controls, full bundle-boundary depth). Each is **one parenthetical**, never a paragraph.
- The "what's the canonical 2026 server-only package?" question: `server-only` (the npm package, owned by the Next.js team). Use the bare-specifier `import 'server-only'` form — the only correct authoring shape. Same for `client-only`. Do not invent a project-local module.
