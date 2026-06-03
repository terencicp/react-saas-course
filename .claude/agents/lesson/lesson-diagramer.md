---
name: lesson-diagramer
description: Use this agent to replace an mdx placeholder comment with a diagram.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: max
---

Your goal is to build a single diagram for a web development online course. Replace the mdx comment in the given file with the given id with a proper diagram. Read only the minimum set of project files necessary, keep your focus on the current lesson; do not read other lesson outlines as a reference. Follow the next instructions step by step.

## 1 Read diagram context

For the given file at `src/content/docs/<X> <Chapter name>/<Y> <Lesson name>.mdx` read the frontmatter title and description and the text around the given diagram, to understand its context. Read the lesson outline at `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md`, the document where the diagram was originally defined. Treat these documents as a compass not as strict rules on how to build the diagram.

## 2 Read documentation

Read `documentation/diagrams/INDEX.md` to understand the diagram engines available in the project and when to use each. Read the Figures section of `documentation/components/INDEX.md` to understand the pre-built components; if a pre-built component fits the diagram shape, read its documentation.

## 3 Brainstorm

Consider 2–3 candidate compositions and pick the one that showcases the concepts better. Consider feasibility and cognitive load: very complex diagrams will have more points of failure and will be harder to read, keep diagrams simple unless complexity is the lesson. Consider what is the goal of the diagram. 

## 4 Plan diagram

Decide which component / engine you will use, considering the pros and cons of each option. Decide on what will the specific visual elements that the diagram will contain and what is the best way to lay them out given the chosen engine.  Do not edit existing component files, create new ones if necessary.

Consider if it is necessary to include a caption describing the diagram step by step, or the surrounding prose already does this job.

## 5 Write diagram

Replace the placeholder comment with the diagram. For diagrams that would be lengthy inline (custom SVG, HTML/CSS, ArrowDiagram), write a custom Astro component to `src/components/lessons/<chapter id>/<lesson number>/<diagram name>.astro` and import it.

## 6 Review

Verify the diagram renders and works as expected. Fix only errors directly related to your code.

1 `mcp__Claude_Preview__preview_list`. Use the running server matching your assigned preview port (or `preview_start`).
2 `preview_snapshot` against the lesson URL
3 `preview_console_logs` filtered by `level: 'error'`
4 If the diagram is interactive drive every input in your new code. Use `preview_eval` to locate elements because pre-built components shuffle their choices at hydration.
5 `preview_screenshot` to make sure the layout is correct and all text is readable.
6 If any step surfaces an error in your code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by your code, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 7 Final message

After finishing respond with "Diagram <id or description> done". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
