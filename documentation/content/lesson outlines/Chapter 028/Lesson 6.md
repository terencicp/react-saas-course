# Lesson 6 — Site header with desktop navigation

## Lesson title

Chapter-outline title fits: **Site header with desktop navigation**.
Sidebar: **Site header**.

## Lesson type

`Implementation` — first lesson where the student writes code. The test-coder runs next to replace the `describe.todo` placeholder; the writer renders the Implementation section list.

## Lesson framing

The student installs the discipline that the rest of the surface inherits: the header is the page's keyboard-order spine and its first landmark, so it must be a real `<header>` with one labelled `<nav>`, its links sourced once from `src/lib/data.ts`, and its responsive cut (`hidden md:flex` desktop nav, `md:hidden` mobile slot) keeping each navigation surface single-source. The senior payoff is the no-duplication, landmarks-first reflex — not the CSS. Ships the sticky header shell plus the two empty slots that Lessons 11 (theme toggle) and 12 (mobile drawer) plug into.

## Codebase state

**Entry.** The provided `start/` scaffold with the toolchain understood (Lessons 2-5): `pnpm install` clean, `tsconfig`/`biome.json`/`AGENTS.md` walked. `src/app/page.tsx` already imports and renders `<SiteHeader />` (plus the four other section components, all still TODO stubs). `src/lib/data.ts` exports the typed `navLinks` (4 items: Features `#features`, Pricing `#pricing`, Docs `#docs`, Blog `#blog`). `src/components/site-header.tsx` is a minimal scaffold: an empty `<header data-testid="site-header">` wrapping two empty slot divs (`theme-toggle-slot`, `header-mobile-slot md:hidden`) with the `TODO(L6)` comment. The `ThemeToggle` and `MobileNav` components are still TODO stubs (Lessons 11/12) but already export, so the header can mount them. `tests/lessons/Lesson 6.test.ts` is `describe.todo('Lesson 6')`.

**Exit.** `src/components/site-header.tsx` is the finished sticky header: logo `<Link href="/">` ("Acme"), a `<nav aria-label="Primary">` mapping `navLinks` (`hidden md:flex`), and both slots populated — `theme-toggle-slot` holding `<ThemeToggle />`, `header-mobile-slot` (`md:hidden`) holding `<MobileNav links={navLinks} />`. `pnpm dev` serves the page with the header sticky at the top; `pnpm verify` passes. The header's later-lesson dependents (toggle, drawer) render as their stubs until Lessons 11/12.

## Lesson sections

Intro (no header) — **Goal + Finished result.** One-sentence goal in user terms: ship the semantic site header with desktop nav and the two slots the theme toggle and mobile drawer will fill. Then a short description (or `Screenshot` via `Figure`) of the finished behavior: at 1280 px the logo sits left, nav links + theme-toggle slot sit right; below `md` the links disappear and the mobile slot waits in their place; the bar spans the page at the `container` width and stays stuck on scroll.

### Your mission

Prose paragraph + one requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints.

Prose weaves: the header is the first thing every visitor sees and the spine of the page's keyboard order, so it carries the semantic and layout discipline the rest of the surface inherits. **Feature:** a sticky top bar with the logo, the primary desktop navigation, and the two slots that hold the theme toggle and mobile drawer. **Constraints:** build a real `<header>` landmark (`sticky top-0 z-50`) containing one `<nav>` labelled for assistive tech; source the links from `src/lib/data.ts` so they are never duplicated as DOM literals across the desktop and mobile surfaces; use the responsive cut that keeps each navigation surface single-source (desktop nav visible only at `md`+, mobile slot only below `md`); lay out at the `container` width. **Out of scope:** any sticky-scroll shadow animation beyond what the tokens give for free; the theme toggle and mobile drawer themselves (Lessons 11/12 — this lesson only mounts their slots).

Requirements checklist (each phrased as a verifiable user-facing outcome; tags reflect that `Lesson 6.test.ts` is a `describe.todo` stub, so the test-coder will write assertions against the `[tested]` items via the `data-testid` hooks — the writer keeps the chips honest with whatever the test-coder lands):

1. `[tested]` At desktop widths the header renders the logo and every primary nav link from the data file, in order.
2. `[tested]` Below `md` the desktop nav links are hidden and the mobile slot occupies their place.
3. `[tested]` The header is a single `<header>` landmark containing one `<nav>` labelled for assistive tech, with no nav-link text duplicated across the desktop and mobile surfaces.
4. `[untested]` Tabbing through the header reaches the logo link and each nav link in document order, each with a visible focus ring.
5. `[untested]` At 768 px the bar still spans the page with no horizontal scroll.

