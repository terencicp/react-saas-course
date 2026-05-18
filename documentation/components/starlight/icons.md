# `Icon`

Renders one of Starlight's built-in SVG icons. The same icon names are accepted by `Card`, `Aside`, `TabItem`, etc.

## Import

```ts
import { Icon } from '@astrojs/starlight/components';
```

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `StarlightIcon` (string) | yes | — | Icon to render. See list below. |
| `label` | `string` | no | — | Accessible label. **Omit and the icon is hidden from assistive tech** — fine for purely decorative icons, required when the icon carries meaning on its own. |
| `size` | `string` | no | `1em` | CSS size — `'2rem'`, `'24px'`, `'1.5em'`. Numbers without units are not valid. |
| `color` | `string` | no | `currentColor` | CSS colour — any valid CSS colour string. |
| `class` | `string` | no | — | Extra class names. |

## Example

```mdx
import { Icon } from '@astrojs/starlight/components';

<Icon name="rocket" />                          {/* inherits text colour and size */}
<Icon name="star" color="goldenrod" size="2rem" />
<Icon name="github" label="GitHub repository" /> {/* meaningful icon → label required */}
```

## Curated icon names for this project

Full set lives in the Starlight reference; the names below are the ones likely to come up in this course. All values are strings — pass exactly as written.

### Navigation & controls

`up-caret`, `down-caret`, `left-caret`, `right-caret`, `up-arrow`, `down-arrow`, `left-arrow`, `right-arrow`, `close`, `magnifier`, `forward-slash`, `bars`

### Status & callout

`information`, `warning`, `error`, `approve-check`, `approve-check-circle`, `question`, `question-circle`, `rocket`, `star`, `padlock`, `puzzle`, `heart`

### Content & editing

`pencil`, `pen`, `document`, `add-document`, `notes`, `open-book`, `list-format`, `analytics`, `random`, `comment`, `comment-alt`

### System / device / theme

`setting`, `external`, `download`, `cloud-download`, `clock`, `window`, `laptop`, `desktop`, `mobile-android`, `moon`, `sun`

### Infrastructure

`database`, `server`, `code-branch`

### Tooling & framework logos

`astro`, `starlight`, `mdx`, `node`, `npm`, `pnpm`, `bun`, `biome`, `deno`, `jsr`, `vercel`, `netlify`, `cloudflare`, `vscode`, `jetbrains`, `zed`, `vim`, `figma`, `sketch`, `chrome`, `firefox`, `edge`, `safari`, `apple`, `linux`, `homebrew`, `solidjs`, `alpine`

### Repos & community

`github`, `gitlab`, `bitbucket`, `discord`, `slack`, `x.com`, `youtube`, `linkedin`, `rss`, `email`

### File-type icons (`seti:*`)

Use for files in prose or in custom listings — `FileTree` picks these automatically from extension.

`seti:folder`, `seti:default`, `seti:react`, `seti:typescript`, `seti:tsconfig`, `seti:javascript`, `seti:json`, `seti:html`, `seti:css`, `seti:sass`, `seti:markdown`, `seti:yml`, `seti:xml`, `seti:config`, `seti:shell`, `seti:db`, `seti:prisma`, `seti:graphql`, `seti:docker`, `seti:eslint`, `seti:webpack`, `seti:vite`, `seti:npm`, `seti:yarn`, `seti:git`, `seti:github`, `seti:gitlab`, `seti:lock`, `seti:license`, `seti:image`, `seti:svg`, `seti:pdf`, `seti:font`, `seti:video`, `seti:audio`, `seti:python`, `seti:rust`, `seti:go`, `seti:java`, `seti:php`, `seti:ruby`, `seti:swift`, `seti:kotlin`, `seti:wasm`, `seti:terraform`, `seti:notebook`, `seti:info`, `seti:clock`, `seti:todo`, `seti:ignored`
