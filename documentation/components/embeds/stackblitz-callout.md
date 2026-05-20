# `StackBlitzCallout`

Collapsible callout that lazy-loads a StackBlitz WebContainer sandbox. Thin URL builder over [`SandboxCallout`](./sandbox-callout.md) — pick `mode="github"` to load a public repo, `mode="id"` to mount an existing StackBlitz project. WebContainer boots inside the embedded iframe because the site is cross-origin isolated; see [sandbox-callout.md § Cross-origin isolation](./sandbox-callout.md#cross-origin-isolation).

## Import

```ts
import StackBlitzCallout from '../../../../components/embeds/StackBlitzCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `mode` | `'github' \| 'id'` | yes | — | Selects the embed source. `github` loads a public repo; `id` mounts a saved StackBlitz project. |
| `repo` | `string` | yes if `mode="github"` | — | `<owner>/<repo>` or `<owner>/<repo>/tree/<ref>/<path>`. E.g. `vercel/next.js/tree/canary/examples/hello-world`. |
| `projectId` | `string` | yes if `mode="id"` | — | Public StackBlitz project id (slug). |
| `file` | `string` | no | — | File to open in the editor on load. |
| `view` | `'editor' \| 'preview' \| 'both'` | no | StackBlitz default | Initial pane layout. |
| `terminal` | `string` | no | — | Terminal pane to show (typically `'dev'` for Node templates). |
| `startScript` | `string` | no | — | npm script to auto-run on boot (e.g. `'dev'`). |
| `theme` | `'dark' \| 'light'` | no | `'dark'` | Embed theme. |
| `ctl` | `boolean` | no | `false` | Gate the WebContainer boot behind an in-iframe click. Use when stacking several embeds on one lesson to spare the user's CPU. |
| `hideNavigation` | `boolean` | no | `false` | Drop the preview URL bar. |
| `hideExplorer` | `boolean` | no | `false` | Drop the file tree. |
| `hideDevTools` | `boolean` | no | `false` | Drop the console panel. |
| `initialPath` | `string` | no | — | Initial preview pathname (e.g. `/about`). |
| `devToolsHeight` | `number` | no | — | DevTools pane height as a percentage (0–100). |
| `terminalHeight` | `number` | no | — | Terminal pane height as a percentage (0–100). |
| `title` | `string` | yes | — | `<iframe title>` — for accessibility, not shown. |
| `height` | `number` | no | `560` | Iframe height in pixels. |
| `label` | `string` | no | `'Open sandbox'` | Bold text on the collapsed row. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label.

## Constraints & gotchas

- First load is slow — cold WebContainer + `pnpm install`. Use `ctl` when stacking multiple embeds.
- Users see an **anonymous** StackBlitz — no logged-in account inside the embed. If a lesson needs to save the sandbox to a StackBlitz account, link out to a new tab instead.
- `mode="id"` requires the project to be **public**. Private project IDs return 404 inside the iframe.

## Examples

GitHub loader, editor focused on a specific file:

````mdx
<StackBlitzCallout
  mode="github"
  repo="vercel/next.js/tree/canary/examples/hello-world"
  file="app/page.tsx"
  view="editor"
  terminal="dev"
  startScript="dev"
  title="Next.js hello-world (editor view)"
  label="Open Next.js hello-world"
  height={620}
>
  Lands on `app/page.tsx` with the `dev` terminal pinned.
</StackBlitzCallout>
````

Existing project by ID, click-to-load to keep the lesson page fast:

````mdx
<StackBlitzCallout
  mode="id"
  projectId="sdk-open-embed-github-repo-ts"
  view="editor"
  ctl
  title="Curated SDK example"
  label="Open curated project"
  height={520}
>
  Mounts the project ID directly — no GitHub clone, no SDK script on the lesson page.
</StackBlitzCallout>
````
