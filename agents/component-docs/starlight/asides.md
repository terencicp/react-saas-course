# `Aside`

Inline callout block — coloured panel with an icon and optional title — for setting a paragraph apart from surrounding prose. Four built-in tones cover the common framings: neutral info, "do this", "be careful", "outright wrong".

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

### Type variants

| `type` | Use it for | Colour | Default icon |
| --- | --- | --- | --- |
| `note` | Neutral side-info. Default. | blue | information |
| `tip` | "Do this." Recommended pattern, shortcut, productivity hint. | purple | rocket |
| `caution` | "Be careful." Common pitfall, easy mistake, footgun. | yellow | warning |
| `danger` | "Don't do this." Security issue, data loss, hard breakage. | red | error |

## Slot

Default slot — any markdown / MDX. Code fences, lists, and inline components all work.

## Example

```mdx
import { Aside } from '@astrojs/starlight/components';

<Aside>
  Background context.
</Aside>

<Aside type="tip" title="Shortcut">
  Press `⌘K` to open the command palette.
</Aside>

<Aside type="caution" title="Easy to miss">
  The `key` prop must be stable across renders.
</Aside>

<Aside type="danger" title="Never">
  Don't commit `.env` files containing secrets.
</Aside>
```

With a custom icon and a code fence inside:

```mdx
<Aside type="tip" icon="starlight" title="Pro tip">
  Mix any markdown inside, including code fences:

  ```ts
  const x = 1;
  ```
</Aside>
```
