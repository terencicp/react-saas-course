# Chapter 2.6 — Modules as a graph

## Concept 1 — Every import is one of four shapes

**Why it's hard.** The student reads `import` statements as a single category and writes whichever shape the file happens to use. The misconception is that the four shapes (named, default, side-effecting, dynamic) are stylistic siblings; in fact each draws a different *kind of edge* into the module graph — a static binding, a static binding with a runtime-chosen name, a pure evaluation with no binding, or a deferred chunk. Without the recognition vocabulary, every downstream lesson in the chapter (live bindings, bundle boundaries, lazy loading) lands on sand.

**Ideal teaching artifact.** A recognition-first identification round before any prose teaches. The student is shown twelve real import statements drawn from the SaaS codebase and asked to sort each into one of the four shapes (plus the two type-only and re-export modifiers). The artifact is the **sort-before-survey** archetype — assessment comes first, the survey is the explanation of the sort. After the round, a tight four-block tour names each shape and the edge it draws, with one paired snippet showing the senior named-vs-default cut: every utility is named; default is reserved for `page.tsx`, `layout.tsx`, the framework-mandated handful. The type-only modifier (`import type`, inline `type` on a named import, `export type`) is shown adjacent to its value-only sibling — same shape, different edge. One short paragraph names the `verbatimModuleSyntax` failure mode: a value import of a type-only symbol can be erased, taking its side effects with it.

**Engagement.** The opening `Buckets` sort *is* the assessment. A short follow-up `MultipleChoice` confirms transfer: given a new `'package-name'` import, the student picks which shape it is and what would happen if the bundler decided the symbol was unused.

**Components.**
- `Buckets` for the twelve-statement opening sort across the four shapes + type-only + re-export buckets.
- `Code` blocks for the four-shape tour; `CodeVariants` for the named-vs-default cut and the value-import-of-a-type bug.
- `MultipleChoice` for the closing transfer check.

## Concept 2 — Bare specifier resolution as a three-case algorithm

**Why it's hard.** `'react'`, `'next/cache'`, and `'@/lib/db'` all start without a leading dot, and the student treats them as one mechanism. They are three mechanisms with different rules and different failure modes: a package-root lookup in `node_modules` gated by the `exports` field; a subpath lookup gated by the same field's keys; and a `tsconfig.json` `paths` alias that doesn't touch `node_modules` at all. When a deep import fails with "no such export" even though the file is plainly on disk, the student doesn't know which rule fired.

**Ideal teaching artifact.** A resolver-trace diagram. A single `Figure` shows the three specifier forms running through a labeled flowchart: "does it start with `./` or `../`?" → relative-path lookup. "Does it start with `@/`?" → `tsconfig.json` `paths` lookup. "Otherwise?" → walk `node_modules`, find `package.json`, read the `exports` field, match the subpath key. Each leaf points at a small worked example showing the file the resolver lands on. The diagram is the artifact — the algorithm becomes a glanceable picture rather than three paragraphs of prose. A short follow-up note names the daily senior subpath surface (`next/headers`, `next/cache`, `zod/v4`) so the student recognizes the slash means a gated subpath, not a folder dive.

**Engagement.** A `Sequence` exercise: given an `import 'pkg/internal/x'` that fails, drag four debugging steps into the right order (check `node_modules/pkg/package.json` exists, read its `exports` field, check the subpath key, decide whether the public surface intentionally excludes the path).

**Components.**
- `Figure` wrapping a hand-SVG resolver-trace flowchart with three branches and three landed-files. Single-use in this chapter and the algorithm is specific to this teaching; static SVG is the right call over a bespoke component.
- `Sequence` for the debugging-order exercise.
- `Code` blocks showing one resolved example per branch.

## Concept 3 — Modules are a depth-first graph with live bindings

