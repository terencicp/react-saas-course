# `Screenshot`

Fixed-shape, internally-scrolling frame for embedding UI screenshots in lesson MDX. Renders a bordered, rounded card with the chosen viewport width; tall captures scroll vertically inside the frame instead of stretching the lesson page. Pair with `<Figure>` when you need a caption.

## Import

```ts
import Screenshot from '../../../components/figures/screenshot/Screenshot.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `viewport` | `'desktop' \| 'mobile'` | yes | — | Selects the frame shape. `desktop` fills the available width; `mobile` is capped at `320px` to evoke a phone-width capture. Also sets the `aria-label` (`"<viewport> screenshot"`). |

## Slots

- **default** — the screenshot body. Typically a single `<img>`, but any HTML works (`<picture>`, inline `<svg>`, etc.). Images, pictures, and SVGs inside are auto-stretched to the frame width via a scoped global rule; supply a tall asset and let the frame scroll.

## Constraints & gotchas

- The inner scroll container caps at `min(70vh, 520px)`. Captures taller than that scroll vertically — there is no horizontal scroll, so size your image to the frame width.
- Always provide a descriptive `alt` on the inner `<img>`. The wrapper exposes a generic `"<viewport> screenshot"` `aria-label` for the outer `role="img"`, which is not a substitute for the image's own alt text.
- Store captures under `public/screenshots/<chapter-id>/` and reference them with an absolute path (e.g. `/screenshots/035/desktop-kickoff.png`) so the import works from any lesson depth.
- No built-in caption. Wrap in `<Figure caption="…">` (or use the `caption` slot) when the screenshot needs one.
- The component is not `expandable` on its own. If you want the lightbox affordance, wrap it in `<Figure>` — but check that the captured image still reads at lightbox size before doing so.

## Example

Bare screenshot:

````mdx
<Screenshot viewport="desktop">
  <img
    src="/screenshots/035/desktop-kickoff.png"
    alt="Desktop capture of the Kickoff lesson — sidebar, lesson body, and pagination footer rendered at 1280px width."
  />
</Screenshot>
````

Mobile-width capture with a caption via `<Figure>`:

````mdx
<Figure caption="The same lesson at mobile width — the sidebar collapses behind the hamburger menu.">
  <Screenshot viewport="mobile">
    <img
      src="/screenshots/035/mobile-kickoff.png"
      alt="Mobile capture of the Kickoff lesson at 375px width, sidebar collapsed."
    />
  </Screenshot>
</Figure>
````
