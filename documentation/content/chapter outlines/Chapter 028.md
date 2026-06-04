# Chapter 028 — Project: themed product surface

## Chapter framing

Chapter 028 cashes in everything Unit 3 installed. The student ships a real static product/marketing page — header, hero, three-column feature grid, pricing table, footer, and a mobile nav drawer below the `md` breakpoint — built out of shadcn primitives, CVA variants, semantic-token theming, and a working theme toggle that survives reload without FOUC. The accessibility baseline is non-negotiable: every Implementation lesson closes on its own behavior check, and the project's standards bar is verified throughout — Lighthouse a11y 100, keyboard-only navigation, color-contrast pass, focus rings, semantic landmarks, heading hierarchy, layout reflow at three widths, and the drawer's focus trap plus scroll lock.

The codebase ships a fully scaffolded Next.js 16 project in `start/` — the toolchain, configs, shadcn primitives, `globals.css`, `layout.tsx`, `page.tsx`, `providers.tsx`, and the typed `lib/data.ts` are all provided. Lessons 2-5 are walkthroughs of the *provided* config files (the decisions they capture), not author-from-empty exercises; Lessons 6-12 are the only lessons where the student writes code — the eleven component/hook files left as `TODO(Ln)` scaffolds. The student work lives under `src/` (the project uses the `src/` directory layout with the `@/*` alias resolving to `./src/*`).

The project's goals — the standards bar a senior holds this surface to, each a behavior the finished page must exhibit:

- **No FOUC.** First paint is identical regardless of system theme; a DevTools Performance recording shows no flash frame on reload in light or dark.
- **Lighthouse a11y 100.** The accessibility score is 100 in an incognito audit, with no flagged issues.
- **Keyboard-only traversal.** Tabbing from the URL bar reaches every visible interactive control in document order, each with a visible focus ring; Enter activates, Esc closes.
- **Responsive reflow at 360 / 768 / 1280 px.** No horizontal scroll, no broken grid; the hero stacks below `md` and the three-column grid collapses to one column below `md`.
- **Drawer focus trap.** Below `md`, an open drawer cycles Tab within itself and reverses on Shift+Tab; focus never escapes to the page underneath.
- **Drawer body-scroll lock.** While the drawer is open the page does not scroll, including under iOS Safari emulation; closing restores scroll.
- **Drawer Esc close.** Pressing Esc closes the drawer and returns focus to the trigger button.

