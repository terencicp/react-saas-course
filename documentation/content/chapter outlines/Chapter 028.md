# Chapter 028 — Project: themed product surface

## Chapter framing

Chapter 028 cashes in everything Unit 3 installed. The student ships a real static product/marketing page — header, hero, three-column feature grid, pricing table, footer, and a mobile nav drawer below the `md` breakpoint — built out of shadcn primitives, CVA variants, semantic-token theming, and a working theme toggle that survives reload without FOUC. The accessibility baseline is non-negotiable and verified clause by clause: Lighthouse a11y 100, keyboard-only navigation, color-contrast pass, focus rings, semantic landmarks, heading hierarchy, layout reflow at three widths, and the drawer's focus trap plus scroll lock.

Threads that run through every lesson: shadcn primitives are imported from `components/ui/`, never reinstalled; the `cn()` helper merges every `className` override; design tokens flow through `@theme` and `--primary`/`--background`/`--foreground` rather than literal colors; layout uses flex and CSS Grid with responsive breakpoints (`sm:`, `md:`, `lg:`); dark mode is the `.dark` class flipped by `next-themes` and the inline pre-paint script kills FOUC; accessibility is verified with keyboard and Lighthouse, not promised; the mobile drawer is shadcn's `Sheet` (the focus trap is the primitive's job) and the body-scroll lock is the one custom hook the project owns. The chapter ships 1 brief + 4 project-init lessons (pnpm, AGENTS.md, tsconfig, Biome) + 3 build lessons + 1 verify lesson; each build lesson closes on a runnable state the student can `pnpm dev` and use. The project-init lessons exist because Chapter 028 is the *from-scratch* project — every subsequent project chapter (Chapter 035 onward) carries this toolchain forward via `degit`, and that pattern only works if one project lays the foundation.

### Dependency carry-in

- **From chapter 017 (JSX/HTML semantics):** semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`), heading hierarchy (one `<h1>`, no level skips), `<button type>`, `<label htmlFor>`, `<img alt>`.
- **From chapter 018 (Tailwind):** utility-first reflex, `@theme` config, `cn()`, the `dark:` variant, the `next-themes` wiring shape (`<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` plus `suppressHydrationWarning` on `<html>`).
- **From chapter 019 (cascade and tokens):** the semantic-token model (`--background`/`--foreground`/`--primary`/`--muted`/`--ring`/`--border`) and OKLCH color values.
- **From chapter 020 (layout):** flex axes, CSS Grid with `grid-template-columns`, container queries when applicable, the `min-h-dvh` reach.
- **From chapter 021 (typography/color/motion/responsive):** breakpoint utilities, `prefers-reduced-motion`, `tw-animate-css`, fluid type with `clamp()`.
- **From chapter 022 (components and composition):** the canonical Button shape (`cva` + `Slot` + `cn()` + `asChild`), `VariantProps<typeof variants>`, discriminated unions for mutually exclusive props.
- **From chapter 024 (state and refs):** `useState`, `useRef`, `useId`.
- **From chapter 025 (effects):** `useEffect` for body-scroll lock with cleanup; closing-on-escape via event listeners.
- **From chapter 026 (custom hooks):** `useLockBodyScroll()` shape — toggles `overflow: hidden` on `body` with cleanup.
- **From chapter 027 (shadcn + a11y):** the shadcn CLI install pattern, `asChild` composition, the four discipline-level commitments, focus-trap as the primitive's job, the icon-only button label pattern.

### Project file tree (built across Lessons 2-5, with UI stubs marked TODO for Lessons 6-9)

```
app/
  layout.tsx                     # provided: <html lang="en" suppressHydrationWarning>, ThemeProvider, fonts
  (marketing)/
    page.tsx                     # provided: page shell, section placeholders with TODO comments
  globals.css                    # provided: @import "tailwindcss"; @theme { --background, --foreground, --primary, --muted, --ring, --border, --radius } in light + .dark
components/
  ui/                            # provided by shadcn add: button, sheet, dialog, card, separator, badge, skeleton
  site-header.tsx                # TODO student
  site-footer.tsx                # TODO student
  hero.tsx                       # TODO student
  feature-grid.tsx               # TODO student (uses FeatureCard with CVA variants)
  feature-card.tsx               # TODO student (cva-driven variants: tone, emphasis)
  pricing-table.tsx              # TODO student
  pricing-card.tsx               # TODO student
  theme-toggle.tsx               # TODO student (useTheme + sun/moon icons)
  mobile-nav.tsx                 # TODO student (Sheet trigger + content)
  theme-aware-image.tsx          # TODO student (renders light/dark sources)
hooks/
  use-lock-body-scroll.ts        # TODO student
lib/
  data.ts                        # provided: typed copy + pricing fixtures
  utils.ts                       # provided: cn()
public/
  hero-light.png, hero-dark.png  # provided
  logo.svg                       # provided
