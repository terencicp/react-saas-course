# Hand-coded SVG

> _This document distills lessons learned from diagrams already built in this course. Treat it as a kick-starter for new diagrams, not a strict guide._

No build step — an inline `<svg>` in MDX is rendered as-is by the browser.

## Boilerplate

```mdx
import Figure from '../../../components/figures/Figure.astro';

<Figure caption="Short caption (Unit X)">
  <svg
    viewBox="0 0 W H"
    role="img"
    aria-label="One-sentence description of what the diagram shows."
    xmlns="http://www.w3.org/2000/svg"
    style="width: 100%; height: auto; display: block;"
  >
    {/* elements */}
  </svg>
</Figure>
```

`style="width:100%;height:auto;display:block"` makes the SVG scale to the figure card width while preserving aspect ratio from the viewBox. `role="img"` + `aria-label` is the accessibility contract — screen readers read the label in place of the SVG. Comments inside the SVG are JSX-style (`{/* … */}`) because the file is MDX.

One MDX wart worth knowing up front: remark-smartypants rewrites straight `"` and `'` that appear as *text content* inside JSX elements — including `<text>` — into curly quotes, and the conversion is asymmetric depending on surrounding whitespace, so the same literal can come out as `"…"` in one place and `"…”` in another. If a literal must survive verbatim (a code token like `"use client"`, a JSON snippet, anything quoted), wrap it in a JS expression: `<text>{'"use client"'}</text>` or `<text>{`{ "key": "value" }`}</text>`. The expression bypasses the markdown text path entirely. Attribute values (`aria-label="…"`) are unaffected — this only hits content between tags.

## Crop the viewBox to your content

The viewBox sets the intrinsic aspect ratio. The card scales width to fit, then height follows from that ratio — so any empty viewBox space below your last drawn element renders as a giant blank strip *inside the figure card*. Always size the viewBox to the actual bounding box of your content (+ a small breathing-room margin).

After laying out, compute the max y-extent across every element (rect bottom = `y + height`; text bottom ≈ `y` baseline + a few px for descenders; polyline = max of its y points). Set viewBox height to `that + ~8px`. Same on the right edge for width if you removed elements during iteration.

If you author with a generous viewBox to make positioning easier, tighten it as the last step before committing.

## Compactness

Laptop viewports are wide but short, and the page chrome (header, on-page TOC, figure-card padding) already eats vertical space before your diagram lands. Because the rendered SVG width is fixed to the figure card and height follows from the viewBox ratio, **viewBox height is the dial that controls how much screen the figure occupies** — every unit of viewBox height you remove translates proportionally to fewer rendered pixels.

Concrete levers, in order of impact:

- **Prefer horizontal flow.** Left-to-right reads as naturally as top-to-bottom for trees, sequences, and pipelines, and trades the cramped axis for the spacious one. If a tree has more depth than breadth, rotating it 90° often halves the rendered height.
- **Set row gaps to the minimum that still shows an edge.** For node-link diagrams, a vertical gap of roughly `2 × node_radius + ~30px` is enough — the visible edge between two same-column nodes is `gap − 2 × radius`, so even `gap = 2r + 25` gives 25px of visible line, which reads clearly. Going larger is mostly whitespace.
- **Pad the viewBox by ~10–20px, not 50.** Tight top and bottom margins still leave room to breathe inside the figure card (which adds its own 18px of padding around the SVG).
- **Avoid stacking labels above and below the same row** unless you need both — pick one side and keep the other clean.

If a diagram still feels tall after these passes, the layout itself is the problem (too many sequential rows); don't compensate by shrinking text below readability. Re-architect to widen instead.

## Theme adaptation

Starlight flips between light and dark. Two patterns cover almost every case:

- `fill="currentColor"` / `stroke="currentColor"` — for primary text, primary outlines, anything that should read like body content. `currentColor` resolves to Starlight's text color and flips with the theme.
- Fixed mid-gray (e.g. `#9ca3af`) — for subordinate elements (leader lines, secondary labels, bit-range annotations) that should stay visually quiet in both modes. A fixed gray sits comfortably between white and near-black backgrounds; `currentColor` for these would make them as loud as body text.

Avoid baking in `#000` or `#fff` — they invert wrong against the opposite theme. Bright accent colors (purple, teal) work fine in both modes as long as text on top of them has enough contrast.

## Text positioning

`<text x y>` places the text's baseline at `y`, anchored at `x` according to `text-anchor` (default `start`; the other useful values are `middle` and `end`). For vertically centering text inside a shape (e.g. a label inside a circle), add `dominant-baseline="central"` and set `y` to the shape's center.

Monospace glyphs are roughly `0.6 × font-size` wide — a 12px monospace char is ~7.2px, a 16px char ~9.6. Use that to compute a box width around a known string (`chars * 7.2 + 2 * padding`). Sans-serif is narrower and variable; estimate ~`0.55 × font-size` average, but expect ±20% per glyph. When the geometry has to hug the text exactly, prefer monospace.

Font stacks the project uses:

- Monospace: `ui-monospace, SFMono-Regular, Menlo, monospace`
- Sans: `system-ui, -apple-system, 'Segoe UI', sans-serif`

