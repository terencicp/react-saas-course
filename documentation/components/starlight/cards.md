# `Card` + `CardGrid`

Boxed content tile with a title and optional icon. Wrap several in a `<CardGrid>` to lay them out side-by-side in a responsive grid (one column on narrow viewports, two columns when there's room).

## Imports

```ts
import { Card, CardGrid } from '@astrojs/starlight/components';
```

Both are re-exported from the same module. Built-in to Starlight — no relative path.

## Props

### `Card`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | — | Card heading, rendered prominently at the top. |
| `icon` | `StarlightIcon` (string) | no | — | Name of a built-in Starlight icon, shown next to the title. See [icons.md](./icons.md). |

### `CardGrid`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `stagger` | `boolean` | no | `false` | When `true`, offsets every second card downward by ~5rem on viewports ≥50rem — a cascading visual rhythm. Use sparingly. |

## Slot

- `Card` default slot — free-form markdown / MDX for the body.
- `CardGrid` default slot — one or more `<Card>` (or `<LinkCard>`) children.

## Example

```mdx
import { Card, CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Fast iteration" icon="rocket">
    Hot reload, instant feedback, no rebuild step.
  </Card>
  <Card title="Type-safe" icon="approve-check-circle">
    End-to-end types from the database row to the rendered prop.
  </Card>
</CardGrid>
```

With `stagger`:

```mdx
<CardGrid stagger>
  <Card title="One">…</Card>
  <Card title="Two">…</Card>
  <Card title="Three">…</Card>
  <Card title="Four">…</Card>
</CardGrid>
```
