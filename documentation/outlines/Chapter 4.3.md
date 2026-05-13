# Chapter 4.3 — The cascade, inheritance, and design tokens

## Chapter framing

Chapter 4.2 closed with the student wiring `next-themes`, shipping semantic tokens, and writing components whose class strings stay theme-agnostic. The chapter showed the *what* — `bg-card` resolves to `var(--color-card)` which resolves to a value that flips with the `.dark` class — and gestured at the *why*. Chapter 4.3 is the *why*. The senior framing: **utility classes win on a 2026 stack because the cascade, specificity, and inheritance machinery underneath behaves predictably, and Tailwind v4 makes that machinery explicit by naming it with `@layer`, `@theme`, and Preflight.** The student already writes Tailwind fluently; this chapter installs the model they need to read a bug, predict an override, and make a token decision they won't regret in six months.

The chapter is the bridge between the Tailwind surface (Chapter 4.2) and the layout, typography, and motion lessons that follow (Chapters 4.4, 4.5). It owns three load-bearing topics that don't fit anywhere else: the cascade and specificity (how the browser resolves competing rules), CSS inheritance (which properties flow through the tree and which don't), and CSS custom properties as the substrate Tailwind tokens compile to. Preflight sits inside the cascade discussion because Preflight *is* Tailwind's cascade-level base reset, and the canonical "why is my heading not bold" bug is a Preflight bug. The chapter refuses to teach the cascade as a historical artifact — every paragraph names the 2026 form the student will write (cascade *layers*, not the specificity war), the 2026 tools the student will reach for (DevTools' Computed and Layers panels), and the 2026 patterns the senior ships (semantic tokens via `@theme`, runtime-themed CSS variables, the `--var` arbitrary-value form).

The 2026 reality the chapter rests on. Cascade layers (`@layer`) are baseline-supported in every browser the course targets and are how Tailwind v4 organizes its output internally — `theme`, `base`, `components`, `utilities` are real `@layer` blocks Tailwind emits. The specificity war (the historical reason for `!important` and `[id="x"]` and nesting hacks) is solved at the architectural level when layers are named: utilities in the `utilities` layer always beat components in the `components` layer, regardless of selector specificity. Inheritance is unchanged by browser version but worth installing once because Tailwind's atomic-utility model frequently surprises engineers who learned CSS in the "set it on the parent" era. Tailwind v4's tokens are CSS custom properties — `bg-brand` compiles to `background-color: var(--color-brand)`, and the variable is on `:root`, which means JavaScript can read and write tokens at runtime, third-party CSS can reach them, and DevTools' Computed panel shows them. The "design tokens" frame (semantic naming, three-tier abstraction: primitives → semantic → component) is the senior reach in 2026, and it's the same model shadcn ships, the same model the design system literature converges on, and the same model Tailwind v4 invites by making tokens first-class CSS.

Threads that must run through every lesson:

- **The cascade is mechanical and predictable; the bug is always one of four things.** When two rules touch the same property on the same element, the browser picks a winner by (1) origin and importance (`!important` user agent vs. author normal vs. author `!important`), (2) cascade layer order (unlayered beats unlayered, layered loses to later layers), (3) specificity (selector weight as a four-part tuple), (4) source order (last rule wins on a tie). The chapter names this resolution order once, in this order, with the 2026 reality that on a Tailwind v4 project the student's bug is almost always #2 (Tailwind layer vs. custom CSS) or #4 (two utilities at the same specificity, `tailwind-merge` not invoked), rarely #3, and #1 only when overriding a third-party CSS reset.
- **Cascade layers are how Tailwind v4 is built and how a senior writes custom CSS.** The naive form for custom CSS is to drop a rule into `globals.css` and hope it wins. The senior form names the layer: `@layer base { h2 { color: var(--color-foreground); } }` — and the rule competes only with other `base` rules, not with utilities. The chapter installs the four Tailwind layers (`theme`, `base`, `components`, `utilities`) and the senior reflex: custom resets go in `base`, component-level CSS classes (rare in 2026) go in `components`, custom utilities (`@utility` from 4.2.2) end up in `utilities`. The student writes `@layer base { ... }` by reflex for any custom CSS the project ships.
- **`!important` is a bug smell, not a tool.** The 2026 reach for `!important` is exactly two cases: overriding inline styles a third-party widget injects, and Tailwind's `!` modifier (`text-red-500!`) for the same job. Every other `!important` in a codebase is a sign the cascade isn't organized — the senior fix is layers, not importance escalation. The chapter names the rule, shows the canonical broken pattern (a base rule competing with a utility, `!important` escalation, the utility loses anyway because of layer order), and the fix (move the base rule into `@layer base` so utilities win without `!important`).
- **Inheritance flows through the DOM tree, not the JSX tree.** A CSS property set on `<html>` or `<body>` reaches every descendant unless something overrides it; a property set on a component's root element reaches only the children rendered inside that element's DOM subtree. The chapter names the inheriting families (text-related: `color`, `font-*`, `line-height`, `letter-spacing`, `text-align`; cursor; list-style) and the non-inheriting families (box-model: `padding`, `margin`, `border`, `width`, `height`; layout: `display`, `position`; background: `background-color`, `background-image`). The senior reflex: set typography and color on a parent (`text-foreground` on `<body>`); set box-model and layout per element. The 2026 form on Tailwind: `<body className="text-foreground bg-background font-sans">` and let the rest of the tree inherit.
- **Preflight is Tailwind's cascade-level opinion, and naming it kills a class of "why doesn't this look right" bugs.** Preflight runs in `@layer base` and strips browser defaults — headings lose their font size and weight, lists lose their bullets and indentation, buttons lose their native styling, images become block-level and width-constrained. The chapter names what Preflight strips with concrete examples, why a senior leans into it (utilities are the only source of visual weight; nothing competes), and the two carve-outs where a senior overrides it (a `prose` content area styled by `@tailwindcss/typography`, a marketing page where the design wants native-looking buttons). The student opens DevTools, finds a `<h2>` rendered at `1rem` and `font-weight: 400`, and recognizes "that's Preflight, not a bug."
- **Design tokens are semantic names with a three-tier model.** The 2026 design-system literature converges on three tiers: primitive tokens (`--gray-900`, `--blue-600`) — raw values, never used directly in components; semantic tokens (`--color-foreground`, `--color-primary`) — purpose-driven, what components reference; component tokens (`--button-primary-bg`, `--card-padding`) — component-specific, optional. The chapter installs the model, names the threshold (primitives by themselves are a leaky abstraction; components reference semantic tokens), and shows how shadcn's token set fits (it's the semantic tier, no primitive tier exposed in the standard setup). The student leaves with the vocabulary to design their own project's tokens or extend shadcn's without confusion.
- **CSS custom properties are runtime-reactive; tokens are not just compile-time.** The student already knows tokens swap with the `.dark` class (Chapter 4.2.5). The chapter extends the model: custom properties are live values the browser recalculates on change, so JavaScript can write `document.documentElement.style.setProperty('--color-primary', 'oklch(0.6 0.2 250)')` and every element using `var(--color-primary)` updates without a re-render. The senior use cases — user-customizable theme color (a color picker in settings), per-org branding (a multi-tenant SaaS with white-label colors), dynamic visualizations (a chart color that follows a slider) — are all this. The token isn't a static value; it's a binding.
- **The reading instrument is the DevTools Computed panel and the Layers indicator.** Chapter 3.5.1 introduced the Elements panel. This chapter adds two specific affordances: the Computed panel (which shows the resolved value of every property after the cascade runs, plus a "trace" view showing which rules contributed and which were overridden) and the new-ish Cascade Layers indicator (Chrome and Firefox both show which `@layer` a winning rule came from). The senior debugging move: "Computed → find the property → trace → which layer." The chapter cashes this in across the lessons.
- **Forward references to where each thread lands again.** The `@layer` model surfaces lightly in Chapter 4.5 when bespoke animation keyframes ship via `@theme { --animate-*: ... }`. CSS custom properties show up in Chapter 4.6.3 when CVA variants encode token references, in Chapter 4.11.1 when the student copies shadcn components that read tokens, and in Chapter 4.12.4 when the project ships a theme toggle. Inheritance lands again in Chapter 4.5.1 (typography on `<body>`). Preflight's typography reset is the reason Chapter 4.11.5 talks about prose styling. This chapter is the "naming the magic" chapter — the things Tailwind hides become explicit, and the student stops being surprised.

The chapter ships four teaching lessons plus the quiz. The TOC's five-bullet slicing is already close to right; the only adjustment is that the cascade and specificity lesson absorbs `@layer` as part of the same picture (specificity is solved by layers in the 2026 form, so teaching them separately would invent a problem). Inheritance gets its own lesson because the topic is small but load-bearing and the failure modes (typography not reaching a child, color set on the wrong element) deserve their own treatment. Preflight gets its own lesson because the "what gets stripped" surface is concrete and the senior carve-outs are specific. Custom properties and design tokens are the chapter closer — the runtime-reactive model and the three-tier naming convention together, because they're one mental shift: tokens aren't constants, they're a binding layer.

