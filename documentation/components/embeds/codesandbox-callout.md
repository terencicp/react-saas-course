# `CodeSandboxCallout`

Collapsible callout that lazy-loads a CodeSandbox sandbox. Thin URL builder over [`SandboxCallout`](./sandbox-callout.md) — pick `kind="embed"` for the legacy `/embed/<id>` shape, `kind="p"` for the newer `/p/sandbox/<id>` Cloud sandbox, or `kind="github"` to boot any public GitHub repo. The embed boots inside the iframe because the site is cross-origin isolated; see [sandbox-callout.md § Cross-origin isolation](./sandbox-callout.md#cross-origin-isolation).

## Import

```ts
import CodeSandboxCallout from '../../../components/embeds/CodeSandboxCallout.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `kind` | `'embed' \| 'p' \| 'github'` | yes | — | Selects the URL family. `embed` → `/embed/<id>`; `p` → `/p/sandbox/<id>`; `github` → `/p/github/<owner>/<repo>`. |
| `id` | `string` | yes if `kind="embed"` or `kind="p"` | — | Sandbox slug, e.g. `4tn8i`. |
| `repo` | `string` | yes if `kind="github"` | — | `<owner>/<repo>`, e.g. `vercel/next.js`. |
| `branch` | `string` | no | `'main'` | Branch for `kind="github"`. |
| `path` | `string` | no | — | Sub-directory inside the repo, e.g. `examples/with-react-hook-form`. |
| `view` | `'editor' \| 'split' \| 'preview'` | no | CodeSandbox default | Initial pane layout. |
| `module` | `string` | no | — | File opened in the editor on `/embed/<id>` URLs. Comma-separate to open multiple tabs. |
| `file` | `string` | no | — | File opened on `/p/github/...` URLs (CodeSandbox uses `file=` instead of `module=` for repo loaders). |
| `theme` | `'dark' \| 'light'` | no | CodeSandbox default | Editor chrome. |
| `fontsize` | `number` | no | `14` | Editor font size in pixels. |
| `hidenavigation` | `boolean` | no | `false` | Hide the URL bar above the preview pane. |
| `runonclick` | `boolean` | no | `false` | Render a poster with a play button instead of booting on load. Use when stacking several embeds on one lesson. |
| `initialpath` | `string` | no | — | First URL the preview navigates to. |
| `previewwindow` | `'browser' \| 'console' \| 'tests'` | no | `'browser'` | Right-hand pane content when `view="split"` or `"preview"`. |
| `forcerefresh` | `boolean` | no | `false` | Full reload on every edit instead of HMR. |
| `editorsize` | `number` | no | — | Editor width as a percentage (0–100). |
| `expanddevtools` | `boolean` | no | `false` | Open devtools by default. |
| `eslint` | `boolean` | no | `false` | Run ESLint on each edit. |
| `codemirror` | `boolean` | no | `false` | Swap Monaco for CodeMirror — lighter when stacking many embeds on one page. |
| `verticallayout` | `boolean` | no | `false` | Stack editor and preview vertically. |
| `highlights` | `string` | no | — | Comma-separated line numbers to highlight in the editor. |
| `title` | `string` | yes | — | `<iframe title>` — for accessibility, not shown. |
| `height` | `number` | no | `560` | Iframe height in pixels. |
| `label` | `string` | no | `'Open CodeSandbox'` | Bold text on the collapsed row. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label.

## Constraints & gotchas

- Repo-loader (`kind="github"`) does a real install on first boot — noticeably slower than `/embed/<id>`. Set `runonclick` when stacking more than one on a page.
- Users see an **anonymous** CodeSandbox session — no logged-in account inside the embed. If a lesson needs the user signed in (forking, saving) link out to a new tab instead.
- `/p/sandbox/<id>` only resolves for **public** sandboxes. Private IDs render an "Unable to access this workspace" page.
- For Define-API prefills (inline file map, no published sandbox) the embed URL is built by separate components — not covered here.

## Examples

GitHub repo loader, editor focused on a specific file:

````mdx
<CodeSandboxCallout
  kind="github"
  repo="vercel/next.js"
  branch="canary"
  path="examples/with-react-hook-form"
  file="/app/page.tsx"
  title="vercel/next.js — examples/with-react-hook-form"
  label="Open Next.js with-react-hook-form"
  height={620}
>
  Boots the canonical Next.js + React Hook Form example straight from the canary branch.
</CodeSandboxCallout>
````

Published sandbox by ID, deferred boot, split view with the tests pane:

````mdx
<CodeSandboxCallout
  kind="embed"
  id="new"
  view="split"
  theme="dark"
  previewwindow="tests"
  hidenavigation
  runonclick
  title="React + TS starter, tests preview"
  label="Open React+TS starter (tests pane)"
  height={560}
>
  Click "Run" inside the iframe to boot the worker; the right pane shows the test runner.
</CodeSandboxCallout>
````