**Why it's hard.** The student thinks of imports as "copy the value over here." Two confusions cascade from that: they don't understand why a `let` export that mutates is visible everywhere it's imported, and they don't have a mental model for the *order* in which top-level code runs across files. The graph framing — nodes are files, edges are static imports, the runtime walks depth-first post-order — is the load-bearing mental model the rest of the chapter relies on. Without it, live bindings look like magic and circular imports look like a random crash.

**Ideal teaching artifact.** A two-beat explorable. **Beat one — the graph walk.** A small Mermaid diagram of six modules with directed edges, one marked as the entry. The student steps through the depth-first post-order evaluation with a scrubber: at each step, the currently-evaluating module is highlighted, completed modules are filled in, and a side panel shows which top-level code has run so far. The artifact is a **graph-walker scrollytelling** — the student watches the runtime traverse the picture they just learned to read. **Beat two — live bindings.** A pair of two-file panels: module A exports `let count = 0` and `increment`; module B imports both, calls `increment()`, reads `count`. A controllable "click to call increment" button updates the displayed binding in B, demonstrating that the import is a reference to A's variable, not a snapshot. The wrong-mental-model panel beside it shows what would happen if imports were copies (B's `count` stays at 0). Two beats because graph order and live binding are distinct misconceptions that both load-bear later.

**Engagement.** A `PredictOutput` round on three small two-file programs: predict the order of `console.log` output across modules. The third snippet exercises a live binding (a `let` exported, mutated by one side, read by the other) to confirm the binding semantic landed.

**Components.**
- `GraphWalker` (new) — Mermaid-graph-plus-scrubber that animates a depth-first post-order traversal across a small module graph. Recurs in Concept 4 (cycle visualization) and Concept 5 (deferred-edge visualization).
- `TabbedContent` or paired `Code` blocks for the live-binding demonstration; a single `react-coding`-shaped interactive button is sufficient if the live-binding click is wired in-page, but a static paired snippet with a `// before / // after` annotation reads almost as well at a fraction of the build cost.
- `PredictOutput` for the closing three-snippet round.

## Concept 4 — Circular imports: when they crash, when they resolve

**Why it's hard.** Cycles in the graph are a real hazard, but they aren't uniformly fatal — the failure depends on *where* in the cycle the value is read. Top-level reads of a not-yet-evaluated module return `undefined`; function-body reads run later and resolve fine. Type-only imports are erased and don't participate in the cycle at all. The student conflates these and either avoids all cycles paranoid-style (cost: ugly extracted files everywhere) or ignores cycles entirely (cost: a midnight crash when the cycle's read order shifts).

**Ideal teaching artifact.** A wrong-by-default sandbox the student repairs. The student opens a two-file program: `user.ts` and `org.ts` import each other at the value level, both modules read from the other at the top, and `pnpm tsx user.ts` crashes with `undefined is not a function`. The student is asked to predict which read returns `undefined` and why. They then apply three fixes in sequence and see which crash each fix resolves: (1) move the cross-file read inside a function body — runtime crash gone, but a code smell remains; (2) extract the shared `User` *type* into a third file imported with `import type` — clean fix when the cycle was type-only; (3) extract the shared *value* into a third file neither side imports — the production fix. The artifact carries the assessment because the test only passes when the student picks the right fix for the right cycle.

**Engagement.** A short follow-up `MultipleChoice` round on three new cycles: classify each as "fine — type-only," "fix by extracting the shared value," or "fix by moving the read into a function body."

**Components.**
- `ScriptCoding` with three staged failing snippets the student repairs. The staging across three fixes is the lesson.
- `GraphWalker` (reused from Concept 3) — overlay the cycle on the existing graph traversal; the scrubber shows the evaluation order that produces the `undefined` read.
- `MultipleChoice` for the closing classification.

## Concept 5 — Dynamic import as a deferred edge

