# Chapter 4.2 — Tailwind as the CSS surface, where it touches React

## Chapter framing

Chapter 4.1 closed with the student writing semantic JSX; every element so far has been unstyled. Chapter 4.2 paints them. The senior framing: **Tailwind v4 is the CSS surface a 2026 SaaS UI ships with, and that surface lives inside the React component, on the JSX tag, not in a sibling `.css` file.** The chapter installs *why* utility-first earns its weight on a React stack, *what shape* Tailwind v4 takes (CSS-first config in `app/globals.css` via `@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@container` — no `tailwind.config.ts`), *how* to compose classes safely when components accept overrides (the `cn()` helper wrapping `clsx` + `tailwind-merge`), and *where* the JSX and the CSS meet — `data-*`/`aria-*`/`group-*`/`peer-*`/`has-*`/`*:`/`not-*` variants that read state the DOM already tracks, so state-driven styling doesn't need `useState`. Cascade, layout, typography, and motion are not this chapter's job (Chapters 4.3, 4.4, 4.5 own them). This chapter is the React-Tailwind seam.

The six teaching lessons run in order — utility-first thinking and the variant surface; Tailwind v4's CSS-first directives; `cn()` composition with `className` last so consumer overrides win; state and structural variants; the `dark:` variant with semantic tokens (the shadcn model where a `.dark { ... }` block swaps token values rather than per-utility `dark:`); and `next-themes` for the React-side wiring with `<ThemeProvider>` in a client `<Providers>` wrapper, `suppressHydrationWarning` on `<html>`, and an inline script that sets the class before paint to prevent FOUC. The quiz closes. Forward references: `@theme` tokens and the cascade deepen at Chapter 4.3, container queries at Chapter 4.5.7, CVA variants at Chapter 4.6.3, shadcn's copy-paste model at Chapter 4.11.1, the accessibility consequences at Chapter 4.11.2 and 4.5.5. The chapter ends with the student writing a themed `<Card>` that accepts `className` overrides, styles its trigger via `data-state` variants, ships semantic tokens for both themes, and toggles theme without FOUC.

---

## Lesson 4.2.1 — Utility-first thinking, variants, and arbitrary values

Topics to cover:

- The senior question: a component needs padding, background, rounded corners, border, hover, focus ring, and a responsive override. The lesson names the decision (utility-first by default for component-internal styling) and the thresholds (bespoke CSS earns its weight for prose, animations, third-party overrides).
- **What utility-first replaces.** Named-class CSS (`.card-header`) paired with JSX. Components in React are already named; duplicating the name as a CSS class adds nothing. Utility classes describe what the element *does* visually.
- **The utility class surface.** A short tour of the families the student writes daily — layout primitives (`flex`, `grid`, `hidden`), spacing (`p-*`, `m-*`, `gap-*`), sizing (`w-*`, `h-*`, `size-*`), color (`bg-*`, `text-*`, `border-*`), typography (`text-sm`, `font-medium`), border/radius, effects (`shadow`, `opacity`, `transition`). The senior recognition is the *families* and the *naming convention*, not memorized lists.
- **The theme scale.** Numbers in utility names are theme tokens (`p-4` → `padding: var(--spacing-4)` → `1rem`), consistent across spacing utilities. Reach for the scale before arbitrary values. (Chapter 4.3 owns the token model.)
- **Variants — the prefix-and-colon model.** `variant:utility`, stackable left-to-right. The lesson installs state variants (`hover:`, `focus-visible:`, `active:`, `disabled:`), form-state variants (`checked:`, `invalid:`), responsive variants (`sm:`, `md:`, mobile-first), the `dark:` variant (wired in 4.2.5/4.2.6), and the accessibility variants (`print:`, `motion-reduce:`, `contrast-more:`).
- **Modifiers — the `/` postfix.** Opacity on color and ring utilities (`bg-foreground/10`, `text-primary/80`) for translucent overlays without writing `rgba(...)`.
- **Arbitrary values — `[...]`.** The escape hatch when the theme scale doesn't fit (`w-[37rem]`, `bg-[#1a1a2e]`, `grid-cols-[200px_1fr_200px]`). Every arbitrary value is a signal that the theme scale should grow.
- **Arbitrary properties — `[property:value]`.** When no utility exists at all. Rare; named for recognition.
- **CSS variables in arbitrary values.** `bg-[--card-overlay]`, `w-[var(--sidebar-width)]` for JS-set properties driving utilities. Chapter 4.3 owns CSS variables at depth.
- **Important modifier — `!`.** Postfix `!` forces `!important` (`text-red-500!`). Rare; for third-party CSS overrides. Chapter 4.3 owns the cascade.
- **What utility classes don't do well, and the escape hatches.** Complex selectors (`@custom-variant` or bespoke CSS), keyframe animations (`@theme --animate-*`, Chapter 4.5.5), pseudo-elements at depth (`before:`/`after:` with `content-['']`).
- **The reading instrument.** Browser Elements panel — class string visible in DOM, resolved styles in the Computed panel.
- **Watch-outs the lesson names.** `@apply` is not the senior default (reintroduces named classes); long class strings are not a code smell; no template-literal conditional concatenation (foreshadows 4.2.3); enable the Tailwind IntelliSense extension; class purging is text-based, so dynamic class names (`bg-${color}-500`) never emit.

