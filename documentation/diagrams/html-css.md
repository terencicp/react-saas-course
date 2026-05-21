# Plain HTML+CSS

> _This document distills lessons learned from diagrams already built in this course. Treat it as a kick-starter for new diagrams, not a strict guide._

No build step — divs and inline styles in MDX render exactly as written. The pedagogical USP is that learners can open devtools and see real flexbox / grid / box-model behavior, so prefer real CSS layout over absolute-positioned approximations.

## Boilerplate

```mdx
import Figure from '../../../components/figures/Figure.astro';

<Figure caption="Short caption (Unit X)">
  <div style="…">
    {/* content */}
  </div>
</Figure>
```

Wrap every diagram in `<Figure>` for the standard card chrome + caption. Use inline `style` attributes only — no `<style>` tag, no class hooks, no external CSS — so a reader can copy the source and see exactly what styled it.

## The Starlight prose-margin gotcha

**Load-bearing.** Starlight's content theme injects `margin-top: ~16px` on every block-level child after the first inside the article — and that selector reaches *into* your diagram, hitting flex/grid children too. Symptom: the first child of a row renders at the parent's full cross-axis size, and every later sibling is shifted down and shrinks (the injected margin eats into the row's height budget). Same thing happens to grid tracks and any nested wrapper.

**Fix.** Add `margin: 0` to every inner element of the diagram — not just the top-level container. The reset has to reach the deepest descendants, because the prose selector matches every descendant block.

```mdx
<div style="display: flex; …; margin: 0;">
  <div style="flex: 1; …; margin: 0;">
    <div style="…; margin: 0;">label</div>
    <div style="…; margin: 2px 0 0;">sublabel</div>  {/* intentional margins still work */}
  </div>
  …
</div>
```

Intentional margins (e.g. `margin-top: 2px` between two stacked text lines) still work — just write the full `margin: …` shorthand so the prose `margin-top` can't merge in.

If you see a diagram where one element looks larger or higher than its siblings and nothing in your code says it should, suspect this first.

## MDX text gotchas

A handful of things silently break the MDX parser or change what gets rendered:

- **`<` in text content** — escape as `&lt;` (e.g. `Server &lt; 500ms`), otherwise MDX tries to parse a JSX tag and fails with `Could not parse expression with acorn`.
- **Apostrophes / quotes in JSX children** — bare `getUser('id')` between tags can trip the parser. Wrap in an expression: `{"getUser('id')"}`. The error surfaces as `Unterminated template` or `acorn` parse failure.
- **Curly braces** — anything `{…}` is treated as a JS expression. Escape literal braces with `{'{'}` / `{'}'}`, or wrap the whole literal string in an expression.
- **Smart-quote rewriting** — remark-smartypants rewrites straight `"` and `'` in text content into curly quotes; the rewrite is asymmetric so the same literal can come out differently in different places. If a literal must survive verbatim, wrap in an expression.

Attribute values (`style="…"`, `caption="…"`) are unaffected — these only hit content between tags.

## Sizing and alignment

Two patterns, pick by intent:

- **Fixed pixel width** on the outermost wrapper (and on every row that must align column-by-column) — guarantees that stacked rows share the same coordinate system, e.g. a bar above and a row of callouts below. Brittle to viewport width but pixel-exact.
- **`width: 100%`** — fluid, scales with the figure card. Fine when no inter-row alignment is required.

**Flex shrink defaults bite.** Flex children have `min-width: auto`, which clamps each child to its *min-content* width. A long inline label can therefore force its segment wider than its `flex` ratio asks for, and neighbors lose width to compensate. If you need true proportional widths, set `min-width: 0` on every flex child; content that doesn't fit can then wrap, ellipsize, or get clipped via `overflow: hidden` instead of stealing width from neighbors.

`box-sizing: border-box` is the safer default whenever an element has both an explicit size and padding/border — without it the rendered size is `width + padding + border` and alignment math drifts.

## When content overflows: wrap, don't scroll

If a row's natural width exceeds the figure card, **`flex-wrap: wrap` is almost always the right default**, not `overflow-x: auto`. macOS and most modern browsers hide scrollbars until you scroll, so a horizontally-scrolling row reads as "the diagram is broken and the last item is cut off" — exactly the user complaint you'll get. Wrap keeps every element visible at every viewport.

```mdx
<div style="display: flex; flex-wrap: wrap; column-gap: 8px; row-gap: 20px; justify-content: center;">
  {/* items */}
</div>
```

Two follow-ups worth doing every time:

- **Split `gap` into `column-gap` and `row-gap`** when items can wrap. A single `gap` value makes wrapped rows visually touch — column siblings sit immediately above/below each other with no separator. Row-gap typically wants to be 2–3× the column-gap.
- **Test at multiple figure-card widths.** A single `flex-wrap` layout produces nice splits (single row → 5+4 → 4+4+1) depending on container width; verify your chosen `column-gap` doesn't produce an orphan-row layout at the common breakpoints by measuring with `preview_eval` at 700px, 1100px, and 1400px viewports.

When the linear sequence *is* the lesson (a ramp, a timeline, a step sequence) and a wrap would break the read, shrink each cell (font-size, padding, swatch size) until all items fit one row at the target viewport — or switch to a CSS grid with a fixed column count so wrapping happens at a predictable point you control, instead of wherever flex decides.

`overflow-x: auto` is still the right call when the diagram is *intentionally* a long strip the reader can pan (e.g. a wide timeline that wouldn't make sense wrapped). In that case, add a visible affordance — a right-edge fade gradient, or `overflow-x: scroll` to force the scrollbar — so the cut isn't read as a bug.

## Inline `<code>` inside diagrams

Starlight applies prose styling to inline `<code>`: a pill background, horizontal padding (~6px each side), and in some contexts `display: block`. Two implications when `<code>` is a child of a flex/grid layout:

- **The label is wider than its text.** A column sized to its `<code>` child is ~12px wider than `text_width` would predict. If exact column widths matter, override with `background: transparent; padding: 0;`.
- **Code wraps on whitespace by default.** A label like `oklch(0.5 0.1 240)` will break onto two lines whenever the column is narrower than the text. Add `white-space: nowrap` to keep a single-line label intact, and accept that the column will be at least `text_width + pill_padding` wide.

If you don't need the pill at all (the monospace alone reads as code), a styled `<span style="font-family: ui-monospace, …">` sidesteps both quirks.

## Readable labels — don't let text overlap

Whenever the diagram stacks text-bearing elements close together — labels on every level of a nested hierarchy, pills along a strip, callouts above a bar — check that no two pieces of text occupy the same pixels. The browser will happily render them on top of each other; readers will assume the diagram is broken.

After laying out, read positions back with `getBoundingClientRect` for every text-bearing element and verify both axes:

- **Vertical:** the gap between consecutive labels must be ≥ label height. Otherwise the strings collide.
- **Horizontal:** if labels only stagger diagonally (e.g. each one indented further right than the last), the horizontal offset per step must exceed the longest label's width — otherwise long labels still cover their neighbours even though the elements technically sit at different x-offsets. Diagonal-only staggers usually fail this check; add vertical breathing room instead of relying on the indent.

### "Fieldset legend" labels straddling a border

Common pattern for nested-box hierarchies: a small pill label that sits on each box's top border line. Two non-obvious things:

- **Use `display: block; width: fit-content;` with a negative `margin-top`** — *not* `display: inline-block`. Inline-block aligns to the line's baseline, so the line's strut absorbs most of the negative margin and the pill ends up below the border instead of straddling it. A block element with `width: fit-content` behaves predictably: `margin-top: -(pill_height/2 + parent_padding_top + parent_border_top)` lands the pill's centre on the border line.
- **Match the pill's `background` to whatever paints behind the border** — `var(--sl-color-bg-sidebar)` for the standard Figure card. That's what visually "breaks" the border line where the pill sits.
- **A child's negative `margin-top` pulls *subsequent* siblings up too.** If two nested levels' pill labels need clear separation, the inner container needs an explicit positive `margin-top` to push itself (and therefore its own pill) far enough below the parent's pill. Without it, consecutive pills end up only ~13px apart vertically — close enough to overlap given a typical 22px pill height.

## Theme adaptation

Starlight flips between light and dark. Three patterns cover most cases:

- **Starlight CSS variables** — `var(--sl-color-bg-sidebar)`, `var(--sl-color-gray-3)`, etc. resolve to theme-aware values and flip automatically. Best for diagram chrome (borders, muted backgrounds, secondary text) that should feel native.
- **Saturated mid-tones with white text** — fills like Tailwind's 600-range (`#dc2626`, `#16a34a`, `#0d9488`) read well against both white and near-black page backgrounds, and white-on-saturated keeps text contrast in both modes. Best when the *color* itself is the signal.
- **Pastel fills with dark text** — fine when the figure is a one-off island; tends to wash out in dark mode. Avoid for anything where the fill carries meaning across themes.

Don't bake in `#000` / `#fff` for diagram text — they invert wrong on the opposite theme. Default to `currentColor` or a Starlight gray variable; only switch to fixed white when sitting on a saturated fill.

## Iterating

The dev server re-renders on save. Invalid MDX bubbles up as an `MDXError` page (or an error overlay in the dev toolbar); check `preview_logs` filtered to `error` for the precise line and cause — the in-browser overlay can be terse.

When verifying layout, prefer DOM inspection over screenshots:

- `preview_inspect` with explicit `styles` (e.g. `['width', 'height', 'margin-top', 'padding', 'background-color']`) returns the resolved values, which is how you catch invisible prose-margin injection or off-by-a-pixel proportional widths.
- A short `preview_eval` that walks a figure's children and reads `getBoundingClientRect()` and `getComputedStyle()` confirms alignment in one round-trip.

Screenshots are useful for the final "does this read?" pass, but the screenshot tool occasionally returns blank frames after long scrolls — don't rely on it as the sole signal that the diagram is correct.
