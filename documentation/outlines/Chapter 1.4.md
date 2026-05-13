# Chapter 1.4 — The first project scaffold

## Chapter framing

Chapter 1.2 pinned the runtime and the package manager. Chapter 1.3 pinned the editor and the panels that prove code in the browser. This chapter is where the student opens an actual Next.js application for the first time — clones it, starts it, reads the file tree, hardens the TypeScript config, and locks down the environment variable surface so a missing `DATABASE_URL` fails the build instead of the first production request.

The senior framing for the chapter: **the scaffold is not a tutorial app. It is the first commit of a SaaS codebase the student will carry forward for the rest of the course.** Every choice the starter makes — file layout, tsconfig flags, env validation, the `AGENTS.md` at the root — is a choice the student would defend in a code review. The chapter teaches the why behind each one so the student isn't running configurations on faith.

Threads that must run through every lesson:

- **The starter is the deliverable, not a learning sandbox.** The chapter does not have the student `create-next-app` from scratch. The course's starter (fetched via `degit` from the projects monorepo, the pattern named in 1.1.5) lands fully wired — Next.js 16, React 19, Tailwind v4, Drizzle skeleton, `@t3-oss/env-nextjs`, Biome already aligned with the `biome.json` from Chapter 1.3. The lesson reads the scaffold and explains what each piece is doing. The student does not assemble it from raw materials, and they do not run `pnpm create next-app` — the course never goes through the wizard because the wizard's choices drift, and committing to a pinned starter is the senior move.
- **Next.js 16 owns the bundler decision.** Turbopack is the stable default for `next dev` and `next build` as of Next.js 16 (February 2026). The chapter does not mention Webpack as a default or as a fallback the student should know — one line in 1.4.1 names the `--webpack` opt-out for legacy reasons and moves on. No `--turbo` flag anywhere, ever.
- **`next lint` is gone.** Confirmed in Chapter 1.3.2; the scaffold has Biome wired through `pnpm` scripts that match 1.3.2's `format` / `lint` / `check` / `check:ci`. The student should recognize the scripts from the previous chapter.
- **`tsconfig.json` has two owners.** The project owns the strictness floor (the flags that catch bugs); Next.js owns the compatibility surface (the flags that make TypeScript and the bundler agree). Splitting the two lessons (1.4.3 and 1.4.4) makes the ownership boundary visible — the student leaves knowing which flags they would edit in a real project and which ones they leave alone because the framework wrote them.
- **Env validation is non-negotiable, from the first project.** The `env.ts` file is wired before the student has anything to do with it — they read it, name what it prevents, and confirm the build fails when they remove `DATABASE_URL`. This is the first encounter with the "fail-closed at the boundary" discipline that anchors Architectural Principle #3 later and SaaS pattern #12 in Unit 17.
- **No application code yet.** The chapter ships the scaffold, an `AGENTS.md`, a `tsconfig.json` reading, and an `env.ts`. The student opens `app/page.tsx` to confirm the dev server works; they do not write components. JSX, React, and Tailwind earn their treatment in Units 4 and 5; even the Server Component vs. Client Component distinction is parked. The student finishes the chapter ready for Unit 2 (JavaScript / TypeScript fundamentals at adult depth) on a known-good codebase.

The student finishes the chapter with:

- The course starter cloned (via `degit`), `pnpm install` clean, `pnpm dev` serving on `localhost:3000`, `pnpm build` succeeding.
- A read of the file tree they can defend in a sentence per file.
- An `AGENTS.md` at the root they understand the purpose of.
- A `tsconfig.json` they can read end to end — which flags they own, which Next.js owns, what each one catches.
- An `env.ts` they trust to fail the build before deploy if a required variable is missing.

Chapter 2.1 lands on this codebase and starts teaching JavaScript values, references, and equality without re-explaining anything in 1.4.

---

## Lesson 1.4.1 — Cloning the starter and the dev/build cycle

Topics to cover:

