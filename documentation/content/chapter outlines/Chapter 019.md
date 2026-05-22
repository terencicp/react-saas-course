# Chapter 019 — The cascade, inheritance, and design tokens

## Chapter framing

Chapter 018 showed the *what* of Tailwind's theming surface; Chapter 019 is the *why*. The senior framing: utility classes win on a 2026 stack because the cascade, specificity, and inheritance machinery underneath behaves predictably, and Tailwind v4 makes that machinery explicit by naming it with `@layer`, `@theme`, and Preflight. The chapter owns three load-bearing topics that don't fit anywhere else — the cascade and specificity, CSS inheritance, and CSS custom properties as the substrate Tailwind tokens compile to — plus Preflight as the worked example. Threads that run through every lesson: the cascade is mechanical and predictable (origin and importance → layer → specificity → source order, with layers usually deciding on a Tailwind v4 project); `!important` is a bug smell, not a tool (the senior fix is layers); inheritance flows through the DOM tree, not the JSX tree (typography and color on a parent, box-model per element); Preflight strips browser defaults so utilities are the only source of visual weight; design tokens follow a three-tier model (primitive → semantic → component) and are runtime-reactive bindings, not constants; and the reading instrument is DevTools' Computed panel plus the Cascade Layers indicator.

The chapter ships four teaching lessons plus the quiz, in dependency order: cascade and layers first (lesson 1 of chapter 019), inheritance second (lesson 2 of chapter 019), Preflight third (lesson 3 of chapter 019), custom properties and design tokens fourth (lesson 4 of chapter 019). The material leans heavily on exercises (`Buckets`, `Matching`, `CodeReview`, `PredictOutput`, `MultipleChoice`) and a handful of `ReactCoding` and `HtmlCssCoding` blocks, with four load-bearing diagrams: an SVG of the cascade waterfall, an interactive inheritance widget, a Preflight before/after sequence, and a Figure of the three-tier token model. The chapter ends with the student reading a real bug, tracing it through DevTools to a Preflight rule, and fixing it by writing a layered override — no `!important` reached for.

---

## Lesson 1 — How the browser picks a winning rule

Teaches the four-step cascade algorithm (origin, layer, specificity, source order), Tailwind v4's `theme`/`base`/`components`/`utilities` layers, specificity weights and `:where()`, why `!important` is a smell, and how to trace conflicts in the DevTools Computed panel.

Topics to cover:

- Opens with the bug-trace question: a heading rendering at the wrong size because Preflight and a Tailwind utility both touch `font-size`. Sets up the cascade resolution algorithm as the answer.
- **The cascade resolution algorithm — four steps, in this order:** origin and importance, cascade layer, specificity, source order. Named in the order the browser runs them, not derived. The 2026 reality: on a Tailwind v4 project the bug is almost always the layer step (custom CSS unlayered) or the source-order step (two utility conflicts not run through `cn()`).
- **Tailwind v4's layer model.** The four layers Tailwind emits — `theme`, `base`, `components`, `utilities` — and the declared order. The unlayered-beats-layered surprise (a bare top-level rule beats every layered utility).
- **`@layer base { ... }` and `@layer components { ... }`.** Names when each layer earns its weight: `base` for global element styling (resets, `h2`/`code`/`kbd` baselines), `components` for the rare bespoke-component case utilities can't reach. The senior reflex: every custom CSS rule names its layer.
- **Specificity weights.** The four-part tuple (inline / ID / class-attr-pseudo / element-pseudo-element); `:where()` as the specificity-zero trick (which is how Tailwind v4 wraps the dark-mode selector); `*` is zero. The recognition: within a layer this matters; across layers, layer order decides.
- **`!important` — why it's a smell, and the two legitimate carve-outs.** Tailwind's `!` postfix modifier for overriding third-party inline styles; user-stylesheet accessibility overrides (out of scope for the project). Worked-example pattern: an unlayered `.btn` fighting utilities, fixed by moving into `@layer components`.
- **The source-order trap and `cn()` / `tailwind-merge`.** Cross-reference to lesson 3 of chapter 018. Class-string order doesn't decide a utility conflict; `cn()` resolves the conflict before it reaches the cascade.
- **DevTools — reading the cascade.** The Styles panel (rules in cascade order, overridden declarations struck through), the Computed panel with its trace view, the Cascade Layers indicator (Chrome 99+, Firefox 97+), the `!important` indicator. The three-click debugging move: Computed → trace → which layer → which rule.
- **Watch-outs:** unlayered custom CSS beats utilities (the most common Tailwind bug); `@import` order determines layer declaration order; inline `style={{}}` always wins over class-based rules; `!important` inversion is real but rare; specificity ties go to source order, which `cn()`/`tailwind-merge` make trustworthy.

