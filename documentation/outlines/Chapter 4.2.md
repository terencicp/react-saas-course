# Chapter 4.2 — Tailwind as the CSS surface, where it touches React

## Chapter framing

Chapter 4.1 closed with the student writing semantic JSX — the right elements with the right props for the browser, the crawler, and the screen reader. Every element so far has been unstyled. Chapter 4.2 paints them. The senior framing: **Tailwind v4 is the CSS surface a 2026 SaaS UI ships with, and "the CSS surface" lives inside the React component, on the JSX tag, not in a sibling `.css` file.** The student already knows utility-first CSS exists; this chapter installs *why* it earns its weight on a React stack, *what shape* Tailwind v4 takes (CSS-first config, `@theme`, `@utility`, `@container`, `@custom-variant`), *how* to compose classes safely when components accept overrides, and *where* the JSX and the CSS meet — the data-attribute and ARIA variants, the dark-mode wiring through `next-themes`. The chapter does not teach CSS layout, typography, or the cascade — Chapter 4.3 owns the cascade and tokens, Chapter 4.4 owns layout, Chapter 4.5 owns typography and motion. This chapter is the React-Tailwind seam.

The 2026 reality the chapter rests on: Tailwind v4 is CSS-first (no `tailwind.config.js` in the senior default), the engine is Lightning CSS, the color palette is OKLCH, container queries are built-in (`@container`, `@sm/`, `@lg/`), structural variants read JSX-set attributes (`data-[state=open]:`, `aria-expanded:`, `group-has-[...]`), dark mode is a custom variant (`@custom-variant dark (&:where(.dark, .dark *))`) wired to the `.dark` class that `next-themes` puts on `<html>`, and the `cn()` helper (`clsx` + `tailwind-merge`) is the canonical composition primitive every component the student will copy from shadcn already uses. Naive class concatenation breaks at the first override; the helper exists because the conflict resolution is real and frequent.

Threads that must run through every lesson:

