# `Aside`

Inline callout block, coloured panel with an icon and optional title.

## Import

```ts
import { Aside } from '@astrojs/starlight/components';
```

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `type` | `'note' \| 'tip' \| 'caution' \| 'danger'` | no | `'note'` | Tone — drives colour, default icon, and default title. |
| `title` | `string` | no | localised default per type (e.g. "Note", "Tip") | Heading shown above the body. |
| `icon` | `StarlightIcon` (string) | no | type-default | Override the icon. See [icons.md](./icons.md). |

## Slot

Default slot — any markdown / MDX. Code fences, lists, and inline components all work.

## Example

```mdx
<Aside type="tip" icon="starlight" title="Pro tip">
  Mix any markdown inside, including code fences:

  ```ts
  const x = 1;
  ```
</Aside>
```
