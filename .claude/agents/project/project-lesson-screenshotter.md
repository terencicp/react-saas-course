---
name: project-lesson-screenshotter
description: Use this agent to capture and embed a project lesson's UI screenshot figure, before the formatter.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: high
---

Capture and embed the UI screenshot figure for the given project lesson MDX, so the formatter that runs after you finds the figure already in place. You are given the lesson MDX path. The screenshot figure is the only thing you own — leave every other placeholder comment untouched for the formatter.

Your working directory is the chapter's `solution/`, but the lesson MDX and the Starlight site live at the repo root — use absolute paths for the lesson file and for `Glob`/`Grep`, don't rely on the working directory.

## 1 Locate the screenshot placeholder

Read `AGENTS.md`. Read the lesson MDX, note its `chapter-id` and lesson number (from the frontmatter), and find the screenshot-figure placeholder comment.

## 2 Decide the viewports

Read the `lesson-screenshots` skill and pick viewports by what the lesson teaches:

- **UI-focused** lesson (layout, components, responsive, theming) → **desktop + mobile**, as one `TabbedContent` with a tab per viewport, each holding a `Screenshot`. Never stacked blocks.
- **Not about the UI** but still worth showing → a **single desktop** `Screenshot`.
- **No UI** → no screenshot. Leave the writer's one-paragraph description in place and skip to the final message.

## 3 Reuse the pool, else capture

Check the existing screenshot pool in `public/screenshots/<chapter-id>/` — read its `manifest.md` and find the rows for **this lesson**. If one of the assets in the manifest matches the requirements, **reuse it**.

Capture — following the `lesson-screenshots` skill (headless Chrome at 2× DPR, saved under `public/screenshots/<chapter-id>/`). The figure shows the finished surface the lesson builds, so capture it against the running app.

## 4 Embed

Replace the placeholder comment with the component(s): add the `Screenshot` import (plus `TabbedContent`/`TabbedItem` for a multi-viewport set), reference each asset as `/screenshots/<chapter-id>/<name>.png`, and give every inner `<img>` descriptive `alt`. Read `documentation/components/figures/screenshot.md` before using the component.

Always replace multiple screenshots in succession by TabbedContent, whith one screenshot per tab.

## 5 Verify

Confirm the figure renders: `preview_list` (use the running server or `preview_start`), navigate to the lesson, `preview_inspect` the `.screenshot-scroll img` to confirm it is width-bounded, then `preview_screenshot` for a visual sanity check. Fix only issues with the figure you placed.

## 6 Final message

Respond with "Screenshots embedded" (or "No screenshot needed" when the lesson has no UI figure). If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
