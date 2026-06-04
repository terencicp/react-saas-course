# Chapter 028 — Project plan: themed product surface

First project in the course; root of the project graph (feeds Chapter 035 via `degit`). Built **from scratch**, no prior `solution/` to fork. Fully static marketing surface: header, hero, three-column feature grid, pricing table, footer, theme toggle, mobile drawer. The standards bar is accessibility + no-FOUC, verified against a real render.

## Project goals

The project cashes in all of Unit 3 (React 19, JSX semantics, Tailwind v4, semantic tokens, CVA, shadcn primitives, the `next-themes` no-FOUC wiring, custom hooks, the a11y baseline) by shipping one realistic public SaaS surface. The student practices five things at once: composing shadcn primitives without reinstalling or forking them, driving component variants from data through a `cva` table so invalid visual states are unrepresentable, theming exclusively through semantic tokens so light/dark is one byte-identical class string, building responsive layout with flex and CSS Grid at three breakpoints, and holding a WCAG 2.2 AA bar with keyboard traversal and Lighthouse rather than promising it. The coding is split so each slice adds one browser-confirmable capability the student can `pnpm dev` and use, mirroring the lesson cadence — the surface accretes header → hero → features → pricing → footer → theme toggle → mobile drawer, and the capstone (drawer) is the one place the project owns custom behavior (a single body-scroll-lock hook) layered on top of a Radix-owned focus trap. The toolchain (pnpm, `AGENTS.md`, `tsconfig`, Biome) is authored by the scaffold, not the slices, because this is the from-scratch project that lays the foundation every later project carries forward.

## Student position

The student has finished Unit 3 teaching chapters (017–027) and **nothing past it**. Coders must not use any concept from Unit 4 onward.

**Knows:** React 19 function components with typed props (`ComponentProps<'tag'>`, `type` aliases, variant unions, discriminated unions, default-destructure + `className` + `...rest`); React 19 ref-as-prop (no `forwardRef`); `children: ReactNode`; `cva` + `VariantProps` + `asChild`/`Slot` polymorphism; `cn()` from `@/lib/utils`; Tailwind v4 utility-first with CSS-first `@theme` config in `globals.css`, semantic tokens (`--background`/`--foreground`/`--primary`/`--muted`/`--border`/`--ring`), OKLCH, the `dark:` variant and `.dark` class flip; DOM-state variants (`data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`); flex and CSS Grid, `gap`, logical properties, `min-h-dvh`; responsive breakpoints (`sm:`/`md:`/`lg:`), the `hidden md:flex` / `md:hidden` visibility cut, `motion-reduce:`, `clamp()` fluid type; `useState`, `useRef`, `useId`, `useEffect` with cleanup; custom hooks (`use*` contract, the catalog incl. `useLockBodyScroll` by name); the React Compiler (`reactCompiler: true`, no manual `useMemo`/`useCallback`/`memo`); shadcn copy-into-repo model, `components.json`, the `radix-ui` umbrella, `asChild` = merge, the wrap-don't-fork ladder; the four a11y commitments (keyboard, contrast 2.2 AA, reduced motion, target size), semantic-HTML-first, ARIA labels/`aria-hidden` on icon-only buttons, focus-trap-is-the-primitive's-job, return-focus contract, the four-state component contract (loading/empty/error/populated); `next-themes` wiring shape (`<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` + `suppressHydrationWarning` on `<html>`), `useTheme()`, `resolvedTheme` vs `theme`, the CSS-only icon-swap that needs no mount gate.

**Does NOT know (do not use):** Server/Client Component model and the `'use client'` boundary at depth (chapter 030) — the student has only *seen* `'use client'` named as a fact; App Router routing, `loading.tsx`, parallel/intercepting routes, metadata API (Unit 4); `next/image`, `next/font`, `next/script` optimization (Unit 4) — use raw `<img>` and the system/`next/font` stack only as already shown; data fetching, Suspense streaming, `use(promise)` for real data (Unit 4); any DB/Drizzle, Zod, Server Actions, forms-as-contract beyond static markup (Units 5–6); `nuqs`/URL state, TanStack Query, Zustand (later units); `next-intl` / i18n (Unit 17) — **hardcode visible English strings**, do not reach for translation keys; testing frameworks as a student skill (Unit 18) — the lesson test runner is provided, the student does not author tests. The student writes `'use client'` only where the lesson explicitly shows it (the toggle, the drawer, the providers wrapper), never reasons about RSC boundaries beyond that.

## Scaffolding recipe

Scaffold a **fresh** Next.js 16 App Router project (no fork). Build `solution/` complete enough to compile, render the page shell, and serve every slice's surface as a `TODO` stub; the slice-coders fill the stubs. Use the `src/` directory layout (App Router under `src/app/`) — Chapter 035 degit-clones this layout.

**Create both `solution/` and `start/`** with identical toolchain and config files (the toolchain is the same in both; only the UI component bodies differ — start ships stubs, solution ships full code). Everything in this recipe applies to **both** directories unless noted.

### Toolchain and config (author fully; these are the L2–L5 walkthrough deliverables)

- `package.json`: `name`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@11.3.0"`, `"engines": { "node": ">=24" }`. Scripts:
  - `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`
  - `"format": "biome format --write ."`, `"lint": "biome lint ."`, `"check": "biome check --write ."`
  - `"verify": "biome ci . && tsc --noEmit && next build"`
  - `"test:lesson": "node scripts/test-lesson.mjs"` (Vitest single-file runner, below)
  - `"preinstall": "npx only-allow pnpm"`
