# `Buckets` + `Bucket` + `Item`

Classification drill. Each `<Bucket>` declares a category; each `<Item bucket="...">` is a draggable chip whose `bucket` prop references a bucket's `name`. Pool order is shuffled on render. The student drags (or taps, on touch) each chip into a bucket; **Check** marks each chip green or red.

## Imports

```ts
import Buckets from '../../../components/exercises/buckets/Buckets.astro';
import Bucket from '../../../components/exercises/buckets/Bucket.astro';
import Item from '../../../components/exercises/buckets/Item.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `Buckets`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `twoCol` | `boolean` | no | `false` | Lay buckets out in two columns (collapses to one column under 540px). |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Drag each item into the bucket it belongs to…" prompt. |

### `Bucket`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Key that items reference via their `bucket` prop. |
| `label` | `string` | yes | — | Heading shown on the bucket (uppercase pill). |
| `description` | `string` | no | — | One-line subtitle under the label. |

### `Item`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `bucket` | `string` | yes | — | The target bucket's `name`. Used by the grader. |

## Slots

- **`Buckets` default** — `<Bucket>` and `<Item>` children, mixed freely. Order doesn't matter; the runtime sorts them.
- **`Item` default** — inline markdown for the chip. Backticks become `<code>`. Fenced Expressive Code blocks inside an item get a roomier chip.

## Constraints & gotchas

- `<Item bucket="X">` must match a `<Bucket name="X">` exactly. Typo → the item never matches anywhere → marked wrong.
- The source slot is removed from the DOM after JS bootstraps; don't rely on its layout for styling.
- Tap-to-select (a chip, then a bucket) is the touch-device fallback for drag-and-drop. Both code paths share the same drop logic.
- Wrong chips get an `✕` badge for colorblind accessibility, in addition to the red color.

## Example

Two buckets, inline-code chips:

````mdx
<Buckets>
  <Bucket name="prim" label="Primitives" description="Copied by value" />
  <Bucket name="ref" label="Reference types" description="Copied by reference" />

  <Item bucket="prim">`number`</Item>
  <Item bucket="prim">`string`</Item>
  <Item bucket="prim">`boolean`</Item>
  <Item bucket="ref">`Array`</Item>
  <Item bucket="ref">`Object`</Item>
  <Item bucket="ref">`Map`</Item>
</Buckets>
````

Two-column layout with custom instructions and prose chips:

````mdx
<Buckets twoCol instructions="Sort each piece of state into where it should live in a typical React app.">
  <Bucket name="local" label="Component state" description="Lives inside one component" />
  <Bucket name="global" label="Global store" description="Shared across the app" />

  <Item bucket="local">Whether a dropdown is open</Item>
  <Item bucket="local">The text in a search input before submit</Item>
  <Item bucket="global">The currently signed-in user</Item>
  <Item bucket="global">The shopping cart contents</Item>
</Buckets>
````