What this lesson does not cover:

- Tailwind v4's CSS-first config and the `@theme`/`@utility`/`@container` directives (4.2.2).
- The `cn()` helper, `clsx`, `tailwind-merge`, and CVA composition (4.2.3, Chapter 4.6.3).
- The structural and state variants (`group-*`, `peer-*`, `data-[...]`, `aria-*:`, `has-*`) (4.2.4).
- The `dark:` variant and the dark-mode wiring (4.2.5).
- `next-themes` and the React-side theme wiring (4.2.6).
- The cascade, specificity, and `@layer` (Chapter 4.3.1).
- CSS custom properties and design tokens at depth (Chapter 4.3.4).
- Tailwind Preflight, the implicit base reset (Chapter 4.3.3).
- The full layout model — flex, grid, sizing, spacing (Chapter 4.4).
- Typography, color, motion, responsive variants at depth (Chapter 4.5).
- shadcn/ui and the copy-paste model (Chapter 4.11.1).
- The Tailwind v3 → v4 migration story — out of scope; the course pins v4.
- The legacy `tailwind.config.ts` form — named once for recognition, never taught.

---

## Lesson 4.2.2 — Tailwind v4 CSS-first config: `@theme`, `@utility`, `@container`

Topics to cover:

- The senior question: brand color, custom spacing scale, custom utility, container-query layout. In v3 this lived in `tailwind.config.ts`; in v4 it lives in `app/globals.css` through `@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@container`. The lesson installs the CSS-first model and the four directives.
- **The 2026 v4 baseline.** Lightning CSS engine, OKLCH default palette, `@import "tailwindcss"` replaces v3's three directives, container queries first-class, JS config optional. The student writes one `app/globals.css`, imported once into `app/layout.tsx`.
- **`@import "tailwindcss"`.** The single import brings in Preflight (Chapter 4.3.3), the utility classes, and the default theme. Line 1 of `app/globals.css`.
- **`@theme` — design tokens as CSS variables.** Defines theme tokens (e.g. `--color-brand: oklch(...)`, `--spacing-section: 6rem`, `--radius-card: 0.75rem`). Every variable becomes a utility (`bg-brand`, `p-section`, `rounded-card`). Naming is `--{namespace}-{name}`; namespaces map deterministically to utility families.
- **Token reference and naming conventions.** Which namespace produces which family: `--color-*` → `bg-*`/`text-*`/`border-*`/`ring-*`/etc.; `--spacing-*` → `p-*`/`m-*`/`gap-*`/etc.; `--radius-*` → `rounded-*`; `--font-*` → `font-*`; `--text-*` → `text-*` (size + line-height); `--breakpoint-*` → responsive variants; `--animate-*` → `animate-*` (Chapter 4.5.5).
- **Disabling default tokens — `--color-*: initial`.** Reset Tailwind defaults to keep IntelliSense focused on project tokens. Senior reach for tightly-scoped design systems.
- **`@utility` — custom utilities defined in CSS.** For cross-cutting patterns that don't map to a single Tailwind utility (e.g. `@utility scroll-snap-x` for a scroll container). Functional form `@utility tab-* { tab-size: --value(integer) }` generates `tab-2`, `tab-4`, etc. Threshold: if it appears in three+ components, name it.
- **`@custom-variant` — custom variants in CSS.** New `variant:` prefixes. Two forms: selector-based (e.g. `pointer-coarse` for `@media (pointer: coarse)`) and DOM-state-based (e.g. `theme-blue` for `[data-theme=blue]`). The dark-mode variant in 4.2.5 is a `@custom-variant`.
- **`@container` — container queries, first-class in v4.** Mark a container (`@container`, or named `@container/sidebar`); query it (`@sm:p-6`, `@lg:grid-cols-3`); named queries (`@sm/sidebar:p-6`); max-width queries (`@max-md:hidden`). Replaces responsive variants when layout depends on the *component's* width. Chapter 4.5.7 owns container queries at depth.
- **`@source` for non-default content paths.** `@source "../packages/ui/src/**/*.tsx"`. Senior reach for monorepos with shared UI packages.
- **The legacy JS config.** `tailwind.config.ts` still works via `@config`. Named only for recognition on older projects.
- **Plugins in v4.** Official plugins (`@tailwindcss/typography`, `@tailwindcss/forms`) load via `@plugin "..."`. Typography ships the `prose` class for Markdown content; Forms ships reset-friendly form-element defaults. Both named for recognition.
- **The compile pipeline.** `app/globals.css` plus source files feed into Lightning CSS, which emits a single CSS file with only used utilities. No PostCSS, no separate build step; Turbopack handles it.
- **Importing globals in the root layout.** `import './globals.css'` at the top of `app/layout.tsx`. Ships from the Chapter 1.4 scaffold.
- **Watch-outs the lesson names.** Tokens not appearing (wrong namespace prefix); default theme still applies unless overridden; `@theme` tokens are global on `:root`; `@custom-variant` needs `:where()` wrap for specificity 0 (Chapter 4.3.1); container queries need an `@container` ancestor; source scanning is text-based (restated from 4.2.1); v3 plugin compatibility lag.

