# Lesson 10 — Site footer

## Lesson title

Chapter-outline title "Site footer" fits — keep it.
- Page title: `Site footer`
- Sidebar: `Site footer`

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior reflex that an icon-only control is an accessibility liability until it carries an accessible name, and ships the footer band that proves it: a single `<footer>` landmark whose three data-driven link columns reflow to a stack below `md`, and whose social icon buttons each announce their destination to assistive tech. The payoff is not the markup — a footer is trivial markup — it is that the labelling and reflow are done right *by default*, so the project's a11y bar (Lighthouse 100, keyboard traversal, focus rings) clears this surface without a remediation pass.

## Codebase state

**Entry.** The header (L6), hero + theme-aware image (L7), feature card/grid (L8), and pricing card/table (L9) are built and rendering inside `page.tsx`'s `min-h-dvh` flex column. `src/components/site-footer.tsx` is still the `start/` scaffold: `export const SiteFooter = () => { /* TODO(L10) */ return <footer data-testid="site-footer" />; }`. `page.tsx` already renders `<SiteFooter />` after `<main>`, so the empty band sits at the bottom of the page. `src/lib/data.ts` already exports the typed `footerGroups` (3 groups: Product, Company, Legal — each `{ heading, links: { href, label }[] }`) and `socialLinks` (4 items: `{ href, label, icon: LucideIcon }` — Mail, Globe, Rss, Send). The shadcn `Button` (with `asChild`/`size`/`variant`) is provided under `@/components/ui/`.

**Exit.** `site-footer.tsx` is fully implemented: a `<footer data-testid="site-footer">` landmark with a brand block (text wordmark "Acme", a blurb, a row of labelled social icon buttons), three `<nav aria-label={heading}>` link columns, and a copyright line — laid out in a responsive grid that stacks below `md`. The footer renders live content at the bottom of the page; every footer link and social button is keyboard-reachable with a visible focus ring; each social button announces its destination. `theme-toggle.tsx` (L11) and `mobile-nav.tsx` + the hook (L12) remain as scaffolds.

## Lesson sections

Render the Implementation section list from the contract.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: ship the page's footer — three link columns, the brand, and labelled social buttons that work for screen-reader and keyboard users alike. Follow with a one-paragraph / screenshot description of the finished band: at desktop the brand block sits left of three link columns; below `md` everything stacks into a single column with no horizontal scroll; tabbing reaches every link and social button with a visible focus ring; each social icon button announces its destination.
- Component: a `Screenshot` (desktop + mobile via `TabbedContent`) of the finished footer, or a one-paragraph prose description if no asset.

### Your mission (header: "Your mission")

Prose brief, no implementation hints, woven as the contract specifies. Cover in prose:
- **Feature** (user terms): a footer band with three link-group columns (Product, Company, Legal), a brand block (wordmark + blurb), a copyright line, and a row of social icon buttons — driven by `footerGroups` and `socialLinks` from `src/lib/data.ts`.
- **The senior framing** (lead with this): an unlabelled social icon is exactly the kind of silent a11y failure the project's bar exists to catch — the footer looks simple but is where icon-only controls and column reflow have to be done right.
- **Constraints** (non-functional, no hints): data-driven (no hand-placed columns); colors stay on the provided semantic tokens (no invented colors); the footer is one `<footer>` landmark.
- **Out of scope** (one line): a newsletter signup form and locale/currency switchers.

Then the **Functional requirements** as a single numbered list, each tagged. Author the test file against the `[tested]` items.
1. The footer renders the three link groups with their links, the brand wordmark, and the copyright line. `[tested]`
2. Every social icon button exposes an accessible label naming its destination; the lucide glyph adds no competing accessible text. `[tested]`
3. At desktop the columns sit side by side; below `md` they stack with no horizontal scroll. `[untested]` (layout — verified by hand)
4. The footer is a single `<footer>` landmark. `[tested]`
5. Tabbing reaches each footer link and social button in document order, each with a visible focus ring. `[untested]` (keyboard — verified by hand)

Note for the test-coder: assert observable behavior, not file paths or class names. For (1) assert the rendered link/heading labels from `footerGroups` and the copyright text are present; for (2) assert each social button/link carries an `aria-label` equal to its `socialLinks` label and that the glyph contributes no accessible name (lucide renders a bare decorative `<svg>`); for (4) assert exactly one `contentinfo`/`<footer>` landmark. Tests are React Testing Library queries by accessible role/name; layout (3) and focus-ring (5) are by-hand only.

### Coding time (header: "Coding time")

One-line build prompt: implement `src/components/site-footer.tsx` against the brief and the L10 tests, then expand the solution. Wrap the solution in `<details>` (the writer collapses it).

