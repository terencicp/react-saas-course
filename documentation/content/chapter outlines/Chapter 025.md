# Chapter 025 — The visual surface: typography, color, motion, responsive

## Chapter framing

Chapter 024 closed with the layout stack — where elements sit and how big they are. Chapter 025 is the visual surface that sits on top: how text reads, how colors render, how the element decorates itself, how it responds to user state, how it moves, and how it adapts across viewports and containers. The senior framing is that the 2026 visual layer is settled — system font stacks plus one or two `next/font` faces with `font-display: swap` baked in; OKLCH as the color space the design tokens live in, with `color-mix()` as the runtime mixer; `border-radius` and `box-shadow` as the only decoration utilities a senior reaches for; `:focus-visible` as the canonical focus reflex and `:has()` as the parent-selector that retired a generation of JavaScript class toggles; Tailwind's `animate-*` plus `tw-animate-css` as the shadcn-compatible animation surface; responsive variants for page-level breakpoints and container queries for component-level adaptation. Every lesson teaches the CSS primitive, names the Tailwind v4 utility that compiles to it, and surfaces the senior reach.

Several threads run through every lesson. Tokens flow from `:root` and recolor on `.dark` (the `next-themes` plumbing was installed in lesson 6 of chapter 022 and the cascade machinery in chapter 023) — typography, color, shadows, and motion all read tokens rather than literal values. `:focus-visible` is the default focus reflex on every interactive element. `prefers-reduced-motion` and `prefers-color-scheme` are first-class media queries, not afterthoughts. Container queries are the component-level reach when a card or sidebar needs to adapt to its parent, not the viewport. Animation lives in CSS (`@keyframes` declared in `@theme`, compiled to `animate-*` utilities), not JavaScript. The chapter avoids the long tail — no calligraphy effects, no font-display deep dives, no historical detours through `@font-face`, no JS animation libraries. The chapter ships seven teaching lessons plus the quiz, in dependency order: typography (lesson 1 of chapter 025), color (lesson 2 of chapter 025), borders and shadows (lesson 3 of chapter 025), pseudo-classes for interaction state (lesson 4 of chapter 025), animation (lesson 5 of chapter 025), media queries and responsive variants (lesson 6 of chapter 025), container queries (lesson 7 of chapter 025). Forward references land in lesson 3 of chapter 026 (CVA variants for component-level styling), lesson 5 of chapter 026 (portals for animated dialogs), chapter 031 (the shadcn surface and the accessibility baseline), lesson 7 of chapter 038 (`next/font` at depth), and chapter 033 (the app-router where responsive layouts ship).

---

## Lesson 1 — Type, scale, and the reading surface

Teaches the system-plus-`next/font` stack, Tailwind's `text-*`/`leading-*`/`tracking-*` scales, `text-balance` and `text-pretty` reflexes, `max-w-prose` reading width, and the `truncate` / `line-clamp-*` / `tabular-nums` utilities the student writes daily.

Topics to cover:

- **The senior question.** A heading rendered in Inter at `text-3xl font-semibold tracking-tight` looks tight; the same heading with `text-balance` reflows so no line is a one-word orphan. The lesson installs the typography surface a senior writes in 2026 — the font stack (system plus one display face via `next/font`), the type scale, line-height and letter-spacing reflexes, and the modern `text-wrap` properties.
- **The font stack — system first, one branded face via `next/font`.** Preflight wires `font-family: ui-sans-serif, system-ui, ...` as the default; the project usually ships one branded font (Inter, Geist, Manrope) loaded through `next/font/google` and exposed as a CSS variable in `@theme`. Variable fonts are the 2026 reach — one file, every weight, no FOUT. `next/font` at depth lives in lesson 7 of chapter 038; this lesson names the surface (declaration, variable, `@theme` binding) and trusts that lesson for the wiring.
- **The Tailwind type scale.** `text-xs` through `text-9xl` is one rem-based scale with paired `font-size` and `line-height` values. The senior writes off the scale; arbitrary values (`text-[17px]`) are a smell. The scale is editable via `@theme` for projects that want a denser or larger type system.
- **`font-weight`, `font-style`, and the variable-font reach.** `font-thin` through `font-black` map to 100–900; variable fonts expose the full range without separate files. Italic is `italic`; underline is `underline` (the inherited text-decoration is named explicitly because the JSX student often expects the link to be unstyled by default after Preflight strips it).
- **`line-height` — Tailwind's paired scale plus the `leading-*` override.** Every `text-*` ships with a sensible default `line-height`; `leading-*` overrides it. The reflex: body text wants `leading-relaxed` or `leading-7`; headings want `leading-tight` or `leading-none`. Long-form prose at `leading-loose` reads slowly on purpose.
- **`letter-spacing` — `tracking-*`.** Tight tracking on large headings (`tracking-tight`, `tracking-tighter`), normal on body, loose tracking on small all-caps eyebrow labels (`tracking-wide`, `tracking-widest`). Negative values exist via bracket form for display type.
- **`text-wrap: balance` and `text-wrap: pretty` — the 2026 reflex.** `text-balance` (Tailwind: `text-balance`) on headings under ten lines balances the line breaks so no orphan word sits alone; `text-pretty` on body paragraphs runs a slower wrapping algorithm that avoids end-of-paragraph orphans. The senior reach: `text-balance` on every `h1`/`h2`/`h3`, `text-pretty` on every long-form paragraph. Firefox shipped `pretty` in 2025; Baseline-newly-available in 2026.
- **Reading width — `max-w-prose` and the 65ch heuristic.** Body text reads best at 60–75 characters per line. `max-w-prose` (= `max-w-[65ch]`) is the senior reflex on any long-form column. Wider columns lose the eye between line ends.
- **Text utilities the student actually writes.** `text-left` / `center` / `right`; `truncate` (one-line ellipsis with overflow-hidden); `line-clamp-*` (multi-line ellipsis, the canonical reach for card descriptions); `whitespace-nowrap` / `pre-wrap`; `break-words` for long URLs and emails; `uppercase` / `lowercase` / `capitalize`; `font-mono` for code and tabular numbers; `tabular-nums` (font-variant-numeric) for aligned digits in tables and stat cards.
- **The Preflight typography reset cashed in.** Preflight removes margins on headings and paragraphs, strips list bullets, and inherits font properties through form elements (cross-reference to lesson 3 of chapter 023). Every typography utility the student writes is on top of that clean slate; no fighting browser defaults.
- **Watch-outs:**
  - `text-base` is the body default; the scale is a system, not a menu — staying on it is the cost of consistency.
  - `font-display: swap` is the default `next/font` ships; FOUT is the price of not blocking render. Variable fonts plus `subset` cut the swap to imperceptible.
  - `truncate` requires `min-w-0` on a flex item (same trap as lesson 3 of chapter 024); without it the text overflows the container.
  - `line-clamp-*` uses `-webkit-line-clamp` under the hood — production-safe in 2026 but cross-browser by convention, not by spec name.
  - Heading semantics live in lesson 3 of chapter 021; this lesson styles them, doesn't choose them.
  - `tabular-nums` is the reflex for numeric tables and dashboards; without it, the digit `1` is narrower than `8` and columns misalign.
  - Don't rely on `text-justify` — produces uneven word spacing on the web; reach for `text-pretty` instead.