What this lesson does not cover:

- The `cn()` helper for composition (4.2.3).
- The structural and state variants (4.2.4).
- Dark mode (4.2.5, 4.2.6).
- The cascade and `@layer` directive (Chapter 4.3.1).
- Tailwind Preflight (Chapter 4.3.3).
- CSS custom properties at depth and how `@theme` compiles to them (Chapter 4.3.4).
- Typography plugin and the `prose` class — out of scope for this chapter; cited at Chapter 4.5.1.
- Forms plugin and form-element defaults — out of scope for this chapter; cited at Chapter 7.3.
- Animations and `@theme --animate-*` (Chapter 4.5.5).
- Container queries at depth (Chapter 4.5.7).
- The v3 → v4 migration story — out of scope; the course pins v4.

---

## Lesson 4.2.3 — Class composition with `cn()` (`clsx` + `tailwind-merge`)

Topics to cover:

- The senior question: a `<Button>` accepts a `className` prop for consumer overrides. Naive template-literal concat produces conflicting classes (consumer's `px-8` and component's `px-4` both in the string), and the cascade picks whichever Tailwind emits last — build-dependent, unpredictable. The lesson installs `cn()` and the reflex of "always `cn`, never template-string concat for Tailwind classes."
- **The naive failure shape.** Two classes setting the same property both land on the element; Tailwind emits rules in fixed source order; the later rule wins by cascade. Bug is silent and build-dependent.
- **`clsx`.** A tiny dependency-free utility that builds class strings from conditionals — strings, arrays, objects, falsy values dropped. Doesn't know Tailwind conflicts; just concatenates.
- **`tailwind-merge`.** A Tailwind-aware deduplicator that resolves conflicts last-wins (e.g. `twMerge('px-4 py-2 px-8')` → `'py-2 px-8'`). Knows variant prefixes, responsive prefixes, shorthand/longhand. Pin a version compatible with the installed Tailwind.
- **The `cn()` helper.** Canonical wrapper at `src/lib/cn.ts` — `clsx` first (flatten conditionals), `tailwind-merge` second (resolve conflicts). Every shadcn component imports this exact helper.
- **The component-with-override pattern.** Reusable components accept `className` and pass it through `cn()` *last* — defaults first, conditional/variant classes next, consumer `className` last. The order is the rule that lets consumer overrides win.
- **Conditional class composition — the four forms.** `&&` (boolean toggles, canonical), object form (`{ active: isActive }`), ternary (two-branch), array form (rare). Pick what reads cleanest.
- **CVA — `class-variance-authority` (foreshadowed).** When components have orthogonal variants (size × variant × state), CVA declares the matrix once. Chapter 4.6.3 owns CVA in depth. Every shadcn component uses CVA + `cn` together.
- **What `tailwind-merge` knows and doesn't.** Knows: Tailwind's utility surface, variant prefixes, responsive prefixes, shorthand/longhand. Doesn't know: bespoke CSS classes, third-party CSS, arbitrary properties without Tailwind conventions.
- **Where `cn()` lives.** `src/lib/cn.ts`, imported as `@/lib/cn`. Ships from the Chapter 1.4 scaffold.
- **Reading the output.** DOM contains only the surviving classes; the merge happens at render time. Debugging move: if a class isn't in the DOM, `cn()` merged it out.
- **Watch-outs the lesson names.** Never template-literal concat for Tailwind classes; `className` last in `cn()` (consumer wins); don't `cn()` in `useEffect` or non-render paths; `cn()` cost is sub-millisecond per call (rarely matters at SaaS scale); `extendTailwindMerge` configures conflict groups for custom utilities (rare); the `className` prop is the convention; don't `cn()` when no conditionals or overrides exist; v4's `!` important modifier interacts predictably with `tailwind-merge`.

