# The box model and the inline/block axis

- **Title:** The box model and the inline/block axis
- **Sidebar label:** The box model

## Lesson framing

This is lesson 1 of Chapter 020 (Layout and sizing) and the first lesson of the chapter — no prior in-chapter lessons to coordinate with. It builds directly on Chapter 019, which closed with Preflight and the design-token substrate. The student already knows: Tailwind utility syntax and the prefix-colon variants (018.1), `@theme` tokens and that a `--spacing` variable exists (018.2), `cn()` (018.3), CSS custom properties and the three-tier token model (019.4), and crucially that **Preflight already set `box-sizing: border-box` on `*, ::before, ::after` and stripped default margins** (019.3). This lesson cashes that Preflight line in.

The senior framing for the whole chapter: layout in 2026 is a settled stack. This lesson is the *substrate* every later layout lesson stands on — before you can reason about flex, grid, or positioning, you need the four boxes and the two axes installed. The lesson is deliberately small in surface area but foundational; the win is a durable mental model, not a long utility catalogue.

**The single most important takeaway:** under `border-box`, padding and border live *inside* the declared width — widths compose by addition, `w-64 p-4 border` is still 256px wide. Every junior who learned CSS the old way (or from stale tutorials/LLM output) carries the `content-box` intuition that padding *adds* to width; this lesson must actively overwrite that intuition, not just state the new rule.

**Pedagogical decisions that apply lesson-wide:**

- **Lead with the surprise, then explain.** The classic beginner pain point is "I set `width: 256px` and added padding and now my element is wider than I asked for — why?" Open the box-model section by *showing* that this bug does *not* happen in our project, then explain why (`border-box`). Decisions-before-syntax: the senior question is "how do widths compose when I add padding?" and the answer is "by addition, because of `border-box`."
- **One live playground is worth ten paragraphs here.** The box model is geometric and the `content-box` vs `border-box` difference is something the student must *feel* by sliding values, not read. A `ParamPlayground` (width/padding/border sliders + box-sizing toggle + a computed "rendered width" readout) is the centerpiece of the lesson. The component doc even ships this exact demo. This single widget carries the lesson's core concept.
- **One static diagram anchors the vocabulary.** A hand-coded SVG of the four nested boxes (content / padding / border / margin), color-coded to match DevTools' own overlay colors, gives the student a labeled picture to refer back to. Pairing the diagram's colors with DevTools' colors is deliberate — it makes the DevTools section land instantly.
- **Frame margin collapse as recognition, not a tool.** Don't teach margin collapse as something to *use*. Teach it as a smell to *recognize* in legacy code, then immediately pivot to "this is one more reason `gap` is the 2026 default." The student should leave knowing the rule exists and that the modern reflex (`flex flex-col gap-*`) sidesteps it entirely. (Full `gap` treatment is 020.6 — here it's just named as the escape.)
- **Logical-first framing for the axis.** The inline/block axis is abstract; ground it concretely. Inline axis = the direction text flows (left-to-right in English), block axis = the direction blocks stack (top-to-bottom). Then introduce logical Tailwind utilities (`ps-*`/`pe-*`, `ms-*`/`me-*`) as the axis-aware form of physical padding/margin, motivated by the production stake: ship logical from day one and RTL works for free. This connects to the Code conventions rule "logical properties over physical so RTL works for free."
- **`mx-auto` as the one surviving margin trick.** Frame margin as the property the student will *rarely* write in 2026 (`gap` and `padding` cover almost everything), with exactly one durable exception: `mx-auto` to center a fixed-width block. This sets up the spacing philosophy that 020.6 completes.
- **Keep it terse and adult.** No "what is a pixel." The student has programming experience and has been doing Tailwind for two chapters. Foreground the decisions and the production stakes.

Cognitive-load ordering inside the lesson: (1) the four boxes as a static picture, (2) `border-box` and how widths compose — the live playground, (3) the spacing scale that feeds every box-model utility, (4) margin collapse as a smell, (5) the inline/block axis + logical utilities, (6) `mx-auto` centering, (7) DevTools as the debugging payoff. Each step adds one idea to the previous picture.

## Lesson sections

### Introduction (no header)