What this lesson does not cover:

- `next/font` setup at depth (subsetting, preload, weight axes, `display` strategy) — lesson 7 of chapter 038.
- Heading semantics and the outline (`h1`–`h6` choice, the document outline) — lesson 3 of chapter 021.
- Link styling and `text-decoration` for `<a>` — lesson 4 of chapter 021 owns the element; this lesson covers `underline` as a utility.
- The CSS `font-feature-settings` and OpenType features at depth — recognition only.
- Custom `@font-face` declarations — `next/font` covers the cases; rare-case fallback only.
- Text inputs and form element typography quirks — lesson 5 of chapter 021 and Preflight (lesson 3 of chapter 023).
- Internationalization-driven font stacks (CJK, Arabic) — out of scope; the chapter assumes Latin script.

---

## Lesson 2 — OKLCH, color-mix(), and the alpha syntax

Teaches OKLCH as the token storage form, `color-mix(in oklch, ...)` for runtime mixing, the `bg-blue-500/50` alpha syntax and how it compiles to `color-mix()`, semantic tokens over primitives, `opacity` vs. per-property alpha, and `prefers-color-scheme` vs. the `.dark` class.

Topics to cover:

- **The senior question.** A 2024 design token written as `--brand: #4f46e5` renders the same on every screen but can't be brightened by 8% without a JS-side color library; the 2026 form is `--brand: oklch(0.62 0.22 263)` and a hover state is `color-mix(in oklch, var(--brand), white 8%)`. The lesson installs OKLCH as the color space tokens live in, `color-mix()` as the runtime mixer, the modern alpha syntax, and `prefers-color-scheme` as the dark-mode primitive `next-themes` already wires up.
- **OKLCH — the senior color space in 2026.** Three channels: L (lightness, perceptually uniform 0–1), C (chroma, 0 to ~0.4), H (hue, 0–360). Two reasons it's the default: changing one channel doesn't accidentally drift another (a 10%-lighter blue stays blue, unlike HSL); and OKLCH encodes the P3 wide-gamut colors modern displays can show. Tailwind v4 ships its entire default palette in OKLCH; shadcn does the same. Hex still ships in legacy code; the student reads it but writes OKLCH.
- **`color-mix()` — runtime color mixing.** `color-mix(in oklch, var(--brand), white 10%)` is the 2026 form for hover/active/disabled variants without pre-computing every step. Reach: hover states (`color-mix(in oklch, var(--color), black 8%)`), tinted backgrounds (mix a brand color with the surface token), token-driven semitransparent borders. Tailwind v4 uses `color-mix()` internally for `bg-blue-500/50`-style opacity modifiers — the student is already calling it indirectly.
- **The Tailwind alpha syntax — `bg-blue-500/50` and the `color-mix` translation.** Every color utility takes a `/N` suffix for alpha. The compiled output is `color-mix(in oklab, var(--color-blue-500) 50%, transparent)` — opacity composes correctly even when the base color is a token. Reaches: glass-morphism backdrops, dialog backdrops (`bg-black/50`), translucent borders.
- **The semantic-token palette — `background`, `foreground`, `card`, `muted`, `primary`, `destructive`, etc.** Cross-reference to lesson 5 of chapter 022. Components reference semantic tokens, never primitives — `bg-card text-card-foreground border-border` not `bg-white text-zinc-900`. The lesson cashes in the model installed in chapter 022 with the modern color values it stores.
- **`opacity` vs. alpha — the two roads and when each is right.** `opacity-50` (Tailwind: `opacity-*`) makes the entire element semi-transparent including its children — the right reach for disabled buttons and pending UI states. Per-property alpha (`bg-blue-500/50`) only fades the one declaration — the right reach for a translucent overlay where text inside must stay fully opaque. Watch-out: `opacity` creates a stacking context (cross-reference to lesson 9 of chapter 024).
- **`prefers-color-scheme` and the `dark:` variant cashed in.** `next-themes` toggles `.dark` on `<html>`; Tailwind's `dark:` variant compiles to a class-based selector wrapped in `:where()` (specificity-zero, no fights with utility order). The semantic tokens flip their values inside `.dark` — `--color-card: oklch(0.99 0 0)` light, `oklch(0.18 0 0)` dark. The student writes `bg-card text-foreground` once and both themes work. Reflex: never write `dark:bg-zinc-900` next to `bg-white`; reach for the token instead.
- **`prefers-contrast` and `forced-colors`.** Two media-query variants the student names once: `contrast-more:` for users who set high-contrast mode in OS settings, `forced-colors:` for Windows High Contrast Mode (which replaces every color with a system palette). Most projects don't override defaults; recognition for accessibility audits.
- **WCAG contrast — the chapter 025:1 reflex.** Body text needs chapter 025:1 contrast against its background; large text and UI text need 3:1. Tools: Chrome DevTools' Contrast picker, the Tailwind palette in shadcn is contrast-audited. Cross-reference to lesson 2 of chapter 031 for the discipline-level commitment.
- **The Tailwind color surface.** Default palette in OKLCH; the `@theme` overrides for adding/removing palette steps; arbitrary values (`bg-[oklch(0.6_0.2_180)]`) for one-off design needs; `currentColor` (`bg-current`, `border-current`) as the inherit-the-text-color form (icons cross-reference to lesson 2 of chapter 023).
- **Watch-outs:**
  - Don't ship hex literals in new code; OKLCH is the token storage form. The exception is `transparent` and `currentColor`, which compile to themselves.
  - `opacity` on a parent fades the children (compositing); `bg-color/50` on the parent doesn't. Pick the one that matches the design intent.
  - `color-mix()` interpolation space matters: `in oklch` produces perceptually-even mixes; `in srgb` produces the gray middle every legacy color library shipped. The default for the project is `oklch`.
  - Display P3 colors fall back to the closest sRGB on older monitors — write OKLCH and let the browser map.
  - `prefers-color-scheme` reads the OS preference; the `next-themes` class on `<html>` reads the user's *site* preference. Both matter; `next-themes` resolves the precedence.
  - `bg-transparent` is not `bg-none`; `bg-none` removes background images, not color.