**Why it's hard.** Dynamic `import()` looks like a stylistic variant of static import — same module specifier, slightly different syntax. The student doesn't yet see that it draws a fundamentally different edge into the graph: a *deferred* one the bundler emits as a separate chunk. The cost of missing this is bundle bloat — a heavy chart library statically imported by a settings page bleeds into the main bundle every visitor downloads, even though only a fraction of users open settings. The trigger has to land as a *cost decision*, not a syntax preference.

**Ideal teaching artifact.** A side-by-side bundle-shape visualization. Two `Figure`s sit adjacent: the left shows a settings page with `import { ChartLib } from 'chart-lib'` and a bundle graph where the main chunk has absorbed the chart library; the right shows the same page with `const { ChartLib } = await import('chart-lib')` and a bundle graph where the chart library now sits in a separate chunk fetched on demand. Sizes are labeled (illustrative numbers, not pretend benchmarks). The student visually sees what "deferred edge" means in the artifact the bundler ships. One paragraph names `next/dynamic` as the React-component-shaped wrapper around the same primitive, with a forward link to Unit 5.2. The triggers (heavy + rarely used, conditional, route-level already automatic) land in one short paragraph after the visual — the picture earns the rule, not the other way around.

**Engagement.** A `Buckets` exercise sorting eight import scenarios ("a date formatter used on every page," "a Recharts dashboard on the settings page only," "the auth helper called from every server action," "a locale-specific date-fns module," "a heavy markdown editor opened from a comment thread," "a Stripe checkout widget on the billing page," "a small utility for slugifying titles," "a PDF generator behind an export button") into "static import," "dynamic import," or "route-level split — neither, Next handles it."

**Components.**
- `TabbedContent` wrapping two `Figure`s with bundle-chunk diagrams (hand-SVG inside each `Figure`). The bundle-chunk SVG is shared with `GraphWalker`'s deferred-edge mode if that component is built.
- `Buckets` for the eight-scenario sort.
- `Code` blocks for the static-vs-dynamic syntax pair.

## Concept 6 — The bundle boundary as structural enforcement

**Why it's hard.** The reflex from a non-bundled-language background is to treat "don't ship server code to the client" as a discipline — a code-review item, something the careful engineer remembers. The senior 2026 move is the opposite: the discipline is wrong because it drifts, and the right reach is **structural enforcement** that makes the bug a build error. The student needs to feel the difference: a `lib/utils.ts` that mixes pure and server-only code, reachable from a `"use client"` component, silently bloats the client bundle (or worse, leaks secrets) — and the fix isn't "remember to check," it's `import 'server-only'` at the top of the boundary file plus a split.

**Ideal teaching artifact.** A misconception-first ambush followed by a repair. The student is shown a small graph: `app/dashboard/page.tsx` ("use client") imports `lib/utils.ts` for its pure `formatDate`; `lib/utils.ts` also exports `getCurrentUser` which imports the Drizzle client which reads `env.DATABASE_URL`. They are asked: does the client bundle download `env.DATABASE_URL`'s value? Most students say "no, the bundler will tree-shake the unused export." The reveal: it depends on the bundler's static analysis, and **in production you do not trust it** — the senior installs `import 'server-only'` so the build *refuses* to ship the bug. The repair stage: the student splits `lib/utils.ts` into `lib/format.ts` (pure, client-safe) and `lib/auth.ts` (imports `'server-only'`); the build that previously silently shipped now fails loudly when the import chain reaches a server-only seam from a `"use client"` file. The artifact teaches the **discipline-versus-structure** distinction by making the student feel the moment the structural enforcement catches a bug the discipline would have missed.

A second short beat visualizes the bundle boundary on the same module graph from Concept 3: nodes marked `"use client"` light up as the client-bundle reachable set; nodes marked `'server-only'` are drawn with a hard border; any edge crossing from a `"use client"` node into a `'server-only'` node is drawn red and labeled "build error." The picture installs the rule: the boundary is a graph property, not a per-file discipline.

