---
name: lesson-screenshots
description: Capturing and embedding UI screenshots in lesson MDX.
---

# Lesson screenshots

## Which viewports

- **UI-focused lesson** (layout, components, responsive, theming) → **desktop + mobile**.
- **Lesson not about the UI, but a screenshot still helps** → **desktop only**.
- **No UI to show** → **no screenshot** (a one-paragraph description stands in).

Never capture tablet.

## Component

Always wrap the `<img>` in [`Screenshot`](../../../src/components/figures/screenshot/Screenshot.astro). It's a fixed-shape frame (max-height ~520px) with internal scroll — so tall full-page captures are the expected payload.

```mdx
import Screenshot from '../../../components/figures/screenshot/Screenshot.astro';

<Screenshot viewport="desktop">
  <img src="/screenshots/<chapter-id>/<name>.png" alt="…" />
</Screenshot>
```

`viewport` is `'desktop' | 'mobile'`. Mobile narrows the frame to a phone-sized 320px centered column; desktop fills the lesson column.

For a multi-viewport set (the same surface at desktop and mobile), wrap the per-viewport `<Screenshot>`s in `<TabbedContent syncKey="…">` + `<TabbedItem label="Desktop · 1280">`. The project overview lesson's *What we're building* figure is the canonical pattern.

## Files

- Save under `public/screenshots/<chapter-id>/<name>.png`. The chapter id is the lesson's frontmatter `chapter-id` (e.g. `028`). For demo/sandbox lessons use the folder's numeric prefix.
- Kebab-case names. Multi-viewport sets: `desktop-1280.png`, `mobile-360.png`. Append a state suffix for variants: `mobile-360-drawer-open.png`.
- Reference from MDX as `/screenshots/<chapter-id>/<name>.png` (Astro serves `public/` from `/`).

## Capture workflow

The MCP `mcp__Claude_Preview__preview_screenshot` tool returns an in-memory JPEG — it has **no `fullPage` option and does not save to disk**. Use it for verification only. For capturing assets, drive headless Chrome from Bash.

1. `preview_start` with name `astro-dev` — reuses the running server (returns `serverId`, port 4321).
2. `preview_eval` → `window.location.href = '/<lesson-slug>/'`. The next `preview_eval` call will return `"Inspected target navigated or closed"` — that's expected; call it again to confirm `window.location.pathname`.
3. `preview_resize` to the target viewport. Standard widths: **1280** (desktop), **360** (mobile). Pass an arbitrary `height` (e.g. 800 / 740) — it doesn't constrain the capture.
4. `preview_eval` → read `document.documentElement.scrollHeight`. Hold this number.
5. (Optional) Hide the Astro dev toolbar so it doesn't bleed into the bottom of the capture: `preview_eval` → `document.querySelector('astro-dev-toolbar')?.remove()`.
6. Run headless Chrome via Bash, sizing the window to `WIDTH × scrollHeight`:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --headless --disable-gpu \
     --window-size=1280,SCROLL_HEIGHT \
     --force-device-scale-factor=2 \
     --screenshot=public/screenshots/<chapter-id>/desktop-1280.png \
     http://localhost:4321/<lesson-slug>/
   ```
   The output PNG is `2 × WIDTH × scrollHeight` (2× DPR — Retina-quality).
7. Edit the lesson MDX: add the `Screenshot` import, wrap each `<img>` in `<Screenshot viewport="…">`.
8. Verify in the browser: `preview_eval` to navigate to the lesson, `preview_inspect` on `.screenshot-scroll img` to confirm `width: 100%` and a bounded `height`, then `preview_screenshot` for a visual sanity check.

## Gotchas

- **`preview_screenshot` is verification-only.** No file output, no fullPage. For assets, always go through headless Chrome.
- **Starlight folder slugs with a trailing dash double up.** A folder named `Demo- Foo` becomes `/demo--foo/` in the URL, not `/demo-foo/`. Don't guess the slug — fetch `/` and grep the `<a href>`s.
- **Window size = scrollHeight, not viewport height.** Headless Chrome's `--window-size` height controls how much it captures. Read `document.documentElement.scrollHeight` *after* the page has finished rendering at the target width.
- **Don't put screenshots in `src/assets/`.** They must be in `public/` to be served at `/screenshots/...`.
- **Always include `alt` text.** Required by the project's accessibility baseline.
