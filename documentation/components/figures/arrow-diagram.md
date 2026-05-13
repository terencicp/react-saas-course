# `ArrowDiagram`

Box-and-arrow diagram. You author the boxes as plain HTML children (each given an `id`), and the component draws arrows between them via [leader-line](https://github.com/anseki/leader-line). Arrows redraw on resize and on theme change; the leader-line script is lazy-loaded on first render.

`<ArrowDiagram>` provides only the arrow layer — it has no outer card. Wrap it in `<Figure>` when you want a captioned, bordered figure.

## Import

```ts
import ArrowDiagram from '../../../../components/figures/ArrowDiagram.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `arrows` | `Arrow[]` | yes | — | Array of arrow descriptors — see the `Arrow` shape below. Each entry references two box IDs in the slot. |

### `Arrow` shape

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `from` | `string` | yes | — | `id` of the start box (matched inside the slot). |
| `to` | `string` | yes | — | `id` of the end box. |
| `label` | `string` | no | — | Short label rendered on top of the arrow midpoint. |
| `startSocket` | `'top' \| 'bottom' \| 'left' \| 'right' \| 'auto'` | no | `'auto'` | Side of the start box the arrow leaves from. |
| `endSocket` | same as above | no | `'auto'` | Side of the end box the arrow lands on. |
| `startSocketGravity` | `number \| [number, number] \| 'auto'` | no | `'auto'` | How strongly the arrow pulls away from `startSocket` before bending. Tuple form `[x, y]` lets you push in a specific direction. |
| `endSocketGravity` | same as above | no | `'auto'` | Same, for the landing side. |
| `labelOffset` | `[number, number]` | no | `[0, 0]` | Pixel nudge for the label, applied to the midpoint between the two sockets. Useful when the label collides with the arrow body. |

## Slot

The default slot is the diagram body — arbitrary HTML / MDX. Every box you want an arrow to attach to needs an `id` matching the `from` / `to` strings. Boxes are looked up by `getElementById` inside the stage, so IDs only need to be unique within the diagram (but globally-unique IDs are still good practice on a page that may have several diagrams).

## Constraints & gotchas

- Arrows are drawn after the DOM mounts and reposition on resize, theme change, and body resize. Initial draw happens after `load` — expect a brief flash where boxes appear before arrows.
- `from` / `to` IDs that don't resolve are silently skipped. If an arrow is missing, check the ID spelling.
- Labels are absolutely positioned in `document.body` (so they sit above the diagram regardless of overflow). They follow the arrow midpoint on resize; very short or zero-length arrows can stack labels on top of each other.
- Sockets and gravity are tuning knobs for arrow routing — start with `auto`, then add explicit sockets when arrows cross awkwardly, then add gravity tuples to push them apart.
- The component renders a relatively-positioned stage but does **not** style the boxes themselves. Author box styling inline in the MDX (an `<style>` block in the lesson) or via a shared class.

## Example

Three boxes representing the JavaScript event loop, three arrows with explicit sockets, gravity, and label offsets:

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