Short, warm, concrete. Open on the senior question made tangible: you write `w-64 p-4 border` on a card and it renders exactly 256px wide — padding and border didn't push it wider. State that this lesson installs *why*: the four boxes, the `border-box` model that makes widths compose by addition, the spacing scale that feeds every box-model utility, and the inline/block axis that makes RTL free. Connect back to 019.3 ("Preflight set `box-sizing: border-box` for you — this is the lesson where that line pays off"). Preview the end state: the student will read any `p-*`/`m-*`/`border` combination and predict the rendered size, and reach for logical utilities by reflex. Keep to ~4 sentences. No section header (per pedagogical structure — intro is unlabeled prose).

### The four boxes

Install the vocabulary with the static diagram as the anchor. Teach the four boxes from the inside out:

- **Content box** — where children and text render; the `width`/`height` you declare targets this box under the legacy model.
- **Padding box** — space *inside* the border, takes the element's background. The breathing room between content and edge.
- **Border box** — the styled, visible edge (`border-*` utilities draw here).
- **Margin box** — transparent space *outside* the border that pushes neighbors away; the only box that participates in margin collapse and the only one that doesn't take the background.

Emphasize the key asymmetry that trips beginners: **background and border paint the content+padding+border region; margin is always transparent and outside.** This is why padding feels like "inside space" and margin like "outside space" — name that intuition explicitly.

**Diagram (hand-coded SVG inside `<Figure>`):** four concentric labeled rectangles, content innermost, margin outermost. Color-code each band to match Chrome DevTools' box-model overlay: margin = orange/tan (`#f8cb9c`-ish but theme-safe), border = yellow, padding = green, content = blue. Label each band with its name and a one-word role ("background+children", "inside space", "the edge", "outside space / pushes neighbors"). Pedagogical goal: a single referenceable picture that pre-loads the exact colors the student will see in DevTools later in the lesson, so the DevTools section needs no re-teaching of the color scheme. Keep the viewBox tight and horizontal-friendly per the SVG guidance; cap height well under 800px. Use `currentColor` for labels and theme-safe fills. Caption: name the four boxes and note the colors match DevTools.

Tooltips (`Term`): none strictly needed here — the four boxes are defined inline. Reserve tooltip budget for the axis section.

### Why `w-64 p-4 border` is still 256px wide

The heart of the lesson. This section overwrites the `content-box` intuition.

First, state the two models plainly:
- **`content-box`** (the old CSS default): `width` sizes only the content box; padding and border are *added on top*. A `width: 256px` element with `16px` padding and `4px` border renders `256 + 32 + 8 = 296px` wide. This is the model most stale tutorials and most LLM-generated CSS still assume.
- **`border-box`** (our project default, set by Preflight): `width` sizes the *border box* — content, padding, and border all fit *inside* the declared width. `w-64 p-4 border` renders exactly `256px`; the content box shrinks to absorb the padding and border.

Make the production stake explicit: under `border-box`, widths compose by addition and a `w-full` element with padding never overflows its parent — the single most common legacy CSS bug (`width: 100%` + padding overflowing) simply doesn't exist in this project. This is *why* `border-box` won and why every modern framework defaults to it.

Then hand the student the playground to *feel* it.

**`ParamPlayground` (the lesson centerpiece, NOT wrapped in `<Figure>` — it provides its own card):**
- `Param` width: slider, 80–360, default 220, suffix `px`.
- `Param` padding: slider, 0–48, default 16, suffix `px`.
- `Param` border: slider, 0–12, default 4, suffix `px`.
- `Param` boxSizing: select, options `['content-box', 'border-box']`, default `border-box`.
- `Preview`: a single box styled with `width: var(--width); padding: var(--padding); border: var(--border) solid <accent>; box-sizing: var(--boxSizing); background: <light accent>;`. Use an OKLCH or theme-safe accent (the conventions store colors in OKLCH; a hard-coded `hsl`/`oklch` blue is fine inside a demo preview since it isn't project code — note this is a deliberate divergence so a downstream agent doesn't try to route it through a token).
- `Readout` "Declared width": `of="width"`, suffix `px`.
- `Readout` "Rendered outer width": `expr="boxSizing === 'border-box' ? width : width + padding * 2 + border * 2"`, suffix `px`.