### Keep labels smaller than their container

A label that visually touches the edge of its shape looks crowded and inflates the apparent weight of the shape. Leave visible padding on every side:

- **Inside a circle of radius `r`**: aim for `font-size ≤ r × 0.4`. For `r = 26`, that's ~10px — fits an 8-char word like `Composer` with breathing room. If the longest label still overflows at that size, prefer enlarging the circle over shrinking the text further (anything below ~9px reads as decoration, not a label).
- **Inside a rect of width `w`**: with average char width ≈ `0.55 × font-size` (sans) or `0.6 × font-size` (mono), pick font-size so `chars × char_width + 2 × pad ≤ w`, with `pad ≥ one char width`. The sans-serif number is an average across a normal alphabet — **bold weights and capital-heavy strings** (camelCase identifiers like `DashboardPage`, all-caps acronyms, strings dense in `M W H K`) run 10–20% wider than the formula predicts, while strings dense in `i l f t` run narrower. If the longest label in the row is bold sans-serif and longer than ~10 characters, treat the formula as a lower bound and verify in the rendered figure before committing the box size. When in doubt, find the longest label, size the rect to hold it (plus padding), and size the rest of the row to match — uneven rect widths in a row read worse than slightly oversized rects.
- **Mixing label sizes**: if one node is emphasized (bold, accent fill, thicker stroke), its label can stay at the same size as the others — the visual weight already comes from the shape, not the type. Bumping the label too risks pushing it past the edge.

### Keep external labels close to the element they label

When a label sits outside its element, the eye groups labels and shapes by proximity. A label drifting far above, below, or beside its target reads as floating or as belonging to a neighbor.

- **Single label on one side of a shape**: leave just enough gap that the glyphs don't touch the edge — roughly `4–10px` between the text baseline and the shape, scaled to the font size. Closer than that feels collided; much further and the pair stops reading as one unit.
- **Stacked labels on the same side**: only the innermost label needs to hug — outer rows stack naturally above it. The hierarchy (closest = primary, further = secondary) does free work for you.
- **Mixed row — singles next to stacks**: a common pitfall. If some elements need stacked annotations (a name + a range, say) and others need just one, do *not* align every label to the outer row's `y`. The singles look stranded that far out. Place each label at the distance its own meaning requires — singles close to the element, stacks rising above as needed. The resulting "staircase" across the row is correct: every label is anchored to its own target, not to a phantom shared baseline.

## Draw order

SVG paints in document order: later elements draw over earlier ones. Two common patterns:

- **Edges first, nodes second** — so the circle/rect at each end covers the line endpoint cleanly without arrow-tip overshoot.
- **Background strip first, labels last** — so text sits on top of any fill.

Group related elements with `<g>` when they share styling (`<g fill="…" font-family="…">…</g>` cascades to children).

## Edge routing

Distinct from draw order — this is about the *shape* of each edge path, not which layer it sits on.

For node-link diagrams (trees, DAGs, anything with parent → child lines), pick between two styles:

- **Diagonal** — single straight line from a point on the parent to a point on the child. Smallest pixel footprint, reads cleanest when nodes are bare. Pitfall: a diagonal entering a child at top-center sweeps through the child's upper-left and upper-right corner regions on the way in, which collides with anything parked at those corners — `"use client"`-style pills, version badges, status dots, leader labels.
- **Orthogonal** — drop vertically from the parent to a horizontal trunk at some y between the two rows, run along the trunk, then drop vertically into each child at its top-center. Costs a few more path commands and a bit more ink, but every edge segment lives in either the inter-row gutter (horizontal trunk) or the top-center column of each child (vertical drop), leaving the corner regions free.

Default to diagonal when nodes are bare. Switch to orthogonal as soon as any child in the layout carries a corner decoration — the routing change is much cheaper than fighting the geometry to fit a badge between a diagonal edge and a neighbor.

If you want to stay diagonal in a mixed row, the lighter-weight fix is to anchor that one edge to the child's top-*left* or top-*right* corner (whichever is opposite the decoration) instead of top-center. The asymmetry across the row is visible but readable.

## Crisp rectilinear strips

For pixel-aligned rectangles (memory layouts, byte strips, segmented bars) where you don't want anti-aliasing softening the segment seams, set `shape-rendering="crispEdges"` on the `<g>` containing them. Skip it on diagrams with diagonals or curves — `crispEdges` hurts those.

## Leader lines

A leader (label-to-thing connector) reads cleanest as a polyline with a short vertical or horizontal segment first, then a single bend to the target. `<polyline points="x1,y1 x2,y2 x3,y3" fill="none" stroke="#9ca3af" stroke-width="1" />`. The first segment establishes *which* element the leader belongs to; the bend lets you place the label wherever the layout has room. Leave a few px of gap between the leader's endpoint and the label glyphs so the line doesn't visually touch the text.

## Iterating

There's no parse-error UI — invalid SVG just renders blank or partial. After non-trivial edits, scroll to the figure and verify visually. If a shape disappears, the most common causes are: a malformed coordinate, a missing closing tag, or an element clipped because viewBox is too tight (temporarily widen viewBox to confirm).
