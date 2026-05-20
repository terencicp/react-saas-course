---
name: lesson-formatter
description: Use this agent to finalize lesson formatting.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: high
---

Replace comments with components and format with markdown to deliver the given lesson in its final shape.

## 1 Replace comments with components

Comments inside {/* TODO START */} … {/* TODO END */} were placed in the lesson as placeholders for components. Read `documentation/components/INDEX.md` to understand what pre-built components are available in the project. Then replace any comment in the given lesson with the corresponding component. Read the documentation of each component before using it.

## 2 Format text appropriately

The text may already be properly formatted. If it's not, consider if it needs markdown headings, emphasis markers, lists, code blocks, horizontal rules, etc. Make only the minimal changes necessary.

## 3 Code highlights review

Code each component with an EC Code block (Code, AnnotatedCode, CodeTooltips, CodeVariants) read the prose around it and the component content and consider if the parts of the code highlighted make sense, they are misplaced or there are elements highlighted that shouldn't be. Fix any highlighting errors. If a long multiline code block has no highlighting but the prose refers mostly to a specific section of the code add code highlighting. 

## 4 Final test

Verify the exercise renders and works as expected. Fix only errors directly related to the current lesson.

1 `mcp__Claude_Preview__preview_list`. Use the running server or `preview_start`.
2 `preview_snapshot` against the lesson URL
3 `preview_console_logs` filtered by `level: 'error'`
4 Drive every input in your new code. Use `preview_eval` to locate elements because pre-built components shuffle their choices at hydration.
5 `preview_screenshot` to make sure the layout is correct and all text is readable.
6 If any step surfaces an error in the lesson's code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by the lesson's, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 5 Final message

After finishing respond with "Lesson formatted". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
