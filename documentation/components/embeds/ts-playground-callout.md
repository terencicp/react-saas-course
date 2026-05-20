# `TSPlaygroundCallout`

Collapsible callout that lazy-loads a TypeScript Playground snippet. Thin URL builder over [`SandboxCallout`](./sandbox-callout.md) — pass either a pre-computed share URL (cheapest, no extra script on the page) or a raw `code` + `flags` pair that's LZ-compressed in the browser on first open.

## Import

```ts
import TSPlaygroundCallout from '../../../../components/embeds/TSPlaygroundCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `url` | `string` | one of `url` or `code` | — | Pre-built Playground URL — already contains the `#code/<lz>` payload and any query params. The component hands it to `SandboxCallout` verbatim. |
| `code` | `string` | one of `url` or `code` | — | Raw TypeScript source. On first open the component loads `lz-string` from a CDN, compresses the source, and writes the resulting URL into the iframe `src`. |
| `flags` | `Record<string, string \| number \| boolean>` | no | `{}` | Compiler flags rendered as query params (e.g. `{ strict: true, target: 99 }`). Only meaningful with `code` — when you pass `url`, bake flags into the URL yourself. Enum-valued flags (`target`, `module`, `jsx`) take the numeric enum value. |
| `tsVersion` | `string` | no | — | TypeScript version override — e.g. `'5.7'`, `'next'` (nightly), `'dev'` (your local build). Adds `?ts=<value>`. Only meaningful with `code`. |
| `filetype` | `'ts' \| 'js' \| 'dts'` | no | — | Initial active tab. Only meaningful with `code`. |
| `title` | `string` | no | `'TypeScript Playground'` | `<iframe title>` — for accessibility, not shown. |
| `height` | `number` | no | `600` | Iframe height in pixels. |
| `label` | `string` | no | `'Open in TypeScript Playground'` | Bold text on the collapsed row. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label.

## Constraints & gotchas

- **Prefer pre-computed URLs.** The encode loop is three lines (`LZString.compressToEncodedURIComponent(code)`), and a pasted URL means no `lz-string` CDN round-trip on the lesson page. Reserve the `code` + `flags` mode for snippets you can't pre-compute at authoring time.
- **No runtime.** The Playground is type-check only — no `npm install`, no DOM, no fetch. The moment a lesson needs to run code, reach for `StackBlitzCallout` or `CodeSandboxCallout` instead.
- **Hash payload caps around browser URL limits** (~64 KB compressed, but most browsers choke before that). For very large snippets, host them as a Gist or a sandbox project and link out.

## Examples

Pre-computed URL — the common case:

````mdx
<TSPlaygroundCallout
  url="https://www.typescriptlang.org/play/?strict=true#code/PTAEBUHcHsGcBsCGsAWoCOBXApgJwJ4BcoADkgMbagBEIo9AegPzWiYB2AJnqIu6AEtu7AC4CAZgJ4jopAfwEjYoEfhLYAdACg64FFQAKSfAHNc0Dp1C5sXPMpH6VaqvPjyqgFAJSecdnIioOLQuKCw5Da2qNBK2qrqoADKIogimMoAvDRC8NisAD408NCInPImBTSwmOSUsLCV1HjmuNQA3Fpa4hwBAtAKsOB4ALbyiPAAFLDEyanpAJSgAN5a9DZpuPyZGVnU1bXY9QWF27vNIe1aAL6d5P2wgTbV8IFZAoMjY5PUxaXl1PMOnR6KBmFogA"
  title="Twoslash query — pin the type"
  label="Open twoslash example"
  height={500}
>
  The line `//    ^?` materializes the type of `result` inline.
</TSPlaygroundCallout>
````

Raw code + flags — for the rare snippet that's interpolated at build time:

````mdx
<TSPlaygroundCallout
  code={`function identity<T>(x: T): T { return x; }
const n = identity(42);
const s = identity("hi");`}
  flags={{ strict: true, target: 99 }}
  tsVersion="next"
  title="identity<T> on TS nightly"
  label="Open identity example"
  height={520}
>
  Compressed in the browser on first click — no pre-baked URL.
</TSPlaygroundCallout>
````
