# Lesson 11 — Flicker-free theme toggle

- **Sidebar title:** Theme toggle
- **Type:** Implementation

Title is good as-is. Keep `Flicker-free theme toggle`.

## Lesson framing

The student installs the canonical `next-themes` toggle pattern: a CSS-only icon swap that dodges the hydration mismatch entirely instead of papering over it with a `mounted`/`useEffect` mount gate.
The senior payoff is recognizing *when* a control needs no hydration guard at all — when its markup is byte-identical on server and client and only styling branches on theme, there is nothing to mismatch.
They ship the header's light/dark toggle that flips the page instantly, persists across reload, and produces no FOUC and no hydration warning, leaning on the provided `<ThemeProvider>` and the pre-paint script `next-themes` injects.

## Codebase state

**Entry** — The scaffold is fully wired through Lesson 10. `src/app/_components/providers.tsx` already mounts `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`; `globals.css` carries the OKLCH light/`.dark` tokens; `layout.tsx` has `suppressHydrationWarning` on `<html>`. `SiteHeader` (L6) already imports `<ThemeToggle />` and mounts it in its `theme-toggle-slot`; `MobileNav` (L12, still a scaffold) also expects one. `src/components/theme-toggle.tsx` is the `start/` scaffold: a `'use client'` bare `<button type="button" data-testid="theme-toggle" aria-label="Toggle theme" />` with a `TODO(L11)` and no `useTheme` call, so clicking it does nothing and the icons are absent. The provided `ui/button.tsx` (variants incl. `ghost`, sizes incl. `icon`), `Sun`/`Moon` from `lucide-react`, and `useTheme` from `next-themes` are all available.

**Exit** — `theme-toggle.tsx` is the finished component: a `<Button variant="ghost" size="icon">` reading `{ resolvedTheme, setTheme }` from `useTheme()`, whose `onClick` writes `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')`, rendering both `<Sun className="dark:hidden" />` and `<Moon className="hidden dark:block" />`. Clicking flips the whole page; the choice persists across a hard reload with correct first paint and no flash; no hydration warning fires. The header and (forthcoming) mobile drawer both get a working toggle from one source. Only `mobile-nav.tsx` + `use-lock-body-scroll.ts` remain for L12.

## Lesson sections

Implementation lesson — render the contract's four-section list.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: an icon button in the header that flips the site between light and dark, remembers the choice across reloads, and never flashes the wrong theme or throws a hydration warning.
Then a short description (or a Screenshot/TabbedContent of the header in light vs dark with the Sun/Moon swap) of the feature working: click swaps the whole page instantly; a hard reload paints the saved theme on the first frame.
Note this lesson closes the theme story the Hero (L7) opened.

### Your mission

Prose paragraph, weaving Feature + Functional requirements + Constraints + Out of scope as a coherent brief with **no implementation hints** (the requirements list is the only list).

- **Feature:** an icon button in the header that toggles the page between light and dark and persists the choice.
- **Constraints to weave in:** the real subject is the `next-themes` CSS-only icon swap — the pattern that avoids the hydration mismatch rather than guarding it with a mount flag; the no-FOUC guarantee already lives in the provided `<ThemeProvider>` and the pre-paint script, so the job is to not regress it; the component must stay `'use client'`; the toggle is a binary flip (read `resolvedTheme`, which resolves `"system"` to a concrete value, not `theme`); the provided `SiteHeader` already imports this component, so this lesson fills a slot the header already wired.
- **Out of scope (one line):** a three-way light/dark/system menu and per-route theme overrides.

Functional requirements (numbered, each tagged `[tested]`/`[untested]`):

1. Clicking the toggle flips the whole page between light and dark. `[tested]`
2. The chosen theme persists across a hard reload, with first paint already showing the correct theme and no flash. `[untested]`
3. No React hydration mismatch warning appears in the console on reload. `[untested]`
4. The toggle is an icon button with an accessible label and a decorative, hidden-per-theme icon pair. `[tested]`
5. The toggle is reachable by keyboard from the header and activates on Enter. `[untested]`

Note for the writer/test-coder: `[tested]` items are click-behavior and rendered-markup assertions the next agent writes against `Lesson 11.test.ts`; persistence, FOUC-absence, no-hydration-warning, and keyboard activation are confirmed by hand against the provided pre-paint machinery.

### Coding time

One-line build prompt: fill `src/components/theme-toggle.tsx` (already imported by the provided `SiteHeader`) against the brief and tests; then the hidden `<details>` solution to read after attempting.

Reference implementation, organized as in the repo (single file `src/components/theme-toggle.tsx`):