components.json                  # provided (shadcn, Radix engine, lucide icons)
next.config.ts                   # provided (reactCompiler: true)
package.json                     # provided
```

### Reference-solution signatures lessons will display

- `useLockBodyScroll(locked: boolean): void` — applies `document.body.style.overflow = 'hidden'` when `locked`, restores prior value on cleanup; no-op on SSR.
- `featureCardVariants = cva(base, { variants: { tone: { default, brand, muted }, emphasis: { quiet, loud } }, defaultVariants: { tone: 'default', emphasis: 'quiet' } })` returning a class string.
- `FeatureCardProps = ComponentProps<'article'> & VariantProps<typeof featureCardVariants> & { title: string; description: string; icon: LucideIcon }`.
- `PricingCardProps = { name: string; price: string; period: 'month' | 'year'; features: string[]; featured?: boolean; cta: { label: string; href: string } }`.
- `ThemeToggle: () => JSX.Element` using `useTheme()` from `next-themes`; renders `<Button variant="ghost" size="icon" aria-label="Toggle theme">` with `<Sun className="dark:hidden" />` and `<Moon className="hidden dark:block" />` swap.
- `MobileNav: ({ links }: { links: { href: string; label: string }[] }) => JSX.Element` wrapping shadcn's `<Sheet>` with `SheetTrigger` (the `Menu` icon button) and `SheetContent side="left"`; calls `useLockBodyScroll(open)`; closes on link click.
- `ThemeAwareImage: ({ light, dark, alt, ...props }) => JSX.Element` rendering both `<img>` sources with `dark:hidden` and `hidden dark:block` so SSR ships both and CSS picks the right one — no JS branch, no FOUC.
- Page data: `lib/data.ts` exports `features: FeatureCardProps[]`, `pricingTiers: PricingCardProps[]`, `navLinks: { href; label }[]`, all typed.
- Env entries: none — fully static.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Identical first paint regardless of system theme (no FOUC) | Reload with system set to dark, then light; the rendered theme matches before paint. DevTools Performance flame chart shows no flash frame. |
| Lighthouse a11y at 100 | Run Lighthouse (Chrome DevTools) in incognito; the accessibility score is 100; no flagged issues. |
| Keyboard tab order traverses every visible interactive control top-to-bottom | Unplug or ignore the mouse; Tab from the URL bar; every interactive element receives a visible focus ring in document order. |
| Layout reflows correctly at 360 / 768 / 1280 px | DevTools device toolbar; cycle through the three widths; no horizontal scroll, no broken grid, hero stacks below `md`, three-column grid becomes one-column below `md`. |
| Mobile drawer traps focus | Below `md`, open the drawer; Tab cycles within the drawer; Shift+Tab reverses; focus does not escape to the underlying page. |
| Mobile drawer locks body scroll | With the drawer open, attempt to scroll the page; the page doesn't move. Close the drawer; scroll restored. iOS Safari emulation passes the same test. |
| Drawer closes on `Esc` | With the drawer open, press `Esc`; the drawer closes and focus returns to the trigger button. |

### Concepts demonstrated → owning lesson

- Tailwind v4 with `@theme` — lesson 2 of chapter 018.
- `cn()` helper composition — lesson 3 of chapter 018.
- CVA variant tables (`cva` + `VariantProps`) — lesson 3 of chapter 022.
- `Slot` + `asChild` polymorphism — lesson 3 of chapter 022.
- `dark:` variant and the `.dark` class flip — lesson 5 of chapter 018.
- `next-themes` wiring without FOUC — lesson 6 of chapter 018.
- Semantic-token model (`--background`, `--foreground`, `--primary`) — lesson 4 of chapter 019.
- Flex and CSS Grid layout — lesson 2 of chapter 020, lesson 3 of chapter 020.
- Responsive breakpoints (`sm:`, `md:`, `lg:`) — lesson 6 of chapter 021.
- `prefers-reduced-motion` and `motion-reduce:` — lesson 5 of chapter 021.
- shadcn primitives (`Button`, `Sheet`, `Card`, `Badge`, `Separator`) — lesson 1 of chapter 027.
- The four discipline-level a11y commitments — lesson 2 of chapter 027.
- ARIA: `aria-label` on icon-only buttons, `aria-hidden` on decorative icons — lesson 3 of chapter 027.
- Focus trap (Radix handles it inside `Sheet`) and return-focus contract — lesson 4 of chapter 027.
- `useState`, `useRef`, `useId` — Chapter 024.
- `useEffect` with cleanup — lesson 1 of chapter 025.
- `useLockBodyScroll` custom hook — lesson 1 of chapter 026.
- Architectural Principle #4 (name things for intent) at design-token naming — surfaced here.

---

## Lesson 1 — The bar and the brief

Frame the static marketing surface as a SaaS pattern, state the seven "Done when" verifications, show the final UX at three widths, set the scope cut, and commit to the from-scratch build (no starter clone — Chapter 035 will introduce the project-clone flow).

Goals:

- Frame the SaaS pattern being built: the public-facing product surface every B2B SaaS ships before login — and the standards bar a senior holds it to (a11y 100, no FOUC, responsive, focus-trapped drawer).
- State the seven "Done when" verifications in one paragraph; map each to the lesson that builds it.
- Show the final UX as three screenshots: desktop at 1280, tablet at 768, mobile at 360 with the drawer open.
- Set the scope cut: static page only, no real auth, no real CMS, no analytics, no animations beyond shadcn defaults; copy and pricing live in a typed `data.ts`.
- Name the senior-mindset payoff: this surface is the visible bar your design system holds — every shadcn component, every token, every responsive utility cashed out at once.
- State that Chapter 028 is the *from-scratch* project: pnpm install, AGENTS.md, tsconfig, Biome, and the Next.js scaffold are all authored in the next four lessons before any UI code is written. Subsequent project chapters (Chapter 035 onward) clone a starter that carries this scaffold forward.

Senior calls and watch-outs:

- The accessibility bar is non-negotiable. A 99 Lighthouse score is a failure; a single keyboard trap is a failure. Name the bar up front so the student does not negotiate with themselves at verify time.
- "I'll add motion later" — motion comes free with `tw-animate-css` and shadcn defaults; reduced-motion already respected. Do not roll your own.
- The drawer is shadcn's `Sheet`; do not write a custom modal. The custom hook is `useLockBodyScroll` and only that.

Codebase state at entry: empty directory.
Codebase state at exit: project scope and Done-when bar internalized; no code written yet — Lessons 2 through 5 stand the project up.

Estimated student time: 10 to 15 minutes.

---

## Lesson 2 — pnpm and the lockfile contract

Install pnpm through mise, write the minimum-viable `package.json` with `packageManager` pinned, commit `pnpm-lock.yaml` as the deterministic resolution record, and guard against mixed package managers with `only-allow pnpm`.

Goals:

- The decision up front, in three sentences. pnpm is the package manager default in 2026 — strict non-hoisted `node_modules` (phantom-dependency bugs surface at install time, not in production), monorepo-first design, mature ecosystem, full Node compat. Bun gets one line as the conditional alternative — faster on cold installs, ~95% Node-compat means one package in twenty surprises, no built-in audit; ready for some teams in 2026 but not the default the course teaches against. The trigger that would flip the choice: a greenfield project where install time genuinely dominates CI and the team has the bandwidth to handle compat edges.
- Installing pnpm through mise (`mise use --pin pnpm@10`) rather than globally via Homebrew or the standalone installer — keeps the package manager version pinned per-repo for free and avoids the global-version drift that bites teams. The student already has `mise` from lesson 8 of chapter 003; this lesson pins pnpm under the same `.mise.toml`.
- The post-Corepack reality. Corepack is removed from Node 25+ distributions and the ecosystem is moving off it. pnpm 10 ships `manage-package-manager-versions` enabled by default, so once any pnpm is installed, the `packageManager` field in `package.json` is enough to lock the version per-repo — pnpm itself swaps in the right binary. Write the `packageManager: "pnpm@10.x.y"` field by hand (or by running `pnpm use ...`) and explain the field is read by pnpm on every invocation.
- The minimum-viable `package.json` — `name`, `private: true` (because this is an app, not a publishable library, and the field prevents an accidental `pnpm publish`), `type: "module"` (ESM-first in 2026), `packageManager`, and an empty `scripts` block that the next few lessons fill in.
- The four pnpm commands a SaaS engineer runs daily: `pnpm install` (and what it actually does — resolves the dependency graph, writes the lockfile, populates `node_modules` from the global content-addressed store via symlinks), `pnpm add <pkg>` / `pnpm add -D <pkg>` (with the dev-dependency distinction at production-build time named explicitly), `pnpm remove`, and `pnpm run <script>` (with the `pnpm <script>` shorthand and what `pnpm` does when the script name collides with a built-in).
- The `.npmrc` at the repo root for two settings the course relies on: `auto-install-peers=true` (modern default, but explicit avoids the surprise on older pnpm versions) and `engine-strict=true` (the `engines` field in `package.json` becomes a hard error, not a warning — pairs with the runtime pin from lesson 8 of chapter 003).
- **The lockfile as a contract.** `pnpm-lock.yaml` is the resolved, fully-pinned graph of every transitive dependency at the exact version, integrity hash, and resolution path. Distinct from `package.json`, which only declares the top-level intent and the version ranges; the lockfile records the actual decision.
  - The senior question: what does the lockfile prevent. Concrete failure shapes — a teammate running `pnpm install` six months from now and getting a patched-but-broken sub-dependency that the original install didn't see; a CI build that resolves a different graph than the dev machine because the version range allowed it; a supply-chain incident where the integrity hash is the only thing flagging that an upstream artifact was tampered with.
  - The commit rule, stated as a hard default with no hedging: `pnpm-lock.yaml` belongs in version control. It is never in `.gitignore`.
  - `--frozen-lockfile` in CI as the structural enforcement — named here, used in Unit 20.
  - Merge conflicts in the lockfile. The senior move: never hand-edit. Resolve the `package.json` conflict, then run `pnpm install`, which re-resolves and rewrites the lockfile. Most teams configure git to mark the file as `merge=ours` or `linguist-generated` so reviewers don't try to read the diff.
- The mixed-package-manager failure mode. A teammate who runs `npm install` against a pnpm repo generates a `package-lock.json`, breaks the workspace symlinks, and produces a second source of truth. The `preinstall` script `npx only-allow pnpm` as the structural enforcement that makes this hard to do accidentally.

Senior calls and watch-outs:

- pnpm is named once; the lesson commits and moves on. The Bun line is a sentence, not a sidebar.
- The lockfile commit rule is not a taste call. Skipping it produces the "works on my machine" bugs the chapter's discipline exists to prevent.
- `--save-exact` on every install (`pnpm add -D --save-exact ...`) for the few tools the course pins explicitly (Biome, `@biomejs/biome` in the next lesson). Named so the student knows when to reach for it.

Codebase state at entry: empty directory with the Done-when bar from lesson 1 of chapter 028.
Codebase state at exit: `.mise.toml` pins Node + pnpm; `package.json` has `packageManager` and `engines` set; `.npmrc` has `engine-strict=true` and `auto-install-peers=true`; `pnpm install` runs clean; `pnpm-lock.yaml` is committed; the `preinstall` script guards against mixed package managers.

Estimated student time: 30 to 40 minutes.

---

## Lesson 3 — AGENTS.md as the next contributor's briefing

Author the project's `AGENTS.md` at the repo root for what earns a place (thesis, pinned stack, layout, commands, conventions pointers) and what doesn't (aspirational prose, duplicated rules, hand-maintained file lists), with the deeper documentation doctrine deferred to Chapter 101.

Goals:

- The senior question: what is the file the next person to open this repo (human or AI agent) should read first, and what earns a place in it. `AGENTS.md` is that file in 2026. The Linux Foundation adopted it as an Agentic AI Foundation founding project in late 2025; major coding agents (Codex, Cursor, Claude Code, Factory) read it natively. The framing for the course: `AGENTS.md` is **operational onboarding**, not architectural prose — the durable facts the next contributor needs to be productive in their first session.
- Write the project's `AGENTS.md` at the repo root with the sections that earn a place. Each section gets one-line justification:
  - **Thesis line** — one or two sentences naming what the project is. Without it, the agent or new contributor has to infer the domain from file names.
  - **Stack core** — pinned versions of the load-bearing libraries (Next.js 16, React 19, TypeScript X.Y, Tailwind v4, shadcn/ui, Drizzle X.Y for later projects) so an agent doesn't hallucinate an old API surface.
  - **Repo layout** — the file tree by directory with one line per directory on what lives there. Saves the next contributor the discovery step.
  - **Commands** — the daily commands (`pnpm dev`, `pnpm build`, `pnpm check`, `pnpm tsc --noEmit`) so an agent doesn't try `npm run …`.
  - **Conventions** — pointers to where the conventions live (the `biome.json` from lesson 8 of chapter 028, the `.editorconfig` from lesson 7 of chapter 003, the `tsconfig.json` from lesson 7 of chapter 028). The conventions are not duplicated in prose; the agent is told where to look.
  - **Additional project context** — links to longer docs the agent should pull in *only when needed*. Conditional reading so the file stays short.
- What does **not** earn a place. Stated as a hard list because the failure mode of `AGENTS.md` is bloat — a 2026 research finding (Gloaguen et al., real-world repos) shows that LLM-generated context files reduce agent task success, and even hand-written files only help when minimal and precise. The hard cuts:
  - Aspirational architecture statements. ("This codebase strives to be clean and maintainable.") Add nothing; cut.
  - Marketing copy. Not the readme.
  - Tutorials. The agent doesn't need to be taught Next.js; it needs to know which Next.js this repo runs on.
  - Anything that duplicates a more authoritative source. The `biome.json` (next lesson) is the source of truth for formatting rules; `AGENTS.md` references it, never restates it.
  - Hand-maintained file trees that age out the moment a directory is added. List *directories* (the architectural shape) but not individual files (which drift).
  - Decisions that should be ADRs. Architectural Decision Records get their own treatment in Chapter 101; `AGENTS.md` points at the ADR directory if it exists, doesn't inline the decisions.
- The discipline. One paragraph naming the test the file passes or fails: if a section is the same five lines six months from now even though five PRs landed, it's earned its place. If it ages out on the next refactor, it doesn't belong.
- A note on naming. Some teams use `CLAUDE.md`, `.cursorrules`, or tool-specific equivalents. 2026 consensus has converged on `AGENTS.md` as the open spec; tool-specific files can exist alongside but should re-export or reference `AGENTS.md` rather than duplicate. Stated in one line; the course commits to `AGENTS.md`.

Senior calls and watch-outs:

- The lesson asks the student to write a short file (under one screen). If it grows past two screens during authoring, sections are being added that shouldn't earn a place.
- The Chapter 101 forward link is named once. Documentation that lives next to code, the wider doctrine, owns the deeper treatment.

Codebase state at entry: `package.json`, `.mise.toml`, `.npmrc`, lockfile from lesson 2 of chapter 028.
Codebase state at exit: `AGENTS.md` at the repo root — thesis, stack, layout, commands, conventions, additional context — committed.

Estimated student time: 20 to 25 minutes.

---

## Lesson 4 — Configuring tsconfig

Author `tsconfig.json` in two halves — the project-owned strictness floor (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, the `@/*` path aliases) and the framework-owned compatibility surface (`target`/`lib`, `module`/`moduleResolution: "bundler"`, the transpiler-alignment trio, `jsx: "preserve"`, `noEmit`, the Next.js plugin) — under the rule that the project owns the first half and Next.js owns the second.

Goals:

- The senior framing. `tsconfig.json` has two owners. The project owns the *strictness floor* — the flags that decide which classes of bugs the type-checker catches before the code ships. Next.js owns the *compatibility surface* — the flags that make TypeScript, the bundler, and the runtime agree on what a module is. Both halves live in the same `tsconfig.json`; the split is mental, not physical. Naming it makes the file readable.
- **The strictness floor (project-owned).** Author each flag with one line on the bug class it catches.
  - `"strict": true` — the umbrella flag that turns on the eight individual checks that together make TypeScript actually type-safe (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`). The senior framing: anything below `strict` is not TypeScript, it's JSDoc with hints. The course never operates below this floor.
  - `"noUncheckedIndexedAccess": true` — accessing `array[i]` or `record[key]` returns `T | undefined` instead of `T`. The bug class it catches: reading past the end of an array or a missing key and silently passing `undefined` into the rest of the function. The cost: the student has to handle the `undefined` case. The course leaves the flag on because the bug class shows up in production reads where a 99%-populated record breaks on the 1% case.
  - `"noFallthroughCasesInSwitch": true` — a `case` without an explicit `break` or `return` is an error. Catches the pattern where a senior dev intends to fall through but the next reader can't tell whether the omission was intentional.
  - `"noImplicitOverride": true` — overriding a base-class method without the `override` keyword is an error. Free insurance for the rare class hierarchies that show up.
  - `"forceConsistentCasingInFileNames": true` — refuses imports that differ in case from the on-disk filename. Catches the bug where a Mac filesystem (case-insensitive) lets `import Foo from './foo'` work locally and then breaks in CI on Linux (case-sensitive). One of the cheapest "works on my machine" preventers in the file.
- The flag the project does **not** set, with the reason.
  - `"exactOptionalPropertyTypes"` — distinguishes `{ foo: undefined }` from `{}`. Real bug class, but the friction is high across the ecosystem in 2026 — many third-party types still produce values that fail this check and the workarounds (`as` casts, conditional spreads) noise up the call site more than the flag's safety pays back. Named here so the student knows it exists and knows the trigger to turn it on.
- Path aliases — the project's other strictness lever. `"paths": { "@/*": ["./*"] }` paired with `"baseUrl": "."`. Two senior questions: why use aliases at all (refactor safety — moving a file doesn't break a hundred imports written as `'../../../lib/foo'`), and why the course uses `@/` specifically (Next.js's convention since the App Router shipped, recognized by every editor and every AI tool, no debate). One line on the runtime-resolution gotcha: `tsconfig`-defined paths are *checked* by `tsc` and *resolved* by Next.js's bundler; standalone scripts run through `tsx` (not `node` native stripping, from lesson 8 of chapter 003) because native stripping doesn't read `tsconfig.json`.
- **The compatibility surface (framework-owned).** Author each group with the agreement it enforces between TypeScript, the bundler, and the runtime.
  - `"target": "ES2022"` and `"lib": ["dom", "dom.iterable", "esnext"]` — what JavaScript features TypeScript can emit, and which built-in types it knows about. `ES2022` is broadly the floor Next.js 16 sets; `lib` includes DOM so client components type-check against `window`, `document`, etc., and `esnext` so the latest standard-library types (ES2025 Set methods, iterator helpers) are available at the type level.
  - `"module": "esnext"` and `"moduleResolution": "bundler"` — how `import`/`export` are interpreted and how the resolver finds files. `bundler` is the modern moduleResolution mode (TypeScript 5+) that aligns with how Turbopack actually resolves imports.
  - The transpiler-alignment trio.
    - `"verbatimModuleSyntax": true` — forces the student to write `import type { Foo }` for type-only imports and rejects the `import { Foo }` form when `Foo` is only a type. The bug class it catches: a type import accidentally pulling in a runtime module's side effects on the client when the type was supposed to be erased.
    - `"isolatedModules": true` — every file must be transpilable in isolation, without information from other files. Required by Turbopack. Catches `const enum` (which can't be isolated), barrel re-exports of types without `export type`, and a handful of other patterns the framework can't compile.
    - `"esModuleInterop": true` — smooths over the CommonJS-vs-ESM interop friction so `import express from 'express'` works against a CommonJS module. Less load-bearing on App Router but still on for compatibility with the legacy CJS dependencies the ecosystem still ships.
  - `"jsx": "preserve"` — TypeScript leaves JSX in the source; Next.js's compiler handles the transformation.
  - `"noEmit": true` — TypeScript only type-checks; it never writes `.js` files. The companion script the course runs in CI is `tsc --noEmit` — same flag, separate process, type-checking the codebase without competing with the build.
  - `"plugins": [{ "name": "next" }]` — the Next.js TypeScript plugin in the editor. Adds editor-level type-checking for the metadata API, route parameters, dynamic route segments, and the validator for the App Router's typed routes.
  - The `"include"` and `"exclude"` arrays — `next-env.d.ts` (Next.js's generated declarations — never edit, always commit), the `.next/types/**/*.ts` directory (auto-generated typed-route output), `**/*.ts`, `**/*.tsx`. `"exclude"` lists `node_modules` and build outputs.
- The senior rule across the lesson, stated plainly. **The flags in the second half are not personal preference.** The student should resist the temptation to "harden" them past what Next.js sets, because the framework's correctness depends on them. The strictness lever is the first half; the compatibility surface is left to Next.js.
- The `next-env.d.ts` file. One paragraph: Next.js generates it on the first run, the file references the framework's ambient types, and the student commits it (the file's presence is required at build time) and never edits it. The "never edit" rule is concrete because the file has a comment header saying so.

Senior calls and watch-outs:

- The rule of thumb: if you're tempted to edit a flag in the compatibility surface, you're probably wrong; if you're tempted to edit a flag in the strictness floor, you're probably right.
- `noUncheckedIndexedAccess` is the flag the student will feel the most in everyday code. The friction is real; the bug class it catches is realer.
- Set `typescript.tsdk` in `.vscode/settings.json` (from lesson 7 of chapter 003) to the workspace TypeScript once `node_modules/typescript` exists, so the editor's diagnostics match the build's.

Codebase state at entry: `package.json`, `.mise.toml`, `AGENTS.md`, lockfile committed.
Codebase state at exit: `tsconfig.json` authored with the strictness floor and compatibility surface; `pnpm tsc --noEmit` runs clean on the empty project.

Estimated student time: 35 to 45 minutes.

---

## Lesson 5 — Biome, the single-binary linter and formatter

Adopt Biome as the 2026 default over ESLint+Prettier — single Rust binary, dependency-aware domains — wire the minimum-viable `biome.json` to the `.editorconfig` from chapter 003, install the four daily `pnpm` scripts, and frame the safe-versus-unsafe fix distinction.

Goals:

- The decision up front, in three sentences. Biome replaces ESLint + Prettier as the 2026 default for new SaaS projects on this stack — single Rust binary, single `biome.json`, 10–25x faster on lint and format, ships with rule domains that auto-enable based on installed dependencies (Next.js, React, the test runner). The trigger that would flip the choice: an ESLint plugin the team genuinely needs that Biome doesn't cover or have a domain for. For the course's stack, no such plugin is load-bearing; Biome wins.
- The `next lint` ghost. Next.js 16 removed `next lint` and the `eslint` option from `next.config`. The platform now expects the project to wire linting itself. The course wires Biome directly through `pnpm` scripts; the migration codemod (`@next/codemod` `next-lint-to-eslint-cli`) is named in one line for students who later inherit a Next 15 codebase, then dropped.
- Installing Biome as a workspace dependency. `pnpm add -D --save-exact @biomejs/biome` — `--save-exact` so the version is pinned the same way the runtime and package manager are pinned, no caret range. Initialize with `pnpm biome init` to generate a starter `biome.json`.
- The minimum-viable `biome.json` for the project. Walk through the fields the student actually touches:
  - `"$schema"` — JSON schema URL so the editor autocompletes the config itself.
  - `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }` — Biome respects `.gitignore` so it never lints `node_modules` or `.next`.
  - `"files": { "ignoreUnknown": true }` and any explicit `includes` if the layout calls for it.
  - `"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 }` — matches the `.editorconfig` from lesson 7 of chapter 003 so the two files agree by construction.
  - `"javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always", "arrowParentheses": "always" } }`.
  - `"linter": { "enabled": true, "rules": { "recommended": true } }` — the recommended preset is the floor.
  - `"useEditorconfig": true` — Biome reads the `.editorconfig` for indentation, line endings, and final-newline.
  - `"assist": { "actions": { "source": { "organizeImports": "on" } } }` — sorted imports as a save-time fix, with no separate import-sort plugin.
