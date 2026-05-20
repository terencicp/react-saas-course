# Chapter 024 — Layout and sizing

## Chapter framing

Chapter 023 closed with the cascade, inheritance, Preflight, and the design-token substrate. Chapter 024 is the next axis: **where the element sits, how big it is, and how it relates to its neighbors.** The senior framing is that layout in 2026 is a settled stack — flexbox for one-dimensional rows and columns, grid for two-dimensional structure, `gap` for spacing inside both, sticky and fixed for the few elements that escape flow, and a small set of viewport-aware sizing primitives (`dvh`, `aspect-ratio`, `clamp`) for the responsive cases that used to need JavaScript. Floats are gone from production code, the flex-vs-grid debate is settled ("both, for different jobs"), and `gap` has replaced sibling-margin tricks. The chapter owns nine load-bearing topics — the box model and the inline/block axis (lesson 1 of chapter 024), display modes (lesson 2 of chapter 024), flexbox (lesson 3 of chapter 024), grid (lesson 4 of chapter 024), sizing (lesson 5 of chapter 024), spacing inside containers (lesson 6 of chapter 024), position and the inset utilities (lesson 7 of chapter 024), overflow and scroll containers (lesson 8 of chapter 024), and stacking context with z-index (lesson 9 of chapter 024) — plus the quiz (lesson 10 of chapter 024). Each lesson teaches the underlying CSS model, names the Tailwind v4 utility that compiles to it, and names the senior reach.

Several threads run through every lesson. `box-sizing: border-box` is the universal default Preflight already set, so widths compose by addition. `gap` is the spacing default; `space-x` / `space-y` and sibling-margin tricks are legacy. Intrinsic-vs-extrinsic sizing is the model that demystifies "why is my width auto." Stacking context is the hidden trap — `transform`, `filter`, `opacity < 1`, or `position: fixed/sticky` on an ancestor creates one and traps every descendant's `z-index` inside, and the senior fix is to portal modals and popovers out to `<body>`. Mobile viewport units (`dvh`, `svh`, `lvh`) are the answer to the iOS address-bar bug, with `min-h-dvh` as the reflex. Logical properties (`ps-*` / `pe-*` / `ms-*` / `me-*` and the new `inset-s-*` family) are the i18n-aware form of physical margin and padding. The ordering follows the dependency — box model first, display modes second, then flex, grid, sizing, spacing, position, overflow, and stacking context last because it's the trap that wraps the others. Forward references land in Chapter 025 (responsive variants, container queries), lesson 5 of chapter 026 (portals), Chapter 031 (CSS anchor positioning and the shadcn component surface), and the project chapter chapter 032 where every layout utility cashes in.

---

## Lesson 1 — The box model and the inline/block axis

How the four boxes compose under `border-box`, the Tailwind `--spacing` scale, margin collapse as a smell, logical `ps-*`/`pe-*`/`inset-s-*` utilities, and `mx-auto` as the one centering case where margin still earns its weight.

Topics to cover:

- **The senior question.** A `w-64 p-4 border` element renders 256 px wide because `box-sizing: border-box` is the Preflight default; padding and border are inside the declared width, not added on top. The lesson installs the box model in this form, names the four boxes (content, padding, border, margin), explains why margin sits outside the box, and folds in CSS logical properties as the modern axis-aware form.
- **The four boxes and the `border-box` default.** Content (where children render), padding (inside the border, takes the background), border (the styled edge), and margin (transparent, outside, the only one that participates in margin collapse). `border-box` is the universal 2026 default — Preflight already sets it on `*, ::before, ::after`. The student doesn't write the rule and only encounters `content-box` when a third-party widget assumes it (rare).
- **The Tailwind spacing scale — `--spacing` as one CSS variable.** Every spacing utility (`p-*`, `m-*`, `gap-*`, `space-y-*`, etc.) compiles to `var(--spacing) * n`. The whole scale changes by editing one variable in `@theme`. Arbitrary values exist for rare one-offs (`p-[17px]`), but the convention is to stay on the scale. The 4-px grid is the convention every modern design system (Material, Carbon, Tailwind, shadcn) shares.
- **Margin collapse — recognition, not pattern.** Adjacent block siblings' vertical margins collapse to the larger value; a parent's margin can collapse with its first/last child's. The 2026 reflex is `gap` on a flex/grid parent, which doesn't trigger collapse. The lesson names the rule, then lands on "don't use the pattern that triggers it."
- **The inline/block axis and Tailwind's logical utilities.** CSS names the two box-model axes as *inline* (text-flow direction) and *block* (perpendicular); logical properties flip with `direction: rtl` or vertical writing modes. Tailwind ships `ps-*` / `pe-*`, `ms-*` / `me-*`, the block-axis `pbs-*` / `pbe-*` for vertical-writing cases, and the new `inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*` family (which replaced the deprecated `start-*` / `end-*` shorthands). The senior reach: logical from day one in an RTL-bound project; physical is fine in LTR-only, with mechanical migration later.
- **`mx-auto` centering — the one place margin still earns its weight.** `margin-inline: auto` centers a block element with a defined width inside its parent. The canonical 2026 form is `mx-auto max-w-3xl` on a centered article — the right tool when the parent has no flex/grid in between. Every other centering is flex or grid (Lessons lesson 3 of chapter 024 and lesson 4 of chapter 024).
- **DevTools — the box-model panel.** Color-coded overlay (content / padding / border / margin) on hover; Computed panel diagram with the four values. The senior debugging move when a layout is "off by a few pixels."
- **Watch-outs:**
  - Don't override Preflight's `box-sizing` — a custom `*` rule breaks every utility-driven width calculation.
  - Margin collapse only happens between block-level siblings in normal flow; flex/grid items don't collapse.
  - `outline` doesn't take layout space — the canonical focus-ring tool (`focus-visible:outline-2`) because it doesn't shift the layout.
  - Negative margins are legal in narrow cases (image-flush-to-edge, hero hooks) but otherwise a smell.
  - `width: 100%` plus padding overflows on `content-box`; the project default is `border-box`, so the bug doesn't exist.

