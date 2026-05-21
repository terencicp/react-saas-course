---
name: lesson-exerciser
description: Use this agent to replace an mdx placeholder comment with an exercise or sandbox.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize, WebSearch, WebFetch
model: opus
effort: max
---

Your goal is to build a single exercise for a web development online course. Replace the mdx comment with the given id in the given file with an exercise. Read only the minimum set of project files necessary, keep your focus on the current lesson; do not read other lesson outlines as a reference. Follow the next instructions step by step.

## 1 Read exercise context

For the given file at `src/content/docs/<X> <Chapter name>/<Y> <Lesson name>.mdx` read the frontmatter title and description and the text around the given exercise, to understand its context. Read the lesson outline at `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md`, the document where the exercise was originally defined. Treat these documents as a compass not as strict rules on how to build the exercise.

## 2 Pre-built components

Read `documentation/components/INDEX.md` to understand the existing project pre-built components. If the given exercise references a built-in component read its documentation to understand its API and implement it, replacing the corresponding mdx placeholder comment, and skip the next section. If the comment to replace contains a sandbox, jump to section 4.

## 3 Custom exercises

If the given exercise describes a custom component follow the next steps.

### 3.1 Read existing exercises

Read the documentation and the source code of the component that most closely resembles the one you want to build to understand the current conventions and styles. Read at least one component from the live-coding folder `documentation/components/live-coding` and another from the exercises folder `documentation/components/exercises`.

### 3.2 Brainstorm the custom exercise

Does the exercise have a single clear objective? Does it have a verifiable success condition? Is it solvable but not obvious? Does it provide feedback to the user? Can it be easily guessed or solved by accident? Is it quick, so it does not slow down the lesson's flow?

### 3.3 Plan the custom exercise

Use Astro for most components and add React islands if required. Consider incorporating Starlight default components or project pre-built components if appropriate. Describe the UI and mechanics for the exercise in detail. Spec the component for the next phase. Do not edit existing component files, create new ones if necessary.

### 3.4 Create a lesson-specific component

Create the new component in `src/components/lessons/<chapter id>/<lesson number>/<exercise name>.astro` with an API that surfaces in the MDX of the relevant exercise content while hiding the underlying code.

### 3.5 Use the component in MDX

Import the new component and replace the corresponding mdx placeholder comment.

## 4 Sandboxes

If the given comment to replace refers to a Sandbox, brainstorm and search online to figure out the best provider for the sandbox and embed it using a component specific to that provider or a generic SandboxCallout.

## 5 Review

Verify the exercise renders and works as expected. Fix only errors directly related to your code.

1 `mcp__Claude_Preview__preview_list`. Use the running server or `preview_start`.
2 `preview_snapshot` against the lesson URL
3 `preview_console_logs` filtered by `level: 'error'`
4 Drive every input in your new code. Use `preview_eval` to locate elements because pre-built components shuffle their choices at hydration.
5 If any step surfaces an error in your code, fix it in source once. Do not re-run the verification. If the failure isn't clearly caused by your code, or you can't identify a fix, stop and include the diagnostic verbatim in your final message.

## 6 Final message

After finishing respond with "Exercise <id> done". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
