# Lesson title

- Title (h1): The four import-export shapes
- Sidebar label: Four import shapes

# Lesson framing

This is the chapter opener. The student has been told for five chapters that modules exist (every previous lesson uses `import`/`export`), but the syntax has been picked up by osmosis. This lesson installs the recognition vocabulary: every `import` line is one of four shapes, and a senior reads the shape before the contents.

**Archetype:** Reference / survey with one Decision opening (named-vs-default). Heavy on tight code blocks; light on prose. The lesson lands close to 30–35 minutes because most of its surface is recognition, not derivation.

**Mental model to install:** Every import statement names an edge into a directed graph of modules. The shape of the import determines the kind of edge (static value, type-only erased, side-effect-only, deferred). Lesson 2 then teaches what the runtime does with that graph; this lesson teaches how to read the edges. Reinforce the graph framing in one paragraph at the top and once per shape — do not over-thread it because lesson 2 owns the graph semantics.

**Pain points relieved:**
- The "what does this default import even point to?" confusion when reading framework files.
- The `import type` discipline under `verbatimModuleSyntax` — already encountered in chapter 004 lesson 8 but never named as a recognition skill.
- The `import 'pkg'` smell — students from other ecosystems read it as a no-op and miss the side effects.
- The "where does `'@/lib/db'` even come from?" mystery — installed once so every later lesson can use the alias without re-explaining.

**What beginners get wrong:**
- Defaulting to `default` exports because some library or tutorial used them. The senior cut (named everywhere except framework-mandated) needs to be stated plainly.
- Dropping `type` modifiers because "it still works" — until the bundler erases a side-effecting import the student didn't know was side-effecting.
- Treating `import { foo } from 'pkg/internal/something'` as legal because the file exists. The `exports` field gate must be named.
- Reading `await import()` as just an `await` keyword and missing that it's a value-level expression that returns a `Promise<Module>`.

**What the student can do at the end:** read any `import` line in the codebase and name (a) which of the four shapes it is, (b) whether it draws a runtime edge or is erased, (c) where the file actually resolves from, and (d) whether the shape is the right reach for the situation.

**Cognitive load management:** the four shapes are the spine. The type-only discipline, re-exports, bare-specifier resolution, and JSON imports all hang off the spine — each section is short and self-contained. Do not introduce graph evaluation order, live bindings, dynamic chunking, or `'server-only'` semantics. Mention them once as forward links and move on.

# Lesson sections

## Introduction (no header)

Open with the recognition framing in two short paragraphs:

1. Frame the senior question: every `import` line the student writes is one of four shapes. A senior reads the shape and knows what kind of edge it draws into the graph the bundler walks. The lesson installs that recognition vocabulary.
2. Preview the four shapes by name only — **named**, **default**, **side-effecting**, **dynamic** — and note that two cross-cutting concerns ride on top: the type-only discipline (`import type`) and where bare specifiers resolve from. No code yet.

Keep the introduction under ~120 words. No `Aside`. No lesson-outcome list.

## Named exports: the course default

Teach the named-import / named-export pair as the default for everything the student writes.

- One small `Code` block with three exports (`export const`, `export function`, `export type`) and the matching `import { x, fn, type T } from './mod'` line below it. Show them next to each other.
- One paragraph naming why named exports win in 2026: refactor-safety (rename propagates to call sites), tree-shaking, explicit at the call site, types travel faithfully.
- One sentence: every utility, every component, every type the student authors in this course is a named export.

Keep it tight. The named-vs-default decision lands in its own subsection below; here, just install the default.

## Default exports: only when the framework demands them

Decision archetype, kept to one screen.