What this lesson does not cover:

- CVA — `class-variance-authority` (Chapter 4.6.3).
- The `asChild` + Radix Slot polymorphic pattern (Chapter 4.6.3).
- shadcn/ui's component templates (Chapter 4.11.1).
- The cascade and specificity at depth (Chapter 4.3.1).
- The `!important` modifier at depth (Chapter 4.3.1).
- The `style` prop for dynamic CSS — out of scope; Chapter 4.1.1 introduced it.
- The structural and state variants (4.2.4).
- React 19's `ref` as a prop and forwarding `className` through (Chapter 4.6.4).

---

## Lesson 4.2.4 — State and structural variants: `data-*`, `aria-*`, `group`, `peer`, `has`

Topics to cover:

- The senior question: a disclosure widget's chevron rotates when open, an error message turns red on invalid input, a card highlights on hover, a submit button disables when any child input is invalid. Naive reach: `useState` for each. Senior reach: read state the DOM already tracks (`data-state`, `:invalid`, `:hover`, `:has()`) and let variants paint accordingly — no `useState`, no handlers.
- **The model.** A Tailwind variant is a selector wrapper — `hover:bg-primary` becomes `&:hover { ... }`, `data-[state=open]:rotate-180` becomes `&[data-state="open"] { ... }`. Any state a CSS selector can read, a variant can express: DOM-tracked (`:hover`, `:focus`, `:invalid`, `:checked`, `:disabled`), JSX-set (`data-*`, `aria-*`), descendant/sibling/parent (`has-*`, `*:`, `peer-*`, `group-*`).
- **`data-*` attribute variants.** Form: `data-[attr=value]:utility`. Three use cases — Radix-style `data-state` (`open`, `closed`, `active`, `inactive`) for disclosures/accordions/tabs/dropdowns; project-defined `data-*` (`data-loading`, `data-variant`); toggle states (`data-theme="dark"` from 4.2.5/4.2.6). Form without `=value` tests for attribute presence.
- **`aria-*` attribute variants — the canonical eight.** Built-in variants: `aria-expanded:`, `aria-pressed:`, `aria-selected:`, `aria-checked:`, `aria-disabled:`, `aria-busy:`, `aria-current:`, `aria-invalid:`. ARIA attributes serve two purposes: assistive tech reads them and Tailwind styles by them — one source of truth.
- **`group-*` — parent-state variants.** The `group` utility marks a parent; `group-hover:`, `group-focus:`, `group-data-[state=open]:` etc. let children read the parent's state. Named groups (`group/item`, `group-hover/item:`) disambiguate when multiple ancestors are marked.
- **`peer-*` — sibling-state variants.** The `peer` utility marks a sibling; `peer-invalid:`, `peer-checked:`, `peer-focus:`, `peer-placeholder-shown:` let later siblings read it. Form inline errors driven by native `:invalid` (Chapter 7.3.7 cashes the Constraint Validation API). Only reaches *later* siblings — source order matters.
- **`has-*` — descendant-state variants.** Tailwind ships `has-[...]:` over the CSS `:has()` parent selector. Use cases: a form highlights when any child input is `:invalid`; a label lifts when it contains a `:checked` input; a list item bolds when its link is `aria-current="page"`. Replaces a lot of `useState` mirroring.
- **`*:` — direct-children variants.** `*:py-2` styles every direct child. For ad-hoc child styling when the children aren't components the parent controls.
- **`not-*` — negation.** `not-disabled:`, `not-hover:`, `not-data-[state=open]:`. "Every element not in this state." Composes with other variants.
- **Positional variants.** `first:`, `last:`, `odd:`, `even:`, `only:`, `empty:` — for grouped corners, striped rows, collapsing empty containers.
- **`open:` — for `<details>` and `<dialog>`.** Reads the native `open` attribute. Rare in modern SaaS (Radix is the senior reach for richer interactions); named for recognition.
- **Stacking and combining.** Variants compose left-to-right; senior reach is "constraint outermost" — breakpoint or theme outside, state inside.
- **The senior pattern — read state, don't mirror it.** Every state-driven style change starts with "can the DOM already tell me this?" If yes, write a variant. If no (server-fetched value, derived computation), use `useState` and conditional classes via `cn`.
- **Watch-outs the lesson names.** `peer` only reaches later siblings; `:has()` performance at scale (rarely a problem at SaaS component scale); ARIA values are strings, not booleans; `data-state` is Radix's convention, not Tailwind's; group/peer slash-names disambiguate at scale; `*:` is easy to over-apply; `:has()` browser support is solid in 2026; don't fight the DOM model — pick the right tool.

