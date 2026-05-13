# `Badge`

Tiny inline status pill — a coloured rounded rectangle with a short label. Designed to sit inside prose, table cells, or next to a heading. Self-closing; the label is a prop, not slot content.

## Import

```ts
import { Badge } from '@astrojs/starlight/components';
```

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `text` | `string` | yes | — | Label shown inside the badge. Keep it short — one or two words. |
| `variant` | `'default' \| 'note' \| 'tip' \| 'caution' \| 'danger' \| 'success'` | no | `'default'` | Colour scheme. See table below. |
| `size` | `'small' \| 'medium' \| 'large'` | no | — | Text scale. Omit to inherit. |

Also accepts standard `<span>` attributes (`class`, `style`) for one-off tweaks.

### Variant colours

| `variant` | Colour | Typical use |
| --- | --- | --- |
| `default` | theme accent | Neutral tag. |
| `note` | blue | Informational marker. |
| `tip` | purple | Highlight a recommended/new thing. |
| `success` | green | "Working", "passing", "added". |
| `caution` | orange | "Heads-up", "experimental". |
| `danger` | red | "Deprecated", "removed", "breaking". |

## Slot

None — label is the `text` prop.

## Example

Inline in prose:

```mdx
import { Badge } from '@astrojs/starlight/components';

The legacy `getServerSideProps` API is still around <Badge text="deprecated" variant="danger" size="small" /> but new code should use the App Router.
```

Next to a heading:

```mdx
## Streaming SSR <Badge text="new" variant="tip" />
```