What this lesson does not cover:

- The cascade and how `.dark` swap reaches every descendant — lesson 1 of chapter 023 and lesson 4 of chapter 023 own it.
- `next-themes` wiring at depth — lesson 6 of chapter 022 owns it.
- The full Tailwind color palette and its OKLCH coordinates — reference material, not lesson material.
- Color theory (complementary, analogous, triadic) — not in scope; the design system ships a palette.
- SVG `fill` / `stroke` mechanics at depth — lesson 1 of chapter 031 handles icons.
- Gradients (`bg-gradient-to-*`) — recognition only here; the chapter doesn't dedicate space.
- Print color modes and CMYK — out of scope.

---

## Lesson 3 — Borders, radius, and the elevation scale

Teaches `border` / `border-*` / `divide-*`, the `rounded-*` scale, `outline` vs. `border` for focus rings, `ring-*` as the multi-layer shorthand, the `shadow-*` elevation tiers, `drop-shadow` vs. `box-shadow`, and `backdrop-filter` for glass-morphism headers.

Topics to cover:

- **The senior question.** A card with `rounded-lg border bg-card shadow-sm` reads as one elevation step above its parent; the same card with `shadow-2xl` reads as a floating modal. The lesson installs the three decoration utilities a senior actually reaches for — borders, border-radius, and box-shadow — and treats them as the elevation language of the design system.
- **Borders — `border`, `border-*`, `divide-*`.** Tailwind's bare `border` utility is `1px solid var(--color-border)`; the token comes from `@theme`. Width modifiers (`border-2`, `border-4`); side-specific (`border-t`, `border-x`, `border-s` logical); color overrides (`border-destructive`, `border-input`); style (`border-dashed`, `border-dotted`, rare in production). The `--default-border-color` Preflight uses cross-references to lesson 3 of chapter 023.
- **`border-radius` — the rounding scale.** `rounded`, `rounded-sm` through `rounded-full`; per-corner variants (`rounded-t-lg`, `rounded-bl-md`); logical variants (`rounded-s-lg`, `rounded-e-lg`). The 2026 reflex: a design system picks one or two radius values and reuses them; mixing `rounded-md` cards with `rounded-2xl` cards is a smell. shadcn's `--radius` token is the central knob most projects expose.
- **`outline` vs. `border` — the focus-ring distinction.** `outline` doesn't occupy layout space, so it doesn't shift content when it appears on focus. `border` does. The canonical focus reflex is `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` (cross-reference to lesson 4 of chapter 025 for the pseudo-class). `ring-*` is Tailwind's outline-plus-offset shorthand and is the form most components ship.
- **`ring-*` — the multi-layer outline shorthand.** `ring-2 ring-ring/50 ring-offset-2 ring-offset-background` produces a halo focus ring with a gap from the element. Used heavily in shadcn buttons, inputs, and selects. The advantage over a raw `outline`: composes with rounded corners, supports offset, and the offset color is themable.
- **`box-shadow` — the elevation scale.** `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner`, `shadow-none`. The senior reach is one elevation step per surface tier — base surface (no shadow), card (`shadow-sm`), hover (`shadow-md`), modal/dialog (`shadow-lg`/`shadow-xl`), tooltip (`shadow-md`). Tailwind v4 shadows use OKLCH-based colors with built-in alpha so they tint correctly in dark mode.
- **Shadow color and the colored-glow pattern.** `shadow-blue-500/50` colors the shadow itself — reaches: highlighted active states, brand-tinted hover glows on a feature card. Watch-out: every colored shadow is a brand decision, not a default.
- **`drop-shadow` vs. `box-shadow` — the choice.** `drop-shadow` is a filter that follows the rendered shape, including transparent regions and rounded corners on irregular SVGs. `box-shadow` follows the element's bounding box. Reach `drop-shadow` for icons and irregular shapes; `box-shadow` for everything else. `drop-shadow` creates a stacking context (cross-reference to lesson 9 of chapter 024).
- **`backdrop-filter` and the glass-morphism reach.** `backdrop-blur-*`, `backdrop-saturate-*`, `backdrop-brightness-*` blur and tint the content *behind* a semi-transparent element. Canonical reach: sticky headers with a translucent background (`bg-background/70 backdrop-blur`) so content scrolls under and stays legible. Cost: GPU compositing on every paint — fine for one element, slow for many.
- **Borders on dashed/dotted forms and the rare reaches.** `border-dashed` for empty-state placeholders and drag-drop drop zones; `border-double` and the rest are recognition only. The dashed-empty-state pattern is the only place dashed borders earn their weight in 2026.
- **Watch-outs:**
  - `border` alone defaults to `border-color: currentColor` in raw CSS; Preflight sets it to the theme's `--color-border` so the student doesn't surprise themselves (cross-reference to lesson 3 of chapter 023).
  - `outline` on an element without `:focus-visible` is a visual mistake — the student writes the variant, never the bare `outline`.
  - `rounded-full` on a non-square element makes a pill, not a circle — `aspect-square` plus `rounded-full` is the avatar pattern.
  - `box-shadow` doesn't clip with `overflow: hidden`; the shadow extends beyond.
  - `drop-shadow` is more expensive than `box-shadow` — use it when irregular shapes demand it, not by default.
  - `backdrop-filter` has no effect if the element behind has no contrast to blur; the price is paid regardless.
  - Multi-layer shadows (combining several `box-shadow` values) are how realistic depth is built; Tailwind ships these in the `shadow-*` scale already.
  - `shadow-2xl` on a card is rarely the design — it reads as a modal. Match the shadow to the surface tier.

