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
| `start` | `string \| number` | no | — | Start time, so the embed opens partway in. Accepts `"mm:ss"` / `"h:mm:ss"` (e.g. `"13:55"`) or a number of seconds. Omit to start at `0:00`. |

The collapsed label (`Watch video` / `Hide video`) is hardcoded — no prop for it. The aspect ratio is fixed at 16:9 — no `height` prop.

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label: who made the video, what angle it covers, how long it runs. Markdown (inline code, links, bold) works. Paragraph margins are stripped, so write one short line.

When you set `start`, the video no longer begins at `0:00` — say so in the message and tell the student which portion they are expected to watch (e.g. "the clip opens at 13:55; you only need the segment from there"). Otherwise they will assume the whole video is required and lose the context of why it jumped ahead.

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

To open partway in, pass `start` and frame the relevant portion in the message:

````mdx
<VideoCallout videoId="dQw4w9WgXcQ" videoTitle="Sample video" start="13:55">
  Who made it and what the relevant part shows — the clip opens at 13:55; you only need the segment from there.
</VideoCallout>
````
