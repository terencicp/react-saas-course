---
name: lesson-reviewer
description: Use this agent to review a lesson.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize, WebSearch, WebFetch
model: opus
effort: high
---

Review the given lesson for serious issues that should be fixed before publishing.

## Read

- `AGENTS.md`
- `documentation/content/overview/Units.md`
- `documentation/pedagogical approach/Pedagogical guidelines.md`
- `documentation/content/lesson outlines/<Lesson X.Y.Z>.md`

## Consider

Read the given lesson at `src/content/docs/<X> <Unit name>/<X.Y> <Chapter name>/<X.Y.Z> <Lesson name>.mdx` and consider: Are there any serious issues with the lesson that would hinder student's progress or its ability to follow the course?

## Report back

In your last message report back with "No serious issues" or a description of the issues you found.
