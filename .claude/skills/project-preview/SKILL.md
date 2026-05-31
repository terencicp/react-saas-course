---
name: project-preview
description: Booting and inspecting a project chapter's Next.js solution in the browser preview.
---

# Project preview

## Boot the dev server

- `preview_start` runs a server named in `.claude/launch.json` and creates the file if it is missing (see the tool's own contract for the format). Add a config that boots the solution's dev server: `runtimeExecutable` `pnpm`, `runtimeArgs` `["dev"]`, on a port distinct from the Starlight site, which owns 4321 — e.g. 3000. The server runs from your working directory, the chapter's `solution/`.
- Confirm the server is actually ready before you assert anything: read `preview_logs` (level `error`) until the first compile finishes. First-compile latency is normal — a slow or blank first paint is not a failure.

## Control the render

- **Viewport** — `preview_resize` with `preset: "desktop"` (1280×800) or `"mobile"` (375×812), or an explicit `width`/`height`. The layout viewport is what trips responsive breakpoints, so set it deliberately; never assume the default width.
- **Theme** — `preview_resize` with `colorScheme: "light"` (or `"dark"`). Headless Chrome defaults to dark, and a `system`-default theme then renders dark — force the scheme you mean to inspect.
- **Dev badge** — Next's dev-tools badge (`nextjs-portal` / `[data-next-badge-root]`) bleeds into captures. Remove it with `preview_eval` before a screenshot, or set `devIndicators: false` and restart when you control the config.
- **Transient states** — to observe a loading or streaming state, slow the underlying delay (an env var the project reads, set in the launch config, beats racing the default timing) and assert within that window.

## Inspect

- Navigate with `preview_eval` (`window.location.href = '/<route>'`); confirm with a second `preview_eval` reading `location.pathname`.
- Evaluate a Rendered check by running its predicate expression through `preview_eval` — it returns the boolean directly.
- `preview_screenshot` returns an in-memory image for a visual look — no file output. To save screenshot **assets** to disk, follow the headless-Chrome capture flow in the `lesson-screenshots` skill pointed at this server's `localhost` URL.

## Gotchas

- The Starlight preview (`astro-dev`, port 4321) and a chapter's Next.js solution are different servers — start the right one, and reuse a running server rather than spawning duplicates.
- Don't guess routes — the app's own links are the source of truth.
- Reuse one booted server across repeated checks instead of rebooting per assertion.
