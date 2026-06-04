# Lesson 5 — Biome, the single-binary linter and formatter

## Lesson title

Chapter-outline title fits: **Biome, the single-binary linter and formatter**. It names the tool and its one-binary differentiator — the decision the lesson installs. Keep it.

Sidebar (short): **Biome**

## Lesson type

`Walkthrough`

This is the last of the four scaffolding walkthroughs. The student writes no code and there is no `tests/lessons/Lesson 5.test.ts` — the deliverable is understanding the *provided* `biome.json` + `package.json` scripts and seeing format-on-save fire. The test-coder does not run for this lesson.

## Lesson framing

The student walks away with the 2026 default decided: one Rust binary (`biome.json`) replaces ESLint + Prettier for lint, format, and import-sort on this stack, and they can read every field of the provided config and run the four daily scripts — `format`, `lint`, `check`, `verify` — knowing which one to reach for and why `verify` is the single shippable-or-not gate. The senior payoff is the floor itself: a pinned, minimal, recommended-preset config plus a CI-mode gate means formatting and lint are settled mechanically, never debated in review. This closes the toolchain arc (pnpm → AGENTS.md → tsconfig → Biome); Lessons 6-12 build the marketing surface on top of it.

## Codebase state

**Entry** — the provided `start/` scaffold with the toolchain understood through Lesson 4: `.mise.toml` pins Node 24 + pnpm 11.3.0; `package.json` carries `packageManager`, `engines`, the `preinstall` pnpm guard, and the `dev`/`build`/`start`/`format`/`lint`/`check`/`verify`/`test:lesson` scripts; `.npmrc`, `pnpm-workspace.yaml`, committed lockfile, `AGENTS.md`, and a clean `tsconfig.json` (`tsc --noEmit` passes). `@biomejs/biome@2.4.16` is already an exact-pinned devDependency and `biome.json` already sits at the repo root. The editor's format-on-save and `source.organizeImports.biome` were wired back in lesson 7 of chapter 003 but had no config to act on until now.

**Exit** — the student understands the provided `biome.json` field by field and the `format`/`lint`/`check`/`verify` scripts; format-on-save fires correctly in the editor (the wiring from chapter 003 now has a config); `pnpm check` and `pnpm verify` run clean. The full Node + pnpm + TypeScript + Biome floor the scaffold ships is understood, and the Implementation lessons (6 onward) build the surface on the provided Next.js + Tailwind + shadcn scaffold.

## Lesson sections

Walkthrough structure: a warm, headerless intro that states the decision, then h2 sections walking the provided surfaces in the order a reader meets them — the tool choice, the `next lint` removal, the pinned dependency, the `biome.json` fields, the v2 domain system, the scripts, the editor demo, and the two watch-outs. No exercises, no `<details>` (nothing is hidden — this is a read-the-config lesson, not a build-it lesson).

### Intro (no header)

State the decision in three sentences, per the chapter outline: Biome replaces ESLint + Prettier as the 2026 default for new SaaS on this stack — single Rust binary, single `biome.json`, 10–25x faster on lint and format, with rule domains that auto-enable on installed dependencies. Name the one trigger that flips the choice (an ESLint plugin the team genuinely needs that Biome has no rule or domain for) and note that for the course's stack no such plugin is load-bearing, so Biome wins. Mention ESLint exactly once as the trigger-gated alternative and move on — do not enumerate ESLint's history. Connect to the arc: this is the fourth and final toolchain walkthrough; after it the floor is complete and code-writing begins.

### `next lint` is gone

Next.js 16 removed `next lint` and the `eslint` option from `next.config`. The platform now expects the project to wire linting itself, which is exactly why this lesson exists. The course wires Biome directly through `pnpm` scripts. One line for students who later inherit a Next 15 codebase: the `@next/codemod` `next-lint-to-eslint-cli` migration exists; name it, then drop it.

### Biome is a pinned dependency

`@biomejs/biome` is a devDependency at an exact version — `2.4.16`, no caret — pinned the same way the runtime (Node 24) and package manager (pnpm 11.3.0) are pinned, using the `--save-exact` pattern named in Lesson 2. Note the curation provenance in one line: the starter was generated with `pnpm biome init`; the course ships the curated result rather than the raw default. Pull the exact line from `package.json` (`"@biomejs/biome": "2.4.16"`) so the student sees the no-caret pin against the carets on the runtime libraries above it.

Code handling: a `Code` block showing the `devDependencies` slice with `@biomejs/biome` highlighted, or inline in prose — keep it minimal.

### Reading `biome.json`

The core walkthrough. Show the full provided `biome.json` (it is 43 lines, short enough to read whole) and step through the fields a reader actually parses. Because the focus needs to move part-by-part across one file, use `AnnotatedCode` — one step per field group, each with one or two sentences:

- `"$schema"` — versioned schema URL so the editor autocompletes the config itself; the version in the URL (`2.4.16`) matches the pinned binary.
- `"vcs": { enabled, clientKind: "git", useIgnoreFile: true }` — Biome respects `.gitignore`, so it never lints `node_modules` or `.next`.
- `"files": { ignoreUnknown: true, includes: ["**", "!next-env.d.ts", "!.next", "!node_modules"] }` — explicit ignore of the generated `next-env.d.ts` (the never-edit file from Lesson 4) and build output; the `!` entries are negated globs.
- `"formatter": { enabled, indentStyle: "space", indentWidth: 2 }` — two-space, spaces; matches the `.editorconfig` from lesson 7 of chapter 003 by construction, so the two formatters never fight.
- `"javascript": { formatter: { quoteStyle: "single" } }` — single quotes; the rest of JS formatting takes Biome's defaults (the point of a defaults-first config).
- `"linter": { enabled, rules: { recommended: true, performance: { noImgElement: "off" } } }` — the recommended preset is the floor; `noImgElement` is turned off because the project deliberately uses a raw `<img>` in `ThemeAwareImage` (Lesson 7), and Next.js `<Image>` is Unit 4 territory. This is the one rule the course overrides, and the override has a named reason — model the discipline of overriding a rule only with a justification.
- `"css": { parser: { tailwindDirectives: true } }` — teaches Biome to parse Tailwind's `@theme`/`@apply` directives in `globals.css` without false errors.
- `"assist": { actions: { source: { organizeImports: "on" } } }` — sorted imports as a save-time action, with no separate import-sort plugin; this is the assist that fires through the editor's `source.organizeImports.biome`.

### Rule domains (the v2 thing)

Biome 2 introduced **domains** — grouped rule sets for `next`, `react`, `test`, etc. — that auto-enable when the matching dependency is in `package.json`. The provided config relies on this auto-enable rather than listing domains explicitly, which is why `biome.json` stays short. Name the explicit-pin form for when a student needs it: `"linter": { "domains": { "next": "recommended" } }`. One short `Code` snippet for the explicit form; the auto-enable is prose.

### The daily scripts

The four Biome `pnpm` scripts as they sit in the provided `package.json`, each with the moment the student reaches for it:

- `"format": "biome format --write ."` — formatting only, write in place.
- `"lint": "biome lint ."` — lint only, report (no write).
- `"check": "biome check --write ."` — format + lint + import-sort + safe quick-fixes in one pass; the script the student runs locally before committing.
- `"verify": "biome ci . && tsc --noEmit && next build"` — the gate. Biome CI mode (no writes, fails on any diagnostic) chained with the typecheck and a production build. This is the project's single "is it shippable" command. Note that `tsc --noEmit` here is the same flag from Lesson 4, run as a separate process. The standalone `biome ci` CI *job* is foreshadowed to Unit 20 — name it once, do not build it here.

Code handling: a `Code` block of the `scripts` slice, or a small table mapping script → what it does → when to run it. A table reads well for the four-script comparison; keep the `verify` chain visible as a code fragment so the three-stage gate is concrete.

### Format-on-save in action

The payoff moment. Format-on-save and `source.organizeImports.biome` were wired in lesson 7 of chapter 003; this lesson is when that wiring actually fires, because the config now exists. Walk one round as a `Steps` procedure: open a `.tsx` file, save it deliberately ugly (mixed quotes, bad indent, an unused import), watch Biome reformat on save, reorder imports, and surface a lint diagnostic inline — the Error Lens extension from chapter 003 puts it on the same line. A `CodeVariants` before/after (saved-ugly vs. saved-formatted) carries the visual diff cleanly. Reference, do not re-teach, the chapter 003 editor wiring.

### Two watch-outs

Close on the two senior watch-outs from the chapter outline:

- **Safe vs. unsafe fixes.** Biome's default `--write` applies only *safe* fixes; `--unsafe` is opt-in and can change program behavior. Removing an unused import is safe; rewriting `==` to `===` can change behavior when the operands differ in type. The student should know `--unsafe` exists and why it is not the default.
- **The CI rule.** Biome runs in CI on every PR. The `--frozen-lockfile` / `only-allow pnpm` discipline from Lesson 2 has a Biome cousin: `biome ci` (folded into `verify`) is what closes the loop locally. Foreshadow the standalone CI job to Unit 20.

End-of-walkthrough beat (chapter outline's closing note): the student now understands the full Node + pnpm + TypeScript + Biome floor; Lessons 6-12 build the marketing surface on the provided scaffold. Keep `biome.json` short — if it grew past ~30 lines, that would signal configuring rules the student can't yet justify; reach for the recommended preset and domain defaults first.

External resources: append an optional `ExternalResource` to the Biome docs after the body (added later by the resourcer); no diagram is needed — this lesson is config + prose + one editor demo.

## Scope

- pnpm pinning, the lockfile contract, and the `only-allow pnpm` guard — covered in Lesson 2 of this chapter; reference, do not re-explain.
- `tsconfig.json` and the `tsc --noEmit` typecheck that `verify` chains — covered in Lesson 4; only name the flag where `verify` invokes it.
- Editor format-on-save / Error Lens / `source.organizeImports.biome` wiring — owned by lesson 7 of chapter 003; this lesson only fires it, does not re-wire it.
- The `.editorconfig` the formatter matches — carried from lesson 7 of chapter 003.
- The standalone `biome ci` GitHub Actions job and `--frozen-lockfile` CI enforcement — Unit 20; foreshadowed only.
- The raw `<img>` / `noImgElement` rationale and `ThemeAwareImage` build — Lesson 7; named here only to justify the one rule override.
- Next.js `<Image>` optimization — Unit 4.
- Writing any marketing-surface component — Lessons 6-12.