- The senior question: why does the course ship a starter instead of running `create-next-app`. Two reasons named plainly. First, the wizard's defaults drift across releases — the course pins May 2026's choices and ships them as a frozen commit, so a student starting six months from now lands on the same scaffold the course was written against. Second, the wizard does not produce the file layout, the strictness flags, the env validation, or the `AGENTS.md` the course teaches — recreating those from the wizard's output would take the chapter sideways. The starter is the senior call.
- Fetching the starter with `degit`. The command pattern from 1.1.5 is invoked here for the first time: `pnpm dlx degit react-saas-course-projects/unit-1-starter project-name`. Why `degit` over `git clone`: it pulls the folder contents without history, which is what the student wants — they are about to commit this as their own first commit, not fork the course's repo. One line on the projects monorepo layout (one folder per project, the `starter/` and `solution/` siblings from Projects.md) so the student knows what they're pulling from.
- `pnpm install` against the pinned `pnpm-lock.yaml` from the starter. The student sees the install run and the symlinks appear; this is the moment everything from Chapter 1.2 fires.
- The file tree, read once end to end. The expected shape, with one sentence per entry on what it is and why it earns a seat:
  - `app/` — the App Router root. `layout.tsx` (the root layout, the place the `<html>` and `<body>` live), `page.tsx` (the index route), `globals.css` (Tailwind entry, one `@import "tailwindcss";` line, no SCSS, no PostCSS gymnastics).
  - `lib/` — pure code, no side effects at import time. Empty for now, named so its purpose is clear.
  - `db/` — Drizzle skeleton. An empty `schema.ts` and a `client.ts` that exports the Drizzle client wired to `env.DATABASE_URL` (the validated export from `env.ts`, taught in 1.4.5). Unit 6 fills the schema; here the wiring exists so the env validation has something real to gate.
  - `env.ts` — the @t3-oss/env-nextjs validator. Read here at the file-tree level, taught in 1.4.5.
  - `next.config.ts` — Next.js configuration, TypeScript-authored. Empty config object for now; the security baseline (Unit 17) adds headers here, the bundle analyzer (Unit 20) adds the plugin here.
  - `tsconfig.json` — the file the next two lessons teach.
  - `biome.json` — already aligned with Chapter 1.3.2.
  - `.editorconfig`, `.vscode/`, `.mise.toml`, `.npmrc` — recognized from Chapter 1.2 and 1.3.
  - `package.json` — the four Biome scripts from 1.3.2 plus the three Next.js scripts (`dev`, `build`, `start`).
  - `AGENTS.md` — the file the next lesson explains.
