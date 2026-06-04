# Chapter 028 — Lesson 1 outline

## Lesson title

Page title: **Project overview**
Sidebar: **Overview**

(The chapter-outline title "Project Overview" fits; lowercased to sentence case. The contract fixes this lesson's title as "Project Overview" — keep it.)

## Lesson type

`Project overview` (always the first project lesson; no feature built, no test-coder run).

## Lesson framing

The student leaves with the project's scope and standards bar internalized: a static public product/marketing surface is the visible bar a design system is held to, and this one cashes out every Unit 3 skill — shadcn primitives, CVA variants, semantic-token theming, responsive flex/grid, a flicker-free `next-themes` toggle, and an accessibility floor verified with keyboard and Lighthouse rather than promised — at once. The senior payoff to install up front: this is the *from-scratch* toolchain project (no `degit` clone of a prior repo — that flow arrives in Chapter 035), so the four scaffolding walkthroughs that follow exist to explain the provided pnpm/AGENTS.md/tsconfig/Biome foundation before any UI code is written, and the chapter holds three non-negotiable commitments — accessibility (a 99 Lighthouse score or a single keyboard trap is a failure), motion that comes free from `tw-animate-css` and shadcn defaults (do not roll your own), and the drawer being shadcn's `Sheet` plus the single project-owned `useLockBodyScroll` hook, nothing more.

## Codebase state

First lesson — no Entry/Exit deltas. State only the destination: the `start/` scaffold is fully installed and `pnpm dev` serves the page shell; the student's job across the chapter is to understand the provided toolchain (L2-5) and fill the eleven `TODO` component/hook stubs (L6-12).

## Lesson sections

Follow the Project-overview section list: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.

### What we're building (no header)

One paragraph framing the surface as a SaaS pattern — header, hero, three-column feature grid, pricing table, footer, and a mobile nav drawer below `md`: the page every B2B SaaS ships before login. Name the scope cut here, woven into prose, not a list: static page only, no real auth, no real CMS, no analytics, no animations beyond shadcn defaults; copy and pricing live in a typed `src/lib/data.ts`. Close on the senior-mindset payoff — this is the visible bar the design system is held to, every token and primitive and responsive utility cashed out at once.

Single figure: three finished-app screenshots — desktop at 1280, tablet at 768, mobile at 360 with the drawer open. Use `Screenshot` (desktop/mobile variants) wrapped in `TabbedContent` for the three widths, inside a `Figure` with a caption. (Screenshot assets are the writer's to source from the solution; brief them as the three viewport captures.)

### What we'll practice

Name "What we'll practice" per contract. Prose, no list: the Unit 3 skills cashed out at once — composing shadcn primitives, driving variants with CVA, theming through semantic tokens, building responsive layout with flex and CSS Grid, wiring a flicker-free `next-themes` toggle, and holding an accessibility bar with keyboard and Lighthouse rather than promising it. Plus the second half: reading the from-scratch toolchain critically — why the project pins pnpm, what earns a place in `AGENTS.md`, the two halves of `tsconfig`, the Biome floor. Keep terse; this is a skills preview, not a teaching section.

### Architecture

Shape only — a labeled list, no diagram (prose carries it; a box-and-arrow adds nothing for a single static route). Label the pieces: a single static Next.js App Router route at `src/app/page.tsx` composing section components from `src/components/`; primitives from `src/components/ui/`; typed copy and pricing from `src/lib/data.ts`; the one project-owned hook in `src/hooks/`; theming via `next-themes` (the `<ThemeProvider>` lives in `src/app/_components/providers.tsx`) plus the `.dark` class plus the OKLCH tokens and `@theme inline` block in `src/app/globals.css`. End on the negative space: no data fetching, no auth, no server state.

Render as a short labeled list (or a tight `Card`-free bullet list); if the writer prefers, a `FileTree`-style grouping by directory role works, but the file tree itself belongs in the next section — keep this purely about roles/shape.

### Starting file tree

Use `FileTree`. Source: the "Project file tree" block in the chapter outline. Annotation rule per contract — comment one line each *only* on provided files that lessons will touch (configs walked in L2-5, `globals.css`/`layout.tsx`/`page.tsx`/`providers.tsx`/`lib/data.ts`/`lib/utils.ts`), leave the rest uncommented, and mark the eleven `TODO` component/hook stubs as the highlighted focus (FileTree's highlight). The eleven student files:

- `src/components/site-header.tsx` (L6), `hero.tsx` + `theme-aware-image.tsx` (L7), `feature-card.tsx` + `feature-grid.tsx` (L8), `pricing-card.tsx` + `pricing-table.tsx` (L9), `site-footer.tsx` (L10), `theme-toggle.tsx` (L11), `mobile-nav.tsx` + `src/hooks/use-lock-body-scroll.ts` (L12).

Note the two structural facts from the outline so the writer doesn't invent scope: no `(marketing)` route group (the page is `src/app/page.tsx` directly); the landmark frame is split — `SiteHeader`/`SiteFooter` carry their own `<header>`/`<footer>`, and `page.tsx` provides the `<main>` wrapper around the three middle sections. Provided shadcn primitives in `ui/`: button, badge, card, sheet, separator, skeleton (there is no standalone `dialog.tsx`; `Sheet` wraps Radix's Dialog).

### Roadmap

`CardGrid` of eleven `Card`s, one per lesson (L2-12), each with lesson number + title + one sentence naming what it adds. Source titles/scope from the chapter outline:

- **L2 — pnpm and the lockfile contract:** the provided pnpm toolchain — version pinning through mise, the committed lockfile as a deterministic contract, the mixed-package-manager guard.
- **L3 — AGENTS.md as the next contributor's briefing:** what earns a place in the repo's onboarding file (thesis, pinned stack, layout, commands, conventions pointers) and what doesn't.
- **L4 — Configuring tsconfig:** the `tsconfig.json` in two halves — the project-owned strictness floor and the Next.js-owned compatibility surface.
- **L5 — Biome, the single-binary linter and formatter:** Biome over ESLint+Prettier — the `biome.json`, the daily `check`/`verify` scripts, safe-vs-unsafe fixes.
- **L6 — Site header with desktop navigation:** the semantic sticky `<header>` with logo, desktop nav, and the theme-toggle and mobile-drawer slots.
- **L7 — Hero with a flicker-free theme-aware image:** the single-`<h1>` hero with two CTAs and a light/dark image swapped purely by CSS, no flash.
- **L8 — Feature grid with CVA card variants:** a responsive three-column grid whose card tone and emphasis are selected from data through a `cva` table.
- **L9 — Pricing table with a featured tier:** a data-driven pricing row with one promoted tier and a lift that respects reduced motion.
- **L10 — Site footer:** the footer landmark — brand block, three link-group navs, labelled social icon buttons.
- **L11 — Flicker-free theme toggle:** the `next-themes` sun/moon toggle with a CSS-only icon swap and no mount gate.
- **L12 — Mobile nav drawer:** the shadcn `Sheet` drawer with focus trap (the primitive's job), the `useLockBodyScroll` hook, and Esc-to-close.

(Confirm L10-12 titles against the chapter outline's later lesson headers when the writer renders; the outline tail past L9 was not read here — use the "Project deliverable → owning lesson" map: L10 footer, L11 theme-toggle, L12 use-lock-body-scroll + mobile-nav.)

### Setup

`Steps` component. This is the from-scratch project, so Setup centers on the toolchain, not a starter clone — but the `start/` repo ships already scaffolded and installed (configs, shadcn primitives, `globals.css`, `layout.tsx`, `page.tsx`, `providers.tsx`, typed `lib/data.ts` all in place) and `pnpm dev` serves the page shell immediately.

Steps to brief:

1. Clone/obtain the `start/` codebase. Reference the definitive repo path: `https://github.com/terencicp/react-saas-course-projects/Chapter 028/start/`.
2. Prerequisite already in place from earlier units: `mise` is installed (lesson 8 of chapter 003); it drives the pinned Node 24 + pnpm 11.3.0 from `.mise.toml`.
3. `pnpm install` — resolves against the committed lockfile and populates `node_modules`.
4. `pnpm dev` — starts the Next.js dev server.

No env var list — the project is fully static (omit the env section per contract). Expected result: the dev server runs and the browser shows the page shell (the provided `layout.tsx`/`page.tsx` render; the eleven section components are empty `TODO` scaffolds, so the page is mostly bare frame at this point). Name that the four walkthroughs (L2-5) explain every provided toolchain decision before the student writes UI in L6. No technology rationale here — that belongs to the walkthrough lessons.

## Scope

This lesson does not build any feature or explain any technology rationale — it sets scope and bar only. Specifically deferred:

- Why pnpm / the lockfile contract / mixed-PM guard — **Lesson 2**.
- What earns a place in `AGENTS.md` — **Lesson 3**.
- `tsconfig` strictness floor vs. compatibility surface — **Lesson 4**.
- Biome config, scripts, safe-vs-unsafe fixes — **Lesson 5**.
- Every UI component and the `useLockBodyScroll` hook — **Lessons 6-12**.
- The `degit`-starter clone flow (this project is from-scratch) — **Chapter 035** (Unit 4 project).
- All technology rationale for the stack (Tailwind, CVA, `next-themes`, shadcn, semantic tokens) — owned by the Unit 3 teaching chapters (017-027); link, never re-explain.