The pedagogical mechanic: the student drags padding up and watches the "rendered outer width" readout *stay equal to the declared width* under `border-box`, then flips the toggle to `content-box` and watches the rendered width *grow past* the declared value. The two readouts side by side make the difference unmissable. Caption: "Slide padding under each box-sizing mode. Under `border-box`, the rendered width never exceeds what you declared." This is exactly the demo the `ParamPlayground` doc ships, lightly adapted — reuse it.

After the playground, the watch-out delivered inline (not as a separate section): **don't override Preflight's `box-sizing` with a custom `*` rule** — a project-wide `box-sizing: content-box` reset would break every Tailwind width calculation the student writes. The student never writes the `box-sizing` rule; they inherit it from Preflight and only ever meet `content-box` when a third-party widget assumes it (rare). Deliver this as an `Aside` (caution).

Tooltips (`Term`): `content-box` and `border-box` are defined inline in this section, so no tooltip needed; but `Preflight` (re-explaining the prereq from 019.3 without breaking flow) is a good `Term` candidate — definition: "Tailwind's base reset layer; among other things it sets `box-sizing: border-box` on every element."

### The spacing scale feeds every box-model utility

Connect the box model to the token system the student already met in 018.2/019.4. The pedagogical goal: the student should see `p-4`, `m-2`, `gap-6` not as magic numbers but as multiples of one variable.

- Every spacing utility — `p-*`, `m-*`, `gap-*`, `space-*`, and the inset utilities — compiles to `calc(var(--spacing) * n)`. In Tailwind v4 the default `--spacing` is `0.25rem` (4px), so `p-4` = `1rem` = 16px, `p-2` = `0.5rem` = 8px. (Fact-check this default during research — see §6.)
- The whole scale rescales by editing **one** variable in `@theme` (`--spacing: 0.2rem;` shrinks every spacing utility at once). Tie back to 019.4's token model: this is the spacing tier of the design-token substrate.
- The **4px grid** is the convention every modern design system shares (Material, Carbon, Tailwind, shadcn). Staying on the scale is what makes a UI feel consistent without thinking about it.
- Arbitrary values (`p-[17px]`) exist for genuine one-offs but are a smell when overused — name the senior reflex: stay on the scale; if the scale doesn't fit, change the scale's base, don't pepper the codebase with magic numbers. (Reinforces the conventions' "magic-number sizing is a smell.")

**Code:** a tiny `Code` block (not `AnnotatedCode` — too simple) showing the `@theme` line and two utilities resolving:

```css
@theme {
  --spacing: 0.25rem; /* the base; p-4 → calc(0.25rem * 4) = 1rem */
}
```

Keep it to a few lines; the point is the variable, not a full theme file.

**Exercise (`Dropdowns`, code mode):** a short reinforcement drill — give a box with `--spacing: 0.25rem` and ask the student to fill in the resolved pixel value for `p-4`, `px-2`, `m-6` via `<select>`s. Goal: cement that utilities are `var(--spacing) * n` arithmetic, not opaque names. Grading: exact-match dropdowns. Lightweight; this is a check, not the main event.

Tooltips: none — `--spacing` was introduced in 018.2 and is being expanded, not freshly defined.

### Margin collapse is a smell, not a tool