- The domain system, the v2 thing worth naming. Biome 2 introduced domains — grouped rule sets for `next`, `react`, `test`, etc. — that auto-enable when the matching dependency is in `package.json`. Show `"linter": { "domains": { "next": "recommended" } }` if explicit enabling is wanted, then point at the auto-enable default.
- The four daily Biome commands as `pnpm` scripts in `package.json`:
  - `"format": "biome format --write ."`
  - `"lint": "biome lint ."`
  - `"check": "biome check --write ."` — runs format + lint + import-sort + safe quick-fixes in one pass. The script the student runs locally before committing.
  - `"check:ci": "biome ci ."` — CI mode, no writes, fails on any diagnostic. Named here, used in Unit 20.
- The editor integration. Format-on-save and `source.organizeImports.biome` were wired in lesson 7 of chapter 003; this lesson is the moment that wiring actually fires because the config now exists. Demonstrate one round: open a file, save it ugly, watch Biome format on save and surface a lint warning inline (the Error Lens extension from lesson 7 of chapter 003 puts it on the same line).
- Two senior watch-outs.
  - The "safe vs. unsafe" fix distinction. Biome's default `--write` applies only safe fixes; `--unsafe` is opt-in and changes program behavior. Removing an unused import is safe; rewriting `==` to `===` can change behavior if the operands differ in type.
  - The CI rule. Biome runs in CI on every PR. The `--frozen-lockfile`/`only-allow pnpm` discipline from the previous lesson has a Biome cousin — the `biome ci` script is what closes the loop. Foreshadowed only; the actual CI job lives in Unit 20.

