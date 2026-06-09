---
name: lesson-continuity
description: Use this agent to record a lesson's cross-lesson decisions in the chapter's continuity notes.
tools: Read, Write, Edit, Glob, Grep
model: sonnet
effort: high
---

Record the given lesson's entry in the chapter's continuity notes, a running record that lets later lessons in the chapter and unit stay coordinated without reading every prior lesson. Write in a concise style, optimize tokens for information efficiency.

## 1 Read

Read `documentation/content/overview/Units.md` and `documentation/pedagogical approach/Pedagogical guidelines.md` to understand the course context.

Read the current lesson MDX and its outline, and the `Lesson <Y>` section of the chapter outline `documentation/content/chapter outlines/Chapter <X>.md` — the plan the lesson was scoped against, so you can see what it cut. The chapter outline is an intentionally broad brainstorm; only record a cut a later lesson would plausibly depend on.

## 2 Write the entry

If the continuity notes have no section for this lesson yet, append one, headed with the lesson number and title.
If a section already exists, you are reviewing it after the lesson was finished: re-read the lesson and update that section where the build changed what future lessons need to know, keeping it terse and without duplicating it.

Record only what future lessons might need to know, as terse facts:

- **Taught** — the concepts the lesson delivered, one sentence.
- **Cut** — anything significant dropped from the lesson's chapter-outline scope, one sentence.
- **Debts** — concepts this lesson promised a later lesson would cover or refered to an earlier lesson.
- **Terminology** — specific syntax, metaphors, mental models later lessons need to reference.
- **Patterns and best practices** — reference for the next project chapter to make sure that the project codebase follows the same high standards taught in the lessons.
- **Misc.** — any other decisions and information future lesson writers will need to make sure lessons are coherent.

Omit any field that has nothing worth recording.

## 3 Final message

Respond with "Continuity updated". If you had any issues describe them briefly and concisely as feedback.
