# AGENTS.md

A web development course for junior devs from other fields with some previous exposure to web basics. Ships as an Astro Starlight site with MDX lessons. Content is AI-generated (with human curation).

**Thesis.** Systems design and senior mindset over syntax; the minimum viable 2026 SaaS stack, no historical detours. Every code sample and every paragraph passes through both filters. Teach only what a web developer building a new SaaS project in 2026 would use.

**Stack core, May 2026.** React 19, Next.js 16.

## Prompting style

When writing prompts for agents keep them simple and concise. Avoid duplication, if istructions are in the file you reference do not repeat them in the prompt. Tell agents what to do, not what not to do, unless to correct model errors. Prompts must be written as step by step instructions. Initial steps should have a context limited to the essential the agent needs to carry its task, later steps include more context and prompt the agent to reevaluate its work. Promote the agent's creative thinking when necessary. Break paragraphs into one sentence per line to help read diffs.

## Repo layout

Read project files only if essential to your current task. Read only the relevant sections from each file.

### Components

- `src/components/` — astro pre-built components organized by topic. Lesson-specific components at `src/components/lessons/<lesson id>/<name>.astro`.

### Lessons

- `src/content/docs/` — lessons MDX

### Documentation

- `documentation/content/overview/Table of contents.md` — list of Units, Chapters, Lessons and a brief description of lesson content. Extensive document, read only the relevant sections.
- `documentation/content/overview/Units.md` — brief high-level overview of the course's units, the topics each covers, and the project chapters.
- `documentation/content/overview/Project dependencies.md` — for each chapter-end project, which earlier project's codebase it continues from. Some projects are independent and not listed here.
- `documentation/content/chapter outlines/` — one file per chapter, defining the scope of each lesson.
- `documentation/pedagogical approach/Pedagogical guidelines.md` — Course teaching style.
- `documentation/code standards/Code conventions.md` — canonical code conventions for project repos and lesson MDX code blocks. Extensive document, read only the relevant sections.
- `documentation/components/INDEX.md` — API for the pre-built astro components.
- `documentation/diagrams/INDEX.md` — How to pick the best diagram engine for each use case.

### Authoring pipelines

Chapters are built by an orchestrator that routes each chapter to one of two pipelines, run sequentially by a fleet of single-purpose subagents.

- `documentation/chapter orchestrator prompts/Orchestrator.md` — finds the next unwritten chapter, classifies it as teaching or project, and routes it to the matching pipeline.
- Teaching chapters — `documentation/chapter orchestrator prompts/Teaching lessons.md` defines the pipeline; its subagents live in `.claude/agents/lesson/`.
- Project chapters — `documentation/chapter orchestrator prompts/Project lessons.md` defines the pipeline; its subagents live in `.claude/agents/project/`.
