# Chapter 4.12 — Project: themed product surface

## Chapter framing

Chapter 4.12 cashes in everything Unit 4 installed. The student ships a real static product/marketing page — header, hero, three-column feature grid, pricing table, footer, and a mobile nav drawer below the `md` breakpoint — built out of shadcn primitives, CVA variants, semantic-token theming, and a working theme toggle that survives reload without FOUC. The accessibility baseline is non-negotiable and verified clause by clause: Lighthouse a11y 100, keyboard-only navigation, color-contrast pass, focus rings, semantic landmarks, heading hierarchy, layout reflow at three widths, and the drawer's focus trap plus scroll lock.

Threads that run through every lesson: shadcn primitives are imported from `components/ui/`, never reinstalled; the `cn()` helper merges every `className` override; design tokens flow through `@theme` and `--primary`/`--background`/`--foreground` rather than literal colors; layout uses flex and CSS Grid with responsive breakpoints (`sm:`, `md:`, `lg:`); dark mode is the `.dark` class flipped by `next-themes` and the inline pre-paint script kills FOUC; accessibility is verified with keyboard and Lighthouse, not promised; the mobile drawer is shadcn's `Sheet` (the focus trap is the primitive's job) and the body-scroll lock is the one custom hook the project owns. The chapter ships 1 brief + 1 starter walkthrough + 3 build lessons + 1 verify lesson; each build lesson closes on a runnable state the student can `pnpm dev` and use.

### Dependency carry-in

- **From 4.1 (JSX/HTML semantics):** semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`), heading hierarchy (one `<h1>`, no level skips), `<button type>`, `<label htmlFor>`, `<img alt>`.
- **From 4.2 (Tailwind):** utility-first reflex, `@theme` config, `cn()`, the `dark:` variant, the `next-themes` wiring shape (`<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` plus `suppressHydrationWarning` on `<html>`).
- **From 4.3 (cascade and tokens):** the semantic-token model (`--background`/`--foreground`/`--primary`/`--muted`/`--ring`/`--border`) and OKLCH color values.
- **From 4.4 (layout):** flex axes, CSS Grid with `grid-template-columns`, container queries when applicable, the `min-h-dvh` reach.
- **From 4.5 (typography/color/motion/responsive):** breakpoint utilities, `prefers-reduced-motion`, `tw-animate-css`, fluid type with `clamp()`.
- **From 4.6 (components and composition):** the canonical Button shape (`cva` + `Slot` + `cn()` + `asChild`), `VariantProps<typeof variants>`, discriminated unions for mutually exclusive props.
- **From 4.8 (state and refs):** `useState`, `useRef`, `useId`.
- **From 4.9 (effects):** `useEffect` for body-scroll lock with cleanup; closing-on-escape via event listeners.
- **From 4.10 (custom hooks):** `useLockBodyScroll()` shape — toggles `overflow: hidden` on `body` with cleanup.
- **From 4.11 (shadcn + a11y):** the shadcn CLI install pattern, `asChild` composition, the four discipline-level commitments, focus-trap as the primitive's job, the icon-only button label pattern.

### Starter file tree (stubs marked with TODO)

```
app/
  layout.tsx                     # provided: <html lang="en" suppressHydrationWarning>, ThemeProvider, fonts
  (marketing)/
    page.tsx                     # provided: page shell, section placeholders with TODO comments
  globals.css                    # provided: @import "tailwindcss"; @theme { --background, --foreground, --primary, --muted, --ring, --border, --radius } in light + .dark
components/
  ui/                            # provided by shadcn add: button, sheet, card, separator, badge, skeleton
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

- Tailwind v4 with `@theme` — Chapter 4.2.2.
- `cn()` helper composition — Chapter 4.2.3.
- CVA variant tables (`cva` + `VariantProps`) — Chapter 4.6.3.
- `Slot` + `asChild` polymorphism — Chapter 4.6.3.
- `dark:` variant and the `.dark` class flip — Chapter 4.2.5.
- `next-themes` wiring without FOUC — Chapter 4.2.6.
- Semantic-token model (`--background`, `--foreground`, `--primary`) — Chapter 4.3.4.
- Flex and CSS Grid layout — Chapter 4.4.2, 4.4.3.
- Responsive breakpoints (`sm:`, `md:`, `lg:`) — Chapter 4.5.6.
- `prefers-reduced-motion` and `motion-reduce:` — Chapter 4.5.5.
- shadcn primitives (`Button`, `Sheet`, `Card`, `Badge`, `Separator`) — Chapter 4.11.1.
- The four discipline-level a11y commitments — Chapter 4.11.2.
- ARIA: `aria-label` on icon-only buttons, `aria-hidden` on decorative icons — Chapter 4.11.3.
- Focus trap (Radix handles it inside `Sheet`) and return-focus contract — Chapter 4.11.4.
- `useState`, `useRef`, `useId` — Chapter 4.8.
- `useEffect` with cleanup — Chapter 4.9.1.
- `useLockBodyScroll` custom hook — Chapter 4.10.1.
- Architectural Principle #4 (name things for intent) at design-token naming — surfaced here.