- `'use client'` directive; imports `Moon, Sun` from `lucide-react`, `useTheme` from `next-themes`, `Button` from `@/components/ui/button`.
- `const { resolvedTheme, setTheme } = useTheme();` inside `ThemeToggle`.
- A `<Button type="button" variant="ghost" size="icon" data-testid="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>` containing `<Sun className="dark:hidden" />` and `<Moon className="hidden dark:block" />`.

Use `AnnotatedCode` here — the file is tiny but the teaching is concentrated on three spots the student must focus on separately: (1) both icons always rendering, (2) the `dark:hidden` / `hidden dark:block` CSS swap, (3) `resolvedTheme` read only inside `onClick`. A plain `Code` block undersells why each line matters.

Decision rationale (one or two sentences each) and `[untested]`-requirement coverage:

- **Why both icons ship and the swap is pure CSS.** Both `<Sun>` and `<Moon>` render on every paint; the `.dark` class flipped on `<html>` by `next-themes` toggles which one `display`s. The server and client emit byte-identical markup, so there is no hydration mismatch to guard — this is what makes a `mounted` flag unnecessary (covers req 3). Contrast: a mount gate is only needed for a control whose *content*, not just styling, branches on theme.
- **Why `resolvedTheme`, not `theme`.** `theme` can be the literal `"system"`; `resolvedTheme` is always the concrete `"light"`/`"dark"` the page is actually showing, so the binary flip computes the correct opposite. It is read *only* in the click handler (a post-hydration write), never during render — reinforcing why render stays deterministic (covers req 2/3 reasoning).
- **Why no FOUC (req 2).** Persistence and correct first paint come from the provided `<ThemeProvider>` (localStorage + the injected pre-paint `<script>` that sets `.dark` before React hydrates) plus `suppressHydrationWarning` on `<html>` — this component only must not break that, e.g. by gating render on a flag that would briefly show the wrong icon.
- **Why icon-button a11y (req 4, 5).** `aria-label="Toggle theme"` names the otherwise-iconographic control; the lucide glyphs are decorative `<svg>`s with no competing accessible text; `variant="ghost" size="icon"` is the shadcn icon-button shape, keyboard-focusable and Enter/Space-activatable for free because it is a real `<button>`.

Callout on what looks unusual at a glance: a reader expecting the well-known `mounted`/`useEffect` `next-themes` snippet may be surprised it is absent — name that explicitly and explain the CSS-only swap makes it dead weight here.

For owned topics, **link rather than re-explain:** the `next-themes` wiring shape and `<ThemeProvider>` props (Chapter 018, Lesson 6); the ARIA icon-button label pattern (Chapter 027, Lesson 3). Do not re-teach `cva`/`Button` internals (Chapter 022) or the token/`.dark` model (Chapter 019) — link if a sentence is needed.

The writer wraps this whole section's solution in `<details>` (collapsed by default). Any external resources the resourcer adds go after the `<details>`, no header.

### Moment of truth

- Command: `pnpm test:lesson 11` (runs `tests/lessons/Lesson 11.test.ts` via the provided `scripts/test-lesson.mjs`). Show the expected passing vitest summary.
- Note `pnpm verify` (Biome CI + `tsc --noEmit` + `next build`) also runs clean.
- By-hand `Checklist`/`ChecklistItem` for the requirements tests don't cover (each an `untested` chip the student ticks):
  - Click the toggle and the whole page switches.
  - Hard reload in both light and dark, with the OS/system preference set both ways, and confirm first paint matches with no flash — record a DevTools Performance reload to be certain (req 2).
  - The console shows no React hydration mismatch warning on reload (req 3).
  - Tab from the header reaches the toggle with a visible focus ring and Enter fires it (req 5).

No diagram needed — the flow is a single click handler plus a CSS class swap; prose carries it.

## Scope

- This lesson does **not** build the `<ThemeProvider>`, the pre-paint script, or the token system — they are provided and were introduced in Chapter 018 Lesson 6 (next-themes wiring) and Chapter 019 (tokens / `.dark` model).
- It does **not** cover the theme-aware *image* swap (light/dark `<img>` sources) — that is Lesson 7 (`theme-aware-image.tsx`), the same CSS-swap idea applied to content rather than icons.
- It does **not** add a three-way light/dark/system menu or per-route overrides — explicitly out of scope.
- The mobile drawer that also hosts a `<ThemeToggle>`, plus `useLockBodyScroll`, are Lesson 12.
- The full project standards-bar sign-off (Lighthouse a11y 100, drawer focus trap, responsive reflow) runs at Lesson 12's Moment of truth, not here.
