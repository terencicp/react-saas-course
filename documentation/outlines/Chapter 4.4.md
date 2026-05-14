# Chapter 4.4 — Layout and sizing

## Chapter framing

Chapter 4.3 closed with the cascade, inheritance, Preflight, and the design-token substrate — the student now reads what styles an element and predicts which rule wins. Chapter 4.4 is the next axis: **where the element sits, how big it is, and how it relates to its neighbors.** The senior framing: layout in 2026 is a settled stack — flexbox for one-dimensional rows and columns, grid for two-dimensional structure, `gap` for spacing inside both, sticky and fixed for the few elements that escape flow, and a small set of viewport-aware sizing primitives (`dvh`, `aspect-ratio`, `min`/`max`/`clamp`) for the responsive cases that used to need JavaScript. The float-vs-flex wars are over; the flex-vs-grid war is over too (the answer is "both, for different jobs"). The chapter teaches the model the senior reaches for without thinking and names the handful of traps that still bite — stacking context, scroll containment, the iOS scroll-chain bug, intrinsic-vs-extrinsic sizing surprises, the unlayered-z-index spaghetti.

The chapter is the bridge between the cascade and design-token machinery (Chapter 4.3) and the typography, color, and motion lessons that finish Unit 4's CSS surface (Chapter 4.5). It owns nine load-bearing topics: the box model and the inline/block axis (4.4.1), the display-mode decision (4.4.2), flexbox (4.4.3), grid (4.4.4), sizing (4.4.5), spacing inside containers (4.4.6), position and the inset utilities (4.4.7), overflow and scroll containers (4.4.8), and stacking context with z-index (4.4.9). Every lesson teaches the underlying CSS model first, then names the Tailwind v4 utility that compiles to it, then names the senior reach. The student writes Tailwind classes for the rest of the course; this chapter is where the classes stop being incantations and start being legible.

The 2026 reality the chapter rests on. Flexbox and grid are universally supported and the only layout primitives a senior writes; floats are gone from production code (still recognition vocabulary for a legacy codebase, no more). The `gap` property works in flex, grid, and multi-column — `space-x-*` and `space-y-*` are the legacy fallback, almost never reached for in 2026 because every browser the course targets supports flex `gap`. `aspect-ratio` is universal; `dvh`/`svh`/`lvh` are universal and the right answer for "fill the mobile viewport without the address bar pushing content"; `subgrid` is Baseline and the senior reach when grid alignment must propagate through nested containers. Tailwind v4 ships first-class utilities for all of this — `size-*` (the v4 width-and-height shortcut), `aspect-square` / `aspect-video` / arbitrary `aspect-3/2`, `inset-*`, `place-items-*`, `place-content-*`, the new logical inset utilities (`inset-s-*`, `inset-e-*`, `inset-bs-*`, `inset-be-*`) that replaced the deprecated `start-*` / `end-*` family, and a dynamic `--spacing` scale that makes every spacing utility a single multiplier of one CSS variable. Container queries (`@container`) and CSS anchor positioning (Baseline 2026 — Chrome 125+, Firefox 147+, Safari 26+) exist and matter, but they live in Chapters 4.5.7 and 4.11.1 respectively; this chapter names them as forward references at the moment they would be the right reach.

Threads that must run through every lesson:

- **The 2026 default is flexbox for 1D, grid for 2D, `gap` for spacing, and nothing else.** A senior writes a horizontal nav as `flex items-center gap-4`, a card grid as `grid grid-cols-1 md:grid-cols-3 gap-6`, a header-main-footer page shell as `grid grid-rows-[auto_1fr_auto] min-h-dvh`. The chapter installs that vocabulary as the reflex; alternative tools (margins between siblings, `display: table`, floats, absolute-positioned grids) get one-line dismissals with the threshold that would flip the choice. The student leaves the chapter writing `flex` and `grid` without thinking, and recognizes that the rare "I need a `<table>`" or "I need `position: absolute` for this" case is a deliberate carve-out, not a default.
- **`box-sizing: border-box` is the universal default, and Preflight already set it.** Lesson 4.4.1 cashes in the Preflight rule from 4.3.3 — `*, ::before, ::after { box-sizing: border-box }` — and names what it means: padding and border are included in the declared width, not added on top. The student writes `w-64 p-4 border` and the element is exactly 256px wide, not 290px. This single rule kills the entire class of "my widths don't add up" bugs that dominated CSS support forums for a decade. The chapter names it once and never reaches for `content-box` again (the carve-out is third-party widgets that compute widths assuming `content-box` — rare).
- **`gap` is the senior default for spacing inside containers; `space-x` / `space-y` and sibling-margin tricks are legacy.** Every flex or grid container that needs spacing between children gets `gap-*`. The lesson names the historical alternatives — `space-x-*` (the Tailwind utility that adds margin to all-but-the-first child via the `>` selector), the `> * + *` lobotomized-owl pattern, margin-bottom on every child — and dismisses them with the threshold (a non-flex-or-grid container with siblings that need consistent spacing — rare on a 2026 stack because the answer is usually "make the parent flex"). The student reaches for `flex flex-col gap-4` instead of `space-y-4` by reflex; the difference becomes visible the moment children wrap, where `space-y` breaks and `gap` doesn't.
- **Intrinsic vs. extrinsic sizing — the model that demystifies "why is my width auto."** A short, load-bearing concept the chapter installs in the sizing lesson and references throughout. An element's *intrinsic* size is what it wants to be based on its content (a `<p>` is as wide as the container, as tall as the wrapped lines need); its *extrinsic* size is what its parent or its own sizing utilities force it to be (`w-64`, `flex-1`, a grid track). Block elements default to extrinsic width (fill the container) and intrinsic height (fit content); inline elements are intrinsic on both axes; flex and grid items are extrinsic on the main axis (driven by the algorithm) and content-driven on the cross axis. The senior recognition: when a width is "wrong," the question is which axis is the algorithm picking, and which utility flips it.
- **Stacking context is the chapter's hidden trap and the source of every "z-index doesn't work" bug.** Lesson 4.4.9 names it, but the threads run through Position (4.4.7) and Overflow (4.4.8) too. The model: `z-index` is scoped to a stacking context, and any of *opacity < 1*, `transform`, `filter`, `position: fixed/sticky`, or `isolation: isolate` on an ancestor creates a new stacking context that traps every descendant's `z-index` inside. The canonical bug — a popover with `z-50` sitting *behind* a modal with `z-40` because the popover's parent has `transform: translateZ(0)` and the modal doesn't — is the chapter's worked example. The senior reflex: portal modals and popovers to `<body>` (Chapter 4.6.5 owns the React side) so they escape every parent stacking context, and reach for `isolation: isolate` when a deliberate scope is wanted.
- **Sticky, fixed, and the popover/anchor surface are the only reasons to leave normal flow.** The chapter names the four positioning modes (`relative`, `absolute`, `sticky`, `fixed`) in the order a senior reaches for them: `relative` as the anchor for `absolute` children (hardly ever for visual positioning itself), `sticky` for the table-header / sidebar / call-to-action that follows the scroll, `fixed` for full-viewport overlays and the rare always-on-screen UI, `absolute` only inside a positioned parent for icon overlays, badges, and the popover body. The Popover API and CSS anchor positioning are named as the 2026 successors to `position: absolute` for tooltips and dropdowns (forward reference to Chapter 4.11.1 where shadcn's Popover ships); `position: absolute` with hand-tuned coordinates is the legacy form.
- **Mobile viewport units — `dvh`, `svh`, `lvh` — are the answer to the iOS-Safari address-bar bug.** The lesson names them once. `100vh` is the *largest* viewport (address bar collapsed); `100svh` is the *smallest* (address bar expanded); `100dvh` is the *dynamic* — it resizes as the address bar appears and disappears. The senior default for "fill the mobile viewport" is `min-h-dvh`. The naïve `min-h-screen` (which compiles to `100vh`) leaves a gap at the bottom on iOS Safari when the address bar is showing. The chapter installs this as the mobile reflex and points to the Tailwind v4 utility (`min-h-dvh`).
- **Logical properties are the i18n-aware form of margin and padding.** The chapter folds logical properties into the box-model lesson (4.4.1) rather than treating them as a separate topic — they're the same surface from a different axis. The model: `inline` is the text-flow axis (left-right in English, right-left in Arabic, top-bottom in vertical Japanese); `block` is the perpendicular axis. `padding-inline` replaces `padding-left + padding-right`; `margin-block-start` replaces `margin-top`; `inset-inline-start` replaces `left`. Tailwind v4's logical utilities are `ps-*` / `pe-*` (padding-inline-start/end), `ms-*` / `me-*`, and the new `inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*` family that replaced the deprecated `start-*` / `end-*` shorthands. The senior reach: if the project plans to ship in an RTL locale (Arabic, Hebrew), every spacing utility is logical from day one; if not, the physical utilities (`pl-*`, `mr-*`) are fine and the project can migrate later.
- **DevTools — the Layout panel for grid and flex, and the Stacking-Context indicator.** Chapter 3.5 introduced the Elements panel; Chapter 4.3.1 added Computed and the Cascade Layers indicator. This chapter cashes in two more affordances: Chrome and Firefox both show grid and flex overlays (a button on each grid/flex container in the Elements panel toggles a colored overlay showing tracks, lines, and gaps), and Chrome's Layers panel exposes which elements form their own stacking context. The senior debugging move when a layout is wrong: toggle the grid overlay, see the tracks, recognize whether the issue is the track definition or the item placement.
- **Forward references to where each thread lands again.** The dynamic spacing scale (`--spacing` as a single CSS variable) cashes into Chapter 4.5.6 where responsive variants compose with it. Container queries (`@container`) live in Chapter 4.5.7. CSS anchor positioning lives implicitly in Chapter 4.11.1 (shadcn's Popover, Dropdown, Tooltip). Portals — the React-side fix for stacking context escape — live in Chapter 4.6.5. The project chapter (4.12) is where every layout utility this chapter installs gets cashed in on a real surface.

The chapter ships nine teaching lessons plus the quiz. The TOC's eleven-bullet slicing is mostly right; the only adjustment is folding logical properties into the box-model lesson (4.4.1), since they're the same surface (the inline/block axis is the modern naming for what padding/margin/border have always done) and teaching them as a separate Lesson 4.4.10 would split a single concept across two lessons fifty minutes apart. Stacking context and z-index stay together (the TOC already has them as one bullet) but move next to position and overflow because the trap shows up when those primitives are reached for. Spacing inside containers stays its own lesson because the gap-vs-margin decision is the senior reach the chapter installs.

The chapter ships short JSX snippets (every layout example uses Tailwind utilities so the student reads the form they will write), inline `HtmlCssCoding` blocks for layout exercises with visual targets, `Buckets` and `Matching` for decision recall (flex vs. grid, intrinsic vs. extrinsic, which property creates a stacking context), `PredictOutput` for cause-and-effect (a flex item with `flex-1` next to one with a fixed width, a grid item spanning two tracks), `CodeReview` for the canonical bugs (the unlayered z-index, the `space-y` that breaks on wrap, the `min-h-screen` instead of `min-h-dvh`, the `position: absolute` icon overlay missing the `relative` parent), and `MultipleChoice` for the senior reflex calls. Diagrams carry weight at five sites: a hand-authored SVG of the box model (content / padding / border / margin) with the `border-box` highlight in 4.4.1; an interactive widget with sliders for `flex-grow`, `flex-shrink`, `flex-basis`, `justify-content`, `align-items` over a row of three flex items in 4.4.3; a hand-authored SVG of grid lines, tracks, and areas (with `grid-template-areas` named) in 4.4.4; an interactive widget with a `position: sticky` header in a scrolling container that exposes the parent overflow / containment relationships in 4.4.7 and 4.4.8; and a hand-authored SVG showing the stacking-context tree (DOM tree on the left, stacking context tree on the right with the `transform: translateZ(0)` ancestor highlighted) in 4.4.9. The chapter ends with the student writing a header-main-aside-footer page shell using `grid-template-areas`, applying `min-h-dvh` for mobile, sticking the header with `sticky top-0`, and recognizing that the popover the design wants must portal out of the `transform`-having parent or it will sit behind the modal.

The chapter ordering follows the dependency: box model first (the intrinsic shape of every element), display modes second (the choice of layout primitive), flex third (the 1D primitive, taught with `gap`), grid fourth (the 2D primitive, taught with `gap` and named lines), sizing fifth (intrinsic vs. extrinsic, the `dvh` family, `aspect-ratio`), spacing sixth (the `gap`-vs-`space-x` decision and the `divide-*` cousin), position seventh (the four modes and the inset utilities), overflow eighth (modes, `overscroll-behavior`, scroll containment, the iOS bug), stacking context and z-index ninth (the trap that wraps the lessons together). The quiz closes the chapter.

---

## Lesson 4.4.1 — The box model, `box-sizing`, and the inline/block axis

Topics to cover:

- The chapter-opening senior question: the student writes `<div className="w-64 p-4 border">`, opens DevTools, hovers the element, and sees the box-model panel show `256 × {something}`. Is the `256` the content width, or does it include the padding and border? The naïve answer is "I don't know, it depends on `box-sizing`." The 2026 answer is "it includes them, because `box-sizing: border-box` is the project default — Preflight set it on `*, ::before, ::after` (Lesson 4.3.3). My `w-64` is the *outer* width; the content area is `256 - 32 (padding) - 2 (border) = 222px`." The lesson installs the box model in the form a 2026 senior reads it (border-box always), names the four boxes (content, padding, border, margin), explains why margin sits *outside* the box and what that means for collisions and centering, and folds in CSS logical properties as the modern axis-aware form.
- **The four boxes — content, padding, border, margin.** A short walkthrough of the model with the canonical SVG figure. Content is the inner box where text and child elements render. Padding is the space inside the border, between content and border, taking the background color and `background-image`. Border is the styled edge. Margin is the space outside the border, *transparent* (never carries background), and the only one of the four that participates in *margin collapse* between adjacent block siblings.
- **`box-sizing: border-box` vs. `content-box` — the 2026 default and the legacy form.** A short cash-in of Preflight's reset. With `content-box` (the W3C historical default), `width` measures *only content*; padding and border are added on top. `width: 200px; padding: 20px; border: 2px;` produces a `244px`-wide element. With `border-box`, `width` measures *content plus padding plus border*; the same declaration produces a `200px`-wide element with `156px` of content area. The 2026 form is `border-box` universally because layouts compose by addition (a sidebar `w-64` plus a main `flex-1` should sum to the parent's width without arithmetic gymnastics). Preflight ships `*, ::before, ::after { box-sizing: border-box }`. The senior recognition: the student doesn't write the rule, doesn't reach for `content-box`, and only encounters `content-box` when a third-party widget assumes it (a chart library that measures its own SVG; rare).
- **Tailwind's spacing scale — `--spacing` as one variable.** A short, concrete walkthrough of the v4 dynamic spacing model. Tailwind v4 declares `--spacing: 0.25rem` (4px at the default root font-size) on `:root` via Preflight. Every spacing utility — `p-4`, `m-8`, `gap-2`, `mt-1.5`, `space-y-6` — compiles to `var(--spacing) * n`. `p-4` is `calc(var(--spacing) * 4)`; `p-1.5` is `calc(var(--spacing) * 1.5)`. The senior recognition:
  - The whole spacing system scales by changing one variable in `@theme` (`--spacing: 0.5rem` doubles every spacing utility).
  - Arbitrary spacing values are still available (`p-[17px]`, `mt-[3.5rem]`) for the rare one-off, but the convention is to stay on the scale because consistency is the whole point of a token system.
  - The 4px-grid bedrock the design system rests on isn't a Tailwind invention — it's the convention every modern design system (Material, Carbon, Tailwind, shadcn) converged on, because 4px is the largest divisor that pixel-aligns at every common density.
- **Margin collapse — the surprise that bites once.** A short, concrete walkthrough. Adjacent block-level siblings' vertical margins collapse — the larger of the two wins, the smaller is absorbed. `<p>` with `margin-bottom: 24px` followed by `<p>` with `margin-top: 16px` produces `24px` of space between, not `40px`. A parent's margin can also collapse with its first/last child's margin if there's no padding, border, or content separating them (the "margin escapes the parent" surprise). The senior recognition in 2026: this almost never bites, because the 2026 reflex is `gap` on a flex/grid container, not vertical margins on siblings. When it does bite, the diagnosis is "you're using sibling margins for spacing — switch the parent to `flex flex-col gap-*`." The lesson names the rule but lands on the workaround being "don't use the pattern that triggers it."
- **The inline/block axis — logical properties as the modern form.** A short, concrete walkthrough. CSS now names the two box-model axes as *inline* (the text-flow direction — horizontal in English/most-LTR, horizontal in RTL, vertical in some Japanese setups) and *block* (perpendicular to inline — vertical in English, horizontal in vertical-text). The physical properties (`margin-left`, `padding-top`, `border-right`, `top`, `left`) are direction-blind; the logical properties (`margin-inline-start`, `padding-block`, `border-inline-end`, `inset-block-start`, `inset-inline-start`) flip with `direction: rtl` or `writing-mode: vertical-rl`.
- **Tailwind v4 logical utilities.** A concrete tour:
  - **`ps-*` / `pe-*`** — `padding-inline-start` / `padding-inline-end`. `ps-4` is `padding-left` in LTR, `padding-right` in RTL.
  - **`ms-*` / `me-*`** — `margin-inline-start` / `margin-inline-end`.
  - **`pt-*` / `pb-*`** stay physical (top/bottom), since the block axis usually maps to vertical and the physical names are clearer; the logical equivalents (`pbs-*` / `pbe-*` — padding-block-start/end) exist for the rare vertical-writing-mode case.
  - **`inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*`** — the new logical inset utilities (Tailwind v4.3+). They replaced the now-deprecated `start-*` / `end-*` shorthands so the whole API lines up consistently.
  - The senior recognition: in a project that will ship in Arabic or Hebrew, `ms-*` / `me-*` / `ps-*` / `pe-*` are the reflex from day one. In an LTR-only project, `ml-*` / `mr-*` are fine; the migration is mechanical when the i18n need shows up later.
- **Margin auto and centering — the one place margin still earns its weight.** A short, concrete walkthrough. `margin-inline: auto` (Tailwind: `mx-auto`) on a block element with a defined width centers it horizontally inside its parent — the browser distributes the leftover horizontal space equally between left and right margins. The canonical 2026 form: `<main className="mx-auto max-w-3xl">`. The senior recognition: this isn't a flex/grid replacement — it's the right tool for the page-content centering case where the parent is just `<body>` and there's no flex container in between. Every other centering in 2026 is `flex items-center justify-center` or `grid place-items-center` (Lessons 4.4.3 and 4.4.4).
- **The DevTools box-model panel.** A short tour. Hovering an element in the Elements panel shows a color-coded overlay — content (blue), padding (green), border (yellow), margin (orange). The Computed panel includes a box-model diagram with the four boxes and their values. The senior debugging move: when a layout is "off by a few pixels," open the box model on the suspect element, read the four numbers, recognize whether the issue is content size, padding, border, or margin. Three clicks.
- **The watch-outs a senior names:**
  - **`box-sizing` is set on `*, ::before, ::after` by Preflight; don't override.** A custom `*` rule that sets `box-sizing: content-box` breaks every utility-driven width calculation in the project.
  - **Margin collapse only happens between block-level siblings in the same flow.** Flex children and grid children don't collapse — flex/grid items are out of "normal flow" for the collapse algorithm. This is one more reason `gap` on a flex container "just works" while sibling-margin tricks don't.
  - **`outline` is not part of the box model.** Outline is drawn outside the border, doesn't take space, and doesn't participate in layout. The senior reach: `outline` is the canonical focus-ring tool because it doesn't shift the layout when applied (`focus-visible:outline-2 focus-visible:outline-ring`). Border-based focus rings shift layout and are the legacy form.
  - **Negative margins are still legal and occasionally the right tool.** The 2026 cases are narrow — extending an image flush to the edge of a padded container (`-mx-6 sm:-mx-8`), pulling a heading up against a hero edge. Otherwise, negative margins are a smell.
  - **`width: 100%` plus padding on a `content-box` element overflows.** The 2026 reflex: don't use `content-box`; the bug doesn't exist on the project default.

What this lesson does not cover:

- Display modes and how block/inline/flex/grid items interact with the box model differently (4.4.2 owns the display surface).
- Flexbox-specific item sizing (`flex-grow`, `flex-shrink`, `flex-basis`) — Lesson 4.4.3.
- Width / height / min-max / aspect-ratio — Lesson 4.4.5.
- Spacing inside containers (`gap`, `space-x`, `divide-x`) — Lesson 4.4.6.
- Position and inset (`top`, `left`, the inset utilities) — Lesson 4.4.7 (with logical insets cross-referenced from this lesson).
- The `writing-mode` property at depth — out of scope; the chapter names the inline/block axis and the logical utilities, and trusts the student to apply them when an RTL or vertical-writing project shows up.
- CSS containment (`contain: layout/paint/style/size`) — niche performance tool, not chapter material.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the model (four boxes, `border-box` default, the inline/block axis as the modern form) and the mechanics (the spacing scale, `mx-auto` for centering blocks, the logical utilities). The deliverable is muscle memory — the student writes `w-64 p-4 border` and knows the math; reads `padding-inline` and recognizes it as the RTL-safe form of `padding-left + padding-right`.

Open with the senior question — "what's the rendered width of `<div className=\"w-64 p-4 border\">`?" — and a `MultipleChoice` exercise pitting four answers (`290px` — wrong, that's the `content-box` math; `256px` — right, because Preflight set `border-box`; `222px` — wrong, that's the inner content width, not the rendered width; "depends on the parent" — wrong, `w-64` is extrinsic). The discrimination installs the `border-box` default.

A hand-authored SVG `Figure` renders the box model as four nested rectangles — content (the inner blue box, "your text/children render here"), padding (green ring, "background extends to here"), border (yellow ring, "the styled edge"), margin (orange ring, "transparent space outside, collapses with siblings"). A second pass annotates the same diagram with `box-sizing: content-box` (`width = content`) vs. `box-sizing: border-box` (`width = content + padding + border`), with the 2026 default highlighted.

A `Matching` exercise pairs eight Tailwind utilities with what they set — `p-4` (padding on all four sides, `var(--spacing) * 4`), `px-6` (padding-inline, both sides), `ps-4` (padding-inline-start, RTL-aware), `pt-2` (padding-top, physical), `mx-auto` (margin-inline auto, centers a block), `mt-8` (margin-top, physical), `border-y` (border on top and bottom), `outline-2` (outline, doesn't take layout space). The vocabulary locks in.

A `Buckets` exercise sorts twelve sizing-and-spacing decisions into "physical utilities (LTR-only project)" vs. "logical utilities (i18n-aware project)" vs. "centering pattern" vs. "flex/grid replaces this" — left padding for an icon (logical: `ps-*`), top margin between hero and main (physical: `mt-*` or replaced by `gap-*` on a parent), centering a 768px-wide article (`mx-auto max-w-3xl`), evenly spacing a row of three buttons (flex `gap-*` replaces sibling margin), padding the page gutter (physical/logical depending on RTL plan), space between the last item and the bottom of a list (gap on parent, not margin), the offset of an absolute-positioned badge (logical inset for RTL, physical for LTR), the spacing between sentences inside a paragraph (CSS `line-height`, not margin — recognition only). The decision tree locks in.

An interactive widget renders three side-by-side boxes, each with `width: 200px`, `padding: 20px`, `border: 2px`. A radio toggles `box-sizing: content-box` vs. `border-box`, and a label shows the rendered outer width per box. The student flips and watches the boxes resize. The cause-and-effect of `box-sizing` is concrete.

A `PredictOutput` exercise on four box-model scenarios:
1. `<div className="w-64 p-4 border">` — predict the rendered width (`256px`, the v4 `border-box` default).
2. `<p className="mt-6">` followed by `<p className="mt-4">` — predict the gap between them (`24px`, margin collapse — the larger wins).
3. `<div className="flex flex-col"><p className="mt-6">A</p><p className="mt-4">B</p></div>` — predict the gap (`24px + 16px = 40px`, no collapse inside flex; or "use `gap` instead" as the senior recognition).
4. `<div className="mx-auto max-w-3xl p-6">` inside `<body>` — predict the layout (centered horizontally, max 768px wide, 24px padding inside).

The student names each result and the rule that produced it.

A `CodeReview` exercise on a 30-line component layout with six issues:
- A custom `* { box-sizing: content-box }` rule overriding Preflight — fix: remove; the project default is correct.
- A list of six items spaced with `mb-4` on every item except the last — fix: `flex flex-col gap-4` on the parent.
- A `<main>` centered with `text-align: center` on `<body>` — fix: `<main className="mx-auto max-w-3xl">`.
- A focus ring implemented with `border-2 border-blue-500` causing layout shift on focus — fix: `outline-2 outline-blue-500` (no layout shift).
- A button using `mr-4` for spacing in a row that needs to be RTL-safe — fix: `me-4`.
- A negative-margin hack `-mt-8` on a child to escape a parent's padding — fix: restructure the parent (don't pad the slot the child wants to escape).

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a centered article — `<main className="mx-auto max-w-3xl px-6 py-12">` containing `<h1>` and a paragraph — and verify the rendered width equals the declared `max-w-3xl` on a wide viewport. The grader checks: `mx-auto` is present, `max-w-3xl` is set, `px-6` provides gutter, no margin tricks on the children.

Close with a `TrueFalse` round of six statements: "`box-sizing: border-box` is set by Preflight on every element" (true), "`width` includes padding and border in `content-box` mode" (false), "Margin collapse happens between flex children" (false), "`mx-auto` centers a block element only when it has a defined width" (true), "`ps-4` becomes `padding-right` in an RTL document" (true), "`outline` takes layout space the same way `border` does" (false). The model is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for every later lesson in the chapter (every layout uses the box model), Chapter 4.5.4 (focus-ring patterns with `outline`), Chapter 4.11.2 (the WCAG focus-visible baseline), and Chapter 4.12 (the project chapter where the gutter, max-width, and centering pattern ship).

---

## Lesson 4.4.2 — Display modes: block, inline, flex, grid, contents

Topics to cover:

- The senior question: the student writes `<span className="w-64 p-4">Hello</span>` and the width and padding-top don't apply (or the padding overlaps the line above). They reach for `<div>` and everything works. What just changed? The naïve answer is "spans are inline, divs are block." The 2026 answer names the *display mode* as the property that decides which box-model rules apply, which sizing utilities work, and how the element relates to its siblings. The lesson installs the display modes the student will reach for (`block`, `inline-block`, `flex`, `grid`, `inline-flex`, `inline-grid`, `contents`, `none`), names the ones that are recognition vocabulary (`inline`, `table`, `list-item`, `flow-root`), and frames the choice as a decision: pick `flex` for a row or column, `grid` for a 2D structure, `block` for stacking content, `inline` for in-text spans, `contents` for the rare unwrapping case.
- **Block vs. inline — the model the rest builds on.** A short, concrete walkthrough.
  - **Block elements** start on a new line, extend to fill the parent's inline axis (full width by default), and accept all box-model properties (`width`, `height`, `padding`, `margin`, `border`). Default for `<div>`, `<p>`, `<h1>`-`<h6>`, `<section>`, `<article>`, `<main>`, `<header>`, `<footer>`, `<ul>`, `<ol>`, `<li>`, `<form>`, `<fieldset>`.
  - **Inline elements** flow with text, take only the space their content needs, ignore explicit `width` and `height`, accept horizontal padding/margin (which add to the line) but vertical padding/margin (which visually overlap surrounding content). Default for `<span>`, `<a>`, `<strong>`, `<em>`, `<code>`, `<small>`, every text-level element.
  - **Inline-block** is the bridge — flows with text like inline (sits next to other inline elements on the same line), but accepts width and height like block. The 2026 reach: rare. A `<span className="inline-block w-2 h-2 rounded-full bg-current">` for a status dot in a row of text is the canonical case. Most other "I want a width on a span" cases want `flex` on the parent instead.
- **Flex and inline-flex — the 1D primitive.** A short cash-in. `display: flex` makes the element a flex container (children become flex items, laid out on a row by default, with the box-model and gap utilities cooperating). `inline-flex` is the same except the container itself is inline (flows with text); the children inside are still flex items. The 2026 reach for `inline-flex`: a button or pill that contains an icon and text — `<button className="inline-flex items-center gap-2">` so the icon-and-text composition aligns inside a row of inline content (an inline label or a sentence). Lesson 4.4.3 owns the flex algorithm at depth.
- **Grid and inline-grid.** A short cash-in. `display: grid` makes the element a grid container; children become grid items. `inline-grid` is the inline-flowing equivalent — much rarer than `inline-flex`, but available for the case where a small grid composition needs to flow in a sentence. Lesson 4.4.4 owns grid at depth.
- **`display: contents` — the unwrapper.** A short, concrete walkthrough. The element disappears from the layout tree (it doesn't generate a box), but its children participate in the parent's layout as if the wrapping element weren't there. The 2026 reach is narrow but specific:
  - **Semantic wrappers that shouldn't break a flex/grid layout** — `<section className="contents">` around a group of cards in a flex container so the cards stay flex items but the `<section>` adds semantic grouping for screen readers.
  - **Component composition where a wrapper element is a structural artifact** — a React component that renders `<>` (Fragment) is the JSX-level form; `display: contents` is the CSS-level form for cases where a real DOM element is needed but its layout box is unwanted.
  - The watch-out: `display: contents` historically broke accessibility (the element disappeared from the accessibility tree too); modern browsers fixed this for most semantic elements (`<section>`, `<nav>`, `<main>`), but the bug still bites for some elements and screen-reader combinations. The senior reach: use it when needed, test with screen readers, prefer Fragments at the React level when possible.
- **`display: none` vs. `visibility: hidden` vs. `aria-hidden` — the three "hide" mechanisms.** A short, concrete walkthrough.
  - **`display: none`** removes the element from the layout tree and the accessibility tree. No box, no space, not announced by screen readers, not focusable (children with `tabindex` are skipped). The senior reach: hiding content that genuinely shouldn't exist in the current state (a closed dialog, an unmounted route).
  - **`visibility: hidden`** keeps the layout box (the space is reserved) but makes the element invisible. Removed from the accessibility tree, not focusable. The 2026 reach: rare; the case is "I want the space reserved but not show the content," which is usually a layout problem solved with grid sizing.
  - **`aria-hidden="true"`** removes the element from the accessibility tree only; the element is still visible and focusable. The senior reach: decorative content that's visible but shouldn't be announced (an icon next to a label that already says the same thing). Cross-reference to Chapter 4.11.3.
  - The decision tree: hiding for state changes → conditional rendering or `display: none`; hiding visually but keeping for assistive tech → `sr-only` utility (Tailwind ships it; absolute-positioned, 1px, clipped); hiding for assistive tech but keeping visually → `aria-hidden`.
- **The default-display reset — Preflight doesn't change defaults.** A short note. Preflight resets *defaults that surprise on a 2026 stack* (margins, headings, lists), but it doesn't change `display` defaults. `<div>` is still `block`, `<span>` is still `inline`, `<button>` is still `inline-block` (with browser-specific quirks). The senior recognition: when the student wants a `<button>` to be `flex` (because it contains an icon and text), they write `flex` (or `inline-flex`) on the button; Preflight didn't do it for them.
- **Tailwind utility coverage.** A short tour: `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`, `contents`, `hidden` (= `display: none`), `flow-root` (creates a new block formatting context — recognition only), `table`, `table-row`, `table-cell` (for the rare case where genuine tabular layout is right). Tailwind also ships responsive variants: `md:flex`, `lg:grid`, `hidden md:block` (the canonical "hide on mobile, show on desktop" — though Lesson 4.5.6 owns responsive design at depth).
- **The watch-outs a senior names:**
  - **`<button>` defaults to `inline-block` but with content alignment quirks across browsers.** The senior reach for buttons containing icons + text is `inline-flex items-center gap-2` so alignment is explicit.
  - **`display` doesn't change semantics.** A `<div className="flex">` is still a `<div>` to assistive tech — no role, no landmark. Use the right element first, then the display utility.
  - **`hidden` (Tailwind utility) compiles to `display: none`.** It's not an HTML attribute. Reading a className for "hidden" means the element is gone from layout; reading an HTML `hidden` attribute (which exists too) does the same — Preflight doesn't override the HTML attribute. They're equivalent in effect.
  - **`display: contents` and CSS layout containers — the inheritance subtlety.** A `<div className="flex">` with a `<section className="contents">` child has the section's children as flex items, not the section itself. Useful and intentional, but easy to forget when scanning a tree.
  - **Floats and clears are gone.** `float-left`, `float-right`, `clear-*` utilities still exist in Tailwind for the rare case (text wrapping around an image, the only legitimate 2026 use). Multi-column layouts via floats are dead.

What this lesson does not cover:

- Flexbox at depth (`flex-direction`, `flex-grow`, `justify-content`, `align-items`, etc.) — Lesson 4.4.3.
- Grid at depth — Lesson 4.4.4.
- `sr-only` and the visually-hidden pattern — Chapter 4.11.3.
- Responsive variants (`md:flex`, `lg:grid`) at depth — Lesson 4.5.6.
- The semantic-element choice (when to write `<section>` vs `<div>`) — Chapter 4.1.3 owns it; this lesson assumes it.
- Tables for actual tabular data — Chapter 4.1.6.
- `position` (which overrides participation in normal flow but not `display`) — Lesson 4.4.7.

Pedagogical approach:

Decision archetype with a quick mechanics tour. The lesson installs the choice (which display mode for which job) and the recognition vocabulary (the modes the student will see in code reviews and DevTools). The deliverable is a reflex — when the student needs a row of items, they write `flex`; when they need a 2D structure, they write `grid`; when they need a status dot in a sentence, they write `inline-block`; otherwise, the element type's default does the right thing.

Open with the senior question — "you wrote `<span className=\"w-64 p-4\">` and the width didn't apply; what changed when you switched to `<div>`?" — and a `MultipleChoice` exercise pitting four answers (Tailwind utilities don't apply to spans — wrong; `<span>` defaults to `display: inline`, which ignores `width` and `height` — right; the span needs `position: relative` to accept dimensions — wrong; the parent's `display` mode overrides the child's — wrong). The discrimination installs `display` as the rule.

A `Matching` exercise pairs ten elements with their default display — `<div>` (block), `<span>` (inline), `<a>` (inline), `<button>` (inline-block), `<img>` (inline by spec, block by Preflight), `<p>` (block), `<li>` (list-item), `<table>` (table), `<input>` (inline-block), `<h1>` (block). The vocabulary locks in.

A `Buckets` exercise sorts twelve layout problems into "use `flex`" vs. "use `inline-flex`" vs. "use `grid`" vs. "use `block` (default)" vs. "use `inline-block`" vs. "use `contents`" vs. "use `hidden` / conditional render" — a horizontal nav with logo and links (flex), a button with icon and text inline in a sentence (inline-flex), a 3-column card grid (grid), a paragraph of body text (block — default, no utility needed), a status dot in the middle of a label (inline-block), a semantic `<section>` wrapper that shouldn't disrupt a flex layout (contents), the closed state of a dialog (hidden / not rendered), a row of action buttons (flex), a stats dashboard with named areas (grid), a `<small>` text annotation in a sentence (inline — default), a sidebar that's only visible on desktop (hidden md:block), an icon overlapping the corner of a card (block on a `relative` parent with `absolute` positioning — recognition only, Lesson 4.4.7 owns it).

An interactive widget renders six small cards labeled "div," "span," "p," "button," "img," "section." Sliders set `display` (block / inline / inline-block / flex / grid / contents / none) and `width: 200px / height: 100px / padding: 20px` toggles. The student watches each element's layout change as the display mode flips — the span ignores width when inline, accepts it when inline-block, becomes a flex container when flex. The cause-and-effect is concrete.

A `PredictOutput` exercise on four scenarios:
1. `<span style="width: 200px; height: 100px; background: red">A</span>` — predict the visible box (text-sized red, width and height ignored — inline default).
2. Same span with `style="display: inline-block; ..."` — predict (200×100 red box that flows with surrounding text).
3. `<div className="flex"><section className="contents"><div>A</div><div>B</div></section></div>` — predict the layout (A and B are flex items of the outer div, the section is invisible in layout).
4. `<button className="hidden md:flex items-center gap-2">` on a 1024px-wide viewport — predict (visible, flex with items aligned and a 2-unit gap).

The recognition of display modes is concrete.

A `CodeReview` exercise on a 25-line component with five issues:
- A `<span>` styled with `w-full h-12` and ignored — fix: use `<div>` or `inline-block`, or restructure.
- A `<button>` with an icon and label, the icon mis-aligned vertically — fix: `inline-flex items-center gap-2`.
- A semantic `<section>` wrapper inside a `flex` container disrupting the layout — fix: `display: contents` on the section, or restructure.
- A "hidden on mobile" element using `visibility: hidden` and reserving space — fix: `hidden md:block` (display: none reclaims the space).
- A status dot styled as `<div>` causing a line break in a row of text — fix: `inline-block` on the dot or restructure the parent to flex.

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of five statements: "`<button>` defaults to `display: block`" (false — inline-block), "`display: contents` removes the element's box but keeps its children in layout" (true), "`display: none` keeps the element in the accessibility tree" (false), "`inline-flex` is the right reach for a button with icon and text inside a sentence" (true), "Tailwind's `hidden` utility is the same as the HTML `hidden` attribute" (true — both become `display: none`). The model is locked in.

Estimated student time: 30 to 40 minutes. Load-bearing for Lessons 4.4.3, 4.4.4 (which cash in `flex` and `grid` at depth), Chapter 4.11.3 (`sr-only` and `aria-hidden`), and every later layout that picks a display mode.

---

## Lesson 4.4.3 — Flexbox: the 1D layout primitive

Topics to cover:

- The senior question: the student needs a horizontal nav — logo on the left, three links in the middle, a sign-in button on the right. They reach for `display: grid` and start defining template columns. The 2026 answer is `flex items-center justify-between` — flex is the 1D primitive, the row needs no track definition, and `justify-between` distributes the leftover space exactly as the design wants. The lesson installs the flex algorithm in the form a 2026 senior reads it: flex container → main and cross axes → item growing, shrinking, and basis → alignment on both axes → `gap` for spacing, never margin tricks. The 2026 reach for flex is "rows and columns of variable-content items where the algorithm distributes leftover space."
- **The flex container — `display: flex` and the two axes.** A short, concrete walkthrough. `display: flex` makes an element a flex container; its direct children become flex items. The container has two axes:
  - **Main axis** — the direction items are laid out. Default: row (left to right in LTR; logical, follows `direction`). Switch with `flex-direction: column` (Tailwind: `flex-col`) to stack vertically.
  - **Cross axis** — perpendicular to main. For a row, cross is vertical; for a column, cross is horizontal.
  - The senior recognition: every flex property is named for one of the two axes. `justify-*` works on the main axis; `items-*` and `align-*` work on the cross. The student names the axis first, picks the property second.
- **`flex-direction` — `row`, `column`, and the `-reverse` cousins.** A short tour. `flex-row` (Tailwind default for `flex`), `flex-col`, `flex-row-reverse`, `flex-col-reverse`. The reverse cases are rare and worth recognition only — most "I want the items in the other order" cases are better solved by changing the source order or using `order: -1` on the one item that needs to move (cross-reference: `order` is the senior reach when source-order changes are inappropriate, e.g., for a11y reasons).
- **`flex-wrap` — when items wrap to the next line.** A short tour. Default: `nowrap` (items shrink to fit on one line, possibly overflowing). `flex-wrap` makes items wrap onto multiple lines when the row fills up. The senior reach: nav items that should wrap on small viewports (`flex flex-wrap items-center gap-4`), tag pills that should wrap to the next row instead of overflowing (`flex flex-wrap gap-2`). The watch-out: when items wrap, `gap` between rows becomes the cross-axis gap (the row-gap of the wrapped lines).
- **Item sizing — `flex-grow`, `flex-shrink`, `flex-basis`, and the `flex` shorthand.** A short, concrete walkthrough.
  - **`flex-basis`** — the item's initial main-axis size *before* growing or shrinking. Default: `auto` (the item's content size or its `width`/`height`). The 2026 reach: `flex-basis` is rarely set explicitly; the item's `width` or `min-width` is usually clearer, and the basis defaults to that.
  - **`flex-grow`** — how aggressively the item claims leftover main-axis space. Default: `0` (don't grow). A value of `1` means "take all leftover space"; equal values across siblings split equally; different values weight the split. Tailwind: `flex-1` (`flex: 1 1 0%`), `grow` (`flex-grow: 1`), `grow-0` (don't grow), arbitrary `grow-[2]` for the rare weighted split.
  - **`flex-shrink`** — how willingly the item gives up main-axis space when the row overflows. Default: `1` (shrink proportionally). `flex-shrink: 0` (`shrink-0`) freezes the item at its basis size — the canonical reach for sidebars and fixed-width avatars in a flex row.
  - **The `flex` shorthand** — `flex: <grow> <shrink> <basis>`. The 2026 form is one of three values: `flex-1` (grow 1, shrink 1, basis 0%) for "take available space, share equally with other `flex-1` siblings"; `flex-auto` (grow 1, shrink 1, basis auto) for "take available space but respect content size"; `flex-none` (grow 0, shrink 0, basis auto) for "don't grow, don't shrink, content size only." The senior reflex: pick the named shorthand; rarely write the three values separately.
- **Alignment on the main axis — `justify-content`.** A short tour with the canonical Tailwind names: `justify-start` (default), `justify-end`, `justify-center`, `justify-between` (space between items, no edge space), `justify-around` (space around each item, half-edge space), `justify-evenly` (equal space everywhere). The 2026 reach for the canonical layouts:
  - **Header with logo on left, links on right** — `flex items-center justify-between`.
  - **Centered button row** — `flex items-center justify-center gap-4`.
  - **Toolbar with grouped clusters** — `flex items-center gap-4` plus a `flex-1` spacer between clusters.
- **Alignment on the cross axis — `align-items` and `align-self`.** A short tour. `items-stretch` (default — items fill the cross axis), `items-start`, `items-end`, `items-center`, `items-baseline` (align text baselines — the senior reach when items have different font sizes and the type should align). `align-self` overrides for one item — `self-end` on a single item in an otherwise-centered row.
- **Cross-axis alignment for multi-line containers — `align-content`.** A short note. When `flex-wrap` is on and items wrap onto multiple lines, `align-content` controls the spacing of the *lines* on the cross axis: `content-start`, `content-end`, `content-center`, `content-between`, `content-around`, `content-evenly`. The senior reach: rarely needed; `gap-y-*` on a wrapping flex container usually does the right thing.
- **`gap` — the senior default for spacing flex items.** A short, load-bearing cash-in. Every flex container with multiple items uses `gap-*` for spacing. `gap-4` adds `var(--spacing) * 4` between every pair of adjacent items, on both axes when the container wraps. Two-axis variants: `gap-x-4` (main-axis gap), `gap-y-2` (cross-axis gap, applies when items wrap). The senior recognition: `gap` doesn't add space outside the container (no leading/trailing space, unlike margins on every child); it's exactly the spacing between items, which is what 95% of layouts want.
- **`place-content` — the shorthand for `align-content` and `justify-content`.** A short note. Tailwind: `place-content-center`, `place-content-between`. The 2026 reach: rare for flex (the algorithm is 1D); useful for grid (Lesson 4.4.4).
- **The canonical flex layouts a senior reaches for.** A concrete tour with code:
  ```jsx
  // Horizontal nav
  <header className="flex items-center justify-between gap-4 px-6 py-4">
    <Logo />
    <nav className="flex items-center gap-6"><a>Home</a><a>Pricing</a><a>Docs</a></nav>
    <SignInButton />
  </header>

  // Form-row with label and input filling remaining space
  <div className="flex items-center gap-3">
    <label htmlFor="email" className="shrink-0">Email</label>
    <input id="email" className="flex-1" />
  </div>

  // Stack of cards (a column)
  <div className="flex flex-col gap-4">
    {cards.map(card => <Card key={card.id} {...card} />)}
  </div>

  // Toolbar with left and right clusters
  <div className="flex items-center gap-4">
    <button>Save</button>
    <button>Discard</button>
    <div className="flex-1" /> {/* spacer */}
    <button>Settings</button>
  </div>

  // Card with header, content, and footer pinned to bottom
  <article className="flex flex-col h-full">
    <header>...</header>
    <main className="flex-1">...</main>
    <footer>...</footer>
  </article>
  ```
  The senior recognition: these five patterns cover most production flex layouts. Each one names the main axis (`flex` for row, `flex-col` for column), the cross-axis alignment (`items-center` is the most common), the spacing (`gap-*`), and the item sizing (`flex-1` for the stretchable child, `shrink-0` for the fixed one).
- **DevTools — the flex overlay.** A short tour. Chrome and Firefox both expose a button next to every `display: flex` element in the Elements panel — clicking it overlays the container with a colored highlight showing the main and cross axes, the gaps, and the item bounds. The senior debugging move: when alignment looks wrong, toggle the overlay; the axis labels and the gap regions show whether the issue is justify, align, or gap.
- **The watch-outs a senior names:**
  - **`flex-1` collapses an item's intrinsic min-width.** A `<input className="flex-1">` inside a flex row can shrink below the input's content width on overflow because flex items have a default `min-width: auto` but `flex-1` sets it to `0`. Add `min-w-0` (or `min-w-fit`) when the item's content matters. This is the most common flex-related layout bug in 2026.
  - **`gap` works in flex now — universally.** No browser the course targets needs the `space-x-*` fallback. The student writes `gap-*` always.
  - **`align-items` doesn't work the way you think on a row of mixed-baseline content.** `items-baseline` aligns text baselines (the canonical fix for a row containing a large heading and a small label that should sit on the same line). `items-center` centers the box, which often visually misaligns text.
  - **Items shrink by default — set `shrink-0` on items that shouldn't.** A logo image, a fixed-width sidebar, an avatar — anything whose width is the design.
  - **Reverse `flex-row-reverse` reverses *visual* order, not source order.** Keyboard tab order follows source. The senior reach: never use `*-reverse` for layouts that need to be navigable in a specific order; use `order` on the one item that needs to move and document why.
  - **`justify-between` with one child has no effect.** If the design wants "this on the left, this on the right" and one of the two might be missing, pre-render an empty spacer or restructure.
  - **Implicit minimum sizes on `<img>` and form elements** — they have default min-content widths that can blow out a flex row. `min-w-0` on the parent or on the image itself, or constrain via `max-w-*`.

What this lesson does not cover:

- Grid at depth (4.4.4).
- Sizing utilities (`w-*`, `h-*`, `max-w-*`, `aspect-*`) — Lesson 4.4.5 (cross-referenced lightly here).
- The `gap` decision vs. `space-x` / margin tricks — Lesson 4.4.6 owns the comparison; this lesson assumes `gap` as the default.
- Responsive variants for flex direction (`md:flex-row`) — Lesson 4.5.6.
- Animation of layout properties — Chapter 4.5.5.
- The relationship between flex items and `position: absolute` children — recognition only; Lesson 4.4.7 owns positioning.

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson installs the model (main and cross axes, growing/shrinking/basis, alignment on both axes, `gap`) and the canonical patterns (the five layouts every SaaS UI repeats). The deliverable is fluency — the student writes `flex items-center justify-between gap-4` for a header without thinking, and recognizes `flex-1` and `shrink-0` as the two reach-for item utilities.

Open with the senior question — "you need a horizontal nav with logo on the left and links on the right; what's the 2026 reach?" — and a `MultipleChoice` pitting four answers (`grid grid-cols-[auto_1fr_auto]` — workable but overkill for 1D; `flex items-center justify-between` — right; floats with clearfix — legacy; `position: absolute` for the right cluster — never the answer). The discrimination installs flex as the 1D default.

A hand-authored SVG `Figure` renders a flex container with five items, the main axis labeled with a horizontal arrow, the cross axis with a vertical arrow, `justify-content: space-between` shown as labels at the gaps, `align-items: center` shown as a horizontal centerline through the items. A second pane shows the same container with `flex-direction: column`, the axes flipping. The model is concrete.

An interactive widget renders three flex items in a row; sliders control `flex-grow` (0 to 4), `flex-shrink` (0 to 4), `flex-basis` (0 to 200px), `gap` (0 to 32px), `justify-content` (start / center / between / around / evenly), `align-items` (start / center / end / stretch / baseline). The student moves a slider, watches the items resize and reflow. A side-panel shows the corresponding Tailwind classes (`flex-1`, `gap-4`, `justify-between`, `items-center`). The cause-and-effect of every flex property is concrete.

A `Matching` exercise pairs ten Tailwind utilities with their CSS — `flex` (`display: flex`), `flex-1` (`flex: 1 1 0%`), `flex-auto` (`flex: 1 1 auto`), `flex-none` (`flex: none`), `shrink-0` (`flex-shrink: 0`), `items-center` (`align-items: center`), `justify-between` (`justify-content: space-between`), `flex-col` (`flex-direction: column`), `gap-4` (`gap: var(--spacing) * 4`), `items-baseline` (`align-items: baseline`).

A `Buckets` exercise sorts ten layout patterns into "row of equal-width items" (`flex` + `flex-1` on each), "row with one stretchy and one fixed" (`flex` + `flex-1` on stretchy + `shrink-0` on fixed), "stack of items with equal spacing" (`flex flex-col gap-*`), "centered cluster" (`flex items-center justify-center gap-*`), "header with two clusters" (`flex items-center justify-between`), "wrapping pills" (`flex flex-wrap gap-*`), "form row label + input" (`flex items-center gap-* + shrink-0 on label + flex-1 on input`), "card with footer pinned to bottom" (`flex flex-col` + `flex-1` on main), "split with spacer" (`flex` + `flex-1` empty div between clusters), "row aligned by text baseline" (`flex items-baseline`).

A `PredictOutput` exercise on four flex scenarios:
1. `<div className="flex gap-4"><div className="flex-1">A</div><div className="w-32">B</div></div>` in a 400px parent — predict (A is `400 - 16 - 128 = 256px`, B is 128px, gap is 16px).
2. `<div className="flex items-baseline gap-2"><h1 className="text-3xl">Title</h1><span className="text-sm">subtitle</span></div>` — predict (text baselines align, not box centers).
3. `<input className="flex-1" />` in a flex row with overflowing content — predict (input shrinks below content width because `flex-1` sets `min-width: 0`; needs `min-w-0` or `min-w-fit` recognition).
4. `<div className="flex flex-col h-screen"><header>A</header><main className="flex-1">B</main><footer>C</footer></div>` — predict (A is content-height at top, C is content-height at bottom, B fills the remaining space).

A `CodeReview` exercise on a 30-line page header component with six issues:
- A row of buttons spaced with `mr-4` on every-but-last — fix: `gap-4` on the parent.
- A logo image without `shrink-0` getting compressed when the nav is narrow — fix: `shrink-0`.
- Vertical alignment via `mt-1` on the smaller text element instead of `items-baseline` — fix: `items-baseline` on the parent.
- A `<input className="flex-1">` shrinking below its placeholder when the parent overflows — fix: `min-w-0` or restructure.
- A "spacer" implemented as `mx-auto` on one item instead of `flex-1` on an empty `<div />` — fix: explicit spacer.
- A `flex-row-reverse` for visual right-alignment that broke keyboard tab order — fix: `justify-end` or restructure source.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a card layout — a `<article>` with `flex flex-col h-full`, a `<header>` and `<footer>` with content height, a `<main className="flex-1">` that fills the middle and pushes the footer to the bottom regardless of content length. The grader checks: the article is `flex flex-col`, the main is `flex-1`, the footer is at the bottom for both short and long content.

Close with a `TrueFalse` round of six statements: "`flex-1` sets `min-width: 0` on the item, which can shrink it below content size" (true — the canonical bug), "`gap` only works in grid, not flex" (false — works in both since 2021+), "`items-center` aligns the box centers; `items-baseline` aligns text baselines" (true), "`flex-row-reverse` reverses keyboard tab order" (false — it reverses visual only), "`shrink-0` is the senior reach for items whose width is the design" (true), "`justify-between` places the first item flush left and the last flush right with equal space between others" (true). The model is locked in.

Estimated student time: 55 to 70 minutes. Load-bearing for every later layout (most rows in the project chapter use flex), Chapter 4.6.5 (modal layouts), Chapter 4.11 (every shadcn component composes flex internally), and the project chapter (4.12.3, 4.12.4, 4.12.5).

---

## Lesson 4.4.4 — Grid: the 2D layout primitive

Topics to cover:

- The senior question: the student needs a card grid — three columns on desktop, two on tablet, one on mobile, with consistent gaps and items that wrap based on viewport. They reach for `flex flex-wrap` and end up with cards of varying widths because flex items shrink to content. The 2026 answer is `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Grid is the 2D primitive — it defines tracks (columns and rows), and items snap into them. The lesson installs the grid algorithm in the form a 2026 senior reaches for: explicit columns and rows, named template areas for page shells, `auto-fit` and `minmax` for responsive cards-without-media-queries, and `subgrid` for nested alignment.
- **The grid container — `display: grid` and the explicit-track model.** A short, concrete walkthrough. `display: grid` makes the element a grid container. Children become grid items, automatically placed into the next available cell unless they specify a placement. The container defines tracks via `grid-template-columns` and `grid-template-rows` (or both as `grid-template`). Tracks are sized with one of: a fixed length (`200px`), a flex unit (`1fr` — one fraction of the available space), a content-based keyword (`auto`, `min-content`, `max-content`, `fit-content(<size>)`), or `minmax(<min>, <max>)` for responsive ranges.
- **The `fr` unit — the senior default for flexible columns.** A short cash-in. `1fr` means "one fraction of the leftover space after fixed and content-sized tracks are subtracted." A three-column grid `grid-template-columns: 200px 1fr 1fr` gives the first column 200px, then splits the remaining horizontal space equally between the other two. The 2026 reach: `1fr` is the right default for "this column should grow with the container"; mix `1fr` with fixed sizes for sidebar layouts (`grid-template-columns: 240px 1fr` for a sidebar + main).
- **Tailwind grid utilities — the canonical surface.** A short tour:
  - **`grid grid-cols-3`** — three equal columns (compiles to `grid-template-columns: repeat(3, minmax(0, 1fr))`).
  - **`grid-cols-[200px_1fr]`** — arbitrary template (the bracket form for non-uniform tracks).
  - **`grid-rows-3`** — three equal rows.
  - **`gap-6`** — the same gap utility flex uses, here applied to grid (works on both axes; `gap-x-*` and `gap-y-*` for asymmetric).
  - **`col-span-2`**, **`row-span-2`** — item spans multiple tracks. The senior reach: highlight cells in a feature grid by spanning two columns.
  - **`col-start-2`**, **`col-end-4`** — explicit placement by line index. Cross-references to named lines (below).
  - **`grid-flow-col`** / **`grid-flow-row`** / **`grid-flow-dense`** — auto-placement direction; `dense` packs items into earlier cells when later items would skip them (rare, niche).
  - **`auto-cols-fr`**, **`auto-rows-min`** — sizing for implicit tracks (tracks created when items overflow the explicit grid). The senior reach: paired with a known column count and unknown row count.
- **Responsive grids without media queries — `repeat(auto-fit, minmax(...))`.** A short, concrete walkthrough. The pattern: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`. Auto-fit creates as many tracks as fit in the container, each at least 280px wide and at most 1fr. The result: a card grid that goes 1 column on a 280px viewport, 2 columns on 560px, 3 columns on 840px, all without writing media queries. Tailwind: `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]` (the bracket form). The 2026 reach: when the design is "however many cards fit, with a minimum size each," this is the right reach. When the design is "exactly N columns at each breakpoint," responsive variants (`md:grid-cols-2 lg:grid-cols-3`) are the right reach.
- **`grid-template-areas` — named regions for page shells.** A short, concrete walkthrough. The senior reach for a header-sidebar-main-footer page shell:
  ```jsx
  <div className="grid grid-cols-[240px_1fr] grid-rows-[auto_1fr_auto] grid-areas-[header_header,sidebar_main,footer_footer] min-h-dvh">
    <header className="area-header">...</header>
    <aside className="area-sidebar">...</aside>
    <main className="area-main">...</main>
    <footer className="area-footer">...</footer>
  </div>
  ```
  Tailwind v4 ships `grid-areas-*` and `area-*` utilities for declarative naming. The senior recognition: the template is readable as ASCII art (`header header / sidebar main / footer footer`), the items reference the area name, and the structure rearranges with a single template change for mobile (`grid-areas-[header,sidebar,main,footer]` for stacked).
- **`subgrid` — when nested grids should align.** A short, concrete walkthrough. By default, a nested grid is its own grid; its tracks don't align with the parent's. `grid-template-columns: subgrid` (Tailwind: `grid-cols-subgrid`) makes the child's columns match the parent's. The 2026 reach: a card grid where each card has its own grid for header / image / body / footer, and you want every card's header row to align horizontally across the row regardless of header content length. The student writes `grid-cols-subgrid col-span-3` on the inner grid; the heading row aligns. Without subgrid, alignment-across-cards needs flexbox tricks or fixed heights.
- **`place-items` and `place-content` — the grid-friendly alignment shorthands.** A short tour. For grid containers:
  - **`place-items-center`** — shorthand for `align-items: center; justify-items: center`. Centers each item inside its own cell.
  - **`place-content-center`** — centers the entire grid inside the container (when tracks don't fill the container).
  - **`place-self-end`** — overrides on a single item.
  - The 2026 reach: `place-items-center` on a grid with one item is the most concise centering pattern in CSS — `<div className="grid place-items-center min-h-dvh">` perfectly centers a child both horizontally and vertically.
- **Item placement — explicit lines, named lines, spans.** A short tour. Items can be placed by:
  - **Span count** — `col-span-2` (item spans two columns starting from auto-placement).
  - **Explicit line numbers** — `col-start-1 col-end-3` or `col-start-1 col-span-2`.
  - **Named lines** — `grid-template-columns: [start] 1fr [main-start] 2fr [main-end] 1fr [end]`; items reference `col-start-[main-start]`. Tailwind supports the bracket form.
  - The senior reach: span counts cover most cases. Named lines are useful for complex page shells where the line names match the layout language ("main-start," "sidebar-end").
- **The canonical grid layouts a senior reaches for.** A concrete tour:
  ```jsx
  // Card grid, fixed columns at breakpoints
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {cards.map(card => <Card key={card.id} {...card} />)}
  </div>

  // Card grid, auto-fit (no breakpoints needed)
  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
    {cards.map(card => <Card key={card.id} {...card} />)}
  </div>

  // Page shell with sidebar
  <div className="grid grid-cols-[240px_1fr] grid-rows-[auto_1fr_auto] min-h-dvh">
    <header className="col-span-2">...</header>
    <aside>...</aside>
    <main>...</main>
    <footer className="col-span-2">...</footer>
  </div>

  // Centered hero
  <section className="grid place-items-center min-h-dvh">
    <Hero />
  </section>

  // Stats dashboard with a featured card
  <div className="grid grid-cols-3 gap-4">
    <Card className="col-span-2 row-span-2">{/* featured */}</Card>
    <Card>{/* small */}</Card>
    <Card>{/* small */}</Card>
  </div>
  ```
  The senior recognition: these five patterns cover most production grid layouts. Each one names the tracks (`grid-cols-*`, `grid-rows-*`), the gap, and the item placement.
- **DevTools — the grid overlay.** A short tour. The Elements panel exposes a "grid" badge next to every grid container; clicking it overlays the container with a colored highlight showing track lines, line numbers, gap regions, and named areas. A side-panel in Chrome's "Layout" tab lets the student toggle line numbers, line names, and area names independently. The senior debugging move: when an item isn't where it should be, toggle the overlay; the line numbers tell whether the issue is the placement or the track definition.
- **Flex vs. grid — the decision.** A short, opinionated tour:
  - **Reach for flex when:** the layout is one-dimensional (a row or a column), items have variable content widths and the algorithm should distribute leftover space, alignment is along one axis primarily, the structure is "items in a row" not "items in a structure."
  - **Reach for grid when:** the layout is two-dimensional (rows and columns matter), items snap into a defined structure (a card grid, a page shell), tracks should be aligned across siblings (subgrid), or the design wants exact column counts at breakpoints.
  - **Use both:** the page shell is grid; the cards inside are each flex (header / body / footer); the row inside the card body is flex. The 2026 SaaS UI is usually a grid of flex compositions.
- **The watch-outs a senior names:**
  - **`grid-template-columns: repeat(3, 1fr)` overflows on narrow viewports.** The default behavior is "force 3 equal columns even if content overflows." The senior fix is `repeat(3, minmax(0, 1fr))` (Tailwind's `grid-cols-3` already does this) so columns can shrink below content width.
  - **`gap` in grid is the row-and-column gap, no manual track-spacing tricks.** Don't fall back to per-item margin; the fix is `gap-*`.
  - **`auto-fit` vs. `auto-fill` — both create as many tracks as fit; `auto-fit` collapses empty tracks; `auto-fill` keeps them.** The 2026 reach is `auto-fit` for cards (collapsed empty tracks let remaining items expand to fill); `auto-fill` is rare.
  - **`col-span-3` in a 2-column grid.** The item is clamped to the available columns; doesn't overflow into a new track unless explicit-line placement forces it.
  - **`grid-flow-dense` reorders items visually but not in source.** Same a11y caveat as `flex-row-reverse`: keyboard navigation follows source.
  - **Subgrid is Baseline 2023 in Chrome and Firefox, Safari 16+.** Production-safe in 2026; the polyfill story is gone.
  - **`min-content` and `max-content` are the grid sizing escape hatches.** When a track should be as narrow as possible without breaking content (`min-content`) or as wide as content prefers (`max-content`), they're the right tool. Rare in component code; common in data tables.

What this lesson does not cover:

- Container queries (`@container`) — Lesson 4.5.7. (Mentioned as the "responsive without breakpoints" alternative for components, vs. grid `auto-fit` for containers.)
- Sizing utilities (`w-*`, `min-h-*`, `aspect-*`) — Lesson 4.4.5.
- Stacking context inside grid/flex — Lesson 4.4.9.
- The `gap` decision vs. legacy alternatives — Lesson 4.4.6.
- Animation of grid track changes — niche; the chapter doesn't ship it.
- Multi-column layout (`columns: 3`) — recognition only; rare in 2026 outside long-form prose.

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson installs the model (tracks, items, the `fr` unit, named areas, subgrid) and the canonical patterns (the five layouts every SaaS UI repeats). The deliverable is fluency — the student writes `grid grid-cols-1 md:grid-cols-3 gap-6` for a card grid without thinking, recognizes when to reach for `auto-fit` vs. breakpoints, and knows the page-shell template by heart.

Open with the senior question — "you need three columns of cards on desktop, two on tablet, one on mobile; what's the 2026 reach?" — and a `MultipleChoice` exercise pitting four answers (`flex flex-wrap` with manual width per child — wrong, fragile; `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` — right; floats with `width: 33%` — legacy; `display: table` with table-cell — wrong tool). The discrimination installs grid as the 2D default.

A hand-authored SVG `Figure` renders a grid with four columns, three rows, gaps between, line numbers labeled at every track edge, named areas overlaid (`header / header / header / header` on row 1, `sidebar / main / main / main` on row 2, `footer / footer / footer / footer` on row 3). The model — tracks, lines, areas — is concrete.

A second `Figure` shows the `repeat(auto-fit, minmax(280px, 1fr))` model — three rendered widths (320px container with 1 column, 600px with 2, 900px with 3), the same template producing different track counts. The cause-and-effect of auto-fit is concrete.

A `Matching` exercise pairs ten Tailwind utilities with their CSS — `grid` (`display: grid`), `grid-cols-3` (`grid-template-columns: repeat(3, minmax(0, 1fr))`), `grid-cols-[200px_1fr]` (`grid-template-columns: 200px 1fr`), `col-span-2` (`grid-column: span 2`), `gap-6` (`gap: var(--spacing) * 6`), `place-items-center` (`align-items: center; justify-items: center`), `grid-rows-[auto_1fr_auto]` (`grid-template-rows: auto 1fr auto`), `col-start-2` (`grid-column-start: 2`), `auto-rows-min` (`grid-auto-rows: min-content`), `grid-cols-subgrid` (`grid-template-columns: subgrid`).

A `Buckets` exercise sorts twelve layout problems into "use grid" vs. "use flex" vs. "use both (grid outer, flex inner)" — a card grid with three columns at desktop (grid), a row of action buttons (flex), a header with logo on left and nav on right (flex), a stats dashboard with one featured cell (grid + col-span), a list of comments stacked vertically (flex-col or just block + space), a page shell with sidebar and main (grid), a card with a 3-column inner data grid (grid inside), a horizontal scrolling row of items (flex), a centered hero (grid place-items-center), a feature comparison table (grid for the structure + flex for cells), a wrapping list of pills (flex flex-wrap), a layout where every card's title row should align across cards (grid + subgrid).

An interactive widget renders a 4×3 grid container with eight items. Sliders control `grid-template-columns` (1 to 4 tracks of `1fr`), `gap` (0 to 32px), `grid-auto-flow` (row / column / dense), and per-item placement (`col-span-1` / `2` / `3`). The student moves a slider, watches the items reflow. A side-panel shows the corresponding Tailwind classes. The cause-and-effect of grid is concrete.

A `PredictOutput` exercise on four grid scenarios:
1. `<div className="grid grid-cols-3 gap-4">{Array(7).fill().map((_,i) => <div key={i} className="h-12 bg-card">{i}</div>)}</div>` — predict the layout (3 cols, 3 rows; the last row has only one filled cell).
2. `<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">` in a 700px container with three children — predict (3 columns, ~228px each — auto-fit fits as many minmax(200,1fr) as possible).
3. `<div className="grid grid-cols-3"><div className="col-span-2">A</div><div>B</div><div>C</div><div>D</div></div>` — predict (A in cols 1-2 row 1, B in col 3 row 1, C in col 1 row 2, D in col 2 row 2).
4. `<div className="grid grid-rows-[auto_1fr_auto] min-h-dvh">` with header, main, footer — predict (header content height at top, main fills, footer content height at bottom).

A `CodeReview` exercise on a 35-line grid-based dashboard with six issues:
- A card grid using `grid-cols-3` overflowing on mobile — fix: responsive variants `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` or `auto-fit`.
- Per-card right-margin for spacing — fix: `gap-*` on the grid.
- A featured card spanning 2 columns implemented with `width: 66%` and absolute positioning — fix: `col-span-2`.
- A page shell using flex-col with manual percentages for sidebar — fix: `grid grid-cols-[240px_1fr]`.
- A nested card-internal grid that doesn't align with the parent's tracks — fix: `grid-cols-subgrid col-span-full` on the inner.
- A centered hero implemented with `flex items-center justify-center mt-[20vh]` — fix: `grid place-items-center min-h-dvh`.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a page shell — `grid grid-cols-[240px_1fr] grid-rows-[auto_1fr_auto] min-h-dvh`, with header and footer spanning both columns, sidebar and main in the middle row. The grader checks: the template is correct, the spans are right, mobile reflows to a single-column stacked layout via responsive variants (a stretch goal — `md:grid-cols-[240px_1fr]` with single column on mobile via `grid-cols-1`).

Close with a `TrueFalse` round of six statements: "`grid-cols-3` in Tailwind v4 compiles to `repeat(3, minmax(0, 1fr))`, not `repeat(3, 1fr)`" (true — the minmax(0) lets columns shrink below content), "`auto-fit` and `auto-fill` are interchangeable" (false — auto-fit collapses empty tracks), "`subgrid` is the right reach when nested grids should share line positions with the parent" (true), "`gap` works in grid" (true — it was actually grid-first), "`place-items-center` on a grid container centers each item in its own cell" (true), "`col-span-3` in a 2-column grid causes the item to overflow into a new track" (false — clamped to available columns). The model is locked in.

Estimated student time: 60 to 75 minutes. Load-bearing for the project chapter (4.12.3 builds the feature grid with grid + CVA), Chapter 4.5.7 (container queries as the component-scoped responsive answer), Chapter 4.11.5 (empty-state layouts with `place-items-center`), and any later chapter that ships a multi-region UI.

---

## Lesson 4.4.5 — Sizing: width, height, min/max, viewport units, aspect-ratio

Topics to cover:

- The senior question: the student writes `<div className="h-screen">` for a hero section. On desktop it works; on iOS Safari, there's a gap at the bottom when the address bar shows. They open DevTools, see `100vh`, and wonder why the bug exists. The 2026 answer names the *dynamic viewport units* — `100vh` is the *largest* viewport (address bar collapsed), and the address-bar overlay leaves a gap when expanded. The fix is `100dvh` (dynamic), `100svh` (smallest), or `100lvh` (largest) depending on intent. The lesson installs the sizing primitives (`width`/`height`, `min-*`/`max-*`, `size-*`, `aspect-ratio`), the viewport-unit family (`vh` / `dvh` / `svh` / `lvh` and the inline counterparts), the intrinsic-vs-extrinsic mental model, and `min()`/`max()`/`clamp()` for fluid sizing.
- **`width` and `height` — extrinsic sizing.** A short, concrete walkthrough. `width: 200px` forces the element's content-box width (or border-box, with the v4 default) to `200px`, regardless of content. Tailwind: `w-50` (the spacing scale, `200px` at default), `w-[200px]` (arbitrary), `w-full` (`100%`), `w-screen` (`100vw` — recognition, rarely the right reach), `w-1/2` / `w-1/3` (fractional widths). Heights work the same: `h-12`, `h-screen` (`100vh`), `h-dvh` (`100dvh`).
- **`size-*` — the v4 width-and-height shortcut.** A short cash-in. Tailwind v4 ships `size-*` as a single utility that sets both `width` and `height` to the same value. `size-12` is `w-12 h-12`. The 2026 reach: every avatar, icon, status indicator, button-with-no-children — anything where width and height should be equal.
  ```jsx
  <Avatar className="size-10" />
  <Spinner className="size-6" />
  <button className="size-8 rounded-full"><CloseIcon className="size-4" /></button>
  ```
  The senior recognition: `size-*` is the right reach for square elements; `w-*` and `h-*` separately are still right for rectangles.
- **`min-width`, `max-width`, `min-height`, `max-height` — sizing constraints.** A short tour. Min and max constraints clamp the element's size after the layout algorithm computes it.
  - **`min-w-*`** — the floor; the element won't shrink below this even if the parent / content tries.
  - **`max-w-*`** — the ceiling; the element won't grow above this even if the parent allows.
  - The 2026 canonical reaches:
    - **`max-w-3xl`** on `<main>` for a centered article (`mx-auto max-w-3xl`).
    - **`max-w-[65ch]`** for body text — the optimal reading width based on character count, not pixels.
    - **`min-w-0`** on flex items that should shrink below their content (the `flex-1` companion fix from Lesson 4.4.3).
    - **`min-h-dvh`** on the page shell so it fills the viewport.
    - **`max-h-screen overflow-y-auto`** on a long sidebar so it scrolls inside the page rather than the page scrolling.
- **The viewport-unit family — `vh`, `dvh`, `svh`, `lvh`, `vw`, `dvw`, `svw`, `lvw`.** A short, concrete walkthrough.
  - **`100vh`** — 100% of the *largest* viewport height (the desktop window's inner height, or mobile with the address bar fully collapsed).
  - **`100dvh`** — 100% of the *dynamic* viewport height; resizes as the address bar appears and disappears. The mobile-first default.
  - **`100svh`** — 100% of the *smallest* viewport height (with address bar fully expanded). The "guarantee everything fits even when the chrome is showing" choice.
  - **`100lvh`** — 100% of the *largest* viewport (same as `100vh`). Rarely needed since `vh` already means this.
  - The senior reach in 2026: `min-h-dvh` for "fill the viewport" and `h-dvh` for "exactly viewport height." The `100vh` / `min-h-screen` form is the legacy that breaks on mobile. Tailwind v4 ships `min-h-dvh`, `h-dvh`, `min-h-svh`, `min-h-lvh`, plus the inline variants (`*-dvw`, `*-svw`, `*-lvw`) for horizontal viewport units (rarely used; `w-full` on the body is the typical reach).
- **`aspect-ratio` — sizing without one dimension.** A short, concrete walkthrough. `aspect-ratio: 16 / 9` makes the element's height exactly `width / (16/9)`. Tailwind: `aspect-square`, `aspect-video` (`16/9`), `aspect-[3/2]` (arbitrary). The 2026 reaches:
  - **Image and video containers** — the wrapper has `aspect-video` and the `<img>` / `<video>` inside fills it; CLS (cumulative layout shift) drops to zero because the wrapper reserves space before the media loads.
  - **Square thumbnails** — `<div className="aspect-square">` reserves a square cell regardless of content.
  - **Card image areas** — every card's hero image area has `aspect-[4/3]`, every card has the same hero height, the grid stays neat.
  - The senior recognition: `aspect-ratio` is the right reach whenever one dimension follows from the other; never hand-tune `padding-bottom: 56.25%` (the legacy aspect-ratio hack).
- **Intrinsic vs. extrinsic sizing — the mental model.** A short, concrete walkthrough.
  - **Intrinsic sizing** — the element wants to be a size based on its content. The keywords: `auto` (the default for height, lets content dictate), `min-content` (as narrow as possible without breaking words), `max-content` (as wide as content prefers), `fit-content(<size>)` (between min and max, capped at the size).
  - **Extrinsic sizing** — the element is forced to a size by its parent or its own utility. `width: 100%`, `width: 200px`, `flex-basis: 0` plus `flex-grow: 1`, a grid `1fr` track.
  - The senior recognition: most elements are extrinsic on width (block-level fills the parent), intrinsic on height (auto height, content-driven). Inline elements are intrinsic on both. Flex and grid items are extrinsic on the main axis, content-driven on the cross. When sizing is "wrong," the question is which axis is being computed which way.
- **`fit-content` — the niche reach.** A short note. `width: fit-content` makes the element as wide as its content, capped at the parent's width. Tailwind: `w-fit`. The 2026 reach: a button styled to wrap its label tightly without `inline-block`'s line-flow side effects (`<button className="w-fit px-4 py-2">Continue</button>` — the button is content-width even inside a block-level parent). Useful in `flex-col` containers where children otherwise stretch.
- **`min()`, `max()`, `clamp()` — fluid sizing.** A short, concrete walkthrough.
  - **`min(50vw, 600px)`** — the smaller of the two; "50% of viewport, but no more than 600px."
  - **`max(20rem, 30%)`** — the larger; "30% of parent, but at least 20rem."
  - **`clamp(16rem, 50vw, 40rem)`** — clamps a preferred value (50vw) between a min (16rem) and a max (40rem). The 2026 sweet spot for fluid sizing.
  - Tailwind: bracket form, `w-[clamp(16rem,50vw,40rem)]`, `text-[clamp(1rem,2vw,1.5rem)]`. The senior reach: clamp is the answer to "responsive size without breakpoints," analogous to how `auto-fit` is the answer for grid columns. The chapter names it once and points at the responsive lessons (4.5.6) for when to reach.
- **The CSS unit zoo — what to use when.** A short tour:
  - **`px`** — absolute pixels. Sometimes the right reach for borders (`border` is 1px), focus rings, hairlines.
  - **`rem`** — root-relative. The Tailwind spacing scale compiles to rem; sizes scale with the root font-size, which means user font-size preferences (browser zoom, accessibility) scale the layout proportionally. The senior default for spacing and typography.
  - **`em`** — parent-relative. Compounds in nested elements (a child's `1.2em` is `1.2 × parent`). Useful for typography that should scale with its container's font-size; rare in modern utility-first code.
  - **`%`** — relative to the parent on the same axis. Common for `width: 100%`, `height: 100%`. The watch-out: `height: 100%` requires the parent to have a defined height, which often surprises.
  - **`vh` / `vw` / `dvh` / etc.** — viewport-relative. Above.
  - **`ch`** — width of "0" character in the current font. The right reach for text-content-width constraints (`max-w-[65ch]`).
  - **`fr`** — fractional units in grid only. Above.
  - The 2026 reach: `rem` for spacing (via Tailwind's scale), `dvh` / `dvw` for viewport-fill, `ch` for reading widths, `px` for hairlines, `%` rarely (usually a flex/grid `1fr` is the right substitute), `em` very rarely.
- **The watch-outs a senior names:**
  - **`h-screen` (= `100vh`) breaks on iOS Safari.** Use `h-dvh` / `min-h-dvh`. This is the single most important sizing fix to install.
  - **`width: 100%` on a flex item with `min-width: auto` overflows when content is wider than the parent.** Add `min-w-0`.
  - **`height: 100%` requires the parent to have a defined height.** Often surprises — a `<div>` inside `<body>` with `height: 100%` collapses unless `<html>, <body>` also have height. The 2026 reach: `min-h-dvh` on the outermost container, `flex-1` on the child that should fill remaining space.
  - **`max-w-prose` and `max-w-[65ch]` are the same idea** — both cap reading width at the optimal character count. Tailwind ships `max-w-prose`.
  - **`aspect-ratio` interacts with `min-width: auto` on flex items the same way `flex-1` does** — the item can collapse below the aspect-driven height. Use `min-w-0` or restructure.
  - **`size-*` only works for square elements.** Don't reach for it on rectangles; use `w-*` and `h-*` separately.
  - **Don't size with magic numbers.** A `mt-[37px]` is a smell — the spacing scale exists so the design has a vocabulary. Use the scale or change the scale's base.

What this lesson does not cover:

- Container queries (`@container`) for component-scoped responsive sizing — Lesson 4.5.7.
- Responsive variants (`md:w-1/2 lg:w-1/3`) — Lesson 4.5.6.
- The `gap` and spacing utilities — Lesson 4.4.6.
- Position and inset (`top`, `left`, etc.) — Lesson 4.4.7.
- Typography sizing (`text-*`) — Chapter 4.5.1.
- The `text-wrap: balance` and `pretty` properties — Chapter 4.5.1.
- The `field-sizing: content` property for inputs that grow with content — niche; Chapter 7 (forms) is the right place if it earns its weight.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the model (intrinsic vs. extrinsic, the viewport-unit family, aspect-ratio, fluid sizing) and the mechanics (the Tailwind utilities, the canonical reaches). The deliverable is muscle memory — the student writes `min-h-dvh` for full-viewport, `aspect-video` for video containers, `size-10` for avatars, `clamp()` for fluid sizing.

Open with the senior question — "you wrote `h-screen` for a hero, and on iOS Safari there's a gap at the bottom when the address bar shows; what's the 2026 reach?" — and a `MultipleChoice` exercise pitting four answers (use JavaScript to read `window.innerHeight` and set inline style — wrong, fragile and doesn't react; `h-[100vh]` instead of `h-screen` — same thing, wrong; `h-dvh` (or `min-h-dvh`), the dynamic viewport unit — right; add `padding-bottom: env(safe-area-inset-bottom)` — partial fix, addresses notch but not the address-bar issue). The discrimination installs the dvh/svh/lvh family.

A hand-authored SVG `Figure` renders the four viewport-unit measurements on a mobile screen — the same screen with address bar collapsed (`vh` = `lvh` = full screen), expanded (`svh` = visible area, `vh` still full), and dynamically resizing (`dvh` follows the chrome). The model is concrete.

A second `Figure` renders the intrinsic-vs-extrinsic axis decision — block element on width (extrinsic, fills parent), block on height (intrinsic, fits content), inline on both (intrinsic), flex item on main axis (extrinsic, algorithm-driven), grid item in `1fr` track (extrinsic). A small grid of seven elements, each labeled. The vocabulary locks in.

An interactive widget renders a `<div>` with sliders for `width`, `height`, `min-width`, `max-width`, `aspect-ratio`. The student moves a slider, watches the box resize. A side-panel shows the corresponding Tailwind classes (`w-64`, `min-w-32`, `max-w-prose`, `aspect-video`). The cause-and-effect is concrete.

A `Matching` exercise pairs ten Tailwind utilities with their CSS — `w-64` (`width: var(--spacing) * 64`), `size-10` (`width and height: var(--spacing) * 10`), `min-h-dvh` (`min-height: 100dvh`), `max-w-prose` (`max-width: 65ch`), `aspect-video` (`aspect-ratio: 16/9`), `aspect-square` (`aspect-ratio: 1/1`), `w-full` (`width: 100%`), `w-fit` (`width: fit-content`), `min-w-0` (`min-width: 0`), `h-screen` (`height: 100vh` — name the bug).

A `Buckets` exercise sorts twelve sizing decisions into "use `vh`/`vw` (legacy)" vs. "use `dvh`/`dvw` (mobile-safe)" vs. "use `aspect-*`" vs. "use `min-w-0` (flex companion)" vs. "use `max-w-prose` / `max-w-[65ch]`" vs. "use `clamp()` (fluid)" vs. "use spacing scale" — full-viewport hero (`min-h-dvh`), avatar (`size-*`), card image area (`aspect-*`), reading-width article (`max-w-prose`), responsive font size scaling between 1rem and 1.5rem (`text-[clamp(...)]`), button padding (spacing scale), modal that scrolls inside if too tall (`max-h-[90dvh]`), input shrinking inside flex row (`min-w-0`), exact pixel border (`border` for 1px), full-page overlay (`fixed inset-0`), embedded video iframe (`aspect-video`), responsive width based on viewport without breakpoints (`w-[clamp(...)]`).

A `PredictOutput` exercise on four sizing scenarios:
1. `<div className="h-screen">` rendered on iOS Safari with address bar showing — predict (gap at bottom because `100vh` exceeds visible area).
2. `<img className="aspect-video w-full" />` with a video-aspect image source — predict (image fills the wrapper, no CLS, exact 16:9).
3. `<div className="flex"><input className="flex-1" /></div>` with overflowing placeholder — predict (input shrinks below placeholder; needs `min-w-0`).
4. `<div className="size-12 rounded-full bg-card" />` — predict (a 48×48 square circle).

A `CodeReview` exercise on a 30-line page layout with six issues:
- A page shell using `min-h-screen` causing the iOS gap — fix: `min-h-dvh`.
- An avatar styled with separate `w-10 h-10` — fix: `size-10`.
- A video iframe with hardcoded `width="640" height="360"` — fix: wrapper with `aspect-video w-full`, iframe with `size-full`.
- An article centered without a max-width, full screen on desktop — fix: `mx-auto max-w-prose` (or `max-w-3xl`).
- An input inside a flex row shrinking below content — fix: `min-w-0` on the input.
- A "fluid" text size implemented with three responsive variants — fix: `text-[clamp(1rem,2vw,1.5rem)]`.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a hero section — `<section className="grid place-items-center min-h-dvh">` containing a heading and a CTA button — and verify on a "mobile viewport" render (a 375×667 inspector preview) that the section exactly fills the visible area. The grader checks: `min-h-dvh` is used (not `min-h-screen`), the centering pattern is correct, the section doesn't overflow.

Close with a `TrueFalse` round of six statements: "`100vh` and `100dvh` are equivalent on mobile" (false — `100vh` is the largest, `100dvh` resizes), "`aspect-video` is `16/9`" (true), "`size-10` sets both width and height to the same value" (true), "`max-w-prose` caps at a pixel value" (false — caps at `65ch`), "`flex-1` items don't need `min-w-0` if their content is short" (true — but the bug bites the moment content gets longer), "`fit-content` is the right reach for an element that should be content-width inside a block-level parent" (true). The model is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Lesson 4.4.6 (gap and spacing), Chapter 4.5.6 (responsive variants), Chapter 4.6.5 (modal and dialog sizing with `max-h-[90dvh]`), and the project chapter (4.12.3 builds the hero with `min-h-dvh` + `place-items-center`).

---

## Lesson 4.4.6 — Spacing inside containers: `gap` as the senior default

Topics to cover:

- The senior question: the student needs to space a list of items vertically. The first reach in 2018 would have been `margin-bottom` on every item except the last (with the `:last-child` trick). The first reach in 2021 would have been Tailwind's `space-y-4` (which adds margin to all-but-the-first via the `>` selector). The 2026 reach is `flex flex-col gap-4` — the parent declares the layout primitive, `gap` does the spacing, no per-child rules. The lesson installs `gap` as the universal default for spacing inside flex and grid containers, names the legacy alternatives with the trigger that would flip back, and covers the `divide-x` / `divide-y` cousin for when borders between items earn their weight.
- **`gap` — the universal default.** A short cash-in. The `gap` property works in flex, grid, and multi-column. It adds spacing *between* items only — no leading or trailing space, no edge collisions with the parent's padding. Two-axis variants: `gap-x-*` (column gap), `gap-y-*` (row gap), `gap-*` (both). The 2026 reach: every flex or grid container with multiple children uses `gap-*` for spacing.
  ```jsx
  // Vertical stack
  <div className="flex flex-col gap-4">
    <Card />
    <Card />
    <Card />
  </div>

  // Horizontal row with asymmetric gap
  <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
    {tags.map(tag => <Pill key={tag} />)}
  </div>

  // Card grid
  <div className="grid grid-cols-3 gap-6">
    {cards.map(card => <Card key={card.id} {...card} />)}
  </div>
  ```
  The senior recognition: `gap` works on the container, applies between items uniformly, and reflows correctly when items wrap or change count.
- **`space-x-*` / `space-y-*` — the legacy compatibility utility.** A short, opinionated walkthrough. Tailwind's `space-x-4` compiles to `> :not([hidden]) ~ :not([hidden]) { margin-left: 1rem }` — every direct sibling except the first gets a left margin. The senior recognition: this exists for the rare case where the parent isn't flex or grid (a `<div>` with default block layout containing a stack of buttons, where switching to flex would change the item sizing). The 2026 reality: this case is rare; the cleaner fix is almost always `flex flex-col` on the parent. The chapter names `space-y-*` and `space-x-*` once, dismisses with the reach trigger ("non-flex/grid parent that can't be changed without side effects"), and moves on.
- **The `space-x` failure modes — why `gap` wins.** A short, concrete walkthrough.
  - **`space-x` doesn't work when items wrap.** A `flex-wrap` parent with `space-x-4` puts left-margin on the second-and-later items per row, producing inconsistent spacing across rows. `gap` on the same parent produces consistent spacing in both axes.
  - **`space-x` is sensitive to `:first-child` ordering.** Insert a hidden element at the start of the list and the spacing shifts. (Tailwind's `:not([hidden])` mitigates this for `display: none` siblings, but `visibility: hidden` and conditionally-rendered nulls still bite.)
  - **`space-x` interferes with RTL layouts.** It uses `margin-left`, which doesn't flip in RTL without a logical-property variant. Tailwind v4 ships a `RTL`-aware `space-x` via logical properties internally now, but the conceptual issue (margin on every-but-first) is fragile by design.
  - **`gap` is just simpler.** One property on the parent, no per-child math, no edge cases.
- **`divide-x-*` / `divide-y-*` — borders between items.** A short tour. Tailwind's `divide-y-2 divide-card` adds a 2-unit top border to every direct child except the first (`> :not([hidden]) ~ :not([hidden])` again). The 2026 reach: when the design wants visible separators between items (a settings list with hairlines between rows, a navigation menu with vertical dividers between buttons). Don't use it as a substitute for `gap`; it's specifically for visible separators.
  ```jsx
  // Settings list with hairlines between rows
  <div className="divide-y divide-border rounded-lg border">
    {settings.map(s => <SettingRow key={s.id} {...s} />)}
  </div>
  ```
  The senior recognition: `divide-*` is a visual separator pattern, `gap` is a spacing pattern, they compose together when both are wanted (a list with both hairlines and breathing room).
- **The gap-vs-margin decision — the senior reach.** A short, opinionated walkthrough.
  - **Use `gap` when:** the spacing is between siblings inside a flex or grid container. This is 90% of cases.
  - **Use `margin` when:** the spacing is between an element and something *outside* its container (a hero `mt-*` to push it down from the header, a section `mb-*` before a footer). Margins on the *outside* of an element are the right tool when the element doesn't know about its siblings.
  - **Don't use `margin` between siblings inside a flex/grid container.** The `gap` is cleaner, the result is more predictable, and it's the form a code reviewer expects.
  - **Don't use `margin-top` on every section to space them out.** Wrap them in a `flex flex-col gap-*` parent.
- **Padding inside vs. spacing between — the parallel.** A short note. Padding is the space *inside* an element (between content and border). Gap is the space *between* siblings. Margin is the space *outside* (between the element and its neighbors). The senior recognition:
  - **Padding** for the breathing room *inside* a card / button / section.
  - **Gap** for the spacing *between* cards / list items / form rows.
  - **Margin** for the rare push-this-element-away-from-something-outside case.
  - The student hardly ever writes margin in 2026; `gap` and `padding` cover almost everything.
- **The `*` selector hack and the "lobotomized owl" — recognition vocabulary.** A short note. The CSS pattern `* + * { margin-top: 1rem }` (the "lobotomized owl" from Heydon Pickering's article) was the standard pattern for sibling spacing pre-`gap`. The 2026 reach: dead. The student doesn't write it; recognition only for legacy code. Tailwind's `space-y-*` is the modern variant of the same pattern, and the same dismissal applies.
- **Asymmetric gaps with `gap-x` and `gap-y`.** A short cash-in. When rows and columns need different spacing (a wrapping pill list with tighter vertical spacing than horizontal), `gap-x-*` and `gap-y-*` decouple. The senior reach: rare in production but the right tool when it earns its weight.
- **`column-gap` and `row-gap` — the underlying CSS properties.** A short note. `gap` is shorthand for `row-gap` and `column-gap`. Tailwind's `gap-*` writes the shorthand; `gap-x-*` writes `column-gap`, `gap-y-*` writes `row-gap`. The senior reach: name recognition only; the Tailwind shorthand is what the student writes.
- **The watch-outs a senior names:**
  - **`gap` doesn't add space at the edges.** If the design wants leading and trailing space, that's `padding` on the parent, not `gap`.
  - **`gap` in grid uses the same property as flex now.** No need to reach for `grid-gap` (the legacy form).
  - **`space-y` interacts badly with conditional rendering and `<Fragment>`.** A child rendered as `null` doesn't count as a sibling; the spacing skips. `gap` doesn't have this issue because it operates on the parent, not on selectors.
  - **`divide-*` and `border` together — the divide adds borders between, the parent border adds borders around.** They compose; the parent rounded-lg + `divide-y` produces a list-card with internal hairlines.
  - **Don't mix `gap` and `space-x` on the same container.** Pick one. Always `gap` unless the trigger named above applies.
  - **`gap` doesn't collapse like margins do.** Two adjacent `gap`-spaced items always have the gap between them; no max-of-two collapse.

What this lesson does not cover:

- The `padding` and `margin` utilities at depth — Lesson 4.4.1 owns the box model.
- Flex item sizing and alignment — Lesson 4.4.3.
- Grid track and item placement — Lesson 4.4.4.
- Responsive variants for spacing (`md:gap-6`) — Lesson 4.5.6.
- The `<hr>` element vs. `divide-*` — `<hr>` is the semantic horizontal rule for thematic breaks (recognition; Chapter 4.1.6 territory).
- Multi-column layout (`columns: 3` + `column-gap`) — niche, recognition only.

Pedagogical approach:

Decision-plus-mechanics archetype. The lesson installs the senior reach (`gap` always, `divide-*` for visible separators, `margin` for outside-the-container spacing) and the mechanical surface (the Tailwind utilities). The deliverable is a reflex — the student writes `flex flex-col gap-4` instead of `space-y-4` without thinking, and recognizes margin between siblings in a flex container as a smell.

Open with the senior question — "you have a vertical stack of cards and need consistent spacing between them; what's the 2026 reach?" — and a `MultipleChoice` exercise pitting four answers (`mb-4` on every card except the last via `:last-child` — legacy; `space-y-4` on the parent — works but legacy; `flex flex-col gap-4` on the parent — right; absolute positioning with manual offsets — never the answer). The discrimination installs `gap` as the default.

A `Matching` exercise pairs eight Tailwind utilities with what they set — `gap-4` (`gap` between items, both axes), `gap-x-6` (`column-gap`), `gap-y-2` (`row-gap`), `space-y-4` (`margin-top` on every-but-first, legacy), `divide-y` (border-top on every-but-first, for visible separators), `p-4` (padding inside the container), `mt-8` (margin outside, top), `mb-12` (margin outside, bottom). The vocabulary distinguishes spacing primitives.

A `Buckets` exercise sorts ten spacing decisions into "use `gap-*` (the default)" vs. "use `divide-*` (visible separators)" vs. "use `padding-*` (inside)" vs. "use `margin-*` (outside the container)" vs. "smell — restructure" — vertical stack of cards (gap), settings list with hairlines (divide-y + padding inside rows), card breathing room (padding), section pushed away from header (margin or restructure to a parent with gap), horizontal toolbar with separators between groups (divide-x or restructure with gap clusters), pill list that wraps (gap), form with consistent row spacing (gap), `:last-child { margin: 0 }` trick on a list (smell — switch to gap), space between hero and main (gap on a parent), grid of cards (gap).

A `PredictOutput` exercise on four spacing scenarios:
1. `<div className="flex flex-col gap-4"><Card /><Card /><Card /></div>` — predict the layout (3 cards stacked, 16px between each, no leading/trailing space).
2. `<div className="space-y-4 flex flex-wrap"><Card /><Card /><Card /></div>` — predict the bug (space-y adds margin-top to all-but-first, but flex-wrap rows don't get vertical spacing — gap-y would).
3. `<div className="divide-y divide-border rounded-lg border"><Row /><Row /><Row /></div>` — predict (3 rows with hairlines between, rounded outer border).
4. `<section className="mt-12 mb-12">` between two other `mt-8 mb-8` sections — predict (margin collapse may apply between adjacent block siblings; only the larger margin counts; smell — should be in a `flex flex-col gap-12` parent).

A `CodeReview` exercise on a 25-line component with five issues:
- A list of items spaced with `mb-4` on each — fix: `flex flex-col gap-4` on parent.
- A wrapping flex container with `space-x-4` producing inconsistent row spacing — fix: `gap-x-4 gap-y-2` (or just `gap-4`).
- A settings list with manual `<hr />` between rows — fix: `divide-y divide-border` on the wrapper.
- A row of buttons with margin-right on each button — fix: `flex items-center gap-2` on the wrapper.
- A `:last-child { margin: 0 }` rule in a global stylesheet to fix the legacy spacing — fix: refactor to `gap-*` and remove the rule.

The student leaves a comment per issue with the senior fix.

Close with a `TrueFalse` round of five statements: "`gap` works in flex containers" (true — universally since 2021+), "`space-y-4` adds margin-top to every direct child" (false — every child *except the first*), "`gap` adds space at the leading and trailing edges of the container" (false — only between items), "`divide-x` is the right reach for visible separators between items" (true), "Mixing `gap` and `margin` between siblings inside a flex container is the senior pattern" (false — pick one, always gap). The model is locked in.

Estimated student time: 30 to 40 minutes. Load-bearing for every later layout (every flex and grid in the project chapter uses `gap`), Chapter 4.11.5 (settings lists with `divide-y`), and the project chapter (4.12.3 spaces the feature grid with `gap-6`).

---

## Lesson 4.4.7 — Position and the inset utilities

Topics to cover:

- The senior question: the student wants to pin a "Save draft" toast to the bottom-right of the viewport. They reach for `margin-top: auto; margin-left: auto` and the toast doesn't pin — the parent isn't tall enough for `margin-top: auto` to push it to the bottom. They reach for `position: fixed; bottom: 0; right: 0` and it pins, but now it overlaps the page footer when the user scrolls. The 2026 answer is `fixed bottom-4 right-4 z-50` (with the z-50 caveat that Lesson 4.4.9 unpacks). The lesson installs the four positioning modes (`relative`, `absolute`, `sticky`, `fixed`), the `inset` utilities (`top`, `right`, `bottom`, `left`, `inset-*`), the containing-block rules (where `top: 0` resolves to), and the senior reaches for each mode.
- **The five `position` values — the model.** A short, concrete walkthrough.
  - **`static`** (default) — the element participates in normal flow; `top`, `right`, `bottom`, `left`, `z-index` have no effect. Tailwind: no utility needed; `static` reverts to default.
  - **`relative`** — the element participates in normal flow (its space is reserved as if static), but `top`/`right`/`bottom`/`left` shift it visually from its in-flow position. The 2026 reach: rarely for visual positioning itself; almost always to *establish a containing block* for `absolute` children. Tailwind: `relative`.
  - **`absolute`** — the element is removed from normal flow; its space isn't reserved; `top`/`right`/`bottom`/`left` position it relative to the nearest *positioned* ancestor (one with `position: relative/absolute/fixed/sticky`), or the initial containing block if none. The 2026 reach: icon overlays, badges on cards, popover bodies, decorative absolutely-positioned elements. Always inside a `relative` parent.
  - **`fixed`** — like absolute, but positioned relative to the viewport (technically the initial containing block). Stays in place during scroll. The 2026 reach: full-viewport overlays (modals before portals, the rare always-on-screen UI). Often replaced by `position: sticky` or by portals to a fixed modal root.
  - **`sticky`** — hybrid; the element participates in normal flow until it would scroll past a defined offset, at which point it sticks at that offset. The 2026 reach: sticky table headers, section headings that follow the scroll, sidebars that follow as the user scrolls past them. The watch-out: `sticky` requires a *scrollable ancestor* and won't escape its parent's bounds (Lesson 4.4.8 cashes in the overflow interaction).
- **The containing block — where `top: 0` resolves to.** A short, load-bearing concept. For an `absolute` element, the containing block is the nearest *positioned* ancestor (any ancestor with `position` other than `static`). If none exists, the containing block is the initial containing block (the viewport, roughly). The senior recognition: an `absolute` child without a `relative` parent positions to the viewport, often surprising the student. The 2026 reflex: every `absolute` icon overlay or badge is wrapped in a `relative` parent.
  ```jsx
  <div className="relative">
    <img src="..." className="aspect-video w-full" />
    <span className="absolute top-2 right-2 rounded-md bg-card px-2 py-1 text-xs">New</span>
  </div>
  ```
- **The `inset` utility family — the v4 sugar.** A short tour. Tailwind v4 ships:
  - **`top-*`, `right-*`, `bottom-*`, `left-*`** — single-axis offsets, physical (LTR-fixed).
  - **`inset-*`** — all four sides at once. `inset-0` is `top: 0; right: 0; bottom: 0; left: 0` — the canonical "fill the parent" pattern for absolute and fixed elements. `inset-4` is 4 units on every side.
  - **`inset-x-*`** — left and right. `inset-y-*` — top and bottom.
  - **`inset-s-*`, `inset-e-*`** — logical inline-start and inline-end (RTL-aware). `inset-bs-*`, `inset-be-*` — logical block-start and block-end. (Tailwind v4.3+ replaced the deprecated `start-*` / `end-*` shorthands with these.)
  - **Negative offsets** — `-top-4`, `-inset-2` for pulling outside the parent.
  - The senior recognition: `inset-0` on a `fixed` element is the canonical full-screen overlay; `inset-x-0 bottom-0` for a bottom-pinned bar; `inset-y-0 right-0 w-72` for a right-side drawer.
- **The canonical position layouts.** A concrete tour:
  ```jsx
  // Icon badge on a card
  <div className="relative rounded-lg border p-4">
    <span className="absolute top-2 right-2">
      <BellIcon className="size-4" />
    </span>
    <Card />
  </div>

  // Sticky table header
  <table>
    <thead className="sticky top-0 bg-card">
      <tr><th>Name</th><th>Email</th></tr>
    </thead>
    <tbody>...</tbody>
  </table>

  // Sticky section heading inside a scrolling main
  <main className="overflow-y-auto h-dvh">
    <h2 className="sticky top-0 bg-background z-10 py-2">Section A</h2>
    <p>...</p>
    <h2 className="sticky top-0 bg-background z-10 py-2">Section B</h2>
  </main>

  // Full-viewport modal backdrop (pre-portal example)
  <div className="fixed inset-0 bg-black/50 z-50" />

  // Bottom toast cluster
  <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
    <Toast />
    <Toast />
  </div>

  // Side drawer (right side)
  <aside className="fixed inset-y-0 right-0 w-72 bg-card z-40 shadow-xl">
    ...
  </aside>
  ```
  The senior recognition: each of these has a small, memorable shape. `relative` parent + `absolute` child for badges. `sticky top-0` for table headers. `fixed inset-0` for backdrops. `fixed bottom-4 right-4` for toasts. `fixed inset-y-0 right-0 w-72` for drawers. The patterns repeat across SaaS UIs.
- **Sticky and the scroll-container relationship.** A short, load-bearing note. `position: sticky` requires:
  - **A scrollable ancestor** — an element with `overflow: auto`/`scroll`/`hidden` on the relevant axis (or `<html>`/`<body>` for the page itself).
  - **The element itself sticks within its *parent's* bounds** — when the parent scrolls past, the sticky element scrolls with it (it doesn't escape).
  - **Sticky requires `top` (or `bottom`/`left`/`right`) to be defined** — sticky doesn't know where to stick without an offset.
  - The student writes `<thead className="sticky top-0">` and the header sticks; if the table is taller than the viewport, the header follows the scroll until the entire `<table>` is out of view. Lesson 4.4.8 cashes in the overflow interaction further.
- **Anchor positioning — the 2026 newcomer (Baseline 2026).** A short forward reference. CSS Anchor Positioning hit Baseline in early 2026 (Chrome 125+, Firefox 147+, Safari 26+). It lets an element position itself relative to *any other element on the page*, not just its parent. The Tailwind utilities are still maturing, but the underlying primitives — `position-anchor`, `inset-area`, `anchor()` function — power the 2026 form of tooltips, dropdowns, and popovers without JavaScript. The chapter names this once and points at Chapter 4.11.1 (shadcn's Popover, which uses Floating UI / anchor positioning under the hood). The student recognizes the term; the implementation is library territory.
- **The `popover` HTML attribute and the Popover API.** A short forward reference. The native `popover` attribute (HTML, baseline) and the Popover API (`showPopover()`, `hidePopover()`, `popovertarget` attribute) are the 2026 form for native popovers, dropdowns, and dialogs. Combined with anchor positioning, they replace most JavaScript popover libraries. shadcn's Popover (Chapter 4.11.1) wraps this. The student knows the surface exists; they don't write it from scratch in this chapter.
- **The watch-outs a senior names:**
  - **`absolute` without a `relative` parent positions to the viewport.** The single most common position-related bug. The fix: wrap the absolute element's container in `relative`.
  - **`position: fixed` doesn't work as expected when an ancestor has `transform`, `filter`, or `perspective`.** Those properties create a new containing block; the `fixed` element positions to the transformed ancestor, not the viewport. This is also the source of the "popover trapped inside its parent" bug (Lesson 4.4.9). The fix: portal the fixed element to `<body>` (Chapter 4.6.5).
  - **`position: sticky` doesn't work without a scrollable ancestor.** A `sticky` table header inside a `<main>` that doesn't scroll won't stick. Add `overflow-y-auto` to the scroll parent (Lesson 4.4.8).
  - **`position: sticky` doesn't work when an ancestor has `overflow: hidden` on the relevant axis** unless that ancestor is the scroll container. The interaction with overflow is subtle; Lesson 4.4.8 cashes in the rules.
  - **`fixed bottom-0 inset-x-0` for a bottom navbar must respect the iOS home indicator.** The 2026 reach: pad with `pb-[env(safe-area-inset-bottom)]` (the CSS env() function for safe areas).
  - **`z-index` only works on positioned elements.** A `static` element with `z-50` does nothing. Add `relative` to enable z-index. Lesson 4.4.9 cashes this in.
  - **Inset-shorthand `inset-0` on an absolute element with no width or height fills the parent** — the most concise full-coverage pattern. Useful for pseudo-element overlays (`<span className="absolute inset-0 bg-black/20 pointer-events-none" />`).
  - **`pointer-events: none` on an absolute overlay lets clicks pass through.** The 2026 reach: a hover-effect overlay on a card that shouldn't intercept clicks gets `absolute inset-0 pointer-events-none`.

What this lesson does not cover:

- Stacking context and z-index at depth — Lesson 4.4.9.
- Overflow modes and scroll containers — Lesson 4.4.8.
- React Portals (the `<Portal>` pattern for modals/popovers) — Chapter 4.6.5.
- shadcn's Popover, Dropdown, Tooltip components — Chapter 4.11.1.
- Drag and drop positioning — out of scope.
- CSS `transform` for visual positioning (`translate-x-*`, `translate-y-*`) — recognition only here; Chapter 4.5.5 owns motion.
- Fixed-element scroll-locking (preventing background scroll when a modal is open) — the project chapter (4.12.5) cashes in `useLockBodyScroll`.

Pedagogical approach:

Decision-plus-mechanics archetype. The lesson installs the four positioning modes (with their reaches) and the inset utility family. The deliverable is recognition — the student writes `relative` + `absolute` for badges, `sticky top-0` for sticky headers, `fixed inset-0` for overlays, and recognizes when each is the right tool.

Open with the senior question — "you want a small badge in the top-right corner of a card; what's the 2026 reach?" — and a `MultipleChoice` exercise pitting four answers (`float-right` — legacy, doesn't position correctly anyway; `relative` parent + `absolute top-2 right-2` child — right; `fixed top-2 right-2` — wrong, positions to viewport; `flex justify-end items-start` then negative margin to overlap — over-engineered). The discrimination installs the relative-parent + absolute-child pattern.

A hand-authored SVG `Figure` renders a side-by-side comparison of the four positioning modes — `static` (in flow), `relative` (in flow + visual offset), `absolute` (out of flow, positioned to nearest positioned ancestor), `fixed` (out of flow, positioned to viewport), `sticky` (in flow until scroll threshold, then sticks). Each mode shows a small box's behavior in a scrollable container. The model is concrete.

A `Matching` exercise pairs ten Tailwind utilities with their CSS — `relative` (`position: relative`), `absolute` (`position: absolute`), `fixed` (`position: fixed`), `sticky` (`position: sticky`), `inset-0` (`top, right, bottom, left: 0`), `inset-x-4` (`left, right: var(--spacing) * 4`), `top-2` (`top: var(--spacing) * 2`), `bottom-4` (`bottom: ...`), `inset-y-0` (`top, bottom: 0`), `-top-2` (negative top — pulls element up).

A `Buckets` exercise sorts twelve positioning needs into "use `relative` parent + `absolute` child" vs. "use `sticky` (in scroll container)" vs. "use `fixed` (viewport)" vs. "use `flex/grid` (no positioning needed)" vs. "portal it (Chapter 4.6.5)" — icon badge on a card (relative + absolute), table column header that follows scroll (sticky), full-viewport modal backdrop (fixed or portal), centered hero text (grid/flex, no positioning), bottom toast cluster (fixed), tooltip on a button (portal + anchor positioning, named for recognition), section heading that follows scroll inside main (sticky), drawer that slides in from the right (fixed), close button in the corner of a card (absolute), navbar pinned to top of page (sticky on `<header>`), avatar overlapping a banner image (absolute on a relative parent), button that should sit in the bottom-right of a flex card (flex with `mt-auto` + `self-end` instead).

An interactive widget renders a scrollable container with a sticky header, an absolute-positioned badge inside a relative card, and a fixed bottom toast. Toggles let the student change each element's `position` value and offsets. The student watches behaviors change in real time: removing `relative` from the card sends the badge to the viewport corner; switching the header to `static` removes the sticky; switching the toast from `fixed` to `absolute` makes it scroll with content. The cause-and-effect is concrete.

A `PredictOutput` exercise on four positioning scenarios:
1. `<div className="absolute top-2 right-2">A</div>` inside a non-positioned `<section>` — predict (positions to the viewport top-right, not the section).
2. `<header className="sticky top-0 bg-card">Nav</header>` at the top of a `<body>` that scrolls — predict (sticks to the top of the viewport when scrolled past).
3. `<div className="fixed inset-0 bg-black/50">` rendered inside a `transform`-having parent — predict (positions to the transformed parent, not the viewport — the canonical fixed-broken bug).
4. `<aside className="sticky top-4">Sidebar</aside>` inside a `<main>` with no overflow — predict (sticks until `<main>` ends; then scrolls away with main).

A `CodeReview` exercise on a 30-line layout with six issues:
- An `absolute` icon overlay on a card with no `relative` parent — fix: add `relative` to the card.
- A `fixed` modal backdrop inside a transformed parent positioning to the parent instead of viewport — fix: portal to `<body>` (forward reference Chapter 4.6.5).
- A sticky sidebar inside a `<main>` without overflow — fix: add `overflow-y-auto` to a scroll container, or use `sticky` on the page level.
- A bottom navbar `fixed bottom-0 left-0 right-0` colliding with iOS home indicator — fix: add `pb-[env(safe-area-inset-bottom)]`.
- A `z-50` on a `static` element doing nothing — fix: add `relative`.
- A drawer using `right-0 w-72 absolute` (not fixed) failing to span viewport height — fix: `fixed inset-y-0 right-0 w-72`.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a card with a "New" badge in the top-right corner and a sticky header inside a long scrolling list. The grader checks: the card has `relative`, the badge has `absolute top-2 right-2`, the header has `sticky top-0`, and the list scrolls correctly with the header staying visible.

Close with a `TrueFalse` round of six statements: "`absolute` positions relative to the immediate parent" (false — relative to nearest positioned ancestor), "`sticky` requires a scrollable ancestor" (true), "`fixed` positions relative to the viewport unless an ancestor has `transform`, `filter`, or `perspective`" (true — the canonical bug), "`inset-0` on an `absolute` element fills its containing block" (true), "`z-index` works on `static` elements" (false — needs a non-static position), "`position: sticky` is the senior reach for table headers in 2026" (true). The model is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for Lesson 4.4.8 (overflow and sticky interaction), Lesson 4.4.9 (stacking context and the fixed-trapped bug), Chapter 4.6.5 (portals as the React-side fix), Chapter 4.11.1 (shadcn Popover with anchor positioning), and the project chapter (4.12.5 builds the mobile nav drawer with `fixed inset-y-0 right-0`).

---

## Lesson 4.4.8 — Overflow and scroll containers

Topics to cover:

- The senior question: the student builds a sidebar that's taller than the viewport. The page itself scrolls when it should — but on iOS, when the user scrolls past the bottom of the sidebar, the entire page scrolls behind it (or worse, refreshes via pull-to-refresh). Or: the student builds a modal with a long form; when the user scrolls past the form, the page underneath scrolls instead of stopping. The 2026 answers are `overflow-y-auto` on the scroll container, `overscroll-behavior: contain` to stop the scroll chain, and `scrollbar-gutter: stable` to prevent layout shift when the scrollbar appears. The lesson installs the overflow modes (`visible`, `hidden`, `clip`, `auto`, `scroll`), `overscroll-behavior` for the iOS scroll-chain and pull-to-refresh bugs, scroll containment, and the canonical scroll-container patterns (sticky headers inside, modal scroll-locking, sidebar-internal scroll).
- **The overflow modes.** A short, concrete walkthrough.
  - **`overflow: visible`** (default) — content overflows the box; siblings and outside elements see it. The default for everything; only matters when content is genuinely too large.
  - **`overflow: hidden`** — content is clipped at the box bounds; no scrollbars; not scrollable. Tailwind: `overflow-hidden`. The 2026 reach: clipping decorative content (an image inside a `rounded-lg` wrapper that needs the corners clipped), preventing visual bleed.
  - **`overflow: clip`** — like `hidden` but more strict; the element doesn't establish a new scroll container, doesn't allow programmatic scrolling. Tailwind: `overflow-clip`. The 2026 reach: when `hidden`'s side effects (creating a scroll container) are unwanted.
  - **`overflow: auto`** — content is clipped, scrollbars appear *only when content overflows*. Tailwind: `overflow-auto`. The senior default for scrollable regions.
  - **`overflow: scroll`** — scrollbars *always* appear, even when content fits. Tailwind: `overflow-scroll`. Rare in 2026; the layout-shift caused by always-visible scrollbars makes `auto` plus `scrollbar-gutter` the better reach when stable scrollbar space matters.
  - **Per-axis variants** — `overflow-x-auto`, `overflow-y-hidden`, etc. The 2026 reach: a horizontal scrolling row of cards uses `overflow-x-auto overflow-y-hidden`; a vertical-scrolling sidebar uses `overflow-y-auto overflow-x-hidden`.
- **`overscroll-behavior` — the scroll-chain control.** A short, concrete walkthrough.
  - **The scroll chain bug.** When a user scrolls inside a scrollable element and reaches the boundary (top or bottom), the browser by default *chains* the scroll up to the parent — the page itself starts scrolling. On iOS, this also triggers pull-to-refresh. The bug is most visible in modals (the page underneath scrolls when the modal content reaches its end) and in sidebars (the page jumps when the sidebar bottom is reached).
  - **The fix.** `overscroll-behavior: contain` (Tailwind: `overscroll-contain`) prevents the chain — scroll stops at the boundary, doesn't chain to the parent, doesn't trigger pull-to-refresh on iOS.
  - **Variants.** `overscroll-behavior: none` (also disables overscroll bounce/glow), `overscroll-behavior: auto` (default — chains).
  - **Per-axis.** `overscroll-y-contain` (vertical only), `overscroll-x-contain` (horizontal only).
  - The 2026 senior reach: every modal, drawer, and dialog body gets `overscroll-contain` (or `overscroll-y-contain`). Every scroll-locked sidebar gets it too.
- **Scroll-locking the page when a modal opens — the body-lock pattern.** A short, concrete walkthrough. When a modal opens, the page underneath shouldn't scroll. The naïve fix: `body { overflow: hidden }` — works on desktop, fails on iOS (touch scroll still passes through). The 2026 senior reach combines two things:
  - **`document.body.style.overflow = 'hidden'`** to prevent desktop scroll.
  - **A `touchmove` event listener on the body that calls `preventDefault()`** to prevent iOS touch scroll-through.
  - Wrapping both into a `useLockBodyScroll` custom hook (the project chapter 4.12.5 builds this; this lesson references the pattern).
- **Sticky inside overflow — the cross-reference to Lesson 4.4.7.** A short, load-bearing walkthrough. `position: sticky` requires a scrollable ancestor. The most common 2026 scroll-container pattern:
  ```jsx
  // Sidebar that scrolls internally, with a sticky header inside the sidebar
  <aside className="h-dvh overflow-y-auto overscroll-contain">
    <header className="sticky top-0 bg-card z-10 px-4 py-2">Filters</header>
    <ul>
      {items.map(item => <li>...</li>)}
    </ul>
  </aside>
  ```
  The senior recognition: the scroll container (`overflow-y-auto`) and the sticky element (`sticky top-0`) work together. Without the overflow, sticky has nothing to stick to; without sticky, the header scrolls away.
- **`scrollbar-gutter: stable` — preventing layout shift.** A short, concrete walkthrough. When `overflow: auto` is used and content sometimes overflows and sometimes doesn't, the scrollbar's appearance and disappearance shifts the layout (the content shrinks horizontally to make room for the scrollbar). `scrollbar-gutter: stable` reserves the scrollbar's space always — the layout doesn't shift. Tailwind v4.3+ ships `[scrollbar-gutter:stable]` as the bracket form (a top-level utility may exist in newer minor versions; the chapter teaches the bracket form for safety). The 2026 senior reach: any container that conditionally overflows on user interaction (a search-results list, a modal body) gets `[scrollbar-gutter:stable]` to prevent the visible jolt when content count changes.
- **Per-element scroll vs. page scroll — the architectural decision.** A short, opinionated walkthrough.
  - **Page-level scroll** — `<html>`/`<body>` scrolls; the page is the scroll container. The 2026 default; works with browser back/forward, scroll restoration, anchor links, deep linking with hash fragments.
  - **App-shell scroll** — `<body>` doesn't scroll; an inner `<main className="overflow-y-auto h-dvh">` scrolls. The 2026 reach: a fixed sidebar + a scrollable main, where the sidebar should never scroll with the page. The watch-out: scroll restoration (browser remembers scroll position on back navigation) is broken by default; manual restoration (Next.js `experimental.scrollRestoration` or a custom hook) is needed.
  - The senior recognition: the page-level scroll is the default for content sites and most SaaS apps. The app-shell scroll is the right reach for dashboards and tool-style UIs where the layout chrome should stay fixed.
- **`scroll-snap-*` — the modern carousel primitive.** A short tour. CSS scroll-snap lets a scroll container snap to specific child positions.
  - **`scroll-snap-type: x mandatory`** (Tailwind: `snap-x snap-mandatory`) — snap on the horizontal axis, every snap point is mandatory.
  - **`scroll-snap-align: start`** (Tailwind: `snap-start`) — child snaps to the container's start edge.
  - **`scroll-padding`** — adjust where children snap, accounting for sticky headers.
  - The 2026 reach: image carousels, horizontal card scrollers, story-style UIs. Replaces JavaScript-driven carousel libraries for most cases.
- **The watch-outs a senior names:**
  - **`overflow: hidden` creates a new scroll container** — even though the bars don't show, the element is now scrollable programmatically. This affects `position: sticky` (a sticky inside an `overflow: hidden` parent only sticks within that parent, not the page). The senior reach: use `overflow: clip` if you want clipping without scroll-container creation.
  - **`overflow-x-hidden overflow-y-visible` doesn't work as expected** — overflow on one axis forces the other to `auto` (per spec). If you need different behaviors per axis, restructure the parent.
  - **`overscroll-contain` is Baseline universal** — no polyfill, no fallback needed. Ship it.
  - **iOS scroll-momentum** — `-webkit-overflow-scrolling: touch` is no longer needed in 2026 (default behavior).
  - **Horizontal scroll containers need `overflow-x-auto` plus children with `shrink-0`** — without `shrink-0`, flex items compress instead of overflowing. The 2026 horizontal-scrolling-row pattern: `<div className="flex gap-4 overflow-x-auto"><Card className="shrink-0 w-72" />...</div>`.
  - **Modal scroll-lock breaks on iOS unless touchmove is intercepted** — the project chapter cashes in.
  - **`scrollbar-width: thin` and `scrollbar-color`** — the standard CSS properties for scrollbar styling. Tailwind v4.3+ ships utilities. The 2026 reach: cosmetic styling of scroll bars in dashboards; otherwise leave native.

What this lesson does not cover:

- Stacking context and z-index — Lesson 4.4.9.
- Position and inset utilities — Lesson 4.4.7 (cross-referenced for sticky).
- React Portals — Chapter 4.6.5.
- The `useLockBodyScroll` custom hook implementation — project chapter (4.12.5).
- IntersectionObserver and scroll-driven animations — Chapter 4.5.5 has a brief touch; advanced scroll-driven animations are out of scope.
- Custom scrollbar styling at depth — niche; the chapter mentions the surface and moves on.
- `content-visibility: auto` for off-screen optimization — niche performance tool, Chapter 20 territory.

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson installs the overflow modes, the `overscroll-behavior` family, the sticky-inside-overflow interaction, and the canonical patterns (sidebar scroll, modal scroll-lock, horizontal scroller). The deliverable is recognition — the student writes `overflow-y-auto overscroll-contain` for any scrollable region, `[scrollbar-gutter:stable]` to prevent layout shift, and recognizes the iOS scroll-chain bug.

Open with the senior question — "you built a modal with a long form; when the user scrolls past the form, the page underneath scrolls. What's the 2026 reach?" — and a `MultipleChoice` exercise pitting four answers (`overflow: hidden` on body — partial fix, fails on iOS; `overscroll-contain` on the modal body + body scroll-lock — right; `position: fixed` on the modal — doesn't solve scroll-through; preventing wheel events with JavaScript — last-resort hack). The discrimination installs `overscroll-contain` plus body-lock as the pattern.

A hand-authored SVG `Figure` renders a side-by-side comparison of the overflow modes — `visible` (content overflows visibly), `hidden` (clipped, no scroll), `clip` (clipped, no scroll container), `auto` (clipped, scrollbar appears when needed), `scroll` (clipped, scrollbar always). Each rendered with the same overflowing content. The vocabulary locks in.

A second `Figure` shows the scroll-chain mechanics — a modal inside a page, a user scrolling the modal to the bottom, the chain triggering page scroll. With `overscroll-contain` enabled, the scroll stops at the modal boundary. The cause-and-effect is concrete.

A `Matching` exercise pairs eight Tailwind utilities with their CSS — `overflow-auto` (`overflow: auto`), `overflow-hidden` (`overflow: hidden`), `overflow-clip` (`overflow: clip`), `overflow-x-auto` (`overflow-x: auto`), `overscroll-contain` (`overscroll-behavior: contain`), `overscroll-y-contain` (`overscroll-behavior-y: contain`), `[scrollbar-gutter:stable]` (`scrollbar-gutter: stable`), `snap-x snap-mandatory` (`scroll-snap-type: x mandatory`).

A `Buckets` exercise sorts twelve scrolling needs into "page-level scroll (default)" vs. "internal scroll container (`overflow-y-auto`)" vs. "horizontal scroller (`overflow-x-auto`)" vs. "scroll-lock (modal/drawer)" vs. "scroll-snap (carousel)" vs. "clip only (no scroll)" — main content area on a docs site (page-level), sidebar with too many filters (internal scroll), horizontal row of recommendation cards (horizontal scroller), modal body (internal scroll + overscroll-contain + body lock), image carousel (snap), `rounded-xl` wrapper around an image (clip), dashboard main panel (internal scroll for app-shell layout), search-results list (internal + scrollbar-gutter stable), settings page (page-level), drawer body (internal + overscroll-contain), dropdown menu with many items (internal scroll, max-h-*), tooltip (no scroll, no overflow needed).

An interactive widget renders a scrollable modal body. Toggles control `overscroll-behavior` (auto / contain), `scrollbar-gutter` (auto / stable), and an outer "page scroll background" simulation. The student scrolls the modal to the bottom; with `auto`, the page scrolls behind; with `contain`, scroll stops. With `stable` gutter, the layout doesn't shift when content count changes. The cause-and-effect is concrete.

A `PredictOutput` exercise on four overflow scenarios:
1. `<div className="overflow-y-auto h-64">` with content taller than 64 — predict (vertical scrollbar appears; horizontal does not).
2. `<aside className="sticky top-0 h-dvh">` inside a `<body>` without `overflow-y-auto` set anywhere — predict (sticky still works because `<html>`/`<body>` is the page scroll container by default).
3. `<div className="overflow-x-hidden overflow-y-visible">` — predict (overflow-y is silently forced to auto because per-axis differences are restricted; bug-recognition).
4. `<div className="flex gap-4 overflow-x-auto"><Card className="w-72" />×10</div>` — predict (without `shrink-0`, cards compress; horizontal scroll doesn't appear).

A `CodeReview` exercise on a 30-line component with six issues:
- A modal body that lets the page scroll through when reaching the bottom — fix: `overscroll-contain`.
- A horizontal scroller where cards compress — fix: `shrink-0` on each card.
- A sidebar with `sticky top-0` that doesn't stick because no scroll container exists — fix: `overflow-y-auto h-dvh` on the parent.
- A search-results list that visibly jolts when results count changes — fix: `[scrollbar-gutter:stable]`.
- A `body { overflow: hidden }` for modal scroll-lock that fails on iOS — fix: combine with touchmove preventDefault (forward reference 4.12.5).
- A `<div className="overflow-hidden rounded-lg">` containing an image that triggers a useless scroll container — fix: `overflow-clip` if scroll behavior is unwanted.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student build a sidebar with a sticky header and an internal-scrolling list. The grader checks: the sidebar has `overflow-y-auto h-dvh overscroll-contain`, the header has `sticky top-0`, the list scrolls inside the sidebar, the page underneath doesn't scroll when the user scrolls inside the sidebar.

Close with a `TrueFalse` round of six statements: "`overflow: hidden` creates a scroll container even though no scrollbar shows" (true), "`overscroll-contain` prevents the scroll chain to parent containers" (true), "`position: sticky` works without any scrollable ancestor" (false — needs one), "`scrollbar-gutter: stable` reserves space for the scrollbar even when content fits" (true), "`overflow-x-hidden overflow-y-visible` works as written" (false — overflow forces both axes to a non-visible mode together), "Horizontal scrollers need `shrink-0` on the children to prevent compression" (true). The model is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Lesson 4.4.9 (stacking context interaction with overflow), Chapter 4.6.5 (portals + scroll-lock), Chapter 4.11.5 (empty-state and overflow patterns), and the project chapter (4.12.5 builds the drawer with overflow + scroll-lock).

---

## Lesson 4.4.9 — Stacking context and z-index

Topics to cover:

- The senior question: the student opens a modal with `z-50`. Inside the modal is a tooltip with `z-100`. The tooltip appears *behind* the modal backdrop, even though `100 > 50`. The student double-checks the values, opens DevTools, and the z-index is correctly set to 100 — but visually it's behind. What just happened? The 2026 answer names the *stacking context* — `z-index` is scoped to a stacking context, and any of `opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, or several other properties on an ancestor creates a new stacking context that traps every descendant's z-index inside. The lesson installs the stacking-context model, the canonical bugs, and the senior fixes (portals to escape; `isolation: isolate` to scope deliberately; numeric z-index conventions to keep the layering legible).
- **What `z-index` actually does — the model.** A short, concrete walkthrough. `z-index` sets an element's order on the *z-axis* (depth) within its *stacking context*. Higher values stack on top of lower values within the same stacking context. Critically:
  - **`z-index` only applies to positioned elements** (`position: relative`, `absolute`, `fixed`, `sticky`) or flex/grid items.
  - **`z-index` is scoped to the stacking context.** A `z-index: 100` inside a parent stacking context with `z-index: 1` competes only with siblings inside the parent's context; it doesn't compare against elements in *another* stacking context.
- **What creates a new stacking context.** A short, load-bearing list. A new stacking context is created when an element has any of:
  - **`position: fixed` or `sticky`** (always).
  - **`position: relative` or `absolute` *with* `z-index` other than `auto`**.
  - **`opacity < 1`** — even `opacity: 0.99`. The most surprising trigger.
  - **`transform` other than `none`** — `transform: translate(0)`, `translate3d(0,0,0)`, `scale(1)`. The "GPU-acceleration hack" that breaks z-index.
  - **`filter` other than `none`** — `filter: blur(0)`, etc.
  - **`backdrop-filter` other than `none`**.
  - **`isolation: isolate`** — the *deliberate* way to create a new stacking context without other side effects.
  - **`will-change` set to certain properties** (`will-change: transform`).
  - **`mix-blend-mode` other than `normal`**.
  - **`contain: layout` / `paint` / `style`** (any of these contain values).
  - The senior recognition: the trigger list is long and the surprise is real. The most common in-the-wild offenders: `opacity` for fade transitions, `transform` for translate animations or layout effects, `position: fixed` for headers and modals, `backdrop-filter` for blurred backgrounds.
- **The canonical bug — z-index that "doesn't work."** A short, concrete worked example. The setup:
  ```jsx
  <div className="opacity-95"> {/* parent: opacity creates a new stacking context */}
    <div className="relative z-50"> {/* z-50 — but inside parent's context */}
      I should be on top
    </div>
  </div>

  <div className="relative z-40"> {/* z-40 — in the root context */}
    I'm at root z-40
  </div>
  ```
  The parent `<div className="opacity-95">` creates its own stacking context. The child's `z-50` is scoped to that parent's context — it competes with siblings inside the parent, but the entire parent's stacking context has z-index `auto` (effectively `0`) at the root level. The sibling `<div className="z-40">` is in the root context with `z-40`, which beats the parent's `auto/0`. Result: the child shows behind the sibling, even though `50 > 40`.
- **The fix — three patterns.** A short tour.
  - **Portal the floating element to `<body>`.** The most common 2026 fix for modals, popovers, tooltips. The element renders in a different DOM location (outside the trapping ancestor), so it's not in the trapped context. React's `createPortal` (Chapter 4.6.5 owns the implementation; shadcn's Dialog, Popover, Tooltip all do this).
  - **Use `isolation: isolate` deliberately to scope a context.** When the design wants a section's z-index conflicts contained (a card with internal layered elements that shouldn't escape into the page), `isolation: isolate` (Tailwind: `isolate`) on the card creates a new stacking context cleanly — without `transform`, `opacity`, or `position` side effects.
  - **Restructure the DOM to lift the floating element above the trapping parent.** If the modal is rendered as a sibling of the `<div className="opacity-95">` instead of a descendant, the trap doesn't apply.
- **Numeric z-index conventions — keeping the layering legible.** A short, opinionated walkthrough. Z-index spaghetti happens when z-indexes proliferate (`z-9999`, `z-99999`, `z-9999999`). The 2026 senior reach is a small set of named tiers, codified in tokens or convention:
  - **`z-0`, `z-10`, `z-20`** — content-level layering (a card overlay, a sticky table header, a dropdown inside a panel).
  - **`z-30`, `z-40`** — page chrome (sticky page header, footer).
  - **`z-50`** — modals, drawers, dialogs.
  - **Higher** — toasts, tooltips when not portaled (rare; portaled tooltips don't need explicit z-index because they're outside the trap).
  - The senior recognition: keep the tiers sparse and named. shadcn's components already follow this convention internally.
- **Tailwind z-index utilities.** A short tour. `z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`, `z-auto` (default), and arbitrary `z-[200]`. The Tailwind scale is the senior tier set; reach for arbitrary values rarely.
- **The `isolation` property — the explicit-stacking-context tool.** A short cash-in. `isolation: isolate` (Tailwind: `isolate`) creates a new stacking context with no other side effects. The 2026 reaches:
  - **Scoping a card's internal layering** so the card's badge / overlay / tooltip can't accidentally escape into the page.
  - **Establishing a stacking context for an element that uses `mix-blend-mode`** (which would otherwise blend with the page background).
  - **Replacing the `transform: translateZ(0)` hack** for "force a new stacking context without other effects."
- **DevTools — finding the trap.** A short tour. Chrome's Layers panel (`Cmd+Shift+P` → "Show Layers") shows the page's compositing layers, which roughly correspond to stacking contexts. Hovering a layer highlights it in the viewport. The senior debugging move when z-index "doesn't work": find the element in Layers, walk up the DOM tree in Elements, look for the ancestor that has `opacity`, `transform`, `filter`, `position: fixed/sticky`, or `isolation` — that's the trap.
- **The watch-outs a senior names:**
  - **`opacity` is the most surprising stacking-context trigger.** A `transition: opacity` for a fade-in animation creates a new stacking context for the duration of the animation, which can briefly trap z-indexed children. The fix: portal the floating elements; or use `transform: scale(...)` with `opacity` together (no extra trap because `transform` already creates one).
  - **`position: fixed` on the modal *itself* doesn't escape an ancestor's transform.** The modal is positioned relative to the *transformed ancestor's* containing block, not the viewport. The fix: portal.
  - **`z-index: -1` on a child puts it behind its parent's background**, which is sometimes the right reach for decorative bg layers.
  - **`relative` without `z-index`** doesn't create a stacking context, so it doesn't trap children. But once you set `z-index: 0` (or any value), it becomes a context. The watch-out: `relative z-0` is *not* the same as `relative` for stacking purposes.
  - **shadcn's Dialog, Popover, and Tooltip all portal to `<body>`** — they don't suffer the trap. When the student writes their own floating UI, the lesson learned is the same: portal it.
  - **Arbitrary high z-index (`z-9999`) is a code smell**, not a fix. The bug is almost always a stacking-context trap that no value of z-index can defeat from inside the trap.
  - **`will-change: transform` on a parent for performance creates a stacking context.** Don't apply it preemptively — only when you've measured a real perf win. The trade-off is more than just GPU.

What this lesson does not cover:

- React Portals at depth — Chapter 4.6.5.
- shadcn's Dialog, Popover, Tooltip implementation — Chapter 4.11.1.
- CSS Animation and transform — Chapter 4.5.5.
- The `position` modes themselves — Lesson 4.4.7.
- The browser layout engine — out of scope; the chapter teaches behavior, not implementation.
- 3D transforms and `transform-style: preserve-3d` — niche.
- `accent-color` and other related properties — out of scope.

Pedagogical approach:

Concept-plus-pattern archetype. The lesson installs the model (`z-index` is scoped, contexts trap descendants, the trigger list is broad) and the senior reach (portal floating elements, use `isolation` to scope deliberately, keep the z-index tier set small). The deliverable is recognition — the student sees a "z-index doesn't work" bug and immediately walks the DOM tree looking for the trap.

Open with the senior question — "your modal has `z-50` and your tooltip inside it has `z-100`; the tooltip shows behind the backdrop. What's wrong?" — and a `MultipleChoice` exercise pitting four answers (z-index isn't applied because the modal is `static` — wrong, modals are positioned; the tooltip needs `position: relative` — wrong, it already does; the modal's parent created a stacking context that trapped the tooltip — right; z-index values don't work above 50 — wrong). The discrimination installs the trap concept.

A hand-authored SVG `Figure` renders the stacking-context tree — DOM tree on the left (a page → header → modal-trigger → modal → tooltip), stacking-context tree on the right (root context → modal context, with the modal trapped inside the parent's `transform`-created context). The visual makes the trap concrete.

A `Matching` exercise pairs ten CSS properties / utilities with "creates stacking context" or "doesn't" — `position: fixed` (creates), `position: relative` (no, unless z-index set), `position: relative; z-index: 0` (creates), `opacity: 0.99` (creates), `transform: translate(0)` (creates), `filter: blur(0)` (creates), `isolation: isolate` (creates — deliberately), `display: flex` (no), `overflow: hidden` (no), `will-change: opacity` (creates).

A `Buckets` exercise sorts twelve scenarios into "trap created (suspect parent)" vs. "no trap (root context)" vs. "fix: portal" vs. "fix: isolation: isolate" — a modal `z-50` shown behind a sibling page section with `z-40` (trap on the section's parent), a popover trapped inside a transformed card (fix: portal), a card with internal badge layering that should be scoped (fix: isolation), a sticky header with `z-30` competing with a sticky sidebar `z-20` (no trap; correct order), a tooltip inside a `transform`-using parent showing behind the modal (fix: portal), a `mix-blend-mode` element bleeding into the page background (fix: isolation), a fade-transitioning card briefly trapping its dropdown (fix: portal the dropdown), a hover overlay on a card (no trap if scoped right), a `position: relative` element with `z-50` (no new context unless z-index is set — was it?), a `will-change: transform` ancestor (creates), a navbar with `backdrop-filter: blur` and an absolute-positioned dropdown (trap; fix: portal), a footer with `z-30` competing with header `z-30` (source order decides; restructure).

An interactive widget renders a small page — a header (no special properties), a card with `transform: translate(0)` toggle, a "popover" inside the card with `z-100`, a "modal backdrop" sibling of the card with `z-50`. The student toggles the parent's transform; with transform off, the popover sits above the modal; with transform on, the popover trapped behind the modal. The cause-and-effect is concrete.

A `PredictOutput` exercise on four scenarios:
1. `<div className="opacity-95"><div className="relative z-50">A</div></div>` next to `<div className="relative z-40">B</div>` — predict (B is on top, because the opacity parent traps A in a new context with implicit z-index 0).
2. `<div className="isolate"><div className="relative z-50">A</div></div>` next to `<div className="relative z-100">B</div>` — predict (B is on top — A is trapped by `isolate`).
3. `<Modal>` portaled to `<body>` — predict (escapes any trapping ancestor).
4. `<button className="z-50">` (no `position` set) — predict (z-index has no effect; element doesn't establish stacking).

A `CodeReview` exercise on a 30-line component layout with six issues:
- A modal `z-50` showing behind a transformed parent's other children — fix: portal to body.
- A tooltip with `z-9999` to "force it on top" — fix: portal; high z-index is the smell, not the fix.
- A `transform: translateZ(0)` on a card "for GPU performance" trapping its internal dropdown — fix: replace with `isolate` if isolation is wanted, or remove the transform.
- A `relative z-50` on a `<button>` doing nothing because no `position` was set first (typo — `<button>` is positioned by default? no — it's `inline-block` not positioned) — fix: ensure positioned, or recognize z-index is moot here.
- A z-index waterfall (`z-10`, `z-20`, `z-30`, ..., `z-99`) without a tier convention — fix: use `z-0` / `z-10` / `z-20` / `z-30` / `z-40` / `z-50` named tiers.
- A `<header className="sticky top-0">` without `z-10` competing with content scrolling underneath — fix: add `z-10` to keep header above content.

The student leaves a comment per issue with the senior fix.

An `HtmlCssCoding` block has the student demonstrate the trap by setting up a transformed parent with a high-z-index child, then fix it two ways: by portaling (simulated — moving the child out of the parent in the DOM), and by removing the transform. The grader checks: both fixes work; the student names the trap correctly in a comment.

Close with a `TrueFalse` round of six statements: "`z-index` works on every element regardless of `position`" (false — needs positioned or flex/grid item), "`opacity: 0.99` creates a new stacking context" (true), "`isolation: isolate` is the right tool to create a stacking context without `transform` or `opacity` side effects" (true), "Portaling a floating element to `<body>` escapes ancestor stacking contexts" (true), "A higher `z-index` value always wins over a lower one regardless of stacking context" (false — only within the same context), "shadcn's Dialog and Popover portal to `<body>` to avoid the trap" (true). The model is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 4.6.5 (portals — the React-side fix), Chapter 4.11.1 (shadcn floating UI), Chapter 4.11.4 (focus management for modals), and the project chapter (4.12.5 builds the drawer with portal escape).

---

## Lesson 4.4.10 — Chapter quiz

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