What this lesson does not cover:

- CSS inheritance and the `inherit`/`initial`/`unset`/`revert` keywords (lesson 2 of chapter 019).
- Preflight's specific reset rules and what gets stripped (lesson 3 of chapter 019).
- CSS custom properties at depth and the design-token model (lesson 4 of chapter 019).
- The `cn()` and `tailwind-merge` composition primitive — installed in lesson 3 of chapter 018, only cross-referenced here.
- The `@custom-variant` and `@utility` directives — installed in lesson 2 of chapter 018.
- The browser layout engine and how the cascade interacts with the box model (Chapter 020).
- CSS-in-JS and styled-components history — out of scope; the course pins Tailwind.

---

## Lesson 2 — What flows down the DOM tree

Teaches CSS inheritance per property family (typography, color, custom properties inherit; box-model, layout, background don't), the `inherit`/`initial`/`unset`/`revert` keywords, form elements as inheritance-rebels, `currentColor` for SVG icons, and the atomic-utility consequence (typography on `<body>`, box-model per element).

Topics to cover:

- Opens with the form-element surprise: `<body className="text-foreground">` styles most descendants but `<button>` ignores it. Names the user-agent override and motivates Preflight (lesson 3 of chapter 019).
- **Inheritance in one line.** A per-property attribute defined in the spec; an element takes the parent's computed value for inheriting properties and the spec-defined initial value otherwise. A property set on `<html>` or `<body>` reaches every descendant unless something overrides it.
- **What inherits, by family.** Typography (`color`, the full `font-*` set, `line-height`, `letter-spacing`, `text-align`, `text-transform`, `white-space`, `direction`), lists (`list-style*`), `cursor`, `visibility`, and CSS custom properties. The senior takeaway: text styles flow from `<body>`, tokens flow from `:root`.
- **What doesn't inherit, by family.** Box-model (`padding`, `margin`, `border`, `width`, `height`, `min/max-*`), layout (`display`, `position`, `top/left/right/bottom`, `z-index`, `flex`, `grid`, `gap`), background (`background-color`, `background-image`), visual effects (`box-shadow`, `opacity`, `transform`, `filter`). The reach: box-model and layout are always per-element — the Tailwind atomic-utility fit.
- **The `inherit` / `initial` / `unset` / `revert` / `revert-layer` keywords.** Named for recognition only. In a 2026 Tailwind codebase the student writes them almost never; the utility-class form (`text-inherit`, `bg-transparent`) covers the cases.
- **Form elements as inheritance-rebels.** `<button>`, `<input>`, `<textarea>`, `<select>` carry user-agent typography and background rules that override body inheritance. Preflight defeats most of it (`font: inherit; color: inherit`); per-element utilities cover the rare browser-specific holdouts.
- **The atomic-utility consequence.** The pattern the chapter installs: typography and color utilities on `<body>` (they inherit); box-model and layout utilities per element (they don't).
- **CSS custom properties inherit.** Cross-reference to lesson 4 of chapter 019. The reason a `.dark { --color-foreground: ... }` swap on `<html>` reaches every descendant.
- **`currentColor`.** The inheritance helper for `border-color`, SVG `fill`, and the canonical icon-color pattern (`fill="currentColor"` on a Lucide / Heroicons icon).
- **DevTools — reading inheritance.** The Computed panel's "from which ancestor" tooltip and the Styles panel's `Inherited from <ancestor>` sections.
- **Inheritance gotchas:** `opacity` is not inherited but visually fades children via compositing; `visibility: hidden` is inherited but reversible by a child; `display: none` removes the element entirely; `em` font-size chains compound (prefer `rem` and the Tailwind `text-*` scale); transparent backgrounds are visual passthrough, not inheritance.

What this lesson does not cover:

- The cascade resolution algorithm and layers (lesson 1 of chapter 019).
- Preflight's specific reset rules (lesson 3 of chapter 019).
- CSS custom properties at depth and the design-token model (lesson 4 of chapter 019).
- Typography utilities (`text-*`, `font-*`, `leading-*`) at depth — lesson 1 of chapter 021 owns typography.
- Color spaces, OKLCH, and color theory — lesson 2 of chapter 021 owns color.
- SVG icon component patterns — lesson 1 of chapter 027 cashes in shadcn's icon usage with `currentColor`.
- The CSS box model — lesson 1 of chapter 020 owns it.

---

## Lesson 3 — Preflight, the deliberately blank canvas

Teaches what Preflight strips (heading sizes, list bullets, link underlines, form-element typography, default margins, `box-sizing`), where it lives in `@layer base`, the two legitimate carve-outs (`@tailwindcss/typography` with `prose` for Markdown, scoped overrides for third-party widgets), and why senior devs never strip it globally.

Topics to cover:

- Opens with the "Tailwind broke my HTML" question: bare `<h1>` looks like body text, `<ul>` has no bullets, `<button>` looks like text. Names Preflight as the deliberate base-layer reset, not a bug.
- **Preflight in one line.** A small set of CSS rules Tailwind v4 ships in `@layer base` via `@import "tailwindcss"`. Normalizes browser defaults so visual weight comes from utilities only.
- **What Preflight strips — the surface, named not exhaustively walked.** Margins on block elements (`body`, `h1-h6`, `p`, `blockquote`, lists, `figure`, `hr`); heading font-size and font-weight inherit (a bare `<h1>` looks like body text); lists lose bullets and indentation; links lose underline (color inherits); form elements lose native typography and background (`font: inherit; color: inherit`); images and media become block-level with `max-width: 100%`; `*, ::before, ::after` get `box-sizing: border-box` and `border: 0 solid currentColor`; tables collapse borders; `button, [role="button"]` get `cursor: pointer`.
- **Reading Preflight in DevTools.** The recognition move: in the Styles panel, a Preflight rule appears at the bottom in `@layer base`. The recognition: "the reset is doing its job; the utility is the student's job."
- **Why a senior leans in — and the two carve-outs.** `@tailwindcss/typography` and the `prose` class for Markdown-rendered content; scoped overrides inside `@layer base` for third-party widgets that depend on browser defaults. Never strip Preflight globally.
- **The `@tailwindcss/typography` plugin and `prose`.** Installs via `@plugin "@tailwindcss/typography"`. The family: `prose`, `prose-lg`, `prose-sm`, `prose-invert`, `max-w-prose`. The recognition: `prose` is the legitimate way to style Markdown content in a Tailwind v4 codebase.
- **Customizing prose tokens.** Themed via `@theme` (`--prose-body`, `--prose-headings`, `--prose-links`, etc.). lesson 5 of chapter 027 cashes in the prose case for empty-state UI; this lesson names it only.
- **Preflight and form elements.** Cross-reference to lesson 5 of chapter 017 (form element surface) and lesson 1 of chapter 027 (shadcn `<Button>` as the canonical wrapper). The student doesn't fight Preflight on form elements; they style them.
- **The rare omit-Preflight case.** Utilities-only builds for embedding into existing CSS environments (a CMS with its own reset, a widget shipped into a third-party site). Named for recognition; for a standard SaaS app Preflight always loads.
- **Watch-outs:** "headings are tiny" / "buttons look like text" are recognitions, not bugs; Markdown content needs `prose`, not a Preflight override; don't `@apply h1 { ... }` to "fix" Preflight; Preflight lives in `@layer base` so utilities always win; the `border` utility relies on Preflight's `border-style: solid` reset (no Preflight → no border renders).

What this lesson does not cover:

- The cascade resolution algorithm and layers in general (lesson 1 of chapter 019) — Preflight's layer is named here, but the model lives in lesson 1 of chapter 019.
- CSS inheritance — Preflight's inheritance choices are cited (`font: inherit` on form elements) but the model lives in lesson 2 of chapter 019.
- The full `@tailwindcss/typography` API — cashed in lightly when needed.
- The box model and `box-sizing` — lesson 1 of chapter 020 owns it (Preflight sets the default, that's all).
- Form element styling at depth — Chapter 027 owns shadcn `<Button>`, `<Input>`, `<Form>`; Unit 6 owns the form pattern.
- Typography sizing and line-height systems — lesson 1 of chapter 021.
- The `@tailwindcss/forms` plugin — named for recognition only; the chapter doesn't ship it in the project setup because shadcn's form components don't depend on it.

---

## Lesson 4 — Custom properties and the three-tier token model

Teaches CSS custom properties as runtime-reactive inheriting bindings, the Tailwind `@theme`-to-utility flow, subtree overrides for theming and multi-tenancy, reading and writing tokens from JavaScript and React inline styles, the three-tier token model (primitive, semantic, component) with naming conventions, and `@property` for animatable typed properties.

Topics to cover:

- Opens with the runtime-write question: can JavaScript change a token at runtime, can a subtree override it, what's the model behind the `var()` reference. Names custom properties as a runtime-reactive, inheriting, cascade-aware substrate; design tokens are the architectural pattern on top.
- **Custom properties in one line.** Any property named `--*`; reads via `var(--name, fallback)`; inherits through the DOM tree; live (the browser recomputes reads when the value changes); JavaScript reads with `getComputedStyle().getPropertyValue` and writes with `style.setProperty`. The recognition: it's a binding, not a constant.
- **The Tailwind v4 `@theme`-to-utility flow.** Cross-reference to lesson 2 of chapter 018. Token definitions become `:root` rules in `@layer theme`; utilities compile to `var(--token)` reads; the namespace prefix determines the utility family (`--color-primary` produces `bg-primary`, `text-primary`, `border-primary`).
- **Inheritance plus the cascade — subtree overrides.** The senior pattern: defaults on `:root`, dark theme on `.dark`, scoped overrides on `.marketing-hero` or `[data-org="acme"]`. Use cases named: theme switching (cross-ref lesson 5 of chapter 018), multi-tenant branding, section-specific theming, component-scoped properties.
- **Reading and writing from JavaScript.** The DOM API named (`getPropertyValue`, `setProperty`, `removeProperty`). Use cases: a theme color picker; multi-tenant branding written from server data (inline `<script>` in `<head>` to avoid FOUC, parallel to lesson 6 of chapter 018); slider-driven CSS animations. The recognition: visual updates happen without React re-renders.
- **React inline-style writes — the `style={{}}` shape.** `style={{ '--card-padding': '1.5rem' }}` paired with the arbitrary-value form (`p-[var(--card-padding)]`) for prop-driven component-local tokens.
- **The arbitrary-value form.** `bg-[var(--name)]` for runtime variables and non-theme-namespace properties. Rare in component code, common for one-off bindings (a variable that drives a single element's width or transform).
- **Design tokens — the three-tier model.** Primitives (raw palette — `--gray-50` through `--gray-950`, etc.), semantic (component contract — `--color-foreground`, `--color-primary`; what components read), component-specific (optional — `--button-primary-bg`, `--card-padding`). The senior recognition: components reference semantic tokens, not primitives. shadcn's token set is the semantic tier.
- **Naming conventions for semantic tokens.** `--color-{role}` and the `--color-{role}-foreground` pair for contrast; state suffixes (often handled by opacity modifiers like `bg-primary/80` instead); `--spacing-{role}`, `--radius-{role}`, `--shadow-{role}`. Names describe purpose, not visual.
- **`@property` for typed custom properties.** Registers `syntax`, `initial-value`, and `inherits`. The narrow 2026 reach: animatable custom properties (a gradient angle, a property driving a transform that needs to interpolate).
- **Watch-outs:** custom properties are case-sensitive; `var()` fallbacks are rarely needed in projects that own their tokens; `var()` resolves at use-time (the binding model); `@property` is required for transitions on custom properties; `getComputedStyle().getPropertyValue` returns a string with possible whitespace; scope of JS writes matters (`documentElement` for global, deeper element for scoped); `:root` vs `html` specificity difference (rare); custom-property writes don't trigger React re-renders (the React-visible state must stay in React state if components need to know); runtime tokens need pre-paint inline-script writes to avoid FOUC.

What this lesson does not cover:

- The cascade and specificity (lesson 1 of chapter 019).
- CSS inheritance at depth (lesson 2 of chapter 019).
- Preflight (lesson 3 of chapter 019).
- The `@theme`, `@utility`, `@container` directives (lesson 2 of chapter 018).
- The semantic-token shape for dark mode (lesson 5 of chapter 018) — cross-referenced.
- `next-themes` and the React-side theme wiring (lesson 6 of chapter 018).
- Color spaces (OKLCH, sRGB, P3) — lesson 2 of chapter 021.
- CSS animations and transitions — lesson 5 of chapter 021.
- shadcn's exact token list — lesson 1 of chapter 027.
- Multi-tenant theming as a SaaS pattern — Unit 9 introduces organizations; theming-per-org as a feature would be a custom build.

---

## Lesson 5 — Quizz

Top 10 topics to quiz:

- The cascade resolution algorithm — the four steps in order (origin and importance → layer → specificity → source order), and which step decides a common Tailwind-vs-custom-CSS conflict.
- Cascade layers — what `@layer base`, `@layer components`, `@layer utilities` mean in Tailwind v4, what order they resolve in, what happens to unlayered CSS.
- The `!important` carve-outs — when a senior reaches for it (third-party widget overrides) and when they don't (every cascade-organization issue).
- Specificity weights — `(inline, ID, class/attr/pseudo-class, element/pseudo-element)`, the role of `:where()` (zero specificity), the senior reach (layers solve most specificity wars).
- CSS inheritance — which property families inherit (typography, color, custom properties, list-style, cursor) and which don't (box-model, layout, background), the `inherit`/`initial`/`unset`/`revert` keywords.
- Form elements as inheritance-rebels — why `<button>`, `<input>` ignore body typography unless Preflight resets `font: inherit; color: inherit`.
- `currentColor` and SVG icons — what the keyword resolves to, why icon components use `fill="currentColor"`.
- Preflight — what it strips (heading sizes, list bullets, margins, button styles), where it lives (`@layer base`), the two carve-outs (`@tailwindcss/typography` for prose, scoped overrides for third-party widgets).
- The Tailwind `@theme`-to-utility flow — `--color-foo` produces `bg-foo`, `text-foo`, `border-foo`; the namespace prefix determines the utility family.
- The design-token three-tier model — primitives (raw palette), semantics (component contract, what components reference), component-specific (optional). Why components read semantic tokens, not primitives. Runtime-reactive nature of custom properties — JavaScript can write them without a React re-render.