Senior calls and watch-outs:

- ESLint is named once as the trigger-gated alternative and the lesson moves on.
- The `biome.json` is short; if it grows past 30 lines, the student is configuring rules they don't yet have the experience to justify. Reach for the recommended preset and the domain defaults first.
- The student now has Node + pnpm + TypeScript + Biome wired. Lessons 6-9 of chapter 028 install Next.js + Tailwind + shadcn and ship the actual marketing surface on top of this floor.

Codebase state at entry: `tsconfig.json` runs clean on the empty project.
Codebase state at exit: `biome.json` authored; four daily `pnpm` scripts in `package.json`; format-on-save fires correctly in the editor; `pnpm check` runs clean on the empty project. The toolchain floor is locked in; the next lesson stands up the Next.js + Tailwind + shadcn scaffold the UI lessons assume.

Estimated student time: 30 to 40 minutes.

---

## Lesson 6 — Header, hero, and feature grid

Build the semantic header with desktop nav, the hero with `<Button asChild>` CTAs and a CSS-only `ThemeAwareImage`, and a `cva`-driven `FeatureCard` mapped into a responsive three-column grid.

Goals:

- Fill `components/site-header.tsx`: semantic `<header>` with logo, desktop nav (`<nav aria-label="Primary">` with `navLinks`), and a slot for `<ThemeToggle>` plus `<MobileNav>` (stubbed for now — render an empty `<div className="md:hidden">` placeholder). Use `flex items-center justify-between` and the `container` width. Below `md`, the desktop nav is `hidden md:flex`; the mobile slot is `md:hidden`.
- Fill `components/hero.tsx`: semantic `<section>` with an `<h1>`, supporting paragraph, two CTAs (`<Button asChild><Link href="/signup">Get started</Link></Button>` and `<Button variant="outline" asChild>...</Button>`), and a `<ThemeAwareImage>` to the right on `lg:`, stacking above on `md:` and below. Cross-ref the canonical Button shape from lesson 3 of chapter 022.
- Fill `components/theme-aware-image.tsx`: render both `<img src={light} className="block dark:hidden" />` and `<img src={dark} className="hidden dark:block" />` with shared `alt`, `width`, `height`. The image swap is pure CSS; no JS, no FOUC.
- Fill `components/feature-card.tsx`: use `cva` to declare a `featureCardVariants` table with `tone: { default, brand, muted }` and `emphasis: { quiet, loud }`. Card uses shadcn's `Card`/`CardHeader`/`CardTitle`/`CardDescription` building blocks composed by hand (not the whole `Card` block at once); the icon renders inside a `<div>` with token-backed bg.
- Fill `components/feature-grid.tsx`: `<section>` with an `<h2>` and a `grid grid-cols-1 md:grid-cols-3 gap-6`. Map over `features` from `lib/data.ts` rendering a `<FeatureCard>` per entry. Use the `VariantProps<typeof featureCardVariants>` type for tone and emphasis selection from data.
- Wire `<SiteHeader />`, `<Hero />`, and `<FeatureGrid />` into `app/(marketing)/page.tsx` in order.
- Verify locally: page renders header (with placeholder for mobile nav), hero with theme-aware image swapping correctly when the OS theme changes, three-column grid on desktop, single-column below `md`.