**Engagement.** A `script-coding`-shaped repair exercise: given a four-file graph with one server-leak path, the student adds the two `'server-only'` lines and splits one file to make the build pass. The test passes only when the leak path is structurally closed.

**Components.**
- `GraphWalker` (reused from Concept 3) with a "bundle reachability" overlay mode — nodes color-coded by `"use client"` / `'server-only'` / either, edges crossing the boundary highlighted red.
- `ScriptCoding` for the repair exercise.
- `CodeVariants` for the wrong-then-right `lib/utils.ts` split.

## Concept 7 — Top-level await vs. lazy init

**Why it's hard.** The decision looks like a syntax preference — "top-level `await` is shorter, the getter is more lines" — when it is actually a graph-level decision about *who pays the cost and when*. A top-level `await` in a leaf module turns every upstream consumer implicitly async; in a server-rendered page, that cascades into render-blocking. The student needs the cascading-cost mental model before they can pick the right pattern. The misconception is that "async at module load" is free because the file is small; the truth is that the *file* is small and the *cascade* it triggers can be the whole graph above it.

**Ideal teaching artifact.** A two-beat decision artifact. **Beat one — the cascade visualizer.** A small Mermaid graph with an `await` placed on the leaf node; the student watches the implicit `await` propagate up the import chain to the entry. A side panel shows the wall-clock waterfall: leaf's promise resolves, every upstream module then continues, the page render finally starts. The picture makes "top-level await cascades" concrete. **Beat two — the decision tree.** A short Mermaid flowchart with three questions (cheap or expensive? mandatory or conditional? every consumer or a subset?) landing on "top-level await" or "lazy init." The two canonical shapes (`env.ts` synchronous-at-load and `getDb()` cached-getter with `import 'server-only'`) sit side by side as labeled code blocks below the tree. The student sees the rule, the picture of what happens when the rule is broken, and the two shapes the rule produces.

**Engagement.** A `Buckets` sort across eight real SaaS setup scenarios (env validation, Postgres pool, remote feature-flag fetch, Stripe SDK, i18n messages, Redis client, JWT signing key from secret manager, PostHog) into "top-level await," "lazy init," or "synchronous at module load."

**Components.**
- `DiagramSequence` for the cascade visualizer — scrubs through the propagation step by step, two or three frames.
- Mermaid flowchart inside `Figure` for the decision tree.
- `CodeVariants` for the side-by-side `env.ts` and `getDb()` shapes.
- `Buckets` for the eight-scenario sort.
- `ScriptCoding` for a short refactor: rewrite a wrongly-eager `db.ts` (top-level `await createConnection()`) into the lazy `getDb()` shape; tests verify no work happens at import time.

## Concept 8 — `declare module` as the seam for branded IDs

**Why it's hard.** The student arrives with the brand from Chapter 2.5.4 but the third-party type at the boundary (`Session.user.id: string` from Better Auth) doesn't carry it. The reflex fix is a cast at every call site — `session.user.id as UserId` — and that cast is a discipline that drifts. The senior move is to **augment the third-party type at the source** so every read of `session.user.id` is `UserId` everywhere, with no casting. The pattern is unfamiliar enough that the student doesn't recognize the trigger ("I'm casting the same field everywhere") as the signal that an augmentation earns its weight.

**Ideal teaching artifact.** A real-bug replica that ends in a `.d.ts` file. The student is shown a `getInvoice(orgId: OrgId)` Server Action call site reading `session.user.orgId`, which Better Auth types as `string`. The current code casts; the student is asked to predict what happens when somebody changes the field name in the casted spot — the cast survives, the type stays `OrgId`, the runtime crashes. The fix arrives in three small files: `types/better-auth.d.ts` with the `declare module 'better-auth' { interface Session { user: User & { id: UserId; orgId: OrgId } } }` augmentation; the call site, which no longer needs the cast; and a `pnpm tsc` run showing the editor now infers `OrgId` everywhere. Two short adjacent panels show the same pattern applied to Drizzle relations and `next-intl` typed messages — the augmentation shape recurs across three canonical 2026 sites without re-deriving the mechanism.