---

## Lesson 4.12.1 — The bar and the brief

Frame the static marketing surface as a SaaS pattern, state the seven "Done when" verifications, show the final UX at three widths, set the scope cut, and clone the starter.

Goals:

- Frame the SaaS pattern being built: the public-facing product surface every B2B SaaS ships before login — and the standards bar a senior holds it to (a11y 100, no FOUC, responsive, focus-trapped drawer).
- State the seven "Done when" verifications in one paragraph; map each to the lesson that builds it.
- Show the final UX as three screenshots: desktop at 1280, tablet at 768, mobile at 360 with the drawer open.
- Set the scope cut: static page only, no real auth, no real CMS, no analytics, no animations beyond shadcn defaults; copy and pricing live in a typed `data.ts`.
- Name the senior-mindset payoff: this surface is the visible bar your design system holds — every shadcn component, every token, every responsive utility cashed out at once.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The accessibility bar is non-negotiable. A 99 Lighthouse score is a failure; a single keyboard trap is a failure. Name the bar up front so the student does not negotiate with themselves at verify time.
- "I'll add motion later" — motion comes free with `tw-animate-css` and shadcn defaults; reduced-motion already respected. Do not roll your own.
- The drawer is shadcn's `Sheet`; do not write a custom modal. The custom hook is `useLockBodyScroll` and only that.

Codebase state at entry: empty directory.
Codebase state at exit: starter cloned, dependencies installed, `pnpm dev` runs and shows the unstubbed shell — the `(marketing)/page.tsx` renders section placeholders with TODO comments, theme toggle absent, drawer absent.

Estimated student time: 10 to 15 minutes.

---

## Lesson 4.12.2 — Tour the starter

Walk the file tree, read the `@theme` token block, `ThemeProvider` wiring, `components.json`, typed `data.ts`, page placeholders, and `next.config.ts`, then confirm `pnpm dev` renders the shell with system theme respected.

Goals:

- Walk the file tree above, calling out provided vs. stubbed.
- Open `globals.css` — read the `@theme` block, the OKLCH token values for light, the `.dark` override block; name the contract: utilities like `bg-background` and `text-foreground` map to these tokens; changing the token changes every consumer.
- Open `app/layout.tsx` — the `<html lang="en" suppressHydrationWarning>`, the `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` wrapping `{children}`. Name why each prop matters and why `suppressHydrationWarning` is correct here, not a code smell.
- Open `components.json` — Radix engine, `iconLibrary: "lucide"`, the `@/components/ui` alias; recognize the daily shape.
- Open `lib/data.ts` — the typed `features`, `pricingTiers`, `navLinks` arrays; reinforce: copy is data, not JSX.
- Open `app/(marketing)/page.tsx` — read the section placeholders with TODO comments naming which component each section expects.
- Open `next.config.ts` — `reactCompiler: true`; cross-ref 4.10.2.
- Run `pnpm dev`, open `localhost:3000`, see the placeholder shell render in light theme; toggle the OS theme and confirm the system theme is respected (the inline `next-themes` script picks up the system preference before paint).

Senior calls and watch-outs:

- The `@theme` block is the single seat of color truth. Resist hard-coding `bg-blue-500` anywhere in the project.
- The shadcn primitives are already in `components/ui/`. There is no `pnpm dlx shadcn add` step in this project — they're checked in. If a primitive is missing, the lesson names it; do not add others on a whim.
- `(marketing)` is a route group — the parentheses do not appear in the URL. Cross-ref 5.1.2 (forward).

Codebase state at entry: starter cloned, dependencies installed, `pnpm dev` runs the placeholder shell.
Codebase state at exit: student has read every provided file and can articulate which component will fill which section. No code written.

Estimated student time: 25 to 35 minutes.

---

## Lesson 4.12.3 — Header, hero, and feature grid

Build the semantic header with desktop nav, the hero with `<Button asChild>` CTAs and a CSS-only `ThemeAwareImage`, and a `cva`-driven `FeatureCard` mapped into a responsive three-column grid.

Goals:

- Fill `components/site-header.tsx`: semantic `<header>` with logo, desktop nav (`<nav aria-label="Primary">` with `navLinks`), and a slot for `<ThemeToggle>` plus `<MobileNav>` (stubbed for now — render an empty `<div className="md:hidden">` placeholder). Use `flex items-center justify-between` and the `container` width. Below `md`, the desktop nav is `hidden md:flex`; the mobile slot is `md:hidden`.
- Fill `components/hero.tsx`: semantic `<section>` with an `<h1>`, supporting paragraph, two CTAs (`<Button asChild><Link href="/signup">Get started</Link></Button>` and `<Button variant="outline" asChild>...</Button>`), and a `<ThemeAwareImage>` to the right on `lg:`, stacking above on `md:` and below. Cross-ref the canonical Button shape from 4.6.3.
- Fill `components/theme-aware-image.tsx`: render both `<img src={light} className="block dark:hidden" />` and `<img src={dark} className="hidden dark:block" />` with shared `alt`, `width`, `height`. The image swap is pure CSS; no JS, no FOUC.
- Fill `components/feature-card.tsx`: use `cva` to declare a `featureCardVariants` table with `tone: { default, brand, muted }` and `emphasis: { quiet, loud }`. Card uses shadcn's `Card`/`CardHeader`/`CardTitle`/`CardDescription` building blocks composed by hand (not the whole `Card` block at once); the icon renders inside a `<div>` with token-backed bg.
- Fill `components/feature-grid.tsx`: `<section>` with an `<h2>` and a `grid grid-cols-1 md:grid-cols-3 gap-6`. Map over `features` from `lib/data.ts` rendering a `<FeatureCard>` per entry. Use the `VariantProps<typeof featureCardVariants>` type for tone and emphasis selection from data.
- Wire `<SiteHeader />`, `<Hero />`, and `<FeatureGrid />` into `app/(marketing)/page.tsx` in order.
- Verify locally: page renders header (with placeholder for mobile nav), hero with theme-aware image swapping correctly when the OS theme changes, three-column grid on desktop, single-column below `md`.

Senior calls and watch-outs:

- `cva` is the senior shape for variant tables. Three booleans (`isBrand`, `isLoud`, `isMuted`) becomes one `tone` union and one `emphasis` union — the variant table makes invalid states unrepresentable. Cross-ref 4.6.3.
- Icon-only buttons (none yet in this lesson, but the theme toggle and mobile trigger appear in 4.12.4 and 4.12.5) require `aria-label`. Pattern named now.
- The theme-aware image ships both `<img>` tags. Optimizing to a single `<picture>` with `prefers-color-scheme` is a senior follow-up; the dual-img reach is correct here because the site preference (controlled by `next-themes` via the `.dark` class) is what we honor, not the OS preference.
- `<Button asChild>` wraps a Next.js `<Link>` — the polymorphism is the Slot pattern from 4.6.3. Naming this once because it appears in every CTA.
- Heading hierarchy: one `<h1>` in the hero, `<h2>` for each section's title, no skipping levels. Cross-ref 4.1.3.

Codebase state at entry: shell with TODO placeholders from 4.12.2.
Codebase state at exit: header (desktop nav only), hero, and feature grid render correctly on desktop and below `md`. Page is responsive at 1280 and 768; mobile nav slot still empty (drawer ships in 4.12.5). Theme toggles via the OS preference; no manual toggle yet.

Estimated student time: 50 to 65 minutes.

---

## Lesson 4.12.4 — Pricing, footer, and a flicker-free theme toggle

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
- Icon-only buttons (theme toggle and social icons in the footer) all need `aria-label`. Decorative icons inside labeled buttons get `aria-hidden`. Cross-ref 4.11.3.
- Color contrast on the muted period text and disabled-looking elements must pass AA. If you used `text-muted-foreground` over `bg-background` from the provided tokens, the palette is already AA-passing; do not invent colors.

Codebase state at entry: header, hero, feature grid render from 4.12.3.
Codebase state at exit: full marketing surface renders desktop and tablet, theme toggle works without FOUC, no hydration warning. Mobile nav slot still empty.

Estimated student time: 50 to 65 minutes.

---

## Lesson 4.12.5 — Mobile drawer with scroll lock

Write the `useLockBodyScroll` hook that restores prior overflow on cleanup, then drop it inside a shadcn `Sheet`-based `MobileNav` that traps focus, closes on `Esc` and link click, and keeps the desktop and mobile navs single-source via `hidden md:flex` / `md:hidden`.

Goals:

- Fill `hooks/use-lock-body-scroll.ts`: a custom hook that, when `locked` is true, sets `document.body.style.overflow = 'hidden'` and restores the prior value on cleanup. Run inside `useEffect`; no-op when `typeof document === 'undefined'`. Generic on no parameters beyond the boolean.
- Fill `components/mobile-nav.tsx`: a controlled `<Sheet open onOpenChange>` from shadcn. `<SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>` for the hamburger. `<SheetContent side="left">` renders `<SheetHeader>` with `<SheetTitle>Navigation</SheetTitle>` (accessible name for the dialog) and a `<nav>` listing `navLinks` as styled `<Link>`s. Each link's `onClick` closes the sheet by setting `open` to false so the user lands on the new route without the drawer underlay. Below the links, render `<ThemeToggle />` so the mobile user can flip themes from inside the drawer.
- Inside `<MobileNav>`, call `useLockBodyScroll(open)`. The Radix-handled `<Sheet>` already locks scroll on most browsers; the custom hook is the iOS Safari belt-and-suspenders that the project verifies.
- Mount `<MobileNav links={navLinks} />` in the `md:hidden` slot of `<SiteHeader>`. Desktop slot stays as the existing `<nav className="hidden md:flex">`.
- Verify locally: below `md`, the hamburger button appears; clicking it opens the drawer from the left; Tab cycles within the drawer; Shift+Tab reverses; `Esc` closes the drawer and returns focus to the hamburger; clicking a link navigates and closes the drawer; the underlying page does not scroll while the drawer is open (test on Chrome DevTools "iPhone 14" device emulation).

Senior calls and watch-outs:

- The focus trap is Radix's job, not yours. Writing a focus trap by hand is the canonical 4.11.4 watch-out — don't.
- `<SheetTitle>` is the accessible name for the dialog. Hiding it visually (`<SheetTitle className="sr-only">`) is fine; *omitting* it produces a Radix console error.
- Returning focus to the hamburger trigger on close is automatic with Radix. The exception (4.11.4) is unmounted triggers, which doesn't apply here.
- The `useLockBodyScroll(open)` cleanup must restore the *prior* `overflow` value, not unconditionally `''`. If a parent scope already had `overflow: hidden`, blanket clearing breaks it.
- The mobile nav must not duplicate the desktop nav's links in the DOM. The `hidden md:flex` and `md:hidden` cut keeps each surface single-source. Cross-ref 4.5.6.
- The link click closes the drawer; pair the navigation and the close in the same handler so the user lands on the new route with focus management already complete.
- Avoid `autoFocus` on a link inside the drawer — Radix's `<Sheet>` already moves initial focus.

Codebase state at entry: full surface from 4.12.4 with empty mobile-nav slot.
Codebase state at exit: full responsive surface works. Mobile drawer opens, traps focus, locks scroll, closes on `Esc` and on link click. Theme toggle accessible from inside the drawer on mobile. All Done-when clauses are now achievable in 4.12.6.

Estimated student time: 45 to 60 minutes.

---

## Lesson 4.12.6 — Verify clause by clause

Walk every "Done when" check — no-FOUC reload, Lighthouse 100, keyboard-only traversal, reflow at 360/768/1280, drawer focus trap, scroll lock, and `Esc` close — plus an axe DevTools audit, and name the senior calls one more time.

Goals:

- Walk every "Done when" clause as a verification step (see table in Chapter framing).
- No-FOUC reload: hard reload in light and in dark with system preference set both ways; confirm rendered theme matches first paint. DevTools Performance recording shows no flash frame.
- Lighthouse a11y: run in Chrome incognito; the score is 100; if not, audit findings against the four 4.11.2 commitments and the icon-only-button labeling from 4.11.3.
- Keyboard-only nav: from a fresh tab, Tab from the URL bar; every interactive element receives a visible focus ring in document order; Enter activates buttons and links; Esc closes any open menu.
- Responsive reflow: cycle DevTools device toolbar across 360, 768, 1280 pixel widths; confirm no horizontal scroll, no broken grid, hero stacks correctly, three-column feature grid collapses to one-column below `md`.
- Drawer behaviors: below `md`, open the drawer; Tab cycles within; Shift+Tab reverses; `Esc` closes and returns focus to the trigger; underlying page does not scroll while open; iOS Safari emulation passes the same scroll-lock test.
- Run axe DevTools (extension) as the secondary auditor — its rule coverage exceeds Lighthouse's and catches what Lighthouse misses (4.11.2). Note any new findings.
- Name the senior calls one more time:
  - Design tokens are the single seat of color truth; never hard-code colors.
  - shadcn primitives ship the focus-trap and ARIA work; your job is to not break it.
  - The four discipline-level a11y commitments held from day one made the audit cheap.
  - `useLockBodyScroll` is the one custom hook this project owns; the rest is composition.
- Forward references:
  - Unit 5 will move this page into a Next.js routing structure with real navigation, layouts, and the App Router primitives.
  - Chapter 17.2 will add the security headers (CSP, HSTS) this marketing page needs in production.
  - Chapter 20.3 will add the performance and Core Web Vitals pass; this project ships the a11y baseline, not the perf baseline.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the fix the student wrote.
- If any verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- Lighthouse 100 is necessary, not sufficient. The keyboard pass is the harder bar; treat axe DevTools findings as ground-truth additions.

Codebase state at entry: full surface, working.
Codebase state at exit: same surface, verified clause-by-clause against the spec. Student can articulate which Unit 4 concept bought them which verified behavior.

Estimated student time: 20 to 30 minutes.
