# `SandboxCallout`

Collapsible callout that lazy-loads an external code sandbox in an iframe.

For StackBlitz embeds specifically, prefer [`StackBlitzCallout`](./stackblitz-callout.md) — it builds the URL for you and handles both GitHub-loader and project-ID modes.

## Import

```ts
import SandboxCallout from '../../../../components/embeds/SandboxCallout.astro';
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

## Cross-origin isolation

The whole site sends `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` (see [astro.config.mjs](../../../astro.config.mjs) and [public/_headers](../../../public/_headers)) so that StackBlitz's WebContainer can boot inside an embedded iframe. To keep third-party iframes loading under that policy, `SandboxCallout`'s `<iframe>` carries the `credentialless` attribute and `allow="cross-origin-isolated; clipboard-read; clipboard-write"`.

Two consequences:

- **Embedded sites load without credentials** — users won't be signed into StackBlitz, etc. inside the embed. For a course site that's fine; if you need an authenticated embed, open in a new tab instead.
- **Invariant for new iframe-rendering components** — anything that renders a cross-origin `<iframe>` directly (instead of delegating to `SandboxCallout`) **must** include the `credentialless` attribute, or the iframe will be blocked. Components that go through `SandboxCallout` inherit it for free.

## Example

````mdx
<SandboxCallout
  url="https://play.tailwindcss.com/3O4t3M40iF"
  title="Tailwind play — utility quickstart"
  label="Open Tailwind sandbox"
  height={520}
>
  Prefilled with the utility set the lesson walks through.
</SandboxCallout>
````

## Verified providers

Works well with:

- try.playwright.tech