**Engagement.** A `Buckets` sort on six "should I augment?" scenarios into "augment the third-party type," "narrow at the call site," or "don't — own the type yourself." Borderline cases (the `string | undefined` augmented to `string`, the `globalThis` dataLayer addition, the own-`User`-needs-a-field case) are explicit decoys for the wrong reach.

**Components.**
- `ScriptCoding` (or `TypeCoding` if the runtime fire isn't load-bearing) for the augmentation write — student authors the `.d.ts` file; tests verify the augmentation fires by checking that a mismatched call now refuses to compile.
- `CodeVariants` for the cast-versus-augment comparison.
- `TabbedContent` for the three canonical sites (Better Auth, Drizzle, `next-intl`) sharing one teaching slot.
- `Buckets` for the six-scenario sort.

## Component proposals

- **`GraphWalker`** — Mermaid module graph + scrubber that animates a depth-first post-order evaluation across a small graph (4–8 nodes). Supports overlay modes: cycle (highlights a back-edge and the read that returns `undefined`), deferred (renders a dynamic-import edge as a dashed line into a separate chunk node), bundle-reachability (color-codes nodes by `"use client"` / `'server-only'` and highlights crossing edges in red).
  - **Uses in this chapter** — Concept 3 (graph walk), Concept 4 (cycle visualization), Concept 5 (deferred edge), Concept 6 (bundle reachability overlay).
  - **Forward-links** — Unit 5.2 (server/client boundary at depth — the bundle-reachability overlay is exactly the App Router teaching surface), Unit 5.3 (RSC payload and streaming, where the graph walk reappears for the server render), Unit 6.2 (Drizzle relations and the cycle pattern that lands there). Compounds heavily.
  - **Leanest v1** — Static Mermaid graph with a step-by-step `DiagramSequence` scrubber under it. Each step is a pre-rendered frame: node-X-evaluating, node-Y-evaluating, and so on. Overlay modes ship as separate pre-baked sequences in v1 (no runtime mode-switching). The bundle-reachability overlay is a single colored frame with one red crossing edge. Loses the live-interactive feel but keeps the load-bearing teaching move — the student sees the depth-first order, the cycle's `undefined` read, the deferred-edge chunk split, and the build-error crossing edge as visible artifacts rather than prose claims.

## Build priority

`GraphWalker` is the only bespoke proposal in this chapter and it carries four of the eight concepts plus heavy forward-links into Unit 5 (the App Router server/client boundary, where the bundle-reachability overlay is the canonical teaching surface) and Unit 6.2 (Drizzle relation cycles). Build it. The v1 — pre-baked `DiagramSequence` frames per overlay mode — passes the teaching bar today; the interactive scrubber is the polish layer. Every other concept in this chapter maps cleanly onto existing components: `Buckets` carries three of the four classification moments, `ScriptCoding` carries the repair-style exercises (cycle fix, server-leak fix, augmentation write), `CodeVariants` carries the wrong-then-right pairs, hand-SVG inside `Figure` handles the one-off resolver-trace diagram. The chapter's teaching weight on existing components is the right cut.

## Open pedagogical questions

- Whether `GraphWalker`'s four overlay modes belong in one component or split into two (a graph-walker for evaluation order and cycles; a bundle-boundary visualizer for `"use client"` reachability). The teaching reach is the same model — nodes and edges with semantic overlays — but the bundle-boundary mode forward-links into so much of Unit 5 that it may earn its own surface. Decide before the v1 build.
- Whether Concept 5's bundle-shape visualization needs the bespoke side-by-side bundle-chunk picture or whether a `CodeVariants` of the two snippets plus one line of prose ("the right snippet emits a separate chunk") carries the cost decision. The picture makes the deferred edge visible; prose claims it. Worth one A/B if a fast static SVG is cheap.