What this lesson does not cover:

- The full Radix UI surface (Chapter 4.11.1).
- shadcn/ui components that ship with these variants pre-wired (Chapter 4.11.1).
- The Constraint Validation API for form `:invalid` (Chapter 7.3.7).
- ARIA at depth — roles, live regions, the first rule of ARIA (Chapter 4.11.3).
- The `data-*` attribute as a script-delegation hook (Chapter 4.1.6 covered).
- Focus management and tab order (Chapter 4.11.4).
- The `not-disabled:` and `:not()` selector pattern at depth — covered lightly here, deepened at Chapter 4.5.4.
- Pseudo-class details (`:focus-visible` etc.) — Chapter 4.5.4 owns.
- Animation and motion variants (`motion-reduce:`, `motion-safe:`) — Chapter 4.5.5.
- Container queries (`@container`, `@sm:`) — Chapter 4.5.7.

---

## Lesson 4.2.5 — The `dark:` variant and the semantic-token model

Topics to cover:

- The senior question: light and dark theme. Naive reach is `dark:` everywhere, doubling color utilities. Senior reach is semantic tokens (`bg-background`, `text-foreground`, `border-border`) that resolve differently per theme — one set of utilities, theme decides the values. The lesson installs both forms, the threshold, and the `@custom-variant dark` wiring. Lesson 4.2.6 owns the React side.
- **The naive `dark:` form and what it costs.** Maintenance cost (every component re-derives the dark palette), inconsistency (different darks drift), class string weight (six to ten extra utilities per element). `dark:` per utility earns its weight only for one-off cases.
- **Semantic tokens — the shape.** The 2026 senior pattern (the shadcn model): an `@theme` block with the canonical role-named color tokens (`--color-background`, `--color-foreground`, `--color-card`, `--color-primary`, `--color-muted`, `--color-border`, `--color-ring`, `--color-destructive`, `--color-accent`, plus matching `*-foreground` pairs) defined in OKLCH for light, then a `.dark { ... }` block redefining the same tokens for dark. Names are *semantic* (role), not *visual* (color).
- **The `@custom-variant dark` directive.** `@custom-variant dark (&:where(.dark, .dark *));` in `app/globals.css`. The `:where()` wrap keeps specificity at 0. The variant exists so the *token override* takes effect when `.dark` is on `<html>`; the senior reach is *not* per-utility `dark:`.
- **Putting it together.** `app/globals.css`: `@import`, `@custom-variant dark`, `@theme` light tokens, `.dark { ... }` dark overrides. Components: semantic-token utilities only. `<html>`: the `dark` class toggles between themes (Lesson 4.2.6 wires it).
- **Why OKLCH.** Perceptually-uniform lightness — a `0.1` step looks the same magnitude regardless of hue, unlike hex/RGB. Form is `oklch(L C H)`. Shadcn's palette is OKLCH; no color theory required.
- **The `system` mode and `prefers-color-scheme`.** OS preference is readable via the media query. With the class-based variant, system preference is wired by the React side (4.2.6); Tailwind just reads the class.
- **The "one-off `dark:` per utility" carve-out.** Specifically-tuned shadow, gradient that flips in dark, illustration overlay — `dark:` inline is the right reach. Threshold: if the same `dark:` adjustment appears in two components, promote it to a token.
- **Semantic tokens in the wild.** Shadcn's `<Input>` reads from the model — `bg-input`, `border-input`, `focus-visible:ring-ring`, `aria-invalid:border-destructive aria-invalid:bg-destructive/10` (4.2.4's pattern crossing with the token model). One class string carries through every theme variation.
- **Non-color tokens.** The same model applies to radius (`--radius-md`, `--radius-lg`), shadow (`--shadow-card`), font sizes — any design-system value that varies by theme, surface, or component tier.
- **Hue-shifted dark themes.** Dark themes that shift hues, not just lightness. The token model handles this transparently — values per theme are independent.
- **Testing the dark theme.** Per-component reach: `<ThemeToggle>` and inspect. Team-level: visual regression on both themes (Chapter 19, Chapter 20.4).
- **Watch-outs the lesson names.** Don't reach for `dark:` per utility as the default; don't define the dark palette inline; `:where()` wrap is not optional (specificity); `prefers-color-scheme` is the OS preference, not the user's site preference; color contrast is theme-dependent (Chapter 4.11.2); custom themes beyond light/dark extend via the `data-theme` attribute strategy.