(Note for the writer/test-coder: requirements 4-5 are keyboard/reflow behaviors hard to assert in the node-env Vitest harness, so leave them `[untested]` and cover by hand in *Moment of truth*. If the test-coder asserts only DOM structure, 1-3 are the realistic `[tested]` set.)

### Coding time

One-line build prompt: fill `src/components/site-header.tsx` against the brief and the tests; `<SiteHeader />` is already wired into `src/app/page.tsx`, so no page edit is needed. Then the reference solution in a `<details>` (writer collapses it).

Full reference implementation, organized as it appears in the repo — the single `src/components/site-header.tsx` file. Present with `AnnotatedCode` so focus can be directed across the four moving parts (landmark + sticky/container shell, logo link, mapped `hidden md:flex` nav, the two slots). The solution:

- `<header data-testid="site-header" className="sticky top-0 z-50 border-b border-border bg-background">`, an inner `div` at `container mx-auto flex h-16 items-center justify-between px-4`.
- Logo `<Link href="/">Acme</Link>` with `rounded-md` + `focus-visible:ring-[3px] focus-visible:ring-ring/50` (the visible focus ring requirement 4 checks).
- A right-side `flex items-center gap-2` group containing: the `<nav aria-label="Primary" className="hidden items-center gap-1 md:flex">` mapping `navLinks` to `<Link key={link.href} href={link.href}>` styled with `text-muted-foreground hover:text-foreground` + the same focus-ring utilities; the `theme-toggle-slot` div holding `<ThemeToggle />`; the `header-mobile-slot` div (`md:hidden`) holding `<MobileNav links={navLinks} />`.

Decision rationale (one-two sentences each, covering the `[untested]` requirements and the non-obvious choices):
- Why links live in `src/lib/data.ts`, not inline — single source for both the desktop nav and the mobile drawer (which reads the same `navLinks`); the `hidden md:flex` / `md:hidden` cut toggles visibility without re-listing the labels, so requirement 3's no-duplication holds (covers req 3 organization).
- Why the header owns the keyboard spine — it is the first tabbable region; the explicit focus-ring utilities on the logo and every link give requirement 4's visible ring rather than relying on the browser default the project suppresses (covers req 4).
- Why `<nav aria-label="Primary">` — labelling the landmark disambiguates it from the footer's nav for assistive tech (covers req 3 labelling).
- Why the slots are populated now — `ThemeToggle`/`MobileNav` already export as stubs, so mounting them here means Lessons 11/12 only fill the components, not rewire the header.

Callouts: `sticky top-0 z-50` keeps the bar pinned on scroll above page content; the `md:hidden` wrapper on the mobile slot is what hides the drawer trigger on desktop — pair it mentally with the nav's `hidden md:flex` as the two halves of one responsive cut.

Links rather than re-explaining: the canonical Button shape and `asChild`/Slot (lesson 3 of chapter 022) — note the header itself uses plain `<Link>`, not `<Button asChild>`, so this is a forward pointer for the slots; semantic-landmark and heading-hierarchy rules (lesson 3 of chapter 017); the `dark:` / token-backed color model (`text-muted-foreground`, `border-border`, `bg-background`) from lesson 4 of chapter 019. No diagram — prose and the annotated file carry the structure.

### Moment of truth

Test command `pnpm test:lesson 6`, plus `pnpm verify` for the Biome + `tsc --noEmit` + `next build` gate. State plainly that the shipped `Lesson 6.test.ts` is currently a `describe.todo` placeholder (the test-coder fills it next); show the expected pass output once assertions land (all `tested` requirements green). The real verification today is the by-hand checklist (covering the `[untested]` items 4-5 and confirming 1-3 visually):

- At 1280 px the logo and all four nav links show on the right.
- Below `md` (e.g. 360 px) the links hide and the mobile slot waits in their place.
- `pnpm dev` serves the page with the header sticky at the top on scroll.
- Tab from the URL bar reaches the logo link then each nav link in document order, each with a visible focus ring.
- At 768 px there is no horizontal scroll and the bar spans the page.

Use `Checklist`/`ChecklistItem` for the by-hand list so ticks persist.

## Scope

- Theme toggle behavior and the flicker-free `next-themes` wiring — Lesson 11 (this lesson only mounts the slot).
- Mobile nav drawer, Sheet, focus trap, body-scroll lock — Lesson 12 (this lesson only mounts the slot).
- Hero, `<h1>`, and theme-aware image — Lesson 7.
- Sticky-scroll shadow / motion polish — out of project scope (tokens + shadcn defaults only, per Lesson 1's standing commitments).
