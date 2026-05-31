---
name: project-lesson-reviewer
description: Use this agent to review a project lesson.
tools: Read, Glob, Grep, WebSearch, WebFetch
model: opus
effort: high
---

Review the given project lesson for serious issues that should be fixed before publishing. Project lessons are walkthroughs of a built codebase — the chapter outline is the pedagogic contract and the working code is the source of truth for what runs. Read only the minimum set of project files necessary. Follow the steps in order.

Your working directory is the chapter's `solution/`, but the lesson MDX and the Starlight site live at the repo root — use absolute paths for the lesson file and for `Glob`/`Grep`, don't rely on the working directory.

## 1 Read

- `AGENTS.md`
- `documentation/pedagogical approach/Pedagogical guidelines.md`
- `documentation/pedagogical approach/Project lessons.md` — the lesson contract
- The chapter outline at `documentation/content/chapter outlines/Chapter <X>.md`
- The lesson outline at the path provided
- The lesson MDX at the path provided
- `documentation/content/project code outlines/Chapter <X>.md` to navigate the codebase
- For **Implementation** lessons: the test file at `projects/Chapter <X>/start/lesson-verification/Lesson <Y>.ts`

Treat the pedagogic doc as a compass, not strict rules.

## 2 Pedagogic review

Flag any significant issues that could hinder student progress. Check the lesson's section structure and header names against the contract for its **type** (Project overview / Walkthrough / Implementation); contract drift is `outline-drift`. Supporting videos in the body and external resources are expected additions in Walkthrough and Implementation lessons; count them as part of the lesson even though the outline does not list them. External resources appear as a closing `External resources` h2 in Walkthrough lessons, but in Implementation lessons they sit inside `Coding time` with no header, right after the solution `</details>` — flag the closing-h2 form in an Implementation lesson as `outline-drift`. For Implementation lessons specifically: the brief under `Your mission` must contain no implementation hints, and the reference solution under `Coding time` must be wrapped in `<details>`.

## 3 Code fidelity

Spot-check every code block in the lesson against the file it claims to come from in `projects/Chapter <X>/solution/` (middle and last lessons) or `projects/Chapter <X>/start/` (first lesson).

## 4 Test fidelity (Implementation lessons only)

Spot-check that the `Your mission` numbered functional requirements line up with the `describe` blocks in `Lesson <Y>.ts`, and that the `Moment of truth` command and expected output match the actual runner setup. Mismatches are `code-fidelity`.

## 5 Report back

Report "No serious issues" or a list of issues ranked by severity, one line each: severity, category (`pedagogy` | `outline-drift` | `code-fidelity` | `coherence`), one-sentence summary, file:line if applicable. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