Senior calls and watch-outs:

- `cva` is the senior shape for variant tables. Three booleans (`isBrand`, `isLoud`, `isMuted`) becomes one `tone` union and one `emphasis` union — the variant table makes invalid states unrepresentable. Cross-ref lesson 3 of chapter 022.
- Icon-only buttons (none yet in this lesson, but the theme toggle and mobile trigger appear in lesson 7 of chapter 028 and lesson 8 of chapter 028) require `aria-label`. Pattern named now.
- The theme-aware image ships both `<img>` tags. Optimizing to a single `<picture>` with `prefers-color-scheme` is a senior follow-up; the dual-img reach is correct here because the site preference (controlled by `next-themes` via the `.dark` class) is what we honor, not the OS preference.
- `<Button asChild>` wraps a Next.js `<Link>` — the polymorphism is the Slot pattern from lesson 3 of chapter 022. Naming this once because it appears in every CTA.
- Heading hierarchy: one `<h1>` in the hero, `<h2>` for each section's title, no skipping levels. Cross-ref lesson 3 of chapter 017.

Codebase state at entry: shell with TODO placeholders from lesson 2 of chapter 028.
Codebase state at exit: header (desktop nav only), hero, and feature grid render correctly on desktop and below `md`. Page is responsive at 1280 and 768; mobile nav slot still empty (drawer ships in lesson 8 of chapter 028). Theme toggles via the OS preference; no manual toggle yet.

