# `ExternalResource`

Clickable card pointing to an external resource — docs, repos, design files, anything off-site. Renders as a tile with an icon badge, title, auto-derived hostname, a top-right external-link arrow, and an optional one-line description. Prefer over Starlight's `LinkCard` in lessons where the brand/category cue matters.

## Import

```ts
import ExternalResource from '../../../components/ui/ExternalResource.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | — | Headline on the card. |
| `href` | `string` | yes | — | Destination URL. Hostname is derived from it and shown under the title. Opens in a new tab. |
| `description` | `string` | no | — | One-line teaser. Omit for a tighter row. |
| `icon` | `string` | no | `lucide:external-link` | `astro-icon` name. For brand logos use `simple-icons:*` — browse [simpleicons.org](https://simpleicons.org). For generic glyphs use `lucide:*`. |
| `iconColor` | `string` | no | — | CSS color for the icon (e.g. `#61DAFB`). Useful for matching a brand color when the icon set ships monochrome. |

## Slot

None — title and description are props, not slot content.

## Combine with `CardGrid`

Wrap several in Starlight's `<CardGrid>` for a responsive 2-column layout that collapses to one column on narrow viewports.

```mdx
import ExternalResource from '../../../components/ui/ExternalResource.astro';
import { CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <ExternalResource
    title="React docs — useState"
    href="https://react.dev/reference/react/useState"
    icon="simple-icons:react"
    iconColor="#61DAFB"
    description="Official reference, including edge cases the lesson doesn't cover."
  />
  <ExternalResource
    title="GitHub Repository"
    href="https://github.com/withastro/starlight"
    icon="simple-icons:github"
    description="Starter code and final solutions for this module."
  />
</CardGrid>
```