- **Utility-first is a decision, not a default.** The chapter opens by naming what utility-first replaces — the named-class CSS file paired with a JSX `className="card-header"` — and the thresholds where it wins: components co-locate their styling with their structure, classes purge to a tiny CSS payload, the design system lives in the theme tokens (`--color-primary`, `--spacing-4`), and the team stops naming things. The senior reach is utility-first by default for component-internal styling; bespoke CSS earns its weight only for animations, complex selectors that variants can't express, and third-party-CSS overrides.
- **Tailwind v4 is CSS-first.** The 2026 senior reach is `@import "tailwindcss"` in `app/globals.css` with `@theme`, `@utility`, `@custom-variant`, and `@container` directives — no `tailwind.config.ts`, no `tailwind.config.js`. The student writes design tokens as CSS variables inside `@theme { --color-brand: oklch(...); }`, and Tailwind generates `bg-brand`, `text-brand`, `border-brand` automatically. The legacy JS config is named once for recognition (the student may still see it on older projects) and never taught as the form to write.
- **The class string is read by both Tailwind and the JSX tree.** Tailwind utilities (`p-4`, `text-sm`, `flex`) describe the element's own state; variants (`hover:`, `focus-visible:`, `dark:`, `data-[state=open]:`, `aria-expanded:`, `group-has-[...]`, `peer-checked:`, `*:`, `has-*:`, `not-*:`) describe *when* the utility applies, often reading from another part of the JSX tree the student authored. The senior reflex: when a component needs a state-driven style change, the first reach is a variant on the existing element, not a `useState` toggling a class. The chapter cashes this in across the `group-*`, `peer-*`, `data-[...]:`, `aria-*:`, `has-*:`, `*:`, `not-*:` surface.
- **Composition is the senior pain point — `cn()` is the answer.** The naive form (`className={\`btn \${className}\`}`) breaks at the first override (the consumer passes `px-8`, the component already has `px-4`, both classes end up on the element, and the cascade picks whichever Tailwind emits last — which the student can't predict). The senior form is `cn('btn', className)` where `cn` runs `clsx` (handles `false`/`null`/`undefined`/objects/arrays) then `tailwind-merge` (last-wins conflict resolution among Tailwind utilities). Every shadcn component, every reusable component the student writes, uses this primitive. Chapter 4.6.3 cashes it in for CVA variants; this chapter installs the helper and the model.
- **State and structural variants are how React UI styles without `useState`.** A disclosure panel's open state is `data-state="open"` on the trigger; Tailwind reads it as `data-[state=open]:rotate-180` on the chevron. A `<details>`'s expanded state styles its children via `open:`. A peer input's `:invalid` state styles its sibling error message via `peer-invalid:`. A parent's hover styles a child via `group-hover:`. The chapter installs the senior reach: read state from the DOM that's already true, don't mirror it in React state, don't toggle classes in handlers.
- **Dark mode is a token swap, not a per-utility opt-in.** The naive form (`bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`) doubles every color utility and rots the moment the design system shifts. The senior form is semantic tokens (`bg-background`, `text-foreground`, `border-border`) defined once in `@theme` with `light-dark()` or per-`@custom-variant` overrides, so the element ships one set of utility classes and the theme decides their values. The chapter installs both forms and names the threshold (the `dark:` variant earns its weight only for one-off cases the design system doesn't cover).
- **`next-themes` is the React-side dark-mode wiring.** The `dark` class on `<html>` is what Tailwind's `@custom-variant dark` reads. The senior reach for setting that class without FOUC, persisting the user's choice, and respecting `prefers-color-scheme` is `next-themes`. The chapter installs the `<ThemeProvider>` shape (in a client `Providers` wrapper, mounted under the root layout), the `useTheme()` hook for the toggle, the `suppressHydrationWarning` on `<html>` that the package requires, the `data-theme` attribute strategy for projects that go beyond light/dark, and the React-19-specific note about the inlined-script warning the package emits.
- **Forward references to where each thread lands again.** The cascade and `@theme` tokens land again in Chapter 4.3 (cascade, inheritance, design tokens). Container queries land again in Chapter 4.5.7. Tailwind's responsive variants land again in Chapter 4.5.6. CVA variants land at Chapter 4.6.3 (polymorphic components). shadcn's copy-paste model lands at Chapter 4.11.1. The accessibility consequences of `prefers-reduced-motion` and color contrast land at Chapter 4.11.2 and Chapter 4.5.5. This chapter is the React-Tailwind seam; the rest of Unit 4 paints on top.

The chapter ships six teaching lessons plus the quiz. The TOC's six-bullet slicing condenses cleanly into the same six teaching beats, with the lesson reordering: open with utility-first thinking and the basic surface (utilities, variants, arbitrary values, modifiers), then Tailwind v4's CSS-first specifics (`@theme`, `@utility`, `@container`), then composition with `cn()` (the helper every later lesson uses), then state and structural variants (the React-Tailwind seam at its sharpest), then the `dark:` variant model, then `next-themes` for the React-side wiring. The quiz closes the chapter.

The chapter ships short JSX+CSS snippets, a heavy dose of exercises (`Buckets` for utility-vs-component decisions, `Matching` for variant prefixes to their state, `CodeReview` for the canonical concat-and-merge bugs, `MultipleChoice` for the senior reflexes, `PredictOutput` for the cascade-order surprises), and several `ReactCoding` blocks where the student writes Tailwind classes and `cn()` composes them. Diagrams carry weight at four sites: a `Figure` rendering Tailwind v4's compile path (`@import "tailwindcss"` + `@theme` source → utility classes available in JSX → Lightning CSS output) in Lesson 4.2.2; an `ArrowDiagram` mapping common JSX-set attributes to the Tailwind variants that read them (`data-state="open"` → `data-[state=open]:`, `aria-pressed="true"` → `aria-pressed:`, etc.) in Lesson 4.2.4; an interactive widget for the `cn()` conflict resolution (the student types two class strings, the widget shows what `tailwind-merge` outputs) in Lesson 4.2.3; and a `DiagramSequence` walking the `next-themes` hydration flow (server render with no class → script runs in `<head>` before paint → class set on `<html>` → React hydrates) in Lesson 4.2.6. The chapter ends with the student writing a themed `<Card>` component that accepts `className` overrides, styles its trigger via `data-state` variants, ships dark-mode-aware semantic tokens, and toggles theme without FOUC.

---

## Lesson 4.2.1 — Utility-first thinking, variants, and arbitrary values

Topics to cover:

- The chapter-opening senior question: the student has a component that needs padding, a background, rounded corners, a border, a hover state, a focus ring, and a different look on a small viewport. Two routes. Route A: an `.scss` file with a `.card` class that bundles every declaration plus a `:hover` and a `@media` rule. Route B: `className="p-4 bg-card border rounded-md hover:bg-card-hover focus-visible:ring-2 sm:p-6"`. Both produce the same DOM. The senior question isn't aesthetic — it's about what scales when the codebase has 200 components and 4 engineers and the design system shifts twice a year. The lesson names the decision and the thresholds.
- **What utility-first replaces.** A short, honest comparison. The traditional flow: name a class (`.card-header`), write declarations in a separate file, hope no one repurposes it, watch the names drift from the visuals over time. The 2026 problem the named-class approach has: components in a React codebase are already named (the component itself is `<CardHeader>`); duplicating that name as a CSS class is naming-twice with no extra information. Utility classes describe what the element *does* visually (`flex`, `gap-2`, `p-4`), which doesn't need a separate name. The senior call: when the visual is component-internal and not reused outside this component, utility classes co-located with the JSX are the right form. When the styling is a global concern (typography for prose content, a third-party CSS override), bespoke CSS earns its weight.
- **The utility class surface.** A short tour of the families the student writes daily, organized by what they describe:
  - **Layout primitives** — `flex`, `grid`, `block`, `inline-block`, `hidden`. (Chapter 4.4 owns the layout model.)
  - **Spacing** — `p-*`, `m-*`, `px-*`, `py-*`, `gap-*`, `space-x-*`, `space-y-*`. The numbers are theme-scale tokens (`p-4` is `1rem` by default).
  - **Sizing** — `w-*`, `h-*`, `size-*`, `min-w-*`, `max-w-*`, `aspect-square`.
  - **Color** — `bg-*`, `text-*`, `border-*`, `ring-*`, `divide-*`, `fill-*`, `stroke-*`. Values come from `@theme`.
  - **Typography** — `text-sm`, `text-base`, `text-lg`, `font-medium`, `tracking-tight`, `leading-relaxed`. (Chapter 4.5 owns typography.)
  - **Border and radius** — `border`, `border-2`, `rounded`, `rounded-md`, `rounded-full`.
  - **Effects** — `shadow`, `shadow-sm`, `opacity-50`, `transition`, `duration-200`.
  - The student doesn't memorize the list — they reach for the prefix and the IDE completes. The senior recognition is the *families* and the *naming convention* (`bg-` for background, `text-` for color, `m-` for margin, `p-` for padding) so any new utility is intuitively named.
- **The theme scale and the senior reach.** Numbers in utility names are not arbitrary — `p-4` means `padding: var(--spacing-4)`, which resolves to `1rem` by default. The point: when the student writes `p-4`, they're picking a theme token, not a magic number. The scale is consistent across spacing utilities — `gap-4`, `space-x-4`, `m-4` all produce `1rem`. The senior reflex: never `p-[17px]` when `p-4` (`1rem` = `16px`) is the same visual; reach for the scale before the arbitrary value. (Chapter 4.3 owns the `@theme` and token model.)
- **Variants — the prefix-and-colon model.** Tailwind utilities accept any number of variant prefixes that constrain *when* the utility applies. The form is `variant:utility` (or `variant1:variant2:utility` stacked). The student writes:
  - **State variants** — `hover:bg-card-hover`, `focus:outline-none`, `focus-visible:ring-2`, `active:scale-95`, `disabled:opacity-50`. The variant maps to a pseudo-class (`:hover`, `:focus`, `:focus-visible`, `:active`, `:disabled`).
  - **Form-state variants** — `checked:bg-primary`, `invalid:border-destructive`, `required:after:content-['*']`.
  - **Responsive variants** — `sm:p-6`, `md:grid-cols-2`, `lg:px-8`. Mobile-first — the bare utility applies at the smallest viewport, the variant adds at the named breakpoint and up. (Chapter 4.5.6 owns the responsive model.)
  - **Dark variant** — `dark:bg-card-dark`. Reads the `.dark` class on a parent (Lessons 4.2.5 and 4.2.6 own the wiring).
  - **Print, motion, contrast variants** — `print:hidden`, `motion-reduce:transition-none`, `contrast-more:border-2`. The accessibility hooks; the senior reach for respecting user preferences.
  - **Stacking** — variants compose left-to-right: `md:hover:bg-card-hover` means "at `md` and up, when hovered." Order matters for readability; the lesson names the convention (breakpoint first, then state).
- **Modifiers — the `/` postfix for opacity and color.** Tailwind v4 carries modifiers on color and ring utilities: `bg-foreground/10` (10% opacity background), `text-primary/80` (80% opacity text), `border-border/50`. The modifier is theme-aware — the `10` is a percentage, not an opacity literal. The senior reach: opacity modifiers for translucent overlays, subtle hover backgrounds, faded borders, without writing `rgba(...)` directly. The 2026 reality: every shadcn component the student copies uses this form for hover overlays and divider lines.
- **Arbitrary values — `[...]` and when they earn their weight.** When the theme scale doesn't have what the student needs, the arbitrary-value form lets them inline a literal: `w-[37rem]`, `bg-[#1a1a2e]`, `grid-cols-[200px_1fr_200px]`, `text-[clamp(1rem,2vw,1.5rem)]`. The form is `utility-[value]`. The senior watch-out: every arbitrary value is a signal that the theme scale doesn't fit, which is often a sign the design isn't using the scale (the senior fix is to add a theme token, not pepper arbitrary values across the codebase). The legitimate uses: one-off positions inside a complex layout, exact pixel values for image masks, `calc()` expressions that depend on a CSS variable, grid-template definitions that don't map to a utility.
- **Arbitrary properties — `[property:value]`.** When no utility exists for the property at all, the bracket form covers it: `[mask-image:linear-gradient(...)]`, `[-webkit-tap-highlight-color:transparent]`. Rarely needed in a 2026 component; named for recognition.
- **CSS variables in arbitrary values.** The student can reference a CSS variable inside brackets: `bg-[--card-overlay]`, `w-[var(--sidebar-width)]`. The use case: a JS-set property that drives a Tailwind utility. The senior reach: set the variable via inline `style={{ '--sidebar-width': '280px' }}` or in CSS, read it through the utility. (The chapter doesn't teach CSS variables in depth — Chapter 4.3 owns them.)
- **Important modifier — `!`.** Tailwind v4 carries `!` as a postfix on the utility to force `!important`: `text-red-500!`. The 2026 reach is rare — `!` exists for third-party-CSS overrides that ship with high specificity. The senior reflex: if `!` shows up in component code, the question is "why isn't the cascade ordering already correct," which usually points at a `cn()` mistake or a CSS reset issue. (Chapter 4.3 owns the cascade.)
- **What utility classes don't do well, and the escape hatches.** Tailwind utilities are atomic — one declaration each, one selector each. Patterns that don't compose cleanly:
  - **Complex selectors** — `:nth-child(odd) > .label:not(.disabled)` — beyond Tailwind's variant surface. The senior reach: a custom variant via `@custom-variant` or a small bespoke CSS rule.
  - **Keyframe animations** — Tailwind ships `animate-spin`, `animate-pulse`, `animate-bounce` from the base scale, and custom keyframes live in `@theme { --animate-...; }` (Chapter 4.5.5 owns animations). Inline `animate-[...]` works for one-offs.
  - **Pseudo-elements at depth** — `::before` and `::after` are supported via the `before:` and `after:` variants, with `content-['']` being the universal first utility. Beyond the basic case, bespoke CSS.
- **The reading instrument — the browser's Elements panel.** When the student inspects a Tailwind-styled element, the DOM shows the literal class string (`class="p-4 bg-card rounded-md"`), and the Computed panel shows the resolved styles. Recognizing utilities from the class list is part of the muscle memory; the senior debugging move is "open Elements, look at the class string, find the unexpected utility."
- **The watch-outs a senior names:**
  - **`@apply` is not the senior default.** The directive lets bespoke CSS reuse Tailwind utilities (`.btn { @apply px-4 py-2 rounded-md; }`); the lesson names it once and refuses to teach it as the form to write. The reason: `@apply` reintroduces named classes, splits styling between the JSX and a `.css` file, and defeats the co-location benefit. The narrow legitimate use: prose content styled by a Markdown renderer where utility classes can't reach the elements. Beyond that, prefer a component or a CVA variant.
  - **Long class strings are not a code smell.** A `<Card>` component with 20 utility classes is fine when the alternative is a bespoke `.card` CSS class that bundles the same declarations and is harder to override. The senior reflex: if the class string is repeated across components, extract a component or a CVA variant; if it's component-internal, leave it inline.
  - **No conditional class strings via template literals.** `className={\`p-4 \${isActive ? 'bg-primary' : 'bg-card'}\`}` works but breaks the moment a consumer passes an override. Lesson 4.2.3 installs the `cn()` form; this lesson names the trap so the student recognizes it.
  - **The IDE matters.** The Tailwind IntelliSense extension (VSCode) and the official LSP make utility autocomplete, hover-resolved-CSS, and class-name typo warnings free. The senior reach: enable the extension in Chapter 1.3 and don't fight the IDE.
  - **Class purging is automatic in v4.** Tailwind reads the source files and emits only the utilities used. The watch-out: dynamic class names that don't appear in source as a literal string never get emitted. `className={\`bg-\${color}-500\`}` produces no CSS — `bg-red-500` is never literally in the source. The senior fix: map to a literal lookup table (`const colors = { red: 'bg-red-500', blue: 'bg-blue-500' }`), or use a CSS variable.

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

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the model (utility-first as a decision; variants as a constraint on *when*; arbitrary values as the escape hatch) and the mechanical surface (the family naming convention, the variant stacking order, the modifier syntax). The deliverable is fluency — the student reads `className="flex items-center gap-2 p-4 bg-card rounded-md hover:bg-card-hover sm:gap-3"` and recognizes every fragment, and writes the same form by reflex.

Open with the senior question — "you need a card with padding, a hover state, and a responsive override; what's the form?" — and a `MultipleChoice` exercise pitting four routes (a `.card` SCSS class — wrong, named-class-without-reuse; a `style={{}}` inline object — wrong, no hover, no media; utility classes with variants — right; CSS-in-JS — wrong, no longer the 2026 default in this stack). The discrimination installs utility-first as the senior reach.

A `Figure` with a hand-authored SVG renders the utility-class anatomy: a class string `hover:bg-card-hover` with arrows pointing at the variant prefix (`hover:`) labeled "when," the utility name (`bg-card-hover`) labeled "what," and an inset showing the generated CSS rule (`.hover\:bg-card-hover:hover { background-color: var(--color-card-hover); }`). The student sees that a variant prefix compiles to a pseudo-class selector wrapping the utility's declaration.

A `Matching` exercise pairs ten variant prefixes with their meaning — `hover:` (`:hover`), `focus-visible:` (`:focus-visible`), `disabled:` (`:disabled`), `checked:` (`:checked`), `invalid:` (`:invalid`), `sm:` (`@media (min-width: 40rem)`), `dark:` (the `.dark` class on a parent), `motion-reduce:` (`@media (prefers-reduced-motion)`), `print:` (`@media print`), `*:` (every direct child). The vocabulary is locked in.

A `Buckets` exercise sorts twelve scenarios into "utility class" vs. "arbitrary value" vs. "bespoke CSS earns its weight" — padding of `1rem` (`p-4`), padding of `17px` (arbitrary, but the senior fix is a theme token), keyframe animation (bespoke CSS via `@theme --animate-...`), hover background (`hover:`), `:nth-child(odd)` styling (custom variant via `@custom-variant`), grid template with three fixed sizes (`grid-cols-[200px_1fr_200px]` arbitrary), responsive 2-column at `md` (`md:grid-cols-2` utility), inline `transform` driven by mouse position (`style` prop), text color from theme (`text-primary` utility), text color from a one-off hex (arbitrary with senior watch-out), focus ring (`focus-visible:ring-2` utility), Markdown content styling (`@apply` legitimate carve-out). The discrimination locks in.

An `AnnotatedCode` block walks a 15-line `<Card>` JSX with the canonical utility patterns — `flex`, `flex-col`, `gap-2`, `p-4`, `bg-card`, `text-card-foreground`, `rounded-md`, `border`, `border-border`, `hover:bg-card-hover`, `focus-within:ring-2`, `focus-within:ring-ring`, `transition-colors`, `sm:p-6`, `dark:border-border-dark` (foreshadowing 4.2.5). Annotations call out each family and each variant; the `dark:` line carries a "we'll do this better in Lesson 4.2.5" note.

A `ReactCoding` block (with React 19 + Tailwind v4 preconfigured) has the student build a notification banner — flex row, gap, padding, a tinted background using a `/` modifier (`bg-info/10`), a colored left border, text styles, an icon-aligned start, and a `sm:` variant that widens padding. The grader checks the class names and the visual through a target-match.

A `PredictOutput` exercise on three class strings:
1. `className="p-4 sm:p-2"` — predict the padding at a 320px viewport (`1rem` — the mobile-first default), then at a 768px viewport (`0.5rem` — `sm:` overrides).
2. `className="bg-red-500/50"` — predict the resolved background (50% opacity red).
3. `className={\`bg-\${color}-500\`}` where `color = 'red'` at runtime — predict whether the CSS is emitted (no — Tailwind can't see the literal in source; the class is absent from the bundle).

The recognition of the breakpoints, the modifier, and the purge trap is concrete.

A `CodeReview` exercise on a 25-line component with six issues:
- A bespoke `.card-header` class for component-internal styling — replace with utilities.
- `style={{ padding: '16px' }}` for static padding — replace with `p-4`.
- `p-[16px]` instead of `p-4` — arbitrary value where the theme scale already covers it.
- A conditional template-literal class — replace with `cn()` (foreshadowing 4.2.3).
- `bg-${color}-500` template-literal with a dynamic value — emit no CSS; fix with a literal lookup.
- `@apply px-4 py-2 rounded-md` for a button's CSS class — replace with a `<Button>` component or CVA variant.

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of five statements: "Utility-first replaces every named CSS class in 2026" (false — Markdown prose, animations, and global resets keep bespoke CSS), "Every Tailwind utility maps to one CSS declaration" (true — atomic), "Arbitrary values are a sign of a theme-scale gap" (true — often), "Stacking variants is order-sensitive for the resulting CSS" (false for most cases — the variants compose into a selector chain), "Tailwind's class purge reads source files as text" (true — dynamic class names never emit). The vocabulary is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for every later Unit 4 lesson and for Chapter 4.11 (shadcn copy-paste).

---

## Lesson 4.2.2 — Tailwind v4 CSS-first config: `@theme`, `@utility`, `@container`

Topics to cover:

- The senior question: the student needs a brand color, a custom spacing scale, a new utility (a centered scroll-snap container), and a container-query-driven layout. In Tailwind v3, all of this lived in `tailwind.config.ts` as JavaScript-typed config. In v4, all of it lives in CSS, inside `app/globals.css`, through four directives: `@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@container`. The lesson installs the CSS-first model and the four directives the 2026 senior writes.
- **The 2026 v4 baseline.** A short orientation: Tailwind v4 ships Lightning CSS under the hood (5× faster full builds, 100× faster incremental), the default color palette is OKLCH (wider gamut, more vivid), `@import "tailwindcss"` replaces the three v3 `@tailwind` directives, container queries are first-class, and the JS config file is optional (and not the senior default). The student writes one CSS file (`app/globals.css`) and imports it once in `app/layout.tsx`. The senior call: pin v4 from project setup, never reach for the legacy JS config without a reason.
- **`@import "tailwindcss"`.** The single import that brings in Preflight (Tailwind's base reset — Chapter 4.3.3 owns it), the utility classes, and the default theme. The senior reflex: this is line 1 of `app/globals.css`. Nothing else needed for utilities to start working.
- **`@theme` — design tokens as CSS variables.** The directive that defines theme tokens. The form:
  ```css
  @theme {
    --color-brand: oklch(0.6 0.2 250);
    --color-brand-foreground: oklch(0.99 0 0);
    --spacing-section: 6rem;
    --radius-card: 0.75rem;
    --font-display: 'Geist', 'system-ui', sans-serif;
  }
  ```
  Every variable becomes a utility automatically — `bg-brand`, `text-brand-foreground`, `p-section`, `rounded-card`, `font-display`. The naming convention is `--{namespace}-{name}`; the namespaces (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`, `--text-*`, `--breakpoint-*`, `--animate-*`) map to utility families. The senior reach: every project-level design token lives in `@theme`; component-level one-offs live inline (arbitrary values).
- **Token reference and naming conventions.** A short, concrete table of which namespace produces which utility family:
  - `--color-*` → `bg-*`, `text-*`, `border-*`, `ring-*`, `divide-*`, `fill-*`, `stroke-*`, `decoration-*`, `outline-*`, `accent-*`, `caret-*`, `placeholder-*`.
  - `--spacing-*` → `p-*`, `m-*`, `gap-*`, `space-x-*`, `space-y-*`, `inset-*`, `top-*`, `right-*`, `bottom-*`, `left-*`, `translate-*`, `w-*`, `h-*`, `size-*`, `min-w-*`, `max-w-*`.
  - `--radius-*` → `rounded-*`.
  - `--font-*` → `font-*` (family).
  - `--text-*` → `text-*` (size + line-height pairs).
  - `--breakpoint-*` → responsive variants (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, plus any custom).
  - `--animate-*` → `animate-*` (Chapter 4.5.5 owns animations).
  The senior recognition: a token name maps deterministically to its utility family.
- **Disabling default tokens — `--color-*: initial`.** When the project wants to ship only its own color palette and not Tailwind's defaults, the override is `--color-*: initial` inside `@theme`. The senior reach: lean projects (a tightly-scoped design system) reset the defaults to keep the IntelliSense list focused on the project tokens.
- **`@utility` — custom utilities defined in CSS.** When a project needs a utility that Tailwind doesn't ship, `@utility` defines it. The form:
  ```css
  @utility scroll-snap-x {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  ```
  The utility is available as `scroll-snap-x` in JSX, and it accepts all the standard variants (`hover:scroll-snap-x`, `sm:scroll-snap-x`). For utilities that take a value, the form uses `--value(...)`:
  ```css
  @utility tab-* {
    tab-size: --value(integer);
  }
  ```
  generating `tab-2`, `tab-4`, etc. The senior reach: `@utility` for cross-cutting patterns the project needs repeatedly that don't map to a single Tailwind utility (a scroll-snap container, a specific gradient mask, a custom focus ring shape). The threshold: if it appears in three or more components, name it.
- **`@custom-variant` — custom variants in CSS.** The directive that defines a new variant (a `variant:` prefix the student can write in JSX). The two common forms:
  ```css
  /* Selector-based — applies the utility when the selector matches */
  @custom-variant pointer-coarse (@media (pointer: coarse));

  /* DOM-state-based — applies when an attribute is set */
  @custom-variant theme-blue (&:where([data-theme=blue], [data-theme=blue] *));
  ```
  The senior reach: `@custom-variant` for project-specific states that Tailwind doesn't cover by default — touch devices, multi-theme apps, intersection-observer-driven states. The dark-mode variant in Lesson 4.2.5 is a `@custom-variant`.
- **`@container` — container queries, first-class in v4.** Container queries style an element based on its *container's* size, not the viewport. Tailwind v4 ships them as first-class:
  - **Marking a container.** `<div className="@container">` (or `@container/sidebar` for a named container).
  - **Querying it.** `@sm:p-6` (padding `1.5rem` when the container is at the `sm` breakpoint and up), `@lg:grid-cols-3` (three columns when the container is at `lg` and up).
  - **Named containers.** `@sm/sidebar:p-6` (the sidebar container is the one that's at `sm` — useful when the element is inside multiple containers).
  - **Max-width queries.** `@max-md:hidden` (hidden when the container is smaller than `md`).
  - The senior reach: container queries replace responsive variants when the layout depends on the *component's* width, not the viewport's. A card that sits in a sidebar at 280px and in a main column at 800px wants `@sm:flex-row` (flex direction based on its own width), not `md:flex-row` (which would depend on the viewport). Chapter 4.5.7 owns container queries at depth; this lesson installs the v4 syntax.
- **`@source` for non-default content paths.** When source files live outside the conventional Tailwind paths (a monorepo with a shared UI package, a content-managed app pulling class strings from a database), `@source` adds the path:
  ```css
  @source "../packages/ui/src/**/*.tsx";
  ```
  The senior reach: monorepos. The 2026 reality: a `packages/ui` shared component library needs its source paths added or its classes never emit.
- **The legacy JS config — named once, never taught as the form to write.** `tailwind.config.ts` still works in v4 via a `@config` directive that imports the JS file. The 2026 senior reach is the CSS-first form; the JS config is named only so the student recognizes it on older projects and on projects that integrate plugins (`@tailwindcss/typography`, `@tailwindcss/forms` — the prose-content and form-element plugins, which still ship as JS-config plugins). The reflex: greenfield projects skip the JS config; the student writes CSS-first.
- **Plugins in v4.** The official plugins (`@tailwindcss/typography`, `@tailwindcss/forms`) still install and load through the JS config or via `@plugin` directive:
  ```css
  @plugin "@tailwindcss/typography";
  ```
  Typography adds the `prose` class for Markdown content (the senior reach for rendering Markdown on a marketing page or a docs surface — the one legitimate carve-out where `prose` reaches into Tailwind utilities through generated rules). Forms adds reset-friendly defaults for form elements. Both are named for recognition; lessons that need them cite them.
- **The compile pipeline.** A short diagram cashed in: `app/globals.css` (with `@import`, `@theme`, `@utility`, `@custom-variant`, `@container`) plus the source files (`app/**/*.tsx`, `src/**/*.tsx`) feed into the Tailwind engine (Lightning CSS), which emits a single CSS file containing only the utilities the source uses. Turbopack handles this transparently in dev and build. The senior recognition: there's no separate build step, no PostCSS config, no `npx tailwindcss` to run.
- **Importing globals in the root layout.** A one-line install: `import './globals.css'` at the top of `app/layout.tsx`. The senior reach: globals.css ships from the scaffold (Chapter 1.4 set this up); the student rarely touches it after first theme setup. Chapter 4.3 cashes in the rest of the globals.css (cascade layers, base-layer overrides).
- **The watch-outs a senior names:**
  - **Tokens not appearing as utilities.** If `--color-brand` doesn't produce `bg-brand`, the namespace is likely wrong (it must be `--color-*`, not `--colors-brand` or `--brand-color`). The IntelliSense doesn't suggest broken names; the senior debugging is "check the namespace prefix."
  - **The default theme still applies unless overridden.** Adding `--color-brand` doesn't remove `bg-red-500`. To restrict the IntelliSense list to project tokens, set `--color-*: initial` first, then add the custom colors.
  - **`@theme` tokens are global CSS variables.** They live on `:root` and apply everywhere. The senior reach: don't redefine them in scoped CSS without a reason — utility resolution depends on the global variable.
  - **`@custom-variant` and the `:where()` wrap.** When defining a state-based custom variant (theme, parent state), wrap the selector in `:where()` to keep specificity at 0. Tailwind utilities have low specificity by design; a non-`:where()` custom variant raises specificity and creates cascade surprises. (Chapter 4.3.1 cashes in specificity.)
  - **Container queries need a `@container` ancestor.** Writing `@sm:p-6` without a parent marked `@container` silently emits nothing useful. The senior reflex: mark the container before reaching for `@sm:`.
  - **Source scanning is text-based.** Class strings constructed at runtime never emit. (Restated from 4.2.1.) The senior reach for dynamic colors is a lookup map of literal strings.
  - **Plugin compatibility.** Some v3 plugins lag the v4 release. The senior reach: stick to official plugins (`typography`, `forms`); reach for community plugins only when the threshold is concrete.

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

Pedagogical approach:

Mechanics-plus-setup archetype. The lesson teaches the four CSS directives (`@import`, `@theme`, `@utility`, `@custom-variant`, plus `@container` on the JSX side) and the v4 model that ties them together. The deliverable is fluency — the student writes `app/globals.css` for a new project (tokens, custom utility, custom variant), wires it into the root layout, and reaches for `@theme` over JS config by reflex.

Open with the senior question — "you need a brand color, a custom spacing token, a custom utility, and a container query; where do they live in 2026?" — and a `MultipleChoice` exercise pitting four routes (`tailwind.config.ts` JS config — wrong, legacy form; inline `style={{}}` per element — wrong, no system; CSS-first `@theme` and `@utility` in `globals.css` — right; bespoke `.css` files per component — wrong, defeats co-location). The discrimination installs the v4 CSS-first model.

A `Figure` with a `DiagramSequence` renders the v4 compile pipeline: step 1, `app/globals.css` with `@import "tailwindcss"` plus `@theme` tokens; step 2, source files (`app/**/*.tsx`) with utility classes scanned; step 3, Lightning CSS engine resolves utilities and tokens; step 4, single emitted CSS file Turbopack ships to the browser; step 5, JSX elements pick up the resolved styles. The student scrubs through and recognizes there's no separate build step.

A `Code` block shows the canonical `app/globals.css` shape for a new project — `@import "tailwindcss"`, an `@theme` block with four token namespaces (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`), a `@custom-variant dark` placeholder (set up in 4.2.5), an `@utility scroll-snap-x` for a project-specific scroll container, an `@plugin "@tailwindcss/typography"` line commented out for recognition. The student sees the layout of a real globals file.

A `Matching` exercise pairs eight `@theme` namespaces with their generated utility families — `--color-*` (`bg-`, `text-`, `border-`, ...), `--spacing-*` (`p-`, `m-`, `gap-`, ...), `--radius-*` (`rounded-`), `--font-*` (`font-` family), `--text-*` (`text-` size), `--breakpoint-*` (responsive variants), `--animate-*` (`animate-`), `--shadow-*` (`shadow-`). The naming convention is locked in.

A `Buckets` exercise sorts ten configuration scenarios into "`@theme`" vs. "`@utility`" vs. "`@custom-variant`" vs. "`@container` on the JSX side" — brand color (`@theme`), a touch-device variant (`@custom-variant`), a scroll-snap container (`@utility`), a card container that queries its own width (`@container` on the JSX), a custom radius scale (`@theme`), a multi-theme blue/green variant (`@custom-variant`), a complex gradient utility (`@utility`), a custom breakpoint at `1440px` (`@theme --breakpoint-3xl`), a project-specific shadow (`@theme --shadow-soft`), a `:nth-child` variant (`@custom-variant`). The discrimination locks in.

An `AnnotatedCode` block walks a 30-line `app/globals.css` for a realistic SaaS project — `@import "tailwindcss"`, an `@theme` block defining six brand colors using OKLCH, three spacing tokens (`--spacing-section`, `--spacing-prose`, `--spacing-toolbar`), a custom radius (`--radius-card`), the `Geist` font tokens (`--font-display`, `--font-mono`), an `@custom-variant dark` (foreshadowing 4.2.5), an `@utility scroll-snap-x` for horizontal scroll containers. Annotations call out each directive, the namespace conventions, the OKLCH advantage over `hsl`, and the foreshadowed dark-mode setup.

A `ReactCoding` block (or a "fill the file" exercise — likely a `Dropdowns` block on a `globals.css` skeleton) has the student complete a new project's `globals.css`: pick the right directive for a brand color, a custom utility, and a custom variant; pick the right namespace prefix; pick whether to disable defaults. The grader checks the directive choices and the namespace correctness.

A `PredictOutput` exercise on three configuration cases:
1. `@theme { --color-primary: oklch(...); }` — predict which utilities become available (`bg-primary`, `text-primary`, `border-primary`, plus every other color-using family).
2. `@theme { --color-*: initial; --color-brand: oklch(...); }` — predict what's available (only `bg-brand`/`text-brand`/etc.; the defaults like `bg-red-500` are removed).
3. `<div className="@sm:p-6">Hello</div>` with no `@container` parent — predict the visible padding (default `p-6` never applies; the container query has no container).

The recognition of the namespace effects and the container-query setup is concrete.

A `CodeReview` exercise on a 30-line `globals.css` with six issues:
- A `--brand-color` token (wrong namespace — should be `--color-brand`).
- A `@custom-variant` without `:where()` wrap (specificity leak).
- An `@apply` chain inside `@layer base` for component styling (should be a component, not bespoke CSS).
- A `--spacing-17` token defined to match an arbitrary value used in one component (the senior fix is the arbitrary value at the call site or a new design-system token, but not a project-level token for a single use).
- A custom breakpoint via JS config (should be `@theme --breakpoint-*` instead).
- A custom utility duplicating an existing Tailwind utility under a different name (the senior fix is to use the existing utility).

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of five statements: "Tailwind v4 requires `tailwind.config.ts`" (false — CSS-first is the default), "`@theme` tokens become CSS variables on `:root`" (true), "Container queries need an `@container` ancestor" (true), "`@import "tailwindcss"` includes Preflight automatically" (true), "Custom variants need JavaScript plugins in v4" (false — they're CSS directives now). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.3 (cascade and tokens), Chapter 4.5.5 (animations), Chapter 4.5.7 (container queries), and every later project's `globals.css`.

---

## Lesson 4.2.3 — Class composition with `cn()` (`clsx` + `tailwind-merge`)

Topics to cover:

- The senior question: the student writes a `<Button>` component that takes a `className` prop so consumers can override styles. The naive implementation does `className={\`btn-base \${className ?? ''}\`}`, and the moment a consumer passes `px-8` to override the component's default `px-4`, both classes end up on the element. Which one wins? Whichever Tailwind emits last in the stylesheet — which the student cannot predict and which can change between builds. The fix is `cn('btn-base', className)` where `cn` calls `clsx` (conditional class composition) then `tailwind-merge` (conflict resolution — last call wins). The lesson installs the helper, the two libraries it wraps, and the senior reflex of "always `cn`, never template-string concat for Tailwind classes."
- **The naive failure shape in one paragraph.** Two classes that set the same property (`px-4` and `px-8`, `bg-primary` and `bg-destructive`, `rounded-md` and `rounded-full`) both end up in the class string. Tailwind doesn't care about the order in the class attribute — it generates rules in a fixed source order. The rule that comes later in the stylesheet wins by CSS cascade. The student sees `px-8` in the class string but the rendered padding is `1rem` (`px-4`) because Tailwind's generated CSS happens to put `px-4` later. The bug is silent, build-dependent, and infuriating.
- **`clsx` in one paragraph.** The `clsx` library is a tiny utility for building class strings from conditionals. It accepts strings, arrays, objects, and any combination, and returns a single space-separated string. Falsy values are dropped. The senior reach for conditional classes:
  ```ts
  clsx('btn', isActive && 'btn-active', { 'btn-disabled': isDisabled })
  // → 'btn btn-active' when isActive=true, isDisabled=false
  ```
  The library is dependency-free, zero-bundle-cost in practice, and the canonical building block. It does *not* know about Tailwind utility conflicts — it just concatenates.
- **`tailwind-merge` in one paragraph.** The `tailwind-merge` library is a Tailwind-aware deduplicator. It knows that `px-4` and `px-8` set the same property and that the later one should win; that `bg-red-500` and `bg-blue-500` conflict; that `text-sm` and `text-lg` conflict; that responsive and state-prefixed utilities (`hover:bg-red-500` and `hover:bg-blue-500`) conflict within the same variant. The senior reach for conflict resolution:
  ```ts
  twMerge('px-4 py-2 px-8')
  // → 'py-2 px-8' — px-4 dropped, px-8 wins
  ```
  The library is configured to understand Tailwind v4's utility surface; the 2026 reach is to pin a version compatible with the installed Tailwind.
- **The `cn()` helper — `clsx` then `tailwind-merge`.** The canonical wrapper, defined once per project at `src/lib/cn.ts`:
  ```ts
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
  ```
  The signature: any number of inputs of the `ClassValue` type (strings, arrays, objects, null, undefined, false), returning a deduplicated, conflict-resolved class string. The order matters — `clsx` first to flatten conditionals into a single string, `tailwind-merge` second to resolve Tailwind conflicts in that string. Every shadcn component the student copies in Chapter 4.11.1 imports this exact helper.
- **The component-with-override pattern — the canonical use site.** A reusable component that accepts `className` to allow consumer overrides:
  ```tsx
  type ButtonProps = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };

  const Button = ({ className, variant = 'primary', ...props }: ButtonProps) => (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
  ```
  The senior pattern: the component's defaults go first, the conditional/variant classes next, the consumer-provided `className` last. Putting `className` last means consumer overrides win (because `twMerge` is last-wins within each conflict group). The student writes every reusable component this way.
- **Conditional class composition — the four forms.** A short reference of how the student passes conditionals to `cn`:
  - **String concatenation via `&&`** — `cn('base', isActive && 'active')` (the canonical form for boolean toggles).
  - **Object form** — `cn('base', { active: isActive, disabled: isDisabled })` (each key is a class, the value is the boolean).
  - **Ternary** — `cn('base', isPrimary ? 'bg-primary' : 'bg-secondary')` (two-branch).
  - **Array form** — `cn('base', ['active', 'rounded'])` (rare; useful when classes come from data).
  The senior reach: pick the form that reads cleanest at the call site. The `&&` form is the most common.
- **CVA — `class-variance-authority` (foreshadowed).** Chapter 4.6.3 owns CVA in depth; the lesson names it once for recognition. When a component has multiple orthogonal variants (a button with `size: 'sm' | 'md' | 'lg'` and `variant: 'primary' | 'ghost' | 'destructive'`), the `cn()` call grows tangled. CVA declares the variant matrix once and returns the resolved class string for given variant props. The `cn()` helper is still used inside CVA (CVA defers conflict resolution to `tailwind-merge`). The 2026 reality: every shadcn component uses CVA + `cn` together.
- **What `tailwind-merge` knows and doesn't know.**
  - **Knows.** Tailwind's utility surface, including variant prefixes (`hover:px-4` conflicts with `hover:px-8` but not with `focus:px-4`), responsive prefixes (`sm:p-4` doesn't conflict with `md:p-4`), and the relationships between shorthand and longhand (`p-4` vs. `px-4` — `px-4` is more specific, both keep their roles).
  - **Doesn't know.** Bespoke CSS classes (`tw-merge` won't deduplicate `my-card-header` and `my-card-body`), arbitrary properties via `@utility` that don't follow Tailwind's conventions, classes from third-party CSS libraries.
  - **The senior watch-out.** Project-specific custom utilities (`scroll-snap-x` from Lesson 4.2.2) work fine because they look like Tailwind utilities; arbitrary brand classes don't. The reflex: if the project has bespoke CSS classes that conflict among themselves, `cn()` won't resolve them — the team needs naming discipline.
- **Where `cn()` lives in the project.** The canonical path: `src/lib/cn.ts`. Imported as `import { cn } from '@/lib/cn'`. The Chapter 1.4 scaffold ships this file; the student rarely changes it. The TypeScript types (`ClassValue` from `clsx`) flow through transparently.
- **Reading the output — DevTools confirmation.** After `cn()`, the class string in the rendered DOM contains only the surviving classes. The student inspecting the element sees `class="inline-flex items-center px-8 py-2 ..."` with `px-4` already gone — the merge happened at render time, the DOM is clean. The senior debugging move: when a class isn't applying, inspect the element first; if the class isn't in the DOM, `cn()` merged it out (probably correctly — find the winning class).
- **The watch-outs a senior names:**
  - **Never template-literal concatenation for Tailwind classes.** `\`btn \${className}\`` is the canonical wrong form; replace with `cn('btn', className)` always.
  - **`className` last in the `cn()` call.** Consumer overrides need to come after the component defaults — `twMerge` is last-wins. Putting `className` first makes the component override the consumer, which is the bug.
  - **Don't `cn()` outside JSX render paths.** `cn()` is fine for class-string composition; it's not for runtime style logic. The senior reach: `cn()` lives in the `className` prop position, not in a `useEffect`.
  - **`cn()` is not free at scale.** A single call costs sub-millisecond; a million calls in a hot list cost real time. For very large lists, memoize the class string per-row via `useMemo` or hoist it out of the component. The 2026 reality: rarely a problem at SaaS scale (the React Compiler — Chapter 4.10.2 — also memoizes for free).
  - **`tailwind-merge` configuration for custom utilities.** When the project ships custom utilities via `@utility` that don't follow Tailwind's conflict rules naturally, `tailwind-merge`'s `extendTailwindMerge` configures the conflict groups. Rare in practice; named for recognition.
  - **The `className` prop is the convention.** Reusable components accept `className`, not `style`, not `class`, not `extraClasses`. Consistency across components lets `cn()` and consumer overrides work uniformly.
  - **Don't reach for `cn` when there are no conditionals or overrides.** A plain `<div className="p-4 bg-card">` doesn't need `cn`. The `cn` call adds cognitive weight; reach for it only when conditionals or overrides exist.
  - **`!important` reaches for `cn` in a specific way.** When a consumer override must beat the component's default with `!`, the consumer writes `px-8!` (the v4 important modifier — Lesson 4.2.1 named it). The `tailwind-merge` does see `!important`-postfixed utilities as the higher-priority form. The senior reach: rarely needed; named for recognition.

What this lesson does not cover:

- CVA — `class-variance-authority` (Chapter 4.6.3).
- The `asChild` + Radix Slot polymorphic pattern (Chapter 4.6.3).
- shadcn/ui's component templates (Chapter 4.11.1).
- The cascade and specificity at depth (Chapter 4.3.1).
- The `!important` modifier at depth (Chapter 4.3.1).
- The `style` prop for dynamic CSS — out of scope; Chapter 4.1.1 introduced it.
- The structural and state variants (4.2.4).
- React 19's `ref` as a prop and forwarding `className` through (Chapter 4.6.4).

Pedagogical approach:

Pattern archetype. The lesson teaches the failure shape of naive concatenation (silent build-dependent override conflicts) and the senior pattern that prevents the bug (`cn` with consumer `className` last). The deliverable is the reflex — every reusable component the student writes uses `cn` with `className` as the trailing argument; every conditional class uses `&&` or the object form inside `cn`; the student never reaches for template-string concatenation.

Open with the senior question — "your `<Button>` component has `px-4`; the consumer passes `px-8`; what reaches the DOM?" — and a `CodeVariants` block showing two implementations side by side. Variant 1: `className={\`px-4 py-2 \${className ?? ''}\`}` — both classes in the string, Tailwind emits both rules, whichever comes later in the stylesheet wins (often, but not deterministically, the component's `px-4`). Variant 2: `className={cn('px-4 py-2', className)}` — `tailwind-merge` deduplicates, `px-8` survives, the DOM is clean. The naming of the bug shape is the lesson opener.

A `Figure` with an interactive widget renders a `cn()` playground: two text inputs (left "component defaults", right "consumer override"), a live output panel showing the resolved class string after `cn()`. The student types `px-4 py-2 bg-primary` and `px-8`, watches the output become `py-2 bg-primary px-8`. They try `bg-primary hover:bg-primary/90` and `bg-destructive`, watch `bg-primary` disappear but `hover:bg-primary/90` survive (different selectors). They try `text-sm` and `text-lg`, watch `text-sm` go. The model becomes concrete.

A `Matching` exercise pairs eight conflicting utility pairs with their winner — `px-4` + `px-8` → `px-8`; `bg-red-500` + `bg-blue-500` → `bg-blue-500`; `text-sm` + `text-lg` → `text-lg`; `rounded-md` + `rounded-full` → `rounded-full`; `hover:bg-red-500` + `hover:bg-blue-500` → `hover:bg-blue-500`; `hover:bg-red-500` + `focus:bg-blue-500` → both survive (different variants); `sm:p-4` + `md:p-6` → both survive (different breakpoints); `bg-red-500` + `bg-red-500/50` → `bg-red-500/50` (last wins, opacity modifier survives). The recognition of what conflicts vs. what doesn't is concrete.

An `AnnotatedCode` block walks the canonical `src/lib/cn.ts` file (the 5-line definition) and a 20-line `<Button>` component that uses `cn` with a variant prop, conditional classes via the object form, and `className` trailing. Annotations call out: the `ClassValue` type from `clsx`, the `twMerge` wrapping, the variant-driven conditional, the `className` position (last), the `...props` spread (forwarding native button props), the `React.ComponentProps<'button'>` type (the React 19 component prop pattern).

A `ReactCoding` block has the student build a `<Badge>` component that accepts `variant: 'success' | 'warning' | 'destructive'` and a `className` override. The grader checks: `cn()` is used, the variant produces different background and text classes, `className` is the trailing argument, the consumer override (`'px-3'` in the test) wins over the component default.

A `CodeReview` exercise on a 25-line component with six issues:
- A template-literal concat (`className={\`btn \${className}\`}` — replace with `cn`).
- `className` positioned first in `cn()` (`cn(className, 'btn-base')` — consumer override won't win; swap).
- A bespoke `.btn` class as the base, then utility overrides (replace with utility-first base).
- A `clsx(...)` call without `tailwind-merge` (`px-4 px-8` both end up in the string — wrap in `twMerge` or use `cn`).
- An `&&` chain with a class that should be unconditional (`isReady && 'block'` when `block` should always apply — drop the conditional).
- `cn()` called inside a `useMemo` for a tiny component (premature optimization — let React Compiler handle it).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three `cn` calls:
1. `cn('px-4 py-2', 'px-8')` — predict the output (`py-2 px-8`).
2. `cn('bg-primary', { 'bg-destructive': hasError })` with `hasError=true` — predict the output (`bg-destructive`).
3. `cn('hover:bg-red-500 hover:px-4', 'hover:bg-blue-500')` — predict the output (`hover:px-4 hover:bg-blue-500` — only the conflicting `hover:bg-*` resolves, `hover:px-4` survives).

The recognition of the merge behavior across variant prefixes is concrete.

Close with a `TrueFalse` round of five statements: "`cn()` is required for every component" (false — only for conditionals/overrides), "`tailwind-merge` resolves conflicts among bespoke CSS classes" (false — Tailwind utilities only), "Putting `className` first in `cn()` lets the component override the consumer" (true mechanically, false strategically — consumers should win), "Template-literal class concatenation is acceptable for static class strings" (true — no conflicts to resolve), "`cn` is a wrapper over `clsx` and `tailwind-merge`" (true). The vocabulary is locked in.

Estimated student time: 40 to 50 minutes. Load-bearing for Chapter 4.6.3 (CVA polymorphic components), Chapter 4.11.1 (shadcn/ui), and every reusable component the student writes for the rest of the course.

---

## Lesson 4.2.4 — State and structural variants: `data-*`, `aria-*`, `group`, `peer`, `has`

Topics to cover:

- The senior question: a disclosure widget needs the chevron to rotate when the panel is open, the error message to turn red when the input is invalid, the parent card to highlight when any child is hovered, and the "submit" button to disable when the form has any invalid input. The naive React reach is `useState` for each, with handlers toggling classes. The senior reach is: read state from the DOM that's already true (the `data-state="open"` attribute Radix sets, the `:invalid` pseudo-class the browser tracks, the `:hover` on a parent or sibling, the `:has(:invalid)` parent selector) and let Tailwind variants paint accordingly. No `useState`, no handlers, no class toggling — just markup and variants. The lesson installs the React-Tailwind seam at its sharpest.
- **The model in one paragraph.** A Tailwind variant is a selector wrapper. `hover:bg-primary` becomes `&:hover { background-color: var(--color-primary) }`. `data-[state=open]:rotate-180` becomes `&[data-state="open"] { transform: rotate(180deg) }`. The variant chooses a selector; the utility provides the declaration. The senior recognition: any state that a CSS selector can read, a Tailwind variant can express. State that the DOM tracks (`:hover`, `:focus`, `:invalid`, `:checked`, `:disabled`), state that JSX sets (`data-*`, `aria-*`), state inferred from descendants or siblings (`has-*`, `*:`, peer/group), and state that's a parent's state (`group-*`).
- **`data-*` attribute variants.** The form: `data-[attr=value]:utility`. The variant compiles to `&[data-attr="value"] { ... }`. The senior use cases:
  - **Radix-style `data-state`.** Radix UI (which shadcn copies from) sets `data-state="open"`, `data-state="closed"`, `data-state="active"`, `data-state="inactive"` on triggers and panels. Tailwind variants read these: `data-[state=open]:rotate-180`, `data-[state=open]:bg-accent`. The 2026 SaaS UI ships with this pattern everywhere — every disclosure, every accordion, every tab, every dropdown.
  - **Project-defined `data-*`.** The student sets `data-loading="true"`, `data-variant="primary"`, `data-error` on JSX elements; variants read them: `data-[loading]:opacity-50`, `data-[variant=primary]:bg-primary`. The form `data-[attr]:utility` (without `=value`) tests for attribute presence regardless of value.
  - **Toggle states.** A theme picker that sets `data-theme="dark"` on `<html>` (4.2.5/4.2.6 own this) lets descendants style via `[data-theme=dark]:bg-background-dark`.
- **`aria-*` attribute variants — the canonical eight.** Tailwind ships built-in variants for the ARIA states a SaaS UI reaches for daily:
  - `aria-expanded:` — `aria-expanded="true"` on disclosure triggers.
  - `aria-pressed:` — `aria-pressed="true"` on toggle buttons.
  - `aria-selected:` — `aria-selected="true"` on selected tabs and list options.
  - `aria-checked:` — `aria-checked="true"` on custom checkboxes.
  - `aria-disabled:` — `aria-disabled="true"` on visually-disabled-but-focusable controls (Chapter 4.1.4 cited).
  - `aria-busy:` — `aria-busy="true"` on loading regions.
  - `aria-current:` — `aria-current="page"` on the active nav link.
  - `aria-invalid:` — `aria-invalid="true"` on form inputs with errors.
  - Each variant accepts a value (`aria-[current=page]:underline`) or tests for truthiness (`aria-pressed:bg-accent`).
  - The senior reach: ARIA attributes serve two purposes simultaneously — assistive tech reads them and Tailwind styles by them. One source of truth.
- **`group-*` — styling based on a parent's state.** A common pattern: hovering a parent card should highlight an icon inside it. The naive approach is a `:hover` rule with a descendant selector — but Tailwind variants don't work on descendants without help. The `group` utility marks the parent; `group-hover:`, `group-focus:`, `group-data-[state=open]:`, etc., let children read the parent's state:
  ```tsx
  <a className="group flex items-center gap-2 rounded-md p-4 hover:bg-accent">
    <span>Settings</span>
    <ChevronRight className="text-muted-foreground transition-transform group-hover:translate-x-1" />
  </a>
  ```
  The senior reach: every interactive surface with internal animations on hover uses `group`. Named groups (`group/item`, `group-hover/item:`) disambiguate when multiple ancestors are marked.
- **`peer-*` — styling based on a sibling's state.** A common pattern: an input's error message styled red when the input is `:invalid`. The `peer` utility marks the sibling input; `peer-invalid:`, `peer-checked:`, `peer-focus:`, `peer-placeholder-shown:`, etc., let later siblings read the marked sibling's state:
  ```tsx
  <input type="email" required className="peer ..." />
  <p className="hidden text-destructive peer-invalid:peer-focus:hidden peer-[&:not(:placeholder-shown):invalid]:block">
    Enter a valid email address.
  </p>
  ```
  The senior reach: form inline errors driven by the browser's native `:invalid` state, no `useState`, no `useEffect`. Chapter 7.3.7 cashes this in with the Constraint Validation API. Peer only reaches *later* siblings — the marked element must come first in source order.
- **`has-*` — styling based on a descendant's state.** The 2026 reach: the CSS `:has()` selector (the parent selector). Tailwind ships `has-[...]:` as the variant. The use cases:
  - A form that highlights when any child input is `:invalid`: `<form className="has-[:invalid]:border-destructive">`.
  - A card that lifts when it contains a checked checkbox: `<label className="has-[:checked]:bg-accent has-[:checked]:ring-2">`.
  - A nav item that's active when its link is `aria-current="page"`: `<li className="has-[a[aria-current=page]]:font-semibold">`.
  - The 2026 senior reach: `has-*` replaces a lot of `useState` mirroring. The element's state is already true in the DOM; `:has()` reads it.
- **`*:` — styling direct children.** A pattern: a list where every direct child should have a top border except the first: `<ul className="divide-y">` (Tailwind's built-in `divide-*` utility) or `<ul className="*:py-2 *:border-t first:*:border-t-0">` (the `*:` variant for direct children, `first:` for the first-child selector). The 2026 reach: `*:` for ad-hoc styling of children when the children aren't components the parent controls.
- **`not-*` — negation.** The form: `not-[state-attribute]:`. The use case: "every element that is not in this state." Example: `<button className="not-disabled:hover:bg-accent">` (hover state only when not disabled). The `not-*` variant works with any other variant — `not-hover:`, `not-data-[state=open]:`, etc.
- **`first:`, `last:`, `odd:`, `even:`, `only:`, `empty:` — positional variants.** A short reference of the structural pseudo-class variants. The senior reach: `first:rounded-t-md last:rounded-b-md` on list items for grouped corners; `odd:bg-muted` for striped rows; `empty:hidden` for collapsing empty containers.
- **`open:` — for `<details>` and `<dialog>`.** When a native `<details>` is expanded, the `open` attribute is present; the `open:` variant reads it: `<details className="..."><summary>...</summary><div className="hidden open:block">...</div></details>`. Rarely used in modern SaaS (Radix Disclosure is the senior reach for richer interactions), but named for recognition.
- **Stacking and combining.** Variants stack: `dark:hover:bg-card-hover-dark`, `md:group-hover:translate-x-1`, `has-[:invalid]:border-destructive has-[:invalid]:bg-destructive/10`. The composition is left-to-right; the senior reach is "constraint outermost" — the breakpoint or theme on the outside, the state on the inside.
- **The senior pattern — read state, don't mirror it.** A short summary:
  - The 2026 reflex: every state-driven style change starts with "can the DOM already tell me this?" If yes, write a variant. If no (the state is genuinely React-only, like a server-fetched value or a derived computation), use `useState` and conditional classes via `cn`.
  - The wrong shape: `const [isOpen, setIsOpen] = useState(false); ... <div className={isOpen ? 'rotate-180' : ''}>`. The DOM already knows the disclosure is open (Radix sets `data-state="open"`); reading it from there is one source of truth.
  - The right shape: `<div className="transition-transform data-[state=open]:rotate-180" data-state={isOpen ? 'open' : 'closed'}>` — or, when Radix manages it, drop the React state entirely and let the Radix primitive set the attribute.
- **The watch-outs a senior names:**
  - **`peer` only reaches later siblings.** Source order matters. If the error message must come before the input in the DOM, restructure with flex `order-*` utilities or restructure the markup.
  - **`has-*` has performance implications at scale.** `:has()` is fast for small subtrees and large numbers of elements at the same depth; deeply-nested or wildly-large trees can pay a cost. The 2026 reality: rarely a problem at SaaS component scale; named for recognition.
  - **ARIA variants and the ARIA values.** `aria-expanded` takes `"true"` or `"false"` (strings), not booleans. JSX accepts `aria-expanded={isOpen}` and React serializes to the string; the variant reads `aria-expanded:` (truthiness) or `aria-[expanded=true]:` (explicit). The senior reflex is the bare form when the boolean maps cleanly.
  - **`data-state` is the Radix convention, not a Tailwind convention.** Radix sets it; Tailwind reads it. Project-specific data attributes work the same way, but `data-state` is the muscle memory because every Radix primitive emits it.
  - **Group/peer names disambiguate at scale.** When a child needs to read one of two ancestor groups, name them: `<div className="group/card">...<div className="group/inner">...<Icon className="group-hover/card:text-primary group-hover/inner:translate-x-1" /></div></div>`. The slash-name form.
  - **`*:` and direct children.** `*:py-2` puts `py-2` on every direct child, regardless of element. Combined with structural utilities, useful but easy to over-apply. The senior reach: use `*:` for ad-hoc lists; reach for a child component when the styling is part of the API.
  - **The browser support floor for `:has()`.** All current browsers support `:has()` in 2026. Named for recognition; no shims needed.
  - **Don't fight the DOM model.** When a UI state genuinely needs React state (a server-fetched flag, a derived value, an animation step counter that isn't pseudo-class-readable), use React state and conditional classes. The senior reach is the right tool for the job, not "always read from the DOM."

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

Pedagogical approach:

Pattern-plus-concept archetype. The lesson installs the model (Tailwind variants are selector wrappers; any DOM-readable state can drive a style change) and the canonical patterns (`data-state`, `aria-*`, `group`, `peer`, `has`). The deliverable is the senior reflex — when a UI needs a state-driven style change, the student asks "can the DOM tell me this?" first, reaches for a variant if yes, and only falls back to React state when the answer is genuinely no.

Open with the senior question — "your accordion's chevron should rotate when open; what does the senior write?" — and a `CodeVariants` block with three approaches. Variant A: `useState` + handler + conditional class via `cn`. Variant B: Radix's `data-state="open"` + `data-[state=open]:rotate-180` variant, no React state at all. Variant C: a CSS-only `<details>` with the `open:` variant. The senior reach is B for richer interactions, C for simple disclosures. The discrimination installs the model.

A `Figure` with an `ArrowDiagram` maps eight JSX-set attributes to the Tailwind variants that read them — `data-state="open"` → `data-[state=open]:`, `aria-expanded="true"` → `aria-expanded:`, `aria-pressed` → `aria-pressed:`, `aria-selected` → `aria-selected:`, `aria-current="page"` → `aria-[current=page]:`, `data-loading` → `data-[loading]:`, `data-variant="primary"` → `data-[variant=primary]:`, the parent `:hover` → `group-hover:` (via `group`). The translation table is visual.

A `TabbedContent` block organizes the seven structural variant families into tabs — `group-*`, `peer-*`, `has-*`, `*:`, `not-*`, `first:/last:/odd:/even:`, `open:`. Each tab has a small JSX example and the use case.

A `Matching` exercise pairs ten state-driven patterns with the right variant — chevron rotates when disclosure open (`data-[state=open]:rotate-180`), button highlighted when pressed (`aria-pressed:bg-accent`), error message visible when input invalid (`peer-invalid:block`), card hover effect on icon (`group-hover:translate-x-1`), form border red when any child input invalid (`has-[:invalid]:border-destructive`), list rows striped (`odd:bg-muted`), first item rounded top (`first:rounded-t-md`), hover only when not disabled (`not-disabled:hover:bg-accent`), nav link bold when current page (`aria-[current=page]:font-semibold`), card lifted when contains checked input (`has-[:checked]:ring-2`). The vocabulary is locked in.

A `Buckets` exercise sorts twelve scenarios into "use a variant (DOM state)" vs. "use React state (`useState`)" — accordion open/closed (variant, `data-state`), server-fetched user-loading flag (React state), form-submit-in-progress (React state, or `aria-busy` set from React state, then variant), hover effect (variant, `:hover`), active nav link (variant, `aria-current`), modal open/closed (variant from Radix, `data-state`), filtering a list by category (React state or URL state), striped table rows (variant, `odd:`), drag-state of a draggable card (React state, mirrored to `data-dragging` for the variant), validation error on an input (variant, `aria-invalid` set from validation result, then variant reads it), tab selection (variant, `aria-selected` from Radix), the user's selected theme preference (React state, persisted, mirrored to `data-theme`). The discrimination locks in.

An `AnnotatedCode` block walks a 25-line disclosure component built with Radix `<Collapsible>` primitives — the `<Trigger>` sets `data-state` automatically, the chevron rotates via `data-[state=open]:rotate-180 transition-transform`, the panel slides down via `data-[state=open]:animate-slide-down`. Annotations call out the absence of `useState`, the `data-state` propagation, the variant-driven animation.

A `ReactCoding` block has the student build a "settings card" — a hoverable card (`group`) with an internal chevron icon that translates on hover, a `data-active` state set from a prop that highlights the card when active, an `aria-current="page"` driven nav item inside it. The grader checks: `group` on the card, `group-hover:translate-x-1` on the chevron, `data-[active]:ring-2` reading the prop-set attribute, `aria-[current=page]:font-semibold` on the nav.

A `CodeReview` exercise on a 30-line component with six issues:
- A disclosure managed with `useState` and conditional `rotate-180` class instead of `data-state` + variant.
- A peer error message *before* the input in source order (peer-invalid won't reach back; reorder or restructure).
- An `aria-pressed` set from React state but no `aria-pressed:bg-accent` variant — the visual doesn't follow the ARIA, accessibility-style mismatch.
- A `has-[:invalid]` on a `<form>` that's never going to have invalid children because the inputs have no `required` attribute (the senior fix is to wire the form validation properly).
- A `group-hover:` on a child without `group` on the parent — silent no-op.
- A `useEffect` that sets a class via DOM mutation when an attribute changes — replace with a variant entirely.

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three patterns:
1. `<a className="group flex"><span className="group-hover:translate-x-1">→</span></a>` with the user hovering the `<a>` — predict (the span translates).
2. `<input className="peer" /><p className="hidden peer-invalid:block">Error</p>` with the input invalid — predict (the `<p>` shows).
3. `<form className="has-[:invalid]:border-destructive"><input required /></form>` with the input empty — predict (the form border turns destructive when the input is `:invalid`).

The recognition of the variant mechanics is concrete.

Close with a `TrueFalse` round of five statements: "Tailwind variants are CSS selector wrappers" (true), "`peer` reaches previous siblings" (false — only later siblings), "`has-*` works in all 2026 browsers" (true), "Every state change in a React UI should go through `useState`" (false — DOM state via variants is the senior default), "`group-hover:` requires `group` on the parent" (true). The vocabulary is locked in.

Estimated student time: 55 to 65 minutes. Load-bearing for Chapter 4.11.1 (shadcn/ui), Chapter 7.3.7 (Constraint Validation API), and every later UI primitive lesson.

---

## Lesson 4.2.5 — The `dark:` variant and the semantic-token model

Topics to cover:

- The senior question: the app needs a light and a dark theme. The naive reach is `dark:` everywhere: `bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800`. Every component doubles its color utilities. The senior reach is semantic tokens — `bg-background`, `text-foreground`, `border-border` — that resolve differently per theme. The component ships one set of utilities; the theme decides their values. The lesson installs the two forms (the inline `dark:` and the semantic token), the threshold between them, and the `@custom-variant dark` wiring on the Tailwind side. Lesson 4.2.6 owns the React-side wiring with `next-themes`.
- **The naive `dark:` form and what it costs.** A short tour of why doubling every color utility doesn't scale:
  - **Maintenance cost.** Every new component re-derives the dark palette. The designer changes the dark gray; the student updates 47 components.
  - **Inconsistency.** Two engineers reach for slightly different darks (`gray-900` here, `slate-900` there); the dark theme drifts.
  - **Class string weight.** Every interactive element carries six to ten extra utilities just for the dark theme.
  - **The `dark:` variant earns its weight only for one-off cases the design system doesn't cover** — a marketing illustration with a specifically-tuned dark variant, a third-party embed with brand colors that flip. For component-internal color choices, semantic tokens are the senior default.
- **Semantic tokens — the shape.** The 2026 senior pattern (the same one shadcn ships):
  ```css
  @theme {
    --color-background: oklch(1 0 0);
    --color-foreground: oklch(0.145 0 0);
    --color-card: oklch(1 0 0);
    --color-card-foreground: oklch(0.145 0 0);
    --color-primary: oklch(0.205 0 0);
    --color-primary-foreground: oklch(0.985 0 0);
    --color-muted: oklch(0.97 0 0);
    --color-muted-foreground: oklch(0.556 0 0);
    --color-border: oklch(0.922 0 0);
    --color-input: oklch(0.922 0 0);
    --color-ring: oklch(0.708 0 0);
    --color-destructive: oklch(0.577 0.245 27.325);
    --color-accent: oklch(0.97 0 0);
    --color-accent-foreground: oklch(0.205 0 0);
  }

  .dark {
    --color-background: oklch(0.145 0 0);
    --color-foreground: oklch(0.985 0 0);
    --color-card: oklch(0.205 0 0);
    --color-card-foreground: oklch(0.985 0 0);
    /* ... */
  }
  ```
  The token names are *semantic* (their job: `background`, `foreground`, `card`, `primary`, `muted`, `border`), not *visual* (`white`, `gray-100`, `slate-900`). The component writes `bg-card text-card-foreground` and ships one class string; the `.dark` override swaps the values. The senior recognition: this is the shadcn token model, the model the whole ecosystem aligns on, the model the student copies and lives with.
- **The `@custom-variant dark` directive.** Tailwind v4 doesn't ship dark mode pre-configured the way v3 did. The student writes:
  ```css
  @custom-variant dark (&:where(.dark, .dark *));
  ```
  in `app/globals.css`. The variant matches when the element has class `.dark` or is a descendant of one. The `:where()` wrap keeps the specificity at 0. With the variant in place, `dark:bg-card-dark` and similar utilities work — but the senior reach is *not* to write `dark:` per utility; the variant exists so the *token override* (the `.dark { ... }` block above) takes effect when the class is on `<html>`.
- **Putting it together — the canonical setup.** A short walkthrough:
  - In `app/globals.css`: `@import "tailwindcss"`, the `@custom-variant dark`, the `@theme` with default (light) tokens, the `.dark { --color-...: ... }` block with the dark overrides.
  - In components: utilities reference the semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`). No `dark:` per utility (except for the rare one-off).
  - On `<html>`: the `dark` class toggles between themes. Lesson 4.2.6 wires this with `next-themes`.
- **Why OKLCH.** A short, honest paragraph. Tailwind v4's default palette ships as OKLCH (perceptually-uniform lightness). The advantage: a `0.1` lightness step looks the same magnitude regardless of hue. The hex/RGB equivalent has uneven perceived steps. The senior reach for new tokens: `oklch(L C H)` with `L` in 0–1, `C` (chroma) 0–0.4-ish, `H` (hue) in degrees. The 2026 reality: shadcn's token palette is OKLCH; the student doesn't need to be a color theorist, but the OKLCH triplets are readable once familiar.
- **The `system` mode and `prefers-color-scheme`.** A user's OS theme preference is readable via the `prefers-color-scheme` media query. Tailwind v4's default behavior — when no `@custom-variant dark` is defined — is to honor `prefers-color-scheme: dark` for the `dark:` variant. With a class-based variant (the senior setup), the system preference is wired by the React side (Lesson 4.2.6 — `next-themes` reads `prefers-color-scheme` and sets the class accordingly when the user picks "system"). The Tailwind side just reads the class.
- **The "one-off `dark:` per utility" carve-out.** When a single component needs a dark-mode adjustment that isn't a theme-wide concern — a specifically-tuned shadow, a one-off gradient that flips in dark, an illustration overlay — the `dark:` variant is the right reach. The senior reflex: 99% of components ship semantic tokens; the 1% that need `dark:` per utility get it inline. Threshold: if the same `dark:` adjustment appears in two components, promote it to a token.
- **Forms `bg-input` and `aria-invalid:bg-destructive/10` — semantic tokens in the wild.** A short, concrete walkthrough of how shadcn's `<Input>` component reads from the token model — `bg-input` (the input background, which differs in dark), `border-input`, `focus-visible:ring-ring`, `aria-invalid:border-destructive aria-invalid:bg-destructive/10` (Lesson 4.2.4's pattern crossing with the token model). The student sees how a single class string carries through every theme variation.
- **The `--radius` and other non-color tokens.** Semantic tokens are not just for colors — the same model applies to radius (`--radius-md`, `--radius-lg`), shadow (`--shadow-card`, `--shadow-dropdown`), and font sizes (rarely themed, but the model holds). The senior reach: any design-system value that might vary by theme, surface, or component tier is a semantic token.
- **Hue-shifted dark themes.** Some dark themes don't just darken — they shift hues (warmer in dark, cooler in light). The token model handles this transparently because the values per-theme are independent. The `--color-primary` in light might be `oklch(0.205 0 0)` (near-black), and in dark `oklch(0.92 0 0)` (near-white); they share a *role* (primary action), not a *visual*.
- **Testing the dark theme.** The senior reach for verifying every component works in both themes: a `<ThemeToggle>` in development that cycles light/dark/system, plus a Storybook or DevTools toggle. The 2026 reality: visual regression testing with Chromatic or Percy on both themes is the team-level discipline; the per-component reach is "toggle and look."
- **The watch-outs a senior names:**
  - **Don't reach for `dark:` per utility as the default.** The maintenance cost compounds. Semantic tokens first.
  - **Don't define the dark palette inline.** Tokens live in `app/globals.css` under the `.dark` selector, not scattered across components.
  - **`:where()` wrap is not optional.** Without it, the `.dark` class raises specificity and creates cascade surprises with utility classes. The Tailwind v4 docs and the shadcn template both wrap; the student copies that form.
  - **`prefers-color-scheme` is the OS preference, not the user's site preference.** The user might want dark on their phone but light on this app. The senior reach: persist the user's choice (Lesson 4.2.6) and let "system" be one of three options, not the only signal.
  - **Color contrast is theme-dependent.** A token combo that passes WCAG AA in light might fail in dark. Test both. (Chapter 4.11.2 owns the discipline.)
  - **Custom themes beyond light/dark.** Some apps ship "blue," "green," and "high-contrast" themes. The model extends — a `@custom-variant blue (&:where([data-theme=blue], [data-theme=blue] *))`, a `[data-theme=blue] { ... }` override block. The `data-theme` attribute strategy on `<html>` scales beyond two themes; the `.dark` class is the simple case.

What this lesson does not cover:

- The React-side theme wiring with `next-themes` (4.2.6).
- The full design-token treatment and CSS custom properties (Chapter 4.3.4).
- The OKLCH color space at depth and color theory (out of scope; cited at Chapter 4.5.2).
- Color contrast testing and the WCAG AA discipline (Chapter 4.11.2).
- Visual regression testing (Chapter 19.4 and Chapter 20.4).
- The `<ThemeToggle>` component implementation — 4.2.6 owns the React side, this lesson is Tailwind side.
- The `prefers-color-scheme` media-query syntax at depth — Chapter 4.5.6 covers media queries.

Pedagogical approach:

Decision-plus-pattern archetype. The lesson installs the threshold (semantic tokens by default; `dark:` per utility only when the token model doesn't fit) and the canonical setup (the `@custom-variant dark`, the `.dark { ... }` token override block, the semantic-token utility usage in components). The deliverable is fluency — the student reads a component's class string and recognizes that `bg-card text-card-foreground` will look right in both themes without modification.

Open with the senior question — "your app needs a dark mode; do you write `dark:bg-gray-900` everywhere or something else?" — and a `MultipleChoice` exercise pitting four routes (per-utility `dark:` everywhere — wrong, maintenance hell; CSS-in-JS theme provider — wrong, this stack doesn't ship CSS-in-JS; semantic tokens with per-theme overrides — right, the shadcn model; runtime style overrides via JavaScript — wrong, no FOUC protection and breaks SSR). The discrimination installs the senior reach.

A `CodeVariants` block compares the two forms on the same component (a card with a header, body, and footer). Variant A: every color utility has a `dark:` counterpart, the class string doubles in length. Variant B: semantic tokens (`bg-card`, `text-card-foreground`, `border-border`), the class string is half the length and theme-agnostic. The student reads both and recognizes the maintenance gradient.

A `Figure` with a hand-authored SVG renders the token-resolution flow: at the top, `<div className="bg-card">`; an arrow to the CSS rule `background-color: var(--color-card)`; two parallel arrows from `var(--color-card)` — one to `:root { --color-card: oklch(1 0 0) }` (light, near-white), one to `.dark { --color-card: oklch(0.205 0 0) }` (dark, near-black); two parallel rendered card previews showing each theme. The model is one picture.

A `Matching` exercise pairs eight semantic tokens with their job — `--color-background` (the page background), `--color-foreground` (the page text color), `--color-card` (card surface), `--color-card-foreground` (card text), `--color-primary` (primary action), `--color-muted` (subdued surface), `--color-muted-foreground` (subdued text), `--color-border` (borders and dividers), `--color-destructive` (errors and dangerous actions), `--color-ring` (focus rings). The semantic vocabulary is locked in.

A `Buckets` exercise sorts twelve color-use scenarios into "semantic token (system-wide concern)" vs. "`dark:` per utility (one-off carve-out)" — page background (semantic), button primary color (semantic), error state (semantic, `destructive`), a marketing hero illustration with a specific-tuned dark variant (`dark:` per utility), an OG image background (out of scope — server-side, no theme), a third-party embed with brand colors that flip in dark (`dark:` per utility), a code block syntax highlight palette (semantic if shared, `dark:` if one-off), focus ring (semantic), a divider line (semantic, `border`), a chart's data colors (depends — likely semantic), a one-off gradient overlay on a marketing page (`dark:`), a tooltip background (semantic). The discrimination locks in.

An `AnnotatedCode` block walks a 35-line `app/globals.css` showing the canonical shadcn-style setup — `@import`, `@custom-variant dark`, `@theme` with the 12 semantic color tokens in light values, the `.dark` block with the same 12 tokens in dark values. Annotations call out: the `:where()` wrap, the semantic naming, the OKLCH form, the symmetry between light and dark blocks.

A `ReactCoding` block (with the globals.css preconfigured) has the student build a small `<NoticeCard>` component using only semantic tokens (`bg-card`, `text-card-foreground`, `border-border`, `text-muted-foreground`), then toggle a `dark` class on a wrapper and verify both themes look right. The grader checks: no `dark:` per utility, semantic tokens only, visible difference between themes.

A `PredictOutput` exercise on three setups:
1. `@theme { --color-card: oklch(1 0 0); } .dark { --color-card: oklch(0.205 0 0); }` plus `<div className="bg-card">` inside a `<html className="dark">` — predict the resolved background (near-black, the dark override).
2. `@theme { --color-card: oklch(1 0 0); }` (no `.dark` override) plus `<div className="bg-card">` inside `<html className="dark">` — predict (still near-white; no override means no swap).
3. `<div className="bg-white dark:bg-gray-900">` inside `<html className="dark">` — predict (near-black, the `dark:` variant resolves).

The recognition of the resolution flow is concrete.

A `CodeReview` exercise on a 30-line component with six issues:
- Per-utility `dark:` on a card that should use semantic tokens (`bg-white dark:bg-gray-900` → `bg-card`).
- A hardcoded `bg-gray-100` for a subdued surface (should be `bg-muted`).
- An `aria-invalid:bg-red-500` inline color (should be `aria-invalid:bg-destructive`).
- A `text-black dark:text-white` for body text (should be `text-foreground`).
- A custom shadow value inline in arbitrary form (should be a `--shadow-card` token or `shadow-sm` from defaults).
- A `.dark` selector inside a `tailwind.config.ts` JS plugin (legacy v3 form — should be `@custom-variant dark` in CSS).

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of five statements: "Per-utility `dark:` is the senior default for theming" (false — semantic tokens are), "Tailwind v4 ships dark-mode wiring pre-configured" (false — the `@custom-variant dark` is opt-in), "The `:where()` wrap keeps specificity at 0" (true), "Semantic tokens are also useful for non-color values" (true — radius, shadow, etc.), "`.dark` on `<html>` overrides every theme token" (true — class-scoped tokens cascade down). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Lesson 4.2.6 (the React-side wiring), Chapter 4.3.4 (custom properties at depth), Chapter 4.11.1 (shadcn token model), and every later component that ships with the design system.

---

## Lesson 4.2.6 — `next-themes`: React-side theme wiring without FOUC

Topics to cover:

- The senior question: the `dark` class on `<html>` is what Tailwind reads (Lesson 4.2.5), but who puts it there? The naive reach is a `useEffect` in a layout that reads `localStorage` and sets the class — which renders the page in the wrong theme first, then flashes to the correct one once React hydrates and the effect runs. The FOUC is the user-visible bug. The senior reach is `next-themes`: a tiny package that injects a synchronous script in `<head>` (before paint), reads the persisted preference and the system preference, sets the class on `<html>` before the page renders, then exposes a React hook for the toggle. The lesson installs the wiring, the `<ThemeProvider>` shape, the `useTheme()` hook, the `suppressHydrationWarning` requirement, the React-19-script-tag warning, and the canonical `<ThemeToggle>` component.
- **The FOUC problem in one paragraph.** Server-side rendering produces an HTML document. The server has no idea what theme the user picked. If the server renders without a class on `<html>`, the user sees the default (light) theme for a moment, then JavaScript loads, hydration runs, the effect reads `localStorage`, the class is set, and the page flashes to dark. The flash is brief but visible — the user notices, and the senior reflex is "stop the flash." The 2026 fix is: set the class *before* the browser paints. That means an inline `<script>` in `<head>` that runs synchronously before the body parses. `next-themes` is that script plus the React provider.
- **`next-themes` in one paragraph.** A small package (~3KB minified) that wraps the theme-class management. The shape:
  - **`<ThemeProvider>`** — wraps the app. Receives configuration props (`attribute`, `defaultTheme`, `enableSystem`, `disableTransitionOnChange`). Injects the synchronous script and provides the theme context.
  - **`useTheme()`** — a hook returning `{ theme, setTheme, resolvedTheme, systemTheme, themes }`. `theme` is the user's choice (`'light'`, `'dark'`, `'system'`); `resolvedTheme` is the actual rendered theme (`'light'` or `'dark'`, with `'system'` resolved); `setTheme` updates it.
  - The package handles the script injection, the `localStorage` persistence, the `prefers-color-scheme` listener for system mode, and the React context that lets components read and update the theme.
- **The canonical setup.** The 2026 wiring across the file tree:
  - **`src/components/providers.tsx`** (a Client Component):
    ```tsx
    'use client';
    import { ThemeProvider } from 'next-themes';

    export const Providers = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    );
    ```
  - **`app/layout.tsx`** (the Server Component root layout from Chapter 4.1.2):
    ```tsx
    import { Providers } from '@/components/providers';

    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="en" suppressHydrationWarning>
          <body>
            <Providers>{children}</Providers>
          </body>
        </html>
      );
    }
    ```
  The senior recognition: the `<html>` and `<body>` stay in the Server Component (Chapter 4.1.2's discipline); the `<ThemeProvider>` lives in a client wrapper because it uses hooks and context.
- **`attribute="class"` vs. `attribute="data-theme"`.** The provider's `attribute` prop controls how the theme is applied to `<html>`:
  - **`class`** (the senior default) — sets `<html class="dark">` or `<html class="light">` (light usually omitted). Pairs with the `@custom-variant dark (&:where(.dark, .dark *))` from Lesson 4.2.5.
  - **`data-theme`** — sets `<html data-theme="dark">`. Pairs with `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`. The senior reach for multi-theme apps (light/dark/blue/green) where the attribute can hold any theme name.
  - The senior call: `class` for light/dark; `data-theme` when the project ships more than two themes.
- **`defaultTheme` and `enableSystem`.** Two configuration knobs:
  - **`defaultTheme="system"`** — the initial theme when the user has no persisted preference. The senior default; respects OS preference.
  - **`enableSystem`** — when true, `'system'` is a valid theme value (read by `useTheme`'s `theme`). When the user picks "system," `resolvedTheme` reflects the OS preference. Senior default: true.
  - Together: the user lands on the app for the first time, the OS is dark, the page renders dark with no flash, the user clicks the toggle, picks "light," the page switches and persists.
- **`disableTransitionOnChange`.** When true, the package adds a temporary `transition: none` rule during the theme switch, so colors don't animate during the swap. Without this, every color utility with a `transition-colors` animates between themes for a moment, which looks janky. Senior default: true.
- **The `suppressHydrationWarning` on `<html>`.** Because the inline script mutates `<html>` before React hydrates, the server-rendered HTML and the post-script DOM differ on the `class` attribute. React's hydration mismatch warning would fire. The `suppressHydrationWarning` on `<html>` (and only on `<html>`) tells React this difference is expected. The senior reflex: this prop is non-negotiable in the root layout when `next-themes` is in use.
- **The `useTheme()` hook in components.** A short walkthrough:
  ```tsx
  'use client';
  import { useTheme } from 'next-themes';

  export const ThemeToggle = () => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  };
  ```
  The hook is client-only (the component carries `'use client'`). The senior reach: the toggle reads `resolvedTheme` (the actual rendered theme), not `theme` (which could be `'system'`).
- **The hydration-safe rendering pattern.** A common pitfall: rendering the current-theme icon at the first render produces a hydration mismatch (server doesn't know the theme, client does). The senior fix is to render a placeholder until the component mounts, then render the icon:
  ```tsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" />; // placeholder of the same size
  ```
  Alternative: use the `useId` + a CSS-only icon swap via `dark:hidden` / `dark:inline` (the icons swap by theme without reading state in React at all).
- **A CSS-only icon swap — the senior reach.** When the toggle just shows a sun in light and a moon in dark:
  ```tsx
  <button type="button" aria-label="Toggle theme" onClick={...}>
    <SunIcon className="hidden dark:inline" />
    <MoonIcon className="inline dark:hidden" />
  </button>
  ```
  No React state read, no mount-gate, no hydration mismatch. The variant does the work. The senior reflex for icon swaps; reach for `resolvedTheme` only when the logic is more complex.
- **The React-19 script-tag warning.** A known 2026 issue: React 19 emits a warning in development when `next-themes` injects its inline `<script>` (the package uses `React.createElement('script', ...)` internally). The script works correctly in SSR and runtime; the warning is dev-only. The senior reach: known issue, tracked upstream, suppressed in some dev consoles, doesn't affect production. Named for recognition so the student doesn't waste time investigating.
- **The `themes` prop for multi-theme apps.** When the project ships beyond light/dark (a `'blue'` theme, a `'high-contrast'` theme), the provider takes `themes={['light', 'dark', 'blue', 'high-contrast']}`. The `attribute="data-theme"` strategy (above) pairs naturally; the CSS-side has `[data-theme=blue] { ... }` token overrides per theme. The senior reach: rare in SaaS, common in marketing sites with brand-toggleable themes.
- **Persistence and storage.** The package writes to `localStorage` under the `theme` key by default; configurable via `storageKey`. The user's choice survives reloads. The senior watch-out: clearing `localStorage` resets to system.
- **The reading instrument — `<html>` in DevTools.** When debugging a theme issue, the senior move is to open DevTools, inspect `<html>`, and check whether `class="dark"` (or `data-theme="dark"`) is present. If it's not, the script didn't run, the provider isn't wrapping correctly, or `attribute` is misconfigured. If it is, but the colors don't change, the `@custom-variant dark` definition in `globals.css` is misconfigured.
- **The watch-outs a senior names:**
  - **`'use client'` on the `<Providers>` wrapper, not on the root layout.** Putting `'use client'` on `app/layout.tsx` defeats the Server-Component default for the whole app. The senior reach is the wrapper pattern.
  - **`suppressHydrationWarning` is non-negotiable.** Without it, React logs a hydration mismatch on every page load. With it, only the `<html>` element gets the exemption; mismatches elsewhere still warn.
  - **Don't render theme-dependent content at first render without a mount gate or a CSS-only swap.** Hydration mismatches are real; the fix is `useEffect` mount-gating or CSS-only icon swap.
  - **The icon-swap CSS pattern is the senior reach for simple toggles.** Reaching for `useTheme()` for the icon is fine but unnecessary when `dark:inline`/`dark:hidden` does the job.
  - **`disableTransitionOnChange` is on by default in the senior setup.** Without it, theme switches animate for a frame, which looks janky.
  - **`next-themes` is React-side only.** Anything server-rendered that depends on the theme (an SSR-rendered chart, a dynamic OG image) doesn't know the theme until the client mounts. The senior reach: server-render in a neutral state, hydrate-update on the client. Or, persist the theme to a cookie and read it server-side (more complex; rarely needed at SaaS scale).
  - **The `theme` vs. `resolvedTheme` distinction.** `theme` can be `'system'`; `resolvedTheme` is always `'light'` or `'dark'`. For decisions ("show the sun or moon icon"), use `resolvedTheme`. For the persistent user choice ("what did they pick"), use `theme`.
  - **Test both themes.** Toggle and look. Visual regression testing (Chapter 19) on both themes is the team-level discipline.
  - **The `<html>` is the canonical target for the class.** Putting the class on `<body>` or a wrapper `<div>` works but breaks expectations (`@custom-variant dark` reads `.dark` from anywhere up the tree; the `:where(.dark, .dark *)` selector handles this, but `<html>` is the discipline-standard).

What this lesson does not cover:

- The Tailwind-side `@custom-variant dark` and semantic tokens (4.2.5 owns).
- The full root-layout structure and Server-Component defaults (Chapter 4.1.2 owns).
- The `<Providers>` pattern at depth (Chapter 5.2.2 cashes in the Client-Component boundary).
- Server-side theme reading via cookies — out of scope; cited as a watch-out.
- Visual regression testing (Chapter 19, 20.4).
- The `prefers-reduced-motion` and other a11y media queries (Chapter 4.11.2).
- Multi-theme apps beyond light/dark — light treatment via the `themes` and `attribute="data-theme"` props.
- The `useTheme()` hook's full API surface beyond `theme`, `setTheme`, `resolvedTheme` — out of scope.

Pedagogical approach:

Setup-plus-pattern archetype. The lesson teaches the wiring (the `<ThemeProvider>` shape, the layout integration, the `suppressHydrationWarning`) and the canonical `<ThemeToggle>` pattern (CSS-only icon swap or mount-gated React state). The deliverable is a working theme toggle in a real project — no FOUC, hydration-safe, persistent, system-aware.

Open with the senior question — "your dark mode flashes light for a moment before switching; what's the fix?" — and a `MultipleChoice` exercise pitting four routes (a `useEffect` reading `localStorage` and setting the class — wrong, flash; a `useState` initialized from `localStorage` — wrong, breaks SSR; an inline script in `<head>` reading the preference before paint — right, this is what `next-themes` does; CSS-only via `prefers-color-scheme` — partial right, doesn't respect user override). The discrimination installs the FOUC problem.

A `Figure` with a `DiagramSequence` walks the `next-themes` hydration flow — step 1, server renders HTML with `<html>` (no class) and `suppressHydrationWarning`; step 2, browser receives HTML, starts parsing; step 3, `<script>` from `next-themes` runs synchronously in `<head>`, reads `localStorage` ('dark') and `prefers-color-scheme`, sets `class="dark"` on `<html>` before paint; step 4, browser paints in dark theme — no flash; step 5, React hydrates, `<ThemeProvider>` initializes context with the resolved theme; step 6, user clicks toggle, `setTheme('light')` runs, class swaps to `light`, page transitions (with `disableTransitionOnChange` preventing color animation). The student scrubs through and recognizes where the flash is prevented.

A `Code` block shows the canonical `<Providers>` wrapper with the four configuration props (`attribute`, `defaultTheme`, `enableSystem`, `disableTransitionOnChange`), and the root-layout integration with `suppressHydrationWarning` on `<html>`.

An `AnnotatedCode` block walks the `<ThemeToggle>` component in two variants. Variant A: the mount-gated `useTheme()` approach with the placeholder div for hydration safety. Variant B: the CSS-only icon-swap approach with `dark:hidden`/`dark:inline`. Annotations call out: the `'use client'` directive, the `resolvedTheme` vs. `theme` distinction (in A), the lack of React state read (in B), the `aria-label` on both, the `type="button"` discipline.

A `Matching` exercise pairs eight `next-themes` props/values with their effect — `attribute="class"` (class on `<html>`), `attribute="data-theme"` (data-attribute on `<html>`), `defaultTheme="system"` (initial = OS preference), `enableSystem` (allow 'system' as a value), `disableTransitionOnChange` (no transition animation during swap), `storageKey="my-theme"` (custom localStorage key), `themes={['light', 'dark', 'blue']}` (multi-theme), `suppressHydrationWarning` on `<html>` (silences the hydration mismatch on the class attribute). The configuration vocabulary is locked in.

A `Buckets` exercise sorts eight scenarios into "use `useTheme()` in React" vs. "use a CSS-only variant swap" — show a different icon for light/dark (CSS-only), persist the user's theme choice (React, `setTheme`), read the current theme to send to an analytics event (React, `theme`), animate the moon-to-sun rotation (CSS-only via `dark:rotate-180`), show a different illustration per theme (CSS-only with two `<img>`s and `dark:hidden`/`dark:inline`), determine which theme to render an SSR-only chart in (server-side, not `next-themes`), let the user pick 'system' explicitly (React, `setTheme('system')`), show "currently in dark mode" text (React, `resolvedTheme`). The discrimination locks in.

A `ReactCoding` block has the student build a full `<ThemeToggle>` component (CSS-only icon swap preferred). The grader checks: `'use client'`, the toggle calls `setTheme`, the icons swap via `dark:hidden`/`dark:inline`, `aria-label="Toggle theme"`, `type="button"`.

A `CodeReview` exercise on a 30-line theme-wiring setup with six issues:
- `'use client'` on `app/layout.tsx` (should be on `<Providers>` only).
- Missing `suppressHydrationWarning` on `<html>` (hydration mismatches will warn).
- The theme icon rendered from `useTheme()` at first render with no mount gate (hydration mismatch).
- A custom theme-loading effect duplicating what `next-themes` does (delete).
- `attribute="data-theme"` for a light/dark-only app (should be `class` for simplicity).
- `defaultTheme="light"` instead of `'system'` (ignores OS preference; should respect it by default).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three setups:
1. The user reloads a page with `localStorage.theme === 'dark'` — predict the rendered theme on first paint (dark, no flash, because the inline script set the class before paint).
2. The user has `prefers-color-scheme: dark`, never picked a theme, `defaultTheme="system"`, `enableSystem` true — predict (`theme === 'system'`, `resolvedTheme === 'dark'`, page renders dark).
3. The user picks light, reloads, clears `localStorage` — predict the rendered theme on the next load (whatever `prefers-color-scheme` says; `defaultTheme="system"` is the fallback).

The recognition of the resolution behavior is concrete.

Close with a `TrueFalse` round of five statements: "`next-themes` requires `'use client'` somewhere in the tree" (true — the provider is client-only), "Putting `suppressHydrationWarning` on every element fixes hydration warnings everywhere" (false — only the `<html>` needs it, and only because the script mutates it; elsewhere, hide the mismatch is wrong), "`resolvedTheme` is `'light'` or `'dark'`, never `'system'`" (true), "The inline script in `<head>` is what prevents FOUC" (true), "A CSS-only icon swap is the senior reach over reading `resolvedTheme` for simple cases" (true). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.11.1 (shadcn's theme-aware components), Chapter 4.12 (the chapter-end project ships a theme toggle), and every later project that ships a `<ThemeToggle>`.

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

Roughly 280 to 340 minutes across the six teaching lessons plus the quiz. The chapter fits across three to four evenings — utility-first thinking in the first sitting (50-60 minutes); Tailwind v4 CSS-first config in a second sitting (45-55 minutes); the `cn()` helper in a third short sitting (40-50 minutes); state and structural variants in a fourth substantial sitting (55-65 minutes); the `dark:` semantic-token model and `next-themes` across a final two-sitting evening (90-110 minutes total) plus the quiz. The student finishes the chapter able to write utility-first class strings by reflex, configure `app/globals.css` with `@theme`/`@utility`/`@custom-variant`/`@import`, compose component classes with `cn()` so consumer overrides win, paint state-driven UI changes via `data-*`/`aria-*`/`group`/`peer`/`has` variants without reaching for `useState`, ship a dark-mode-aware design system using semantic tokens, and wire a FOUC-free theme toggle with `next-themes` — and recognizes each of those moves as a decision the 2026 senior makes deliberately. Chapter 4.3 opens on the other side with the cascade, inheritance, and the design-token model at depth — the CSS-side concerns this chapter installed but did not fully cash in.
