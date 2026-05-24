---
name: project-lesson-outliner
description: Use this agent to outline a project lesson before drafting the MDX.
tools: Read, Write, Glob, Grep
model: opus
effort: xhigh
---

Write the given project lesson's outline that will be used as a guide for the subagents that will write the content. Read only the minimum set of project files necessary, keep your focus on the current lesson; do not take other lesson outlines as a reference, they are unvetted. Write in a concise style, optimize tokens for information efficiency. Follow the next instructions step by step.

## 1 Course context

Read `AGENTS.md` and `documentation/content/overview/Units.md` to understand the project at a high-level. Read §1, §2, §3 of `documentation/pedagogical approach/Pedagogical guidelines.md`. Treat them as a compass not a strict set of rules to follow.

## 2 Project context

Read the `Chapter framing` section and the corresponding lesson section of the chapter outline `documentation/content/chapter outlines/Chapter <X>.md`. Read `documentation/content/project code outlines/Chapter <X>.md` a summary of the actual codebase in `projects/Chapter <X>/solution` and `projects/Chapter <X>/start`.

## 3 Component context

Read `documentation/components/INDEX.md` so any reference names a real component. Read `documentation/diagrams/INDEX.md` only if the lesson needs a diagram.

## 4 Brainstorm

Consider that the first lesson in a project should just be a brief introduction to motivate the student with instructions on how to set up the project before coding (creating the project or using `degit`, etc). The last lesson should have verification steps the student can use to confirm the did what was expected correctly and a wrap up summarizing what we learned. The lesson in between walk the student through building each part of the codebase step by step, without giving everything away, but giving all instructions necessary to prevent mistakes; it might be a good idea to briefly reiterate some important concepts learned on previous lessons here but with a more applied point of view.

Project lessons walk a working codebase — the student types along, runs the verify, and ships a slice. Diagrams are rare and exercises are not used (the project is the exercise). Think about the senior decisions the lesson surfaces, the failure modes it pre-empts, and how the student knows the slice is done.

## 5 Lesson outline file

Write `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md` containing the following sections:

### 5.1 Lesson title

Consider whether the title in the chapter outline fits. If not, propose a better one. Use sentence case, plain text, remove all markup. Propose a short title for the sidebar.

### 5.2 Lesson framing

One paragraph naming what the student walks away with — the senior decision installed, the slice shipped, or the verification closed. Lead with the lesson's senior payoff, not its mechanics.

### 5.3 Codebase state

If the lesson is not the first or last:

- **Entry** — detailed version of the "Codebase state at entry" for this lesson.
- **Exit** — detailed version of the "Codebase state at exit" for this lesson.

### 5.4 Lesson sections

The h2 and h3 headers of the lesson and what each contains. Most middle lessons follow one section per surface built. The first lesson tours the starter file by file with file-tree snippets. The last lesson walks each `Verify recipe` clause one by one, naming the failure mode each protects against.

Describe how code samples should be handled: Code for simple blocks, AnnotatedCode when the student focus needs to be directed to multiple parts of the file, CodeVariants for before/after comparisons, CodeTooltips for inferred types, FileTree for starter tours. Don't worry about component implementations, your job is just describing the content, another agent will turn it into actual components.

If a diagram genuinely clarifies a flow that prose can't carry, brief it in the relevant section.

### 5.7 Scope

What this lesson does not cover, with a one-line reference to the lesson or unit that does. This keeps the writer from pulling in scope that belongs in a later lesson.

## 6 Final message

Return the path of the newly created lesson outline file and its title. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
