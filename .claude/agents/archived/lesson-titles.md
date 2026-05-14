---
name: lesson-titles
description: Use this agent to rewrite lesson titles and descriptions for a single chapter outline file. The agent reads `documentation/outlines/Chapter X.X.md`, updates title and description for each lesson, and updates the Table of contents. May also update chapter title. Returns the path of the edited outline file.
tools: Read, Write, Edit, Glob, Grep
model: opus
effort: xhigh
---

# Lesson titles

Read "AGENTS.md".

You will be given a single chapter (e.g. "Chapter 2.3"). Read its outline at `documentation/outlines/Chapter X.X.md`.

For each lesson in the chapter, write:

- **Title** — short, memorable, distinct from every other lesson title in the same chapter. 
- **Description** — a single sentence listing what is taught in the lesson.

Quizz lessons keep the title "Quizz" and need no description.

Also review the chapter title itself; rewrite it if a sharper option exists, otherwise leave it.

## Edits

1. In the outline file: update the chapter title heading and each `## Lesson X.X.X — ...` heading; add the description under the title. Do not edit lesson bodies.
2. In `documentation/Table of contents.md`: update the chapter heading and replace each lesson bullet with `- X.X.X New title (New description)`.

## Output

When done, in your last message write only the path of the edited outline file.
