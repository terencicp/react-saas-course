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

Read `documentation/pedagogical approach/Project lessons.md` — the lesson contract. Treat it as the source of truth for section structure.

## 3 Component context

Read `documentation/components/INDEX.md` so any reference names a real component. Read `documentation/diagrams/INDEX.md` only if the lesson needs a diagram.

## 4 Brainstorm

See `documentation/pedagogical approach/Project lessons.md` for the section list per lesson type. The first lesson is always **Project overview**. Most middle lessons are **Implementation** — the student reads a brief (*Your mission*), builds the feature against a test file the next agent will generate, and runs it (*Moment of truth*). Reach for **Walkthrough** only when step-by-step scaffolding is genuinely needed (no exercises).

Project lessons exercise a working codebase — diagrams are rare and there are no inline exercises (the tests are the exercise). Think about the senior decisions the brief surfaces, the failure modes it pre-empts, and which functional requirements are tested vs. left to the reference solution.

## 5 Lesson outline file

Write `documentation/content/lesson outlines/Chapter <X>/Lesson <Y>.md` containing the following sections:

### 5.1 Lesson title

Consider whether the title in the chapter outline fits. If not, propose a better one. Use sentence case, plain text, remove all markup. Propose a short title for the sidebar.

### 5.2 Lesson type

One of `Project overview`, `Walkthrough`, `Implementation`. The first lesson is always `Project overview`. This field drives downstream branching — the test-coder runs only for `Implementation`, and the writer renders the contract's section list for the chosen type.

### 5.3 Lesson framing

One paragraph naming what the student walks away with — the senior decision installed, the feature shipped, or the verification closed. Lead with the lesson's senior payoff, not its mechanics.

### 5.4 Codebase state

If the lesson is not the first or last:

- **Entry** — detailed version of the "Codebase state at entry" for this lesson.
- **Exit** — detailed version of the "Codebase state at exit" for this lesson.

### 5.5 Lesson sections

The h2 and h3 headers of the lesson and what each contains. Match the section list the contract defines for this lesson's **type**:

- **Project overview** — *What we're building* (intro, no header) / *Skills* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.
- **Walkthrough** — step-by-step sections, one per surface built. No exercises.
- **Implementation** — *Goal + Finished result* (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**. Detail each:
  - *Your mission* — **Feature(s)** in one or two sentences in user terms; **Functional requirements** as a numbered list where every item is tagged `[tested]` or `[untested]` (the test-coder asserts against `[tested]` ones; the rest are covered only in the reference solution); optional **Constraints** (non-functional requirements that shape the solution) and **Out of scope** (one line). Weave these as a coherent paragraph in the prose, no subsection headers. The brief contains **no implementation hints**.
  - *Coding time* — the full reference implementation organised as it appears in the repo, decision rationale for non-obvious choices (one or two sentences each), coverage of every `[untested]` requirement (code organization, naming, error-handling placement), and callouts on anything that looks unusual at a glance. For topics owned by a regular lesson, link rather than re-explain. The writer will wrap this section in `<details>` so it's collapsed by default.
  - *Moment of truth* — the test command (`pnpm test:lesson <Y>`) and the expected pass output.

Describe how code samples should be handled: `Code` for simple blocks, `AnnotatedCode` when student focus needs to be directed to multiple parts of the file, `CodeVariants` for before/after comparisons, `CodeTooltips` for inferred types, `FileTree` for starter tours. Don't worry about component implementations — your job is just describing the content, another agent will turn it into actual components.

If a diagram genuinely clarifies a flow that prose can't carry, brief it in the relevant section.

### 5.6 Scope

What this lesson does not cover, with a one-line reference to the lesson or unit that does. This keeps the writer from pulling in scope that belongs in a later lesson.

## 6 Final message

Return the path of the newly created lesson outline file, its title, and the lesson **type** (`Project overview` / `Walkthrough` / `Implementation`) so the orchestrator can branch. If you had any issues describe them briefly and concisely as feedback.