The chapter ships short CSS and JSX snippets, a heavy dose of exercises (`Buckets` for "which layer does this go in," `Matching` for "which properties inherit," `CodeReview` for the canonical `!important` and specificity-war bugs, `PredictOutput` for cascade resolution, `MultipleChoice` for the senior reflex calls), and a handful of `ReactCoding` and `HtmlCssCoding` blocks where the student writes tokens, layered CSS, and components that consume both. Diagrams carry weight at four sites: a hand-authored SVG showing the cascade resolution algorithm as a four-step waterfall (origin and importance → layer → specificity → source order) in Lesson 4.3.1; an interactive widget where the student toggles `inherit`/`initial`/`unset`/`revert` on a property and watches the computed value change up and down a small DOM tree in Lesson 4.3.2; a `DiagramSequence` walking Preflight's effect on a raw HTML document (before → after) in Lesson 4.3.3; and a `Figure` showing the three-tier token model (primitives → semantic → component) with arrows to the components that reference each tier in Lesson 4.3.4. The chapter ends with the student reading a real bug (a heading rendered at the wrong size), tracing it through DevTools' Computed panel to a Preflight rule in `@layer base`, fixing it by adding a `@layer base { h2 { ... } }` override that names its layer, and not reaching for `!important` once.

The chapter ordering follows the dependency: cascade and specificity first (the resolution algorithm every other lesson rides on), inheritance second (the second axis of "what styles this element," and the one Tailwind's atomic model frequently surprises engineers on), Preflight third (a worked example of the cascade and base-layer story applied to Tailwind's specific reset), tokens fourth (the runtime-reactive substrate that the cascade resolves to). The quiz closes the chapter.

---

## Lesson 4.3.1 — Cascade resolution: layers, specificity, and the `!` modifier

Topics to cover:

- The chapter-opening senior question: the student writes `<h1 className="text-2xl">Title</h1>`, sees the heading render at the wrong size, opens DevTools and finds two rules touching `font-size` — one from Preflight (`h1 { font-size: inherit; ... }`), one from Tailwind's `text-2xl` utility. Which wins, why, and how would the student know without looking? The naive answer is "specificity." The 2026 answer names cascade layers first — Preflight lives in `@layer base`, utilities live in `@layer utilities`, and `utilities` is declared after `base`, so utilities win regardless of selector specificity. The lesson installs the full resolution algorithm in the order the browser runs it.
- **The cascade resolution algorithm — four steps in this order.** A short, complete walkthrough. When two rules touch the same property on the same element, the browser resolves the conflict by:
  - **(1) Origin and importance.** The CSS comes from one of three origins — the user agent (browser defaults), the user (browser extensions, accessibility overrides), the author (the project's stylesheets). Normal author rules beat user agent normal; `!important` reverses the order. The senior reach in 2026: the project ships everything as author normal; `!important` is the last resort and almost never the right move.
  - **(2) Cascade layer.** Within an origin, rules in cascade layers compete in layer order — later layers beat earlier layers. Unlayered rules beat layered ones (the surprise that bites once). The senior recognition: `@layer base, components, utilities` declares the order; rules in `utilities` win over rules in `components` win over rules in `base`.
  - **(3) Specificity.** Within a layer, rules compete by selector weight as a four-part tuple — inline style, IDs, classes/attributes/pseudo-classes, elements/pseudo-elements. The senior reach: utility classes are flat (one class each), inline styles are not the form to write on a Tailwind stack, IDs are rare. Specificity rarely decides the outcome in a 2026 codebase because layers usually do.
  - **(4) Source order.** Within a layer at equal specificity, the rule that appears last in the source wins. The senior recognition: this is why `tailwind-merge` exists — two utilities at the same specificity compete by source order, and `last` is unpredictable across utilities that compile from different parts of the source tree. `cn()` fixes it deterministically.
- **The 2026 form on a Tailwind v4 project.** A concrete walkthrough of what Tailwind v4 ships under the hood. Tailwind v4 emits its CSS into four layers: `theme` (`@theme` token definitions become `:root { --color-*: ...; }`), `base` (Preflight + any `@layer base { ... }` the project writes), `components` (any `@layer components { ... }` and `@utility` definitions targeted as components — rare), `utilities` (every utility class). The declared order is `@layer theme, base, components, utilities`, which means utilities always win against base, components always lose to utilities, and the student's mental model is "utilities are last." The senior recognition: when a custom CSS rule fights a utility, the custom rule is almost certainly in the wrong layer.
- **`@layer base { ... }` — the senior form for custom resets and element-level styling.** The form:
  ```css
  @layer base {
    h2 {
      color: var(--color-foreground);
    }
    code {
      font-family: var(--font-mono);
    }
  }
  ```
  The senior reach: when a project needs a global element rule (`h2`, `code`, `kbd`, `blockquote`, `a` link color baseline), it goes in `@layer base`, never as a bare top-level rule. The reason: a bare rule is unlayered, which beats every layered rule, which means a utility on the same element loses — the student writes `<h2 className="text-foreground">` and sees the bare rule win, which is the opposite of the intended cascade order. Naming the layer fixes it.
- **`@layer components { ... }` — when bespoke component CSS earns its weight.** The 2026 reality: rare. The form exists for cases utilities can't reach — a Markdown-prose section, a third-party widget wrapper, a complex pseudo-element animation. When it ships, it goes in `@layer components` so utilities can override it. The senior threshold: if utilities can express the styling, utilities win; `@layer components` is the carve-out, not the default.
- **The unlayered-beats-layered surprise.** A short, concrete worked example. A project ships `globals.css` with:
  ```css
  @import "tailwindcss";

  h2 {
    color: red;
  }
  ```
  And the student writes `<h2 className="text-blue-500">`. The heading renders red, not blue. Why? The bare `h2` rule is unlayered, and unlayered rules win over layered ones in the cascade order. The fix:
  ```css
  @layer base {
    h2 {
      color: red;
    }
  }
  ```
  Now the rule is in `base`, utilities are in `utilities`, the cascade resolves blue. The senior reflex: every custom CSS rule names its layer. If the student writes a top-level CSS rule on `body`, `h1`, `code`, or any element, the first question is "what layer."
- **Specificity in 90 seconds.** A short, complete refresher. Selector weight is a four-part tuple `(inline, IDs, classes/attrs/pseudo-classes, elements/pseudo-elements)`. Inline beats everything (1,0,0,0 vs. anything). `#header` is `(0,1,0,0)`. `.btn` and `[type="submit"]` and `:hover` are each `(0,0,1,0)`. `h2` and `::before` are each `(0,0,0,1)`. Compound selectors sum the parts: `.btn:hover` is `(0,0,2,0)`. The senior reach in 2026: this matters within a layer; across layers, the layer order decides. The student rarely encounters a specificity conflict in a clean Tailwind codebase — the canonical sighting is third-party CSS that uses ID selectors, where the project's utilities lose to the third-party `#some-id { ... }` rule.
- **The `*` selector and pseudo-class selectors.** `*` is specificity `(0,0,0,0)` — the universal selector adds nothing. `:not(.x)` takes the specificity of its argument (`:not(.btn)` is `(0,0,1,0)`). `:where(...)` is always specificity zero, regardless of what's inside. The senior recognition: `:where()` is the trick to write a complex selector without raising specificity, which is why Tailwind v4's `@custom-variant dark (&:where(.dark, .dark *))` wraps in `:where()` — the dark-mode selector stays at zero specificity, so utilities can compete normally.
- **`!important` — the 2026 carve-outs and why it's a smell.** `!important` reverses the origin order (author `!important` beats user `!important` beats user agent `!important` beats author normal — it's a separate cascade). Within author `!important`, layer order *reverses* — earlier layers beat later layers. The student doesn't memorize the reversal; the senior reach is "don't write `!important`." The two legitimate carve-outs:
  - **Tailwind's `!` modifier** — `text-red-500!`, the postfix form that compiles to `color: red !important`. The 2026 reach: overriding inline styles a third-party widget injects (the only common case where `!` is the right tool).
  - **Accessibility overrides at the user-stylesheet level** — out of scope; the project doesn't ship these.
  - Every other `!important` is the cascade not being organized; the senior fix is layers, not importance.
- **The canonical broken pattern and the fix.** A short worked example. A team ships:
  ```css
  /* globals.css — unlayered */
  .btn {
    background: gray;
    padding: 8px 16px;
  }
  ```
  And components use `<button className="btn bg-primary p-4">`. The button renders with gray background and `8px 16px` padding — the utilities lose because `.btn` is unlayered. The naive fix:
  ```jsx
  <button className="btn bg-primary! p-4!">
  ```
  Forcing `!important` on every utility — which works once and then becomes a habit. The senior fix:
  ```css
  @layer components {
    .btn {
      background: gray;
      padding: 8px 16px;
    }
  }
  ```
  Now the `.btn` rule is in `components`, utilities in `utilities`, utilities win cleanly. No `!important`. The lesson cashes this in concretely.
