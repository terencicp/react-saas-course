# `LinkCard`

A clickable card that links somewhere — internal page or external URL. Renders as a full-width tile with title, optional description, and a trailing arrow affordance. The entire surface is the click target.

Pair with `<CardGrid>` (see [cards.md](./cards.md)) to lay several side-by-side.

## Import

```ts
import { LinkCard } from '@astrojs/starlight/components';
```

(Re-exported from `@astrojs/starlight/components` alongside `Card` and `CardGrid`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | — | Headline on the card. |
| `href` | `string` | yes | — | Destination URL. External URLs get a target=_blank-style affordance from Starlight's link handling. |
| `description` | `string` | no | — | One-line context under the title. Keep it short — the card is a teaser, not a paragraph. |

Also accepts any standard `<a>` attribute (`target`, `rel`, `class`, etc.) — they pass through to the underlying anchor.

## Slot

None — `<LinkCard>` is a self-closing component. Title and description are props, not slot content.

## Example

Single card pointing at an external resource:

```mdx
import { LinkCard } from '@astrojs/starlight/components';

<LinkCard
  title="React docs — useState"
  href="https://react.dev/reference/react/useState"
  description="Official reference, including edge cases the lesson doesn't cover."
/>
```

Grid of related links:

```mdx
import { CardGrid, LinkCard } from '@astrojs/starlight/components';

<CardGrid>
  <LinkCard title="Previous lesson" href="/unit-1/intro/" description="Recap before moving on." />
  <LinkCard title="Next lesson" href="/unit-1/state/" description="State and re-renders." />
</CardGrid>
```