What this lesson does not cover:

- The focus-visible pseudo-class — lesson 4 of chapter 025 owns it.
- `filter` properties beyond `drop-shadow` and `backdrop-filter` (`blur`, `grayscale`, `sepia`, `hue-rotate`) — recognition only; the chapter doesn't dedicate space.
- `clip-path` and `mask-image` — niche.
- SVG-specific decoration (`stroke-width`, `stroke-dasharray`) — out of scope.
- Material Design elevation theory — not the design system the course ships.
- `outline-offset` interaction with `border-radius` curves — recognition only.

---

## Lesson 4 — Pseudo-classes and the :has() parent selector

Teaches `:focus-visible` as the canonical focus reflex, `:focus-within` for parent-of-focused, the disabled/checked/invalid state pseudo-classes, `:has()` and the JavaScript class toggles it retired, `:not()`, the `::placeholder` / `::selection` pseudo-elements, and the iOS sticky-hover gate.

Topics to cover:

- **The senior question.** Styling a button on hover is `hover:bg-accent`; styling a button on keyboard focus only is `focus-visible:ring-2`; styling a `<form>` differently when any input inside is invalid was a `useState` plus class toggle in 2022, and is `has-[input:invalid]:border-destructive` in 2026. The lesson installs the pseudo-classes a senior reaches for on interactive UI, with `:focus-visible` as the canonical focus reflex and `:has()` as the parent-selector that retired a generation of JavaScript.
- **The interaction pseudo-classes — `:hover`, `:focus`, `:focus-visible`, `:focus-within`, `:active`.** `:hover` for mouse over (no-op on touch); `:focus` for any focus (keyboard or click); `:focus-visible` for keyboard-only focus — the reflex on every button, link, and input; `:focus-within` for the parent of a focused descendant (canonical reach: form rows that highlight when the input inside takes focus); `:active` for "currently being pressed." The 2026 default: `focus-visible:` for the ring, `hover:` for the color shift, `active:` for the pressed state.
- **The state pseudo-classes — `:disabled`, `:checked`, `:invalid`, `:required`, `:read-only`, `:placeholder-shown`.** Form-element states the student reaches for. `disabled:opacity-50 disabled:pointer-events-none` is the canonical disabled-button pattern; `aria-invalid:` and `aria-disabled:` (data/aria variants from lesson 4 of chapter 022) are the form-driven companions when state is set via attribute rather than property.
- **The structural pseudo-classes — `:first-child`, `:last-child`, `:nth-child(N)`, `:empty`.** Rare in 2026 because `gap` plus `divide-*` replaced most uses; `:empty` is occasionally useful for empty-state styling. `:first-of-type` and `:last-of-type` are recognition only.
- **`:has()` — the parent selector that changed CSS.** Selects an element *that contains* a matching descendant. Canonical reaches: `has-[input:invalid]:border-destructive` on a form row, `has-[:checked]:bg-accent` on a label-wrapped checkbox card, `has-[img]:p-0` on a card that has an image (vs. one that doesn't). Replaces a JavaScript class-toggle observer in every one of these cases. Baseline since late 2023; production-safe across all current browsers. Tailwind variant: `has-[<selector>]:` and `group-has-[<selector>]:` for parent-of-group reaches.
- **`:not()` — the negation primitive.** `not-disabled:hover:bg-accent` skips the hover when the button is disabled. Tailwind variant: `not-*:`. Reach: hover states that shouldn't apply to disabled buttons, sibling reset (`:not(:first-child)` for skipping the first element in a stack — though `gap` retired the pattern).
- **The link state pseudo-classes — `:link`, `:visited`.** `:visited` exists but is locked-down for privacy (only `color`, `background-color`, `border-color`, `outline-color`, and a few SVG properties can change). Rare in app UI; common in long-form content.
- **The placeholder pseudo-elements — `::placeholder`, `::selection`, `::file-selector-button`.** `placeholder:text-muted-foreground` is the senior reflex on every text input (sets the placeholder color via the pseudo-element, which doesn't inherit). `::selection` for branded text-selection color; `::file-selector-button` for styling the file picker button.
- **`group-*` and `peer-*` — Tailwind's relational variants cashed in.** Cross-reference to lesson 4 of chapter 022. `group-hover:`, `peer-checked:`, etc. interact with the same pseudo-classes; the lesson treats the variant prefixes as the Tailwind form and the underlying CSS as the model.
- **DevTools — forcing element state.** Chrome's "Toggle element state" in the Styles panel lets the senior pin `:hover`, `:focus`, `:focus-visible`, `:active`, and `:target` without juggling mouse and keyboard. The debugging move when a hover style "doesn't look right."
- **Watch-outs:**
  - `:focus` without `:focus-visible` shows a focus ring on every click — annoying for mouse users. `:focus-visible` is the discipline; the bare `:focus` is the bug.
  - `:hover` does nothing on touch devices (no hover); design hover-only affordances as enhancements, not as the only way to discover an action.
  - `:active` fires on touch *and* hover-press; useful as the pressed-down style.
  - `:has()` can chain (`:has(input:checked):has(label.required)`) but readability falls off; flatten into `data-*` attributes if the chain gets long.
  - `placeholder:` styles the pseudo-element; without it, the placeholder inherits `color` and looks like real text.
  - Disabled controls don't receive `:hover` events in most browsers — combine `disabled:` and `not-disabled:hover:` instead of relying on disabled-hover.
  - `:has()` doesn't work inside `<select>` and a few other elements with shadow DOM; the chapter trusts the form library (Chapter 7) to handle those.

What this lesson does not cover:

- The `data-*` and `aria-*` variants — lesson 4 of chapter 022 owns them; this lesson cross-references.
- Form validation flow (`onSubmit`, `noValidate`, server validation) — Chapter 7.
- The full `::pseudo-element` set (`::before`, `::after` for content insertion, `::marker` for list bullets) — recognition only; the chapter doesn't dedicate space.
- Container query relational state — lesson 7 of chapter 025.
- Accessibility primitives at depth (live regions, ARIA roles) — Chapter 031.
- Drag-and-drop pseudo-states (`:active`, drop targets) — out of scope.
- The `:target` pseudo-class for hash-driven UI — recognition only.

---

## Lesson 5 — Motion: transitions, keyframes, and tw-animate-css

Teaches `transition-*` for property motion (with `transform` and `opacity` as the cheap properties), `animate-*` with `@keyframes` declared in `@theme`, `tw-animate-css` as the shadcn dialog/sheet/accordion dependency, the `data-[state=open]:animate-in` choreography pattern, and `prefers-reduced-motion` with the `motion-reduce:` variant.

Topics to cover:

- **The senior question.** A modal that opens with no animation feels janky; pulling in Framer Motion for one fade-and-scale is overkill. The 2026 form is `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95` — utilities from `tw-animate-css` driving Radix data-state changes through pure CSS. The lesson installs the motion surface: `transition-*` for property-driven motion, `animate-*` plus custom `@keyframes` for entrance/exit choreography, the `tw-animate-css` package shadcn dialog/sheet/accordion depend on, and `prefers-reduced-motion` as the discipline-level guard.
- **`transition-*` — the cheap motion.** `transition` (= `transition-property: all` with sensible defaults), `transition-colors`, `transition-transform`, `transition-opacity`, plus `duration-*`, `ease-*` (`linear`, `in`, `out`, `in-out`), `delay-*`. The 2026 reach: `transition-colors` on buttons, links, and any element whose color shifts on hover; `transition-transform` for scale-on-hover or translate-on-state. Limit `transition-all` to small components where every property is intentional — broad transitions paint extra work on every render.
- **What's cheap to animate — `transform` and `opacity`.** GPU-composited on every modern browser; animate at 60fps without paint cost. Everything else (`width`, `height`, `top`, `left`, `padding`, `margin`, `background-color`, `color`) triggers layout or paint. The senior reflex: translate, scale, fade — never `top`, never `height` if avoidable.
- **`animate-*` — the keyframe-driven motion.** Tailwind v4 keyframes live in `@theme` (`--animate-spin`, `--animate-pulse`, `--animate-ping`, `--animate-bounce` are shipped); custom keyframes go in `@theme` next to them. `animate-spin` on the loading icon, `animate-pulse` on skeleton placeholders, `animate-bounce` on the empty-state arrow. Custom animations: declare `@keyframes` and `--animate-<name>: <duration> <name>` in `@theme`, then write `animate-<name>` in JSX.
- **`tw-animate-css` — the shadcn dependency.** New shadcn projects ship `tw-animate-css` as a dependency for the dialog, sheet, accordion, popover, and dropdown components. It provides `animate-in` / `animate-out` plus modifiers (`fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`, `slide-in-from-top-2`, `slide-in-from-bottom`, etc.) and the duration/easing scale (`duration-200`, `ease-out`). The student installs once, then reads the surface — they don't reimplement it. Replaces the deprecated `tailwindcss-animate`.
- **Data-attribute-driven choreography.** The 2026 pattern for component motion: Radix sets `data-state="open"` or `"closed"` on the wrapper; CSS variants (`data-[state=open]:animate-in data-[state=closed]:animate-out`) target the state and run the right entrance/exit. The motion lives in CSS, the state lives in React. The lesson shows a Dialog example: `fade-in-0 zoom-in-95` on open, `fade-out-0 zoom-out-95` on close, both via data-state variants.
- **The accordion-down/-up keyframes.** Accordion height animations are special — `auto` height can't be animated by spec. shadcn's Accordion uses CSS custom properties Radix sets (`--radix-accordion-content-height`) plus `@keyframes accordion-down` and `accordion-up` in `@theme`. The student copies the pattern; the lesson names what each piece does. `interpolate-size: allow-keywords` (Baseline 2026) is the forward reference for the native fix when shadcn migrates.
- **View Transitions API — the cross-route motion primitive.** Browser-level animation for state changes — `document.startViewTransition(() => setState(...))` snapshots before/after and crossfades. Next.js 16 supports it for page navigations behind a config flag. Out of the deep-dive scope here (recognition only); cashed in at a chapter that owns animated page transitions if the project demands it.
- **`prefers-reduced-motion` — the discipline-level guard.** Users who set "Reduce motion" in OS settings see the matching media query. The senior reflex: every non-essential animation has a `motion-reduce:` variant that either disables or shortens it. shadcn's defaults handle this for the components themselves; the student writes `motion-reduce:transition-none` on bespoke animations. Cross-reference to lesson 2 of chapter 031 as the discipline-level commitment.
- **The transform surface — `translate`, `scale`, `rotate`, `skew`.** Tailwind utilities for the four transforms (`translate-x-*`, `scale-105`, `rotate-12`, `-rotate-3`). `hover:scale-105` is the canonical hover-lift on cards; `active:scale-95` is the pressed-feedback on buttons. `transform-gpu` is the explicit form-hint; the browser usually composites these automatically.
- **Watch-outs:**
  - `transition` without naming the property animates *every* property change — a hover that changes background plus padding will animate the padding too (paint cost). Name the property.
  - `transform` and `filter` create stacking contexts (cross-reference to lesson 9 of chapter 024); a scaled card with a tooltip child portals out or `isolation: isolate`s.
  - `animate-spin` keeps running while off-screen unless paused; for performance-sensitive lists, gate with `content-visibility` or unmount.
  - Animating `height: auto` doesn't work — measure-and-set in JS, or use the Radix custom-property pattern.
  - Long animations feel sluggish; the senior duration band is `150ms` (snappy state changes), `200–300ms` (entrances/exits), `400ms+` (long-form choreography only).
  - `motion-reduce:` doesn't disable *all* motion — essential UI feedback (loading spinners, focus rings) often stays; opt out of decorative motion only.
  - View Transitions API has cross-origin and same-document constraints; verify support before assuming it covers a route.

What this lesson does not cover:

- React-side animation libraries (Framer Motion, React Spring) — out of scope; CSS plus `tw-animate-css` covers the SaaS surface. Brief recognition only.
- Scroll-driven animations and `animation-timeline: scroll()` — niche; recognition only.
- SVG animation (`<animate>`, SMIL) — out of scope.
- View Transitions API at depth — recognition only here; the chapter that owns animated route transitions is a future Unit 5 lesson if the project demands it.
- Lottie and JSON-driven motion — out of scope.
- `IntersectionObserver`-driven scroll reveals — covered in Chapter 7 territory if it earns its weight.
- Page-load animations and FOUC mitigation — lesson 6 of chapter 022 owns the dark-mode FOUC; load-in motion is project-level.

---

## Lesson 6 — Breakpoints and the mobile-first reflex

Teaches mobile-first as the senior default, the Tailwind `sm`/`md`/`lg`/`xl`/`2xl` scale, breakpoints as content-driven not device-driven, the `prefers-*` media-feature family, `@media (hover: hover)` against the iOS sticky-hover bug, and the `hidden md:block` / `md:hidden` visibility pattern.

Topics to cover:

- **The senior question.** A card grid that's three columns desktop, two tablet, one mobile is `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; the Tailwind responsive prefix compiles to a `@media (min-width: 768px)` block. The lesson installs the responsive design model — the media query as the primitive, Tailwind's mobile-first breakpoint scale as the form the student actually writes, and the senior reflexes (mobile-first by default, container queries when the component should respond to its parent instead of the viewport).
- **Mobile-first as the senior default.** Write the base styles for the smallest viewport; layer larger-viewport overrides with `sm:`, `md:`, `lg:`, `xl:`, `2xl:`. The reason isn't preference: mobile devices are the larger share of traffic, browser cost is lower (fewer overrides to discard), and the cascade flows naturally (`min-width` media queries layer cleanly). Desktop-first (`max-md:`) exists for the rare case where the small-screen rules are the override.
- **The Tailwind breakpoint scale.** `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px. Customizable via `@theme` (`--breakpoint-md: 800px`). The 2026 reach: stay on the scale; the design system picks one custom point if the project demands it. The `max-*` cousins (`max-md:`) flip the direction. Ranged variants exist (`@min-md:`, `@max-lg:`) but rare in production.
- **`@media (min-width: ...)` — the underlying primitive.** Recognition: every responsive utility compiles to `@media (min-width: <breakpoint>) { ... }`. The CSS form is what custom Tailwind utilities or third-party CSS would write.
- **Breakpoints are content-driven, not device-driven.** Old advice was "phone, tablet, desktop"; the 2026 form is "where does the layout break." A card grid breaks at the width where two cards fit; the breakpoint is whatever width that is. Tailwind's defaults are a pragmatic starting point, not device categories.
- **The `prefers-*` media features cashed in.** `prefers-color-scheme: dark` (handled by `dark:` and `next-themes` — lesson 6 of chapter 022); `prefers-reduced-motion: reduce` (handled by `motion-reduce:` — lesson 5 of chapter 025); `prefers-contrast: more` (rare, lesson 2 of chapter 025); `forced-colors: active` (Windows HCM, lesson 2 of chapter 025). The lesson collects them as a single family because they're all media queries.
- **`@media (hover: hover)` and `@media (pointer: fine)` — the input-device queries.** `hover:` and `:hover` work everywhere, but a touch-only device fires `:hover` on tap and sticks until the next interaction (the iOS sticky-hover bug). The senior fix wraps hover styling in `@media (hover: hover)` — Tailwind variants `hover:` already do this in v4 by default. `pointer: fine` for mouse-only affordances (small click targets); `pointer: coarse` for touch-only.
- **`orientation: landscape` / `portrait`.** Rare in practice — `min-width` breakpoints capture the same intent more reliably. Recognition only.
- **`@media print`.** The print stylesheet — `print:` variant in Tailwind. Reaches: hiding navigation on print, expanding collapsed content, forcing black text on white background. Most SaaS apps don't ship a print stylesheet; recognition for invoices and reports.
- **The responsive utilities a senior reaches for daily.** `md:flex`, `md:grid-cols-2`, `md:flex-row` (column on mobile, row on desktop), `hidden md:block` (the canonical hide-on-mobile pattern), `md:hidden` (the canonical show-on-mobile-only pattern), `md:text-lg`, `md:p-8`, `md:gap-8` (denser spacing on mobile, looser on desktop). The pattern: change the layout primitive at the breakpoint, then scale the visual values inside.
- **Viewport vs. container queries — the decision.** Media queries answer "how big is the viewport"; container queries answer "how big is this container." A sidebar that goes from collapsed to expanded changes its component's available width without changing the viewport; container queries are the right reach. Page-level structure (mobile nav vs. desktop nav, two-column page vs. one-column) is viewport-driven. The lesson lands the decision; lesson 7 of chapter 025 cashes in container queries.
- **The viewport meta tag.** Cross-reference to lesson 2 of chapter 021 — `<meta name="viewport" content="width=device-width, initial-scale=1">` is what makes mobile-first viewport units behave. Next.js ships it via the metadata API. The student doesn't write it; they recognize it.
- **Watch-outs:**
  - `md:flex` doesn't unset `flex` below the breakpoint — it's `@media (min-width: 768px) { display: flex }`. Combined with `block` base, the element is block on mobile and flex on desktop, not "unset on mobile."
  - Responsive prefixes stack with state prefixes — `md:hover:bg-accent` is valid; order matters in Tailwind v4 (variant order = source order in the compiled CSS).
  - The iOS sticky-hover bug is real on `:hover` without `(hover: hover)` gating — Tailwind's `hover:` handles it; raw CSS doesn't unless the developer wraps it.
  - `prefers-color-scheme` is the OS preference; `.dark` is the site preference. The site preference wins via `next-themes`.
  - `min-width: 640px` doesn't mean "tablet"; it means "640px and up." Don't name breakpoints for devices.
  - `hidden md:block` and `md:hidden` are the legitimate visibility-by-breakpoint pattern; conditional rendering in React is the alternative when the off-screen content should be unmounted (a11y, performance).

What this lesson does not cover:

- Container queries — lesson 7 of chapter 025.
- The viewport meta tag — lesson 2 of chapter 021.
- The `<picture>` element and responsive images — lesson 6 of chapter 021 / Next.js `<Image>` territory.
- Viewport unit details (`vh`, `dvh`, `svh`, `lvh`) — lesson 5 of chapter 024.
- Mobile navigation patterns (drawer, slide-out) — lesson 5 of chapter 032 (the project chapter cashes in).
- Server-side device detection (`User-Agent` sniffing) — out of scope; CSS handles it.
- Adaptive vs. responsive design philosophy — out of scope; the chapter is opinionated on responsive.

---

## Lesson 7 — Container queries for component-level layout

Teaches `container-type: inline-size` as the senior default, `@container` plus the `@sm:` / `@md:` Tailwind variants, the `cqi` unit with `clamp()` for fluid component typography, named containers for nested structures, and the viewport-vs-container decision rule.

Topics to cover:

- **The senior question.** A `<ProductCard>` rendered in the sidebar (200px wide) and in the main feed (600px wide) needs different layouts — but both contexts share the same viewport, so media queries can't tell them apart. The 2026 answer is a container query: `@container (min-width: 400px) { ... }`, or in Tailwind `@container` on the wrapper and `@md:flex-row` on the children. The lesson installs container queries as the component-level form of responsive design, names the `cqi`/`cqb` container units, and lands the decision (viewport queries for page structure, container queries for components).
- **The model — `container-type` and `@container` rules.** A parent declares itself a container (`container-type: inline-size` or `container-type: size`), and descendants query *that container's* size instead of the viewport. Tailwind v4 ships `@container` as the utility that declares `container-type: inline-size`. Descendants use `@sm:`, `@md:`, `@lg:` prefixes (the `@` distinguishes container from viewport queries). Default Tailwind container breakpoints are smaller than viewport breakpoints (`@xs` 320px, `@sm` 384px, `@md` 448px...).
- **`container-type: inline-size` — the senior default.** Queries only the container's inline (width) axis; the container's height stays content-driven. The 99% reach. `container-type: size` queries both axes but the container must have a defined height — rare and footgun-prone. `container-type: normal` removes containment.
- **The canonical pattern — a card that adapts to its slot.** A `<ProductCard>` with `@container` on the root and `@md:flex-row` on the inner layout produces a vertical card in narrow slots and a horizontal card in wide slots — without the parent ever knowing what layout the card chose. Cashes in component reusability across the dashboard / sidebar / feed contexts every SaaS hits.
- **`@container` plus named containers.** `container-name: card` lets a child query a specific ancestor by name — `@container card (min-width: 400px)`. Tailwind: `@container/card` on the parent and `@md/card:flex-row` on the child. Reach: nested containers where a deep child needs to bypass a closer container.
- **Container query units — `cqi`, `cqb`, `cqw`, `cqh`, `cqmin`, `cqmax`.** `1cqi` = 1% of the container's inline size (preferred over `cqw`); `1cqb` = 1% of block size; `cqmin` / `cqmax` for the smaller / larger of the two. Reaches: fluid typography inside a card (`font-size: clamp(1rem, chapter 009cqi, 1.5rem)`), padding that scales with container size, image heights that follow card width. The 2026 reach is `cqi` for almost everything — width drives most component sizing.
- **`@container` and `clamp()` — fluid component typography.** A common 2026 pattern: a card title that scales from 16px in a small card to 24px in a large card, with one rule — `clamp(1rem, chapter 009cqi, 1.5rem)`. No breakpoint, no Tailwind variant, no JavaScript. Cashes in the `clamp()` primitive named in lesson 5 of chapter 024.
- **The viewport-vs-container decision, cashed in.** Page-level layout (mobile nav vs. desktop nav, single-column vs. two-column page shell) → viewport queries via `md:`. Component-level layout (a card that adapts to its slot, a sidebar widget that collapses based on its parent) → container queries via `@md:`. Most modern SaaS UIs use both — the page is viewport-driven, the components inside are container-driven. The lesson lands this as the senior decision rule.
- **`auto-fit` + `minmax` vs. container queries — both solve "responsive without breakpoints."** Cross-reference to lesson 4 of chapter 024. `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]` makes the *container* responsive to the items; `@container` + `@md:flex-row` makes the *items* responsive to the container. Both are 2026 reflexes; the decision is whether the design wants flexible track count or per-item adaptation.
- **Container query browser support and the Baseline status.** Baseline since late 2023; in 2026 it's universally supported with no polyfill story. The senior reaches without checking caniuse.
- **Style queries — recognition only.** `@container style(--theme: dark)` queries a custom property rather than a size. Limited browser support in early 2026; not a senior reach yet.
- **Watch-outs:**
  - Container queries don't work without `container-type` set somewhere up the tree; the most common bug is forgetting `@container` on the parent.
  - `container-type: inline-size` causes the container to establish a new layout context — flex items inside still flex, but the container's height becomes content-driven (no `height: 100%` on the parent flowing through automatically).
  - Container query units don't work *outside* a container; `cqi` falls back to 0 if no ancestor has `container-type`.
  - `@container` is the Tailwind utility name; the underlying property is `container-type`. The chapter uses both forms so the student recognizes either.
  - Nested containers compose — an inner `@container` shadows an outer one for unnamed queries. Name containers when the structure has multiple.
  - Container queries don't query the element they're applied to; they query a parent. The container is always an ancestor.
  - Don't reach for container queries when viewport queries are simpler — the page shell rarely needs them.

What this lesson does not cover:

- Style queries at depth — recognition only.
- The viewport-unit family (`vh`, `dvh`, `svh`, `lvh`) — lesson 5 of chapter 024.
- Media queries — lesson 6 of chapter 025.
- Component composition patterns that benefit from container queries — Chapter 026.
- Responsive images and `<picture>` source matching — out of scope here.
- Container queries for height-driven adaptation — niche; the chapter recommends `inline-size` and trusts the design.
- Component design system practices (variants vs. queries) — Chapter 031 territory.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

- Typography reflexes — the Tailwind type scale, `leading-*` / `tracking-*` defaults, `text-balance` on headings, `text-pretty` on body, `max-w-prose` for reading width, `truncate` and `line-clamp-*` requirements (the `min-w-0` flex companion).
- Color and the modern surface — OKLCH as the storage form, `color-mix(in oklch, ...)` for runtime mixing, the alpha syntax (`bg-blue-500/50`) compiling to `color-mix()`, semantic tokens over primitives, `opacity` vs. per-property alpha (and the stacking-context trigger), `prefers-color-scheme` vs. `.dark`.
- Borders, radius, and shadows — `outline` vs. `border` for focus rings (`outline` doesn't shift layout), `ring-*` as the multi-layer shorthand, the `shadow-*` elevation scale and the surface tiers, `drop-shadow` vs. `box-shadow`, `backdrop-filter` for glass-morphism.
- Pseudo-classes for interaction — `:focus-visible` as the canonical focus reflex (not `:focus`), `:focus-within` for parent-of-focused, `disabled:` plus `aria-disabled:`, the iOS sticky-hover bug and how `hover:` gates it.
- `:has()` — the parent selector, the canonical reaches (`has-[input:invalid]:`, `has-[:checked]:`), where it retires JavaScript class toggles, and the `group-has-[...]:` form.
- Animation — `transition-*` for property motion (cheap properties are `transform` and `opacity`), `animate-*` for keyframes, `tw-animate-css` as the shadcn dependency for dialog/sheet/accordion, the `data-[state=open]:animate-in` pattern, `prefers-reduced-motion` and `motion-reduce:` as the discipline.
- The transform surface — `translate`, `scale`, `rotate`, `skew`, plus the stacking-context trigger on `transform` and `filter` (cross-references to lesson 9 of chapter 024).
- Media queries and breakpoints — mobile-first as the senior default, the Tailwind `sm`/`md`/`lg`/`xl`/`2xl` scale, breakpoints are content-driven not device-driven, `hidden md:block` and `md:hidden` for visibility-by-breakpoint, the `prefers-*` family.
- Container queries — `container-type: inline-size` as the default, `@container` plus `@sm:` / `@md:` Tailwind variants, the `cqi` unit and `clamp()` for fluid component typography, named containers for nested structures, the viewport-vs-container decision.
- The decision lattice — viewport queries for page structure, container queries for component layout, `grid auto-fit minmax` when the design wants flexible track count, and the senior reach for each.
