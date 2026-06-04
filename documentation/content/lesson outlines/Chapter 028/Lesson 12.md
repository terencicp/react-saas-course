# Lesson 12 — Mobile drawer with scroll lock

## Lesson title

Chapter-outline title fits. Keep: **Mobile drawer with scroll lock**.
Sidebar short title: **Mobile drawer**.

## Lesson type

`Implementation` (capstone — last lesson of the chapter).

## Lesson framing

The student installs the senior reflex of *composing* a modal surface instead of hand-rolling one: shadcn's `Sheet` (Radix Dialog) already ships the focus trap, the overlay, the Esc-to-close, and the return-focus contract, so the only behavior the project actually owns is one small effect — `useLockBodyScroll` — that pins the page behind the drawer (iOS Safari included). Walking away, the student ships the responsive surface's last piece (a `md:hidden` hamburger drawer single-sourced from `navLinks`) and can articulate where the primitive's responsibility ends and theirs begins. Because this lesson closes the surface, its verification is the full project standards bar — the final shippability gate.

## Codebase state

### Entry

Lessons 6–11 done: `site-header.tsx` (sticky landmark, desktop `md:flex` nav from `navLinks`, a `theme-toggle-slot` and a `md:hidden` `header-mobile-slot`), `hero.tsx`, `theme-aware-image.tsx`, `feature-card.tsx` + `feature-grid.tsx`, `pricing-card.tsx` + `pricing-table.tsx`, `site-footer.tsx`, and `theme-toggle.tsx` are all implemented. The provided `SiteHeader` already imports and mounts `<MobileNav links={navLinks} />` in its `md:hidden` slot, and the provided `_components/providers.tsx` wraps the app in `next-themes`. Two files remain as `TODO(L12)` scaffolds:
- `src/hooks/use-lock-body-scroll.ts` — `export const useLockBodyScroll = (_locked: boolean): void => {}` (empty body).
- `src/components/mobile-nav.tsx` — `'use client'`, exports `MobileNav` returning a bare `<button data-testid="mobile-nav-trigger" aria-label="Open menu" />` placeholder; `MobileNavProps` type already declared.

At entry the hamburger renders but does nothing; the page below `md` has no working nav drawer.

### Exit

`useLockBodyScroll(locked)` toggles `document.body.style.overflow` to `'hidden'` while locked and restores the *prior* value on cleanup. `MobileNav` is a controlled `<Sheet>` with a labelled trigger, `SheetContent side="left"` carrying a `<SheetTitle>`, a `<nav aria-label="Primary">` of links that close on click, and an in-drawer `<ThemeToggle>`; it calls `useLockBodyScroll(open)`. The responsive surface is complete and the whole project passes `pnpm verify`. These are the last `TODO(L12)` files — no scaffolds remain.

## Lesson sections

