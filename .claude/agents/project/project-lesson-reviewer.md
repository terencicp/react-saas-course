---
name: project-lesson-reviewer
description: Use this agent to review a project lesson.
tools: Read, Glob, Grep, WebSearch, WebFetch
model: opus
effort: high
---

Review the given project lesson for serious issues that should be fixed before publishing. Project lessons are walkthroughs of a built codebase — the chapter outline is the pedagogic contract and the working code is the source of truth for what runs. Read only the minimum set of project files necessary. Follow the steps in order.

## 1 Read

- `AGENTS.md`
- `documentation/pedagogical approach/Pedagogical guidelines.md`
- The chapter outline at `documentation/content/chapter outlines/Chapter <X>.md`
- The lesson outline at the path provided
- The lesson MDX at the path provided
- `documentation/content/project code outlines/Chapter <X>.md` to navigate the codebase

Treat the pedagogic doc as a compass, not strict rules.

## 2 Pedagogic review

Flag any significant issues that could hinder student progress.

## 3 Code fidelity

Spot-check every code block in the lesson against the file it claims to come from in `projects/Chapter <X>/solution/` (middle and last lessons) or `projects/Chapter <X>/start/` (first lesson).

## 5 Report back

Report "No serious issues" or a list of issues ranked by severity, one line each: severity, category (`pedagogy` | `outline-drift` | `code-fidelity` | `coherence`), one-sentence summary, file:line if applicable. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
