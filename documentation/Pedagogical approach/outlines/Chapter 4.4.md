# Chapter 4.4 — Layout and sizing — pedagogical approach

## Concept 1 — `border-box` and how a declared width composes

**Why it's hard.** Returning devs carry the `content-box` mental model where `w-64 p-4 border` produces `256 + 32 + 2`. Preflight quietly flipped this years ago, and until the student internalizes the new arithmetic, every padding change feels like it should change the outer width — and arbitrary "off by 18 px" debugging sessions follow.

**Ideal teaching artifact.** A controllable box-model widget. The student sets a declared width and reads off two outputs side by side: the rendered outer width under `border-box` (which is just the declared width) and under `content-box` (which adds the padding and border). Sliders for width, padding, and border. The widget shows the four concentric boxes color-coded — content, padding, border, margin — with live readouts of "declared width", "rendered outer width", and the formula. The point isn't the slider; it's the moment the student moves the padding slider and notices the rendered width *does not change* under `border-box`. A Mechanics-meets-Concept hybrid — the senior reach is the unchanged outer width, not a definition of the four boxes.

**Engagement.** Three `PredictOutput`-style mini-prompts: given `w-64 p-4 border-2`, what's the rendered width? Given the same utilities with a custom `* { box-sizing: content-box }` override, what's the rendered width? Given `w-full p-6` inside a 400 px parent, does the child overflow?

**Components.**
- New: `BoxModelSizer` — sliders for declared width / padding / border, toggles `border-box` vs `content-box`, renders the four nested boxes with live outer-width readout. Forward-links to 4.4.5 (sizing intuition) and 4.4.7 (`inset-0` filling a parent).
- Existing: `PredictOutput` for the three prediction prompts after the widget.

**Project link.** The hero, feature card, and pricing tiers in 4.12.3–4.12.4 each declare widths with padding; the student writes them without doing the addition because `border-box` is assumed.

---

## Concept 2 — The `--spacing` scale as a single dial

**Why it's hard.** The student sees `p-4`, `gap-6`, `mt-2`, `space-y-3` as twenty separate magic numbers. The senior insight is that they are *one variable times an integer*, and the whole design system's rhythm changes by editing `--spacing` in `@theme`.

**Ideal teaching artifact.** A live "rhythm dial." The student edits a single `--spacing` value (a number input) and watches a small composed UI — a card, a list, a form row — rescale all its spacing proportionally. A second readout shows which utilities are active (`p-4`, `gap-6`, `space-y-3`) and what each one resolves to numerically given the current `--spacing`. A Concept artifact — the moment of recognition is that twenty utilities collapse into one knob.

