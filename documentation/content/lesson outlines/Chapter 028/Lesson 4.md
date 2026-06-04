# Lesson 4 — Configuring tsconfig

## Lesson title

Chapter-outline title "Configuring tsconfig" fits — it is a walkthrough of the provided file. Keep it.

- Page title: `Configuring tsconfig`
- Sidebar title: `tsconfig`

## Lesson type

`Walkthrough`

No student code is written — the project ships `tsconfig.json` fully configured. The student reads the provided file, learns the two-owner mental model, and confirms `tsc --noEmit` runs clean. No `Implementation` brief, no test file, no test-coder run.

## Lesson framing

The student walks away able to read any `tsconfig.json` through a senior lens: which flags are the *project's* strictness floor (the bug classes the type-checker is told to catch before code ships) and which are the *framework's* compatibility surface (the flags that make TypeScript, the bundler, and the runtime agree on what a module is). The payoff is a default that holds across every project in the course — never operate below `strict`, treat the compatibility flags as Next.js's to own, and know the one or two strictness levers worth reaching for past the baseline. By the end the student can justify each line of the shipped config and has run the typecheck gate clean.

## Codebase state

**Entry** — the provided `start/` scaffold with the pnpm toolchain and `AGENTS.md` already understood from Lessons 2 and 3: `package.json` (with `packageManager`, `engines`, and the `verify`/`check`/`test:lesson` scripts), `.mise.toml` pinning Node 24 + pnpm 11.3.0, `.npmrc`, `pnpm-workspace.yaml`, the committed `pnpm-lock.yaml`, and the root `AGENTS.md`. `node_modules` is installed (so `node_modules/typescript` exists). The provided `tsconfig.json` is present but not yet read critically; the eleven `TODO(Ln)` component/hook scaffolds are untouched.

**Exit** — the student understands the provided `tsconfig.json` end to end: the strictness floor (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, the `@/*` path alias) and the compatibility surface (`target`/`lib`, `module`/`moduleResolution: "bundler"`, `verbatimModuleSyntax`, `isolatedModules`/`esModuleInterop`/`resolveJsonModule`, `jsx: "react-jsx"`, `noEmit`/`incremental`/`skipLibCheck`/`allowJs`, the `next` plugin, `include`/`exclude`). `tsc --noEmit` runs clean. No code in `src/` has changed.

## Lesson sections

This is a walkthrough — step-by-step prose organized by the two halves of the file, no exercises, no `<details>`. The shipped file (read from `projects/Chapter 028/solution/tsconfig.json`, identical in `start/`) is the spine; sections follow its top-to-bottom order grouped by owner.

### Introduction (no header)

State the senior framing: `tsconfig.json` has two owners. The *project* owns the strictness floor — the flags that decide which classes of bugs the type-checker catches before code ships. *Next.js* owns the compatibility surface — the flags that make TypeScript, the bundler, and the runtime agree on what a module is. Both halves live in one file; the split is mental, not physical, and naming it makes the file readable. Close the intro with the rule of thumb that anchors the whole lesson: tempted to edit a compatibility flag, you're probably wrong; tempted to edit a strictness flag, you're probably right.

Open with the full file shown once so the student sees the whole before the parts. Use `Code` (JSON, `tsconfig.json` title) for this complete listing — it is ~30 lines and the reader needs the shape before the walkthrough dissects it.

### The strictness floor (project-owned)

The first H2. Walk the five project-owned flags, one line each on the bug class caught. This is the section the student is allowed — encouraged — to carry to every project, so it gets the depth.

