---
name: lesson-reviewer
description: Use this agent to review a lesson.
tools: Read, Glob
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

Consider these as a compass not a strict set of rules to follow.

## Pedagogic review

Read the given lesson and consider: Are there any serious issues with the lesson that would hinder student's progress or its ability to follow the course?

## Coherence review

Now read the continuity notes for this chapter and read the mdx of up to 2 previous lessons if necessary. Consider if there are any serious discrepancies between lessons that might confuse the student.

Then read the continuity notes for the two preceding chapters, and the mdx of up to 2 previous relevant lessons in the course if necessary. Are there any serious issues that must be fixed?

## Report back

In your last message report back with "No serious issues" or a description of the issues you found ranked by severity.
