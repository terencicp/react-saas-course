# `<ArrowDiagram>`

> _This document distills lessons learned from diagrams already built in this course. Treat it as a kick-starter for new diagrams, not a strict guide._

Box-and-arrow figure where **the boxes are arbitrary HTML you author**, and the arrows are drawn between them by [leader-line](https://github.com/anseki/leader-line). Lazy-loaded on first render; arrows redraw on resize, theme change, and body resize.

`<ArrowDiagram>` provides only the arrow layer — no outer card. Wrap it in `<Figure>` for the standard chrome + caption.

## When to reach for it

Use `<ArrowDiagram>` when the *nodes* of a diagram need to be **real HTML** (live code blocks, mixed text + spans, mocked UI built from `<div>`s, anything D2 / Mermaid can't render verbatim). Reach for D2 or Mermaid first whenever the nodes are just labels — those engines have a real layout solver, `<ArrowDiagram>` doesn't.

Typical fits:
- Mapping identifiers across two code panels (server ↔ client, schema ↔ query, union → switch).
- Annotating a mocked UI (real `<div>` layout on the left, file-tree cards on the right, lines connecting regions to files).
- Any time you want callouts that point at *specific tokens* inside otherwise-normal prose / code.

## When color matching beats arrows

Sometimes the right call is **not** to draw arrows. The strongest signal: **the curve would visibly cross body text on its way to the target**. Arrows are foreground — they sit on top of whatever they pass over, including the code or prose you're annotating. When that happens, drop the curve, give the source and target the same background tint, and let identity carry the relationship.

Switch to color matching when:

- The mapping is **between sub-line tokens inside multi-line code panels**. The geometry is treated in *Anchor patterns* #3 and *Sizing anchors* — the conclusion every time is "highlight, don't curve."
- The topology is **cyclic** between two regions — `A → B` paired with `B → A`. Side-by-side layouts can't separate those curves in the gap: the two cross, or one of them has to take a long detour over the top / under the bottom that reads slower than two matched tints.
- The figure carries **three or more arrows sharing the same gap**, and labels would still overlap each other (or the surrounding text) at their natural midpoints even after Y-staggered `labelOffset`s.
- The relationship is **pure correspondence** ("this thing is that thing"). Color matching expresses identity at near-zero visual cost; arrows additionally express *ordering* or *direction*, which is only worth paying for when the reader needs it.

Implementation:

```mdx
<span class="match-blue">users</span>      <!-- in panel A -->
...
<span class="match-blue">users</span>      <!-- in panel B -->
```

```css
.match-blue   { background: color-mix(in srgb, #0ea5e9 22%, transparent); }
.match-orange { background: color-mix(in srgb, #f97316 22%, transparent); }
```

A 1px inset ring (`box-shadow: inset 0 0 0 1px <color>;`) on each tinted span sharpens the match in busy figures.

If you need *direction* (not just identity) and arrows would still overlay text, a **Mermaid sequence diagram** is usually the right next step — direction is built into the chart axis, so routing isn't a problem you have to solve.

## Import

```ts
import ArrowDiagram from '../../../../components/figures/ArrowDiagram.astro';
```

(Relative path from `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `arrows` | `Arrow[]` | yes | — | Array of arrow descriptors. Each entry references two box IDs in the slot. |

### `Arrow` shape

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `from` | `string` | yes | — | `id` of the start box (matched inside the stage). |
| `to` | `string` | yes | — | `id` of the end box. |
| `label` | `string` | no | — | Short label rendered near the arrow midpoint. |
| `color` | `string` | no | theme accent | CSS color string applied to both the arrow line and its label. Same value is used in light and dark mode — pick a mid-tone that reads on both. |
| `startSocket` | `'top' \| 'bottom' \| 'left' \| 'right' \| 'auto'` | no | `'auto'` | Side of the start box the arrow leaves from. |
| `endSocket` | same as above | no | `'auto'` | Side of the end box the arrow lands on. |
| `startSocketGravity` | `number \| [number, number] \| 'auto'` | no | `'auto'` | How strongly the arrow pulls away from `startSocket` before bending. Tuple form `[x, y]` lets you push in a specific direction. |
| `endSocketGravity` | same as above | no | `'auto'` | Same, for the landing side. |
| `labelOffset` | `[number, number]` | no | `[0, 0]` | Pixel nudge for the label, applied to the midpoint between the two sockets. Useful when the label collides with the arrow body. |

## Slot

The default slot is the diagram body — arbitrary HTML / MDX. Every box you want an arrow to attach to needs an `id` matching the `from` / `to` strings. Boxes are looked up by `getElementById` inside the stage, so IDs only need to be unique within the diagram (globally-unique IDs are still good practice on a page with multiple diagrams).

## Anchor patterns

Three patterns, ordered from coarsest to finest:

1. **Block-level anchor** — a whole card / panel / region gets the `id`. Best for "this region maps to that region" diagrams (UI mock → file list, table → query).
2. **Per-line anchor** — render each line of code as its own `<div class="..." id="...">`. Best for "this line routes to that line" — variant → switch arm, schema declaration → query reference, etc.
3. **Inline-span anchor** — wrap a specific identifier in `<span id="...">`. Use sparingly: only when the arrow's path **doesn't have to cross other content**. If the source span sits inside a code panel and the arrow has to reach a different panel, drawing from the span means the line exits at the span's edge — **inside** the panel — and cuts through every other line on its way out. In that case, anchor at the line (pattern 2) and add a visible highlight to the inner span instead; the eye reads "highlight → curve in gap → highlight."

Per-line and inline-span anchors require a few extra rules — see *Authoring code inside boxes* and *Sizing anchors — let the geometry tell you where to attach* below.

## Sizing anchors — let the geometry tell you where to attach

`startSocket` / `endSocket` attach to the **bounding rectangle** of the anchor element. Two opposing situations come up; the right anchor sizing depends on where you want the line to *enter* and *leave* the surrounding content.

**Loop-back arrows (sockets on the same side, curve swings into the outer margin).**

The arrow should appear to touch the *text* of the line, not the panel edge.

```css
.code-line {
  white-space: pre;
  width: max-content; /* or: display: table */
}
```

`endSocket: 'right'` now lands flush against the end of each line's text, and the curve bows out into the right margin. Use this for "variant → switch arm" / "field → field within the same column" / any figure where the arrow lives **on the same side** of the anchors.

**Cross-region arrows (sockets on opposite sides, curve crosses a gap).**

The arrow should appear to leave the source region at its **outer edge** and enter the target region at *its* outer edge — never crossing through the surrounding content. Anchor at the **line or container level** (a full-width block), and leave the line box at its natural width:

```css
.code-line {
  white-space: pre;        /* preserve formatting */
  /* DO NOT shrink to content here */
}
```

`startSocket: 'right'` on a full-width `<div class="code-line">` lands at the **right edge of the panel content area**, not at the end of the line's text. The arrow exits the panel cleanly into the gap, curves to the destination, and enters the next panel at its left edge — passing through no text at all.

Apply the same to inline spans: if a span lives *inside* the line and you draw `socket: 'right'` from it, the arrow will exit at the span's right edge — i.e. **inside** the panel — and cut through every line of code between it and the target. Move the anchor up one level (line or panel), and use a colored highlight on the inner token to convey *which* token the arrow refers to. The eye reads "highlight in source → curve in gap → highlight in target."

### Reserve gap width for the curve + label

For cross-region arrows that carry labels, the gap between the two regions has to absorb the curve **and** fit the label badge at its midpoint. Rules of thumb:

- **No labels** — `~60–80px` of gap is usually enough for a clean curve.
- **One label per arrow** — `~100–120px`; the label sits roughly centered in the gap.
- **Multiple labels stacking in the same gap** — `~140px`+, and stagger Y so labels don't collide.

In a grid layout:

```css
.flow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 110px; /* tune to curve + label needs */
}
```

If your responsive design collapses the two columns to one stacked column at narrow viewports, the cross-region socket configuration (`'right'` → `'left'`) **will look wrong** in the stacked layout — the arrows have no horizontal gap to live in. Either:
- pick a breakpoint that's small enough that the stacked case is rare, OR
- accept that the figure degrades gracefully (arrows arc between stacked panels — readable but not pretty), OR
- author a second arrow set behind a media-query-driven swap if the figure is important enough.

## Curve fan-out for multiple arrows

When several arrows share a similar start or end region, their curves will pile on top of each other unless you give each one a distinct trajectory. Two knobs:

- **Magnitude diversity in gravity** — stagger the X-component of `startSocketGravity` / `endSocketGravity` (e.g. `20`, `110`, `200`) so each curve bulges into a different "lane" of the available margin.
- **Vertical offset** — add a Y-component (`[x, ±y]`) to push some arrows above and others below the midline. Useful when several arrows land in a vertical stack at the same X.

When sockets are `'right'`/`'right'` on the same panel pair, the curves swing out into the **right margin**. Reserve that space on the anchor container:

```css
.code-panel {
  margin-right: 240px; /* room for the widest curve */
}
```

Without reserved margin, large-gravity curves can collide with the figure card edge.

### Splitting an endpoint so arrowheads don't stack

Every arrow lands at the **midpoint** of its target's chosen socket side — gravity changes the curve, not the contact point. If two arrows aim at the same `id`, their arrowheads stack on top of each other no matter how you tune the gravity.

When two arrows must connect to the same *logical* target (e.g. "this file"), the structural fix is to break the target into multiple anchorable sub-elements and aim each arrow at a different one. A card with a header strip and body paragraph naturally has two anchorable zones; a list of items, several; a multi-line code block, one per line.

```mdx
<div class="card">
  <div class="card-tab"  id="t-tab">filename.ts</div>
  <div class="card-body" id="t-body">Description.</div>
</div>
```

The two arrows still visually "point at" the same card, but the heads now land tens of pixels apart on the tab vs. the body. The same trick at the **start** end spaces arrows that leave a shared logical source.

### Routing curves around other arrows' anchors

`gravity` controls the curve's **bulge**, not where the arrow attaches, so a curve can sweep directly across another arrow's start or end zone even when their sockets are otherwise distinct. Two siblings exiting `socket: 'right'` at the same Y will collide: the path of the one with a longer horizontal trip passes through the exit point of the shorter one.

Push the offending curve out of that lane with a Y component in gravity:

```ts
// Curve was crossing over the start of a sibling arrow at the same Y.
// Strong outward pull + a vertical component arches it above the obstruction.
{ from: '...', to: '...', startSocketGravity: [120, -50], endSocketGravity: [-60, 0] }
```

Asymmetric magnitudes (e.g. `120` vs `60`) keep the entry/exit angles natural while letting the midsection bow above or below.

When the curve has to pass *through* another anchor's bounding box on its way out (sidebar-in-a-panel exiting to an external target — curve crosses the main-content sibling), align that sibling's text to a corner (`align-items: flex-start` / `flex-end`) so the curve passes through empty space rather than text.

## Authoring code inside boxes (MDX brace rules)

The single biggest pitfall when boxes contain code: MDX extracts each `{...}` JSX expression with a **brace-counting tokenizer** that runs before the contents reach acorn. A template literal whose text contains an unbalanced `{` or `}` will desync that counter, even though the JS itself is perfectly valid.

Two patterns work, one fails:

**Works — single template literal per line, balanced braces inside:**

```mdx
<div class="code-line">{`useActionState(createPost, { ok: false });`}</div>
```

`{` and `}` are balanced inside the template literal — counter stays happy.

**Works — MDX text escapes for unbalanced literal braces, placed *between* JSX expressions:**

```mdx
<div class="code-line">{`export function foo() `}\{</div>
<div class="code-line">\}</div>
```

`\{` and `\}` are MDX text escapes (rendered as literal `{` / `}`). Because they sit **outside** any `{...}` expression, the brace counter never sees them. Use this for lone opening / closing braces (function bodies, blocks, `<form action={x}>`-style attribute syntax).

**Fails — unbalanced `{` or `}` inside a template literal:**

```mdx
{`  <form action={`}<span id="x">formAction</span>{`}>`}
```

The template literal `  <form action={` has one extra `{`. Even though acorn would parse `\`  <form action={\`` fine as a string, the brace counter prematurely closes the expression and acorn then sees malformed leftovers — error: *Unterminated template* or *Unexpected character `` ` ``*.

If you absolutely need an inline span next to literal braces, escape the braces in MDX text:

```mdx
<div class="code-line">{`  <form action=`}\{<span class="anchor" id="cl-formaction">formAction</span>\}{`>`}</div>
```

Each template literal is balanced; the `\{` / `\}` render the visible braces. Pattern generalizes to `<button disabled={pending}>`, `return { ok: true };`, etc.

For lines with **balanced** braces inside (`{ ok: false }`, `return { x: 1 }`, full JSX self-closing tags), no escaping is needed — one template literal per line is enough.

## Colors and theme

The default arrow + label color is theme-aware (light / dark variants of `--sl-color-accent`-ish blues). Override per-arrow with `color: '#hex'`:

```ts
{ from: 'a', to: 'b', color: '#0ea5e9' } // blue
{ from: 'a', to: 'c', color: '#16a34a' } // green
{ from: 'a', to: 'd', color: '#9333ea' } // purple
```

The single `color` value is used **as-is in both themes**. Pick mid-tone palette colors that read on both light and dark backgrounds — Tailwind's `500` / `600` shades are a safe default.

Use per-arrow color when it carries meaning: distinguishing parallel mappings, color-matching arrows to highlighted spans in the boxes, separating "happy path" from "error path". For single-arrow figures, let the theme default handle it.

## Labels

Set `label` to render a small badge near the midpoint between the two sockets. Notes:

- Label color tracks the arrow color (theme default or per-arrow `color`).
- Labels are positioned in `document.body` (not inside the stage), so parent `overflow: hidden` does **not** clip them.
- `labelOffset: [x, y]` nudges the badge if it collides with the arrow body. Negative Y lifts it above the curve; positive Y drops it below.
- Very short or zero-length arrows can stack labels on top of each other — give those arrows more gravity to spread them out.

## Lifecycle

- Arrows are built after `load` (so they appear after boxes — expect a brief flash on first paint).
- Rebuilds on: `data-theme` attribute changes on `<html>`.
- Repositions on: `window.resize`, `document.body` resize (via `ResizeObserver`).
- The script is lazy-loaded on first render of any `.arrow-stage`.

## Constraints & gotchas

- `from` / `to` IDs that don't resolve are **silently skipped**. Missing arrows = check ID spelling.
- The stage is `position: relative` but does **not** style the boxes themselves. Style the boxes inline (`<style>` block in the lesson) or via a shared class.
- Labels are absolutely positioned at body-level — globally-unique IDs become more important if multiple diagrams share label text.
- Sockets and gravity are tuning knobs: start with `'auto'`, add explicit sockets when arrows cross awkwardly, add gravity tuples to push them apart.

## Example

A live, multi-figure showcase (discriminated-union → switch arms, Server Action ↔ form, page-layout → file mapping, Drizzle schema → query) is in [`src/content/docs/0 Demos/diagrams/arrow-diagram-demo.mdx`](../../../src/content/docs/0%20Demos/diagrams/arrow-diagram-demo.mdx). It exercises all three anchor patterns and the brace-escape rules.

A minimal example — three boxes representing the JavaScript event loop, three arrows with explicit sockets, gravity, and label offsets:

````mdx
<Figure>
  <ArrowDiagram arrows={[
    { from: 'el-stack',  to: 'el-webapi', label: 'register',        startSocket: 'left',  endSocket: 'top',   startSocketGravity: [-80, 0],  endSocketGravity: [0, -50],  labelOffset: [0, -10] },
    { from: 'el-webapi', to: 'el-queue',  label: 'on complete',     startSocket: 'right', endSocket: 'left',  startSocketGravity: [60, 0],   endSocketGravity: [-60, 0],  labelOffset: [0, -16] },
    { from: 'el-queue',  to: 'el-stack',  label: 'event-loop tick', startSocket: 'top',   endSocket: 'right', startSocketGravity: [0, -50],  endSocketGravity: [80, 0],   labelOffset: [0, -10] },
  ]}>
    <div class="eld">
      <div class="eld-row">
        <div class="eld-box" id="el-stack">Call stack</div>
      </div>
      <div class="eld-row">
        <div class="eld-box" id="el-webapi">Web APIs</div>
        <div class="eld-box" id="el-queue">Task queue</div>
      </div>
    </div>
  </ArrowDiagram>
  <Fragment slot="caption">
    The runtime hands async work off to a Web API, returns immediately, and only runs the callback once the call stack is empty.
  </Fragment>
</Figure>
````
