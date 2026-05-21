# `TabbedContent` + `TabbedItem`

Tabbed scaffold for content that needs to switch between several panels. Wraps Starlight's `<Tabs>` in a figure-card (same padding / border / sidebar background as `<Figure>` and `<DiagramSequence>`), and each `<TabbedItem>` accepts an optional per-tab caption rendered below the body.

Use when the panels are **alternatives** of the same idea (diagram vs. code vs. prose, or several variants of a UI state). For tabbed comparisons of *code*, prefer `CodeVariants` — it's purpose-built for that.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import TabbedContent from '../../../components/figures/tabbed-content/TabbedContent.astro';
import TabbedItem from '../../../components/figures/tabbed-content/TabbedItem.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `TabbedContent`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `syncKey` | `string` | no | — | Forwarded to Starlight `<Tabs>`. Multiple `<TabbedContent>` blocks on the same page that share a `syncKey` switch tabs in lockstep. |

### `TabbedItem`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `label` | `string` | yes | — | Text shown on the tab strip. |
| `icon` | `string` | no | — | Starlight icon name prefixed on the tab. |
| `caption` | `string` | no | — | Plain-text caption rendered below this tab's body. Overridden by the `caption` slot when both are present. |

## Slots

- **`TabbedContent` default** — one or more `<TabbedItem>` children. Order in source = order on the tab strip.
- **`TabbedItem` default** — the tab's body. Any HTML / MDX / component children, including fenced code blocks.
- **`TabbedItem` `caption`** (named) — rich caption with markdown / links / inline code. Takes precedence over the `caption` prop.

## Constraints & gotchas

- `<TabbedItem>` must be a **direct child** of `<TabbedContent>` (forwarded to Starlight `<Tabs>`).
- Every `<TabbedItem>` needs `label` — omit it and the tab strip shows a blank tab.
- Captions swap with the tab body — they're per-tab, not a shared caption for the whole block.
- This is a complete figure card — don't nest it inside `<Figure>` (double-bordered, double-padded).
- For pure code-vs-code comparisons, prefer `CodeVariants`: it's the same idea with tighter affordances for fenced blocks.

## Example

Mixed-content tabs — diagram, code, prose — with per-tab captions and a `syncKey`:

````mdx
<TabbedContent syncKey="component-model">
  <TabbedItem label="Diagram" caption="The mental model — a component is a pipeline from props to rendered DOM.">
    <div class="flow">
      <div class="node">props</div>
      <div>→</div>
      <div class="node">render()</div>
      <div>→</div>
      <div class="node">DOM</div>
    </div>
  </TabbedItem>

  <TabbedItem label="Code" icon="seti:javascript" caption="Same idea in source — a function from props to JSX.">
    ```jsx
    function Greeting({ name }) {
      return <h1>Hello, {name}!</h1>;
    }
    ```
  </TabbedItem>

  <TabbedItem label="Notes">
    A component is a function from props to UI. Same input, same output — that's what makes React's render model predictable. (Caption is optional.)
  </TabbedItem>
</TabbedContent>
````