Frame this as recognition-only from the first sentence. The student must know the rule exists (so legacy code doesn't confuse them) but must *not* adopt the pattern that triggers it.

Teach the rule in its two common forms, kept tight:
- **Adjacent siblings:** two stacked block elements' vertical margins collapse to the *larger* of the two, not their sum. A `mb-8` element above a `mt-4` element sit 32px apart, not 48px.
- **Parent/first-or-last child:** a block parent's top margin can collapse with its first child's top margin (and bottom with last), letting a child's margin "escape" the parent — the surprising one that produces phantom gaps above sections.

State the two boundary facts that scope the trap (deliver inline, this is where they belong — not a separate watch-out section): margin collapse happens **only between block-level elements in normal flow, only on the vertical/block axis**; it never happens between flex or grid items, and it never happens horizontally. That single fact is *why* the 2026 reflex sidesteps it.

The pivot — the senior move: **stop using the pattern that triggers it.** A flex or grid parent with `gap-*` spaces its children without any margins at all, so collapse can't occur. Name it here, point forward to 020.6 for the full `gap` treatment. The student leaves with: "I recognize margin collapse in old code; in my own code I use `gap` and never meet it."

**Diagram (optional, small):** a side-by-side mini-illustration — two stacked boxes with `mb-8`/`mt-4` showing "expected 48px / actual 32px (collapsed)". Could be a compact hand-coded SVG or two simple HTML boxes inside a `<Figure>`. Pedagogical goal: make "collapse to the larger value, not the sum" visual, since the arithmetic surprise is the whole point. Keep it tiny; if it bloats the lesson, a labeled `Code`-adjacent prose example suffices. Author's call — prefer the small visual if it stays under a few hundred px tall.

Tooltips: `normal flow` is a good `Term` candidate — definition: "the default top-to-bottom, left-to-right layout of block and inline elements before any flex, grid, or positioning is applied."

### The inline and block axis

This is the conceptual pivot from physical (left/right/top/bottom) to logical (start/end) thinking. Introduce the two axes gently, grounded in text direction.

- CSS names two box-model axes. The **inline axis** is the direction text flows — left-to-right in English, so the inline axis is horizontal. The **block axis** is perpendicular — the direction block elements stack, so top-to-bottom, vertical, in English.
- The names are *logical*, not physical: in a right-to-left language (Arabic, Hebrew) the inline axis runs right-to-left; in vertical writing modes the axes rotate. "Inline start" means "wherever text begins" — the left edge in English, the right edge in Arabic.
- This is why CSS added **logical properties**: `padding-inline-start` instead of `padding-left`, `margin-inline-end` instead of `margin-right`. They flip automatically with `direction: rtl`, so a layout authored with logical properties mirrors correctly in RTL with zero extra code.

Then land the Tailwind utilities the student will actually write:
- `ps-*` / `pe-*` — padding inline-start / inline-end (the logical form of `pl-*` / `pr-*`).
- `ms-*` / `me-*` — margin inline-start / inline-end.
- `pbs-*` / `pbe-*`, `mbs-*` / `mbe-*` — the block-axis forms, for the rarer vertical-writing or block-direction cases (name them, don't dwell).
- Note the logical *inset* family (`inset-s-*` / `inset-e-*` / `inset-bs-*` / `inset-be-*`) exists for positioned elements but defer its behavior to 020.7 — here just acknowledge it belongs to the same logical system. (Fact-check the exact current Tailwind utility names and whether the older `start-*`/`end-*` shorthands are deprecated — see §6.)

**The senior reach (the decision):** ship logical from day one in any project that will ever be localized to an RTL language — it's free RTL support. In an LTR-only project, physical utilities are fine and the migration to logical is mechanical later. Tie explicitly to the Code conventions rule: "Logical properties (`ps-*`, `pe-*`, `inset-s-*`) over physical (`pl-*`, `pr-*`) so RTL works for free." Frame it as the project's default and the reason behind it.

**Diagram (`TabbedContent`, two tabs):** the single best vehicle for "logical flips with direction."
- Tab 1 "LTR (English)": a box with `ps-8` showing the padding on the *left*, text reading left-to-right, an arrow labeling the inline axis pointing right.
- Tab 2 "RTL (Arabic)": the *same* `ps-8` box under `dir="rtl"` showing the padding now on the *right*, text reading right-to-left, the inline-axis arrow pointing left.

Pedagogical goal: the student *sees* the same single utility produce mirrored results, which is the entire argument for logical properties. Use plain HTML boxes inside each `TabbedItem` (set `dir="rtl"` on the second). Per-tab captions naming what flipped. This makes the abstract axis concrete and sells the "free RTL" stake viscerally.

**Exercise (`Buckets`, two-column):** classification drill sorting physical utilities to their logical equivalents — but better framed as sorting utilities into "flips in RTL" vs "stays put in RTL". Items: `ps-4`, `pe-2`, `ms-auto` (flips) vs `pt-4`, `pb-2`, `px-4` (px is symmetric so stays), `mx-auto` (symmetric, stays). Goal: cement which utilities are direction-aware. Alternatively a `Matching` drill pairing each physical utility with its logical twin (`pl-4`↔`ps-4`, `pr-2`↔`pe-2`, `mr-auto`↔`me-auto`). Prefer `Matching` — it directly drills the physical→logical translation the student needs at the keyboard. Author picks one; `Matching` is the recommendation.

Tooltips (`Term`): `inline axis` ("the axis text flows along — horizontal in English, the direction characters advance") and `block axis` ("the axis blocks stack along — vertical in English, perpendicular to the inline axis"). `RTL` is a good acronym candidate ("right-to-left; the writing direction of Arabic, Hebrew, Persian, and others").

### `mx-auto`, the one centering case where margin still earns its weight

The closing concept and the bridge to the chapter's spacing philosophy.

- Set up the philosophy first: in 2026 the student writes `padding` (inside an element) and `gap` (between siblings) constantly, and `margin` rarely. Margin between siblings is forbidden by the conventions ("Sibling margins are forbidden" — `gap` does that job). So when *does* margin earn its place?
- The durable answer: **`mx-auto` (`margin-inline: auto`) centers a block element that has a defined width inside its parent.** The browser splits the leftover horizontal space equally into the two auto margins, pushing the element to center. The canonical 2026 form is `mx-auto max-w-3xl` (or `max-w-prose`) on a centered article or content column — the right tool *when there is no flex or grid parent in between to do the centering instead*.
- The boundary (the decision, delivered inline): every *other* centering is a flex or grid job. If the parent is already a flex/grid container, `justify-center` / `place-items-center` centers the child — don't reach for `mx-auto` there. `mx-auto` is specifically for a standalone block in normal flow. Cross-reference 020.3 (flex) and 020.4 (grid) for those; don't teach them here.
- Note `mx-auto` needs a *constrained* width to do anything — a full-width block has no leftover space to distribute, so `mx-auto` alone does nothing without a `max-w-*` or `w-*`. That pairing (`mx-auto max-w-*`) is the reflex; name it as a unit.

**Code (`Code`, simple):** the canonical pattern, one block:

```html
<article class="mx-auto max-w-3xl">
  <!-- centered, capped reading column -->
</article>
```

Optionally a tiny `ReactCoding` target-match exercise: give the student a left-aligned `max-w-md` card and a target showing it centered; they add `mx-auto`. Live target-match mode (`live`, `target`, no tests). Goal: muscle-memory for the `mx-auto max-w-*` pairing. Keep the starter to a couple of lines so the compact chip layout kicks in. This is optional — if the lesson is running long, the static `Code` block plus the earlier playground carry the load. Recommend including it; centering is high-frequency and worth one rep.

Watch-out delivered inline: **negative margins** (`-mt-4`, `-mx-2`) are legal and occasionally right (an image bleeding flush to a card's edge, a hero hook pulling content up over a banner) but are otherwise a smell — if you're reaching for a negative margin to fix spacing, the layout structure is usually wrong. Deliver as a short `Aside` (note).

Tooltips: none new.

### Debugging layout with the box-model panel

The payoff section — turn the diagram's vocabulary into a debugging skill. Short and practical.

- When a layout is "off by a few pixels," the senior move is to open DevTools and read the box model directly rather than guessing.
- Hovering an element in the Elements panel paints a **color-coded overlay** on the page: content (blue), padding (green), border (yellow), margin (orange/tan). Call out explicitly that these are the *same colors* as the lesson's opening diagram — the student already knows how to read it.
- The **Computed** panel shows the box-model diagram with the four numeric values (content size, and the padding/border/margin on each side), so you can confirm exactly what `border-box` resolved to.
- The senior framing: this is how you answer "why is this element wider than I expect" or "where is this phantom gap coming from" in seconds instead of bisecting CSS.

**Visual:** a `Screenshot` of Chrome DevTools' Computed-panel box-model diagram for a real `w-64 p-4 border` element would land this perfectly — but only if a downstream agent can capture one. Describe it as the ideal: a screenshot showing the four nested colored boxes with `256`/`16`/`4` values, matching the lesson's SVG. If no screenshot is available, the prose plus the earlier color-matched SVG suffice — do **not** fabricate a screenshot. Flag this for the resourcer/screenshot agent rather than blocking the lesson on it.

**External resource (`ExternalResource`):** link MDN's "The box model" guide and/or the CSS box-sizing page as the canonical deeper reference. One or two cards, placed at the end of this section or as a closing block per the lesson structure (External resources is the sanctioned trailing section).

Tooltips: `DevTools` likely already familiar by Chapter 020; skip unless the chapter hasn't introduced it (it has, via earlier units) — no tooltip.

## Scope

**This lesson covers:** the four boxes (content/padding/border/margin); `box-sizing: border-box` as the Preflight default and how widths compose by addition under it; the `--spacing` scale as the variable feeding every box-model utility; margin collapse as a recognition-only smell with `gap` as the escape; the inline/block axis and the logical Tailwind utilities (`ps-*`/`pe-*`, `ms-*`/`me-*`, the block-axis forms named); `mx-auto` centering; and the DevTools box-model panel.

**This lesson does NOT cover (defer, do not teach):**

- **Display modes** (`block`/`inline`/`inline-block`/`flex`/`grid`/`contents`) and their box-model interactions — 020.2. Here the student may assume `<div>` is block and `<span>` is inline (true since 019; Preflight doesn't change display defaults) but the *display decision* is 020.2's. Don't teach `display`.
- **Flex/grid item sizing and alignment** (`flex-1`, `justify-*`, `place-items-*`) — 020.3/020.4. When pointing at "use `gap` / use flex centering instead," cross-reference only; don't teach the mechanics.
- **`gap` at depth** and the gap-vs-margin-vs-space-x comparison — 020.6. Here `gap` is *named* as the reason margin collapse doesn't bite and as the sibling-spacing default; the full treatment (including `divide-*`, `space-x` legacy) is 020.6.
- **`width`/`height`/`min-*`/`max-*`/`aspect-ratio`/viewport units** — 020.5. `mx-auto` needs a width, so `max-w-3xl`/`max-w-prose` appear *as a companion* to `mx-auto`, but their own behavior (and the whole sizing model) is 020.5. Mention `max-w-*` only as the pairing partner.
- **`position` and the inset utilities' behavior** (`static`/`relative`/`absolute`/`sticky`/`fixed`, `top-*`, `inset-0`) — 020.7. The logical *inset* family (`inset-s-*` etc.) is *acknowledged* here as part of the same logical system but its positioning behavior is 020.7. Don't teach positioning.
- **Overflow** (020.8) and **stacking context / z-index** (020.9) — not this lesson.
- **The `writing-mode` property at depth** — out of scope for the whole chapter; name the inline/block axis and trust the student to apply it. Don't teach vertical writing modes beyond acknowledging the axes rotate.
- **CSS containment** (`contain:`) — niche, not chapter material.
- **Responsive variants** (`md:p-4`, `lg:mx-auto`) — Chapter 021.6. Author all examples at a single breakpoint; no `sm:`/`md:` prefixes.
- **Typography utilities** (`text-*`, `leading-*`, `max-w-prose` as a *type* concern) — 021.1. `max-w-prose` may appear as a centering-width example but don't teach reading-width theory.

**Prereqs to redefine concisely (one line each, don't re-teach):** Preflight (019.3 — the base reset; sets `border-box`, strips margins); the `--spacing` token and `@theme` (018.2/019.4 — being *expanded* here, not introduced); utility/variant syntax and `cn()` (018 — assumed fluent). RTL/i18n is *not* a prereq — define `RTL` via tooltip at first use.

## Notes for downstream agents

- The `ParamPlayground` box-model sizer is the load-bearing component — build it first and make it correct; the lesson's core claim ("widths compose by addition under `border-box`") lives or dies on that readout being right.
- The opening four-box SVG and the DevTools color scheme must use the *same* color mapping (content=blue, padding=green, border=yellow, margin=orange/tan). This coupling is intentional and is what makes the DevTools section free.
- Hard-coded accent colors inside `ParamPlayground`/SVG *previews* are a deliberate divergence from the OKLCH-token convention — those are illustrations, not shippable project code. Don't route them through `@theme` tokens.
- Keep total exercise count to ~2–3 (one spacing-scale `Dropdowns`, one logical-utility `Matching`, optionally one `mx-auto` `ReactCoding` target-match). The lesson's weight is the playground + diagrams, not drills.