Implementation section list per the contract: *Goal + Finished result* (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: below `md`, a hamburger opens a left-side drawer that traps focus, locks body scroll, and closes on Esc or a link tap — returning focus to the trigger. Follow with a one-paragraph description (or a phone-width `Screenshot` in a `Figure` if a captured asset exists) of the working behavior: hamburger opens the drawer, keyboard focus stays inside, the page behind stays put, and choosing a link both navigates and closes the drawer. Note this is the capstone, so the finished result is the whole surface signed off.

### Your mission

Coherent prose paragraph, no subsection headers, no implementation hints. Weave:

**Feature** (user terms): a mobile navigation drawer for viewports below `md` — a hamburger that opens a slide-in panel of the same nav links the desktop header shows, plus the theme toggle.

**Senior framing to install**: the sharp line between primitive and project. The focus trap, the overlay, Esc-to-close, and return-focus-to-trigger are Radix's job inside shadcn's `Sheet` — hand-writing a focus trap is the classic mistake to avoid. The one thing the project owns is `useLockBodyScroll`, the iOS-Safari belt-and-suspenders the `Sheet` alone doesn't guarantee.

**Functional requirements** as a numbered list, each tagged `[tested]` or `[untested]`. Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip. (Note for test-coder: `Lesson 12.test.ts` is currently a `describe.todo` stub; assertions to be written against the `[tested]` items. Tests target observable behavior via `data-testid`s and the rendered tree, not file paths or imports.)

1. Below `md` a labelled hamburger button opens a left-side drawer; the desktop nav remains the only nav at `md` and up. `[tested]`
2. Tapping a link navigates and closes the drawer in the same action. `[tested]`
3. The open drawer exposes an accessible name (a `SheetTitle`) so the dialog is announced. `[tested]`
4. While the drawer is open the page behind does not scroll, and closing restores scroll to its *prior* state (not a blanket reset). `[tested]` — assert via the `body` `overflow` style toggling on open/close and restoring the saved value.
5. While the drawer is open, Tab cycles focus within it and Shift+Tab reverses; focus never reaches the page behind. `[untested]` — Radix-owned focus trap; confirmed by hand (jsdom can't faithfully assert real focus cycling).
6. Pressing Esc closes the drawer and returns focus to the hamburger trigger. `[untested]` — Radix-owned; confirmed by hand.
7. The theme toggle is usable from inside the drawer. `[untested]` — confirmed by hand.

**Constraints**: single-source the drawer from `navLinks` (the header already passes them, so desktop and mobile stay one list); colors stay on the provided tokens; the cleanup must restore the prior `overflow` value, never clear to `''`.

**Out of scope** (one line): a custom modal, hand-rolled focus management, and nested submenus.

### Coding time

Build prompt: one line directing the student to fill `src/hooks/use-lock-body-scroll.ts` and `src/components/mobile-nav.tsx` (already imported by the provided `SiteHeader`) against the brief and tests. Then the reference solution hidden in `<details>` (writer wraps it), framed as read-after-attempt material. Organize as the two files appear in the repo.

**`src/hooks/use-lock-body-scroll.ts`** — present as a simple `Code` block (16 lines, single concern). The effect early-returns when `!locked`, captures `previousOverflow` from `document.body.style.overflow`, sets `'hidden'`, and the cleanup restores `previousOverflow`; dep array `[locked]`. Rationale callouts (one–two sentences each): restoring the prior value rather than `''` so a parent/outer lock isn't clobbered; the early-return + `useEffect` placement is what keeps it client-only and side-effect-safe. Link `useEffect` cleanup (lesson 1 of chapter 025) and the custom-hook shape (lesson 1 of chapter 026) rather than re-explaining.

**`src/components/mobile-nav.tsx`** — present as `AnnotatedCode` to direct focus across the four moving parts in one file: (a) the `const [open, setOpen] = useState(false)` + `useLockBodyScroll(open)` wiring; (b) controlled `<Sheet open onOpenChange={setOpen}>` with `<SheetTrigger asChild>` wrapping the labelled hamburger `<Button variant="ghost" size="icon" aria-label="Open menu" data-testid="mobile-nav-trigger">` + `<Menu />`; (c) `<SheetContent side="left" data-testid="mobile-nav-content">` with the mandatory `<SheetTitle>` and the `<nav aria-label="Primary">` mapping `links` to `<Link onClick={() => setOpen(false)}>`; (d) the in-drawer `<ThemeToggle />`. Rationale callouts: why `<SheetTitle>` is mandatory (it's the dialog's accessible name — omitting it is a Radix error); why the focus trap, overlay, and Esc/return-focus are left to Radix (don't reimplement); why the link `onClick` flips `open` to `false` so navigate-and-close happen together; why the controlled `open` state is what `useLockBodyScroll` reads. Cover `[untested]` coverage here: `aria-label` on the icon-only trigger, `aria-label="Primary"` on the nav, the `ThemeToggle` placement. Link the focus-trap / return-focus contract (lesson 4 of chapter 027) and the single-source responsive cut (lesson 6 of chapter 021) rather than re-explaining.

**Forward references** (after the solution, prose, per chapter outline): Unit 4 moves this page into a real App Router structure with layouts and navigation primitives; Chapter 081 adds the production security headers (CSP, HSTS) a marketing page needs; Chapter 094 adds the performance / Core Web Vitals pass — this project ships the *accessibility* baseline, not the perf baseline.

External resources: none authored here; the resourcer appends after the `<details>` with no header if any.

No diagram — the flow is small and the prose plus `AnnotatedCode` carry it.

### Moment of truth

Per contract: the command and expected pass output, plus a by-hand checklist for what tests don't cover. Because this is the capstone, the by-hand pass is the *whole project standards bar*.

Commands: `pnpm test:lesson 12` (runs `Lesson 12.test.ts` via the provided runner) and `pnpm verify` (`biome ci . && tsc --noEmit && next build` across the whole project — the final shippability gate). State the expected pass surface: the lesson tests report green for requirements 1–4 and `verify` completes with a clean build. Caveat that `Lesson 12.test.ts` ships as a `describe.todo` stub until the test-coder fills it, so the by-hand bar plus `pnpm verify` is the real gate.

By-hand standards-bar checklist (render with `Checklist`/`ChecklistItem`; each item points back at its owning Implementation lesson on failure, not ad-hoc debugging):
- No FOUC — hard reload in light and dark with system preference set both ways; a DevTools Performance recording shows no flash frame.
- Lighthouse a11y 100 — Chrome incognito; audit shortfalls against the four discipline commitments (lesson 2 of chapter 027) and icon-button labelling (lesson 3 of chapter 027).
- Keyboard-only traversal — Tab from the URL bar reaches every interactive control in document order with a visible focus ring; Enter activates; Esc closes any open menu.
- Responsive reflow at 360 / 768 / 1280 px — no horizontal scroll, no broken grid; hero stacks, feature grid collapses to one column below `md`.
- Drawer focus trap — below `md`, Tab cycles within the open drawer, Shift+Tab reverses; focus never escapes.
- Drawer body-scroll lock — page behind stays put while open (iOS Safari emulation included); closing restores scroll.
- Drawer Esc close — Esc closes the drawer and returns focus to the trigger.
- axe DevTools — run as a secondary auditor (coverage exceeds Lighthouse's; lesson 2 of chapter 027) and note new findings.

Close with the senior calls to restate as the surface signs off: design tokens are the single seat of color truth; shadcn primitives ship the focus-trap and ARIA work and the job is to not break it; the four discipline commitments held from day one made this audit cheap; `useLockBodyScroll` is the only custom hook this project owns and the rest is composition.

## Scope

This lesson does not cover:
- The theme toggle's internals (`useTheme`, CSS-only icon swap, no-FOUC guarantee) — owned by Lesson 11; here it's only *placed* inside the drawer.
- The `SiteHeader` landmark, desktop nav, and slot wiring — owned by Lesson 6 (and provided/imported, not authored here).
- The `next-themes` `ThemeProvider` / pre-paint script — provided in `_components/providers.tsx`, wired in lesson 6 of chapter 018.
- Building a modal/dialog primitive or a focus trap — Radix owns it inside the provided `Sheet`; never reimplement.
- App Router layouts/navigation primitives — Unit 4. Production security headers — Chapter 081. Performance / Core Web Vitals — Chapter 094.