What this lesson does not cover:

- The React-side theme wiring with `next-themes` (4.2.6).
- The full design-token treatment and CSS custom properties (Chapter 4.3.4).
- The OKLCH color space at depth and color theory (out of scope; cited at Chapter 4.5.2).
- Color contrast testing and the WCAG AA discipline (Chapter 4.11.2).
- Visual regression testing (Chapter 19.4 and Chapter 20.4).
- The `<ThemeToggle>` component implementation — 4.2.6 owns the React side, this lesson is Tailwind side.
- The `prefers-color-scheme` media-query syntax at depth — Chapter 4.5.6 covers media queries.

---

## Lesson 4.2.6 — `next-themes`: React-side theme wiring without FOUC

Topics to cover:

- The senior question: the `dark` class on `<html>` (from 4.2.5) must be set before paint, or the user sees a flash of light theme. A naive `useEffect` reads `localStorage` *after* hydration — the flash is the bug. Senior reach: `next-themes` injects a synchronous `<head>` script before paint. The lesson installs the wiring, `<ThemeProvider>`, `useTheme()`, `suppressHydrationWarning`, the React-19 warning, and the canonical `<ThemeToggle>`.
- **The FOUC problem.** SSR doesn't know the user's theme. Without a pre-paint class, the page renders default, then JS hydrates and flashes to dark. The fix is setting the class *before* the body parses — an inline `<head>` script. `next-themes` is that script plus the React provider.
- **`next-themes` in one paragraph.** ~3KB package. `<ThemeProvider>` wraps the app, configures `attribute`, `defaultTheme`, `enableSystem`, `disableTransitionOnChange`, injects the synchronous script. `useTheme()` returns `{ theme, setTheme, resolvedTheme, systemTheme, themes }`. Handles script injection, `localStorage` persistence, `prefers-color-scheme` listener.
- **The canonical setup.** `src/components/providers.tsx` is a `'use client'` wrapper rendering `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>`. `app/layout.tsx` keeps the Server Component default with `<html lang="en" suppressHydrationWarning>` wrapping `<body>` and `<Providers>{children}</Providers>`. `<html>`/`<body>` stay on the server; the provider is the client boundary.
- **`attribute="class"` vs. `attribute="data-theme"`.** `class` (senior default) pairs with `@custom-variant dark (&:where(.dark, .dark *))` from 4.2.5. `data-theme` pairs with the equivalent attribute selector and is the senior reach for multi-theme apps.
- **`defaultTheme` and `enableSystem`.** `defaultTheme="system"` respects OS preference on first visit; `enableSystem` makes `'system'` a valid theme value. Senior defaults.
- **`disableTransitionOnChange`.** Adds temporary `transition: none` during theme switch so `transition-colors` utilities don't animate the swap. Senior default.
- **`suppressHydrationWarning` on `<html>`.** The script mutates `<html>` before React hydrates, creating a class-attribute mismatch. The prop tells React this is expected — non-negotiable on `<html>`, and only there.
- **The `useTheme()` hook.** A `'use client'` component destructures `{ theme, setTheme, resolvedTheme }`, calls `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')` on click. The toggle reads `resolvedTheme` (always `'light'` or `'dark'`), not `theme` (which can be `'system'`).
- **The hydration-safe rendering pattern.** Rendering the current-theme icon at first render produces a hydration mismatch. Fix: mount-gate with a same-size placeholder (a `useState`-tracked `mounted` flag flipped in `useEffect`), or — the senior alternative — a CSS-only icon swap.
- **A CSS-only icon swap.** Render both icons inside the button; let variants pick which is visible (`<SunIcon className="hidden dark:inline" />` next to `<MoonIcon className="inline dark:hidden" />`). No React state read, no mount gate, no hydration mismatch. Senior reflex for simple toggles.
- **The React-19 script-tag warning.** Known dev-only warning when `next-themes` injects its inline `<script>`. Tracked upstream; doesn't affect production. Named so the student doesn't waste time investigating.
- **The `themes` prop for multi-theme apps.** `themes={['light', 'dark', 'blue', 'high-contrast']}` plus `attribute="data-theme"` and per-theme `[data-theme=blue] { ... }` overrides. Rare in SaaS; common in marketing sites.
- **Persistence and storage.** Writes to `localStorage` under `theme` (configurable `storageKey`). Survives reloads.
- **The reading instrument.** DevTools on `<html>` — class or `data-theme` should be present. If absent: script didn't run, provider isn't wrapping, or `attribute` misconfigured. If present but colors don't change: `@custom-variant dark` in `globals.css` is wrong.
- **Watch-outs the lesson names.** `'use client'` on `<Providers>`, not the root layout; `suppressHydrationWarning` non-negotiable on `<html>`; don't render theme-dependent content at first render without a mount gate or CSS-only swap; CSS icon-swap is the senior reach for simple toggles; `disableTransitionOnChange` defaults on; `next-themes` is React-side only (SSR-rendered theme-dependent content needs cookie-based reading); `theme` vs. `resolvedTheme` distinction; test both themes (Chapter 19 visual regression); class belongs on `<html>`, not `<body>` or a wrapper.

