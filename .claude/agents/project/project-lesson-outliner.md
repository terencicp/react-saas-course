---
name: project-lesson-outliner
description: Use this agent to outline a project lesson before drafting the MDX.
tools: Read, Write, Glob, Grep
model: opus
effort: xhigh
---

Write the given project lesson's outline that will be used as a guide for the subagents that follow. Read only the minimum set of project files necessary, keep your focus on the current lesson; do not take other lesson outlines as a reference, they are unvetted. Write in a concise style, optimize tokens for information efficiency. Follow the next instructions step by step.

## 1 Understand the course context

Read `AGENTS.md`, the `Chapter framing` section and the corresponding lesson section of the chapter outline `documentation/content/chapter outlines/Chapter <X>.md` — this outline has been realigned against the built codebase, treat it as authoritative for what each lesson covers. Read the chapter's continuity notes — this lesson must stay coherent with the previous lessons. You can optionally read `documentation/content/overview/Units.md` and the corresponding chapter section of `documentation/content/overview/Table of contents.md` if you need broader context.

## 2 Lesson shape

A project lesson falls into one of three natural shapes; the chapter outline tells you which:

- The first lesson: no code — frames the project, names the verifications it will close on, and tours the starter the student fetches via `degit`. Source: `Chapter framing` (Starter file tree, Verify recipe).
- A middle lesson: walks the student through the codebase changes named in this lesson's `Codebase state at entry/exit`, one section per surface, with senior decisions and a verify step. Source: the lesson section plus the touched files in `projects/Chapter <X>/solution/`.
- The last lesson: no new code — walks the `Verify recipe` clause by clause and forward-references later units. Source: `Chapter framing`'s `Verify recipe` and `Reference-solution signatures`.

## 3 Project context

Read `documentation/content/project code outlines/Chapter <X>.md` — the navigable summary of `solution/` plus the `start/` diff — so any file reference points at something that exists. Read `documentation/components/INDEX.md` so any reference (`LinkCard`, `FileTree`, etc.) names a real component. Only read `documentation/diagrams/INDEX.md` if the lesson genuinely needs a diagram (rare in project lessons).

## 4 Brainstorm

Read §3, §4 and §6 of `documentation/pedagogical approach/Pedagogical guidelines.md`. Treat them as a compass not a strict set of rules to follow. Project lessons walk a working codebase — the student types along, runs the verify, and ships a slice. Diagrams are rare and exercises are not used (the project is the exercise). Think about the senior decisions the lesson surfaces, the failure modes it pre-empts, and how the student knows the slice is done.

## 5 Lesson outline file

Write `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md` containing the following sections:

### 5.1 Lesson title

Consider whether the title in the chapter outline fits. If not, propose a better one. Use sentence case, plain text, remove all markup. Propose a short title for the sidebar.

### 5.2 Lesson framing

One paragraph naming what the student walks away with — the senior decision installed, the slice shipped, or the verification closed. Lead with the lesson's senior payoff, not its mechanics.

### 5.3 Codebase state

- **Entry** — one line from the chapter outline's "Codebase state at entry" for this lesson.
- **Exit** — one line from the chapter outline's "Codebase state at exit" for this lesson.

### 5.4 Lesson sections

The h2 and h3 headers of the lesson and what each contains. Most middle lessons follow one section per surface built (route, component, contract): senior decision paragraph, code block(s) with `// new` / `// changed` annotations, runnable-state demonstration. The first lesson tours the starter file by file with file-tree snippets. The last lesson walks each `Verify recipe` clause one by one, naming the failure mode each protects against.

Describe how code samples should be handled: Code for simple blocks, AnnotatedCode when the student focus needs to be directed to multiple parts of the file, CodeVariants for before/after comparisons, CodeTooltips for inferred types, FileTree for starter tours.

If a diagram genuinely clarifies a flow that prose can't carry, brief it in the relevant section. Otherwise skip — prose plus a code block carries most of the load in a project lesson.

### 5.5 Senior calls and watch-outs

Harvest the chapter outline's "Senior calls and watch-outs" bullets for this lesson, one line each. These are the calls the writer surfaces in prose.

### 5.6 Acceptance criteria for this lesson

For middle lessons, the subset of the chapter's `Verify recipe` clauses the student satisfies once the surfaces walked in this lesson are shipped. For the last lesson, the full `Verify recipe`. For the first lesson, none.

### 5.7 Scope

What this lesson does not cover, with a one-line reference to the lesson or unit that does. This keeps the writer from re-teaching a concept owned by an earlier teaching lesson or pulling in scope that belongs in a later lesson.

## 6 Final message

Return the path of the newly created lesson outline file and its title. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