Estimated student time: 50 to 65 minutes.

---

## Lesson 7 — Pricing, footer, and a flicker-free theme toggle

Compose the pricing cards with a data-driven featured tier, build the three-column footer, and wire a `next-themes` toggle that respects `prefers-reduced-motion` and survives hard reload without hydration warnings or FOUC.

Goals:

- Fill `components/pricing-card.tsx`: a single tier's card. Composes `<Card>` with `<CardHeader>` (`<h3>` for the tier name, the price as a large numeric, the period as muted text), `<CardContent>` listing features with a `<Check />` icon per row (icons `aria-hidden`), and `<CardFooter>` with the CTA `<Button>`. A `featured?: boolean` flag adds a `border-primary ring-2 ring-ring/40` accent and a `<Badge>` "Most popular" — discriminated visual emphasis driven by data.
- Fill `components/pricing-table.tsx`: `<section>` with an `<h2>`, optional paragraph, then a `grid grid-cols-1 md:grid-cols-3 gap-6` of `<PricingCard>`s mapped from `pricingTiers`. Center the featured tier visually with `md:scale-105` and `motion-reduce:scale-100` so reduced-motion users get the static layout.
- Fill `components/site-footer.tsx`: semantic `<footer>` with three columns of link groups (Product, Company, Legal), logo, copyright line, and social icon buttons (each `<Button size="icon" variant="ghost" aria-label="...">`). Below `md`, columns stack.
- Fill `components/theme-toggle.tsx`: a `<Button variant="ghost" size="icon" aria-label="Toggle theme">` that calls `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')` from `useTheme()`. Render both `<Sun />` and `<Moon />` icons; one is hidden per theme via `dark:hidden` and `hidden dark:block`. Guard against the SSR/hydration mismatch by reading `mounted` state via `useEffect` and returning a placeholder-sized button (`<Button size="icon" variant="ghost" aria-hidden />`) until mounted — the canonical `next-themes` workaround.
- Mount `<ThemeToggle />` in the header (between desktop nav and the mobile-nav slot).
- Wire `<PricingTable />` and `<SiteFooter />` into the marketing page.
- Verify locally: pricing table renders three tiers, featured is visually distinct, footer renders, theme toggle flips the site theme and persists across reload with no FOUC. Hard reload in light and dark to confirm first paint matches.

