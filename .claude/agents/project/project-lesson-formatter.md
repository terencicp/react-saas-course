---
name: project-lesson-formatter
description: Use this agent to finalize the formatting of a project lesson MDX.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: sonnet
effort: high
---

Replace comments with components and format with markdown to deliver the given project lesson in its final shape.

## Understand the lesson's context

Read `AGENTS.md` and the lesson's outline at `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md`.

## 1 Locate components to replace

Content inside `{/* TODO START */} … {/* TODO END */}` was placed in the lesson as placeholders for components. Read the lesson and find all comments that need replacement.

## 2 Replace comments with components

Read `documentation/components/INDEX.md` to know what pre-built components are available. Replace each comment with the corresponding component. Read the documentation of each component before using it, including built-in Starlight components.

Project lessons mostly lean on `Code` blocks, `FileTree` for starter tours, `CodeVariants` for before/after, and `LinkCard` for end-of-lesson resources. Use collapsible sections on long code blocks to hide structural skeleton that isn't load-bearing. If a block already has highlights, confirm they point at the lines the surrounding prose discusses; fix any drift. If a long block has no highlights but the prose calls out a specific region, add highlights.

## 3 Format text appropriately

The text may already be properly formatted. If it's not, consider whether it needs markdown headings, emphasis markers, lists, code blocks, horizontal rules. Make only the minimal changes necessary.

## 4 Update frontmatter

Change the frontmatter `status:` from `draft` to `formatted`.

## 5 Final test

Verify the lesson renders and works as expected. Fix only errors directly related to the current lesson.

1 `mcp__Claude_Preview__preview_list`. Use the running server or `preview_start`.
2 `preview_snapshot` against the lesson URL
3 `preview_console_logs` filtered by `level: 'error'`
4 `preview_screenshot` to confirm the layout is correct and all text is readable.
5 If any step surfaces an error in the lesson's code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by the lesson, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 6 Final message

After finishing respond with "Lesson formatted". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
