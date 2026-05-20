# `SandpackCallout`

Collapsible callout that lazy-loads an in-page **Sandpack** sandbox — the same `sandpack-react` engine that powers every editable example on [react.dev](https://react.dev). Unlike the other embeds in this folder, Sandpack does **not** take a URL: you pass `files`, `dependencies`, and `options` as props and Sandpack's iframe bundler compiles them at runtime.

Use this whenever you want an editable React/TS sandbox in a lesson and the matrix calls for the SDK-backed prefill path (see [Sandbox provider ranking](../../content/overview/Sandbox%20provider%20ranking.md)). For URL-prefilled CodeSandbox examples, use [`CodeSandboxCallout`](./codesandbox-callout.md) instead.

## Import

```ts
import SandpackCallout from '../../../../components/embeds/SandpackCallout.tsx';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

`SandpackCallout` is a React component — always mount it as a client island with one of the Astro hydration directives (`client:visible` is the right default; the heavy bundle load is deferred until the user clicks the callout open):

```mdx
<SandpackCallout client:visible … />
```

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `files` | `Record<string, string \| SandpackFileObject>` | yes | — | The sandbox file system, keyed by absolute path (e.g. `/App.tsx`). Pass a string for code-only, or an object `{ code, active, hidden, readOnly }` to pin a file as the open tab, hide it, or lock it. |
| `template` | `SandpackTemplate` | no | `'react-ts'` | One of `react`, `react-ts`, `vanilla`, `vanilla-ts`, `vue`, `svelte`, `solid`, `static`, `angular`, `nextjs`, `vite-react`, `vite-react-ts`, `test-ts`. Determines the default `package.json`, entry, and bundler. |
| `dependencies` | `Record<string, string>` | no | `undefined` | Extra deps merged into the sandbox's `package.json`. Sandpack's bundler installs them transparently inside the iframe (no `package.json` to edit in the course repo). |
| `entry` | `string` | no | template default | Custom entry file. Only set when the template default doesn't apply (e.g. when you switch to `environment: 'node'`). |
| `environment` | `'browser' \| 'node'` | no | template default | Switches the bundler from the browser-React preset to a Node container — use for Server Action-style demos. |
| `showConsole` | `boolean` | no | `false` | Adds the in-iframe console pane below the editor/preview. |
| `showFileExplorer` | `boolean` | no | `false` | Adds the file tree pane on the left. |
| `showTests` | `boolean` | no | `false` | Adds a Vitest-style test pane that picks up any `*.test.{ts,tsx}` / `*.spec.{ts,tsx}` file. |
| `options` | `Record<string, unknown>` | no | `undefined` | Pass-through to Sandpack's `options` — `showTabs`, `showLineNumbers`, `editorHeight`, `autorun`, `recompileMode`, `wrapContent`, `externalResources`, `visibleFiles`, etc. |
| `theme` | `'auto' \| 'light' \| 'dark' \| ThemeObject` | no | `'auto'` | `'auto'` tracks `prefers-color-scheme`; pass an object to fully override colors. |
| `label` | `string` | no | `'Open Sandpack'` | Bold text on the collapsed row. When expanded, becomes `Hide …` (the leading `Open ` is stripped). |
| `description` | `string` | no | `undefined` | Optional secondary line under the label. Plain text only — backticks and markup render literally. |

## Constraints & gotchas

- **Lazy by design.** Nothing is fetched until the user clicks. The first open triggers three ESM imports (`react@19`, `react-dom@19/client`, `sandpack-react`) from esm.sh, then mounts a separate React root inside the player. Subsequent toggles just hide/show the already-mounted tree.
- **One React per page.** The Sandpack tree lives in its own React 19 root, isolated from the host Astro island's bundled React. You can't pass JSX or shared context into it — only the props above.
- **Bundler timeouts.** The Sandpack version is pinned to one whose CodeSandbox-hosted bundler iframe (`https://<dashed-version>-sandpack.codesandbox.io/`) is actually deployed. Bumping the version in [`SandpackCallout.tsx`](../../../src/components/embeds/SandpackCallout.tsx) without verifying that endpoint will surface as `Couldn't connect to server / ERROR: TIME_OUT` inside the iframe.
- **Server Actions need `template="vanilla-ts"`.** The `environment: 'node'` branch only works on the `vanilla-*` templates — set `entry="/index.ts"` (or `.js`) and `showConsole` to read the output.

## Cross-origin isolation

The site is cross-origin isolated (`COOP: same-origin` + `COEP: credentialless` — see [`SandboxCallout` § Cross-origin isolation](./sandbox-callout.md#cross-origin-isolation)). Sandpack's runtime client creates its bundler iframe directly via `document.createElement('iframe')` without the `credentialless` attribute, which would normally get blocked with `net::ERR_BLOCKED_BY_RESPONSE`.

`SandpackCallout` patches `document.createElement` once per page so every iframe born after the first mount carries `credentialless` automatically. This is safe for same-origin iframes (the attribute is a no-op there) and necessary for Sandpack's cross-origin bundler URL. Any future iframe-rendering component on the page inherits the patch for free; if you ever need a *non-*credentialless iframe, set the attribute back to `false` explicitly after creating it.

## Example

````mdx
<SandpackCallout
  client:visible
  template="react-ts"
  label="Open counter sandbox"
  description="React 19 minimal counter — default react-ts template."
  files={{
    '/App.tsx': `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
`,
  }}
  options={{ showTabs: false, editorHeight: 280 }}
/>
````

With a custom dependency, multi-file project, and active tab:

````mdx
<SandpackCallout
  client:visible
  template="react-ts"
  label="Open RHF sandbox"
  description="React Hook Form installed via customSetup.dependencies."
  dependencies={{ 'react-hook-form': '^7.55.0' }}
  files={{
    '/App.tsx': { code: '…', active: true },
    '/schema.ts': { code: '…', readOnly: true },
  }}
  options={{ showLineNumbers: true, editorHeight: 360 }}
/>
````

A walkthrough of every prop shape lives at [`0 Demos/sandboxes/06-react-sandpack`](../../../src/content/docs/0%20Demos/sandboxes/06-react-sandpack.mdx).