Threads that run through every lesson: shadcn primitives are imported from `@/components/ui/`, never reinstalled; the `cn()` helper merges every `className` override; design tokens flow through `@theme inline` and `--primary`/`--background`/`--foreground` rather than literal colors; layout uses flex and CSS Grid with responsive breakpoints (`sm:`, `md:`, `lg:`); dark mode is the `.dark` class flipped by `next-themes` and `next-themes`'s injected pre-paint script kills FOUC; accessibility is verified with keyboard and Lighthouse, not promised; the mobile drawer is shadcn's `Sheet` (the focus trap is the primitive's job) and the body-scroll lock is the one custom hook the project owns. The chapter ships the Project Overview, four scaffolding walkthroughs (pnpm, AGENTS.md, tsconfig, Biome), then seven Implementation lessons that each add one confirmable capability the student can `pnpm dev` and use. The scaffolding walkthroughs exist because Chapter 028 is the *from-scratch* project — every subsequent project chapter (Chapter 035 onward) carries this toolchain forward via `degit`, and that pattern only works if one project lays the foundation.

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

### Project file tree (scaffold and configs provided; the eleven `src/components` + `src/hooks` files marked TODO are the only student work, for Lessons 6-12)

```
.mise.toml                       # provided: node = "24", pnpm = "11.3.0"      (walked through L2)
.npmrc                           # provided: engine-strict=true, auto-install-peers=true   (L2)
pnpm-workspace.yaml              # provided: onlyBuiltDependencies: sharp       (L2)
pnpm-lock.yaml                   # provided: committed lockfile                  (L2)
package.json                     # provided: packageManager pnpm@11.3.0, engines node >=24, scripts   (L2)
AGENTS.md                        # provided: thesis, stack, layout, commands, conventions   (walked through L3)
.editorconfig                    # provided (carried from chapter 003)
tsconfig.json                    # provided: strictness floor + Next.js compat surface, @/*->./src/*   (walked through L4)
biome.json                       # provided: formatter + recommended linter + organizeImports   (walked through L5)
next.config.ts                   # provided: reactCompiler: true, turbopack.root
postcss.config.mjs               # provided: @tailwindcss/postcss
components.json                  # provided: shadcn new-york style, neutral base, lucide icons
vitest.config.ts                 # provided: node env, include tests/lessons/**
next-env.d.ts                    # provided: Next.js generated, committed, never edited
scripts/
  test-lesson.mjs                # provided: runs one tests/lessons/Lesson <n>.test.ts via vitest
tests/lessons/
  Lesson 6.test.ts … Lesson 12.test.ts   # provided: describe.todo stubs (harness in place; assertions TBD)
public/
  hero-light.png, hero-dark.png  # provided
  logo.svg                       # provided
src/
  app/
    layout.tsx                   # provided: <html lang="en" suppressHydrationWarning>, font classes, <Providers>
    page.tsx                     # provided: min-h-dvh flex column, <SiteHeader/> <main> sections <SiteFooter/>
    globals.css                  # provided: @import "tailwindcss"; OKLCH tokens light + .dark; @theme inline maps to --color-*
    _components/
      providers.tsx              # provided: 'use client' ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange
  components/
    ui/                          # provided by shadcn: button, badge, card, sheet, separator, skeleton
    site-header.tsx              # TODO(L6)  student
    hero.tsx                     # TODO(L7)  student
    theme-aware-image.tsx        # TODO(L7)  student (renders light/dark sources)
    feature-card.tsx             # TODO(L8)  student (cva-driven variants: tone, emphasis)
    feature-grid.tsx             # TODO(L8)  student
    pricing-card.tsx             # TODO(L9)  student
    pricing-table.tsx            # TODO(L9)  student
    site-footer.tsx              # TODO(L10) student
    theme-toggle.tsx             # TODO(L11) student (useTheme + sun/moon icons)
    mobile-nav.tsx               # TODO(L12) student (Sheet trigger + content)
  hooks/
    use-lock-body-scroll.ts      # TODO(L12) student
  lib/
    data.ts                      # provided: typed copy + pricing fixtures (navLinks, features, pricingTiers, footerGroups, socialLinks)
    utils.ts                     # provided: cn()
```

Note: there is no `(marketing)` route group; the marketing page is `src/app/page.tsx` directly. `Card`/`Sheet`/`Badge`/`Separator`/`Skeleton` are the provided shadcn primitives — there is no standalone `dialog.tsx` (the `Sheet` wraps Radix's Dialog internally). The `<header>`/`<main>`/`<footer>` landmark frame: `SiteHeader` and `SiteFooter` carry their own `<header>`/`<footer>`, and `page.tsx` provides the `<main>` wrapper around the three middle sections.

### Reference-solution signatures lessons will display

- `useLockBodyScroll(locked: boolean): void` — when `locked`, saves the prior `document.body.style.overflow` and sets it to `'hidden'`, restoring the prior value on cleanup; the effect early-returns when not locked, and runs only client-side (it lives in `useEffect`).
- `featureCardVariants = cva(base, { variants: { tone: { default, brand, muted }, emphasis: { quiet, loud } }, defaultVariants: { tone: 'default', emphasis: 'quiet' } })` returning a class string.
- `FeatureCardProps = ComponentProps<'article'> & VariantProps<typeof featureCardVariants> & { title: string; description: string; icon: LucideIcon }`.
- `PricingCardProps = ComponentProps<'article'> & { name: string; price: string; period: 'month' | 'year'; features: string[]; featured?: boolean; cta: { label: string; href: string } }`.
- `ThemeToggle: () => JSX.Element` (`'use client'`) using `useTheme()` from `next-themes`; renders `<Button type="button" variant="ghost" size="icon" aria-label="Toggle theme">` with `<Sun className="dark:hidden" />` and `<Moon className="hidden dark:block" />`; the click handler flips off `resolvedTheme`.
- `MobileNav: ({ links }: { links: { href: string; label: string }[] }) => JSX.Element` (`'use client'`) wrapping a controlled `<Sheet open onOpenChange>` with `SheetTrigger` (the `Menu` icon button, `aria-label="Open menu"`), `SheetContent side="left"`, and a `<SheetTitle>`; calls `useLockBodyScroll(open)`; links close the sheet on click; a `<ThemeToggle>` sits in the content.
- `ThemeAwareImage: ({ light, dark, alt, width, height, ...props }: ThemeAwareImageProps) => JSX.Element` rendering both `<img>` sources (`block dark:hidden` and `hidden dark:block`) so SSR ships both and CSS picks the right one — no JS branch, no FOUC. `ThemeAwareImageProps = { light; dark; alt; width: number; height: number } & ComponentProps<'img'>`.
- Page data: `src/lib/data.ts` exports `navLinks`, `features: FeatureCardProps[]`, `pricingTiers: PricingCardProps[]`, `footerGroups`, `socialLinks`, all typed; it imports `FeatureCardProps`/`PricingCardProps` *from* the card components (the type flows component → data, not the reverse).
- Env entries: none — fully static.

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

### Project deliverable → owning Chapter 028 lesson

- pnpm + lockfile + `.npmrc` + `.mise.toml` toolchain (walkthrough of the provided files) — Lesson 2.
- `AGENTS.md` (walkthrough) — Lesson 3.
- `tsconfig.json` (walkthrough) — Lesson 4.
- `biome.json` + daily scripts (walkthrough) — Lesson 5.
- `src/components/site-header.tsx` (semantic header, desktop nav, theme-toggle and mobile-nav slots) — Lesson 6.
- `src/components/hero.tsx` + `src/components/theme-aware-image.tsx` — Lesson 7.
- `src/components/feature-card.tsx` (CVA variants) + `src/components/feature-grid.tsx` — Lesson 8.
- `src/components/pricing-card.tsx` + `src/components/pricing-table.tsx` — Lesson 9.
- `src/components/site-footer.tsx` — Lesson 10.
- `src/components/theme-toggle.tsx` (flicker-free `next-themes` toggle) — Lesson 11.
- `src/hooks/use-lock-body-scroll.ts` + `src/components/mobile-nav.tsx` (Sheet drawer) — Lesson 12.

---

## Lesson 1 — Project Overview

Frame the static marketing surface as a SaaS pattern, state the project's standards bar, show the final UX at three widths, set the scope cut, and frame this as the from-scratch toolchain project (no `degit` clone of a prior project — Chapter 035 introduces that flow). The student leaves with the project's scope and bar internalized; the four scaffolding walkthroughs that follow explain the provided toolchain before any UI code is written.

Scope cut to state in this framing intro: static page only, no real auth, no real CMS, no analytics, no animations beyond shadcn defaults; copy and pricing live in a typed `data.ts`. Name the senior-mindset payoff — this surface is the visible bar your design system holds, every shadcn component and token and responsive utility cashed out at once — and the three standing commitments the chapter will not negotiate: the accessibility bar is non-negotiable (a 99 Lighthouse score or a single keyboard trap is a failure); motion comes free with `tw-animate-css` and shadcn defaults, reduced-motion already respected, so do not roll your own; the drawer is shadcn's `Sheet` and the one custom hook is `useLockBodyScroll`, nothing more.

### What we're building (no header)

A real public-facing product/marketing surface — header, hero, three-column feature grid, pricing table, footer, and a mobile nav drawer below `md` — the page every B2B SaaS ships before login. A single figure carries three screenshots of the finished app: desktop at 1280, tablet at 768, mobile at 360 with the drawer open.

### What we'll practice

The Unit 3 skills cashed out at once: composing shadcn primitives, driving variants with CVA, theming through semantic tokens, building responsive layout with flex and CSS Grid, wiring a flicker-free `next-themes` toggle, and holding an accessibility bar with keyboard and Lighthouse rather than promising it. Plus reading the from-scratch toolchain critically: understanding why the project pins pnpm, what earns a place in `AGENTS.md`, the two halves of `tsconfig`, and the Biome floor — the decisions captured in the provided config files.

### Architecture

Labeled list / shape only: a single static Next.js App Router route at `src/app/page.tsx` composing section components from `src/components/`, primitives from `src/components/ui/`, typed copy and pricing from `src/lib/data.ts`, the one project-owned hook in `src/hooks/`, theming via `next-themes` (the `<ThemeProvider>` lives in `src/app/_components/providers.tsx`) + the `.dark` class + the OKLCH tokens and `@theme inline` block in `src/app/globals.css`. No data fetching, no auth, no server state.

### Starting file tree

Reuse the annotated tree under "Project file tree" above as the source; in the Overview, comment one line each only on the provided files lessons will touch and mark the TODO component stubs as the highlighted focus.

### Roadmap

One Card per lesson (Lessons 2-12) in a CardGrid, each with the lesson number, title, and one sentence naming what it adds.

### Setup

Because this is the from-scratch project, the Setup centers on the toolchain rather than a starter clone. The `start/` codebase ships the project already scaffolded and installed — the configs, shadcn primitives, `globals.css`, `layout.tsx`, `page.tsx`, `providers.tsx`, and the typed `src/lib/data.ts` are all in place, and `pnpm dev` serves the page shell immediately. Lessons 2-5 walk through the *provided* toolchain files (pnpm/lockfile, `AGENTS.md`, `tsconfig`, Biome) so the student understands every decision before touching code in Lesson 6. Name the prerequisite from earlier units: `mise` is already installed (lesson 8 of chapter 003); `pnpm install` is driven by `.mise.toml`'s pinned Node 24 + pnpm 11.3.0. No env vars — the project is fully static.

---

## Lesson 2 — pnpm and the lockfile contract

Walk through the provided pnpm toolchain — pnpm pinned through mise (`.mise.toml`), the `package.json` with `packageManager` and `engines` pinned, the committed `pnpm-lock.yaml` as the deterministic resolution record, and the `preinstall` guard against mixed package managers with `only-allow pnpm`.

Goals:

- The decision up front, in three sentences. pnpm is the package manager default in 2026 — strict non-hoisted `node_modules` (phantom-dependency bugs surface at install time, not in production), monorepo-first design, mature ecosystem, full Node compat. Bun gets one line as the conditional alternative — faster on cold installs, ~95% Node-compat means one package in twenty surprises, no built-in audit; ready for some teams in 2026 but not the default the course teaches against. The trigger that would flip the choice: a greenfield project where install time genuinely dominates CI and the team has the bandwidth to handle compat edges.
- Pinning pnpm through mise rather than globally via Homebrew or the standalone installer — the provided `.mise.toml` pins both `node = "24"` and `pnpm = "11.3.0"`, keeping the package manager version pinned per-repo for free and avoiding the global-version drift that bites teams. The student already has `mise` from lesson 8 of chapter 003.
- The post-Corepack reality. Corepack is removed from Node 25+ distributions and the ecosystem is moving off it. pnpm 11 ships `manage-package-manager-versions` enabled by default, so once any pnpm is installed, the `packageManager` field in `package.json` is enough to lock the version per-repo — pnpm itself swaps in the right binary. The provided `package.json` sets `packageManager: "pnpm@11.3.0"`; explain the field is read by pnpm on every invocation.
- The minimum-viable `package.json` as provided — `name`, `private: true` (because this is an app, not a publishable library, and the field prevents an accidental `pnpm publish`), `type: "module"` (ESM-first in 2026), `packageManager`, `engines: { node: ">=24" }` (paired with `engine-strict=true` to make the runtime pin a hard error), and the `scripts` block the later lessons fill out (`dev`, `build`, `start`, plus the Biome/verify scripts from Lesson 5).
- The four pnpm commands a SaaS engineer runs daily: `pnpm install` (and what it actually does — resolves the dependency graph, writes the lockfile, populates `node_modules` from the global content-addressed store via symlinks), `pnpm add <pkg>` / `pnpm add -D <pkg>` (with the dev-dependency distinction at production-build time named explicitly), `pnpm remove`, and `pnpm run <script>` (with the `pnpm <script>` shorthand and what `pnpm` does when the script name collides with a built-in).
- The `.npmrc` at the repo root for two settings the course relies on: `engine-strict=true` (the `engines` field in `package.json` becomes a hard error, not a warning — pairs with the runtime pin from lesson 8 of chapter 003) and `auto-install-peers=true` (modern default, but explicit avoids the surprise on older pnpm versions). One line on the `pnpm-workspace.yaml` the scaffold ships: it allows the `sharp` native build (`onlyBuiltDependencies: sharp`) so Next.js's image pipeline can compile — pnpm 10+ blocks lifecycle build scripts by default, and this file is the allowlist.
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

Codebase state at entry: the provided `start/` scaffold with the standards bar from lesson 1 of chapter 028.
Codebase state at exit: the student understands the provided toolchain — `.mise.toml` pins Node 24 + pnpm 11.3.0; `package.json` has `packageManager` and `engines` set; `.npmrc` has `engine-strict=true` and `auto-install-peers=true`; `pnpm-workspace.yaml` allows the `sharp` build; `pnpm install` runs clean; `pnpm-lock.yaml` is committed; the `preinstall` script guards against mixed package managers.

Estimated student time: 30 to 40 minutes.

---

## Lesson 3 — AGENTS.md as the next contributor's briefing

Walk through the project's provided `AGENTS.md` at the repo root for what earns a place (thesis, pinned stack, layout, commands, conventions pointers) and what doesn't (aspirational prose, duplicated rules, hand-maintained file lists), with the deeper documentation doctrine deferred to Chapter 101.

Goals:

- The senior question: what is the file the next person to open this repo (human or AI agent) should read first, and what earns a place in it. `AGENTS.md` is that file in 2026. The Linux Foundation adopted it as an Agentic AI Foundation founding project in late 2025; major coding agents (Codex, Cursor, Claude Code, Factory) read it natively. The framing for the course: `AGENTS.md` is **operational onboarding**, not architectural prose — the durable facts the next contributor needs to be productive in their first session.
- Write the project's `AGENTS.md` at the repo root with the sections that earn a place. Each section gets one-line justification:
  - **Thesis line** — one or two sentences naming what the project is. Without it, the agent or new contributor has to infer the domain from file names.
  - **Stack core** — pinned versions of the load-bearing libraries (Next.js 16, React 19, TypeScript X.Y, Tailwind v4, shadcn/ui, Drizzle X.Y for later projects) so an agent doesn't hallucinate an old API surface.
  - **Repo layout** — the file tree by directory with one line per directory on what lives there. Saves the next contributor the discovery step.
  - **Commands** — the daily commands (`pnpm dev`, `pnpm build`, `pnpm check`, `tsc --noEmit`, `pnpm verify`, `pnpm test:lesson <n>`) so an agent doesn't try `npm run …`. The provided file names `pnpm verify` as the gate (Biome CI + typecheck + build).
  - **Conventions** — pointers to where the conventions live (the `biome.json` from lesson 5 of chapter 028, the `.editorconfig` from lesson 7 of chapter 003, the `tsconfig.json` from lesson 4 of chapter 028). The conventions are not duplicated in prose; the agent is told where to look. The provided `AGENTS.md` keeps this to a single sentence.
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

Codebase state at entry: the provided toolchain understood (lesson 2 of chapter 028) — `package.json`, `.mise.toml`, `.npmrc`, `pnpm-workspace.yaml`, lockfile.
Codebase state at exit: the student understands the provided `AGENTS.md` at the repo root — thesis line, stack core, repo layout, daily commands, conventions pointers — a tight single-screen file (no "additional context" section is needed for this static project).

Estimated student time: 20 to 25 minutes.

---

## Lesson 4 — Configuring tsconfig

Walk through the provided `tsconfig.json` in two halves — the project-owned strictness floor (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, the `@/*` path alias) and the framework-owned compatibility surface (`target`/`lib`, `module`/`moduleResolution: "bundler"`, `isolatedModules`/`esModuleInterop`, `jsx: "react-jsx"`, `noEmit`, the Next.js plugin) — under the rule that the project owns the first half and Next.js owns the second.

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
- Path aliases — the project's other strictness lever. `"paths": { "@/*": ["./src/*"] }`; with modern `moduleResolution: "bundler"` no `baseUrl` is needed (the path is resolved relative to the `tsconfig` location), and the project omits it. The alias maps `@/` to the `src/` directory, so imports read `@/components/...`, `@/lib/...`, `@/hooks/...`. Two senior questions: why use aliases at all (refactor safety — moving a file doesn't break a hundred imports written as `'../../../lib/foo'`), and why the course uses `@/` specifically (Next.js's convention since the App Router shipped, recognized by every editor and every AI tool, no debate). One line on the runtime-resolution gotcha: `tsconfig`-defined paths are *checked* by `tsc` and *resolved* by Next.js's bundler (and by Vitest via `tsconfigPaths: true` in `vitest.config.ts`); standalone scripts run through `tsx` (not `node` native stripping, from lesson 8 of chapter 003) because native stripping doesn't read `tsconfig.json`.
- **The compatibility surface (framework-owned).** Author each group with the agreement it enforces between TypeScript, the bundler, and the runtime.
  - `"target": "ES2022"` and `"lib": ["dom", "dom.iterable", "esnext"]` — what JavaScript features TypeScript can emit, and which built-in types it knows about. `ES2022` is broadly the floor Next.js 16 sets; `lib` includes DOM so client components type-check against `window`, `document`, etc., and `esnext` so the latest standard-library types (ES2025 Set methods, iterator helpers) are available at the type level.
  - `"module": "esnext"` and `"moduleResolution": "bundler"` — how `import`/`export` are interpreted and how the resolver finds files. `bundler` is the modern moduleResolution mode (TypeScript 5+) that aligns with how Turbopack actually resolves imports.
  - The transpiler-alignment pair (plus JSON support).
    - `"isolatedModules": true` — every file must be transpilable in isolation, without information from other files. Required by Turbopack. Catches `const enum` (which can't be isolated), barrel re-exports of types without `export type`, and a handful of other patterns the framework can't compile.
    - `"esModuleInterop": true` — smooths over the CommonJS-vs-ESM interop friction so `import express from 'express'` works against a CommonJS module. Less load-bearing on App Router but still on for compatibility with the legacy CJS dependencies the ecosystem still ships.
    - `"resolveJsonModule": true` — lets the code `import data from './x.json'` with the JSON typed. One line; it ships in the config.
    - `"verbatimModuleSyntax": true` — forces `import type` on every type-only import. Name the bug class it catches (a type import pulling a runtime module's side effects onto the client) and pair it with `isolatedModules` as the transpiler-alignment discipline the provided config enables.
  - `"jsx": "react-jsx"` — TypeScript emits the React 19 automatic JSX runtime directly (no `import React`); this config uses `react-jsx`, not the older `preserve`-and-let-the-framework-transform mode.
  - `"noEmit": true` — TypeScript only type-checks; it never writes `.js` files. The companion script the course runs is `tsc --noEmit` (folded into the `verify` script) — same flag, separate process, type-checking the codebase without competing with the build.
  - `"skipLibCheck": true`, `"incremental": true`, `"allowJs": false` — the standard Next.js floor: skip type-checking `.d.ts` files in dependencies (speed), cache type-check results between runs (speed), and forbid `.js`/`.jsx` sources (TS-only project).
  - `"plugins": [{ "name": "next" }]` — the Next.js TypeScript plugin in the editor. Adds editor-level type-checking for the metadata API, route parameters, dynamic route segments, and the validator for the App Router's typed routes.
  - The `"include"` and `"exclude"` arrays — `next-env.d.ts` (Next.js's generated declarations — never edit, always commit), `**/*.ts`, `**/*.tsx`, the `.next/types/**/*.ts` and `.next/dev/types/**/*.ts` directories (auto-generated typed-route output). `"exclude"` lists `node_modules`.
- The senior rule across the lesson, stated plainly. **The flags in the second half are not personal preference.** The student should resist the temptation to "harden" them past what Next.js sets, because the framework's correctness depends on them. The strictness lever is the first half; the compatibility surface is left to Next.js.
- The `next-env.d.ts` file. One paragraph: Next.js generates it on the first run, the file references the framework's ambient types, and the student commits it (the file's presence is required at build time) and never edits it. The "never edit" rule is concrete because the file has a comment header saying so.

Senior calls and watch-outs:

- The rule of thumb: if you're tempted to edit a flag in the compatibility surface, you're probably wrong; if you're tempted to edit a flag in the strictness floor, you're probably right.
- `noUncheckedIndexedAccess` is the flag the student will feel the most in everyday code. The friction is real; the bug class it catches is realer.
- Set `typescript.tsdk` in `.vscode/settings.json` (from lesson 7 of chapter 003) to the workspace TypeScript once `node_modules/typescript` exists, so the editor's diagnostics match the build's.

Codebase state at entry: `package.json`, `.mise.toml`, `AGENTS.md`, lockfile committed (the provided scaffold).
Codebase state at exit: the student understands the provided `tsconfig.json` — strictness floor and compatibility surface; `tsc --noEmit` runs clean.

Estimated student time: 35 to 45 minutes.

---

## Lesson 5 — Biome, the single-binary linter and formatter

Adopt Biome as the 2026 default over ESLint+Prettier — single Rust binary, dependency-aware domains — walk through the provided `biome.json`, the daily `pnpm` scripts and the `verify` gate, and frame the safe-versus-unsafe fix distinction.

Goals:

- The decision up front, in three sentences. Biome replaces ESLint + Prettier as the 2026 default for new SaaS projects on this stack — single Rust binary, single `biome.json`, 10–25x faster on lint and format, ships with rule domains that auto-enable based on installed dependencies (Next.js, React, the test runner). The trigger that would flip the choice: an ESLint plugin the team genuinely needs that Biome doesn't cover or have a domain for. For the course's stack, no such plugin is load-bearing; Biome wins.
- The `next lint` ghost. Next.js 16 removed `next lint` and the `eslint` option from `next.config`. The platform now expects the project to wire linting itself. The course wires Biome directly through `pnpm` scripts; the migration codemod (`@next/codemod` `next-lint-to-eslint-cli`) is named in one line for students who later inherit a Next 15 codebase, then dropped.
- Biome is a pinned workspace dependency. The scaffold installs it as `@biomejs/biome` at an exact version (`2.4.16`, no caret) — `--save-exact` is the pattern, so the version is pinned the same way the runtime and package manager are pinned. (The starter is generated with `pnpm biome init`; the course ships the curated result.)
- The provided `biome.json`. Walk through the fields the student actually reads:
  - `"$schema"` — versioned JSON schema URL so the editor autocompletes the config itself.
  - `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }` — Biome respects `.gitignore` so it never lints `node_modules` or `.next`.
  - `"files": { "ignoreUnknown": true, "includes": ["**", "!next-env.d.ts", "!.next", "!node_modules"] }` — the explicit ignore of the generated `next-env.d.ts` and build output.
  - `"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }` — matches the `.editorconfig` from lesson 7 of chapter 003 by construction (two-space, spaces).
  - `"javascript": { "formatter": { "quoteStyle": "single" } }` — single quotes; the rest of the JS formatting takes Biome's defaults.
  - `"linter": { "enabled": true, "rules": { "recommended": true, "performance": { "noImgElement": "off" } } }` — the recommended preset is the floor; `noImgElement` is turned off because the project deliberately uses raw `<img>` in `ThemeAwareImage` (Next.js `<Image>` is Unit 4 territory).
  - `"css": { "parser": { "tailwindDirectives": true } }` — teaches Biome to parse Tailwind's `@theme`/`@apply` directives in `globals.css` without false errors.
  - `"assist": { "actions": { "source": { "organizeImports": "on" } } }` — sorted imports as a save-time fix, with no separate import-sort plugin.
- The domain system, the v2 thing worth naming. Biome 2 introduced domains — grouped rule sets for `next`, `react`, `test`, etc. — that auto-enable when the matching dependency is in `package.json`. The provided config relies on this auto-enable rather than listing domains explicitly; name that `"linter": { "domains": { "next": "recommended" } }` is how you'd pin one if needed.
- The Biome commands as `pnpm` scripts in the provided `package.json`:
  - `"format": "biome format --write ."`
  - `"lint": "biome lint ."`
  - `"check": "biome check --write ."` — runs format + lint + import-sort + safe quick-fixes in one pass. The script the student runs locally before committing.
  - `"verify": "biome ci . && tsc --noEmit && next build"` — the gate: Biome CI mode (no writes, fails on any diagnostic) chained with the typecheck and a production build. This is the project's single "is it shippable" command; the standalone `biome ci` CI job lives in Unit 20.
- The editor integration. Format-on-save and `source.organizeImports.biome` were wired in lesson 7 of chapter 003; this lesson is the moment that wiring actually fires because the config now exists. Demonstrate one round: open a file, save it ugly, watch Biome format on save and surface a lint warning inline (the Error Lens extension from lesson 7 of chapter 003 puts it on the same line).
- Two senior watch-outs.
  - The "safe vs. unsafe" fix distinction. Biome's default `--write` applies only safe fixes; `--unsafe` is opt-in and changes program behavior. Removing an unused import is safe; rewriting `==` to `===` can change behavior if the operands differ in type.
  - The CI rule. Biome runs in CI on every PR. The `--frozen-lockfile`/`only-allow pnpm` discipline from the previous lesson has a Biome cousin — `biome ci` (folded into the `verify` script) is what closes the loop locally. Foreshadowed only; the standalone CI job lives in Unit 20.

Senior calls and watch-outs:

- ESLint is named once as the trigger-gated alternative and the lesson moves on.
- The `biome.json` is short; if it grows past 30 lines, the student is configuring rules they don't yet have the experience to justify. Reach for the recommended preset and the domain defaults first.
- The student now understands the Node + pnpm + TypeScript + Biome floor the scaffold ships. Lessons 6-12 of chapter 028 build the actual marketing surface on top of the provided Next.js + Tailwind + shadcn scaffold.

Codebase state at entry: `tsconfig.json` runs clean (the provided scaffold).
Codebase state at exit: the student understands the provided `biome.json` and the `format`/`lint`/`check`/`verify` scripts; format-on-save fires correctly in the editor; `pnpm check` and `pnpm verify` run clean. The toolchain floor is understood; the Implementation lessons (6 onward) build the surface on top of the provided Next.js + Tailwind + shadcn scaffold.

Estimated student time: 30 to 40 minutes.

---

## Lesson 6 — Site header with desktop navigation

The student ships the semantic site header: a sticky top bar with the logo, primary desktop navigation, and the two slots that hold the theme toggle and mobile drawer (built in Lessons 11 and 12). Finished result: at 1280 px the header shows the logo on the left and the nav links plus theme-toggle slot on the right; below `md` the nav links disappear and the mobile slot waits in their place; the bar spans the page at the `container` width.

### Your mission

The header is the first thing every visitor sees and the spine of the page's keyboard order, so it carries the semantic and layout discipline the rest of the surface inherits. Build it as a real `<header>` landmark (carrying `data-testid="site-header"`, `sticky top-0 z-50`) with a `<nav aria-label="Primary">` for the links from `src/lib/data.ts`, laid out with `flex items-center justify-between` at the `container mx-auto` width, and use the responsive cut that keeps each navigation surface single-source: the desktop nav is `hidden md:flex`, the mobile slot is `md:hidden`. The two slots — `data-testid="theme-toggle-slot"` and `data-testid="header-mobile-slot"` — hold `<ThemeToggle />` and `<MobileNav links={navLinks} />` respectively (built in Lessons 11 and 12); the shipped `site-header.tsx` mounts both, so this lesson establishes the header shape and slots that the later components plug into. The links are the same `navLinks` the mobile drawer reads, so they must not be duplicated as literals in the DOM. Out of scope: any sticky-scroll shadow animation beyond what the tokens give for free.

Requirements checklist:

- [ ] At desktop widths the header renders the logo and every primary nav link from `src/lib/data.ts`, in order.
- [ ] Below `md` the desktop nav links are hidden and the mobile slot occupies their place.
- [ ] The header is a single `<header>` landmark containing one `<nav>` labelled for assistive tech, with no nav-link text duplicated across the desktop and mobile surfaces.
- [ ] Tabbing through the header reaches the logo link and each nav link in document order, each with a visible focus ring.
- [ ] At 768 px the bar still spans the page with no horizontal scroll.

### Coding time

Build prompt directing the student to fill `src/components/site-header.tsx` against the brief, then a hidden `<details>` reference solution: the sticky `<header>` (`sticky top-0 z-50`, `data-testid="site-header"`) with the logo `<Link href="/">` ("Acme") and a `<nav aria-label="Primary">` at the `container mx-auto` width with `flex items-center justify-between`, the `hidden md:flex` desktop nav over `navLinks`, and the two slots that later lessons fill — `data-testid="theme-toggle-slot"` and `data-testid="header-mobile-slot"` (the latter `md:hidden`). Note that `<SiteHeader />` is already wired into `src/app/page.tsx` by the provided scaffold. Rationale callouts: why the header owns the keyboard-order spine and labelled landmarks, and why links live in `src/lib/data.ts` (single source for both desktop and mobile nav) rather than inline. Link the canonical Button shape (lesson 3 of chapter 022) and semantic-landmark / heading rules (lesson 3 of chapter 017) rather than re-explaining.

### Moment of truth

Run `pnpm test:lesson 6` (and `pnpm verify` for the Biome + typecheck + build gate). Note for the author: the shipped `tests/lessons/Lesson 6.test.ts` is a `describe.todo` placeholder — the harness and the `data-testid` hooks are in place but the assertions are not yet written, so the real verification is the by-hand checklist plus `pnpm verify`. By hand, ticking each off: at 1280 px the logo and all nav links show; below `md` the links hide and the slot waits; `pnpm dev` serves the page with the header at the top; Tab from the URL bar reaches every header control in order with a visible focus ring; at 768 px there is no horizontal scroll.

---

## Lesson 7 — Hero with a flicker-free theme-aware image

The student ships the hero: a headline section with two call-to-action buttons and a marketing image that swaps between a light and a dark asset purely through CSS, with no flash on load. Finished result: at `lg` the copy sits left and the image right; below that they stack; the image already matches the active theme on first paint with no JavaScript branch.

### Your mission

The hero is where the page's single `<h1>` lives and where the theme story first becomes visible, so it has to honor both heading hierarchy and the no-FOUC commitment from the very first frame. Build a `<section>` with one `<h1>`, a supporting paragraph, and two CTAs using `<Button asChild>` wrapping a Next.js `<Link>` — the Slot polymorphism, reused here because every CTA on the page uses it. The image is the lesson's real teaching point: ship both the light and dark sources as sibling `<img>` tags toggled by `dark:hidden` and `hidden dark:block`, so the server renders both and CSS alone picks the right one. That dual-`<img>` reach is deliberate — it honors the site's `.dark` class rather than the OS `prefers-color-scheme`, which is what `next-themes` controls, and it means no JavaScript runs before the correct image shows, so there is no flash. Out of scope: a single `<picture>` with `prefers-color-scheme` (a senior follow-up, but it would track the wrong signal here) and Next.js `<Image>` optimization (Unit 4 territory).

Requirements checklist:

- [ ] The hero renders exactly one `<h1>`, the supporting copy, and two working CTA buttons that navigate.
- [ ] The marketing image shown matches the active theme.
- [ ] Toggling the theme (or the OS theme, since no manual toggle exists yet) swaps the image with no flash and no layout shift.
- [ ] At `lg` the copy and image sit side by side; below `lg` they stack with no horizontal scroll.
- [ ] Tabbing reaches both CTAs in order, each with a visible focus ring.

### Coding time

Build prompt to fill `src/components/hero.tsx` and `src/components/theme-aware-image.tsx` against the brief, then the hidden `<details>` solution: the `<section data-testid="hero">` laid out as a `lg:grid-cols-2` grid with the single `<h1>`, the two `<Button asChild size="lg"><Link/></Button>` CTAs (one default, one `variant="outline"`), and the `ThemeAwareImage` (`/hero-light.png`, `/hero-dark.png`) rendering both `<img>` sources (`data-testid="hero-image-light"`/`"hero-image-dark"`) with shared `alt`/`width`/`height` and the `block dark:hidden` / `hidden dark:block` swap. Rationale callouts: why both `<img>` tags ship to the client, and why this honors the `.dark` class over the OS preference. Link the Button/Slot shape (lesson 3 of chapter 022) and `dark:` variant mechanics (lesson 5 of chapter 018).

### Moment of truth

Run `pnpm test:lesson 7` and `pnpm verify` (the `Lesson 7.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand: with the OS theme set to dark then light, the correct image is showing; record a DevTools Performance reload and confirm no flash frame as the image resolves; at `lg` the layout is side by side, below it stacks, no horizontal scroll; Tab reaches both CTAs in order with a visible focus ring.

---

## Lesson 8 — Feature grid with CVA card variants

The student ships the feature grid: a responsive three-column band of feature cards whose visual tone and emphasis are selected from data through a `cva` variant table. Finished result: at desktop three cards sit in a row, each styled per its data-driven tone; below `md` they collapse to a single column.

### Your mission

This is the lesson where the design-system muscle pays off: instead of a tangle of boolean props, the card exposes one `tone` union and one `emphasis` union through a `cva` table, so invalid visual states are unrepresentable and the data file decides how each card looks. Build `src/components/feature-card.tsx` as an `<article>` (carrying `data-testid="feature-card"`) that composes shadcn's `CardHeader`/`CardTitle`/`CardDescription` building blocks by hand (not the whole `Card` block at once) with the icon in a token-backed container, and type the variant props with `VariantProps<typeof featureCardVariants>`. The card's base classes — not a `<Card>` wrapper — carry the card surface, and `featureCardVariants({ tone, emphasis })` merges through `cn()`. Then build `src/components/feature-grid.tsx` as a `<section id="features" data-testid="feature-grid">` with an `<h2>` and a `grid grid-cols-1 md:grid-cols-3 gap-6` mapping over `features` from `src/lib/data.ts`. Colors come only from the semantic tokens — `--primary`, `--muted`, `--foreground` — never literals, so the cards theme for free. Out of scope: per-card hover motion and any fourth column or carousel.

Requirements checklist:

- [ ] The grid renders one card per entry in `features`, each showing its icon, title, and description.
- [ ] Each card's tone and emphasis reflect the values set in the data, with no invalid combination expressible.
- [ ] At desktop the cards form three columns; below `md` they collapse to one column with no horizontal scroll.
- [ ] The section is introduced by an `<h2>` with no heading-level skip from the hero's `<h1>`.
- [ ] Card colors respond to the active theme because they read semantic tokens, not literal colors.

### Coding time

Build prompt to fill `src/components/feature-card.tsx` and `src/components/feature-grid.tsx` against the brief, then the hidden `<details>` solution: the `featureCardVariants = cva(base, ...)` table with `tone` (`default`/`brand`/`muted`) and `emphasis` (`quiet`/`loud`) variants and `defaultVariants`, the hand-composed `CardHeader`/`CardTitle`/`CardDescription` building blocks inside the `<article>`, the `FeatureCardProps` type, and the grid section mapping `features`. Rationale callouts: why one `tone`/`emphasis` union beats three booleans (invalid states unrepresentable), and why the card building blocks are composed piecewise. Link the CVA + `VariantProps` and `Slot` material (lesson 3 of chapter 022) and the grid layout (lesson 3 of chapter 020).

### Moment of truth

Run `pnpm test:lesson 8` and `pnpm verify` (the `Lesson 8.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand: at 1280 px three columns; below `md` one column with no horizontal scroll; the `<h2>` reads correctly in the heading outline; toggle the OS theme and confirm card colors follow because they are token-backed.

---

## Lesson 9 — Pricing table with a featured tier

The student ships the pricing table: a responsive row of pricing cards driven by data, with one tier visually promoted as "most popular" and reduced-motion users served a static layout. Finished result: at desktop three pricing cards sit in a row with the featured tier accented and lifted; below `md` they stack; users who prefer reduced motion see no scale transform.

### Your mission

Pricing is where data-driven emphasis meets the accessibility floor: a single `featured` flag in the data must produce the accent, the badge, and the lift without any of it being hand-placed per tier, and the lift must not punish users who asked for less motion. Build `src/components/pricing-card.tsx` as an `<article>` (`data-testid="pricing-card"`, or `"pricing-card-featured"` when featured) composing the `CardHeader`/`CardContent`/`CardFooter` building blocks: header (tier name as `<h3>`, price as a large numeric, period as muted text), a feature list with a `<Check />` icon per row, and a footer CTA `<Button asChild>` wrapping a `<Link>`. The `featured` branch adds `border-primary shadow-md ring-1 ring-primary`, a "Most popular" `<Badge>`, and a default (rather than `outline`) Button variant. Build `src/components/pricing-table.tsx` as a `<section id="pricing" data-testid="pricing-table">` with an `<h2>` and a `grid grid-cols-1 md:grid-cols-3 gap-6` mapped from `pricingTiers`, lifting the featured tier by passing `className="md:scale-105 md:motion-reduce:scale-100"` from the grid (the table, not the card, owns the lift). Note that the decorative `<Check />` icons in the solution are not individually `aria-hidden`; if the requirements call for hiding them, add `aria-hidden` in the build. Muted text must keep AA contrast — using `text-muted-foreground` over `bg-background` from the provided tokens already passes, so do not invent colors. Out of scope: a monthly/yearly toggle and real checkout.

Requirements checklist:

- [ ] The table renders one card per entry in `pricingTiers`, each showing name, price, period, feature list, and CTA.
- [ ] The tier flagged `featured` in the data is visually distinct (accent ring plus "Most popular" badge) and no other tier is.
- [ ] The featured tier's lift is suppressed when the user prefers reduced motion.
- [ ] At desktop the tiers form three columns; below `md` they stack with no horizontal scroll.
- [ ] The muted price/period text meets AA contrast against its background.
- [ ] The decorative check icons carry no misleading accessible text (lucide renders a bare `<svg>`; add `aria-hidden` if your a11y pass calls for it).

### Coding time

Build prompt to fill `src/components/pricing-card.tsx` and `src/components/pricing-table.tsx` against the brief, then the hidden `<details>` solution: the `PricingCardProps` shape (`ComponentProps<'article'> & {...}`), the `<article>` composing `CardHeader`/`CardContent`/`CardFooter` with the `featured` branch driving the `border-primary` accent, the `<Badge>`, and the default-vs-`outline` Button variant, the feature list with `<Check />` rows, and the grid with the `md:scale-105 md:motion-reduce:scale-100` lift passed from the table. Rationale callouts: why the lift is paired with `motion-reduce:`, and why emphasis is data-driven rather than per-tier markup. Link `prefers-reduced-motion` / `motion-reduce:` (lesson 5 of chapter 021) and the ARIA icon rules (lesson 3 of chapter 027).

### Moment of truth

Run `pnpm test:lesson 9` and `pnpm verify` (the `Lesson 9.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand: at 1280 px three columns with the featured tier accented and lifted; below `md` they stack with no horizontal scroll; enable "reduce motion" in DevTools rendering and confirm the lift drops to a static layout; a contrast check on the muted text passes AA.

---

## Lesson 10 — Site footer

The student ships the footer: a semantic footer band with three link-group columns, the logo, a copyright line, and labelled social icon buttons. Finished result: at desktop three columns of links sit beside the brand block; below `md` the columns stack; every icon-only social button announces its destination to assistive tech.

### Your mission

The footer looks simple but it is where icon-only controls and column reflow have to be done right, because an unlabelled social icon is exactly the kind of silent accessibility failure the project's bar exists to catch. Build `src/components/site-footer.tsx` as a `<footer data-testid="site-footer">` landmark driven by `footerGroups` and `socialLinks` from `src/lib/data.ts`: the three link groups (Product, Company, Legal), each its own `<nav aria-label={heading}>` with a heading and a `<ul>` of links; the brand block (logo, blurb); a copyright line; and a row of social buttons, each a `<Button asChild size="icon" variant="ghost">` wrapping an `<a>` whose `aria-label` names the destination (the lucide glyph carries no accessible text). Lay the brand block plus three columns out as a responsive grid (`md:grid-cols-[1.5fr_repeat(3,1fr)]`) that stacks below `md`. Colors stay on the provided tokens. Out of scope: a newsletter signup form and locale/currency switchers.

Requirements checklist:

- [ ] The footer renders the three link groups with their links, the logo, and the copyright line.
- [ ] Every social icon button exposes an accessible label naming its destination (carried on the `<a>`); the lucide glyph adds no competing accessible text.
- [ ] At desktop the columns sit side by side; below `md` they stack with no horizontal scroll.
- [ ] The footer is a single `<footer>` landmark.
- [ ] Tabbing reaches each footer link and social button in document order, each with a visible focus ring.

### Coding time

Build prompt to fill `src/components/site-footer.tsx` against the brief, then the hidden `<details>` solution: the `<footer>` with the three `<nav>` column groups, the brand block, the copyright line, and the labelled `<Button asChild size="icon" variant="ghost">` social row (label on the `<a>`), plus the responsive grid that stacks below `md`. Rationale callout: why icon-only buttons need an accessible label and where it goes when the button is `asChild` over an `<a>`. Link the ARIA icon-button pattern (lesson 3 of chapter 027).

### Moment of truth

Run `pnpm test:lesson 10` and `pnpm verify` (the `Lesson 10.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand: at desktop the columns sit side by side, below `md` they stack with no horizontal scroll; Tab reaches every footer control in order with a visible focus ring; a quick assistive-tech check announces each social button's destination.

---

## Lesson 11 — Flicker-free theme toggle

The student ships the theme toggle: an icon button in the header that flips the site between light and dark, persists the choice across reloads, and never triggers a hydration warning or a flash of the wrong theme. Finished result: clicking the toggle swaps the whole page's theme instantly and the choice survives a hard reload with first paint already correct.

### Your mission

This lesson closes the theme story the hero opened, and its real subject is the canonical `next-themes` CSS-only icon swap — the pattern that dodges the hydration mismatch entirely instead of papering over it with a mount gate. Build `src/components/theme-toggle.tsx` (`'use client'`, `data-testid="theme-toggle"`) as a `<Button type="button" variant="ghost" size="icon" aria-label="Toggle theme">` whose `onClick` calls `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')` from `useTheme()`, rendering both `<Sun className="dark:hidden" />` and `<Moon className="hidden dark:block" />`. Because both icons always render and the markup is byte-identical on server and client, there is no mismatch to guard — `useTheme()` is read only for the post-hydration write, never during render, so no `mounted` flag is needed (that gate is reserved for a control whose *content*, not just styling, branches on theme). The provided `SiteHeader` already mounts `<ThemeToggle />` in its `theme-toggle-slot` (and `MobileNav` renders one too), so this lesson fills in the component the header already imports. The no-FOUC guarantee leans on the provided `<ThemeProvider>` (in `src/app/_components/providers.tsx`) and the pre-paint script `next-themes` injects, so the verification is to confirm the toggle does not regress it. Out of scope: a three-way light/dark/system menu (the toggle is a binary flip) and per-route theme overrides.

Requirements checklist:

- [ ] Clicking the toggle flips the whole page between light and dark.
- [ ] The chosen theme persists across a hard reload, with first paint already showing the correct theme and no flash.
- [ ] No React hydration mismatch warning appears in the console on reload.
- [ ] The toggle is an icon button with an accessible label and a decorative, hidden-per-theme icon pair.
- [ ] The toggle is reachable by keyboard from the header and activates on Enter.

### Coding time

Build prompt to fill `src/components/theme-toggle.tsx` (already imported by the provided `SiteHeader`), against the brief, then the hidden `<details>` solution: the `'use client'` `useTheme()`-driven button reading `resolvedTheme` in the click handler and the CSS-only `<Sun>`/`<Moon>` swap. Rationale callouts: why both icons ship and the swap is pure CSS (byte-identical markup means no mismatch and no mount gate), and why the toggle flips off `resolvedTheme` rather than `theme` (which can be `"system"`). Link the `next-themes` wiring (lesson 6 of chapter 018) and the ARIA icon-button pattern (lesson 3 of chapter 027).

### Moment of truth

Run `pnpm test:lesson 11` and `pnpm verify` (the `Lesson 11.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand: click the toggle and the whole page switches; hard reload in both light and dark with the system preference set both ways and confirm first paint matches with no flash (record a DevTools Performance reload to be sure); the console shows no hydration mismatch warning; the toggle is tabbable and fires on Enter.

---

## Lesson 12 — Mobile drawer with scroll lock

The student ships the mobile navigation drawer and the project's one custom hook, completing the responsive surface: below `md` a hamburger opens a left-side drawer that traps focus, locks body scroll (iOS Safari included), and closes on `Esc` or a link tap, returning focus to the trigger. Finished result: on a phone-width viewport the hamburger opens the drawer, keyboard focus stays inside it, the page behind does not scroll, and choosing a link both navigates and closes the drawer.

### Your mission

This is the capstone capability and the one place the project owns custom behavior, so the brief draws a sharp line between what the primitive gives you and what you write. The focus trap, the return-focus-on-close, and the overlay are Radix's job inside shadcn's `<Sheet>` — writing a focus trap by hand is the classic mistake to avoid. What the project owns is exactly one hook, `useLockBodyScroll(locked)`, which saves the *prior* `document.body.style.overflow`, sets it to `'hidden'` when locked, and restores the prior value on cleanup (not a blanket `''`, which would clobber a parent's lock); the effect early-returns when not locked and runs only client-side (inside `useEffect`), and exists as the iOS Safari belt-and-suspenders the `<Sheet>` alone doesn't guarantee. Build `src/components/mobile-nav.tsx` (`'use client'`) as a controlled `<Sheet open onOpenChange>` whose `<SheetTrigger asChild>` wraps the labelled hamburger `<Button>` (`aria-label="Open menu"`, `data-testid="mobile-nav-trigger"`), whose `<SheetContent side="left" data-testid="mobile-nav-content">` carries a `<SheetTitle>` (the dialog's accessible name — omitting it is a Radix error) and a `<nav aria-label="Primary">` of links that close the drawer on click, with `<ThemeToggle>` available inside. Build the hook in `src/hooks/use-lock-body-scroll.ts` and call `useLockBodyScroll(open)` from `MobileNav`. The provided `SiteHeader` already mounts `<MobileNav links={navLinks} />` in its `md:hidden` slot, so the desktop and mobile navs stay single-source from `navLinks`. Out of scope: a custom modal, hand-rolled focus management, and nested submenus.

Requirements checklist:

- [ ] Below `md` a labelled hamburger button opens a left-side drawer; the desktop nav remains the only nav at `md` and up.
- [ ] While the drawer is open, Tab cycles focus within it and Shift+Tab reverses; focus never reaches the page behind.
- [ ] While the drawer is open the page behind does not scroll, including under iOS Safari emulation; closing restores scroll to its prior state.
- [ ] Pressing `Esc` closes the drawer and returns focus to the hamburger trigger.
- [ ] Tapping a link navigates and closes the drawer in the same action.
- [ ] The theme toggle is usable from inside the drawer.

### Coding time

Build prompt to fill `src/hooks/use-lock-body-scroll.ts` and `src/components/mobile-nav.tsx` (already imported by the provided `SiteHeader`), against the brief, then the hidden `<details>` solution: the client-only `useLockBodyScroll` (early-return when unlocked, save-and-restore the prior overflow on cleanup), the controlled `<Sheet open onOpenChange>` with the labelled `<SheetTrigger asChild>`, the `<SheetContent side="left">` with `<SheetTitle>` and the link list whose handlers close the drawer, and the in-drawer `<ThemeToggle>`. Rationale callouts: why the cleanup restores the prior value rather than clearing, why `<SheetTitle>` is mandatory, and why the focus trap is left to Radix. Link the focus-trap / return-focus contract (lesson 4 of chapter 027), `useEffect` cleanup (lesson 1 of chapter 025), the custom-hook shape (lesson 1 of chapter 026), and the single-source responsive cut (lesson 6 of chapter 021).

Forward references for the student, placed after the solution: Unit 4 moves this page into a real App Router structure with layouts and navigation primitives; Chapter 081 adds the production security headers (CSP, HSTS) this marketing page needs; Chapter 094 adds the performance and Core Web Vitals pass — this project ships the accessibility baseline, not the perf baseline.

### Moment of truth

This lesson completes the surface, so its check runs the full project standards bar. Run `pnpm test:lesson 12` and `pnpm verify` (the `Lesson 12.test.ts` file is a `describe.todo` placeholder, and `pnpm verify` runs Biome CI + typecheck + production build across the whole project — the final shippability gate). Then walk the project's standards bar by hand, ticking each off:

- [ ] No FOUC — hard reload in light and dark with the system preference set both ways; the rendered theme matches first paint and a DevTools Performance recording shows no flash frame.
- [ ] Lighthouse a11y 100 — run in Chrome incognito; if short, audit findings against the four discipline-level commitments (lesson 2 of chapter 027) and the icon-button labelling (lesson 3 of chapter 027).
- [ ] Keyboard-only traversal — from a fresh tab, Tab from the URL bar reaches every interactive control in document order with a visible focus ring; Enter activates; Esc closes any open menu.
- [ ] Responsive reflow at 360 / 768 / 1280 px — no horizontal scroll, no broken grid, hero stacks, feature grid collapses to one column below `md`.
- [ ] Drawer focus trap — below `md`, Tab cycles within the open drawer and Shift+Tab reverses; focus never escapes.
- [ ] Drawer body-scroll lock — the page behind does not move while the drawer is open, iOS Safari emulation included; closing restores scroll.
- [ ] Drawer `Esc` close — `Esc` closes the drawer and returns focus to the trigger.
- [ ] axe DevTools — run the extension as a secondary auditor (its coverage exceeds Lighthouse's; lesson 2 of chapter 027) and note any new findings.

If any check fails, the lesson points back at the owning Implementation lesson rather than at ad-hoc debugging. Senior calls to restate as the surface is signed off: design tokens are the single seat of color truth; shadcn primitives ship the focus-trap and ARIA work and the job is to not break it; the four discipline-level commitments held from day one made this audit cheap; `useLockBodyScroll` is the only custom hook this project owns and the rest is composition.
