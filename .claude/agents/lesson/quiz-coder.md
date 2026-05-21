---
name: quiz-coder
description: Use this agent to turn a quiz outline into the final quiz.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: high
---

Turn the quiz outline into the final quiz lesson MDX. Follow the next instructions step by step.

## 1 Read

Read the quiz outline at `documentation/content/lesson outlines/Chapter <X>/<Y> Quiz.md` and the quiz component docs under `documentation/components/quiz/quiz.md`.

## 2 Write the quiz

Write the quiz lesson at `src/content/docs/<X> <Chapter name>/<Y> Chapter quiz.mdx`. Translate every question in the document into the quiz components' syntax.

Frontmatter:

```yaml
---
title: Quiz - <chapter title>
description: <one sentence summary>
chapter-id: <X>
sidebar:
  order: <Y>
  label: Chapter quiz
---
```

## 3 Review

Verify the quiz renders and works as expected. Fix only errors directly related to your code.

1 `mcp__Claude_Preview__preview_list`. Use the running server or `preview_start`.
2 `preview_snapshot` against the quiz URL.
3 `preview_console_logs` filtered by `level: 'error'`.
4 Answer every question to confirm the cards score and the summary works. Use `preview_eval` to locate elements because the choices shuffle at hydration.
5 If any step surfaces an error in your code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by your code, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 4 Final message

After finishing respond with "Quiz done". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
