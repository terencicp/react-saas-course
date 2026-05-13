# `Figure`

Universal wrapper for any diagram or visual on the site. Renders an outer card (padded, rounded, hairline border, sidebar background) with an optional caption underneath. The content sits in the default slot; diagram-specific components (`<ArrowDiagram>`, custom HTML, an `<img>`, etc.) go inside.

## Import

```ts
import Figure from '../../../../components/figures/Figure.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `caption` | `string` | no | — | Plain-text caption rendered below the body. Overridden by the `caption` slot when both are present. |

## Slots

- **default** — the figure body. Any HTML / MDX / component children.
- **`caption`** (named) — rich caption when a plain string isn't enough (links, inline code, multiple paragraphs). Use `<Fragment slot="caption">…</Fragment>` in MDX. Takes precedence over the `caption` prop.

## Constraints & gotchas

- Provide `caption` as a prop *or* a slot, not both — the slot wins, the prop is ignored.
- Captions render as a `<figcaption>` styled in muted grey. Inline markdown works inside the slot; keep it to one or two sentences.
- The wrapper has its own padding and border — don't nest another card-like wrapper (e.g. `<DiagramSequence>`, `<TabbedContent>`) inside it. Those components already provide the outer card.

## Example

Plain-string caption:

````mdx
<Figure caption="The runtime hands async work to a Web API and returns immediately.">
  <img src="/diagrams/event-loop.svg" alt="JavaScript event loop" />
</Figure>
````

Rich caption with formatting and a link:

````mdx
<Figure>
  <ArrowDiagram arrows={[ /* … */ ]}>
    {/* boxes with id attributes */}
  </ArrowDiagram>
  <Fragment slot="caption">
    The runtime never blocks on async work — *register*, *on complete*, *event-loop tick*. See [the spec](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop) for the formal model.
  </Fragment>
</Figure>
````