- `.mise.toml`: pin `node = "24"` and `pnpm = "11.3.0"`.
- `.npmrc`: `engine-strict=true`, `auto-install-peers=true`.
- `pnpm-workspace.yaml`: **required** (sharp native-build ledger). No `packages:` key. Include `onlyBuiltDependencies: [sharp]` and `allowBuilds: { sharp: true }`. Do not delete the one `create-next-app` emits; ship it in both dirs.
- `tsconfig.json`: strictness floor — `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noFallthroughCasesInSwitch": true`, `"noImplicitOverride": true`, `"forceConsistentCasingInFileNames": true`, `"paths": { "@/*": ["./src/*"] }` (NO `baseUrl` — TypeScript 6 errors on it; see Locked decisions). Compatibility surface — `"target": "ES2022"`, `"lib": ["dom","dom.iterable","esnext"]`, `"module": "esnext"`, `"moduleResolution": "bundler"`, `"verbatimModuleSyntax": true`, `"isolatedModules": true`, `"esModuleInterop": true`, `"resolveJsonModule": true`, `"jsx": "react-jsx"` (NOT `"preserve"` — see Locked decisions), `"noEmit": true`, `"incremental": true` (`next build` injects it — bake it in), `"skipLibCheck": true`, `"allowJs": false`, `"plugins": [{ "name": "next" }]`. `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"]`. `"exclude": ["node_modules"]`. Bake both `.next/types` globs, `incremental`, and `skipLibCheck`/`jsx: react-jsx` so the file is drift-free from the first `next build`.
- `next.config.ts`: typed `const nextConfig: NextConfig`, default export. `reactCompiler: true`, `turbopack: { root: __dirname }` (silence multi-lockfile warning). No image/remote config needed (static).
- `biome.json`: `"$schema"`, `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }`, `"files": { "ignoreUnknown": true, "includes": ["**", "!next-env.d.ts", "!.next", "!node_modules"] }`, `"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }`, `"javascript": { "formatter": { "quoteStyle": "single" } }`, `"linter": { "enabled": true, "rules": { "recommended": true, "performance": { "noImgElement": "off" } } }`, `"css": { "parser": { "tailwindDirectives": true } }`, `"assist": { "actions": { "source": { "organizeImports": "on" } } }`. (See Locked decisions for every constraint-mandated knob.)
- `AGENTS.md` at repo root: thesis line (static themed marketing surface, the from-scratch toolchain project), stack-core pins (Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, next-themes), repo layout by directory (one line each), daily commands (`pnpm dev`/`build`/`check`/`tsc --noEmit`/`verify`), conventions pointers (biome.json, tsconfig.json, .editorconfig). Under one screen. No prose architecture, no file lists.
- `.editorconfig`, `.gitignore` (standard Next: `.next`, `node_modules`, etc.), `.vscode/extensions.json` + `.vscode/settings.json` (Biome default formatter, format-on-save, `source.organizeImports.biome`).

### Dependencies (pin exact, `--save-exact` for tools)

Runtime: `next@^16.2`, `react@^19`, `react-dom@^19`, `next-themes@^0.4`, `radix-ui@^1.4.3`, `class-variance-authority@latest`, `clsx@latest`, `tailwind-merge@latest`, `lucide-react@^1` (brand icons removed — see Locked decisions), `tw-animate-css@latest`.
Dev: `@biomejs/biome@^2.4` (`--save-exact`), `babel-plugin-react-compiler@1.0.0` (REQUIRED by `reactCompiler: true` or `next build` fails), `typescript@latest`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss@^4`, `@tailwindcss/postcss@^4` (or the Turbopack-native wiring `create-next-app` emits), `vitest@^4.1`.

### shadcn primitives (install into `src/components/ui/`)

Run shadcn init (new-york style, Radix engine, lucide icons, CSS variables, base color neutral) writing `components.json`, then add: `button`, `sheet`, `card`, `separator`, `badge`, `skeleton`. Commit the copied source. Accept the double-quote/`import * as React` shape on first add; `pnpm check --write` normalizes. `skeleton` is installed for forward-compat with later projects even though this static surface has no loading state — it is fine for it to be unused.

### globals.css (`src/app/globals.css`, author fully)

Canonical shadcn/Tailwind-v4 order: `@import "tailwindcss";` → `@import "tw-animate-css";` → `@custom-variant dark (&:is(.dark *));` → `:root { ... }` (light, plain `--token`s in OKLCH: `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring --radius`) → `.dark { ... }` (same names, swapped values) → `@theme inline { ... }` (`--color-*: var(--token)` bridge + `--radius-sm/md/lg/xl` multiplicative calc derivations). Use shadcn's standard neutral palette values. This is the single seat of color truth; every component reads tokens, never literals.

### Providers and root layout (author fully)

- `src/app/_components/providers.tsx`: `'use client';`, single consolidated `<Providers>` Client Component wrapping children in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` from `next-themes`. This is the only app-wide providers boundary.
- `src/app/layout.tsx` (default export, framework-named): `import './globals.css';` first; `<html lang="en" suppressHydrationWarning>` with the `next/font` system font wired to `<body>`; `<body>` renders `<Providers>{children}</Providers>`. Static `metadata` export with title/description is fine (metadata API as a plain object literal — no dynamic reads).
- `src/lib/utils.ts`: the canonical `cn()` (`twMerge(clsx(inputs))`). shadcn writes this on init; keep it.

### Page shell and stubs (author the shell; stub the UI)