- The three Next.js scripts, with one line each on what they do and when a senior reaches for each.
  - `pnpm dev` — Next.js dev server on `localhost:3000`, Turbopack bundling, fast refresh, the loop the student lives in for development. Default port and the `-p` flag named for the case where another process is on 3000.
  - `pnpm build` — production build through Turbopack, type-checks, runs the linter integration the project owns (Biome via the `check:ci` script in CI, not at build time — named here so the student doesn't expect `next build` to fail on a Biome diagnostic), emits the optimized output. Two senior calls: `pnpm build` is what CI runs on every PR, and the build's success is the first proof that the code is shippable. The minute or two it takes is the cost of catching type errors and missing env vars before they reach a user.
  - `pnpm start` — serves the production build locally. Used to confirm the build runs end-to-end before pushing to deploy; not the development surface.
- Turbopack as the default. One paragraph: Turbopack went stable in Next.js 16 (February 2026) and is now the default for both `next dev` and `next build`, no flag required. The student does not need to think about this — the only reason to name it at all is so they recognize the bundler name in CI logs and Next.js error messages, and so they don't go looking for a `--turbopack` flag in older blog posts. Webpack is the conditional fallback past `--webpack`, mentioned in one line for the inheritance case (a legacy `next.config.js` with custom Webpack rules the team hasn't ported yet) and dropped.
- The first run. The student runs `pnpm dev`, sees the Next.js welcome page (or the starter's placeholder) on `localhost:3000`, and then runs `pnpm build` to confirm the production path works. The build's output — route summary, static vs. dynamic, bundle sizes per route — is named in passing as something the student will look at in Unit 20 (performance), not parsed here.
- The `.gitignore` worth a glance. `node_modules/`, `.next/`, `.env*.local`, plus the conventional set. `pnpm-lock.yaml` is **not** in it — Chapter 1.2.3 made that rule load-bearing; the starter respects it.
- Initial commit. One paragraph naming what the student is about to commit: every file in the tree they just read, the lockfile, the `AGENTS.md`, the `env.ts`. Not the `.env.local` (which 1.4.5 introduces and which the `.gitignore` excludes). The senior framing: the first commit on a SaaS codebase is the moment the toolchain decisions become permanent. The student isn't initializing a sandbox; they're starting a project.

What this lesson does not cover:

- The contents of `AGENTS.md` (1.4.2).
- The contents of `tsconfig.json` (1.4.3 and 1.4.4).
- The contents of `env.ts` (1.4.5).
- Writing any application code. `app/page.tsx` is read as proof-of-life, not edited.
- The Drizzle client wiring or Postgres setup — Unit 6 owns that. The `db/client.ts` file exists so 1.4.5 has a real env variable to gate.
- The Server Component / Client Component distinction. Unit 5 owns it.
- Deploying to Vercel — Unit 21 owns it. `pnpm start` is the local proof, not a deploy story.

Pedagogical approach:

Setup/wiring archetype with a Decision opening. Open with one paragraph naming why the course ships a starter, then a `Steps` block that walks the four commands: `degit`, `pnpm install`, `pnpm dev`, `pnpm build`. Show each command and its expected output in adjacent labeled blocks; the student sees the bundler line ("Turbopack" in the dev banner, the build summary in production output) and the page rendering on `localhost:3000`. After the commands, a `FileTree` component renders the project root with annotations on each entry — that's the lesson's center of gravity, because the file tree is the map the student will read against every later chapter. Close with one `Matching` exercise pairing six files in the tree ("the route that renders `/`," "the place imports without side effects belong," "the file CI uses to type-check," "the file Biome formats against," "the file pnpm reads to know which package manager runs," "the file the dev server reads to know which Node version to use") to their location, so the student leaves with the tree in working memory. No sandbox: the lesson's deliverable is a running app and a committed scaffold.

Estimated student time: 30 to 35 minutes.

---

## Lesson 1.4.2 — AGENTS.md as the next contributor's briefing

Topics to cover:

- The senior question: what is the file the next person to open this repo (human or AI agent) should read first, and what earns a place in it. `AGENTS.md` is that file in 2026. The Linux Foundation adopted it as an Agentic AI Foundation founding project in late 2025; major coding agents (Codex, Cursor, Claude Code, Factory) read it natively. The framing for the course: `AGENTS.md` is **operational onboarding**, not architectural prose — the durable facts the next contributor needs to be productive in their first session.
- The starter ships an `AGENTS.md` at the repo root. The lesson reads it as written, with the student understanding why each section earns a place. Sections in the course's starter, with one-line justifications:
  - **Thesis line** — one or two sentences naming what the project is. Without it, the agent or new contributor has to infer the domain from file names.
  - **Stack core** — pinned versions of the load-bearing libraries (Next.js 16, React 19, TypeScript X.Y, Drizzle X.Y, Better Auth, etc.) so an agent doesn't hallucinate an old API surface.
  - **Repo layout** — the file tree by directory with one line per directory on what lives there. Same content as 1.4.1's tree, expressed in prose. Saves the next contributor the discovery step.
  - **Commands** — the daily commands (`pnpm dev`, `pnpm build`, `pnpm check`, `pnpm test` once it exists, the Drizzle scripts later) so an agent doesn't try `npm run …`.
  - **Conventions** — pointers to where the conventions live (the `biome.json`, the `.editorconfig`, this chapter's `tsconfig.json`). The conventions are not duplicated in prose; the agent is told where to look.
  - **Additional project context** — links to longer docs the agent should pull in *only when needed* (the course's projects ship a small set, e.g. the schema doc in Unit 6, the security baseline in Unit 17). Conditional reading so the file stays short.
- What does **not** earn a place. Stated as a hard list because the failure mode of `AGENTS.md` is bloat — a 2026 research finding (Gloaguen et al., real-world repos) shows that LLM-generated context files reduce agent task success, and even hand-written files only help when minimal and precise. The course's hard cuts:
  - Aspirational architecture statements. ("This codebase strives to be clean and maintainable.") Add nothing; cut.
  - Marketing copy. Not the readme.
  - Tutorials. The agent doesn't need to be taught Next.js; it needs to know which Next.js this repo runs on.
  - Anything that duplicates a more authoritative source. The `biome.json` is the source of truth for formatting rules; `AGENTS.md` references it, never restates it.
  - Hand-maintained file trees that age out the moment a directory is added. The course's `AGENTS.md` lists *directories* (the architectural shape) but not individual files (which drift).
  - Decisions that should be ADRs. Architectural Decision Records get their own treatment in Chapter 22.1; `AGENTS.md` points at the ADR directory if it exists, doesn't inline the decisions.
- The discipline. One paragraph naming the test the file passes or fails: if a section is the same five lines six months from now even though five PRs landed, it's earned its place. If it ages out on the next refactor, it doesn't belong.
- The Chapter 22.1 forward link, named once. Documentation that lives next to code, the wider doctrine, owns the deeper treatment. This lesson covers the file at first-project depth so the student isn't confused when the scaffold lands with one already.
- One concrete edit the student makes. Personalize the thesis line of the shipped `AGENTS.md` — replace the placeholder project name and the one-sentence description with the student's own. This is the only edit the chapter asks them to make in the file; the structural sections (stack, layout, commands, conventions) are already correct because the starter wrote them.
- A note on naming. Some teams use `CLAUDE.md`, `.cursorrules`, or tool-specific equivalents. 2026 consensus has converged on `AGENTS.md` as the open spec; tool-specific files can exist alongside but should re-export or reference `AGENTS.md` rather than duplicate. Stated in one line; the course commits to `AGENTS.md`.

What this lesson does not cover:

- How to write documentation more broadly (Chapter 22.1).
- TSDoc, code comments, or team review discipline (Chapter 22.2 and 22.3).
- ADR authoring (Chapter 22.1 and the Unit 22 project).
- Tool-specific configuration of how each AI tool reads `AGENTS.md` (out of scope; the file is the same regardless of reader).

Pedagogical approach:

Concept archetype with a Pattern flavor. Open with the senior question — who reads this file and what does it owe them — in one paragraph; the student needs to know the audience before they read the content. Then a `CodeVariants` or split block showing the course's `AGENTS.md` next to a deliberately bloated counter-example (an `AGENTS.md` with the aspirational paragraph, the duplicated formatting rules, the hand-maintained file list), and prose calling out each block on the bloated side that breaks one of the rules. The student sees the discipline operationally before it abstracts. Close with one short `Buckets` or `TrueFalse` exercise: given eight candidate sections ("project thesis," "pinned stack versions," "the team's CI strategy," "a list of every file in `/app`," "where ADRs live," "the company's mission statement," "the four daily pnpm commands," "the formatting rules"), the student sorts them into "earns a place" or "doesn't." That exercise is the lesson's confirmation that the discipline transferred, not memorization of any specific section.

Estimated student time: 20 to 25 minutes.

---

## Lesson 1.4.3 — The strictness floor the project owns in tsconfig.json

Topics to cover:

- The senior framing for the next two lessons together. `tsconfig.json` has two owners. The project owns the *strictness floor* — the flags that decide which classes of bugs the type-checker catches before the code ships. Next.js owns the *compatibility surface* — the flags that make TypeScript, the bundler, and the runtime agree on what a module is. This lesson covers the first half; 1.4.4 covers the second. Both files live in the same `tsconfig.json`; the split is mental, not physical. Naming it makes the file readable.
- The flags the starter sets, with one line each on the bug class it catches.
  - `"strict": true` — the umbrella flag that turns on the eight individual checks that together make TypeScript actually type-safe (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`). The senior framing: anything below `strict` is not TypeScript, it's JSDoc with hints. The course never operates below this floor.
  - `"noUncheckedIndexedAccess": true` — accessing `array[i]` or `record[key]` returns `T | undefined` instead of `T`. The bug class it catches: reading past the end of an array or a missing key and silently passing `undefined` into the rest of the function. The cost: the student has to handle the `undefined` case (an `if` guard, a non-null assertion at a verified site, a default with `??`). The course leaves the flag on because the bug class shows up in production reads where a 99%-populated record breaks on the 1% case — exactly the failure mode that bites at scale.
  - `"noFallthroughCasesInSwitch": true` — a `case` without an explicit `break` or `return` is an error. Catches the pattern where a senior dev intends to fall through but the next reader can't tell whether the omission was intentional. Cheap to leave on.
  - `"noImplicitOverride": true` — overriding a base-class method without the `override` keyword is an error. The course doesn't lean on inheritance, but the flag is free insurance for the rare class hierarchies that show up.
  - `"forceConsistentCasingInFileNames": true` — refuses imports that differ in case from the on-disk filename. Catches the bug where a Mac filesystem (case-insensitive) lets `import Foo from './foo'` work locally and then breaks in CI on Linux (case-sensitive). One of the cheapest "works on my machine" preventers in the file.
- The flag the starter does **not** set, with the reason.
  - `"exactOptionalPropertyTypes"` — distinguishes `{ foo: undefined }` from `{}`. Real bug class (assigning `undefined` to a key when the type said optional-not-undefined), but the friction is high across the ecosystem in 2026 — many third-party types still produce values that fail this check and the workarounds (`as` casts, conditional spreads) noise up the call site more than the flag's safety pays back. Named here so the student knows it exists and knows the trigger to turn it on (a team that wants the discipline and has the appetite for the workarounds).
- Path aliases — the project's other strictness lever. `"paths": { "@/*": ["./*"] }` paired with `"baseUrl": "."`. Two senior questions: why use aliases at all (refactor safety — moving a file doesn't break a hundred imports written as `'../../../lib/foo'`), and why the course uses `@/` specifically (Next.js's convention since the App Router shipped, recognized by every editor and every AI tool, no debate). One line on the runtime-resolution gotcha: `tsconfig`-defined paths are *checked* by `tsc` and *resolved* by Next.js's bundler; standalone scripts run through `tsx` (not `node` native stripping, from Chapter 1.2.4) because native stripping doesn't read `tsconfig.json`. The student has already seen that distinction in 1.2.4; here it earns its weight.
- The "Use Workspace Version" reminder from Chapter 1.3.1. The strictness floor only fires inside the editor if VS Code is using the project's `typescript` package, not the editor's bundled one. Named once because a misconfigured editor will silently let bugs ship that the flag would have caught.
- One worked example. A pre-seeded `app/page.tsx`-adjacent function reads `process.env.SOME_KEY` (or, more cleanly, a record lookup) without a guard. With `noUncheckedIndexedAccess` on, TypeScript flags the access. With it off, the code type-checks and crashes at runtime when the key is missing. The student sees the flag earn its weight inline.

What this lesson does not cover:

- The flags Next.js sets that align the language with the bundler (1.4.4).
- Writing custom strict-mode utility types (`NonNullable`, narrowing helpers) — Unit 2.5 owns those.
- Editing `tsconfig.json` from this starter — the file is read, not authored. The student walks through what's there and why; the chapter's only authored edits are the `AGENTS.md` personalization (1.4.2) and the `.env.local` file the student copies from `.env.example` (1.4.5).

Pedagogical approach:

Decision archetype with a small Mechanics beat per flag. The lesson is a flag-by-flag walk through the project-owned section of `tsconfig.json`, but the prose around each flag names the **bug class the flag catches** before showing the flag itself — the senior question fires before the syntax. Open with the two-owners framing in one paragraph and a small `Figure` (a Mermaid or annotated SVG) that visualizes the split: the project's strictness flags on one side, Next.js's compatibility flags on the other, both feeding into the same file. Then walk the flags in the order above. For `noUncheckedIndexedAccess` specifically, use a `CodeVariants` or before/after block showing one snippet under the flag on versus off — the student sees the type signature change inline. For the path aliases, show the resolved file tree and the import statement side by side. Close with one `PredictOutput`-style exercise: given five snippets, each violating one of the flags the lesson named, the student picks which flag would catch each. The exercise is the confirmation; no sandbox (the flags are policy, not a thing to play with).

Estimated student time: 30 to 35 minutes.

---

## Lesson 1.4.4 — The compatibility flags Next.js owns in tsconfig.json

Topics to cover:

- The framing carried from 1.4.3. The flags in this lesson exist because TypeScript, the bundler, and the runtime have to agree on what a module is, what target environment the code runs against, and which DOM/Node types are available. A senior does not edit these flags on a Next.js project — Next.js writes them, the project respects them, and the consequences of fighting the framework here are subtle and slow to surface. The lesson's job is to make the flags readable so the student isn't superstitious about them.
- The compatibility flags the starter ships, in groups.
  - `"target": "ES2022"` and `"lib": ["dom", "dom.iterable", "esnext"]` — what JavaScript features TypeScript can emit, and which built-in types it knows about. `ES2022` is broadly the floor Next.js 16 sets; `lib` includes DOM so client components type-check against `window`, `document`, etc., and `esnext` so the latest standard-library types (ES2025 Set methods, iterator helpers from Chapter 2.3.4 and 2.3.5) are available at the type level. The student does not edit these; the framework knows the right values.
  - `"module": "esnext"` and `"moduleResolution": "bundler"` — how `import`/`export` are interpreted and how the resolver finds files. `bundler` is the modern moduleResolution mode (TypeScript 5+) that aligns with how Turbopack actually resolves imports. The senior watch-out: older codebases use `"moduleResolution": "node"` or `"node16"`; on a fresh Next.js 16 scaffold, the right value is `bundler`. One line.
  - The transpiler-alignment trio — the part of the lesson where the flags do real work and the student needs to know them by name even if they don't edit them.
    - `"verbatimModuleSyntax": true` — forces the student to write `import type { Foo }` for type-only imports and rejects the `import { Foo }` form when `Foo` is only a type. The bug class it catches: a type import accidentally pulling in a runtime module's side effects on the client when the type was supposed to be erased. Without the flag, the bundler can include a server-only module in a client bundle because the import statement looked like a value import. With it, TypeScript fails the build at the import site. Named here because Unit 5 (server/client boundary) leans on this hard.
    - `"isolatedModules": true` — every file must be transpilable in isolation, without information from other files. Required by Turbopack (and by `esbuild`/`swc` generally, the family of bundlers the course operates against). Catches `const enum` (which can't be isolated), barrel re-exports of types without `export type`, and a handful of other patterns the framework can't compile. The student doesn't have to know the patterns by heart; the flag fails the build on the rare case.
    - `"esModuleInterop": true` — smooths over the CommonJS-vs-ESM interop friction so `import express from 'express'` works against a CommonJS module. Less load-bearing on App Router (most of the surface is ESM) but still on for compatibility with the legacy CJS dependencies the ecosystem still ships. Named once and dropped.
  - `"jsx": "preserve"` — TypeScript leaves JSX in the source; Next.js's compiler handles the transformation. The student does not edit this.
  - `"noEmit": true` — TypeScript only type-checks; it never writes `.js` files. Necessary because Next.js's bundler is what actually compiles the code; if `tsc` also emitted, the build would have two source-of-truth outputs. The companion script the course runs in CI (per Chapter 1.2.4) is `tsc --noEmit` — same flag, separate process, type-checking the codebase without competing with the build.
  - `"plugins": [{ "name": "next" }]` — the Next.js TypeScript plugin in the editor. Adds editor-level type-checking for the metadata API, route parameters, dynamic route segments, and the validator for the App Router's typed routes. The student does not edit this; recognizing the line keeps them from deleting it.
  - The `"include"` and `"exclude"` arrays — the files TypeScript looks at and the ones it skips. `"include"` typically lists `next-env.d.ts` (Next.js's generated declarations — never edit, always commit), the `.next/types/**/*.ts` directory (Next.js's typed-route output, auto-generated), `**/*.ts`, `**/*.tsx`. `"exclude"` lists `node_modules` and a couple of build outputs. Named once; the student does not edit these on a fresh scaffold.
- The senior rule across the lesson, stated plainly. **The flags in this lesson are not personal preference.** The student should resist the temptation to "harden" them past what Next.js sets, because the framework's correctness depends on them. The strictness lever is the file in 1.4.3; the compatibility lever is left to Next.js.
- The `next-env.d.ts` file. One paragraph: Next.js generates it on the first run, the file references the framework's ambient types, and the student commits it (the file's presence is required at build time) and never edits it. The "never edit" rule is concrete because the file has a comment header saying so; the student should recognize that comment.
- The path-aliases pairing with 1.4.3. The `paths` declaration sits in this file because it's read by `tsc` and the bundler at the same time — but the *decision* to use `@/*` is project-owned, taught in 1.4.3. The split is intentional and the student sees the file as a single artifact even though two lessons read different halves.

What this lesson does not cover:

- Writing or shipping a TypeScript library — the `tsc → .js` path from Chapter 1.2.4 is irrelevant on an app codebase; the course doesn't return to it.
- `tsconfig.json` for a non-Next.js project (a standalone CLI, a Cloudflare Worker) — the flags differ; the framing of "framework owns the compatibility flags" generalizes, but the specific values do not.
- Multi-project `references` setups or composite builds — niche, not on the course's path.
- The Next.js TypeScript plugin's behaviors in depth — surfaced in Unit 5 (App Router) at the routes that use them.

Pedagogical approach:

Reference / survey archetype with one Decision opening paragraph. The lesson is structurally a tour of a config file the student does not edit — which means it could read as dry. The fix is to lead every group of flags with the **agreement the flags enforce** between the language, the bundler, and the runtime, so the student is reading a contract, not a list. Open with the two-owners framing (carried from 1.4.3) and a one-paragraph "rule of thumb" — if you're tempted to edit a flag in this lesson, you're probably wrong; if you're tempted to edit a flag in 1.4.3, you're probably right. Show the full `tsconfig.json` with side annotations marking which flags 1.4.3 covered and which this lesson covers (the `AnnotatedCode` component is a clean fit). The transpiler-alignment trio gets a small `CodeVariants` example showing one snippet that compiles under `verbatimModuleSyntax: false` and fails under `true` (a type import that smuggles a runtime side effect into a client bundle), because that flag is the one the student will see fail in their own code later in Unit 5 and they need the cause-and-effect in working memory. Close with one short `Matching` exercise pairing four flags to the agreement they enforce ("the language and the bundler agree on what a module is," "the type-checker and the bundler don't fight over emitted files," "the editor knows about Next.js's typed routes," "type-only imports don't sneak runtime side effects into a client bundle"). No coding exercise; the lesson is about reading, not writing.

Estimated student time: 30 to 35 minutes.

---

## Lesson 1.4.5 — Type-safe environment variables with @t3-oss/env-nextjs

Topics to cover:

- The senior question, posed plainly. A SaaS app reads secrets and configuration from environment variables — `DATABASE_URL`, third-party API keys, public-vs-server flags. The failure mode every senior has seen at least once: deploy succeeds, the app boots, the first request crashes because `process.env.STRIPE_SECRET_KEY` is `undefined` and the call to Stripe throws inside a request handler. The user sees a 500; the team sees the alert ten minutes later; the fix is to redeploy with the variable set, which means the outage lasts as long as the deploy. The right place to catch this is **build time, not first-request time.** This lesson installs that discipline from the first scaffold.
- `@t3-oss/env-nextjs` as the 2026 default. One paragraph: a thin, well-maintained wrapper around a Standard Schema-compliant validator (Zod 4 in this course; Valibot also supported) that runs at build time, enforces the Next.js naming convention (`NEXT_PUBLIC_` for client-visible variables, no prefix for server-only), and produces typed exports the rest of the app imports instead of touching `process.env` directly. Alternatives named in one sentence: hand-written `process.env` checks scattered across the code (no central enforcement), or no validation at all (the failure mode above). The trigger that would flip the choice: a non-Next.js runtime where the package's framework integration doesn't fit; the principle of validation-at-the-boundary stays the same.
- The starter's `env.ts` file, read in full. The shape:
  - `import { createEnv } from '@t3-oss/env-nextjs'` and `import { z } from 'zod'`.
  - `export const env = createEnv({ server, client, experimental__runtimeEnv })`.
  - `server` block — Zod schemas for the server-only variables, e.g. `DATABASE_URL: z.url()` (or `z.string().url()` per Zod 4), `RESEND_API_KEY: z.string().min(1).optional()` (optional in early units, required when the email project lands in Unit 8).
  - `client` block — Zod schemas for `NEXT_PUBLIC_*` variables. Empty in the first scaffold; populated when PostHog (Unit 20) and others land.
  - The `runtimeEnv` map that explicitly threads `process.env.X` to each schema. Why the map exists: Next.js inlines `NEXT_PUBLIC_*` at build time but leaves server vars dynamic, and the explicit map lets the validator know which is which without surprises. The student does not need the mechanics in depth; they need to know the map exists and why.
- The Next.js naming convention, restated. `NEXT_PUBLIC_*` is shipped to the client bundle; everything else stays on the server. The `@t3-oss/env-nextjs` package refuses to validate a `NEXT_PUBLIC_*` variable in the `server` block and vice versa — structural enforcement that makes the "I accidentally leaked the API key" bug hard to write. Named here, revisited under SaaS pattern #12 in Unit 17.
- The build-time fire. A worked example: the starter ships `DATABASE_URL` in `.env.local` (which the chapter teaches the student to create from `.env.example`, see below). The student runs `pnpm build` — succeeds. The student removes `DATABASE_URL` from `.env.local`, runs `pnpm build` again — fails with a clear error naming the missing variable and the file it was expected in. The student adds it back, the build succeeds. The discipline is mechanical, not theoretical.
- The `.env.example` and `.env.local` pattern. Two files, two purposes.
  - `.env.example` lives in the repo, committed, names every variable the app expects with a dummy value or empty string. The starter ships it. The next contributor (or the student themselves on a second machine) copies it to `.env.local`, fills in real values, and the app boots.
  - `.env.local` lives on the developer's machine, never committed, holds the real secrets. The `.gitignore` from 1.4.1 excludes `.env*.local`.
  - The Vercel deploy story is named in one line: production env vars are set in the Vercel dashboard, the build still validates them at build time via `env.ts`, and a missing variable fails the deploy before traffic shifts. Unit 21 owns the deploy chapter; this lesson states the connection so the student knows what they're protecting against.
- The import-side rule. Application code imports from `~/env` (or the project's path), never from `process.env`. Two senior reasons named: typed exports (`env.DATABASE_URL` is `string`, not `string | undefined`) and the seam where validation actually fires (importing from `~/env` runs the validation; bypassing it doesn't). A `biome.json` rule or an ESLint rule could lint against `process.env` references; the course leaves that as a future hardening, named once.
- The `SKIP_ENV_VALIDATION` escape hatch. One paragraph: the package supports `SKIP_ENV_VALIDATION=true` to bypass validation for the specific case of a CI step that builds without the secrets present (e.g. a Docker image build that injects env at runtime). The senior watch-out: the flag is for the build that doesn't need to type-check the env shape, not for "make the error go away." Set it deliberately, in the script that needs it, never as a default.
- Forward links. Architectural Principle #3 (pure `/lib`, side effects at named boundaries) — `env.ts` is the first concrete instance of a named boundary, surfaced here and named again in Unit 7. SaaS pattern #12 (security baseline) — Unit 17 revisits env hygiene as part of the audit.

What this lesson does not cover:

- Authoring Zod schemas in depth (Unit 7.1).
- Connecting Drizzle to `DATABASE_URL` (Unit 6).
- The Vercel deploy flow for env vars (Unit 21).
- Secret-rotation discipline, env per environment, or staging-vs-production separation (Unit 17 and 21).
- Valibot as the alternative validator. Named in one line; the course commits to Zod.

Pedagogical approach:

Pattern archetype. The lesson teaches a failure mode and the structural enforcement that prevents it; `@t3-oss/env-nextjs` is the enforcement, the missing-variable production crash is the failure. Open with the 500-on-first-request scenario in prose — concrete, lived-experience framing, no abstraction. Show the starter's `env.ts` as one labeled code block, then walk it section by section in adjacent prose (not in comments inside the block — the prose owns the explanation, the code owns the shape). The worked example is the lesson's center: a `Steps` block with three commands. `pnpm build` succeeds. The student edits `.env.local` to remove `DATABASE_URL`. `pnpm build` fails with an error message the student reads. The student restores the variable. `pnpm build` succeeds again. Each step has its labeled output block; the student watches the build catch the missing variable cause-and-effect. Close with a small `Buckets` exercise sorting eight variable names ("`DATABASE_URL`," "`NEXT_PUBLIC_POSTHOG_KEY`," "`STRIPE_SECRET_KEY`," "`NEXT_PUBLIC_SITE_URL`," "`RESEND_API_KEY`," "`NODE_ENV`," "`NEXT_PUBLIC_GA_ID`," "`SESSION_SECRET`") into "server block," "client block," or "framework-owned, don't put in env.ts." That exercise is the senior-reflex confirmation — the student should leave knowing where each new env variable belongs before they ever add one. Offer one optional `SandboxCallout` with a minimal `env.ts` and a scratch `process.env` map, inviting the student to add a fictional variable end-to-end (schema, runtimeEnv entry, import site) — that sandbox is the lesson's freeform confirmation.

Estimated student time: 35 to 40 minutes.

---

## Total chapter time

Roughly 145 to 170 minutes across the five lessons. The chapter splits naturally across two or three evenings — 1.4.1 + 1.4.2 (the scaffold open and the AGENTS.md read) as one sitting, 1.4.3 + 1.4.4 (the tsconfig walk) as the second, 1.4.5 (env validation with the build-fire exercise) as the third short evening. At the end the student has a running Next.js 16 application on their machine, a tsconfig they can defend flag by flag, an env validator that fails the build on a missing required variable, and a first commit that locks the toolchain choices from Chapters 1.2 through 1.4 into a real codebase. Unit 2 starts on that floor.
