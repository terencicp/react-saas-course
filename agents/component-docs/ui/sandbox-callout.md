# `SandboxCallout`

Collapsible callout that lazy-loads an external code sandbox in an iframe. Renders as a single-line button with a badge, label, and one-sentence framing; clicking expands the iframe below. The iframe `src` is only set the first time the callout is opened, so closed callouts cost nothing.

## Import

```ts
import SandboxCallout from '../../../../components/ui/SandboxCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `url` | `string` | yes | — | URL loaded into the iframe when the callout is first opened. For sandboxes that accept code in the URL (TS Playground, Tailwind Play, StackBlitz embed links), paste a share link to prefill an example. |
| `title` | `string` | yes | — | `<iframe title>` — for accessibility, not shown visually. |
| `height` | `number` | no | `560` | Iframe height in pixels. Bump it for sandboxes with tall layouts (Tailwind Play, StackBlitz ≈ `640`). |
| `label` | `string` | no | `'Open sandbox'` | Bold text on the collapsed row. The close-state label is derived by stripping the leading `Open ` and prepending `Hide ` — e.g. `'Open Tailwind sandbox'` → `'Hide Tailwind sandbox'`. Keep the `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label. Markdown (inline code, links, bold) works. Paragraph margins are stripped, so write one short line; multi-paragraph content will look wrong.

## Constraints & gotchas

- The iframe is lazy: it has no `src` until the first open. Don't rely on it preloading.
- Some hosts refuse to be framed (`X-Frame-Options`); test the URL once before shipping the lesson.
- For StackBlitz, use the explicit embed URL form (`?embed=1&file=…&view=editor`) — the bare project URL renders the full StackBlitz chrome inside the iframe.
- Use `Open …` as the label prefix or the auto-derived close-label reads oddly (`Hide React sandbox` is fine; `Hide Launch the editor` is not).

## Example

Three sandboxes — default label, custom label + taller iframe, and a StackBlitz embed URL:

````mdx
<SandboxCallout
  url="https://www.typescriptlang.org/play/"
  title="TypeScript Playground"
>
  Mess with `satisfies`, branded types, or any other type-system move in the real TS compiler.
</SandboxCallout>

<SandboxCallout
  url="https://play.tailwindcss.com/"
  title="Tailwind Play"
  label="Open Tailwind sandbox"
  height={640}
>
  Try utility composition, state variants, and Tailwind v4's `@theme` / `@utility` directives.
</SandboxCallout>

<SandboxCallout
  url="https://stackblitz.com/edit/vitejs-vite-react-ts?embed=1&file=src/App.tsx&view=editor"
  title="StackBlitz — Vite + React + TS"
  label="Open React sandbox"
  height={640}
>
  Fork a Vite + React + TS scratchpad — full toolchain, instant hot reload, no setup.
</SandboxCallout>
````
