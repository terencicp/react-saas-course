# `Tabs` + `TabItem`

A tab strip with one panel visible at a time. Each `<TabItem>` is one tab. Use for genuine alternatives (per-OS, per-package-manager, per-tool) — not for hiding length.

For tabbed *code* comparisons specifically, prefer the in-repo [`CodeVariants`](../code/code-variants.md) — it wraps `Tabs` in a card with prose-under-fence styling.

## Imports

```ts
import { Tabs, TabItem } from '@astrojs/starlight/components';
```

## Props

### `Tabs`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `syncKey` | `string` | no | — | All `<Tabs>` blocks on the page that share a `syncKey` switch in lockstep, and the choice persists across navigations. Use for cross-page "pick your OS / package manager once" UX. |

### `TabItem`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `label` | `string` | yes | — | Text shown on the tab strip. |
| `icon` | `StarlightIcon` (string) | no | — | Icon shown left of the label. See [icons.md](./icons.md). |

## Slot

- `Tabs` default slot — two or more `<TabItem>` children.
- `TabItem` default slot — free-form markdown / MDX content for that panel.

## Constraints & gotchas

- A `<TabItem>` without `label` renders a blank tab.
- `syncKey` only sync tabs whose labels match exactly — if one block uses `"macOS"` and another uses `"Mac"`, they won't pair up.
- Don't nest `<Tabs>` inside another `<Tabs>` — accessibility breaks down.

## Example

```mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs syncKey="pkg">
  <TabItem label="npm" icon="seti:npm">
    ```bash
    npm install drizzle-orm
    ```
  </TabItem>
  <TabItem label="pnpm" icon="pnpm">
    ```bash
    pnpm add drizzle-orm
    ```
  </TabItem>
  <TabItem label="bun" icon="bun">
    ```bash
    bun add drizzle-orm
    ```
  </TabItem>
</Tabs>
```