Senior calls and watch-outs:

- The hydration-mismatch dance for the theme toggle is the canonical `next-themes` watch-out. Render a stable placeholder until `mounted`, then swap to the real toggle. Skipping this surfaces a React hydration mismatch warning on every reload.
- FOUC verification: in DevTools Performance, record a reload; the rendered theme must match before the first paint frame. If you see a flash, the inline pre-paint script is misconfigured — check the provided `<ThemeProvider>` props.
- Pricing emphasis through `scale-105` is decorative motion that should respect `prefers-reduced-motion`. Pair every `scale-*` with a `motion-reduce:scale-100`. Same for any future hover transforms.
- Icon-only buttons (theme toggle and social icons in the footer) all need `aria-label`. Decorative icons inside labeled buttons get `aria-hidden`. Cross-ref lesson 3 of chapter 027.
- Color contrast on the muted period text and disabled-looking elements must pass AA. If you used `text-muted-foreground` over `bg-background` from the provided tokens, the palette is already AA-passing; do not invent colors.

Codebase state at entry: header, hero, feature grid render from lesson 6 of chapter 028.
Codebase state at exit: full marketing surface renders desktop and tablet, theme toggle works without FOUC, no hydration warning. Mobile nav slot still empty.

Estimated student time: 50 to 65 minutes.

---

## Lesson 8 — Mobile drawer with scroll lock

Write the `useLockBodyScroll` hook that restores prior overflow on cleanup, then drop it inside a shadcn `Sheet`-based `MobileNav` that traps focus, closes on `Esc` and link click, and keeps the desktop and mobile navs single-source via `hidden md:flex` / `md:hidden`.

Goals:

