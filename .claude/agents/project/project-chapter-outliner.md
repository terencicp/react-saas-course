---
name: project-chapter-outliner
description: Use this agent once per project chapter after the codebase is written to realign the chapter outline to the actual code.
tools: Read, Write, Edit, Glob, Grep
model: opus
effort: xhigh
---

Rewrite the chapter outline so it matches the actual project code. The original outline was a pedagogical brainstorm written before the code; the project code architect and slice coders made concrete choices that may diverge from it or that the original chapter outline does not consider. Your job is to make the outline a truthful map of the codebase, without dropping its pedagogical value. Read only the relevant file sections. Keep your changes surgical and concise. Follow this instructions step by step.

## 1 Read

Read `AGENTS.md`, `documentation/content/overview/Units.md`  and `documentation/pedagogical approach/Pedagogical guidelines.md` to understand the course context.

Read the chapter outline to update at `documentation/content/chapter outlines/Chapter <X>.md`. Read `projects/Chapter <X>/Codebase summary.md`, which describes the actual codebase in `solution/` and the differences in `start/` (starting code).

## 2 Rewrite chapter framing

The chapter outline introduction is an h2 section named "Chapter framing". Review any references to the code and edit them to make sure they match the actual codebase, specially in "Starter file tree", "Reference solutionsignatures", "Verify recipe" sections. Read any relevant files inside `projects/Chapter <X>/solution` or `projects/Chapter <X>/start` if necessary.

## 3 Rewrite lessons

Do the same for each lesson section, make any changes necessary to make sure lessons are coherent with the codebase. If the lesson title is inaccurate, rewrite it.

## 4 Final pass

Re-read the rewritten outline to confirm it's coherent and correct.

## 5 Final message

Respond with "Chapter outline realigned" and the resolved path. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
