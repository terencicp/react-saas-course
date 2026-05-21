# `DiagramSequence` + `DiagramStep`

Self-contained figure that walks through a temporal sequence — discrete panels swapped via a slider, tick marks, and back/forward chevrons. The stage uses a CSS grid stack, so it sizes to the tallest step at first paint and never reflows as the reader scrubs through.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import DiagramSequence from '../../../components/figures/diagram-sequence/DiagramSequence.astro';
import DiagramStep from '../../../components/figures/diagram-sequence/DiagramStep.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `DiagramSequence`

No props.

### `DiagramStep`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `caption` | `string` | no | — | Plain-text caption rendered below this step's body. Overridden by the `caption` slot when both are present. |

## Slots

- **`DiagramSequence` default** — one or more `<DiagramStep>` children. Order in source = order in the slider.
- **`DiagramStep` default** — the step's body. Any HTML / MDX / component children.
- **`DiagramStep` `caption`** (named) — rich caption when a plain string isn't enough. Use `<Fragment slot="caption">…</Fragment>`. Takes precedence over the `caption` prop.

## Constraints & gotchas

- `<DiagramStep>` must be a **direct child** of `<DiagramSequence>`. It is found via `[data-ds-step]` inside the stage.
- At least two steps. A single step renders disabled controls with nothing to do.
- All steps occupy the same grid cell — inactive steps stay in layout (`visibility: hidden`) so the stage doesn't jump. Plan for the tallest step to set the height.
- Captions render under each step's body, so they swap with the body. They are *not* a shared caption for the whole sequence.
- This component is a complete figure card — don't wrap it in `<Figure>` (you'll get nested padding and borders).

## Example

Five steps highlighting one node of a render pipeline at a time, with per-step captions:

````mdx
<DiagramSequence>
  <DiagramStep caption="Parse: HTML and CSS arrive as text, the browser parses them into the DOM and CSSOM.">
    <div class="pipe">
      <div class="node is-on">Parse</div>
      <div class="node">Style</div>
      <div class="node">Layout</div>
      <div class="node">Paint</div>
      <div class="node">Composite</div>
    </div>
  </DiagramStep>

  <DiagramStep caption="Style: computed style is resolved per node.">
    <div class="pipe">
      <div class="node">Parse</div>
      <div class="node is-on">Style</div>
      <div class="node">Layout</div>
      <div class="node">Paint</div>
      <div class="node">Composite</div>
    </div>
  </DiagramStep>

  {/* …Layout, Paint, Composite… */}
</DiagramSequence>
````

Rich caption when a link or inline code is needed:

````mdx
<DiagramStep>
  <div class="pipe">{/* … */}</div>
  <Fragment slot="caption">
    `Layout` produces a geometry tree — positions and sizes, **not pixels** yet. See [the rendering pipeline](https://web.dev/articles/rendering-performance).
  </Fragment>
</DiagramStep>
````