- One paragraph: the default-export form (`export default ...`) earns its weight only where the framework or third-party library mandates it. The student does not author default exports anywhere else.
- A short `Code` block showing `export default function Page()` and the matching `import Page from './page'`.
- A bullet list of the canonical 2026 sites (compress the long Next.js list from the chapter outline):
  - Next.js App Router special files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`.
  - A handful of third-party libraries that ship their primary export as default.
  - Everywhere else: **named, not default.**
- One sentence on the refactor-safety asymmetry: renaming a default-exported symbol does not propagate (the import-side name is whatever the caller picked); named exports break every caller and tooling fixes them automatically. State plainly; do not re-litigate the debate.

Do **not** include the legacy `unknown`-default-export typing aside from the chapter outline — it dates the lesson and the rest of the course operates under `verbatimModuleSyntax` where it does not bite.

## Side-effecting imports: when the file runs for what it does, not what it returns

- One paragraph defining the form: `import 'pkg'` with no binding — the file is evaluated for its side effects, no symbol enters the importer's scope.
- One sentence: rare and intentional in 2026 SaaS code.
- A short `Code` block with two examples next to each other:
  - `import 'server-only'` (forward link in one parenthetical: "lesson 2 of this chapter teaches what this enforces").
  - `import './globals.css'` in `app/layout.tsx`.
- One sentence: anywhere else, a side-effecting import is a smell. Do not exhaust the list of valid sites; the two named are the canonical 2026 ones.

## Dynamic imports: a value-level expression that returns a Promise

- One paragraph: `import('./mod')` is an **expression** that returns `Promise<Module>`. Unlike the three static forms, it can appear anywhere a value can — inside a function body, a conditional, a click handler. The edge it draws is **deferred**.
- One `Code` block:
  ```ts
  const onClick = async () => {
    const { renderChart } = await import('./chart');
    renderChart();
  };
  ```
- One sentence on the bundling consequence — "the bundler emits this as a separate chunk fetched on demand" — and a parenthetical forward link to lesson 2 ("the code-splitting story lives in the next lesson").

Do **not** teach `next/dynamic`, `React.lazy`, Suspense, or code-splitting strategy. The mention of "separate chunk" is just enough to ground the deferred-edge framing.

## The type-only import discipline

Cross-cutting concern. The student has seen `import type` from chapter 004 lesson 8 — restate the rule and name what `verbatimModuleSyntax` prevents.

- One paragraph: under `verbatimModuleSyntax` (already on for the whole course), every type-only import must carry the `type` keyword. The compiler refuses ambiguity, and the bundler can no longer accidentally erase a side-effecting initialization.
- Use a `CodeVariants` block with two tabs showing the three forms:
  - **Tab 1 — Pure type import:** `import type { User } from './types';`
  - **Tab 2 — Mixed value + type:** `import { createUser, type User } from './users';`
  Each tab has one or two lines of explanation: the first is the default reach when the file needs only types; the second is the reach when one file genuinely needs both, and splitting them would split a logical pair.
- A short `Code` block for `export type`:
  ```ts
  export type { User } from './users';
  ```
  One sentence: same rule for re-exports.
- One short paragraph naming the failure mode `verbatimModuleSyntax` prevents — a value import that's only used as a type can be erased by the bundler along with its side-effecting initialization. This is the silent-bug class the flag closes.

`Term` candidates here: **verbatimModuleSyntax** (definition: "TypeScript flag that requires explicit `type` keywords on type-only imports/exports; prevents the bundler from erasing imports the runtime needs.") and **tree-shaking** (definition: "Bundler optimization that drops exports no consumer imports; relies on static analysis of `import`/`export` lines.").

## Re-exports: the transparent forwarding form

- One paragraph: a re-export draws an edge through the re-exporting module to the source, makes the binding available from the re-exporter, and is the right reach for grouping a domain module's surface.
- A small `Code` block showing both forms next to each other:
  ```ts
  export { createInvoice } from './actions';
  export type { Invoice } from './types';
  // wildcard form — used sparingly:
  export * from './schemas';
  ```
- The course's barrel rule, stated plainly: re-exports are valid, but a barrel file (`index.ts` re-exporting dozens of unrelated symbols) hurts tree-shaking and editor go-to-definition. Per the course's code conventions, the student does not author barrels in `lib/`, `db/`, or `_lib/`. Reach for `export *` only when the surface is intentionally open (a domain module that exposes its full API).
- One sentence on the wildcard collision rule: `export *` from two modules that share a symbol name is a compile error.

## Where does `'pkg'` actually come from? Bare-specifier resolution

This is the diagram section. The chapter outline calls for a small `ArrowDiagram` or annotated SVG showing the three sub-cases. Pick the **plain HTML + CSS** diagram engine wrapped in `<Figure>` — three rows, each row is one specifier on the left with an arrow connecting to its resolution rule on the right. This is a simple correspondence diagram; `<ArrowDiagram>` is overkill, and Mermaid/D2 would treat the labels as boxes without enough nuance.

**Diagram structure:**

Three vertical rows in a `<Figure>`, each row split into two columns (specifier + resolution):

| Specifier | Resolves through |
| --- | --- |
| `import { useState } from 'react'` | `node_modules/react/package.json` → `exports` field |
| `import { cookies } from 'next/headers'` | `node_modules/next/package.json` → `exports["./headers"]` |
| `import { db } from '@/db'` | `tsconfig.json` → `paths["@/*"]` → on-disk file |

The pedagogical goal: make the algorithm visible in one glance. Three different specifiers, three different resolution rules, no overlap. The student should leave able to predict where any bare specifier resolves from.

**Text accompanying the diagram:**

- One paragraph defining "bare" specifier: no `./`, `../`, or absolute path. The resolution rule splits three ways.
- A short paragraph per row:
  - **Package name** (`'react'`). Node walks `node_modules/` upward, finds `react/package.json`, reads its `exports` field, and resolves to the file the package names. In 2026, `exports` is the source of truth — `main` is the legacy fallback.
  - **Subpath inside a package** (`'next/headers'`). Resolved against the package's `exports` field with the subpath key. The senior takeaway: a subpath the `exports` field does not list **does not resolve**, even if the file is on disk — this is how libraries communicate their public surface (Node throws `ERR_PACKAGE_PATH_NOT_EXPORTED`).
  - **TypeScript path alias** (`'@/db'`). Not a `node_modules` lookup. Resolved against `tsconfig.json`'s `paths` field (already set up in the starter from chapter 003 lesson 8). The bundler and `tsc` both read the same `tsconfig.json`; they agree on the resolution.
- One sentence naming the daily 2026 subpath surface a SaaS engineer reaches for: `next/cache`, `next/headers`, `next/navigation`, `next/server`, `zod/v4`.

`Term` candidates here: **exports field** (definition: "Field in package.json that declares which files a package makes importable; subpaths not listed here are blocked even if the file exists.") and **path alias** (definition: "tsconfig.json mapping that lets `'@/lib/db'` resolve to a project-relative file. Bundler and tsc both read tsconfig.").

## JSON imports with the `with` attribute

- One paragraph: importing a JSON file as a module requires the `with { type: 'json' }` import attribute in 2026. The attribute is mandatory in modern Node and required by the spec for security — the runtime validates the MIME type before parsing. JSON modules expose **only a default export** — there are no named exports on a JSON module, so the binding form is always default.
- One `Code` block:
  ```ts
  import config from './config.json' with { type: 'json' };
  ```
- One sentence on the watch-out: the runtime materializes JSON imports before module evaluation, so the syntax works in static positions only. For dynamic JSON imports, the second-argument form is `await import('./config.json', { with: { type: 'json' } })`.
- One sentence forward link: the JSON parse-with-Zod story at the wire boundary lives in chapter 009 lesson 1.

## Recognition exercise

Close the lesson with a `Buckets` exercise — recognition confirmation, not a sandbox. Use a `twoCol` layout.

**Buckets:**
- `Named import or export`
- `Default import or export`
- `Side-effecting import`
- `Dynamic import`
- `Type-only import or export`
- `Re-export`

**Items (twelve):**

1. `import { Button } from './ui/button'` → Named
2. `import 'server-only'` → Side-effecting
3. `import Page from './page'` (the file uses `export default`) → Default
4. `import type { User } from '@/db'` → Type-only
5. `const m = await import('./heavy-chart')` → Dynamic
6. `import config from './config.json' with { type: 'json' }` → Default (the binding form is a default import; the lesson just taught JSON modules expose only a default export — this is the recognition test for that point)
7. `import { cookies } from 'next/headers'` → Named
8. `export { createInvoice } from './actions'` → Re-export
9. `import { createUser, type User } from './users'` → Named (the inline `type` modifier does not change the overall shape — this is a recognition trap; **add a note** in the post-check explanation that the statement mixes a value import with a type modifier, but the binding form is still named)
10. `import './globals.css'` → Side-effecting
11. `import 'client-only'` → Side-effecting
12. `import { sql } from 'drizzle-orm'` → Named

> Authoring note: item 6 (JSON `with` attribute, classified as Default) and item 9 (inline `type` modifier, classified as Named) are the deliberately tricky ones. Both teach a recognition skill the lesson body installed; do not soften them by changing their classification.

## External resources

A short `LinkCard` row at the very end. Two cards:

- MDN — `import` / `export` reference page.
- TypeScript handbook — `verbatimModuleSyntax` and type-only imports.

No video for this lesson. The content is structural recognition; a video would dilute it.

# Scope

**This lesson teaches:**
- The four import-export shapes (named, default, side-effecting, dynamic) with the canonical 2026 trigger for each.
- The named-vs-default senior cut.
- The type-only import discipline (restated from chapter 004 lesson 8, named under `verbatimModuleSyntax` failure mode).
- Re-exports and the barrel-file rule.
- Bare-specifier resolution: package name, subpath, path alias.
- JSON imports with the `with` attribute.

**This lesson does NOT teach (reserved for later):**
- Module evaluation order, depth-first traversal, live bindings, circular imports — **lesson 2 of this chapter.**
- Dynamic `import()` as a code-splitting tool, `next/dynamic`, route-level splitting — **lesson 2 of this chapter.**
- `"use client"` semantics, what `'server-only'` and `'client-only'` enforce at build time, the bundle boundary — **lesson 2 of this chapter.**
- Top-level `await`, the cascading-async cost, lazy-init `getDb()` patterns — **lesson 3 of this chapter.**
- `declare module` augmentation of third-party types — **lesson 4 of this chapter.**
- CommonJS, `require()`, `module.exports`, AMD, UMD, SystemJS — the course is ESM end-to-end. Not mentioned.
- Authoring a publishable package's `exports` field — out of scope; the course writes app code.
- The JSON parse-with-Zod story at wire boundaries — **chapter 009 lesson 1.**
- `import.meta` surface (`import.meta.url`, `import.meta.glob`) — niche in 2026 Next.js code; not mentioned.

**Prerequisites the student already has** (restate concisely if needed, do not re-teach):
- `import type` discipline under `verbatimModuleSyntax` from chapter 004 lesson 8 (named in one sentence).
- `@/*` path alias from `tsconfig.json` paths field, set up in chapter 003 lesson 8 (named in one sentence at the bare-specifier section).
- Branded IDs are not relevant to this lesson; do not pull them in.

# Code conventions alignment

- All code blocks use single quotes (Biome canonical).
- Two-space indent, semicolons on, trailing commas multiline.
- Named exports throughout, except where a code sample demonstrates a Next.js App Router special file (`page.tsx`, etc.) where the default-export form is the lesson.
- `import type` on its own line when purely type-only; the inline `type` modifier when the file needs both a value and a type from the same module — both forms are taught explicitly in this lesson.
- Side-effecting imports (`import 'server-only'`, `import './globals.css'`) appear first in any composite snippet, before group 1 (external packages). The course's three-group import order (external → `@/` aliases → relative) is the implicit shape across all examples but is not the lesson's subject — do not break flow to explain it.
- Show the `with { type: 'json' }` attribute exactly as the 2026 spec uses it (lowercase `with`, `type: 'json'`).

# Authoring notes for downstream agents

- The lesson is **reference / survey** — every section is short. Resist the urge to expand any one form into a deep-dive. The deep-dives are lessons 2, 3, and 4.
- Code blocks dominate. Prose is one or two sentences per shape, plus one paragraph per cross-cutting concern (type-only, re-exports, bare specifiers, JSON).
- The bare-specifier diagram is the only visual aid. Build it as **plain HTML + CSS** inside a `<Figure>` — three rows, two columns each, with a simple arrow glyph or matched color tint connecting columns. Do not reach for `<ArrowDiagram>` (overkill), Mermaid (label-only boxes), or D2 (heavyweight for three rows). Cap the figure at ~280px tall.
- The `Buckets` exercise is the only interactive element. No sandbox, no `ScriptCoding`, no `TypeCoding`. The lesson's job is recognition; the exercise is recognition confirmation.
- Forward links are one parenthetical each — "lesson 2 of this chapter teaches X" — never a paragraph.
- Do not generate a "summary" or "recap" section. The `Buckets` exercise is the recap.