Reference implementation, organized as it appears in the repo (`site-footer.tsx`), present the whole file as one `AnnotatedCode` to direct focus across its parts:
- Imports: `Link` from `next/link`, `Button` from `@/components/ui/button`, `footerGroups` + `socialLinks` from `@/lib/data`.
- `<footer data-testid="site-footer">` with a `border-t border-border bg-background` band and an inner `container mx-auto … py-12 lg:py-16` flex-column wrapper.
- The responsive grid: `grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]` — the brand block takes the wider `1.5fr` track, the three columns share equal `1fr` tracks; `grid-cols-1` is the mobile stack.
- Brand block: a `Link href="/"` text wordmark "Acme" (the project uses a text wordmark, not the `logo.svg` image — call this out so the writer doesn't expect an `<img>`), a `text-muted-foreground` blurb, and a `flex` row of social buttons mapped from `socialLinks`, each `<Button asChild size="icon" variant="ghost">` wrapping `<a aria-label={link.label} href={link.href}><link.icon /></a>`.
- The three link groups mapped from `footerGroups`: each a `<nav aria-label={group.heading}>` containing an `<h2>` heading and a `<ul>` of `<li><Link>…</Link></li>` rows styled `text-muted-foreground hover:text-foreground`.
- Copyright line: a plain `<p className="text-sm text-muted-foreground">© 2026 Acme, Inc. …</p>`.

Decision rationale (one or two sentences each):
- **Where the accessible label lives under `asChild`.** `<Button asChild>` renders no `<button>` of its own — it merges its props onto the child `<a>` via `Slot`, so the `aria-label` (and `href`) belong on the `<a>`, not on `Button`. The lucide icon is decorative and contributes no text, so the label is the button's only accessible name. Link the ARIA icon-button pattern (lesson 3 of chapter 027) rather than re-explaining.
- **One `<nav>` per group with `aria-label`.** Each column is its own labelled navigation landmark so assistive tech can enumerate "Product / Company / Legal" by name; the `aria-label` reuses the group heading (single source).
- **Why `md:grid-cols-[1.5fr_repeat(3,1fr)]` over four equal columns.** The brand block needs a wider track than the link columns; the arbitrary-value grid template expresses that without a separate flex wrapper, and `grid-cols-1` handles the sub-`md` stack for free.

Coverage of `[untested]` requirements:
- (3) Reflow lives entirely in the grid: `grid-cols-1` (stack) → `md:grid-cols-[…]` (row). No max-width hack needed; `container mx-auto px-4` prevents horizontal scroll.
- (5) Focus rings come from the link/button styles: footer `Link`s carry `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`; the social buttons inherit the shadcn `Button` focus ring. Document order is markup order (brand + social first, then the three nav columns), which is the tab order.

Callout on what looks unusual at a glance: footer group headings are `<h2>`, the same level as the page's section headings — acceptable here because each sits *inside* a labelled `<nav>` landmark, which scopes it; the page keeps its single `<h1>` in the hero. Do not bump these to `<h3>`.

No `CodeVariants`/`CodeTooltips` needed — one annotated file carries it. No diagram: the footer is a static grid reflow that prose plus the finished screenshot covers.

External resources slot (no header) appended after the `<details>` — left for the resourcer.

### Moment of truth (header: "Moment of truth")

Test command and expected pass output, then the by-hand checklist for the untested requirements.
- Command: `pnpm test:lesson 10` (expected: the L10 suite passes — show the green Vitest summary). Note: per the chapter outline the shipped `Lesson 10.test.ts` is a `describe.todo` placeholder, so also run `pnpm verify` (Biome CI + typecheck + production build) as the real automated gate.
- By-hand `Checklist` (the untested requirements): at desktop the columns sit side by side, below `md` they stack with no horizontal scroll; Tab reaches every footer link and social button in document order, each with a visible focus ring; a quick assistive-tech / accessibility-tree check announces each social button's destination.
- Component: a `Checklist` of the by-hand items; `Code` for the test command and the expected terminal output.

## Scope

- Does not build the **theme toggle** — the icon button that flips light/dark is Lesson 11.
- Does not build the **mobile drawer**, the `useLockBodyScroll` hook, or the drawer focus-trap/scroll-lock behavior — Lesson 12.
- Does not re-teach the **ARIA icon-only button label pattern** or `aria-hidden` on decorative glyphs — owned by lesson 3 of chapter 027; link, don't re-explain.
- Does not re-teach **responsive breakpoints / the single-source responsive cut** — owned by lesson 6 of chapter 021.
- Does not run the **full project standards bar** (Lighthouse 100, drawer checks, FOUC) — that sign-off is Lesson 12's `Moment of truth`; this lesson verifies only its own footer behavior.
- Does not add a **newsletter form**, locale/currency switchers, or a logo image — out of scope for this surface.
