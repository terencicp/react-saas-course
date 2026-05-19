# `SandboxCallout`

Collapsible callout that lazy-loads an external code sandbox in an iframe.

## Import

```ts
import SandboxCallout from '../../../../components/ui/SandboxCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `url` | `string` | yes | — | loaded into the iframe when the callout is first opened. For sandboxes that accept code in the URL paste a share link to prefill an example. |
| `title` | `string` | yes | — | `<iframe title>` — for accessibility, not shown. |
| `height` | `number` | no | `560` | Iframe height in pixels. Bump it for sandboxes with tall layouts. |
| `label` | `string` | no | `'Open sandbox'` | Bold text on the collapsed row. The close-state label is derived by stripping the leading `Open ` and prepending `Hide ` — e.g. `'Open Tailwind sandbox'` → `'Hide Tailwind sandbox'`. Keep the `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label. Write one short line.

## Constraints & gotchas

- The iframe is lazy: it has no `src` until the first open. Don't rely on it preloading.
- Some hosts refuse to be framed (`X-Frame-Options`); test the URL once before shipping the lesson.

## Verified examples

###
