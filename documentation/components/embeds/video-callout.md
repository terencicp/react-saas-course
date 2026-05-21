# `VideoCallout`

Collapsible callout that lazy-loads a YouTube video in a 16:9 iframe. Renders as a single-line button with a red play badge, the label **Watch video**, and one-sentence framing; clicking expands the player below. The iframe `src` is only set the first time the callout is opened.

Uses `youtube-nocookie.com` (privacy-enhanced mode), so tracking is minimised before the user clicks play.

## Import

```ts
import VideoCallout from '../../../components/embeds/VideoCallout.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `videoId` | `string` | yes | — | YouTube video ID — the 11-character slug after `v=` in a watch URL (e.g. `dQw4w9WgXcQ`). **Not** the full URL. |
| `videoTitle` | `string` | yes | — | `<iframe title>` — for accessibility, not shown visually. |

The collapsed label (`Watch video` / `Hide video`) is hardcoded — no prop for it. The aspect ratio is fixed at 16:9 — no `height` prop.

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label: who made the video, what angle it covers, how long it runs. Markdown (inline code, links, bold) works. Paragraph margins are stripped, so write one short line.

## Constraints & gotchas

- Pass the **ID**, not a URL. `videoId="https://youtu.be/dQw4w9WgXcQ"` will silently produce a broken embed.
- Private / region-locked / "embedding disabled" videos will load a YouTube error inside the iframe — test once.
- The iframe is lazy: nothing is fetched from YouTube until the user clicks to expand. Safe to drop several on one page.

## Example

````mdx
<VideoCallout videoId="dQw4w9WgXcQ" videoTitle="Sample video">
  One-sentence framing — who made the video, what angle it covers, how long it runs.
</VideoCallout>
````