- **`tailwind-merge` and the source-order trap (cross-reference to 4.2.3).** A short cash-in. When two utilities compete at the same specificity in the same layer (`p-4` and `p-8` both classified `padding`), CSS source order decides. Tailwind v4 emits utilities in a deterministic order, but the *user's class string* (`className="p-4 p-8"`) doesn't change the CSS source order — both classes resolve to rules that already exist in the output, and the *last rule in the CSS source* wins regardless of class-string order. This is the bug `tailwind-merge` solves: it processes the class string and drops the *earlier* conflicting utility before Tailwind ever resolves them. The senior recognition: class-string order doesn't decide a utility conflict; `cn()` removes the conflict before it reaches the cascade.
- **DevTools — reading the cascade.** A concrete tour. Chrome and Firefox both expose:
  - **Styles panel** — shows every rule touching the element, in cascade order, with overridden declarations struck through. The senior debugging move: open Styles, find the property, scroll until the first non-struck-through declaration — that's the winner.
  - **Computed panel** — shows the final resolved value of every property, with a `→` to expand the trace (which rules contributed, which was selected, which were overridden and why).
  - **Cascade Layers indicator** — Chrome 99+ and Firefox 97+ show a `@layer` label next to each rule. The senior reach: when a rule is "winning" unexpectedly, the layer label tells the story.
  - **`!important` indicator** — a small `!` icon next to declarations marked important.
  - The 2026 debugging discipline: when a style doesn't apply, the first move is Computed → trace → which layer → which rule. Three clicks, no guessing.