What this lesson does not cover:

- Display modes and their box-model interactions — lesson 2 of chapter 024.
- Flexbox-specific item sizing (`flex-grow`, `flex-shrink`, `flex-basis`) — lesson 3 of chapter 024.
- Width / height / min-max / aspect-ratio — lesson 5 of chapter 024.
- Spacing inside containers (`gap`, `space-x`, `divide-x`) — lesson 6 of chapter 024.
- Position and inset (`top`, `left`, the inset utilities) — lesson 7 of chapter 024 (with logical insets cross-referenced from this lesson).
- The `writing-mode` property at depth — out of scope; the chapter names the inline/block axis and trusts the student to apply it.
- CSS containment (`contain: layout/paint/style/size`) — niche performance tool, not chapter material.

---

## Lesson 2 — Display modes and the hide decision tree

The choice between `block`, `inline`, `inline-block`, `flex`, `grid`, and `contents` as layout primitives, plus the `display: none` / `visibility: hidden` / `aria-hidden` decision tree for the three ways to hide an element.

Topics to cover:

- **The senior question.** A `<span>` ignores `width` and `padding-top` because it's `inline`; switching to `<div>` makes them work because block elements accept all box-model properties. The display mode decides which box-model rules apply, which sizing utilities work, and how the element relates to its siblings. The lesson installs the modes the student reaches for (`block`, `inline-block`, `flex`, `grid`, `inline-flex`, `inline-grid`, `contents`, `none`), names the recognition-only ones (`inline`, `table`, `list-item`, `flow-root`), and frames the choice as a decision: `flex` for a row or column, `grid` for a 2D structure, `block` for stacking content, `inline` for in-text spans, `contents` for the rare unwrapping case.
- **Block, inline, inline-block.** Block: new line, fills the parent's inline axis, accepts all box-model properties (default for `<div>`, `<p>`, headings, sectioning elements, lists, forms). Inline: flows with text, ignores `width`/`height`, vertical margin/padding visually overlaps surrounding lines (default for `<span>`, `<a>`, text-level elements). Inline-block bridges the two — flows like inline, sized like block. The 2026 reach for `inline-block` is narrow (a status dot in a sentence); most "I want width on a span" cases want flex on the parent.
- **Flex / inline-flex, grid / inline-grid.** Flex makes a 1D container; grid makes a 2D container. The inline variants flow with text — the canonical reach for `inline-flex` is an icon-and-text button. Algorithms at depth land in Lessons lesson 3 of chapter 024 and lesson 4 of chapter 024.
- **`display: contents` — the unwrapper.** The element disappears from the layout tree but its children participate in the parent's layout. Reaches: semantic wrappers (`<section>` around cards) that shouldn't break a flex/grid layout, and component composition where a real DOM element is needed but its layout box is unwanted. The watch-out: historically broke accessibility; modern browsers fixed most semantic elements, but test with screen readers and prefer React Fragments where possible.
- **The three hide mechanisms — `display: none`, `visibility: hidden`, `aria-hidden`.** `display: none` removes from both layout and a11y trees (closed dialogs, unmounted routes). `visibility: hidden` reserves the box but hides the element and removes from a11y (rare; usually a grid-sizing problem). `aria-hidden="true"` keeps visible but hides from a11y (decorative icons next to redundant labels; cross-reference to lesson 3 of chapter 031). Decision tree: state-change hiding → conditional render or `display: none`; visually hidden / a11y visible → `sr-only`; visible / a11y hidden → `aria-hidden`.
- **The default-display reset.** Preflight doesn't change `display` defaults — `<div>` is still block, `<button>` is still inline-block with browser quirks. The student writes `flex` or `inline-flex` on the button explicitly.
- **Tailwind utility coverage.** `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`, `contents`, `hidden` (= `display: none`), plus `flow-root` and `table` / `table-row` / `table-cell` for the rare cases. Responsive variants (`md:flex`, `hidden md:block`) live at depth in lesson 6 of chapter 025.
- **Watch-outs:**
  - `<button>` defaults are inconsistent across browsers — use `inline-flex items-center gap-2` for icon-and-text alignment.
  - `display` doesn't change semantics; pick the right element first, then the display utility.
  - Tailwind's `hidden` utility equals the HTML `hidden` attribute in effect (both → `display: none`).
  - `display: contents` makes the *children* the flex/grid items, not the wrapper — easy to forget when scanning a tree.
  - Floats and clears are dead outside text-wrapping-around-an-image.

What this lesson does not cover:

- Flexbox at depth (`flex-direction`, `flex-grow`, `justify-content`, `align-items`, etc.) — lesson 3 of chapter 024.
- Grid at depth — lesson 4 of chapter 024.
- `sr-only` and the visually-hidden pattern — lesson 3 of chapter 031.
- Responsive variants (`md:flex`, `lg:grid`) at depth — lesson 6 of chapter 025.
- The semantic-element choice (when to write `<section>` vs `<div>`) — lesson 3 of chapter 021 owns it; this lesson assumes it.
- Tables for actual tabular data — lesson 6 of chapter 021.
- `position` (which overrides participation in normal flow but not `display`) — lesson 7 of chapter 024.

---

## Lesson 3 — Flexbox, the 1D primitive

The flex container's main and cross axes, the `flex-1` / `flex-auto` / `flex-none` / `shrink-0` item sizing forms, `justify-*` vs. `items-*` alignment, `gap` as the spacing default, the `min-w-0` companion fix, and the five canonical layouts a senior reaches for.

Topics to cover:

- **The senior question.** For a horizontal nav (logo left, links middle, sign-in right), the 2026 reach is `flex items-center justify-between` — flex is the 1D primitive for "rows and columns of variable-content items where the algorithm distributes leftover space." The lesson installs the flex algorithm in the form a 2026 senior reads it: container → main and cross axes → item growing, shrinking, and basis → alignment on both axes → `gap` for spacing.
- **The flex container and the two axes.** `display: flex` makes the element a flex container; children become flex items. Main axis = direction items lay out (row by default, follows `direction`; switch with `flex-col`). Cross axis = perpendicular. Every flex property is named for one of the two axes — `justify-*` on main, `items-*` / `align-*` on cross. The student names the axis first, picks the property second.
- **`flex-direction` and `flex-wrap`.** `flex-row` (default), `flex-col`, and the `-reverse` cousins (recognition only — visual reorder doesn't change tab order; `order` on one item is the senior reach when a single item needs to move). `flex-wrap` enables multi-line wrapping; `gap-y-*` becomes the row-gap when wrap is on.
- **Item sizing — `flex-grow`, `flex-shrink`, `flex-basis`, and the `flex` shorthand.** The 2026 form is one of three named shorthands: `flex-1` (take available space, share equally), `flex-auto` (take available space but respect content size), `flex-none` (don't grow or shrink). `shrink-0` is the canonical reach for sidebars, fixed-width avatars, anything whose width is the design. The senior rarely writes the three values separately.
- **Alignment — `justify-content`, `align-items`, `align-self`, `align-content`.** Main-axis `justify-*`: `start` / `end` / `center` / `between` / `around` / `evenly`. Cross-axis `items-*`: `stretch` (default) / `start` / `end` / `center` / `baseline`. `align-self` overrides one item. `align-content` controls the *lines* of a wrapped container — rarely needed; `gap-y-*` usually does the job.
- **`gap` — the senior default for spacing flex items.** Every flex container with multiple items uses `gap-*`. Two-axis variants `gap-x-*` / `gap-y-*` for asymmetric. Adds space between items only — no leading or trailing edge collisions.
- **The canonical flex layouts a senior reaches for.** Five patterns cover most production use: horizontal navs (`flex items-center justify-between` with `gap`), form rows (a `shrink-0` label plus a `flex-1` input), card column stacks (`flex flex-col gap-*`), toolbars with a `flex-1` spacer between clusters, and cards with bottom-pinned footers (`flex flex-col h-full` plus `flex-1` on the main region).
- **DevTools — the flex overlay.** A button in the Elements panel toggles a colored overlay showing the axes, gaps, and item bounds. The senior debugging move when alignment looks wrong.
- **Watch-outs:**
  - `flex-1` sets `min-width: 0` and collapses an item's intrinsic min-width (add `min-w-0` or `min-w-fit` when content matters — the most common flex bug in 2026).
  - `gap` is universal in flex now; `space-x-*` isn't needed.
  - `items-baseline` aligns text baselines (the right reach for a row with mixed font sizes); `items-center` centers the box, which often visually misaligns text.
  - Items shrink by default — `shrink-0` for items whose width is the design.
  - `*-reverse` reverses visual order, not source order; keyboard tab order follows source.
  - `justify-between` with one child does nothing.
  - `<img>` and form elements have implicit min-content widths that can blow out a flex row — constrain with `min-w-0` or `max-w-*`.

What this lesson does not cover:

- Grid at depth (lesson 4 of chapter 024).
- Sizing utilities (`w-*`, `h-*`, `max-w-*`, `aspect-*`) — lesson 5 of chapter 024 (cross-referenced lightly here).
- The `gap` decision vs. `space-x` / margin tricks — lesson 6 of chapter 024 owns the comparison; this lesson assumes `gap` as the default.
- Responsive variants for flex direction (`md:flex-row`) — lesson 6 of chapter 025.
- Animation of layout properties — lesson 5 of chapter 025.
- The relationship between flex items and `position: absolute` children — recognition only; lesson 7 of chapter 024 owns positioning.

---

## Lesson 4 — Grid, the 2D primitive

Explicit tracks, the `fr` unit, `repeat(auto-fit, minmax(...))` for responsive without breakpoints, `grid-template-areas` for page shells, `subgrid` for nested alignment, `place-items-*` shorthands, item placement, and the flex-vs-grid decision.

Topics to cover:

- **The senior question.** For a card grid (three columns desktop, two tablet, one mobile, consistent gaps), `flex flex-wrap` produces varying widths because flex items shrink to content; the 2026 answer is `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Grid is the 2D primitive — it defines tracks (columns and rows), items snap into them. The lesson installs explicit columns and rows, named template areas for page shells, `auto-fit` / `minmax` for responsive cards without media queries, and `subgrid` for nested alignment.
- **The grid container and the explicit-track model.** `display: grid` makes the element a grid container; children become grid items, auto-placed unless they specify a placement. Tracks are defined via `grid-template-columns` / `grid-template-rows` and sized with fixed lengths, the `fr` unit, content-based keywords (`auto`, `min-content`, `max-content`, `fit-content()`), or `minmax(<min>, <max>)`.
- **The `fr` unit.** `1fr` = one fraction of the leftover space after fixed and content-sized tracks are subtracted. The right default for "this column grows with the container"; mix `1fr` with fixed sizes for sidebar layouts.
- **Tailwind grid utilities.** `grid-cols-*` and `grid-rows-*` (numeric or bracket-form arbitrary), `gap-*`, `col-span-*` / `row-span-*`, `col-start-*` / `col-end-*`, `grid-flow-*` for auto-placement direction, `auto-cols-*` / `auto-rows-*` for implicit tracks. `grid-cols-3` compiles to `repeat(3, minmax(0, 1fr))` so columns can shrink below content width.
- **Responsive grids without media queries — `repeat(auto-fit, minmax(...))`.** Creates as many tracks as fit, each at least a min width and at most `1fr`. The senior reach when the design is "however many cards fit, with a minimum size each." Responsive variants (`md:grid-cols-2 lg:grid-cols-3`) are the right reach when the design wants exact column counts at breakpoints.
- **`grid-template-areas` — named regions for page shells.** A header-sidebar-main-footer page shell defines its tracks plus a named template; each child references its area name. Tailwind v4 ships `grid-areas-*` and `area-*` utilities. The template is readable as ASCII art; mobile rearrangement is a single template change.
- **`subgrid` — nested alignment.** `grid-cols-subgrid` makes a nested grid's columns match the parent's. Reach: a card grid where each card has its own inner grid (header / image / body / footer) and rows must align horizontally across the row regardless of content length. Production-safe in 2026.
- **Alignment shorthands — `place-items`, `place-content`, `place-self`.** `place-items-center` on a grid with one item is the most concise centering pattern in CSS — `grid place-items-center min-h-dvh` centers a child on both axes. `place-content-*` centers the entire grid when tracks don't fill the container.
- **Item placement.** Span counts (`col-span-2`), explicit line numbers (`col-start-* col-end-*`), and named lines (the bracket form, where line names appear in the track definition). Span counts cover most cases; named lines are useful for complex page shells where the line names match the layout language.
- **The canonical grid layouts a senior reaches for.** Five patterns cover most production use: card grids with fixed columns at breakpoints, card grids with `auto-fit minmax` (no breakpoints), page shells with sidebar tracks and full-width header/footer (`col-span-2`), centered heroes (`grid place-items-center min-h-dvh`), and stats dashboards with a featured card spanning multiple tracks.
- **Flex vs. grid — the decision.** Flex for 1D (rows or columns with variable-content items distributing leftover space). Grid for 2D (rows-and-columns structure, snap-to-track items, subgrid alignment, exact column counts at breakpoints). Most SaaS UIs are a grid of flex compositions.
- **DevTools — the grid overlay.** A "grid" badge in the Elements panel; the Layout tab toggles line numbers, line names, and area names independently. The senior debugging move when an item isn't where it should be.
- **Watch-outs:**
  - `repeat(3, 1fr)` overflows on narrow viewports — `minmax(0, 1fr)` lets columns shrink below content width (Tailwind's `grid-cols-3` already does this).
  - `gap` is the row-and-column gap; no per-item margin tricks.
  - `auto-fit` collapses empty tracks; `auto-fill` keeps them. `auto-fit` is the card-grid reach.
  - `col-span-N` in an N-1 column grid clamps to available columns.
  - `grid-flow-dense` reorders visually but not in source (same a11y caveat as `flex-row-reverse`).
  - `min-content` / `max-content` are the sizing escape hatches; rare in component code, common in data tables.

What this lesson does not cover:

- Container queries (`@container`) — lesson 7 of chapter 025 (mentioned as the "responsive without breakpoints" alternative for components, vs. grid `auto-fit` for containers).
- Sizing utilities (`w-*`, `min-h-*`, `aspect-*`) — lesson 5 of chapter 024.
- Stacking context inside grid/flex — lesson 9 of chapter 024.
- The `gap` decision vs. legacy alternatives — lesson 6 of chapter 024.
- Animation of grid track changes — niche; the chapter doesn't ship it.
- Multi-column layout (`columns: 3`) — recognition only; rare in 2026 outside long-form prose.

---

## Lesson 5 — Sizing, viewport units, and aspect-ratio

The `w-*` / `h-*` / `size-*` / `min-*` / `max-*` sizing primitives, the `vh` / `dvh` / `svh` / `lvh` viewport-unit family with `min-h-dvh` as the iOS reflex, `aspect-ratio` for zero-CLS media containers, intrinsic vs. extrinsic sizing, and `clamp()` for fluid sizes without breakpoints.

Topics to cover:

- **The senior question.** An `h-screen` hero leaves a gap at the bottom on iOS Safari because `100vh` is the *largest* viewport (address bar collapsed) and the address-bar overlay leaves a gap when expanded. The fix is `100dvh` (dynamic), `100svh` (smallest), or `100lvh` (largest) depending on intent. The lesson installs the sizing primitives (`width`/`height`, `min-*`/`max-*`, `size-*`, `aspect-ratio`), the viewport-unit family, the intrinsic-vs-extrinsic mental model, and `min()` / `max()` / `clamp()` for fluid sizing.
- **`width` and `height` — extrinsic sizing.** Forces the element to a size regardless of content. Tailwind: `w-*` / `h-*` on the spacing scale, `w-full` (100%), `w-screen` (100vw — recognition; rarely the right reach), fractional widths (`w-1/2`, `w-1/3`), arbitrary values.
- **`size-*` — the v4 width-and-height shortcut.** A single utility for square elements (avatars, icons, status indicators, square buttons). `w-*` and `h-*` separately stay right for rectangles.
- **`min-*` / `max-*` constraints.** Clamp the element's size after the layout algorithm computes it. Canonical reaches: `max-w-3xl` on a centered article, `max-w-[65ch]` (or `max-w-prose`) for body text reading width, `min-w-0` on flex items that should shrink below content (the `flex-1` companion fix), `min-h-dvh` on the page shell, `max-h-screen overflow-y-auto` on a tall sidebar.
- **The viewport-unit family — `vh`, `dvh`, `svh`, `lvh` (and the `*-vw` cousins).** `vh` = largest viewport, `dvh` = dynamic (resizes with the address bar), `svh` = smallest. The 2026 reflex is `min-h-dvh` for "fill the viewport" and `h-dvh` for "exactly viewport height." `min-h-screen` is the legacy form that breaks on mobile.
- **`aspect-ratio` — sizing without one dimension.** `aspect-square`, `aspect-video` (16/9), arbitrary `aspect-[3/2]`. Reaches: image and video containers (zero CLS because space is reserved before media loads), square thumbnails, card image areas where every card's hero height must match. Replaces the legacy `padding-bottom: 56.25%` hack.
- **Intrinsic vs. extrinsic sizing — the mental model.** Intrinsic = content-driven (`auto`, `min-content`, `max-content`, `fit-content()`); extrinsic = parent- or utility-forced (`100%`, fixed lengths, `flex-basis: 0` + grow, a grid `1fr` track). Block elements are extrinsic on width, intrinsic on height; inline elements are intrinsic on both; flex/grid items are extrinsic on main, content-driven on cross. When sizing is wrong, the question is which axis is being computed which way.
- **`fit-content` — `w-fit`.** Width = content, capped at parent. Reach: a content-width button inside a `flex-col` parent that would otherwise stretch.
- **`min()`, `max()`, `clamp()` — fluid sizing without breakpoints.** `clamp(min, preferred, max)` is the 2026 sweet spot. Tailwind via bracket form. Analogous to `auto-fit` for grid columns — responsive size without media queries. The chapter names it once and points at lesson 6 of chapter 025 for when to reach.
- **The CSS unit zoo.** `rem` for spacing and typography (the senior default, via Tailwind's scale); `dvh` / `dvw` for viewport-fill; `ch` for reading widths; `px` for hairlines, borders, focus rings; `%` rarely (a flex/grid `1fr` is usually the right substitute); `em` very rarely; `fr` in grid only.
- **Watch-outs:**
  - `h-screen` (= `100vh`) breaks on iOS — use `h-dvh` / `min-h-dvh`. The single most important sizing fix to install.
  - `width: 100%` on a flex item with `min-width: auto` overflows when content is wider than the parent — add `min-w-0`.
  - `height: 100%` requires the parent to have a defined height; surprises a `<div>` inside `<body>` without `<html>, <body>` heights.
  - `max-w-prose` and `max-w-[65ch]` are the same idea — both cap reading width at the optimal character count.
  - `aspect-ratio` interacts with flex item collapse the same way `flex-1` does; use `min-w-0` or restructure.
  - `size-*` only works for square elements; use `w-*` and `h-*` separately for rectangles.
  - Magic-number sizing (`mt-[37px]`) is a smell — use the scale or change the scale's base.

What this lesson does not cover:

- Container queries (`@container`) for component-scoped responsive sizing — lesson 7 of chapter 025.
- Responsive variants (`md:w-1/2 lg:w-1/3`) — lesson 6 of chapter 025.
- The `gap` and spacing utilities — lesson 6 of chapter 024.
- Position and inset (`top`, `left`, etc.) — lesson 7 of chapter 024.
- Typography sizing (`text-*`) — lesson 1 of chapter 025.
- The `text-wrap: balance` and `pretty` properties — lesson 1 of chapter 025.
- The `field-sizing: content` property for inputs that grow with content — niche; Chapter 7 (forms) is the right place if it earns its weight.

---

## Lesson 6 — Gap, the universal spacing default

Why `gap` replaces sibling-margin tricks and `space-x` / `space-y` inside flex and grid containers, the gap-vs-margin decision, `divide-x` / `divide-y` for visible hairlines between items, and the padding / gap / margin parallel.

Topics to cover:

- **The senior question.** For a vertical list, the 2018 reach was `margin-bottom` on every item except the last; 2021 was Tailwind's `space-y-*`; the 2026 reach is `flex flex-col gap-*` — the parent declares the layout primitive, `gap` does the spacing, no per-child rules. The lesson installs `gap` as the universal default for spacing inside flex and grid containers, names the legacy alternatives with the trigger that would flip back, and covers `divide-*` for borders between items.
- **`gap` — the universal default.** Works in flex, grid, and multi-column. Adds space between items only — no leading or trailing edge collisions with the parent's padding. Two-axis variants (`gap-x-*`, `gap-y-*`). Reflows correctly when items wrap or change count.
- **`space-x-*` / `space-y-*` — legacy compatibility.** Compiles to a sibling-margin pattern. Exists for the rare non-flex/grid parent that can't be changed without side effects. The cleaner fix is almost always `flex flex-col` on the parent. Chapter names it once, dismisses with the trigger.
- **Why `gap` wins.** `space-x` breaks on wrap (inconsistent cross-row spacing), is sensitive to `:first-child` ordering (hidden / conditionally-rendered siblings shift the spacing), and interacts poorly with RTL. `gap` is one property on the parent with no per-child math and no edge cases.
- **`divide-x-*` / `divide-y-*` — borders between items.** Adds a top/left border to every direct child except the first. Reach: visible separators (settings list with hairlines, nav menu with vertical dividers). Not a substitute for `gap`; the two compose when both are wanted.
- **The gap-vs-margin decision.** Use `gap` between siblings inside a flex/grid container (~90% of cases). Use `margin` for spacing between an element and something *outside* its container (the rare push-this-element-away case). Never margin between siblings inside a flex/grid container.
- **Padding / gap / margin — the parallel.** Padding = inside an element. Gap = between siblings. Margin = outside an element. The student hardly ever writes margin in 2026; `gap` and `padding` cover almost everything.
- **The legacy patterns — recognition only.** The `* + *` "lobotomized owl" pattern (Heydon Pickering) and Tailwind's `space-y-*` (the modern variant) are dead for new code; the student recognizes them in legacy projects.
- **Asymmetric gaps and the underlying CSS properties.** `gap-x-*` / `gap-y-*` decouple row and column spacing for the rare case where they differ. `gap` is shorthand for `row-gap` and `column-gap` (name recognition only; the Tailwind shorthand is what the student writes).
- **Watch-outs:**
  - `gap` doesn't add edge space — use parent `padding` for leading/trailing space.
  - `grid-gap` is the legacy form; `gap` is the unified property now.
  - `space-y` skips spacing for `null`-rendered children; `gap` doesn't (it operates on the parent, not on selectors).
  - `divide-*` composes with parent `border` and `rounded-*` for a list-card with internal hairlines.
  - Don't mix `gap` and `space-x` on the same container.
  - `gap` doesn't collapse like margins do.

What this lesson does not cover:

- The `padding` and `margin` utilities at depth — lesson 1 of chapter 024 owns the box model.
- Flex item sizing and alignment — lesson 3 of chapter 024.
- Grid track and item placement — lesson 4 of chapter 024.
- Responsive variants for spacing (`md:gap-6`) — lesson 6 of chapter 025.
- The `<hr>` element vs. `divide-*` — `<hr>` is the semantic horizontal rule for thematic breaks (lesson 6 of chapter 021 territory).
- Multi-column layout (`columns: 3` + `column-gap`) — niche, recognition only.

---

## Lesson 7 — Position and inset utilities

The five `position` modes (`static`, `relative`, `absolute`, `sticky`, `fixed`), containing-block rules with the `relative` parent reflex for `absolute` children, the physical and logical `inset-*` family, canonical layouts for badges / sticky headers / toasts / drawers, and CSS anchor positioning plus the Popover API as forward references.

Topics to cover:

- **The senior question.** Pinning a toast bottom-right with `margin: auto` fails (parent isn't tall enough); `position: fixed` with offsets pins but overlaps the footer on scroll. The 2026 answer is `fixed bottom-4 right-4 z-50` (with the `z-50` caveat that lesson 9 of chapter 024 unpacks). The lesson installs the four positioning modes (`relative`, `absolute`, `sticky`, `fixed`), the `inset-*` utilities, the containing-block rules, and the senior reach for each mode.
- **The five `position` values.** `static` (default, no offsets), `relative` (in normal flow, offsets shift visually — usually used to establish a containing block for `absolute` children), `absolute` (removed from flow, positioned to the nearest positioned ancestor or the initial containing block), `fixed` (positioned to the viewport, stays during scroll), `sticky` (in flow until it would scroll past an offset, then sticks).
- **The containing block.** For an `absolute` element, the nearest *positioned* ancestor; if none, the initial containing block (the viewport, roughly). The most common bug is an `absolute` child without a `relative` parent positioning to the viewport. The 2026 reflex: every absolute overlay or badge is wrapped in a `relative` parent.
- **The `inset` utility family.** `top-*` / `right-*` / `bottom-*` / `left-*` for single-axis; `inset-*` for all four; `inset-x-*` / `inset-y-*` for axis pairs; `inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*` for logical (Tailwind vchapter 023+ replaced the deprecated `start-*` / `end-*` shorthands). `inset-0` is the canonical "fill the parent" pattern. Negative offsets (`-top-4`, `-inset-2`) pull outside the parent.
- **The canonical position layouts.** `relative` parent plus `absolute` child for icon badges; `sticky top-0` for table headers; `sticky top-0` with `z-*` for section headings inside a scrolling main; `fixed inset-0` for modal backdrops (pre-portal); `fixed bottom-4 right-4` for toast clusters; `fixed inset-y-0 right-0 w-72` for side drawers.
- **Sticky requires a scrollable ancestor.** `position: sticky` needs an `overflow: auto` / `scroll` / `hidden` ancestor on the relevant axis (or the page itself) and a defined offset (`top` / `bottom` / etc.). The sticky element sticks within its parent's bounds — it doesn't escape. lesson 8 of chapter 024 cashes in the overflow interaction.
- **Anchor positioning and the Popover API — forward references.** CSS Anchor Positioning (Baseline 2026 — Chrome 125+, Firefox 147+, Safari 26+) lets an element position relative to any other element on the page, not just its parent. The native `popover` HTML attribute plus the Popover API (`showPopover()`, `popovertarget`) are the 2026 form for native popovers, dropdowns, and dialogs. shadcn's Popover (lesson 1 of chapter 031) wraps these; the student recognizes the term and reads the surface, doesn't implement it from scratch.
- **Watch-outs:**
  - `absolute` without a `relative` parent positions to the viewport — the single most common position-related bug.
  - `position: fixed` doesn't escape an ancestor with `transform`, `filter`, or `perspective` — those create a new containing block (same trap as the "popover stuck inside its parent" bug in lesson 9 of chapter 024). Fix: portal to `<body>`.
  - `position: sticky` doesn't work without a scrollable ancestor, and breaks if a non-scroll ancestor has `overflow: hidden` on the relevant axis.
  - Bottom navbars must respect the iOS home indicator — pad with `pb-[env(safe-area-inset-bottom)]`.
  - `z-index` only works on positioned elements (or flex/grid items) — lesson 9 of chapter 024 cashes this in.
  - `inset-0` on an absolute element with no width/height fills the parent — the canonical full-coverage pattern, useful with `pointer-events-none` for click-through hover overlays.

What this lesson does not cover:

- Stacking context and z-index at depth — lesson 9 of chapter 024.
- Overflow modes and scroll containers — lesson 8 of chapter 024.
- React Portals (the `<Portal>` pattern for modals/popovers) — lesson 5 of chapter 026.
- shadcn's Popover, Dropdown, Tooltip components — lesson 1 of chapter 031.
- Drag and drop positioning — out of scope.
- CSS `transform` for visual positioning (`translate-x-*`, `translate-y-*`) — recognition only here; lesson 5 of chapter 025 owns motion.
- Fixed-element scroll-locking (preventing background scroll when a modal is open) — the project chapter (lesson 5 of chapter 032) cashes in `useLockBodyScroll`.

---

## Lesson 8 — Overflow and scroll containers

The overflow modes (`visible` / `hidden` / `clip` / `auto` / `scroll`), `overscroll-behavior` for the iOS scroll-chain and pull-to-refresh bugs, `scrollbar-gutter: stable` for layout stability, sticky-inside-overflow, the page-scroll vs. app-shell-scroll decision, and `scroll-snap-*` as the modern carousel primitive.

Topics to cover:

- **The senior question.** A tall sidebar causes the page to scroll behind it on iOS (or pull-to-refresh fires); a long modal lets the page underneath scroll when the modal content reaches its end. The 2026 answers are `overflow-y-auto` on the scroll container, `overscroll-behavior: contain` to stop the scroll chain, and `scrollbar-gutter: stable` to prevent layout shift when the scrollbar appears. The lesson installs the overflow modes (`visible`, `hidden`, `clip`, `auto`, `scroll`), `overscroll-behavior` for the iOS scroll-chain and pull-to-refresh bugs, scroll containment, and the canonical scroll-container patterns.
- **The overflow modes.** `visible` (default, content overflows), `hidden` (clipped, no scrollbars, *creates a new scroll container*), `clip` (like `hidden` but doesn't create a scroll container), `auto` (scrollbars only when content overflows — the senior default for scrollable regions), `scroll` (always-visible scrollbars; rare in 2026). Per-axis variants (`overflow-x-auto overflow-y-hidden` for horizontal scrollers; `overflow-y-auto overflow-x-hidden` for vertical sidebars).
- **`overscroll-behavior` — the scroll-chain control.** The scroll-chain bug: scroll at a child's boundary chains to the parent and triggers iOS pull-to-refresh. The fix is `overscroll-contain` (Tailwind) on the modal / drawer / sidebar body. `overscroll-none` also disables bounce/glow; per-axis variants exist. Every modal, drawer, and dialog body gets it.
- **Scroll-locking the page when a modal opens — the body-lock pattern.** Naïve `body { overflow: hidden }` works on desktop but fails on iOS touch. The senior reach combines body overflow with a `touchmove` listener that calls `preventDefault()`, wrapped into a `useLockBodyScroll` hook (the project chapter lesson 5 of chapter 032 builds this; this lesson references the pattern).
- **Sticky inside overflow.** The most common 2026 pattern: a sidebar that scrolls internally (`h-dvh overflow-y-auto overscroll-contain`) with a `sticky top-0` header inside it. Without the overflow, sticky has nothing to stick to; without sticky, the header scrolls away.
- **`scrollbar-gutter: stable` — preventing layout shift.** Reserves the scrollbar's space even when content fits, so the scrollbar's appearance/disappearance doesn't jolt the layout. Reach: any container that conditionally overflows on user interaction (search-results list, modal body). Tailwind vchapter 023+ via bracket form.
- **Per-element scroll vs. page scroll — the architectural decision.** Page-level scroll (`<body>` is the scroll container) is the 2026 default; works with browser back/forward, scroll restoration, anchor links, deep linking. App-shell scroll (an inner `<main>` scrolls, `<body>` doesn't) is the right reach for dashboards and tool-style UIs where chrome stays fixed; scroll restoration needs manual handling (Next.js `experimental.scrollRestoration` or a custom hook).
- **`scroll-snap-*` — the modern carousel primitive.** Snap-type (`snap-x snap-mandatory`), snap-align (`snap-start`), scroll-padding (account for sticky headers). Reach: image carousels, horizontal card scrollers, story-style UIs. Replaces most JS carousel libraries.
- **Watch-outs:**
  - `overflow: hidden` creates a scroll container (affects `position: sticky` ancestors); use `overflow: clip` if you want clipping without scroll-container creation.
  - `overflow-x-hidden overflow-y-visible` doesn't work as expected — spec forces the other axis to `auto`.
  - `overscroll-contain` is Baseline universal — no polyfill, no fallback needed.
  - `-webkit-overflow-scrolling: touch` is no longer needed in 2026.
  - Horizontal scroll containers need `shrink-0` on children, or flex items compress instead of overflowing.
  - Modal scroll-lock breaks on iOS unless `touchmove` is intercepted (project chapter cashes in).
  - Scrollbar styling utilities (`scrollbar-width: thin`, `scrollbar-color`) exist for dashboards; otherwise leave native.

What this lesson does not cover:

- Stacking context and z-index — lesson 9 of chapter 024.
- Position and inset utilities — lesson 7 of chapter 024 (cross-referenced for sticky).
- React Portals — lesson 5 of chapter 026.
- The `useLockBodyScroll` custom hook implementation — project chapter (lesson 5 of chapter 032).
- IntersectionObserver and scroll-driven animations — lesson 5 of chapter 025 has a brief touch; advanced scroll-driven animations are out of scope.
- Custom scrollbar styling at depth — niche; the chapter mentions the surface and moves on.
- `content-visibility: auto` for off-screen optimization — niche performance tool, Chapter 20 territory.

---

## Lesson 9 — Stacking context and z-index

How z-index is scoped to its stacking context, the trigger list (`opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, and friends), the canonical trapped-modal bug, the three fixes (portal to `<body>`, `isolation: isolate`, restructure the DOM), and z-index tier conventions.

Topics to cover:

- **The senior question.** A modal with `z-50` containing a tooltip with `z-100` renders the tooltip behind the modal backdrop, even though `100 > 50`. The 2026 answer names the *stacking context* — `z-index` is scoped to a stacking context, and any of `opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, or several other properties on an ancestor creates a new stacking context that traps every descendant's z-index inside. The lesson installs the model, the canonical bugs, and the senior fixes (portals to escape; `isolation: isolate` to scope deliberately; numeric z-index conventions to keep the layering legible).
- **What `z-index` actually does.** Sets an element's order on the z-axis within its stacking context. Higher values stack on top within the same context. Two critical points: z-index only applies to positioned elements (or flex/grid items), and it's scoped to the containing stacking context — a `z-100` inside a trapped parent context doesn't compete with elements in another context.
- **What creates a new stacking context.** `position: fixed` / `sticky` always; `position: relative` / `absolute` with `z-index` other than `auto`; `opacity < 1` (the most surprising trigger); `transform` / `filter` / `backdrop-filter` other than `none`; `isolation: isolate` (the deliberate, side-effect-free way); `will-change` set to certain properties; `mix-blend-mode` other than `normal`; `contain: layout` / `paint` / `style`. Common offenders in the wild: opacity fade transitions, transform animations, fixed headers, and backdrop-filter blurs.
- **The canonical bug — z-index that "doesn't work."** A parent with `opacity-95` containing a child with `relative z-50`, and a *sibling* of that parent with `relative z-40`. The parent's opacity creates a new stacking context, scoping the child's `z-50` inside; the parent itself participates in the root context with z-index `auto` (effectively `0`). The sibling at `z-40` is in the root context and beats the parent's `auto/0`. Result: the child renders behind the sibling, even though `50 > 40`.
- **The three fixes.** Portal the floating element to `<body>` — the most common 2026 fix for modals, popovers, tooltips (React's `createPortal`; shadcn's Dialog / Popover / Tooltip all do this). Use `isolation: isolate` (Tailwind: `isolate`) to scope a context deliberately when the design wants conflicts contained inside a card or section. Restructure the DOM to lift the floating element above the trapping parent.
- **Numeric z-index conventions.** A small set of named tiers prevents spaghetti: `z-0` / `z-10` / `z-20` for content-level layering; `z-30` / `z-40` for page chrome; `z-50` for modals, drawers, dialogs; higher only for non-portaled toasts and tooltips (rare). Tailwind's scale is the senior tier set; arbitrary values (`z-[200]`) are reached for rarely.
- **The `isolation` property.** `isolation: isolate` creates a new stacking context with no other side effects — replaces the `transform: translateZ(0)` hack. Reaches: scoping a card's internal layering so a badge / overlay can't accidentally escape into the page; establishing a context for `mix-blend-mode` elements.
- **DevTools — finding the trap.** Chrome's Layers panel (Cmd+Shift+P → "Show Layers") shows compositing layers that roughly correspond to stacking contexts. The senior debugging move when z-index "doesn't work": find the element in Layers, walk up the DOM tree, look for the ancestor with `opacity` / `transform` / `filter` / `position: fixed-or-sticky` / `isolation` — that's the trap.
- **Watch-outs:**
  - `opacity` is the most surprising stacking-context trigger; a `transition: opacity` fade can briefly trap z-indexed children. Fix: portal the floating elements, or pair opacity with `transform: scale(...)` (no extra trap because transform already creates one).
  - `position: fixed` on the modal itself doesn't escape an ancestor's `transform` — the modal positions relative to the transformed ancestor. Fix: portal.
  - `z-index: -1` on a child puts it behind its parent's background — sometimes the right reach for decorative layers.
  - `relative` without `z-index` doesn't create a stacking context, but `relative z-0` does — the two aren't equivalent.
  - shadcn's Dialog, Popover, and Tooltip all portal to `<body>` — same lesson when writing your own floating UI.
  - Arbitrary high z-index (`z-9999`) is a code smell, not a fix — a trap can't be defeated from inside the trap.
  - `will-change: transform` creates a stacking context; only apply when measured.

What this lesson does not cover:

- React Portals at depth — lesson 5 of chapter 026.
- shadcn's Dialog, Popover, Tooltip implementation — lesson 1 of chapter 031.
- CSS Animation and transform — lesson 5 of chapter 025.
- The `position` modes themselves — lesson 7 of chapter 024.
- The browser layout engine — out of scope; the chapter teaches behavior, not implementation.
- 3D transforms and `transform-style: preserve-3d` — niche.
- `accent-color` and other related properties — out of scope.

---

## Lesson 10 — Quizz

Top 10 topics to quiz:

- The box model and `box-sizing` — what `border-box` means, that Preflight set it on `*, ::before, ::after`, and how `w-64 p-4 border` computes to a `256px` rendered width.
- The display modes and the senior reach — `flex` for 1D rows/columns, `grid` for 2D structure, `block`/`inline`/`inline-block` defaults, `display: contents` for unwrapping.
- Flexbox — main vs. cross axis, `flex-1` and `shrink-0`, `justify-content` vs. `align-items`, `gap` as the spacing default, the `min-w-0` companion fix for `flex-1`.
- Grid — tracks, the `fr` unit, `repeat(auto-fit, minmax(...))` for responsive without breakpoints, `grid-template-areas` for page shells, `subgrid` for nested alignment.
- Sizing — intrinsic vs. extrinsic sizing, the viewport-unit family (`vh` / `dvh` / `svh` / `lvh`), `aspect-ratio` for media containers, `clamp()` for fluid sizing, the `size-*` v4 shortcut.
- Spacing inside containers — `gap` as the universal default, `space-x` / `space-y` as legacy, `divide-x` / `divide-y` for visible separators between items, the gap-vs-margin decision.
- Position modes — `relative` as the containing-block tool, `absolute` for icon overlays inside `relative` parents, `sticky` for headers in scroll containers, `fixed` for viewport overlays, the `inset-*` utility family, the `transform`/`filter` ancestor breaking `position: fixed`.
- Overflow and scroll containers — the overflow modes, `overscroll-contain` for the scroll-chain bug, `scrollbar-gutter: stable` for layout stability, the sticky-needs-scroll-container interaction, horizontal scroll requires `shrink-0` on children.
- Stacking context and z-index — z-index is scoped to stacking contexts, the trigger list (`opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, etc.), the canonical trapped-modal bug, the fix is portal-to-body or `isolation: isolate`.
- Logical properties and the inline/block axis — `padding-inline` vs. `padding-left/right`, `ms-*` / `me-*` / `ps-*` / `pe-*` Tailwind utilities, the new `inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*` family that replaced the deprecated `start-*` / `end-*` shorthands, the senior reach when shipping in RTL.
