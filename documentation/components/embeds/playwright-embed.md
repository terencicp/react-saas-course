# `PlaywrightEmbed`

Iframe wrapper for [`trace.playwright.dev`](https://trace.playwright.dev/) — the official, fully client-side build of the Playwright trace inspector. The whole API is the URL: pass a public `trace.zip` URL and the viewer fetches it in the browser, no upload, no auth, no SDK.

Two render modes: collapsible (default — thin URL builder over [`SandboxCallout`](./sandbox-callout.md)) or plain inline iframe (`expandable={false}`) for when the trace *is* the lesson content.

## Import

```ts
import PlaywrightEmbed from '../../../../components/embeds/PlaywrightEmbed.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `zipUrl` | `string` | one of `zipUrl` or `zipUrls` | — | Absolute URL to a public `trace.zip`. Must serve the binary with `Access-Control-Allow-Origin: *` — the viewer fetches it from the `trace.playwright.dev` origin. |
| `zipUrls` | `string[]` | one of `zipUrl` or `zipUrls` | — | Multiple trace URLs for compare/layer mode (`?trace=…&trace=…`). Overrides `zipUrl`. |
| `expandable` | `boolean` | no | `true` | `true` → wraps the iframe in the collapsible `SandboxCallout` button; `false` → plain inline iframe that loads with the page. |
| `title` | `string` | no | `'Playwright Trace Viewer'` | `<iframe title>` — for accessibility, not shown. |
| `height` | `number` | no | `640` | Iframe height in pixels. |
| `label` | `string` | no | `'Open in Trace Viewer'` | Bold text on the collapsed row. Only used when `expandable` is `true`. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

When `expandable` is `true`, the default slot is the **message** rendered next to the label — one sentence of framing. Ignored when `expandable={false}`.

## Constraints & gotchas

- **CORS is mandatory.** The zip is fetched from the `trace.playwright.dev` origin, so the host must respond with `Access-Control-Allow-Origin: *` (or the docs origin). GitHub Actions artifact URLs do *not* qualify — mirror the zip to R2/S3 or host the static Playwright HTML report, then point `zipUrl` at the public URL.
- **No prefill of the test source.** The viewer reads only what's in the zip. Page-object code, helpers, and fixtures must already be captured in the trace recorder's stack frames at record time.
- **`expandable={false}` boots immediately.** Use only when the trace anchors the lesson; otherwise prefer the default collapsible mode so the iframe doesn't auto-fetch on page load.

## Examples

Collapsible (default) — for an optional reference trace the reader opens on demand:

````mdx
<PlaywrightEmbed
  zipUrl="https://demo.playwright.dev/reports/todomvc/data/e6099cadf79aa753d5500aa9508f9d1dbd87b5ee.zip"
  title="TodoMVC failing run"
  label="Open prefilled TodoMVC trace"
  height={640}
>
  A real Playwright run from the official TodoMVC sample report.
</PlaywrightEmbed>
````

Inline (`expandable={false}`) — when the trace *is* the lesson surface and the prose anchors back to it:

````mdx
<PlaywrightEmbed
  zipUrl="https://demo.playwright.dev/reports/todomvc/data/e6099cadf79aa753d5500aa9508f9d1dbd87b5ee.zip"
  title="Trace viewer — TodoMVC sample (auto-loaded)"
  height={680}
  expandable={false}
/>
````

Compare two runs (e.g. green baseline vs failing retry):

````mdx
<PlaywrightEmbed
  zipUrls={[
    'https://traces.example.com/runs/123/baseline.zip',
    'https://traces.example.com/runs/123/retry1.zip',
  ]}
  title="Checkout flow — baseline vs retry"
  label="Open compare view"
  height={700}
/>
````
