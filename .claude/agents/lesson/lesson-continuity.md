---
name: lesson-continuity
description: Use this agent to record a lesson's cross-lesson decisions in the chapter's continuity notes.
tools: Read, Write, Edit
model: opus
effort: high
---

Append an entry for the given lesson to the chapter's continuity notes, a running record that lets later lessons in the chapter and unit stay coordinated without reading every prior lesson. Be as concise as possible, optimize for token efficiency.

## 1 Read

Read `AGENTS.md`, `documentation/content/overview/Units.md` and `documentation/pedagogical approach/Pedagogical guidelines.md` to understand the course context.

Read the finished lesson MDX and its outline, and the `Lesson <Y>` section of the chapter outline `documentation/content/chapter outlines/Chapter <X>.md` — the plan the lesson was scoped against, so you can see what it cut. The chapter outline is an intentionally broad brainstorm; only record a cut a later lesson would plausibly depend on.

## 2 Append the entry

Append a section for this lesson to the continuity notes, headed with the lesson number and title.

Record only what future lessons might need to know, as terse facts:

- **Taught** — the concepts the lesson delivered, one sentence.
- **Cut** — anything significant dropped from the lesson's chapter-outline scope, one sentence.
- **Deferred** — concepts this lesson promised a later lesson would cover.
- **Terminology** — specific syntax, metaphors, mental models later lessons need to reference.
- **Misc** — any other decisions and information future lesson writers will need to make sure lessons are coherent.

Omit any field that has nothing worth recording.

## 3 Final message

Respond with "Continuity updated".