- `"strict": true` — umbrella for the eight individual checks (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`). Frame: anything below `strict` is not TypeScript, it's JSDoc with hints. The course never operates below this floor.
- `"noUncheckedIndexedAccess": true` — `array[i]` / `record[key]` returns `T | undefined`. Catches reading past an array end or a missing key and silently passing `undefined` downstream. Name the cost (the student handles the `undefined` case) and why the course pays it (the bug shows up on the 1% missing case in production reads). Flag this as the one the student feels most in everyday code.
- `"noFallthroughCasesInSwitch": true` — a `case` without `break`/`return` errors. Catches the ambiguous-fallthrough pattern where the next reader can't tell intent.
- `"noImplicitOverride": true` — overriding a base method without `override` errors. Free insurance for the rare class hierarchies.
- `"forceConsistentCasingInFileNames": true` — refuses imports differing in case from the on-disk name. Catches the case-insensitive-Mac-works / case-sensitive-CI-Linux-breaks "works on my machine" bug; one of the cheapest preventers in the file.

Use `AnnotatedCode` here: a single JSON block of the five strictness lines, each step highlighting one flag with its bug-class explanation, so the student's attention lands on one flag at a time rather than a wall of prose beside a wall of JSON.

After the five flags, one short subsection (H3) **The flag the project leaves off** — `"exactOptionalPropertyTypes"` distinguishes `{ foo: undefined }` from `{}`, a real bug class, but in 2026 many third-party types still produce values that fail it and the workarounds (`as` casts, conditional spreads) noise up call sites more than the safety pays back. Named so the student knows it exists and the trigger to enable it (a codebase where optional-vs-absent genuinely diverges and the deps cooperate). Use an `Aside` (note) for this rather than a full code walk.

### Path aliases (project-owned)

H3 under the strictness floor or its own short H2 — author's call; keep it adjacent to the strictness material since it is the project's other lever. Walk `"paths": { "@/*": ["./src/*"] }`. Two senior questions answered in prose: why aliases at all (refactor safety — moving a file doesn't break a hundred `'../../../lib/foo'` imports), and why `@/` specifically (Next.js App Router convention, recognized by every editor and AI tool, no debate). Name that with `moduleResolution: "bundler"` no `baseUrl` is needed — the path resolves relative to the `tsconfig` location, and the project omits `baseUrl`.

One callout (Aside, tip) on the runtime-resolution split: `tsconfig` paths are *checked* by `tsc` and *resolved* by the bundler — Turbopack at build, and Vitest via `resolve.tsconfigPaths: true` in `vitest.config.ts` (Vitest 4 native, no plugin). Standalone scripts run through `tsx`, not Node's native type-stripping (from lesson 8 of chapter 003), because native stripping does not read `tsconfig.json`. Show the relevant `vitest.config.ts` `resolve` block as a small `Code` snippet so the student sees where the alias is honored at test time.

### The compatibility surface (framework-owned)

The second H2. Walk each group by the agreement it enforces between TypeScript, the bundler, and the runtime. Lighter touch than the strictness floor — the point is *don't touch these*, not *master each one*.

- `"target": "ES2022"` + `"lib": ["dom", "dom.iterable", "esnext"]` — what JS features TS emits and which built-in types it knows. `ES2022` is broadly the Next.js 16 floor; `lib` includes DOM so client components type-check against `window`/`document`, and `esnext` so the latest standard-library types are available at the type level.
- `"module": "esnext"` + `"moduleResolution": "bundler"` — how `import`/`export` are interpreted and how the resolver finds files. `bundler` (TS 5+) aligns with how Turbopack actually resolves imports.
- The transpiler-alignment group: `"verbatimModuleSyntax": true`, `"isolatedModules": true`, `"esModuleInterop": true`, `"resolveJsonModule": true`.
  - `"verbatimModuleSyntax": true` — forces `import type` on every type-only import; emit follows the source verbatim. The bug class it catches: a type-only import accidentally pulling a runtime module's side effects onto the client. NOTE TO WRITER: the shipped config sets this `true` (line 12 of the real file). Author it as an enabled strictness-adjacent flag, not as omitted. See Scope note below — the chapter outline's prose describing this flag as *off* is stale relative to the codebase; follow the file.
  - `"isolatedModules": true` — every file must transpile in isolation. Required by Turbopack; catches `const enum` and type-only barrel re-exports that the framework can't compile single-file. Pairs naturally with `verbatimModuleSyntax`.
  - `"esModuleInterop": true` — smooths CJS↔ESM interop so `import x from 'cjs-pkg'` works; less load-bearing on App Router but on for the legacy CJS deps the ecosystem still ships.
  - `"resolveJsonModule": true` — `import data from './x.json'` with the JSON typed. One line.
- `"jsx": "react-jsx"` — TS emits the React 19 automatic JSX runtime directly, no `import React`; not the older `preserve` mode.
- `"noEmit": true` — TS only type-checks, never writes `.js`. The companion command is `tsc --noEmit`, folded into the `verify` script (`biome ci . && tsc --noEmit && next build` in the provided `package.json`) — same flag, separate process, type-checking without competing with the build.
- `"incremental": true`, `"skipLibCheck": true`, `"allowJs": false` — the standard Next.js floor: cache type-check results between runs (speed), skip type-checking dependency `.d.ts` files (speed), forbid `.js`/`.jsx` sources (TS-only project).
- `"plugins": [{ "name": "next" }]` — the Next.js TypeScript plugin, editor-level. Adds type-checking for the metadata API, route params, dynamic segments, and the App Router typed-routes validator.

Use `AnnotatedCode` again for the compatibility block, grouped (target/lib, module/resolution, the transpiler group, jsx, the emit/speed group, the plugin) so each step is one agreement rather than one line. Keep each step's prose to a sentence or two — this half is read-don't-edit.

### include / exclude

A short H3 closing the compatibility walk. `"include"`: `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts` (the last two are Next.js's auto-generated typed-route output). `"exclude"`: `node_modules`. Use a small `Code` snippet of the two arrays.

### next-env.d.ts

H2 or H3. One paragraph: Next.js generates this file on first run, it references the framework's ambient types via `/// <reference>` directives plus the routes import, and the student commits it (required at build time) but never edits it. Make the "never edit" rule concrete by quoting the file's own comment header — show the actual `next-env.d.ts` contents as a small `Code` block so the student sees the `// NOTE: This file should not be edited` line and the link it points to.

### The senior rule (closing)

Short closing prose, no new header needed — fold into the `next-env.d.ts` section or a brief wrap. Restate plainly: the compatibility flags are not personal preference; resist hardening them past what Next.js sets because the framework's correctness depends on them. The strictness floor is the lever you own. Optionally name the editor-alignment step: set `typescript.tsdk` in `.vscode/settings.json` (from lesson 7 of chapter 003) to the workspace TypeScript so the editor's diagnostics match the build's — one sentence, since `node_modules/typescript` now exists.

### Verification

The walkthrough closes on the typecheck gate, not a test suite (no `pnpm test:lesson` for this lesson). Show the command `pnpm verify` runs internally and the standalone form `tsc --noEmit`; state the expected outcome on success: no output, exit 0, the typecheck passes clean against the provided config. Use `Steps` for the command + expected result. One sentence on `pnpm verify` running the full gate (Biome CI + `tsc --noEmit` + `next build`) so the student knows where the typecheck sits in the shippability check (the full `verify` gate is owned by Lesson 5 — link, don't re-explain).

### Code sample handling — summary

- Full `tsconfig.json` once at the top: `Code` (JSON).
- Strictness floor flags: `AnnotatedCode`, one flag per step.
- Compatibility surface flags: `AnnotatedCode`, one agreement-group per step.
- `vitest.config.ts` `resolve` block, `include`/`exclude` arrays, `next-env.d.ts` contents: small `Code` snippets.
- `exactOptionalPropertyTypes` omission and the path-resolution split: `Aside` (note / tip).
- Verification command: `Steps`.

No diagram. The two-owner split is carried by the two H2 sections and the intro's framing; a box diagram would add nothing a labeled split already gives. No `CodeVariants`, `CodeTooltips`, or `FileTree` — there is no before/after, no inferred-type focus, and no starter tour in this lesson.

## Scope

This lesson covers only `tsconfig.json` and its companion `next-env.d.ts` plus the `tsc --noEmit` typecheck. It does not cover:

- The Biome linter/formatter floor and the full `pnpm verify` gate — Lesson 5 of chapter 028.
- pnpm pinning, the lockfile contract, `package.json` `engines`/`packageManager`, `.npmrc`, `.mise.toml` — Lesson 2 of chapter 028.
- `AGENTS.md` and the conventions-pointer doctrine — Lesson 3 of chapter 028; the deeper documentation doctrine is Chapter 101.
- `next.config.ts` (`reactCompiler`, `turbopack.root`) and `components.json` — provided, not walked through here.
- `tsx` vs. Node native type-stripping mechanics — lesson 8 of chapter 003 (referenced for the path-resolution gotcha only).
- Writing any `src/` component code against the strict config — Lessons 6–12 of chapter 028.

NOTE TO ORCHESTRATOR / WRITER — codebase vs. outline conflict: the chapter outline (Chapter 028.md, Lesson 4 goals) states the provided config does *not* set `verbatimModuleSyntax` and frames it as a leave-off flag. The actual shipped `tsconfig.json` (`projects/Chapter 028/solution/tsconfig.json` line 12, identical in `start/`) sets `"verbatimModuleSyntax": true`. This outline follows the codebase (source of truth) and authors the flag as enabled, in the transpiler-alignment group alongside `isolatedModules`. The writer should mirror the real file; do not re-introduce the "leave it off" framing from the stale outline prose.