- `src/app/page.tsx` (default export): the `(marketing)` page is the single static route. Compose the section components in document order inside a `<div className="flex min-h-dvh flex-col">` with `<SiteHeader />`, `<main>` containing `<Hero />`, `<FeatureGrid />`, `<PricingTable />`, and `<SiteFooter />`. Import all seven section components from `@/components/...`. (Route group `(marketing)` is optional — a single static route needs no group; place `page.tsx` directly under `src/app/`. Do not introduce nested route folders, layouts, or `loading.tsx` — Unit 4 territory the student hasn't learned.)
- `src/lib/data.ts`: author FULLY (it is provided copy/fixtures, not student work). Exports, all typed: `navLinks: { href: string; label: string }[]`, `features: FeatureCardProps[]` (3 entries with varied `tone`/`emphasis`, each `{ title, description, icon }` where `icon` is a `LucideIcon`), `pricingTiers: PricingCardProps[]` (3 entries, exactly one `featured: true`), `footerGroups: { heading: string; links: { href: string; label: string }[] }[]` (3 groups), `socialLinks: { href: string; label: string; icon: LucideIcon }[]` (use non-brand lucide glyphs — `Mail`, `Globe`, `Rss`, `Send`). Export the `FeatureCardProps` and `PricingCardProps` types from the component files; `data.ts` imports them.
- Stub these as `TODO(L<n>)` files (compile-clean, render nothing or a labeled placeholder, body has the TODO marker — in `solution/` they are fully coded; the stubs are the `start/` shape derived later):
  - `src/components/site-header.tsx` (L6)
  - `src/components/hero.tsx` (L7), `src/components/theme-aware-image.tsx` (L7)
  - `src/components/feature-card.tsx` (L8), `src/components/feature-grid.tsx` (L8)
  - `src/components/pricing-card.tsx` (L9), `src/components/pricing-table.tsx` (L9)
  - `src/components/site-footer.tsx` (L10)
  - `src/components/theme-toggle.tsx` (L11)
  - `src/components/mobile-nav.tsx` (L12), `src/hooks/use-lock-body-scroll.ts` (L12)

### Lesson test runner (author fully, both dirs)

Ship `scripts/test-lesson.mjs` and `tests/lessons/`. `scripts/test-lesson.mjs` reads the lesson number from `process.argv[2]`, builds the **exact** path `tests/lessons/Lesson ${n}.test.ts`, and spawns `vitest run` with that single absolute/exact path (NOT a bare positional — a bare `vitest run 6` substring-matches `Lesson 16` too). Exit with vitest's code. `vitest.config.ts`: `environment: 'node'`, `globals: false` (tests `import { describe, it, expect } from 'vitest'`), `include: ['tests/lessons/**/*.test.ts']`, and resolve the `@/*` alias (add `vite-tsconfig-paths` as a devDep, or set `resolve.alias` to `src/`). No DOM, no extra config beyond this so it works unchanged in `start/`. Confirm `pnpm test:lesson 6` runs only `Lesson 6.test.ts` before locking. The lesson-test-coder writes the per-lesson `Lesson <n>.test.ts` bodies later (one per implementation lesson L6–L12); ship them as empty-but-present placeholder files (`describe.todo`) so the runner is green on a fresh scaffold. Tests are node-env and observe SSR/first-paint render output and source shape (e.g. server-render a component to a string and assert on it), never interaction. Do not ship a shared helpers module — each test inlines its own helpers.

The scaffolder builds the toolchain, config, globals, providers, layout, `data.ts`, the page shell wiring, and all stub files. It does not implement any component body in `start/` beyond the TODO stub, and in `solution/` the slice-coders own the bodies.

## Slices

Each slice fills one or more stub files with the real implementation in `solution/`, against the contracts below. All components: typed props, arrow-`const` bound, `cn()` with `className` last, semantic tokens only (never literal colors), `focus-visible:` ring on every interactive control, no manual memoization. Keep each component minimal — no abstraction the brief doesn't ask for. Server Components by default; add `'use client'` only where named.

### Slice S1

**Lesson 6 — Site header with desktop navigation.** Fill `src/components/site-header.tsx`.

A real `<header>` landmark, sticky to the top, spanning the page at a `container`/`max-w` width with horizontal padding, laid out `flex items-center justify-between`. Left: the logo (a `<Link href="/">` wrapping the brand — wordmark text or an inline `<img src="/logo.svg">`; logo asset optional, a text wordmark is fine). Right: one `<nav aria-label="Primary">` containing the `navLinks` from `@/lib/data.ts` as `<Link>`s, classed `hidden md:flex` (desktop only); plus a `md:hidden` slot — an **empty `<div data-testid="header-mobile-slot" />`** placeholder where S6's toggle and S7's drawer will mount. The `data-testid="theme-toggle-slot"` placeholder is also an empty `<div>` here (filled in S6). Nav links must come only from `data.ts` — never duplicated as DOM literals (the mobile drawer reads the same array in S7). Header root carries `data-testid="site-header"`.

Excludes: the theme toggle, the mobile drawer, any sticky-scroll shadow animation beyond what tokens give free. Mount nothing interactive in the slots.

Contracts created: `SiteHeader` (no props). `data-testid`: `site-header`, `header-mobile-slot`, `theme-toggle-slot`.

**Screenshot** — none (header is incomplete without the toggle and drawer slots filled; capture deferred to the slices that complete those surfaces. The L6 figure is the desktop header, captured at S6 after the toggle lands).

### Slice S2

**Lesson 7 — Hero with a flicker-free theme-aware image.** Fill `src/components/hero.tsx` and `src/components/theme-aware-image.tsx`.

`Hero` is a `<section>` carrying the page's single `<h1>` (with `tabIndex={-1}` and `id="page-heading"` is NOT required here — out of scope; just one `<h1>`), a supporting `<p>`, and two CTAs as `<Button asChild><Link href="...">…</Link></Button>` (one default variant, one `variant="outline"`). Layout: at `lg` the copy sits left and the image right (`grid lg:grid-cols-2` or flex), below `lg` they stack; no horizontal scroll at any width.

`ThemeAwareImage` ({ light, dark, alt, width, height, ...props }): renders BOTH `<img>` sources as siblings, the light one `className="block dark:hidden"` and the dark one `className="hidden dark:block"`, sharing `alt`/`width`/`height`. The server ships both; CSS alone picks the right one keyed off the `.dark` class — no JS branch, no FOUC, no layout shift. Excludes: a single `<picture>` with `prefers-color-scheme` (tracks the wrong signal), `next/image`. Provide two placeholder hero assets in `public/` (`hero-light.png`, `hero-dark.png`) — solid-color or simple PNGs are fine.

Contracts created: `Hero` (no props); `ThemeAwareImage` props `{ light: string; dark: string; alt: string; width: number; height: number } & ComponentProps<'img'>`. `data-testid`: `hero`, `hero-image-light`, `hero-image-dark`.

**Screenshot** — `lesson:7 route:/ viewport:desktop(1280x800) state:settled` (hero side-by-side at lg). Also `lesson:7 route:/ viewport:mobile(390x844) state:settled` (hero stacked) — the figure shows the responsive stack.

### Slice S3

**Lesson 8 — Feature grid with CVA card variants.** Fill `src/components/feature-card.tsx` and `src/components/feature-grid.tsx`.

`feature-card.tsx`: define `featureCardVariants = cva(base, { variants: { tone: { default, brand, muted }, emphasis: { quiet, loud } }, defaultVariants: { tone: 'default', emphasis: 'quiet' } })` — base + variant classes use semantic tokens only (`bg-card`, `border-border`, `bg-primary/10`, `bg-muted`, etc.). `FeatureCard` is typed `ComponentProps<'article'> & VariantProps<typeof featureCardVariants> & { title: string; description: string; icon: LucideIcon }` and renders an `<article>` (NOT shadcn `<Card>` wrapped — `Card` has no `asChild`; inline `Card`'s container classes onto `<article>` via the cva base, and compose `CardHeader`/`CardTitle`/`CardDescription` sub-parts by hand inside). Icon sits in a token-backed container, marked `aria-hidden` is automatic (lucide ships it). Export `FeatureCardProps`. `feature-grid.tsx`: a `<section>` introduced by an `<h2>` (no heading-level skip from the hero `<h1>`), with `grid grid-cols-1 md:grid-cols-3 gap-6` mapping `features` from `@/lib/data.ts` to `<FeatureCard>` (stable `key` from a data field, e.g. `title`). Each card's `tone`/`emphasis` come from its data entry — invalid combos unrepresentable.

Excludes: per-card hover motion, any fourth column or carousel.

Contracts created: `featureCardVariants`, `FeatureCardProps` (imported by `data.ts`), `FeatureCard`, `FeatureGrid`. `data-testid`: `feature-grid`; each card `feature-card`.

**Screenshot** — `lesson:8 route:/ viewport:desktop(1280x800) state:settled` (three columns, data-driven tones). The mobile single-column collapse is verified by a Rendered check (child-count holds at any width), no separate shot needed.

### Slice S4

**Lesson 9 — Pricing table with a featured tier.** Fill `src/components/pricing-card.tsx` and `src/components/pricing-table.tsx`.

`pricing-card.tsx`: `PricingCardProps = { name: string; price: string; period: 'month' | 'year'; features: string[]; featured?: boolean; cta: { label: string; href: string } }`. Compose by hand (inline `Card` container classes onto the root element + nest header/content/footer sub-parts): tier name as `<h3>`, price as a large numeric with the period as `text-muted-foreground`, a feature list with a lucide `<Check>` per row (decorative, lucide auto-`aria-hidden`), a footer CTA `<Button asChild><Link>`. The `featured` flag — and ONLY that flag — adds a `border-primary` ring accent and a "Most popular" `<Badge>`. Export `PricingCardProps`. `pricing-table.tsx`: a `<section>` with an `<h2>` and `grid grid-cols-1 md:grid-cols-3 gap-6` mapping `pricingTiers`; lift the featured tier with `md:scale-105` paired with `md:motion-reduce:scale-100` (the reduced-motion guard MUST be stacked under `md:` — a bare `motion-reduce:scale-100` is emitted earlier in Tailwind v4's source order than `md:scale-105`, so at `md`+ the lift wins and the guard is inert; stacking it as `md:motion-reduce:scale-100` makes it equally specific but later-in-source, so it overrides; both target the CSS `scale` property, not `transform`). Muted text stays on `text-muted-foreground` over `bg-background` (passes AA — do not invent colors).

Excludes: monthly/yearly toggle, real checkout.

Contracts created: `PricingCardProps` (imported by `data.ts`), `PricingCard`, `PricingTable`. `data-testid`: `pricing-table`; each card `pricing-card`; the featured card additionally `pricing-card-featured`.

**Screenshot** — `lesson:9 route:/ viewport:desktop(1280x800) state:settled` (three tiers, featured accented + lifted).

### Slice S5

**Lesson 10 — Site footer.** Fill `src/components/site-footer.tsx`.

A single `<footer>` landmark: three columns of link groups from `footerGroups` (Product / Company / Legal), the brand block (logo + a one-line copyright — **hardcode the year as a literal**, e.g. `© 2026`; do NOT call `new Date().getFullYear()`, it breaks the static build), and a row of social buttons from `socialLinks`, each a `<Button asChild size="icon" variant="ghost"><a aria-label={link.label} href={...}>…</a></Button>` (or `<Button size="icon" variant="ghost" aria-label={...}>` if not a link) carrying an `aria-label` naming its destination, glyph auto-`aria-hidden` via lucide. Columns sit side by side at desktop, stack below `md`. Tokens only.

Excludes: newsletter signup form, locale/currency switchers.

Contracts created: `SiteFooter` (no props). `data-testid`: `site-footer`.

**Screenshot** — `lesson:10 route:/ viewport:desktop(1280x800) state:settled` (footer columns side by side). The mobile stack is covered by a Rendered check.

### Slice S6

**Lesson 11 — Flicker-free theme toggle.** Fill `src/components/theme-toggle.tsx`; mount it into the header's `theme-toggle-slot` (edit `site-header.tsx` to render `<ThemeToggle />` in that slot).

`theme-toggle.tsx`: `'use client';`. `ThemeToggle` renders `<Button variant="ghost" size="icon" aria-label="Toggle theme">` whose onClick reads `resolvedTheme` from `useTheme()` and calls `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')`. Renders BOTH `<Sun className="dark:hidden">` and `<Moon className="hidden dark:block">` — markup byte-identical on server and client, so no hydration mismatch and NO `mounted` gate (the gate is only for content that branches on theme, not styling). `useTheme()` is read only inside the click handler, never during render. Flip off `resolvedTheme`, never `theme` (which can be `"system"`). The no-FOUC guarantee is the provided `<ThemeProvider>` + its pre-paint script; this slice must not regress it.

Mount edit: replace the empty `theme-toggle-slot` `<div>` in `site-header.tsx` with one containing `<ThemeToggle />`. Keep `data-testid="theme-toggle-slot"` on the wrapper.

Excludes: a three-way light/dark/system menu, per-route theme overrides.

Contracts created: `ThemeToggle` (no props). `data-testid`: `theme-toggle` (on the button). Modifies `site-header.tsx`.

**Screenshot** — `lesson:6 route:/ viewport:desktop(1280x800) state:settled` (the now-complete desktop header: logo + nav + toggle — serves L6's "desktop header" figure, captured here because S6 is the last slice to touch the header at desktop before the drawer, which is mobile-only). Plus `lesson:11 route:/ viewport:desktop(1280x800) state:theme-dark` (page in dark theme after toggling — serves L11's theme figure; the screenshotter toggles to dark and settles).

### Slice S7

**Lesson 12 — Mobile drawer with scroll lock.** Fill `src/hooks/use-lock-body-scroll.ts` and `src/components/mobile-nav.tsx`; mount `<MobileNav>` into the header's `header-mobile-slot` (edit `site-header.tsx`).

`use-lock-body-scroll.ts`: `useLockBodyScroll(locked: boolean): void` — in a `useEffect` keyed on `locked`, when `locked` set `document.body.style.overflow = 'hidden'` and on cleanup restore the **prior** value captured before the write (not a blanket `''`, which clobbers a parent lock); no-op safe under SSR (the effect only runs client-side). `'use client'` belongs on the consuming component file; the hook file may stay a plain module (it is imported into a client component).

`mobile-nav.tsx`: `'use client';`. `MobileNav` ({ links }: { links: { href: string; label: string }[] }) is a controlled shadcn `<Sheet>` (`open`/`onOpenChange` via `useState`): `<SheetTrigger asChild>` wrapping the labelled hamburger `<Button variant="ghost" size="icon" aria-label="Open menu">` with a lucide `<Menu>`; `<SheetContent side="left">` carrying a `<SheetTitle>` (the dialog's accessible name — visually hide with `sr-only` if desired, but it is mandatory or Radix errors), a `<nav>` of the `links` as `<Link>`s whose onClick closes the drawer (`onOpenChange(false)`), and `<ThemeToggle>` available inside. Call `useLockBodyScroll(open)`. The focus trap, return-focus-on-close, overlay, and `Esc` are Radix's job — do NOT hand-roll them. Below `md` only (the header slot is `md:hidden`); the desktop nav stays the only nav at `md` and up.

Mount edit: replace the empty `header-mobile-slot` `<div>` in `site-header.tsx` with one containing `<MobileNav links={navLinks} />` (reading the same `navLinks` array, single-source).

Excludes: a custom modal, hand-rolled focus management, nested submenus.

Contracts created: `useLockBodyScroll`, `MobileNav`. `data-testid`: `mobile-nav-trigger` (on the hamburger button), `mobile-nav-content` (on `SheetContent`). Modifies `site-header.tsx`.

**Screenshot** — `lesson:12 route:/ viewport:mobile(390x844) state:drawer-open` (drawer open over the page on a phone-width viewport — the screenshotter taps the hamburger and settles). This completes the three-width finished-app figure set (desktop at S2/S6, mobile-drawer here).

## Start derivation

Derive `start/` from the completed `solution/` after all slices land. The toolchain, config, `globals.css`, providers, root layout, `data.ts`, `page.tsx` shell, the `components/ui/*` primitives, the test runner, and `vitest.config.ts` are **identical** — copy them verbatim. Replace only the student-owned component/hook bodies with `TODO` stubs that compile and render an empty/placeholder shape, each carrying a `// TODO(L<n>) — <task>` marker as the first body line so `rg "TODO" start/src` enumerates the work. Stubs:

- `site-header.tsx` → `// TODO(L6) — build the semantic header: logo, desktop nav from navLinks, empty toggle + mobile slots`. Render a minimal `<header data-testid="site-header" />` or a placeholder so the page still mounts. (S6/S7 mount edits are part of L11/L12 work — the start stub has the empty slots, not the mounted toggle/drawer.)
- `hero.tsx` → `// TODO(L7) — hero: one <h1>, supporting copy, two CTA buttons, theme-aware image`.
- `theme-aware-image.tsx` → `// TODO(L7) — render both <img> sources with block dark:hidden / hidden dark:block`.
- `feature-card.tsx` → `// TODO(L8) — featureCardVariants cva table + FeatureCard <article>`.
- `feature-grid.tsx` → `// TODO(L8) — <section> + <h2> + responsive grid mapping features`.
- `pricing-card.tsx` → `// TODO(L9) — PricingCard with the featured branch (accent ring + badge)`.
- `pricing-table.tsx` → `// TODO(L9) — <section> + <h2> + grid mapping pricingTiers, featured lift with motion-reduce:`.
- `site-footer.tsx` → `// TODO(L10) — <footer>: three link groups, brand block, labelled social icon buttons`.
- `theme-toggle.tsx` → `// TODO(L11) — useTheme()-driven Button, CSS-only Sun/Moon swap, no mount gate`.
- `mobile-nav.tsx` → `// TODO(L12) — controlled Sheet drawer: labelled trigger, SheetTitle, link list closing on click, useLockBodyScroll(open)`.
- `use-lock-body-scroll.ts` → `// TODO(L12) — toggle body overflow hidden when locked, restore prior value on cleanup`.

Each stub must export the same symbol name with a compatible-enough signature that `page.tsx` and `data.ts` still typecheck and the shell renders (e.g. `FeatureCard` must still export `FeatureCardProps`; `data.ts` imports it). `start/` must pass `pnpm verify` (build-green with stubs) and `pnpm test:lesson <n>` must run against each placeholder test. The `start/` page renders the shell with empty section placeholders, exactly as the Overview promises.

## Locked decisions

Cross-cutting calls every slice and the scaffold must honor.

**Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`, mandatory):**
- `tsconfig "jsx": "react-jsx"` (NOT `"preserve"` — `next build` rewrites it; pin the rewritten value).
- `tsconfig` ships NO `baseUrl` — `typescript@latest` is 6.x, which makes `baseUrl` a hard `tsc --noEmit` error (`TS5101`, deprecated, removed in TS 7) and fails `pnpm verify`. `"paths": { "@/*": ["./src/*"] }` resolves correctly without `baseUrl` under `moduleResolution: "bundler"` (paths are relative to the tsconfig); Next does not re-inject `baseUrl`.
- `tsconfig "incremental": true` baked in — `next build` injects it on the first run (prints "incremental was set to true"); committing without it drifts the file on first build.
- `tsconfig "skipLibCheck": true` and `"allowJs": false` baked in; `include` carries BOTH `.next/types/**/*.ts` and `.next/dev/types/**/*.ts` so the file is drift-free from first build.
- `biome.json files.includes` excludes use NO trailing `/**`: `["**", "!next-env.d.ts", "!.next", "!node_modules"]`.
- `biome.json` `"css": { "parser": { "tailwindDirectives": true } }` (Tailwind v4 directives parse-error without it).
- `biome.json` `lint/performance/noImgElement: "off"` (the project ships raw `<img>` for the theme-aware swap and logo).
- `next.config.ts` `turbopack: { root: __dirname }` (silence multi-lockfile warning under the monorepo-style repo).
- `next.config.ts` `reactCompiler: true` REQUIRES `babel-plugin-react-compiler@1.0.0` in devDependencies or `next build` fails.
- `pnpm-workspace.yaml` with `onlyBuiltDependencies: [sharp]` + `allowBuilds: { sharp: true }` in BOTH dirs (pnpm blocks sharp's native build → `next build` hard-fails on a cold `node_modules`); pnpm pinned `11.3.0` honors `allowBuilds`.
- Footer copyright year is a hardcoded literal — `new Date().getFullYear()` in a Server Component breaks `next build` under the compiler/cache defaults.
- lucide-react 1.x dropped ALL brand glyphs (`Github`, `Twitter`, `Linkedin`, `Youtube`, …) — importing them fails `next build`. Social buttons use non-brand glyphs only: `Mail`, `Globe`, `Rss`, `Send`, `MessageCircle`, `AtSign`, `Share2`.
- shadcn primitives arrive double-quoted with `import * as React` — accept on first add, let `pnpm check --write` normalize. `radix-ui` umbrella `^1.4.3` (new-york-v4 style), not per-primitive packages.
- `Card` has no `asChild` — `FeatureCard` (`<article>`) and `PricingCard` inline `Card`'s container classes onto the semantic root and nest the sub-parts; never double-wrap `<Card>`.
- `'use client'` file count for any verification includes the installed `components/ui/*` set (sheet, separator, dialog-deps carry the directive), not only authored islands.

**Code conventions (from `Code conventions.md`, taught syntax):**
- Filenames kebab-case; one component per file (compound sets the only exception — not used here). Components/types PascalCase, functions/vars camelCase, booleans as predicates (`isFeatured`, never `featured` as a local bool name — data prop `featured` is fine as the data field).
- `type` aliases, never `interface`. No `any`. `import type` for type-only imports (`verbatimModuleSyntax`).
- Arrow-`const` for components/hooks/callbacks. Default exports ONLY for framework-named files (`layout.tsx`, `page.tsx`); named exports everywhere else. Two positional params max, then options object.
- Refs as a regular prop typed `Ref<T>` — no `forwardRef` (not needed in this project, but if a ref is threaded, this is the form).
- `children: ReactNode`. Class composition through `cn()` from `@/lib/utils` with `className` **last**. Polymorphism via `asChild` + `cva` only, never a custom `as` prop.
- No `useMemo`/`useCallback`/`React.memo` (React Compiler on). `useEffect` only for external-system sync (the body-scroll lock qualifies). `react-hooks/rules-of-hooks` + `exhaustive-deps` never disabled.
- Imports in three alphabetized groups (external / `@/` / relative), side-effecting imports (`import './globals.css'`) first. No barrel files. No deep relative imports — use `@/`.
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`) — direct primitive (`bg-blue-500`) is a smell and a finding. `gap` for spacing, never sibling margins. Logical properties (`ps-*`/`pe-*`) over physical. `motion-reduce:` on every visible animation.
- Semantic HTML first: `<button>` for actions, `<a>`/`<Link>` for navigation, landmarks (`<header>`/`<nav>`/`<main>`/`<footer>`), one `<h1>`, no heading-level skips. `aria-label` on icon-only buttons; lucide glyphs are already `aria-hidden` (never hand-add). Visible `focus-visible:` ring on every interactive control. WCAG 2.2 AA contrast.
- Comments rare; the only allowed inline comments here are the `TODO(L<n>)` stub markers and a one-line reason for a non-obvious choice. No narration.

**Structural invariants (head off render breaks):**
- The `<main>` in `page.tsx` is a flat document-order sequence of `<Hero>`/`<FeatureGrid>`/`<PricingTable>`; the page root is `flex min-h-dvh flex-col` with header, main, footer as its three direct children. Each section component resolves to a SINGLE root element (`<section>`/`<header>`/`<footer>`) — never a bare fragment that flattens into the parent flex column and splits one slot into several flex items.
- The header's two slots (`theme-toggle-slot`, `header-mobile-slot`) each resolve to a single `<div>` wrapper whose contents change across slices; the slot wrapper element and its `data-testid` are stable from S1.
- The single `<h1>` lives in `Hero`; `FeatureGrid` and `PricingTable` open with `<h2>`; `PricingCard` tier names are `<h3>`. No level is skipped.
- Theme is driven ONLY by the `.dark` class via `next-themes`; components never read `prefers-color-scheme` directly. The theme-aware image and toggle both key off `.dark`.

**Stable selectors (every rendered surface exposes `data-testid` for its checks):** `site-header`, `theme-toggle-slot`, `header-mobile-slot`, `theme-toggle`, `mobile-nav-trigger`, `mobile-nav-content`, `hero`, `hero-image-light`, `hero-image-dark`, `feature-grid`, `feature-card`, `pricing-table`, `pricing-card`, `pricing-card-featured`, `site-footer`. Prefer these over positional selectors in all Rendered checks.

## File tree

Complete tree after S7 (`solution/`; `start/` is identical except the 11 student files carry stubs). `[S1]` etc. tag the slice that creates/edits; unmarked files are scaffolder-authored.

```
solution/
  package.json                              # scaffold
  pnpm-lock.yaml                            # scaffold
  pnpm-workspace.yaml                       # scaffold (sharp ledger)
  .npmrc                                    # scaffold
  .mise.toml                                # scaffold
  .editorconfig                             # scaffold
  .gitignore                                # scaffold
  biome.json                                # scaffold
  tsconfig.json                             # scaffold
  next.config.ts                            # scaffold
  components.json                           # scaffold (shadcn)
  next-env.d.ts                             # scaffold (generated, committed)
  AGENTS.md                                 # scaffold
  vitest.config.ts                          # scaffold
  scripts/
    test-lesson.mjs                         # scaffold (single-file runner)
  tests/
    lessons/
      Lesson 6.test.ts                      # scaffold placeholder (lesson-test-coder fills)
      Lesson 7.test.ts                      # scaffold placeholder
      Lesson 8.test.ts                      # scaffold placeholder
      Lesson 9.test.ts                      # scaffold placeholder
      Lesson 10.test.ts                     # scaffold placeholder
      Lesson 11.test.ts                     # scaffold placeholder
      Lesson 12.test.ts                     # scaffold placeholder
  public/
    hero-light.png                          # scaffold (placeholder asset) [used by: S2]
    hero-dark.png                           # scaffold (placeholder asset) [used by: S2]
    logo.svg                                # scaffold (placeholder asset)
  .vscode/
    extensions.json                         # scaffold
    settings.json                           # scaffold
  src/
    app/
      globals.css                           # scaffold (tokens, light + .dark)
      layout.tsx                            # scaffold (default export; html, Providers, font)
      page.tsx                              # scaffold (static shell composing all sections)
      _components/
        providers.tsx                       # scaffold ('use client'; ThemeProvider)
    components/
      ui/
        button.tsx                          # scaffold (shadcn add)
        sheet.tsx                           # scaffold (shadcn add)
        card.tsx                            # scaffold (shadcn add)
        separator.tsx                       # scaffold (shadcn add)
        badge.tsx                           # scaffold (shadcn add)
        skeleton.tsx                        # scaffold (shadcn add; unused, forward-compat)
      site-header.tsx                       # [created by: S1, edited by: S6, S7]
      hero.tsx                              # [created by: S2]
      theme-aware-image.tsx                 # [created by: S2]
      feature-card.tsx                      # [created by: S3]
      feature-grid.tsx                      # [created by: S3]
      pricing-card.tsx                      # [created by: S4]
      pricing-table.tsx                     # [created by: S4]
      site-footer.tsx                       # [created by: S5]
      theme-toggle.tsx                      # [created by: S6]
      mobile-nav.tsx                        # [created by: S7]
    hooks/
      use-lock-body-scroll.ts               # [created by: S7]
    lib/
      data.ts                               # scaffold (typed copy + fixtures)
      utils.ts                              # scaffold (cn())
```

## Verification

### Static checks (reviewer executes)

1. **both** — `pnpm verify` exits 0 in `solution/` and in `start/` (Biome CI + `tsc --noEmit` + `next build` all green). Catches drift, type errors, build failures, the sharp/babel-plugin/jsx pitfalls.
2. **both** — `pnpm test:lesson 6` runs exactly `tests/lessons/Lesson 6.test.ts` and no other (confirm it does not also pick up `Lesson 16` — there is none, but verify the runner passes an exact path, not a substring positional). Repeat sanity for one two-digit lesson: `pnpm test:lesson 12` runs only `Lesson 12.test.ts`.
3. **start** — `rg "TODO\(L" start/src` lists exactly the 11 student files (one marker each), enumerating the work. Each marker names the owning lesson L6–L12.
4. **solution** — `rg -l "TODO\(L" solution/src` returns nothing (no stub markers left in the completed solution).
5. **solution** (feature-not-inert greps — each fails if the load-bearing teaching feature ships inert):
   - `rg "cva\(" solution/src/components/feature-card.tsx` — the feature card actually uses a `cva` variant table (fails if it ships hard-coded classes with no variants).
   - `rg "featured" solution/src/components/pricing-card.tsx` — the featured branch exists (fails if every tier renders identically).
   - `rg "md:motion-reduce:scale-100" solution/src/components/pricing-table.tsx` — the reduced-motion guard ships in the working stacked form (a bare `motion-reduce:scale-100` is inert at `md`+ and must NOT be accepted here).
   - `rg "dark:hidden" solution/src/components/theme-aware-image.tsx` AND `rg "dark:block" solution/src/components/theme-aware-image.tsx` — both `<img>` sources toggle via CSS (fails if only one image ships or a JS branch is used).
   - `rg "resolvedTheme" solution/src/components/theme-toggle.tsx` — the toggle flips off `resolvedTheme`, not `theme` (fails if it would break at `"system"`).
   - `rg "useLockBodyScroll" solution/src/components/mobile-nav.tsx` — the drawer wires the scroll-lock hook (fails if the page scrolls behind an open drawer).
   - `rg "SheetTitle" solution/src/components/mobile-nav.tsx` — the mandatory accessible name is present (fails Radix at runtime otherwise).
   - `rg "aria-label" solution/src/components/site-footer.tsx` — icon-only social buttons are labelled (fails if they are silent to AT).
   - `rg -- "--dark|\.dark" solution/src/app/globals.css` and `rg "@theme inline" solution/src/app/globals.css` — the dark palette and the token bridge both exist.
6. **both** — `rg "tailwind.config" solution start --glob '!**/node_modules/**'` returns nothing (CSS-first config only; no legacy JS Tailwind config).
7. **both** — no brand-name lucide import: `rg "from 'lucide-react'" -A0 solution/src start/src` shows only non-brand glyph names (manual scan, or `rg "Github|Twitter|Linkedin|Youtube|Facebook|Instagram" solution/src start/src` returns nothing).

### Rendered checks (slice coders + inspector run against the running app)

All routes are `/` (single static page). Viewports given explicit. The owning slice runs its check as its render checkpoint.

| id | slice | route | viewport | state | intent | selectors | assertion |
|----|-------|-------|----------|-------|--------|-----------|-----------|
| R-header-desktop | S1 | / | 1280×800 | settled | header shows logo + all nav links on desktop | `site-header`, `header-mobile-slot` | `site-header` is the page's first landmark; it contains one logo link and every `navLinks` entry as a visible link in order; `header-mobile-slot` is present but empty/hidden at this width (`md:hidden`). |
| R-header-mobile | S1 | / | 390×844 | settled | desktop nav hides, mobile slot takes its place below md | `site-header`, `header-mobile-slot` | At 390px the desktop nav links are not visible; `header-mobile-slot` is the visible nav affordance area; no horizontal scroll (document scrollWidth ≤ viewport width). |
| R-hero-desktop | S2 | / | 1280×800 | settled | hero copy + image side by side at lg, single h1, correct theme image | `hero`, `hero-image-light`, `hero-image-dark` | `hero` contains exactly one `<h1>` and two CTA links; both image sources render in the DOM, exactly one is visually shown (the light one in light theme); at 1280px the copy block and image block sit in the same row (image left edge > copy right edge). |
| R-hero-mobile | S2 | / | 390×844 | settled | hero stacks below lg, no overflow | `hero`, `hero-image-light` | At 390px the copy and image are stacked (image top > copy bottom, i.e. not in the same row); no horizontal scroll. |
| R-features-desktop | S3 | / | 1280×800 | settled | three feature cards in one row, h2 present | `feature-grid`, `feature-card` | `feature-grid` opens with an `<h2>`; it has exactly 3 `feature-card` children; at 1280px the three cards share one row (equal top offsets, distinct left offsets). |
| R-features-mobile | S3 | / | 390×844 | settled | grid collapses to one column below md | `feature-grid`, `feature-card` | `feature-grid` still has exactly 3 `feature-card` children; at 390px they stack in one column (distinct top offsets, equal left offsets); no horizontal scroll. |
| R-pricing-featured | S4 | / | 1280×800 | settled | exactly one tier promoted, three in a row | `pricing-table`, `pricing-card`, `pricing-card-featured` | `pricing-table` has exactly 3 `pricing-card` children (counting `pricing-card` + `pricing-card-featured`); exactly one carries `pricing-card-featured` and shows a "Most popular" badge + a `border-primary` accent ring; at 1280px the three cards share one row and the featured wrapper's computed `scale` property is `1.05` (read `scale`, not `transform`). |
| R-pricing-motion | S4 | / | 1280×800 | settled (emulate prefers-reduced-motion) | reduced-motion suppresses the lift | `pricing-card-featured` | Read the lifted wrapper's computed `scale` property (Tailwind v4's `scale-*` utilities set CSS `scale`, NOT `transform` — `getComputedStyle().transform` is always `none` here and is not a valid signal). With `prefers-reduced-motion: reduce` emulated the computed `scale` is `1` (or `none`); without emulation it is `1.05`. |
| R-footer-desktop | S5 | / | 1280×800 | settled | three link columns + labelled social buttons | `site-footer` | `site-footer` is the page's last landmark; it renders 3 link-group columns side by side at 1280px and a row of icon buttons each exposing a non-empty accessible name (`aria-label`). |
| R-footer-mobile | S5 | / | 390×844 | settled | columns stack below md | `site-footer` | At 390px the footer link columns are stacked (distinct top offsets); no horizontal scroll. |
| R-header-complete | S6 | / | 1280×800 | settled | toggle mounted in header slot, single element | `theme-toggle-slot`, `theme-toggle` | `theme-toggle-slot` resolves to a single wrapper containing exactly one `theme-toggle` button with a non-empty accessible name; the header still has logo + nav + this one toggle, no extra split elements. |
| R-theme-toggle | S6 | / | 1280×800 | initial load then click `theme-toggle` | clicking the toggle flips the whole page theme with no console hydration warning | `theme-toggle` | On load the `<html>` lacks/has `.dark` per system; clicking `theme-toggle` toggles the `.dark` class on `<html>` and visibly swaps page colors; the console logs no React hydration-mismatch warning during load. |
| R-drawer-open | S7 | / | 390×844 | tap `mobile-nav-trigger`, settle (`drawer-open`) | hamburger opens a focus-trapped, scroll-locked drawer below md | `mobile-nav-trigger`, `mobile-nav-content` | At 390px `mobile-nav-trigger` is visible; activating it renders `mobile-nav-content` (a single dialog) over the page containing every `navLinks` entry; `document.body` computed `overflow` is `hidden` while open; focus is inside the drawer. |
| R-drawer-close | S7 | / | 390×844 | open drawer, press Esc | Esc closes the drawer, restores scroll, returns focus to trigger | `mobile-nav-trigger`, `mobile-nav-content` | After Esc, `mobile-nav-content` is gone, `document.body` `overflow` is restored (not `hidden`), and `document.activeElement` is the `mobile-nav-trigger` button. |
| R-drawer-link | S7 | / | 390×844 | open drawer, click a nav link | tapping a link navigates and closes the drawer in one action | `mobile-nav-content` | Clicking a link inside `mobile-nav-content` closes it (content gone) and the page does not crash; body scroll is restored. |
| R-no-horizontal-scroll | S7 | / | 360×800 | settled | the finished page reflows with no horizontal scroll at the narrowest width | (document) | At 360px the document `scrollWidth` ≤ `clientWidth` (no horizontal scroll); header, hero (stacked), feature grid (one column), pricing (stacked), footer (stacked) all present. |