What this lesson does not cover:

- The Tailwind-side `@custom-variant dark` and semantic tokens (4.2.5 owns).
- The full root-layout structure and Server-Component defaults (Chapter 4.1.2 owns).
- The `<Providers>` pattern at depth (Chapter 5.2.2 cashes in the Client-Component boundary).
- Server-side theme reading via cookies — out of scope; cited as a watch-out.
- Visual regression testing (Chapter 19, 20.4).
- The `prefers-reduced-motion` and other a11y media queries (Chapter 4.11.2).
- Multi-theme apps beyond light/dark — light treatment via the `themes` and `attribute="data-theme"` props.
- The `useTheme()` hook's full API surface beyond `theme`, `setTheme`, `resolvedTheme` — out of scope.

---

## Lesson 4.2.7 — Quiz

Top ten topics to quiz:

1. Utility-first is a decision — co-locates styling with the JSX, scales when the codebase grows, replaces named-class CSS for component-internal styling. Bespoke CSS still earns its weight for prose content, animations, and global resets. `@apply` is the legacy escape hatch, not the senior default. Long class strings are not a code smell when the alternative is a bespoke class with the same declarations.
2. Tailwind v4 is CSS-first. The 2026 senior reach is `@import "tailwindcss"`, `@theme` for tokens, `@utility` for custom utilities, `@custom-variant` for custom variants, `@container` on JSX for container queries — all in `app/globals.css`. The legacy `tailwind.config.ts` is named for recognition only. Lightning CSS is the engine; OKLCH is the default color space.
3. `@theme` defines design tokens as CSS variables. The namespace (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`) maps deterministically to utility families. `--color-brand: oklch(...)` produces `bg-brand`, `text-brand`, `border-brand` automatically. To strip Tailwind's defaults, set `--color-*: initial`.
4. Variants are prefix-and-colon — `hover:`, `focus-visible:`, `disabled:`, `sm:`, `md:`, `dark:`, `motion-reduce:`. Each compiles to a CSS selector or media query wrapper. Stacking is left-to-right (`md:hover:bg-primary` = "at md and up, when hovered"). Modifiers are postfix `/` for opacity (`bg-primary/80`).
5. Arbitrary values via `[...]` are the escape hatch when the theme scale doesn't fit (`w-[37rem]`, `bg-[#1a1a2e]`, `grid-cols-[200px_1fr_200px]`). Every arbitrary value is a signal — often the right fix is a new theme token. Dynamic class strings (`bg-${color}-500`) don't get emitted because Tailwind reads source files as text.
6. The `cn()` helper — `clsx` then `tailwind-merge` — is the canonical composition primitive. The signature: `cn(...inputs)` returning a deduplicated, conflict-resolved class string. The senior pattern: defaults first, conditional variants next, consumer `className` last (so consumer overrides win). Template-literal class concatenation breaks at the first override; never reach for it on Tailwind classes.
7. State and structural variants — `data-[state=open]:`, `aria-expanded:`, `aria-current:`, `group-hover:`, `peer-invalid:`, `has-[:invalid]`, `*:`, `not-disabled:`, `first:`, `last:`, `odd:`. The senior pattern: read state from the DOM that's already true (Radix's `data-state`, ARIA attributes, browser pseudo-classes), don't mirror it in React state. `useState` and conditional classes are the fallback when the DOM can't tell you.
8. Dark mode is a semantic-token swap, not per-utility `dark:`. The canonical setup: `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`, `@theme` with default light values, `.dark { ... }` with dark overrides. Components write `bg-card text-card-foreground border-border` (one class string, theme-agnostic). The `dark:` per-utility variant earns its weight only for one-off carve-outs.
9. `next-themes` is the React-side wiring. The `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` shape, wrapped in a `<Providers>` client component, mounted under the root layout. The `<html>` carries `suppressHydrationWarning`. The inline script in `<head>` prevents FOUC by setting the class before paint. The `useTheme()` hook returns `{ theme, setTheme, resolvedTheme }`.
10. The hydration-safe `<ThemeToggle>` is either a CSS-only icon swap (`SunIcon className="hidden dark:inline"` + `MoonIcon className="inline dark:hidden"`) or a mount-gated `useTheme()` read with a same-size placeholder during the unmounted phase. The CSS-only form is the senior reach for simple toggles; the React form is for richer logic.

---

## Total chapter time

Roughly 280 to 340 minutes across the six teaching lessons plus the quiz, fitting across three to four evenings: utility-first thinking (50-60 min); Tailwind v4 CSS-first config (45-55 min); the `cn()` helper (40-50 min); state and structural variants (55-65 min); the `dark:` semantic-token model and `next-themes` together (90-110 min) plus the quiz. Chapter 4.3 picks up on the other side with the cascade, inheritance, and the design-token model at depth.