- Fill `hooks/use-lock-body-scroll.ts`: a custom hook that, when `locked` is true, sets `document.body.style.overflow = 'hidden'` and restores the prior value on cleanup. Run inside `useEffect`; no-op when `typeof document === 'undefined'`. Generic on no parameters beyond the boolean.
- Fill `components/mobile-nav.tsx`: a controlled `<Sheet open onOpenChange>` from shadcn. `<SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>` for the hamburger. `<SheetContent side="left">` renders `<SheetHeader>` with `<SheetTitle>Navigation</SheetTitle>` (accessible name for the dialog) and a `<nav>` listing `navLinks` as styled `<Link>`s. Each link's `onClick` closes the sheet by setting `open` to false so the user lands on the new route without the drawer underlay. Below the links, render `<ThemeToggle />` so the mobile user can flip themes from inside the drawer.
- Inside `<MobileNav>`, call `useLockBodyScroll(open)`. The Radix-handled `<Sheet>` already locks scroll on most browsers; the custom hook is the iOS Safari belt-and-suspenders that the project verifies.
- Mount `<MobileNav links={navLinks} />` in the `md:hidden` slot of `<SiteHeader>`. Desktop slot stays as the existing `<nav className="hidden md:flex">`.
- Verify locally: below `md`, the hamburger button appears; clicking it opens the drawer from the left; Tab cycles within the drawer; Shift+Tab reverses; `Esc` closes the drawer and returns focus to the hamburger; clicking a link navigates and closes the drawer; the underlying page does not scroll while the drawer is open (test on Chrome DevTools "iPhone 14" device emulation).

Senior calls and watch-outs:

- The focus trap is Radix's job, not yours. Writing a focus trap by hand is the canonical lesson 4 of chapter 027 watch-out — don't.
- `<SheetTitle>` is the accessible name for the dialog. Hiding it visually (`<SheetTitle className="sr-only">`) is fine; *omitting* it produces a Radix console error.
- Returning focus to the hamburger trigger on close is automatic with Radix. The exception (lesson 4 of chapter 027) is unmounted triggers, which doesn't apply here.
- The `useLockBodyScroll(open)` cleanup must restore the *prior* `overflow` value, not unconditionally `''`. If a parent scope already had `overflow: hidden`, blanket clearing breaks it.
- The mobile nav must not duplicate the desktop nav's links in the DOM. The `hidden md:flex` and `md:hidden` cut keeps each surface single-source. Cross-ref lesson 6 of chapter 021.
- The link click closes the drawer; pair the navigation and the close in the same handler so the user lands on the new route with focus management already complete.
- Avoid `autoFocus` on a link inside the drawer — Radix's `<Sheet>` already moves initial focus.

Codebase state at entry: full surface from lesson 7 of chapter 028 with empty mobile-nav slot.
Codebase state at exit: full responsive surface works. Mobile drawer opens, traps focus, locks scroll, closes on `Esc` and on link click. Theme toggle accessible from inside the drawer on mobile. All Done-when clauses are now achievable in lesson 9 of chapter 028.

Estimated student time: 45 to 60 minutes.

---

## Lesson 9 — Verify clause by clause

Walk every "Done when" check — no-FOUC reload, Lighthouse 100, keyboard-only traversal, reflow at 360/768/1280, drawer focus trap, scroll lock, and `Esc` close — plus an axe DevTools audit, and name the senior calls one more time.

Goals:

- Walk every "Done when" clause as a verification step (see table in Chapter framing).
- No-FOUC reload: hard reload in light and in dark with system preference set both ways; confirm rendered theme matches first paint. DevTools Performance recording shows no flash frame.
- Lighthouse a11y: run in Chrome incognito; the score is 100; if not, audit findings against the four lesson 2 of chapter 027 commitments and the icon-only-button labeling from lesson 3 of chapter 027.
- Keyboard-only nav: from a fresh tab, Tab from the URL bar; every interactive element receives a visible focus ring in document order; Enter activates buttons and links; Esc closes any open menu.
- Responsive reflow: cycle DevTools device toolbar across 360, 768, 1280 pixel widths; confirm no horizontal scroll, no broken grid, hero stacks correctly, three-column feature grid collapses to one-column below `md`.
- Drawer behaviors: below `md`, open the drawer; Tab cycles within; Shift+Tab reverses; `Esc` closes and returns focus to the trigger; underlying page does not scroll while open; iOS Safari emulation passes the same scroll-lock test.
- Run axe DevTools (extension) as the secondary auditor — its rule coverage exceeds Lighthouse's and catches what Lighthouse misses (lesson 2 of chapter 027). Note any new findings.
- Name the senior calls one more time:
  - Design tokens are the single seat of color truth; never hard-code colors.
  - shadcn primitives ship the focus-trap and ARIA work; your job is to not break it.
  - The four discipline-level a11y commitments held from day one made the audit cheap.
  - `useLockBodyScroll` is the one custom hook this project owns; the rest is composition.
- Forward references:
  - Unit 4 will move this page into a Next.js routing structure with real navigation, layouts, and the App Router primitives.
  - Chapter 081 will add the security headers (CSP, HSTS) this marketing page needs in production.
  - Chapter 094 will add the performance and Core Web Vitals pass; this project ships the a11y baseline, not the perf baseline.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the fix the student wrote.
- If any verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- Lighthouse 100 is necessary, not sufficient. The keyboard pass is the harder bar; treat axe DevTools findings as ground-truth additions.

Codebase state at entry: full surface, working.
Codebase state at exit: same surface, verified clause-by-clause against the spec. Student can articulate which Unit 3 concept bought them which verified behavior.

Estimated student time: 20 to 30 minutes.
