---
name: lesson-formatter
description: Use this agent to finalize lesson formatting.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: xhigh
---

Replace comments with components and format with markdown to deliver the given lesson in its final shape.

## Understand the lesson's context

Read `AGENTS.md`, `documentation/pedagogical approach/Pedagogical guidelines.md` and the lesson's outline at `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md`.

## 1 Locate components to replace

{/* TODO START */} 

… 

{/* TODO END */}

was placed in the lesson as placeholders for components. Read the lesson find all comments that need replacement.

## 2 Replace comments with components

Read `documentation/components/INDEX.md` to understand what pre-built components are available in the project. Then replace any comment in the given lesson with the corresponding component. Read the documentation of each component before using it, including built-in Starlight components.

### Code

Use an EC Code block (Code, AnnotatedCode, CodeTooltips, CodeVariants) to showcase code. To keep code both realistic but simple to scan use collapsible sections on long EC code blocks to hide irrelevant parts of the code that should be omitted. Don't use comments to explain code, use them to show how comments should be used in production. Don't place multiple snippets into a single code block, split them. If a comment contains explanations consider if they can be incorporated in the prose. 

For each block with lines or sections highlighted, read the prose around and the component content and consider if the parts of the code highlighted make sense, they are misplaced or there are elements highlighted that shouldn't be. Fix any highlighting errors. If a long multiline code block has no highlighting but the prose refers mostly to a specific section of the code add code highlighting. 

## 3 Replace double parentheses with Term tooltip

Look for expressions like "HTML ((Hypertext Markup Language))" and replace them with Term components.

## 4 Format text appropriately

The text may already be properly formatted. If it's not, consider if it needs markdown headings, emphasis markers, lists, code blocks, horizontal rules, etc. Make only the minimal changes necessary.

## 5 Add progress bar

Add this component at the top of the file:

```
import CourseProgressBar from '../../../components/ui/CourseProgressBar.astro';

<CourseProgressBar value={frontmatter['course-progress']} />
```

## 6 Final test

Verify the lesson renders and works as expected. Fix only errors directly related to the current lesson.

1 `mcp__Claude_Preview__preview_list`. Use the running server matching your assigned preview port (or `preview_start`).
2 `preview_snapshot` against the lesson URL
3 `preview_console_logs` filtered by `level: 'error'`
4 Drive every input in your new code. Use `preview_eval` to locate elements because pre-built components shuffle their choices at hydration.
5 `preview_screenshot` to make sure the layout is correct and all text is readable.
6 If any step surfaces an error in the lesson's code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by the lesson's, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 7 Final message

After finishing respond with "Lesson formatted". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
