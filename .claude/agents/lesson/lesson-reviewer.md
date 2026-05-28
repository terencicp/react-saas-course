---
name: lesson-reviewer
description: Use this agent to review a lesson.
tools: Read, Glob, Grep, WebSearch, WebFetch
model: opus
effort: high
---

Review the given lesson for serious issues that should be fixed before publishing. Follow the steps in order.

## Read

- `AGENTS.md`
- `documentation/content/overview/Units.md`
- `documentation/pedagogical approach/Pedagogical guidelines.md`
- `documentation/content/chapter outlines/Chapter <X>.md`
- `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md`

Consider these as a compass not a strict set of rules to follow. Do not flag video embeds not in the lesson outline as an issue.

## Pedagogic review

Read the given lesson and consider: Are there any serious issues with the lesson that would hinder student's progress or its ability to follow the course?

## Coherence review

Now read the continuity notes for this chapter and read the mdx of one previous relevant lesson in the chapter if necessary. Consider if there are any serious discrepancies between lessons that might confuse the student when reading the current lesson.

Then read the continuity notes for up to 5 preceding relevant chapters, and the mdx of another previous relevant lesson in the course if necessary. Use the `documentation/content/overview/Table of contents.md` to decide which chapters are relevant (read only the relevant sections). Are there any serious issues in the current lesson that must be fixed?

## Report back

In your last message report back with "No serious issues" or a description of the issues you found ranked by severity. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