- **The watch-outs a senior names:**
  - **Unlayered custom CSS beats utilities** — the most common Tailwind bug. The fix is `@layer base { ... }` or `@layer components { ... }`, never `!important`.
  - **`@import` order matters for layer declaration order** — Tailwind v4 declares its layers in `@import "tailwindcss"`. Custom `@layer` blocks in the same file extend the declared layers in their declaration order. The senior reflex: declare custom layers at the top of `globals.css` if the project needs a layer before `base` (rare).
  - **Inline `style={{}}` always wins over class-based rules** (it's origin/specificity beat). The senior reach: inline style is the right form only for dynamic values JavaScript computes per-render (a transform driven by mouse position, a CSS variable set from a prop). For static styling, classes.
  - **`!important` inversion is real and rare** — the layer order reverses for `!important` rules, which means a `base !important` beats a `utilities !important`. The student doesn't need to memorize this; if they don't write `!important`, the inversion never bites.
  - **Specificity ties go to source order, which Tailwind v4 controls per layer** — the student doesn't reason about source order; `cn()` and `tailwind-merge` are the trustworthy primitives.

What this lesson does not cover:

- CSS inheritance and the `inherit`/`initial`/`unset`/`revert` keywords (4.3.2).
- Preflight's specific reset rules and what gets stripped (4.3.3).
- CSS custom properties at depth and the design-token model (4.3.4).
- The `cn()` and `tailwind-merge` composition primitive — installed in 4.2.3, only cross-referenced here.
- The `@custom-variant` and `@utility` directives — installed in 4.2.2.
- The browser layout engine and how the cascade interacts with the box model (Chapter 4.4).
- CSS-in-JS and styled-components history — out of scope; the course pins Tailwind.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the resolution algorithm (the four-step cascade) and the senior form (`@layer base`, `@layer components`, `@layer utilities` as the Tailwind v4 architecture; `cn()` for utility conflicts; `!important` only for third-party overrides). The deliverable is fluency — the student reads a "this style doesn't apply" bug and runs the four-step check in their head before opening DevTools.

Open with the senior question — "you wrote `<h1 className="text-2xl">` and the heading renders at the wrong size; what's the resolution order the browser ran?" — and a `MultipleChoice` exercise pitting four answers (specificity first — wrong; source order first — wrong; cascade layer order first — wrong; origin and importance, then layers, then specificity, then source order — right). The discrimination installs the algorithm.

A hand-authored SVG `Figure` renders the four-step waterfall — origin and importance at the top, layer in the middle, specificity below, source order at the bottom — with a sample conflict (a Preflight `h1` rule vs. a Tailwind `text-2xl` utility) traced through each step, layer settling the conflict at step 2, source order and specificity never consulted. The student sees the algorithm short-circuit; layers usually decide.

A `Matching` exercise pairs eight Tailwind v4 outputs with their layer — `@theme { --color-brand: ... }` (`theme`), Preflight's `*, ::before, ::after { box-sizing: border-box; }` (`base`), the `bg-red-500` utility (`utilities`), an `@utility scroll-snap-x` definition (`utilities`), a custom `@layer base { h2 { ... } }` rule (`base`), a bare top-level `body { ... }` rule (unlayered), a `@layer components { .prose { ... } }` rule (`components`), the `@apply` directive output (depends — names the carve-out). The layer model locks in.

A `Buckets` exercise sorts ten custom-CSS scenarios into "`@layer base`," "`@layer components`," "`@layer utilities` (via `@utility`)," "unlayered (and that's the bug)" — a global `h2` color (base), a `.prose` Markdown wrapper (components), a custom `scroll-snap-x` utility (utilities via `@utility`), a `body` font-family reset (base), an `.btn` class shared across components (components or refactor to a `<Button>`), an inline `style` on one element (none of the above — different mechanism), a `@keyframes` definition (`@theme --animate-*` — cross-ref to 4.5.5), a third-party CSS reset overriding (unlayered, which is the bug — wrap in `base`), a focus ring style on every input (utility via `focus-visible:ring-2`, no CSS needed), a top-level `* { box-sizing: border-box }` (unlayered, but Preflight already does this — redundant). The decision tree locks in.

An interactive widget renders a small DOM tree (a `<body>` with two `<h1>` siblings) and four CSS rules competing for `font-size` on `h1` — a Preflight rule (`base`, `inherit`), a utility (`utilities`, `1.875rem`), an unlayered custom rule (no layer, `2.5rem`), a `style="font-size: 3rem"` on one of the two elements. The student toggles which rules are active and watches the computed font-size on each `<h1>` update, plus a side-panel showing the cascade trace per element. The discrimination is concrete.

A `PredictOutput` exercise on four cascade scenarios:
1. `@layer base { h2 { color: red } }` + `<h2 className="text-blue-500">` → predict blue (utility wins over base layer).
2. `h2 { color: red }` (unlayered) + `<h2 className="text-blue-500">` → predict red (unlayered beats layered).
3. `<h2 style={{ color: 'green' }} className="text-blue-500">` → predict green (inline beats class).
4. `<h2 className="text-blue-500 text-red-500">` (no `cn()`) → predict — depends on source order; the student names the trap and recognizes `cn()` as the fix.

The cascade muscle is built.

A `CodeReview` exercise on a 35-line `globals.css` with six issues:
- A bare `h2 { color: red }` rule — wrap in `@layer base`.
- A `.btn` rule with `!important` on every declaration — move to `@layer components`, drop the `!important`.
- A `body { font-family: ... }` rule using a hex literal instead of `var(--font-sans)` — fix.
- A `* { box-sizing: border-box }` rule — redundant with Preflight, remove.
- An `@import` of a third-party CSS file *before* `@import "tailwindcss"` — order trap; the third-party rules end up unlayered before Tailwind's layers.
- A custom variant defined as a top-level CSS class (`.dark .text-foreground { ... }`) instead of `@custom-variant dark (&:where(.dark, .dark *))` — the senior fix is the `@custom-variant` form, named in 4.2.5.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block (with Tailwind v4 preconfigured) has the student fix a bug — a `<h1>` rendering at the wrong size — by adding a `@layer base { h1 { font-size: ... } }` block. The grader checks: the rule is layered, the utility on a sibling `<h1 className="text-3xl">` still wins, no `!important` was used.

Close with a `TrueFalse` round of six statements: "Specificity always decides the winner when two rules conflict" (false — layers and origin come first), "Unlayered CSS rules beat layered ones" (true — the gotcha), "`!important` is the senior way to override Tailwind utilities" (false — layers are), "Inline styles always beat class-based styles" (true — origin/specificity), "`:where()` keeps specificity at zero" (true — the trick), "`tailwind-merge` resolves utility conflicts at the cascade level" (false — it resolves them before the cascade by deduplicating the class string). The vocabulary is locked in.

Estimated student time: 55 to 70 minutes. Load-bearing for every later Unit 4 chapter and for Chapter 4.11.5 (where empty/loading state CSS sometimes needs custom rules), Chapter 4.5.5 (where animation keyframes ship in `@theme`), and Chapter 4.6.3 (where CVA variants compose class strings that `cn()` resolves).

---

## Lesson 4.3.2 — Inheritance and which properties flow through the tree

Topics to cover:

- The senior question: the student writes `<body className="text-foreground">` and expects every text element to render in the foreground color. Most do. Then they wrap a `<button>` in the tree and the button text comes out a different color (sometimes black, sometimes the browser's default). What just happened, and what's the senior reach? The naive answer is "set the color on the button too." The senior answer names CSS inheritance — `color` inherits, so `<body>`'s value flows down — and recognizes that `<button>`, `<input>`, `<textarea>`, and `<select>` are styled by the user agent with their own font and color rules that override inheritance for those elements. The lesson installs the inheritance model and the surprises Tailwind's atomic-utility model creates.
- **Inheritance in one paragraph.** When the browser resolves a CSS property on an element, if no rule sets the property directly, the browser checks whether the property *inherits*. If it does, the element takes the parent's computed value; the parent took its own parent's, and so on up to `<html>`. If the property doesn't inherit, the element takes the property's *initial value* (the spec-defined default). Inheritance is a per-property attribute defined in the CSS spec — the property either inherits or it doesn't. The senior recognition: a property set on `<html>` or `<body>` reaches every descendant unless something explicitly overrides it; a property set on a `<div>` reaches only that subtree.
- **What inherits — the practical surface.** A concrete list of the families that inherit, grouped by what the senior reaches for:
  - **Typography** — `color`, `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, `text-align`, `text-transform`, `text-indent`, `word-spacing`, `white-space`, `direction`. The bulk of inheritance is here.
  - **Lists** — `list-style`, `list-style-type`, `list-style-position`.
  - **Cursors** — `cursor`. Set it on a parent, every descendant uses it.
  - **Visibility** — `visibility` inherits (a parent set `hidden` makes children hidden too, but a child can `visible` itself back).
  - **CSS custom properties** — `--color-foreground`, `--my-var`. Every custom property inherits; this is why `:root { --foo: 1 }` reaches every element.
  - The senior recognition: this is the "text styles flow, custom properties flow" rule. Set typography on `<body>`, set tokens on `:root`, let the tree inherit.
- **What doesn't inherit — the senior reflex.** The non-inheriting families, by what they describe:
  - **Box model** — `padding`, `margin`, `border`, `width`, `height`, `min-*`, `max-*`. Setting `padding: 16px` on `<body>` does *not* give every child padding. The student writes `p-4` per element that needs it.
  - **Layout** — `display`, `position`, `top`, `left`, `right`, `bottom`, `z-index`, `flex`, `grid`, `gap`. Per-element.
  - **Background** — `background-color`, `background-image`. (`background` looks like it inherits when the parent is transparent and the child shows through, but that's *visual passthrough*, not CSS inheritance — `background-color` resets to `transparent` on every child.)
  - **Visual effects** — `box-shadow`, `opacity`, `transform`, `filter`. Per-element (though they often *affect* descendants visually — `opacity: 0.5` on a parent fades all children because of compositing, not inheritance).
  - The senior reach: box-model and layout are *always* per-element; this is why Tailwind's atomic-utility model fits — every element that needs spacing or layout gets the utility, not the parent.
- **The `inherit`, `initial`, `unset`, `revert`, `revert-layer` keywords.** A short tour of the explicit-inheritance toolkit:
  - **`inherit`** — force the property to take the parent's computed value, even for non-inheriting properties. Use case: a non-inheriting property the student *wants* to inherit (e.g., `border-color: inherit` so a child border matches the parent's text color).
  - **`initial`** — set the property to its spec-defined initial value. Use case: undoing inheritance (a child wants the default, not the parent's value).
  - **`unset`** — `inherit` if the property inherits, `initial` if it doesn't. The "go back to default behavior" keyword.
  - **`revert`** — undo author-level rules and fall back to the user-agent default. Use case: rare, mainly for third-party widget styles the project doesn't want to override.
  - **`revert-layer`** — undo rules from the current layer and fall back to the previous layer's value. Use case: a `@layer components` rule that wants to defer to a `@layer base` value.
  - The senior recognition: in a 2026 Tailwind codebase, the student writes these keywords almost never. The utility-class form covers the cases — `text-inherit`, `bg-transparent`, `font-normal` — without reaching for the keywords directly. The keywords are recognition vocabulary, not daily form.
- **Form elements are inheritance-rebels.** A concrete walkthrough of the canonical surprise. `<button>`, `<input>`, `<textarea>`, `<select>` are styled by the user agent with their own `font-family` (often `system-ui` or a built-in like `-apple-system`), their own `color` (often a darker shade than body text), and their own `background` (light gray on most browsers). These user-agent rules override inheritance. The student sets `<body className="text-foreground font-sans">` and the form elements ignore it. Two fixes:
  - **Preflight handles most of it.** Tailwind's Preflight (Lesson 4.3.3) includes `button, input, optgroup, select, textarea { font: inherit; color: inherit; }` exactly to defeat the user-agent override. The senior reach: rely on Preflight; if a form element looks wrong, the question is "did Preflight load."
  - **`color` on form elements** — Preflight resets `color: inherit` on inputs/buttons, but some browsers still ship subtle overrides (e.g., disabled-button gray). The senior fix: utility classes per element when needed.
- **The Tailwind atomic-utility consequence — write text styles on `<body>`, write box-model per element.** A short, concrete pattern the chapter installs:
  ```jsx
  <body className="text-foreground bg-background font-sans antialiased">
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Title</h1>
      <p className="mt-4 text-muted-foreground">Body paragraph.</p>
    </main>
  </body>
  ```
  The senior recognition: `text-foreground`, `bg-background`, `font-sans` on `<body>` because they inherit (or because `<body>` is the right element to style); `mx-auto`, `max-w-3xl`, `p-6` on `<main>` because they're box-model and don't inherit; `mt-4` on the paragraph because spacing is per-element. The student reads the pattern and recognizes the rule.
- **CSS custom properties inherit — the consequence for tokens.** A short cash-in of the Lesson 4.3.4 thread. `--color-foreground` set on `:root` reaches every element via inheritance. This is why a single `.dark { --color-foreground: ... }` swap on `<html>` propagates to every descendant — inheritance carries the variable down. The senior recognition: custom properties are an inheriting property, which makes them the right substrate for theming. (Lesson 4.3.4 cashes this in.)
- **The `currentColor` keyword — inheritance's helper.** `currentColor` is a CSS keyword that resolves to the element's computed `color`. Used in properties that don't normally inherit from `color` — `border-color: currentColor`, `fill: currentColor` (SVG icons), `background-color: currentColor`. The senior use case: SVG icons that need to take the parent's text color (the canonical Lucide / Heroicons setup is `fill="currentColor"` so a `<svg className="text-primary">` parent or wrapper makes the icon primary-colored). The chapter names the keyword because every icon component the student touches uses it.
- **DevTools — reading inheritance.** A short tour. The Computed panel shows the resolved value of every property; for inherited properties, hovering shows which ancestor the value came from. The Styles panel shows inherited rules in a separate section (`Inherited from <body>`, `Inherited from <html>`) below the element's own rules — the student scrolls down to see what inherited. The senior debugging move: when a property looks "set" but the source is unclear, scroll the Styles panel for the `Inherited from` header.
- **Inheritance gotchas the senior names:**
  - **`opacity` is not inherited but affects children.** A parent with `opacity: 0.5` fades all children — but the child's computed `opacity` is still `1`. The compositing layer applies the fade. The senior recognition: don't fight `opacity` with a child `opacity: 1`; if you need an unfaded child, restructure.
  - **`visibility: hidden` is inherited and reversible.** A child can `visibility: visible` itself back when the parent is hidden. (Useful for accessibility — visually hidden but assistive-tech visible.)
  - **`display: none` removes the element entirely; children can't reverse it.** Not strictly an inheritance issue but the parallel surprise.
  - **`font-size` inheritance and `em` units.** When `font-size` is set in `em`, the child's computed font-size depends on the parent's — a chain of `1.2em` parents compounds. The senior reach in 2026: use `rem` (relative to `<html>`'s font-size) for layout-affecting sizing; use the Tailwind `text-*` scale for typography (which compiles to `rem`).
  - **Transparent backgrounds aren't inheritance.** A child with `bg-transparent` shows the parent's background — this is visual passthrough, not CSS inheritance. `background-color` doesn't inherit; the initial value is `transparent`.

What this lesson does not cover:

- The cascade resolution algorithm and layers (4.3.1).
- Preflight's specific reset rules (4.3.3).
- CSS custom properties at depth and the design-token model (4.3.4).
- Typography utilities (`text-*`, `font-*`, `leading-*`) at depth — Chapter 4.5.1 owns typography.
- Color spaces, OKLCH, and color theory — Chapter 4.5.2 owns color.
- SVG icon component patterns — Chapter 4.11.1 cashes in shadcn's icon usage with `currentColor`.
- The CSS box model — Chapter 4.4.1 owns it.

Pedagogical approach:

Concept-plus-pattern archetype. The lesson installs the model (which properties inherit, which don't, what the keywords do) and the senior reach (text/color on `<body>`, box-model per element; `currentColor` for icons; trust Preflight for form-element rebels). The deliverable is muscle memory — the student writes typography on the document root and reaches for utilities per element on layout without thinking.

Open with the senior question — "you set `text-foreground` on `<body>`, but the `<button>` inside ignores it; what's the model?" — and a `MultipleChoice` exercise pitting four explanations (Tailwind doesn't apply to buttons — wrong; the button has higher specificity — wrong; `color` doesn't inherit — wrong; the user agent styles form elements with their own rules that override inheritance, and Preflight resets most of them — right). The discrimination installs the form-element-rebel pattern.

An interactive widget renders a small DOM tree — `<html>` → `<body>` → `<main>` → `<p>` and `<button>` — with sliders for each ancestor's `color`, `font-family`, `padding`, and `background-color`. The student moves a slider on `<body>`'s `color` and watches it flow down to `<main>` and `<p>` but stop at `<button>` (until they enable Preflight's reset in a toggle). They move the slider on `<body>`'s `padding` and watch it *not* flow anywhere. The cause-and-effect of inheritance is concrete.

A `Matching` exercise pairs twelve CSS properties with "inherits" or "doesn't inherit" — `color` (inherits), `font-family` (inherits), `padding` (doesn't), `margin` (doesn't), `border-color` (doesn't), `background-color` (doesn't), `cursor` (inherits), `line-height` (inherits), `display` (doesn't), `text-align` (inherits), `--my-var` (inherits — custom properties), `opacity` (doesn't, but compositing makes it look like it does — names the gotcha). The vocabulary locks in.

A `Buckets` exercise sorts ten styling decisions into "set on parent (will inherit)" vs. "set per element (won't inherit)" vs. "Preflight handles it" — body text color (parent), main font family (parent), max-width on the content area (per element, on `<main>`), padding on a card (per element), default link color (parent or per element — names the choice), cursor: pointer on a button (Preflight + per element), background color of the page (parent — `<body>`), background color of a card (per element), focus ring on inputs (per element, via utility), the body font weight (parent, inherits). The discrimination locks in.

A `PredictOutput` exercise on four scenarios:
1. `<body style="color: red"><p>Hello</p></body>` — predict the `<p>` color (red — inheritance).
2. `<body style="padding: 16px"><p>Hello</p></body>` — predict the `<p>` padding (zero — doesn't inherit).
3. `<body style="--brand: blue"><p style="color: var(--brand)">Hello</p></body>` — predict the `<p>` color (blue — custom properties inherit).
4. `<body style="opacity: 0.5"><p>Hello</p></body>` — predict the `<p>` computed opacity (`1` — doesn't inherit, but visually rendered at 50% via compositing).

The recognition of the inheritance boundaries is concrete.

A `CodeReview` exercise on a 25-line component layout with six issues:
- A `<body>` element with `padding-4` expecting it to apply to all sections — fix: move padding to `<main>` or per-section.
- Every `<p>` carrying `text-foreground` redundantly — fix: rely on inheritance from `<body>`.
- A `<button>` styled without recognizing form-element user-agent rules — fix: rely on Preflight, add per-element utilities for hover/active.
- A custom property defined on a deep child but expected to be reachable from a sibling subtree — fix: lift to the common ancestor or `:root`.
- An SVG icon with a hardcoded `fill="#000"` inside a colored card — fix: `fill="currentColor"`.
- A `font-size` set in `em` on a deeply nested element causing compound scaling — fix: use `rem` or a Tailwind `text-*` utility.

The student leaves a comment per issue with the senior fix.

A `ReactCoding` block has the student build a small blog-post layout — `<body>` with text color, font family, and background; `<article>` with a max-width and padding; `<h1>`, `<h2>`, paragraphs with appropriate utilities; a sidebar `<aside>` that uses `--brand` as a custom property inherited from `<body>`. The grader checks: typography is on the root, box-model is per element, the custom property is reachable from the aside.

Close with a `TrueFalse` round of five statements: "Setting `padding` on `<body>` gives every descendant padding" (false — doesn't inherit), "Custom properties inherit through the DOM tree" (true — the basis of theming), "Form elements always inherit text color from their parent" (false — user-agent rules override unless Preflight resets), "`currentColor` resolves to the element's computed `color`" (true), "`opacity` is an inherited property" (false — but the visual effect makes it look that way). The model is locked in.

Estimated student time: 35 to 45 minutes. Load-bearing for Lesson 4.3.4 (custom properties), Chapter 4.5.1 (typography on `<body>`), Chapter 4.5.2 (color and `currentColor`), and Chapter 4.11.1 (shadcn icons with `fill="currentColor"`).

---

## Lesson 4.3.3 — Preflight: naming Tailwind's base reset

Topics to cover:

- The senior question: the student writes `<h1>Title</h1>` and the heading renders at the same size as the body text, no bold, no margin. They reach for `<ul><li>Item</li></ul>` and the list has no bullets and no indentation. They wrap a button without a `className` and it looks like plain text. What happened? The naive answer is "Tailwind broke my HTML." The senior answer names Preflight — Tailwind's intentional base-layer reset that strips browser defaults so utilities are the only source of visual weight — and recognizes that the "strip" is the feature, not the bug. The lesson installs what Preflight strips, why, and the two carve-outs where overriding it earns its weight.
- **Preflight in one paragraph.** Preflight is a set of CSS rules Tailwind v4 ships in `@layer base` (loaded by `@import "tailwindcss"`). The rules normalize browser defaults — every browser ships slightly different margins, font sizes, list styling, button styling, and form-element styling, and Preflight zeros these out. The 2026 reach: the project's visual weight comes from utility classes only; the browser's defaults don't compete. The student opens DevTools, finds a Preflight rule, and recognizes it as "the reset, not a bug."
- **What Preflight strips — the concrete surface.** A short tour grouped by what the student notices:
  - **Margins on every element.** `body, h1-h6, p, blockquote, pre, ul, ol, dl, dd, figure, hr` lose their default margins. The student writes `<h1>` and there's no space below it; the senior reach is `mt-*` and `mb-*` (or `space-y-*` on the parent) when spacing is wanted.
  - **Headings — font-size and font-weight inherit.** `h1`-`h6` are set to `font-size: inherit; font-weight: inherit`, which means a `<h1>` looks identical to body text until a utility (`text-3xl font-bold`) gives it size and weight. The senior reflex: every heading carries its typography utilities; the element choice is for semantics (the screen reader, the crawler, the outline), the size and weight are for the visual.
  - **Lists — no bullets, no indentation, no margin.** `ul, ol` lose `list-style` and `padding-left`. A `<ul>` looks like a stack of `<div>`s by default. The student writes `list-disc list-inside pl-4` when bullets are wanted — which is rare in a SaaS UI; lists are usually styled as cards or rows, not as bulleted text.
  - **Links — no underline, color inherits.** `a` keeps the user-agent's link-color reset to `inherit` and removes the underline. The senior reflex: links get styled per-context (in-prose links underline; nav links don't; CTAs look like buttons).
  - **Form elements — `font` and `color` inherit, `border` resets to `1px solid currentColor`.** `button, input, optgroup, select, textarea` get `font: inherit; color: inherit` so they don't carry the user-agent's typography. `<button>` loses its native gray background and rounded corners. `<input type="text">` loses its default border style; the student writes `border border-input rounded-md px-3 py-2` per input.
  - **Images, videos, canvases — block-level, max-width 100%.** `img, svg, video, canvas, audio, iframe, embed, object` get `display: block; max-width: 100%`. The senior recognition: images don't overflow their container, no `<img>` is inline by accident.
  - **`*, ::before, ::after { box-sizing: border-box; border: 0 solid currentColor }`.** Every element gets `box-sizing: border-box` (Chapter 4.4.1 cashes in the box model). The default `border-style: solid; border-width: 0; border-color: currentColor` means adding `border` (the utility) immediately produces a 1px solid border in the current text color — no `border-style` declaration needed.
  - **Tables — borders collapse, no spacing.** `table` gets `border-collapse: collapse; border-spacing: 0`. The student writes their own table styling via utilities.
  - **Buttons and form elements — cursor and appearance.** `button, [role="button"]` get `cursor: pointer`. `select` and various form elements get their `appearance` reset toward `auto`.
  - The senior recognition: Preflight is small (~50 lines of CSS) and its job is "make every browser look the same and put visual weight under utility control."
- **Reading Preflight in DevTools.** A short, concrete tour. The student opens DevTools, picks an `<h1>`, looks at the Styles panel. They see a rule from `tailwindcss/preflight.css` (or the inlined version Lightning CSS emits) at the bottom — `h1 { font-size: inherit; font-weight: inherit; margin: 0; }`. The rule is in `@layer base`. Above it, the project's utilities. The senior recognition: when an element looks "wrong" (a heading at body size, a list with no bullets), the first move is DevTools → Styles → look for the Preflight rule. If it's there, the reset is doing its job; the student's job is the utility.
- **Why a senior leans in — and the two carve-outs.** The 2026 reach is to lean into Preflight, not to override it. The reason: when Preflight resets headings and lists, the student writes every visual decision explicitly, the design system is the source of truth, and the same component renders the same way on every browser. The two carve-outs:
  - **Prose content — `@tailwindcss/typography` and the `prose` class.** Markdown-rendered content (a blog post, a docs page, a marketing description) needs default-looking headings, bulleted lists, indented blockquotes, properly-spaced paragraphs. Writing utility classes on every Markdown-generated element is impossible — the Markdown renderer emits raw HTML. The `prose` class (from `@plugin "@tailwindcss/typography"`) targets the content inside a wrapping element and re-applies sensible defaults: `<article className="prose"><Markdown /></article>`. The senior reach: every Markdown-rendering surface uses `prose`; never override Preflight globally to make Markdown work.
  - **Resetting a third-party widget that breaks under Preflight.** A rare case: a widget ships its own CSS that assumes browser defaults (`<button>` has a gray background, `<input>` has a default border). Preflight defeats those assumptions; the widget looks broken. The senior fix: scope a small override inside `@layer base` for the widget's container only (`.third-party-widget button { background: revert; ... }`). Never strip Preflight globally — every other component depends on it.
- **The `@tailwindcss/typography` plugin and `prose`.** A short, concrete walkthrough. The plugin installs via `@plugin "@tailwindcss/typography"` in `globals.css`. It adds a family of `prose-*` utilities. The most common:
  - **`prose`** — applies sensible defaults to all descendants (`h1`-`h6`, `p`, `ul`, `ol`, `blockquote`, `code`, `pre`, `a`, `strong`, `em`, etc.). The wrapping element gets the class; everything inside is styled.
  - **`prose-lg`**, **`prose-sm`** — size variants.
  - **`prose-invert`** — dark-theme-aware variant (light text on dark background).
  - **`max-w-prose`** — sets the optimal reading width (~65ch).
  - The senior recognition: `prose` is the only legitimate way to style Markdown content in a Tailwind v4 codebase. Without it, the alternative is per-element CSS in a custom layer, which doesn't scale.
- **Customizing prose tokens.** A short note. The plugin reads `@theme` tokens for typography colors and sizes — `--prose-body`, `--prose-headings`, `--prose-links`, etc. The senior reach: project-level prose styling is a few token overrides in `@theme`, not a per-class customization. Chapter 4.11.5 cashes in the prose case for an empty-state UI with longer-form content; the chapter doesn't teach prose at depth here.
- **Preflight and form elements — the cross-reference to Chapter 4.1.5.** Chapter 4.1.5 installed the form element surface. This lesson cashes in why a `<button type="submit">` doesn't look like a button by default in a Tailwind project — Preflight stripped the native styling. The senior pattern: every form element ships utilities for its visual treatment (`bg-primary text-primary-foreground rounded-md px-4 py-2` for a primary button), and shadcn's `<Button>` component (Chapter 4.11.1) is the canonical wrapper. The student doesn't fight Preflight on form elements; they style them.
- **When Preflight isn't loaded — the rare case.** A short paragraph. Some setups (a Tailwind utilities-only build inside a CMS that already has its own reset, a per-component scoped Tailwind for a widget shipped into a third-party site) deliberately omit Preflight. The senior reach: this is rare, requires reaching for the lower-level imports (`@import "tailwindcss/utilities"` only, no `@import "tailwindcss/preflight"`), and is the right call when the wrapping environment already provides a reset. For a standard SaaS app, Preflight always loads.
- **The watch-outs a senior names:**
  - **"My headings are tiny" is a Preflight recognition, not a bug.** The fix is a utility (`text-3xl font-bold`), not turning off Preflight.
  - **"My buttons look like text" is the same recognition.** The fix is a `<Button>` component (shadcn) or a utility set per element.
  - **"My Markdown content looks like a flat wall of text" needs `prose`.** Don't override Preflight globally; use the plugin.
  - **Don't ship `@apply h1 { ... }` to "fix Preflight."** This reintroduces named-class styling and defeats co-location. If the project wants default headings for prose content, use `prose`. If it wants per-component heading styling, use utilities per heading.
  - **Preflight is in `@layer base`, so utilities always win.** A custom `@layer base { h1 { font-size: 2rem } }` competes only with Preflight; a utility (`text-3xl`) wins regardless. The senior recognition: project-level element styling lives in `@layer base`; per-component styling uses utilities.
  - **`border` utility needs Preflight's border-style reset.** Without Preflight, `border` (the utility) emits `border-width: 1px` but the browser default `border-style: none` means no border renders. The student sees no border and assumes the utility is broken; the fix is "make sure Preflight loaded."

What this lesson does not cover:

- The cascade resolution algorithm and layers in general (4.3.1) — Preflight's layer is named here, but the model lives in 4.3.1.
- CSS inheritance — Preflight's inheritance choices are cited (`font: inherit` on form elements) but the model lives in 4.3.2.
- The full `@tailwindcss/typography` API — cashed in lightly when needed.
- The box model and `box-sizing` — Chapter 4.4.1 owns it (Preflight sets the default, that's all).
- Form element styling at depth — Chapter 4.11 owns shadcn `<Button>`, `<Input>`, `<Form>`; Chapter 7 owns the form pattern.
- Typography sizing and line-height systems — Chapter 4.5.1.
- The `@tailwindcss/forms` plugin — named for recognition only; the chapter doesn't ship it in the project setup because shadcn's form components don't depend on it.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the model (Preflight is `@layer base`, strips defaults, and the senior leans in) and the mechanical surface (what gets stripped, the two carve-outs, the `prose` plugin). The deliverable is recognition — the student sees a Preflight rule in DevTools and knows what it does and why.

Open with the senior question — "you wrote `<h1>Title</h1>` and it looks the same as `<p>Title</p>`; what happened?" — and a `MultipleChoice` exercise pitting four explanations (Tailwind doesn't load on this page — wrong; the browser's CSS is wrong — wrong; Preflight reset `h1`'s `font-size` and `font-weight` to `inherit`, by design — right; the heading needs a specific class — partially right, but doesn't explain *why* the default is broken). The discrimination installs Preflight as a deliberate choice.

A `DiagramSequence` walks two side-by-side renders of the same HTML — `<h1>`, `<ul><li>`, `<button>` — with Preflight off (browser defaults; bold heading, bulleted list, gray button) and with Preflight on (flat text, no bullets, plain button). The student sees the strip concretely.

An `AnnotatedCode` block walks ~40 lines of Preflight's actual source (a curated subset of the rules), annotating each: `*, ::before, ::after { box-sizing: border-box; ... }` (the box-model normalization), `h1-h6 { font-size: inherit; font-weight: inherit; }` (the heading reset), `ul, ol { list-style: none; padding: 0; margin: 0; }` (the list strip), `button, input, optgroup, select, textarea { font: inherit; color: inherit; }` (the form-element rebel fix), `img, svg, video, canvas, audio, iframe, embed, object { display: block; max-width: 100%; }` (the media block). Annotations call out the consequence per rule and the senior reach when each one bites.

A `Buckets` exercise sorts ten "this element looks wrong" scenarios into "Preflight reset, write the utility" vs. "Preflight reset, use `prose`" vs. "Preflight reset, write a `<Component>`" — a heading without bold (utility), a list inside a blog-post body (`prose`), a `<button>` without a background (Component or utility), a `<table>` for an audit log (utility set), an `<img>` overflowing its container (Preflight already fixed it — recognition only), a `<p>` with no margin (utility, `mt-*`), a Markdown-rendered article (`prose`), an `<input>` with no border (utility), a CTA button (Component), a marketing page with bullet-pointed features (utility — `list-disc pl-4` or a custom component). The discrimination locks in.

An interactive widget renders a small page with raw HTML (`<h1>`, `<ul>`, `<button>`, `<input>`, `<img>`) and a toggle: "Preflight on" / "Preflight off." The student flips the toggle and watches the visuals change. A side-panel shows which Preflight rules are active and what they strip. The cause-and-effect is concrete.

A `CodeReview` exercise on a 25-line component with six issues:
- A `<h1>` rendered without a typography utility, expecting the browser default — fix: add `text-3xl font-bold`.
- A `<ul>` styled with bullets via custom CSS in a global stylesheet, unlayered — fix: use `list-disc pl-4` utilities or move the CSS into `@layer base`.
- A Markdown-rendered `<article>` rendering as a flat wall of text — fix: add `prose` class and import the plugin.
- A `<button>` with `style={{ background: 'gray' }}` to "restore the default" — fix: write a `<Button>` component with utility classes.
- A `<img>` with `display: inline-block` set inline to override Preflight — fix: leave Preflight's `display: block` and use `max-w-full` or sizing utilities.
- A custom `h1 { font-size: 2rem }` rule in `globals.css` unlayered, expecting it to apply globally — fix: wrap in `@layer base` and recognize that per-component utilities will still win (which is correct).

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block (with Tailwind v4 and Preflight preconfigured) has the student build a small content page — a heading, a paragraph, a bulleted feature list, a CTA button, an inline image — using utilities to restore the visual weight Preflight strips. The grader checks: each element has the utilities that produce the intended look, no global overrides, no `!important`.

Close with a `TrueFalse` round of five statements: "Preflight is Tailwind's bug, the project should turn it off" (false — Preflight is the design choice; turning it off breaks the utility-first model), "Preflight lives in `@layer base`" (true), "`prose` is the senior reach for styling Markdown content" (true), "Preflight's `box-sizing: border-box` applies to every element including `::before` and `::after`" (true), "Form elements ignore Preflight unless you write `font-family: inherit` again per element" (false — Preflight handles it). The model is locked in.

Estimated student time: 40 to 50 minutes. Load-bearing for Chapter 4.4.1 (the box model), Chapter 4.5.1 (typography on `<body>`), Chapter 4.11.1 (shadcn components), and Chapter 4.11.5 (empty-state UI with prose content).

---

## Lesson 4.3.4 — CSS custom properties as the design-token substrate

Topics to cover:

- The senior question: the student writes `<div className="bg-primary">` and the element gets the primary color. They open DevTools and see `background-color: var(--color-primary)`, with `--color-primary: oklch(0.205 0 0)` defined on `:root`. They wonder — can JavaScript write to that variable at runtime? Can a third-party CSS file read it? Can a different `:root` in a subtree override it? What's the model behind this `var()` reference? The naive answer is "it's a CSS variable, it works like a JavaScript constant." The senior answer names CSS custom properties as a runtime-reactive, inheriting, cascade-aware substrate — and recognizes that "design tokens" is the architectural pattern that names which custom properties are stable contracts (`--color-primary`) and which are implementation details (`--gray-900`). The lesson installs the substrate and the token-design model.
- **CSS custom properties in one paragraph.** A custom property is any CSS property whose name starts with `--`. It can hold any value (a color, a length, a string, a transform, a `calc()` expression). It's read via `var(--name)` (with optional fallback: `var(--name, fallback)`). It inherits through the DOM tree like any other inheriting property. It's *live* — the browser recomputes any rule that reads it whenever the variable's value changes. JavaScript can read it via `getComputedStyle(el).getPropertyValue('--name')` and write it via `el.style.setProperty('--name', value)`. The senior recognition: it's not a constant. It's a binding.
- **The Tailwind v4 model — `@theme` writes to `:root`.** A short cash-in of Lesson 4.2.2. The `@theme { --color-primary: oklch(...) }` directive emits `:root { --color-primary: oklch(...); }` in `@layer theme`. Every utility that references the token (`bg-primary`, `text-primary`, `border-primary`) compiles to a rule with `var(--color-primary)`. The senior recognition: a Tailwind token is a CSS custom property on `:root` with a utility class that reads it; the variable is the source of truth, the utility is the read.
- **Inheritance plus the cascade — overriding tokens scoped to a subtree.** A custom property is an inheriting property. Setting it on `:root` reaches every element. Setting it on a deeper element overrides for that subtree only. The senior pattern:
  ```css
  /* :root — light theme */
  :root {
    --color-background: oklch(1 0 0);
    --color-foreground: oklch(0.145 0 0);
  }

  /* .dark — dark theme, scoped to the subtree under <html class="dark"> */
  .dark {
    --color-background: oklch(0.145 0 0);
    --color-foreground: oklch(0.985 0 0);
  }

  /* A specific section can override even further */
  .marketing-hero {
    --color-background: oklch(0.6 0.2 250);
  }
  ```
  The senior use cases:
  - **Theme switching** — the `.dark` class on `<html>` (Lesson 4.2.5).
  - **Multi-tenant branding** — a `[data-org="acme"]` selector that overrides `--color-primary` per organization.
  - **Section-specific theming** — a marketing hero with a different palette than the rest of the page.
  - **Component scoping** — a `<Card>` that scopes its own `--card-padding` for child elements.
  - The recognition: custom properties cascade. The override is a CSS rule like any other; the property's value resolves per element based on the rules that touch it.
- **Reading and writing from JavaScript.** A short, concrete walkthrough. The DOM API:
  ```jsx
  // Read
  const value = getComputedStyle(element).getPropertyValue('--color-primary');

  // Write
  element.style.setProperty('--color-primary', 'oklch(0.6 0.2 250)');

  // Remove (revert to inherited/initial)
  element.style.removeProperty('--color-primary');
  ```
  The senior use cases:
  - **A color picker in settings** — the user picks a primary color, the app writes `document.documentElement.style.setProperty('--color-primary', value)`, every component using `bg-primary` updates without a React re-render.
  - **Multi-tenant branding from server data** — the server includes the org's brand color in the HTML response, an inline `<script>` sets the variable before the page paints.
  - **Animations driven by JavaScript** — a slider value drives a CSS variable, which drives a transform on another element; the cascade does the work, React doesn't re-render.
  - The senior recognition: this is the "tokens are bindings, not constants" payoff. JavaScript writes a variable, CSS reacts, the DOM updates, no component re-render needed.
- **Inline-style writing in React — the `style={{}}` shape.** A short note. JSX accepts custom-property writes via `style`:
  ```jsx
  <div style={{ '--card-padding': '1.5rem' }}>
    <div className="p-[var(--card-padding)]">...</div>
  </div>
  ```
  The senior use case: a parent component sets a custom property as a prop-driven runtime value; child utilities read it. The student doesn't reach for this often — the more common form is `@theme` for project tokens and DOM-level writes for runtime cases — but it's the right form when the value is component-local and prop-driven (e.g., a `<Slider>` setting its track-fill-percentage).
- **The arbitrary-value form for token reads — `bg-[var(--name)]`.** A short cash-in. Tailwind v4's arbitrary-value brackets accept `var()`:
  ```jsx
  <div className="bg-[var(--color-card)]">...</div>
  ```
  The senior reach: when a token isn't in the theme namespace (a runtime-set variable, a non-color variable like `--sidebar-width`), the arbitrary-value form pulls it into a utility. The 2026 reality: rare in component code (project tokens go through `@theme` and produce a real utility), common for one-off bindings (a CSS variable that drives a single element's width or transform).
- **Design tokens — the three-tier model.** A concrete walkthrough. The 2026 design-system literature converges on three tiers:
  - **Primitive tokens (raw values).** `--gray-50` through `--gray-950`, `--blue-50` through `--blue-950`, `--red-500`, etc. Raw color values, never used directly in components. Their job: the project's color palette in raw form. Tailwind v4's default palette is the primitive tier.
  - **Semantic tokens (purpose-driven).** `--color-foreground`, `--color-background`, `--color-primary`, `--color-muted`, `--color-destructive`, `--color-border`. These reference primitives (or hold their own values) and are what components read. Their job: the stable contract between design and code. shadcn's token set is the semantic tier.
  - **Component tokens (component-specific, optional).** `--button-primary-bg`, `--card-padding`, `--input-border-radius`. These reference semantics and are component-scoped. Optional — many projects skip this tier and let components read semantic tokens directly. Their job: when a component has unique theming needs that don't fit the semantic vocabulary.
  - The senior recognition: components reference semantic tokens, not primitives. Primitives are the palette; semantics are the contract. Changing `--color-primary` from `oklch(0.205 0 0)` to `oklch(0.6 0.2 250)` is a design decision; the components that read `--color-primary` don't change. Changing which primitive `--color-primary` resolves to is the same kind of move — the contract is the semantic token name.
- **Naming conventions for semantic tokens.** A short, opinionated list of the patterns the 2026 design-system literature converges on:
  - **`--color-{role}`** — `--color-background`, `--color-foreground`, `--color-primary`, `--color-muted`, `--color-destructive`. The role is the job, not the visual.
  - **`--color-{role}-foreground`** — the readable color on top of the role. `--color-primary` and `--color-primary-foreground`; `--color-card` and `--color-card-foreground`. The pair is the senior pattern for ensuring contrast.
  - **State suffixes** — `--color-primary-hover`, `--color-primary-active`, `--color-primary-disabled`. Optional; many projects use opacity modifiers (`bg-primary/80`) instead of state-specific tokens.
  - **`--spacing-{role}`** — `--spacing-section`, `--spacing-page-gutter`. When spacing is semantic (a "section break" spacing that's bigger than a "paragraph gap"), it's a token.
  - **`--radius-{role}`** — `--radius-card`, `--radius-button`, `--radius-input`. Per surface, not per visual.
  - **`--shadow-{role}`** — `--shadow-card`, `--shadow-dropdown`, `--shadow-modal`. Per elevation tier.
  - The senior recognition: tokens read like a vocabulary the design team and the code share. The name describes what the token *is for*, not what its value *looks like*.
- **`@theme` and the utility-class generation rule (cross-ref to 4.2.2).** A short cash-in. The naming convention `--{namespace}-{name}` is what gives the student a utility automatically. `--color-primary` produces `bg-primary`, `text-primary`, `border-primary`. `--spacing-section` produces `p-section`, `gap-section`, `m-section`. The senior reach: name your tokens with the right namespace prefix or you don't get the utility.
- **`@property` for typed custom properties — the 2026 surface.** A short paragraph. The `@property` at-rule registers a custom property with a type, an initial value, and an inheritance flag:
  ```css
  @property --gradient-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  ```
  Why a senior cares: typed custom properties can be *animated* (a CSS transition on `--gradient-angle` actually animates; without `@property`, the variable swaps abruptly at the transition midpoint). The 2026 reach is narrow — most tokens don't need animation; the case where they do (an animated gradient, a custom property driving a transform that needs to interpolate) is where `@property` earns its weight.
- **JavaScript runtime patterns — the canonical use cases worked out.** A short, concrete walkthrough of three:
  - **A theme color picker.** The user picks a color; the React handler writes `document.documentElement.style.setProperty('--color-primary', newColor)`; every `bg-primary` utility updates immediately. To persist, write to `localStorage` and re-apply on mount.
  - **Multi-tenant branding from server data.** The server's route handler returns the page with an inline `<script>` in `<head>` that reads the org's brand color from a server-side cookie/query and sets `--color-primary` before the page paints. (Avoids FOUC the same way `next-themes` does — Lesson 4.2.6.)
  - **A slider-driven CSS animation.** A `<input type="range">` updates a CSS variable in its `onChange`; an element elsewhere on the page reads the variable via `width: var(--slider-value)`. No React re-render for the visual update; React only updates the slider's own value display.
- **The watch-outs a senior names:**
  - **Custom properties are case-sensitive** — `--Color-Primary` and `--color-primary` are different. Convention: lowercase with hyphens.
  - **`var()` fallbacks** — `var(--color-primary, oklch(0.5 0 0))` provides a fallback if the variable isn't defined. The senior reach: rarely needed in a project that owns its tokens; useful for component libraries that ship with sensible defaults and let consumers override.
  - **`var()` resolves at use-time, not at definition-time** — `--text-secondary: var(--text-primary)` resolves when `--text-secondary` is read by a rule, not when it's defined. Changing `--text-primary` later changes `--text-secondary` too. The senior recognition: this is the binding model that makes overrides cascade naturally.
  - **`@property` is required for transitions on custom properties** — without it, `transition: --gradient-angle 1s` doesn't animate; the value jumps at the midpoint.
  - **`getComputedStyle().getPropertyValue('--name')` returns a string, possibly with whitespace** — trim before parsing if needed.
  - **Writing a custom property on an element scopes it to that subtree** — be intentional about *where* you write. Writing on `document.documentElement` is the global override; writing on a deeper element scopes the change.
  - **The `:root` selector vs. `html`** — both resolve to `<html>`, but `:root` is specificity `(0,0,1,0)` (a pseudo-class) and `html` is `(0,0,0,1)` (an element). The senior reach: use `:root` in `@theme`-style CSS for clarity; use `html` only when the specificity difference matters (rare).
  - **Custom properties don't trigger React re-renders** — JavaScript writes don't notify React. This is a *feature* — visual updates can happen without React reconciliation — but the corollary is that React-visible state must stay in React state. If the student needs the component to know the variable changed, they update state too.
  - **Server-rendered tokens — the FOUC parallel** — like dark-mode, runtime-set tokens need to be written before paint, or the user sees the default first. Same fix as `next-themes`: inline script in `<head>` (Chapter 4.2.6).

What this lesson does not cover:

- The cascade and specificity (4.3.1).
- CSS inheritance at depth (4.3.2).
- Preflight (4.3.3).
- The `@theme`, `@utility`, `@container` directives (4.2.2).
- The semantic-token shape for dark mode (4.2.5) — cross-referenced.
- `next-themes` and the React-side theme wiring (4.2.6).
- Color spaces (OKLCH, sRGB, P3) — Chapter 4.5.2.
- CSS animations and transitions — Chapter 4.5.5.
- shadcn's exact token list — Chapter 4.11.1.
- Multi-tenant theming as a SaaS pattern — Unit 10 introduces organizations; theming-per-org as a feature would be a custom build.

Pedagogical approach:

Concept-plus-pattern archetype. The lesson installs the model (custom properties are inheriting, cascade-aware, runtime-reactive bindings; tokens are semantic names with a three-tier model) and the senior patterns (theme scoping, JavaScript runtime writes, the `@theme`-to-utility flow, the three-tier naming). The deliverable is fluency — the student can design a project's token set, override at runtime, and recognize when a token is a primitive vs. semantic vs. component-specific.

Open with the senior question — "you change `--color-primary` at runtime via JavaScript; what updates in the DOM, and what does React know about it?" — and a `MultipleChoice` exercise pitting four answers (React re-renders all components using `bg-primary` — wrong; nothing visible changes until a re-render — wrong; the DOM repaints all elements using `var(--color-primary)`, React knows nothing — right; only the element JavaScript wrote on is affected — wrong, inheritance carries the change). The discrimination installs the runtime-reactive model.

A hand-authored SVG `Figure` renders the three-tier token model — at the top, a row of primitive tokens (`--gray-50` through `--gray-950`, `--blue-500`, `--red-500`); in the middle, semantic tokens (`--color-foreground`, `--color-primary`, `--color-destructive`) with arrows from semantic to primitive showing the reference; at the bottom, components (`<Button>`, `<Card>`, `<Alert>`) with arrows to the semantic tier showing what they consume. The vocabulary is concrete.

An interactive widget renders a small page (a card, a button, a heading) and exposes sliders for three custom properties — `--color-primary`, `--color-card`, `--radius-card`. The student moves a slider, the page updates in real time. A side-panel shows the JavaScript call (`document.documentElement.style.setProperty('--color-primary', newValue)`) and the resulting computed style on each affected element. The cause-and-effect of runtime writes is concrete.

A `Matching` exercise pairs ten token names with their tier — `--gray-900` (primitive), `--color-foreground` (semantic), `--button-primary-bg` (component), `--color-primary` (semantic), `--blue-500` (primitive), `--radius-card` (semantic), `--color-card-foreground` (semantic), `--spacing-section` (semantic), `--card-padding` (component), `--color-destructive` (semantic). The vocabulary locks in.

A `Buckets` exercise sorts twelve token-design decisions into "primitive (palette only)" vs. "semantic (component contract)" vs. "component-specific (rare)" vs. "not a token (use a utility)" — body background color (semantic, `--color-background`), a card's specific padding when it differs across the app (component, or restructure), the company's brand color in raw form (primitive, `--brand-500`), the focus ring color (semantic, `--color-ring`), the spacing between paragraphs in body text (not a token, `mb-4` utility), the radius on every input (semantic, `--radius-input`), a per-section margin (utility), the dropdown shadow (semantic, `--shadow-dropdown`), the off-white background of a stripe in a marketing page (one-off arbitrary value, not a token), the error message text color (semantic, `--color-destructive`), the hover background of a list row (semantic with opacity modifier — `bg-muted/50`), the marketing-page hero color that differs per campaign (subtree override of `--color-background`). The decision tree locks in.

An `AnnotatedCode` block walks ~40 lines of a real-world `globals.css` setup — `@import "tailwindcss"`, `@custom-variant dark`, `@theme { --color-background: oklch(1 0 0); ... }` with the full shadcn semantic-token set, the `.dark { ... }` override block, an `[data-theme="brand-blue"] { --color-primary: oklch(0.6 0.2 250); }` scoped override for an alternate brand. Annotations call out: the semantic naming, the OKLCH form, the scoped override mechanism, the relationship to utility generation.

A `ReactCoding` block (with Tailwind v4 and a token set preconfigured) has the student build a small theme-customizer UI — a color input and a slider. The color input's `onChange` writes `--color-primary` on `document.documentElement`; the slider writes `--radius-card`. A preview card on the page uses `bg-primary` and `rounded-[var(--radius-card)]`. The student verifies the preview updates without any React re-render of the card component. The grader checks: the `setProperty` calls are correct, the preview reads from the custom properties, the card component is not re-rendered (the React DevTools profiler trace is clean).

A `PredictOutput` exercise on four scenarios:
1. `:root { --color-primary: red } .section { --color-primary: blue }` with `<div className="bg-primary">` inside `.section` — predict blue (subtree override).
2. `:root { --color-primary: red } html.dark { --color-primary: blue }` inside `<html class="dark">` — predict blue.
3. JavaScript runs `document.documentElement.style.setProperty('--color-primary', 'green')` — predict green for every `bg-primary`, including ones rendered before the JS ran (cascade re-resolves).
4. `--color-text: var(--color-primary)` and JavaScript changes `--color-primary` — predict `--color-text` also changes (resolution is at use-time, the binding chains).

The recognition of the binding-vs-constant model is concrete.

A `CodeReview` exercise on a 35-line component with six issues:
- A component using a primitive token directly — `bg-gray-900` instead of `bg-card` — fix: semantic token.
- A `setState` after a runtime token write expecting it to update the visual — fix: the visual updates already; remove the redundant state update.
- A custom property defined inside a component's `style` and read by a sibling component — fix: scope is wrong; the property doesn't reach siblings unless lifted to a common ancestor.
- An inline hex color `style={{ backgroundColor: '#3b82f6' }}` for the brand primary — fix: `bg-primary` and define the token.
- A `var(--color-primary, blue)` fallback in a component that owns the token — fix: drop the fallback; the token is part of the contract.
- A `--color-card-bg` and `--color-card-background-color` defined separately — fix: pick one name and stick to it; redundant tokens fragment the system.

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of six statements: "CSS custom properties are runtime-reactive — JavaScript writes update the DOM without a React re-render" (true), "Components should read primitive tokens like `--gray-900` directly" (false — they read semantic tokens), "A custom property set on a deeper element is scoped to that subtree via inheritance" (true), "`@property` is required to animate a custom property's value smoothly" (true), "Tailwind v4's `@theme` directive emits custom properties on `:root`" (true), "`getComputedStyle().getPropertyValue('--name')` returns a parsed value" (false — it returns a string, possibly with whitespace). The model is locked in.

Estimated student time: 55 to 70 minutes. Load-bearing for Chapter 4.5.2 (color spaces and tokens), Chapter 4.6.3 (CVA variants encoding token references), Chapter 4.11.1 (shadcn's token model in production), Chapter 4.12.4 (theme toggle without FOUC in the project), and every later chapter that touches theming or branding.

---

## Lesson 4.3.5 — Chapter quiz

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