**Engagement.** A `Tokens` round on a small CSS block: click every place where `var(--spacing)` is implicitly multiplied. Correct targets are `p-4`, `gap-6`, `mt-2`; decoys include `w-64` (which is also on the scale but a different mental category) and `text-lg` (which isn't).

**Components.**
- Reuse: `HtmlCssCoding` with the iframe preview, scaffolded so the student edits only `@theme { --spacing: ... }` and sees the whole composed surface rebreathe. The lesson uses the existing live-coding primitive; no new component needed.
- Existing: `Tokens` for the recognition exercise.

---

## Concept 3 — The inline/block axis and logical properties

**Why it's hard.** "Left and right" feel native to LTR English speakers; the senior framing — that CSS calls them *inline* and *block* and that they flip under `direction: rtl` or vertical writing modes — is a model shift. Until the student switches direction once and watches `pl-4` stay on the same physical side while `ps-4` flips, the term "logical" stays abstract.

**Ideal teaching artifact.** A side-by-side comparison panel. Two identical card components — one styled with physical utilities (`pl-4`, `ml-2`, `left-2`), one with logical (`ps-4`, `ms-2`, `inset-s-2`). A single toggle flips both into RTL. The physical card stays anchored to the visual left; the logical card mirrors. The student watches the cards' padding, margin, and offsets reassign sides in real time. A Decision artifact — the senior call is "logical from day one when shipping RTL; physical is fine in LTR-only with mechanical migration later," and the panel makes the mechanical-migration cost visible.

**Engagement.** A `Buckets` sort: drag a mixed list of utilities (`pl-4`, `ps-4`, `mr-2`, `me-2`, `left-0`, `inset-s-0`, `pb-3`, `pbe-3`) into "physical" and "logical" columns.

**Components.**
- New: `LogicalAxisToggle` — wraps two MDX children (physical and logical variants), exposes one LTR/RTL toggle, renders them side by side. Tiny component. Forward-link to 4.4.7 (the same toggle pattern reused for `inset-s-*`).
- Existing: `Buckets` for the sort.

**Project link.** The starter doesn't ship RTL but the lesson plants the reflex; a senior auditing 4.12 would note that `pl-*` outside the prose body is a future-tax line.

---

## Concept 4 — Margin collapse, recognized then routed around

**Why it's hard.** Margin collapse is one of CSS's two rules a returning dev half-remembers and then can't reproduce — adjacent block siblings' vertical margins collapse to the larger value, but the rule has carve-outs (flex/grid items don't collapse, padding or border breaks the collapse). The senior framing is *don't fight it* — recognize the smell, switch to `gap` on a flex/grid parent.

**Ideal teaching artifact.** A wrong-by-default sandbox. The student opens a small `HtmlCssCoding` with two paragraphs each given `margin-top: 2rem` and `margin-bottom: 2rem`, expecting 4rem between them. The DevTools rule output (inline) shows them collapsing to 2rem. The student is then asked to *make the gap 4rem* without changing the margin values. The intended fix isn't "add border" or "wrap in another block" — it's `display: flex; flex-direction: column; gap: 4rem` on the parent, which retires the margin pattern entirely. A Pattern artifact — the lesson is named for the smell it prevents.

**Engagement.** The sandbox carries the assessment (the layout has to render with 4rem of visible space). Follow up with one `MultipleChoice`: of four containers (block list, flex column, grid, inline-block siblings), which one's children's vertical margins collapse?

**Components.**
- Reuse: `HtmlCssCoding` with a DOM test — assert that two named paragraphs render at least 4rem apart.
- Existing: `MultipleChoice` for the follow-up.

---

## Concept 5 — Display modes as a decision, not a definition

**Why it's hard.** Listing seven display values teaches nothing; the senior reach is "given this shape, which mode?" A row with mixed items wants `flex`, a 2D card grid wants `grid`, a semantic wrapper that shouldn't break the layout wants `contents`, an icon inside text wants `inline-flex`. Reference-tone teaching ("here are the modes…") inverts that and produces students who can recite the list but stall at the choice.

**Ideal teaching artifact.** A guided decision flow. The student sees six micro-mockups (a horizontal nav with a logo and links, a card with header/body/footer, a paragraph with an inline status pill, a wrapping `<section>` around an existing flex row, a fully-hidden tab panel, a 3×3 card grid) and for each picks the display utility from a dropdown. Each correct pick reveals a one-sentence senior framing. A Decision archetype — the artifact is the assessment.

**Engagement.** The picker round itself is the recall moment; close with a `TrueFalse` round of three statements (`inline` elements respect `width`; `display: contents` removes the element from a11y; `<button>` is `inline-block` by default).

**Components.**
- Existing: `Dropdowns` with the inline `<Choice>` form for the six mockups.
- Existing: `TrueFalse` for the close.

---

## Concept 6 — The three hide mechanisms and their a11y consequences

**Why it's hard.** "How do I hide this?" hides three distinct intents under one verb: gone from layout *and* a11y (`display: none`), visually gone but in the a11y tree (`sr-only`), visually present but a11y-hidden (`aria-hidden`). A student who picks the wrong one writes a screen-reader bug they will never hear.

**Ideal teaching artifact.** A two-column comparator. Left column: a small UI with each of four elements marked with a different hide mechanism (`display: none`, `visibility: hidden`, `sr-only`, `aria-hidden`). Right column: a simulated a11y tree (what a screen reader sees) and a layout tree (what the browser paints) — both rendered as collapsible trees. The student flips each mechanism on/off and watches which tree the element disappears from. A Concept-meets-Decision artifact — the two trees side by side are the model that makes the four choices distinct.

**Engagement.** A `Matching` round: four UI intents on the left (decorative icon next to redundant label, modal panel that's closed, off-screen skip-link target, placeholder area that must keep its size) ↔ four mechanisms on the right.

**Components.**
- New: `A11yLayoutTrees` — takes a small DOM fragment as a child, renders the two trees (layout + a11y) side by side, with each element's hide-mechanism toggle in a control bar. Forward-links to 4.11.3 (`sr-only`, `aria-hidden`, live regions).
- Existing: `Matching` for the recall.

**Project link.** 4.12.5's mobile drawer toggles between visible and `hidden` states; the lesson plants the reflex that "closed" means the panel is removed from the a11y tree, not just visually slid off-screen.

---

## Concept 7 — Flexbox axes and the "name the axis first" rule

**Why it's hard.** `justify-content` vs `align-items` is the most-misremembered pair in CSS. The senior framing is that every flex property is *named for an axis*, and the student should name the axis before reaching for a property. Once installed, `justify-*` on main and `items-*` on cross become reflexive; without it, every flex line is a guess.

**Ideal teaching artifact.** A flex playground with explicit axis labels. A flex container with three child boxes; controls for `flex-direction` (row, col, row-reverse, col-reverse), `justify-content`, `align-items`, and `gap`. The container itself is overlaid with two labeled arrows: "main" (always the primary axis given the current direction) and "cross" (always perpendicular). When the student flips `flex-direction` from row to column, the arrows visually rotate — and the same `justify-center` setting now centers vertically because main flipped. A Mechanics + Concept hybrid; the controllable axes carry the lesson.

**Engagement.** Three `PredictOutput` prompts with a static screenshot: given `flex-col justify-end items-center`, where does the third item land? Given `flex-row-reverse justify-start`, where does the first item land? Given `flex items-baseline` on a row with mixed font sizes, what aligns?

**Components.**
- New: `FlexAxisPlayground` — controls for direction/justify/items/gap, renders a flex container with three children and overlaid axis arrows that rotate with direction. Forward-link to 4.4.4 (grid playground reuses the same control-bar pattern) and to 4.5.6 (responsive variants on flex direction).
- Existing: `PredictOutput` for the three prompts.

**Project link.** 4.12.3's header uses `flex items-center justify-between`; 4.12.4's pricing card footer uses `flex items-baseline gap-1` for "$29 /mo". The student writes both without lookup.

---

## Concept 8 — `flex-1` and the `min-w-0` companion

**Why it's hard.** `flex-1` is the most-reached-for flex shorthand and also the source of the most common flex bug in 2026: an item with `flex-1` containing a long unbreakable string (a URL, a wide image, an SVG icon row) blows out the row because `flex-1` sets `min-width: 0` *only* on the item, not on its content, and the implicit `min-content` floor still applies. The fix — `min-w-0` on the flex child, or `min-w-0` on a nested flex container that also wants to shrink — is mechanical but invisible until the student has seen the bug.

**Ideal teaching artifact.** A wrong-by-default repair sandbox. The student opens a `HtmlCssCoding` with a horizontal layout: avatar (`shrink-0`), a `flex-1` middle column containing a long URL string, and a sign-in button (`shrink-0`). The middle column has overflowed the parent and pushed the button off-screen. The student's job: add the one Tailwind utility that fixes it. The fix is `min-w-0`. The DOM test asserts the parent's `clientWidth` equals the sum of children's widths (no horizontal overflow). A Pattern artifact — the lesson is named for the bug.

**Engagement.** The repair carries the assessment. One follow-up `MultipleChoice`: of `flex-1`, `flex-auto`, `flex-none`, `shrink-0`, which two never need `min-w-0`?

**Components.**
- Reuse: `HtmlCssCoding` with a tests-mode DOM assertion on overflow.
- Existing: `MultipleChoice`.

**Project link.** The 4.12.3 hero with a CTA cluster and the 4.12.5 mobile drawer's link list both have flex rows with `flex-1` middles; the student has the reflex installed.

---

## Concept 9 — The five canonical flex patterns

**Why it's hard.** "Knowing flex" isn't knowing the algorithm, it's having five layouts in muscle memory: nav with spacers, form row, card column, toolbar with `flex-1` spacer, card with bottom-pinned footer. The student who can recite the algorithm but has to re-derive each layout writes slower than the student who pattern-matches.

**Ideal teaching artifact.** A pattern cheat-sheet rendered as five `Figure`-wrapped micro-cards, each showing the rendered layout above and the three-or-four-utility class string below. The student scrolls past once; the card grid is the artifact. A Reference archetype — explicitly a survey, but a tight five-item one with a "reach for it when…" line per pattern.

**Engagement.** A `Matching` round: five rendered mockups ↔ five class strings. The student matches without re-deriving, which is the recall this concept actually wants.

**Components.**
- Existing: `Figure` and `CardGrid` for the five-pattern cheat-sheet. No new component — single-use bespoke layouts don't earn one.
- Existing: `Matching` for the recall.

**Project link.** All five patterns appear verbatim in 4.12. The chapter's cheat-sheet becomes the student's mental index.

---

## Concept 10 — Grid tracks and the `fr` unit

**Why it's hard.** Grid is taught everywhere as "rows and columns," which is the layout but not the model. The model is *tracks* — column tracks and row tracks defined by `grid-template-columns` and `grid-template-rows` — and `fr` is *fraction of leftover space after fixed and content tracks subtract*. Until the student watches a `200px 1fr 1fr` layout reflow as the container resizes, "fraction" is just a word.

**Ideal teaching artifact.** A track inspector. The student edits a `grid-template-columns` string (e.g. `200px 1fr 2fr` or `auto 1fr min-content`) and a container width slider. The widget renders the resulting tracks with their computed widths labeled inline, and below it a small card grid using those tracks. Two readouts: "fixed track total" and "fr unit value (= leftover ÷ fr-total)". A Concept artifact — the readouts make the formula visible.

**Engagement.** Three `PredictOutput` prompts on track strings: given `1fr 2fr 1fr` in a 800-px container, what's the middle track's width? Given `200px 1fr` in 600 px, what's the second track? Given `repeat(3, minmax(0, 1fr))` with three 400-px children and a 900-px container, do the children overflow?

**Components.**
- New: `GridTrackInspector` — text input for `grid-template-columns`, width slider, computed-track readouts, rendered grid. Forward-links to 4.4.4's auto-fit lesson, 4.5.7 (container queries — same inspector pattern with `cqi`), and the project's three-column feature grid.
- Existing: `PredictOutput`.

**Project link.** 4.12.3's feature grid is `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`; the student writes it knowing the v4 default already wraps in `minmax(0, 1fr)`.

---

## Concept 11 — `auto-fit minmax` — responsive without breakpoints

**Why it's hard.** The student has been taught "responsive = breakpoints" for a decade. The 2026 senior reach for card grids is `grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]`, which contains no breakpoints — the layout reflows continuously based on a minimum card size. The mental shift is from discrete breakpoints to continuous constraints.

**Ideal teaching artifact.** A scrollytelling-flavored side-by-side. Two card grids stacked vertically, identical content. The top uses `md:grid-cols-2 lg:grid-cols-3` (discrete breakpoints). The bottom uses `auto-fit minmax(16rem, 1fr)` (continuous). A single container-width slider drives both. The student drags the slider from 320 px to 1400 px and watches the top jump at `md` and `lg` while the bottom reflows smoothly. A Decision artifact — the senior choice is "auto-fit when card-size is the design; breakpoints when column-count is the design," and the side-by-side makes both legible.

**Engagement.** One `MultipleChoice` with four scenarios (a marketing feature grid with three exact columns at desktop; a photo gallery where any number of thumbnails fit; a settings page with two columns at tablet and one at mobile; a tag cloud), pick `auto-fit` or breakpoints for each.

**Components.**
- New: `ResponsiveGridSideBySide` — two grids, one width slider drives both via a shared container-width simulation. Reuses the same control idea as `GridTrackInspector`; forward-link to 4.5.6 and 4.5.7.
- Existing: `MultipleChoice`.

---

## Concept 12 — `grid-template-areas` and subgrid for page shells

**Why it's hard.** Numeric track placement (`col-start-2 row-end-4`) reads as line noise after a week away. `grid-template-areas` lets the student write the page layout as ASCII art and reference areas by name — but it's optional sugar, and students dismiss it as "extra syntax" until they see the same shell expressed both ways and read each three months later. Subgrid is a similar pitch at the row-of-cards level.

**Ideal teaching artifact.** Two parallel implementations of a header / sidebar / main / footer page shell — one with `col-span` / `row-span` numerics, one with `grid-template-areas` reading like

```
"header header"
"sidebar main"
"footer  footer"
```

Each is rendered live above its code. The student scans both and the legibility delta sells itself. Below: a card-row with subgrid where four cards' header / image / body / footer rows align horizontally regardless of content length, paired against the same row without subgrid (uneven rows). A Decision + Concept artifact.

**Engagement.** A `Tokens` round on the areas-version code: click the `grid-area` declarations and the matching cells in the template string. Then one `MultipleChoice`: of four nested-card scenarios, which two earn subgrid?

**Components.**
- Existing: `CodeVariants` for the two parallel implementations of the page shell (numeric tabs vs areas tab), each with rendered output via `HtmlCssCoding` in target-match mode, or a `Figure` rendering the live result above each code variant.
- Existing: `Tokens`, `MultipleChoice`.

**Project link.** 4.12 is small enough to skip an explicit page-shell grid, but the chapter plants the reflex for the dashboard project in Unit 5.

---

## Concept 13 — Flex vs grid as a settled decision

**Why it's hard.** Old-internet posts framed flex-vs-grid as a debate. It isn't anymore: flex for 1D distribution of variable-content items, grid for 2D snap-to-track structure. A student who carries the old framing still over-uses one or the other.

**Ideal teaching artifact.** A diagnostic bucket sort. Twelve real UI shapes (horizontal nav, three-column feature grid, form row with label and input, dashboard with sidebar and main, card with header / body / footer stack, toolbar with grouped buttons, photo gallery, pricing tier row, settings page with paired controls, modal action bar, tag cloud, sticky table header) — drag each into "flex" or "grid". A Decision artifact, light prose, the sort carries the lesson.

**Engagement.** The sort itself is the assessment. Close with a one-line distillation in prose: *"flex for 1D, grid for 2D, most SaaS UIs are a grid of flex compositions."*

**Components.**
- Existing: `Buckets` (two-column).

---

## Concept 14 — Intrinsic vs extrinsic sizing as the explanatory model

**Why it's hard.** "Why is my width `auto`?" is the question this model answers, and most students don't have the model. Intrinsic = content-driven (`auto`, `min-content`, `max-content`, `fit-content`); extrinsic = parent-or-utility-forced (`100%`, fixed lengths, a `1fr` track, `flex-basis: 0` + grow). Block elements are extrinsic on width, intrinsic on height; inline elements are intrinsic on both; flex items are extrinsic on main, intrinsic-ish on cross. Until the student can name which axis is being computed which way, sizing bugs are guesses.

**Ideal teaching artifact.** A 2×2 matrix the student can poke. Rows: width-axis and height-axis. Columns: intrinsic and extrinsic. Each cell contains a live mini-example labeled with the utility that produces that quadrant (`w-auto`, `w-full`, `h-auto`, `h-dvh`). Hovering a cell highlights the cell's example. Below the matrix, a small element where the student toggles `display: block`, `inline`, `inline-block`, and `flex item`; the matrix highlights *which quadrants are active* per display mode. A Concept artifact — the matrix *is* the mental model.

**Engagement.** Three diagnostic prompts as `MultipleChoice` ("why is this `<span>` ignoring `w-32`?", "why is this `<div>` inside `<body>` zero-height?", "why is `width: 100%` on a flex item overflowing?"), each picking from intrinsic-vs-extrinsic answers.

**Components.**
- New: `SizingMatrix` — 2×2 cells with embeddable examples plus a display-mode toggle that highlights active cells. Single-use within Unit 4, but a recurring mental model — the matrix gets referenced inline in 4.4.5 and the auto-fit lesson reuses the intrinsic-vs-extrinsic vocabulary. Forward-link is thin; demote to alternative if the v1 sketch doesn't pay off.
- Alternative (default): a hand-authored SVG matrix inside `Figure`, with four short captions and four small code snippets in the cells — no interactivity. The model is what teaches; the interactivity is icing.
- Existing: `MultipleChoice`.

---

## Concept 15 — The viewport-unit family and the iOS reflex

**Why it's hard.** `100vh` looks correct on desktop and ships broken on iOS. The student debugs once, learns `dvh`, and forgets the distinction between `dvh` / `svh` / `lvh` within a week. The senior reach is `min-h-dvh` as a reflex, with the three-unit distinction earning its weight only when the design specifies "fill the screen even when the address bar shrinks" vs "fill the screen always" vs "fill the screen when the chrome is shown."

**Ideal teaching artifact.** A simulated iOS Safari frame. A phone-shaped viewport with a togglable address bar (collapsed / expanded). Inside, four colored bars labeled `100vh`, `100dvh`, `100svh`, `100lvh`. The student toggles the address bar and watches `dvh` resize, `svh` stay at the smallest, `lvh` stay at the largest, and `vh` (legacy) match `lvh`. The "gap at the bottom" of the legacy `vh` bar is visible when the address bar expands. A Concept + Mechanics artifact — the simulation makes the otherwise-invisible iOS quirk legible.

**Engagement.** A `Buckets` sort: drag five intents ("hero that fills the screen even when chrome appears", "modal that should never get cut off", "splash that locks to whatever's visible right now", "footer-pinned page", "always-fill-no-matter-what") into the right viewport unit.

**Components.**
- New: `MobileViewportSimulator` — phone frame with togglable address bar, four labeled bars showing each unit's computed height in real time. Reuses in 4.4.8 (overscroll / scroll-lock interactions on mobile) and 4.12.5 (mobile drawer with `min-h-dvh`).
- Existing: `Buckets`.

**Project link.** 4.12's page shell uses `min-h-dvh`. The student writes it as the reflex.

---

## Concept 16 — Position modes and the containing-block reflex

**Why it's hard.** "An absolute child positions to its nearest positioned ancestor" is a sentence most students can recite and most students still get wrong, because the failure mode is silent — the child positions to the viewport, "works" on the first page, and breaks the moment a parent ships with `transform` or `relative`. The senior reflex is *"every absolute child gets a relative parent, declared at the same time."*

**Ideal teaching artifact.** A misconception-first ambush. The student is shown a card with a notification badge in the corner, written naively as `<div><img/><span class="absolute top-0 right-0">3</span></div>`. The badge is rendered against the *viewport*, top-right — clearly wrong. The student is asked: *what's missing?* The reveal is `relative` on the parent, and the lesson lands. Then a small inspector mode: a positioned element nested four levels deep, with each ancestor checkbox-togglable between `static`, `relative`, `absolute`. The widget highlights which ancestor the absolute child is currently positioning to. A Pattern artifact — the lesson is named for the bug it prevents, and the inspector explains why.

**Engagement.** A `MultipleChoice` round of three layouts: which ancestor does the marked `.target` position to? (Three ancestors with mixed `position`, `transform`, and default values — the third question introduces `transform` as a containing-block trigger, foreshadowing 4.4.9.)

**Components.**
- New: `ContainingBlockInspector` — a nested-element fixture with per-ancestor position toggles, highlights the resolved containing block. Forward-link to 4.4.9 (stacking context uses a nearly identical inspector for the trapped-modal bug — strong consolidation argument).
- Existing: `MultipleChoice`.

**Project link.** 4.12.5's mobile drawer is `fixed inset-y-0 right-0`; the chapter installs the reflex that fixed escapes ancestors *unless* an ancestor has `transform`, which is the trap 4.4.9 makes explicit.

---

## Concept 17 — Overflow modes, `overscroll-contain`, and sticky-needs-scroll

**Why it's hard.** Overflow has five values and three of them — `hidden`, `clip`, `auto` — look identical until the day they don't. `hidden` creates a scroll container (and thus enables sticky and traps the scroll chain); `clip` doesn't. `auto` shows scrollbars conditionally. And on iOS, a long modal whose internal scroll reaches its end *chains* the scroll to the body and triggers pull-to-refresh — the bug `overscroll-contain` exists to fix.

**Ideal teaching artifact.** A real-artifact replica. A mock mobile screen showing a scrollable modal with a long body. The student toggles `overscroll-behavior: auto` vs `contain` on the modal's body and scrolls inside it; with `auto`, scrolling past the bottom triggers a body-level scroll (visualized as the background shifting); with `contain`, the body doesn't move. Same simulator extends to demonstrate sticky-inside-overflow: a sidebar with `overflow-y-auto` and an inner `sticky top-0` header; toggle the sidebar's overflow to `visible` and watch the header lose its stick. A Concept + Pattern artifact — the simulator carries both lessons.

**Engagement.** A `Sequence` exercise: given a "long modal scrolls behind the page on iOS" symptom, order the three diagnostic-and-fix steps (identify the scroll container; add `overflow-y-auto` if missing; add `overscroll-contain` to stop chaining). Close with one `MultipleChoice` on `hidden` vs `clip`.

**Components.**
- Extend: `MobileViewportSimulator` (from Concept 15) gains an interior scroll surface and overscroll toggle. Strong reuse — the same component covers the iOS viewport unit lesson, the overscroll lesson, and (in 4.12.5) the scroll-lock pattern.
- Existing: `Sequence`, `MultipleChoice`.

**Project link.** 4.12.5's mobile drawer needs `overscroll-contain` plus the body-scroll lock; the chapter sets up the bug, the project chapter ships the hook.

---

## Concept 18 — Stacking context, the trapped-modal bug, the three fixes

**Why it's hard.** This is the trap that wraps the chapter. The student writes a modal with `z-50`, gives its tooltip `z-100`, and the tooltip renders behind the modal backdrop. The reasoning ("`100 > 50`, this should work") is correct under the model the student has, and the model is wrong. The fix isn't a higher number; it's understanding that z-index is scoped to a stacking context, and `opacity < 1` / `transform` / `filter` / `position: fixed/sticky` / `isolation: isolate` on an ancestor creates one and traps every descendant. The three fixes — portal out, `isolation: isolate` deliberately, restructure the DOM — are the senior toolkit, and the student needs to see *why a bigger number doesn't help.*

**Ideal teaching artifact.** Two paired artifacts, because this concept is genuinely two beats. First, a stacking-context inspector — same shape as Concept 16's containing-block inspector, extended. The student sees a nested DOM with z-indexed elements; each ancestor has a checkbox-togglable property (`opacity < 1`, `transform`, `filter`, `isolation: isolate`, `position: fixed`). The widget highlights which stacking context each element belongs to and shows the resolved paint order. The "trapped" case is reproducible — the student toggles `opacity` on an ancestor and watches a previously-on-top child drop behind a sibling. Second, the same fixture with three "fix" buttons: *portal to body*, *add `isolate` to the right ancestor*, *restructure*. Each click animates the DOM rearrangement and shows the fix's resolved paint order. A Pattern + Concept artifact — the inspector explains the trap, the three-fix panel teaches the senior reflexes.

**Engagement.** A `MultipleChoice` ambush at the start of the lesson (before the artifact): given two siblings, one with `opacity-95 z-50` containing a `z-100` child, and one with `z-40` at the root — which renders on top? Most students will say the `z-100`. The wrong-answer reveal is the entire lesson. Close with a final `MultipleChoice` on the three fixes applied to a "fixed modal stuck inside a `transform: translate3d(0,0,0)` ancestor" scenario.

**Components.**
- New: `StackingContextInspector` — extends or shares scaffolding with `ContainingBlockInspector`; per-ancestor property toggles for the six trigger properties, computes and highlights stacking contexts and paint order. Strong forward-links: 4.6.5 (portals), 4.11.1 (shadcn Dialog/Popover/Tooltip implementations). Worth building.
- Existing: `MultipleChoice` for the ambush and the close.

**Project link.** 4.12 doesn't ship a modal, but 4.12.5's drawer plus the future Unit 5 modal cash this in. The chapter plants the reflex that floating UI portals to `<body>`.

---

## Component proposals

### `BoxModelSizer`
- **Sketch.** Sliders for declared width / padding / border; toggle `border-box` vs `content-box`; renders the four nested boxes with live outer-width readout and the addition formula.
- **Uses in this chapter.** Concept 1.
- **Forward-links.** 4.4.5 sizing intuition, 4.4.7 `inset-0` filling a parent.
- **Leanest v1.** Three number inputs, two-button toggle, a CSS `div` with `border` and `padding` rendering live, one readout span computing the outer width. No animation, no overlay arrows.

### `LogicalAxisToggle`
- **Sketch.** Wraps two MDX children (physical-utility version, logical-utility version); one LTR/RTL toggle flips both panels' `dir` attribute; renders side by side.
- **Uses in this chapter.** Concept 3.
- **Forward-links.** 4.4.7 (`inset-s-*` family demo), 4.5.6 (responsive direction interactions).
- **Leanest v1.** A two-column grid wrapper, one button that toggles a `dir` attribute on both columns. Twenty lines of Astro.

### `A11yLayoutTrees`
- **Sketch.** Takes a small DOM fragment as a child; renders a "layout tree" and an "a11y tree" side by side; per-element hide-mechanism toggles in a control bar.
- **Uses in this chapter.** Concept 6.
- **Forward-links.** 4.11.3 (sr-only / aria-hidden / hidden decision tree).
- **Leanest v1.** Hardcode the two trees as static SVG, render the toggles as buttons that swap which tree image is shown. Skip the live-DOM reflection.

### `FlexAxisPlayground`
- **Sketch.** Flex container with three children; controls for direction / justify / items / gap; overlaid main-axis and cross-axis arrows that rotate with direction.
- **Uses in this chapter.** Concept 7.
- **Forward-links.** 4.4.4 (the grid-track inspector reuses the same control-bar shell), 4.5.6 (responsive variants).
- **Leanest v1.** A flex container, four `<select>` dropdowns, three boxes inside. The axis arrows are two absolutely-positioned arrows that rotate via a CSS transform driven by `flex-direction`.

### `GridTrackInspector`
- **Sketch.** Text input for `grid-template-columns`; container-width slider; computed track widths labeled inline; live grid render.
- **Uses in this chapter.** Concepts 10, 11.
- **Forward-links.** 4.4.4 (subgrid lesson uses it for the nested case), 4.5.7 (container queries with `cqi`), 4.12 (feature grid).
- **Leanest v1.** Text input bound directly to `style="grid-template-columns: ..."`; container width set by a `<input type=range>` driving a `max-width`. Skip the computed-width readouts; the visual tracks are the readout.

### `ResponsiveGridSideBySide`
- **Sketch.** Two card grids stacked; one container-width slider drives both; one grid uses breakpoints, the other `auto-fit minmax`.
- **Uses in this chapter.** Concept 11.
- **Forward-links.** 4.5.6, 4.5.7.
- **Leanest v1.** Share `GridTrackInspector`'s slider primitive; two pre-set track strings; no controls beyond the width slider. Could be a thin wrapper over the inspector.

### `SizingMatrix`
- **Sketch.** 2×2 cells (width × height, intrinsic × extrinsic) with embedded mini-examples; display-mode toggle that highlights active cells.
- **Uses in this chapter.** Concept 14.
- **Forward-links.** None strong. Demoted to alternative — concept 14's primary recommendation is a hand-SVG `Figure`.
- **Leanest v1.** A static SVG matrix inside `Figure`, no interactivity. Build the bespoke version only if the static version under-teaches in user testing.

### `MobileViewportSimulator`
- **Sketch.** Phone-shaped frame with togglable address bar; renders four colored bars labeled with viewport units showing live computed heights; extends to an interior scroll surface for overscroll demos.
- **Uses in this chapter.** Concepts 15, 17.
- **Forward-links.** 4.5.6 (mobile-first responsive), 4.12.5 (mobile drawer with `min-h-dvh`, scroll lock).
- **Leanest v1.** A `<div>` styled as a phone frame; a button toggles a CSS variable that drives both the address-bar's height and the `--simulated-dvh` value the inner bars consume. The overscroll extension is a v2.

### `ContainingBlockInspector`
- **Sketch.** A nested-element fixture with per-ancestor position toggles; highlights the resolved containing block for a marked descendant.
- **Uses in this chapter.** Concept 16.
- **Forward-links.** 4.4.9 (the stacking-context inspector is the same component pattern with different toggled properties — share the scaffolding).
- **Leanest v1.** Three nested `<div>`s, each with a position-mode `<select>` in a control bar above; the absolute child has a colored outline, and a second colored outline marks whichever ancestor it currently resolves to. No animation.

### `StackingContextInspector`
- **Sketch.** A nested DOM with z-indexed elements; per-ancestor property toggles for `opacity`, `transform`, `filter`, `isolation: isolate`, `position: fixed`; computes and highlights stacking contexts plus paint order; a three-fix panel rearranges the DOM to show portal / isolate / restructure resolutions.
- **Uses in this chapter.** Concept 18.
- **Forward-links.** 4.6.5 (React portals), 4.11.1 (shadcn Dialog / Popover / Tooltip implementations).
- **Leanest v1.** Share scaffolding with `ContainingBlockInspector`; three nested boxes, per-ancestor checkboxes for the five trigger properties, a sibling box with its own z-index. Highlight stacking contexts with a tinted outline. The three-fix animation is a v2; v1 just shows the static "fixed" DOM for each fix as a tab.

---

## Build priority

The chapter's teaching weight concentrates on two component families that compound forward:

1. **The inspector family** — `ContainingBlockInspector` and `StackingContextInspector` share scaffolding and together cover Concepts 16 and 18, the two hardest concepts in the chapter. They forward-link to 4.6.5, 4.11.1, and every later chapter that ships floating UI. Build the shared scaffolding first; concept 18's inspector is the highest-leverage single artifact in the chapter.
2. **The mobile viewport simulator** — `MobileViewportSimulator` carries Concepts 15 and 17, and again in 4.5.6 and 4.12.5. The iOS viewport bug is the chapter's single most-named real-world failure mode; the simulator is the artifact that makes it land.

After those, `GridTrackInspector` (with `ResponsiveGridSideBySide` as a thin wrapper) earns its build for Concepts 10 and 11 and forward-links into 4.5.7. `FlexAxisPlayground` and `BoxModelSizer` are useful but solo-chapter; build them only after the higher-leverage components ship.

`SizingMatrix` and `A11yLayoutTrees` should default to static `Figure` versions first; promote to bespoke only if the static versions fail in review. `LogicalAxisToggle` is small enough to build whenever needed.

## Open pedagogical questions

- Concept 14's `SizingMatrix` is the weakest forward-link case in the chapter. Confirm whether the static `Figure` version teaches the intrinsic-vs-extrinsic model on its own, or whether the matrix's interactivity is genuinely load-bearing.
- The `ContainingBlockInspector` / `StackingContextInspector` split is proposed as two components sharing scaffolding; a single configurable `LayoutAncestorInspector` taking a "mode" prop might be the right primitive. Decide before the first build.
